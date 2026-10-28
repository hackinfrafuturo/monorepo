# Production deployment receipt

Deployed 2026-10-28 to AWS account 052777341990, region us-east-1.

- URL: https://backoffice.hackinfrafuturo.cl/projects/infra-futuro/stats
- Authentication: existing Tailscale user identity, resolved by the router from the original ALB client IP. No separate accounts or invitations.
- Tailnet display: velum-hackinfrafuturo; login name: hackinfrafuturo.org.github; stable ID: TnAZzXkpd211CNTRL.
- Default access: every verified member of the tailnet can access every current and future registered intranet app. No per-user or per-project reader lists.
- Internal ALB: internal-hif-backoffice-1337717394.us-east-1.elb.amazonaws.com.
- VPC: vpc-0e639332590d5572d (10.203.0.0/16).
- Router: i-058f96cba34de4d4a (10.203.0.10); advertises 10.203.16.0/24 and 10.203.17.0/24, without SNAT.
- App group: hif-backoffice; completed refresh 6961e124-71af-43fa-81bf-43dd831c226f at 100 percent, with one healthy private target i-0b01a5432c8091b02.
- State: s3://hif-backoffice-tfstate-052777341990-us-east-1/hackinfrafuturo/backoffice/production.tfstate (versioned, encrypted, public access blocked, lockfile enabled).
- Local AWS profiles: hackinfrafuturo (console login), hackinfrafuturo-terraform (credential-process bridge).
- Runtime secrets: backoffice/runtime and backoffice/tailscale in Secrets Manager. No values are in this repository.

## Immutable release

- source_sha256: 09bb969d6455b5f2a1e0fbdcdb8b02e5c51b241332ccdef97da4ea67c0681119
- source_version: p7H3KdLKBWzQCNTQtd8utGjtKuY1qqkm
- build_id: hif-backoffice:64e43096-90ac-4f34-86ba-341d1aaeade1
- image_digest: sha256:cc9bbc20bacbd42da6f69af1f93752cd05108a24772ddd5c2df1dacb3a2c73e7

The exact source is retained as a versioned, private S3 archive under backoffice/source.zip in hif-backoffice-source-052777341990-us-east-1. This release was built manually from a local source snapshot rather than GitHub CI. Its exact source archive and image remain immutable. The intranet source and deployment configuration are maintained on main; the archive excludes environment files and unrelated local tooling.

## Acceptance evidence

- AWS CodeBuild succeeded, including app tests and a production build; the app runs the recorded immutable digest. The compiled production browser suite also verified a second member can read stats through both page loading and the server function HTTP path, without reader-list configuration.
- Opened the deployed page in Chrome from the intended tailnet. It identified the user as 000alen@github automatically, loaded the real Convex data (60 people / 29 registrations at verification), and refreshed successfully.
- Live requests with forged login and earlier forwarded-IP headers retained the real identity. The identity service returned 401 for a tagged router and an unknown address.
- The saved tailnet policy grants autogroup:member HTTPS to both private subnets. The deployed runtime has no reader-list setting, and the obsolete setting was removed from Secrets Manager.
- App instance has no public IP; only the ALB security group can reach port 3100. The private identity endpoint accepts only the app security group on port 3101. ALB accepts only Tailscale source addresses on HTTPS.
- Existing temporary Cognito pool, client, and domain were removed; the listener has only a forward action. No invitation emails were sent.
- Terraform post-deployment plan returned no changes. Unit tests, compiled production browser checks, two mocked Terraform plans, and seven Python checks passed.

The certificate validation CNAME, backoffice CNAME, and additive Amazon CAA issuer permission are in Vercel DNS under velum-labs. The public website remains on Vercel.

Use the adjacent README for build, rollout, router replacement, and rollback instructions. New projects inherit access for all tailnet members automatically. Rollbacks must retain this default access model; older images with reader restrictions or separate sign-in do not match the current policy.
