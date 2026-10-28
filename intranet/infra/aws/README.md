# Private AWS backoffice

See [the production deployment receipt](DEPLOYMENT.md) for the deployed account, release digest, and acceptance evidence.

Prepared infrastructure for `https://backoffice.hackinfrafuturo.cl`. This directory does not deploy anything when the public website builds. Run Terraform and CodeBuild manually; no GitHub Actions or recurring deployment jobs are added.

```text
Organizer's device on velum-hackinfrafuturo
  -> Tailscale subnet router (EC2; no inbound internet ports)
  -> Internal ALB :443 + ACM certificate + verified Tailscale identity
  -> Private EC2 Auto Scaling group / Node container :3100
  -> Hosted Convex read API
```

The registrar and Vercel authoritative DNS stay unchanged. DNS changes are the `backoffice` CNAME, ACM's validation record, and permission for Amazon's certificate authority if the existing CAA records require it. No Caddy is required.

## Boundaries

- The ALB is internal, in two private subnets. Its security group accepts HTTPS only from the Tailscale IPv4 range through the subnet router. Subnet SNAT is disabled to preserve the real client IP. A private route returns 100.64.0.0/10 traffic through the router's ENI.
- The app has no public IP and accepts port 3100 only from the ALB security group. The router identity service binds its private address on port 3101 and accepts only the app security group. There are no public HTTP or SSH ingress rules; operations use SSM.
- Tailnet policy grants every member HTTPS to the two private subnet CIDRs using autogroup:member. Route approval alone does not grant access. Application and identity-service ports remain private to their AWS security groups.
- Every verified tailnet member can access every current and future registered intranet app by default. Existing Tailscale identity is the only user sign-in; there are no per-project reader lists or extra accounts.
- INTRANET_AUTH_MODE=tailscale-alb uses only the final client IP appended by the ALB, then resolves that address through the router's read-only Tailscale WhoIs service. Tagged nodes, unknown identities, and non-tailnet IPs are denied. Browser-supplied login headers and earlier forwarded addresses are ignored. The app must remain reachable only from this ALB; its XFF mode must remain append, without client ports. Local/Serve mode remains available separately.
- `GET /healthz` is a data-free process liveness check. A healthy target does not prove sign-in or Convex connectivity; the acceptance checks below are required.
- Secrets are fetched at runtime through instance roles. Their values are absent from Terraform variables, instance user data, source archives, and container builds. Use an encrypted, access-restricted remote state bucket.

## Explicit inputs before provisioning

1. Renew AWS CLI authentication for the approved account. Set `AWS_PROFILE` deliberately and verify `aws sts get-caller-identity`. Account and region are required; the provider refuses another account.
2. Choose the region and a non-overlapping VPC `/16`. `10.203.0.0/16` is an example, not a confirmed available range.
3. In **velum-hackinfrafuturo**, create a preauthorized enrollment key tagged `tag:intranet-router`, and store the plaintext key in an existing Secrets Manager secret in the chosen account/region. Use a key valid for the intended provisioning window; replacements after expiry need a fresh key. Set the exact stable tailnet ID from Settings > General, or `CurrentTailnet.Name`; its display name is not sufficient. The bootstrap enrolls without advertising routes, checks that identity, then advertises routes. A mismatch takes the node down.
4. Store a second Secrets Manager JSON secret containing only:

   ```json
   {
     "INFRA_FUTURO_API_TOKEN": "the-existing-production-CONVEX_HTTP_API_TOKEN"
   }
   ```

   Do not paste those values into a tfvars file or commit them. The production API URL is configured by the launch template. For customer-managed secret encryption, supply the KMS key ARNs and grant the instance roles access in the key policies too.
5. Prepare an encrypted S3 Terraform backend with access restricted to deployment operators, versioning, and state locking. Copy `backend.hcl.example` to an ignored `production.backend.hcl` and fill it in. `backend.tf` deliberately supplies no account-wide defaults.
6. Copy `production.tfvars.example` to ignored `production.tfvars`; replace every placeholder, including secret ARNs and the exact tailnet ID. Start with `image_digest = null`.

The initial running footprint is an ALB, NAT gateway, router EC2, one app EC2, public IPv4 allocations, ECR/S3/Secrets Manager/log storage, and build usage. Review regional costs before approving the first apply. One router and one NAT gateway are intentionally the initial availability limit; the app group replaces unhealthy nodes and uses rolling image updates, but the network path is not fully redundant.

## Certificate and infrastructure

From the repository root, after the provisioning change has been reviewed and authorized:

```sh
terraform -chdir=intranet/infra/aws init -backend-config=production.backend.hcl
# Certificate-only bootstrap so we can publish its DNS validation record first.
terraform -chdir=intranet/infra/aws plan -var-file=production.tfvars -target=aws_acm_certificate.https -out=/tmp/backoffice-certificate.tfplan
terraform -chdir=intranet/infra/aws apply /tmp/backoffice-certificate.tfplan
terraform -chdir=intranet/infra/aws output -json certificate_dns_validation
```

Create the returned validation CNAME in **Vercel DNS**, preserving its full name and value. Keep the record for renewal. The `.cl` registration and public apex/`www` records stay where they are. Then review the full plan:

If inherited CAA records permit only other issuers, add `0 issue "amazon.com"` to the parent zone's CAA records, preserving existing values. A CAA record cannot coexist with the backoffice CNAME at the same name.

