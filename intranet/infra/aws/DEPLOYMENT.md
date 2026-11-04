# Production deployment receipt

## Reviewed UI and identity release — 2026-11-03 (America/Santiago)

AWS account `052777341990`, region `us-east-1`. PRs #14 and #17 are merged, with the compatible production Convex deployment applied before the public form was published.

- URL: https://backoffice.hackinfrafuturo.cl/projects/infra-futuro
- Source commit: `2e03d9cb306652a498029329fa96f7379f2334fa` (the receipt is recorded afterward).
- source_sha256: `fa27bcd7975d9bf3b063947641a640de2e26fa75f749fdb840d1f29acb6dd3cb`
- source_version: `kKVSbDAkPFYkFfdYHUtN.YTLZiy3fvrd`
- build_id: `hif-backoffice:4ef84c9c-b828-4d2d-9666-4f9817634c45`
- image_digest: `sha256:eefa84853076e6e92ebd7a0b2fc97db171c004e8a33b003960e74cdb9eb04ba5`
- App instance: `i-085d1570cd988ff04`.
- Rolling refresh: `c76cece3-ee80-4282-9b44-66dc4fb88148`, successful at 100 percent with only the new healthy instance remaining.
- Existing router `i-058f96cba34de4d4a` retained with AMI `ami-04b938437b69a2c9c`. No subnet routes, security groups or public DNS changed.

The new form uses the identity-aware submission and correction endpoints. Older tabs retain their original contracts and remain flagged for ID follow-up; old corrections preserve collected identity fields. RUTs are canonicalized before duplicate checks. All decision selection controls share the API's 100-team limit, and confirmation sends one atomic batch.

Validation:

- CodeBuild passed all 35 backend/access tests, the production build and TypeScript checks. Local browser regressions covered range selection, refreshed anchors, selection limits, signup, corrections and draft privacy.
- The live Vercel site passed at 390px and 1440px, including the new identity form, canonical RUT, private draft and new submission endpoint. Valid submission delivery was intercepted; invalid-link rejection used the real production backend. No test application or confirmation email was created.
- SSM checks on the deployed app used the live router WhoIs service and passed all seven pages, private/no-store responses and credential isolation. Anonymous, forged, non-tailnet and tagged-router identities were denied; forged login headers and earlier forwarded addresses could not replace the verified organizer.
- The operator Mac remained on the separate CENIA tailnet. These SSM checks do not claim a fresh member-device-to-ALB browser login.
- Terraform's post-deployment plan reports no changes. `DECISION_EMAILS=off` and `MESSAGE_EMAILS=off`; `ALLOW_SEED` remains absent. Deployment checks wrote no applications or decisions and sent no emails.

Rollback the app, if required, to `sha256:990ef0cbef834f6c484f5c3c92fd9b80b2586885f2376c2d4f913deb79440bc4`, keeping the router AMI pin. Retain the additive Convex endpoints while the new public form is published; reverting those endpoints would break the new clients.

## Event backoffice release — 2026-11-03 (America/Santiago)

AWS account `052777341990`, region `us-east-1`.

- URL: https://backoffice.hackinfrafuturo.cl/projects/infra-futuro
- Source commit: `51ac32bd0cb9c49d74bbcc14c1ae705d2ae433bf` (the receipt itself is recorded afterward).
- source_sha256: `6cc32ae98e8d859e03208b0933779aa0a0d6f663f93bc2e729b4f99b63400e38`
- source_version: `dDJ4V2IHVia8uxp1FcLfPyopbFlYB1kE`
- build_id: `hif-backoffice:7066231b-21ea-4b95-adb7-688b574a3a67`
- image_digest: `sha256:990ef0cbef834f6c484f5c3c92fd9b80b2586885f2376c2d4f913deb79440bc4`
- App instance: `i-075d86b352e2323f2`.
- Rolling refresh: `e03ecc06-4ff4-46f5-abc2-1325782e776e`, successful at 100 percent; only the new healthy instance remains.
- Router retained: `i-058f96cba34de4d4a`, with `router_ami_id = "ami-04b938437b69a2c9c"`. The app rollout changed no router, subnet routes, security groups, or public DNS.
- Runtime secret now contains both `INFRA_FUTURO_API_TOKEN` and `INFRA_FUTURO_ADMIN_SECRET`. The app loads the matching production Convex admin secret server-side; no development identity is configured.
- Production Convex `polite-spider-810` was deployed before PR #13 merged and Vercel published `/corregir`.
- `DECISION_EMAILS=off` and `MESSAGE_EMAILS=off`; `ALLOW_SEED` is absent. No real email was sent and deployment checks changed no applications or decisions.

