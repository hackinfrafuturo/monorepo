#!/usr/bin/env python3
"""Recreate ignored deployment inputs from shared config and the live AWS release."""

import argparse
import base64
import ipaddress
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

ACCOUNT = "052777341990"
REGION = "us-east-1"
BUCKET = f"hif-backoffice-tfstate-{ACCOUNT}-{REGION}"
KEY = "hackinfrafuturo/backoffice/config/production.json"
REPOSITORY = f"{ACCOUNT}.dkr.ecr.{REGION}.amazonaws.com/hif-backoffice"


def validate_config(config):
    if set(config) != {"version", "backend", "variables"} or config["version"] != 1:
        raise ValueError("Unsupported shared configuration")
    backend = {
        "bucket": BUCKET,
        "key": "hackinfrafuturo/backoffice/production.tfstate",
        "region": REGION,
        "encrypt": True,
        "use_lockfile": True,
    }
    if config["backend"] != backend:
        raise ValueError("Unexpected production Terraform backend")
    variables = config["variables"]
    expected = {"aws_account_id", "aws_region", "vpc_cidr", "runtime_secret_arn",
                "tailscale_auth_secret_arn", "tailscale_expected_tailnet", "router_ami_id"}
    if set(variables) != expected or not all(isinstance(v, str) for v in variables.values()):
        raise ValueError("Shared config must contain only the documented nonsecret settings")
    if variables["aws_account_id"] != ACCOUNT or variables["aws_region"] != REGION:
        raise ValueError("Unexpected production account or region")
    network = ipaddress.ip_network(variables["vpc_cidr"])
    if network.version != 4 or network.prefixlen != 16:
        raise ValueError("Expected an IPv4 /16 VPC")
    for name, secret in [("runtime_secret_arn", "runtime"), ("tailscale_auth_secret_arn", "tailscale")]:
        pattern = rf"arn:aws:secretsmanager:{REGION}:{ACCOUNT}:secret:backoffice/{secret}-[A-Za-z0-9]+"
        if not re.fullmatch(pattern, variables[name]):
            raise ValueError(f"Unexpected {name}")
    if not re.fullmatch(r"ami-[0-9a-f]{17}", variables["router_ami_id"]):
        raise ValueError("Expected a pinned router AMI")
    if not re.fullmatch(r"Tn[A-Za-z0-9]+", variables["tailscale_expected_tailnet"]):
        raise ValueError("Expected a stable tailnet ID")
    return backend, variables


def deployed_digest(group, template):
    instances = group.get("Instances", [])
    selected = group["LaunchTemplate"]
    if not instances or any(
        instance.get("LifecycleState") != "InService"
        or instance.get("HealthStatus") != "Healthy"
        or instance.get("LaunchTemplate", {}).get("LaunchTemplateId") != selected["LaunchTemplateId"]
        or instance.get("LaunchTemplate", {}).get("Version") != selected["Version"]
        for instance in instances
    ):
        raise ValueError("App rollout is not settled; wait for healthy matching instances")
    if str(template["VersionNumber"]) != selected["Version"]:
        raise ValueError("Launch template version does not match the running group")
    data = base64.b64decode(template["LaunchTemplateData"]["UserData"], validate=True).decode()
    digests = set(re.findall(re.escape(REPOSITORY) + r"@(sha256:[0-9a-f]{64})(?![0-9a-f])", data))
    if len(digests) != 1:
        raise ValueError("Expected one immutable backoffice image in the live launch template")
    return digests.pop()


def hcl(values):
    return "".join(f"{key} = {json.dumps(value)}\n" for key, value in values.items())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", help="AWS CLI profile; otherwise use the normal AWS credential chain")
    parser.add_argument("--overwrite", action="store_true", help="Replace existing local deployment inputs")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()

    def aws(*command):
        argv = ["aws", "--region", REGION, "--no-cli-pager"]
        if args.profile:
            argv += ["--profile", args.profile]
        result = subprocess.run(argv + list(command) + ["--output", "json"],
                                check=True, capture_output=True, text=True)
        return json.loads(result.stdout)

    if aws("sts", "get-caller-identity")["Account"] != ACCOUNT:
        raise ValueError("Authenticate to the approved production AWS account first")
    with tempfile.TemporaryDirectory() as temporary:
        source = Path(temporary) / "production.json"
        metadata = aws("s3api", "get-object", "--bucket", BUCKET, "--key", KEY, str(source))
        backend, variables = validate_config(json.loads(source.read_text()))
    refreshes = aws("autoscaling", "describe-instance-refreshes", "--auto-scaling-group-name", "hif-backoffice")
    terminal = {"Successful", "Failed", "Cancelled", "RollbackSuccessful", "RollbackFailed"}
    if any(r["Status"] not in terminal for r in refreshes.get("InstanceRefreshes", [])):
        raise ValueError("An app refresh is active; wait before syncing deployment inputs")
    groups = aws("autoscaling", "describe-auto-scaling-groups", "--auto-scaling-group-names", "hif-backoffice")
    group = groups["AutoScalingGroups"][0]
    selected = group["LaunchTemplate"]
    templates = aws("ec2", "describe-launch-template-versions", "--launch-template-id",
                    selected["LaunchTemplateId"], "--versions", selected["Version"])
    variables = {**variables, "image_digest": deployed_digest(group, templates["LaunchTemplateVersions"][0])}
    files = {"production.backend.hcl": hcl(backend), "production.tfvars": hcl(variables)}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        target = args.output_dir / name
        if target.exists() and target.read_text() != content and not args.overwrite:
            raise ValueError(f"{target} differs; use --overwrite to discard local deployment edits")
    for name, content in files.items():
        with tempfile.NamedTemporaryFile(mode="w", dir=args.output_dir, delete=False) as output:
            output.write(content)
            os.chmod(output.name, 0o600)
        os.replace(output.name, args.output_dir / name)
    print(f"Downloaded config version {metadata.get('VersionId', 'unversioned')} from s3://{BUCKET}/{KEY}")
    print(f"Current deployed image: {variables['image_digest']}")
    print(f"Wrote production.backend.hcl and production.tfvars to {args.output_dir}")
    print("No infrastructure or runtime secrets were changed. Review the Terraform plan before applying.")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(error.stderr.strip() or "AWS CLI command failed") from None
    except (ValueError, KeyError, IndexError, OSError) as error:
        raise SystemExit(f"Cannot sync production inputs: {error}") from None