```sh
terraform -chdir=intranet/infra/aws plan -var-file=production.tfvars -out=/tmp/backoffice-foundation.tfplan
terraform -chdir=intranet/infra/aws apply /tmp/backoffice-foundation.tfplan
terraform -chdir=intranet/infra/aws output -json tailscale_routes
```

Merge `tailnet-policy.example.hujson` into **velum-hackinfrafuturo**'s policy, using autogroup:member and the generated subnet CIDRs. It is an example, not a complete policy replacement. Approve those routes on the new router in the Tailscale console. The Mac used to prepare the code does not need to change tailnets for these steps.

At this stage there is no app instance: `image_digest = null` intentionally creates only the foundation and registry/build facilities.

## Build in AWS and deploy by digest

No local Docker daemon is needed. The packaging script includes the intranet and workspace manifests, omits root commands and files outside this deployment, including `.env` files, dependency/build directories, and Terraform state/plans.

```sh
source_sha=$(python3 intranet/infra/aws/package-source.py /tmp/backoffice-source.zip)
source_bucket=$(terraform -chdir=intranet/infra/aws output -raw source_bucket)
source_version=$(aws s3api put-object --bucket "$source_bucket" --key backoffice/source.zip --body /tmp/backoffice-source.zip --query VersionId --output text)
build_project=$(terraform -chdir=intranet/infra/aws output -raw build_project)
aws codebuild start-build --project-name "$build_project" --source-version "$source_version" --environment-variables-override "name=IMAGE_TAG,value=$source_sha,type=PLAINTEXT"
```

Record the returned build ID and inspect it with `aws codebuild batch-get-builds --ids BUILD_ID`. An uncertain submission should be checked using that ID before starting another build. Wait for `SUCCEEDED`; the image tag is immutable, and a repeated source SHA already present in ECR should be reused instead of rebuilt.

```sh
repository=$(terraform -chdir=intranet/infra/aws output -raw ecr_repository)
aws ecr describe-images --repository-name "$repository" --image-ids "imageTag=$source_sha" --query 'imageDetails[0].imageDigest' --output text
```

Set `image_digest` to that exact `sha256:...` value in `production.tfvars`. Review the resulting plan before applying:

```sh
terraform -chdir=intranet/infra/aws plan -var-file=production.tfvars -out=/tmp/backoffice-app.tfplan
terraform -chdir=intranet/infra/aws apply /tmp/backoffice-app.tfplan
terraform -chdir=intranet/infra/aws output -json backoffice_dns
```

The app group keeps one desired instance and can temporarily use two during a rollout. Its refresh requires 100% healthy capacity before retiring old capacity. Terraform waits for an initially healthy target; subsequent instance refreshes are asynchronous. Inspect `aws autoscaling describe-instance-refreshes --auto-scaling-group-name hif-backoffice` and the target group before calling an update complete.

Add the returned `backoffice` CNAME to Vercel DNS, replacing only an existing record for that exact subdomain if necessary. It points to the internal ALB hostname, whose public DNS resolves to private addresses. No public IP or publicly accessible load balancer is required.

Tailnet members receive access automatically. Add a project to the registry to make it available to all verified members; no runtime reader configuration is needed.

## Acceptance before calling it live

- On a member's device connected to **velum-hackinfrafuturo**, accept subnet routes and open `https://backoffice.hackinfrafuturo.cl/stats`. Verify the certificate, automatic Tailscale identity, real totals, refresh, and theme/menu interactions.
- From outside the tailnet, that hostname must not establish a connection. Public DNS resolution by itself is expected and does not imply reachability.
- Verify a second tailnet member can open every app without being named in app configuration. Anonymous requests, tagged service nodes, and unknown identities must remain denied.
- Forged identity headers, forwarded-IP prefixes, and unknown Tailscale identities must not reveal data. The unit suite covers these cases offline; verify the deployed routing boundary too.
- Verify `aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN` is healthy. Use SSM and `/backoffice/app` logs for bootstrap errors; never log environment contents or tokens.

## Rollback and operations

Retain the last known-good image digest and source S3 version. Set the previous digest in `production.tfvars`, review the plan, and apply it; wait for the rolling refresh and target health again. Do not rebuild a previous release under the same immutable tag. Secret rotation takes effect when the app service is restarted/replaced; update the runtime secret before the matching rollout. Router-key changes are only needed for enrollment/re-enrollment.

The ALB has deletion protection, and S3 source versions/ECR images are retained. Decommissioning requires an explicit reviewed change; this module does not automatically purge deployment history. Do not remove shared DNS records, existing tailnet routes, or the public Vercel app.

## Local validation only

```sh
terraform -chdir=intranet/infra/aws init -backend=false
terraform -chdir=intranet/infra/aws fmt -check -recursive
terraform -chdir=intranet/infra/aws validate
terraform -chdir=intranet/infra/aws test
pnpm test:intranet
pnpm build:intranet
pnpm --filter @intranet/workspace test:browser
python3 intranet/infra/aws/package-source.py /tmp/backoffice-source.zip
bash -n intranet/infra/aws/templates/app.sh.tftpl intranet/infra/aws/templates/router.sh.tftpl
```

`terraform test` uses a mocked AWS provider and makes no AWS changes. Local validation does not prove the AWS container build, Tailscale identity path, DNS/TLS, or deployed network path. Those require the actual deployment and acceptance checks.

References: [ALB appended client addresses](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html), [Tailscale without subnet SNAT](https://tailscale.com/docs/features/subnet-routers#disable-snat), [Tailscale VPC routing](https://tailscale.com/docs/install/cloud/aws), [ACM DNS validation](https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html).
