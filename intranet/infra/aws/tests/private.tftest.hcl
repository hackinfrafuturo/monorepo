mock_provider "aws" {
  override_data {
    target = data.aws_caller_identity.current
    values = {
      account_id = "123456789012", arn = "arn:aws:iam::123456789012:root", user_id = "test"
    }

  }
  override_data {
    target = data.aws_availability_zones.available
    values = {
      names = ["us-east-1a", "us-east-1b"]
    }

  }
  override_data {
    target = data.aws_ami.linux
    values = {
      id = "ami-0123456789abcdef0"
    }

  }
}
variables {
  aws_account_id             = "123456789012"
  aws_region                 = "us-east-1"
  runtime_secret_arn         = "arn:aws:secretsmanager:us-east-1:123456789012:secret:backoffice/runtime-test"
  tailscale_auth_secret_arn  = "arn:aws:secretsmanager:us-east-1:123456789012:secret:backoffice/tailscale-test"
  tailscale_expected_tailnet = "Ttesttailnet"
}
run "private_foundation" {
  command = plan
  assert {
    condition     = aws_lb.private.internal
    error_message = "The ALB must never be internet-facing."
  }
  assert {
    condition     = length(aws_security_group.router.ingress) == 1 && one(aws_security_group.router.ingress).from_port == 3101 && length(coalesce(one(aws_security_group.router.ingress).cidr_blocks, toset([]))) == 0
    error_message = "The router identity port accepts an app security group, never a public CIDR."
  }
  assert {
    condition     = one(one(aws_security_group.alb.ingress).cidr_blocks) == "100.64.0.0/10"
    error_message = "Only original Tailscale client addresses may reach the ALB."
  }
  assert {
    condition     = one(aws_security_group.alb.ingress).from_port == 443
    error_message = "Expose HTTPS only."
  }
  assert {
    condition     = length(aws_launch_template.app) == 0
    error_message = "No app is launched before an immutable image exists."
  }
  assert {
    condition     = aws_instance.router.source_dest_check == false
    error_message = "AWS must allow subnet forwarding."
  }
  assert {
    condition     = aws_lb.private.xff_header_processing_mode == "append" && !aws_lb.private.enable_xff_client_port
    error_message = "The ALB must append the authenticated source IP without a port."
  }
  assert {
    condition     = [for action in aws_lb_listener.https.default_action : action.type] == ["forward"]
    error_message = "The listener uses only Tailscale identity, without a second login."
  }
  assert {
    condition     = aws_lb_target_group.app.health_check[0].path == "/healthz"
    error_message = "ALB checks the data-free liveness endpoint."
  }
}
run "immutable_private_app" {
  command = plan
  variables {
    image_digest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }
  assert {
    condition     = tobool(aws_launch_template.app[0].network_interfaces[0].associate_public_ip_address) == false
    error_message = "The app cannot have a public IP."
  }
  assert {
    condition     = aws_launch_template.app[0].metadata_options[0].http_tokens == "required"
    error_message = "Require IMDSv2."
  }
  assert {
    condition     = aws_launch_template.app[0].block_device_mappings[0].ebs[0].encrypted
    error_message = "App storage must be encrypted."
  }
  assert {
    condition     = aws_autoscaling_group.app[0].instance_refresh[0].preferences[0].min_healthy_percentage == 100
    error_message = "Rollouts must preserve the existing healthy capacity."
  }
}
