import base64
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("sync_production", Path(__file__).parents[1] / "sync-production.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class SharedConfigTests(unittest.TestCase):
    def config(self):
        return {
            "version": 1,
            "backend": {"bucket": sync.BUCKET, "key": "hackinfrafuturo/backoffice/production.tfstate",
                        "region": sync.REGION, "encrypt": True, "use_lockfile": True},
            "variables": {
                "aws_account_id": sync.ACCOUNT, "aws_region": sync.REGION,
                "vpc_cidr": "10.203.0.0/16",
                "runtime_secret_arn": f"arn:aws:secretsmanager:{sync.REGION}:{sync.ACCOUNT}:secret:backoffice/runtime-Abc123",
                "tailscale_auth_secret_arn": f"arn:aws:secretsmanager:{sync.REGION}:{sync.ACCOUNT}:secret:backoffice/tailscale-Def456",
                "tailscale_expected_tailnet": "TnExample", "router_ami_id": "ami-0123456789abcdef0",
            },
        }

    def test_shared_config_rejects_secret_values_and_stale_release_inputs(self):
        for extra in ["ADMIN_API_SECRET", "image_digest", "aws_secret_access_key"]:
            config = self.config()
            config["variables"][extra] = "must-not-be-shared"
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                sync.validate_config(config)

    def test_shared_config_requires_expected_account_backend_and_router_pin(self):
        for section, key, value in [
            ("variables", "aws_account_id", "111111111111"),
            ("backend", "key", "other/state.tfstate"),
            ("variables", "router_ami_id", ""),
        ]:
            config = self.config()
            config[section][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                sync.validate_config(config)
        sync.validate_config(self.config())

    def running_release(self):
        selected = {"LaunchTemplateId": "lt-example", "Version": "5"}
        group = {"LaunchTemplate": selected, "Instances": [
            {"LifecycleState": "InService", "HealthStatus": "Healthy", "LaunchTemplate": dict(selected)}
        ]}
        image = sync.REPOSITORY + "@sha256:" + "a" * 64
        template = {"VersionNumber": 5, "LaunchTemplateData": {
            "UserData": base64.b64encode(f"docker pull '{image}'\ndocker run {image}".encode()).decode()
        }}
        return group, template

    def test_digest_comes_from_live_pinned_release(self):
        group, template = self.running_release()
        self.assertEqual(sync.deployed_digest(group, template), "sha256:" + "a" * 64)

    def test_mixed_or_unhealthy_rollout_is_refused(self):
        for field, value in [("HealthStatus", "Unhealthy"), ("LifecycleState", "Pending")]:
            group, template = self.running_release()
            group["Instances"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                sync.deployed_digest(group, template)
        group, template = self.running_release()
        group["Instances"][0]["LaunchTemplate"]["Version"] = "4"
        with self.assertRaises(ValueError):
            sync.deployed_digest(group, template)

    def test_other_container_repository_is_refused(self):
        group, template = self.running_release()
        template["LaunchTemplateData"]["UserData"] = base64.b64encode(
            ("docker run example.com/unrelated@sha256:" + "a" * 64).encode()).decode()
        with self.assertRaises(ValueError):
            sync.deployed_digest(group, template)


if __name__ == "__main__":
    unittest.main()