Validation for this release:

- AWS CodeBuild succeeded, including all 21 backend/access tests, production compilation, and TypeScript checks. Docker's official Node 24 image is pulled from ECR Public to avoid Docker Hub pull limits.
- The exact published image is running on the new private app instance, whose ALB target is healthy. Terraform's post-deployment plan reports no changes.
- Through SSM on the trusted app host, the deployed server resolved an existing organizer through the live router WhoIs service and served overview, participants, review, decisions, statistics, messages, and registration stats. Responses were private/no-store and contained neither backend credential.
- The deployed server denied anonymous requests, forged login headers, non-tailnet IPs, and a forged forwarded-IP prefix ending at the tagged router.
- This SSM smoke check does not establish a fresh device-to-ALB browser login. The operator Mac was on the separate CENIA tailnet during verification; a fresh member-device browser check remains pending on this release.
- Local Playwright checks passed for the compiled backoffice and desktop/mobile correction form using synthetic data. The public Vercel correction route was also checked live with an invalid token; it showed no applicant data.

The prior image below remains the rollback release. Keep the current router AMI pin when rolling back the app image.

## Original infrastructure release — 2026-10-28

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

### Immutable release

- source_sha256: 09bb969d6455b5f2a1e0fbdcdb8b02e5c51b241332ccdef97da4ea67c0681119
- source_version: p7H3KdLKBWzQCNTQtd8utGjtKuY1qqkm
- build_id: hif-backoffice:64e43096-90ac-4f34-86ba-341d1aaeade1
- image_digest: sha256:cc9bbc20bacbd42da6f69af1f93752cd05108a24772ddd5c2df1dacb3a2c73e7

The exact source is retained as a versioned, private S3 archive under backoffice/source.zip in hif-backoffice-source-052777341990-us-east-1. This release was built manually from a local source snapshot rather than GitHub CI. Its exact source archive and image remain immutable. The intranet source and deployment configuration are maintained on main; the archive excludes environment files and unrelated local tooling.

### Acceptance evidence

- AWS CodeBuild succeeded, including app tests and a production build; the app runs the recorded immutable digest. The compiled production browser suite also verified a second member can read stats through both page loading and the server function HTTP path, without reader-list configuration.
- Opened the deployed page in Chrome from the intended tailnet. It identified the user as 000alen@github automatically, loaded the real Convex data (60 people / 29 registrations at verification), and refreshed successfully.
- Live requests with forged login and earlier forwarded-IP headers retained the real identity. The identity service returned 401 for a tagged router and an unknown address.
- The saved tailnet policy grants autogroup:member HTTPS to both private subnets. The deployed runtime has no reader-list setting, and the obsolete setting was removed from Secrets Manager.
- App instance has no public IP; only the ALB security group can reach port 3100. The private identity endpoint accepts only the app security group on port 3101. ALB accepts only Tailscale source addresses on HTTPS.
- Existing temporary Cognito pool, client, and domain were removed; the listener has only a forward action. No invitation emails were sent.
- Terraform post-deployment plan returned no changes. Unit tests, compiled production browser checks, two mocked Terraform plans, and seven Python checks passed.

The certificate validation CNAME, backoffice CNAME, and additive Amazon CAA issuer permission are in Vercel DNS under velum-labs. The public website remains on Vercel.

Use the adjacent README for build, rollout, router replacement, and rollback instructions. New projects inherit access for all tailnet members automatically. Rollbacks must retain this default access model; older images with reader restrictions or separate sign-in do not match the current policy.
