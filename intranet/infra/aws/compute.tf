resource "aws_iam_role" "router" {
  name_prefix = "${local.name}-router-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Principal = {
        Service = "ec2.amazonaws.com"

      }, Action = "sts:AssumeRole"

    }]

  })
}
resource "aws_iam_role" "app" {
  name_prefix        = "${local.name}-app-"
  assume_role_policy = aws_iam_role.router.assume_role_policy
}
resource "aws_iam_role_policy_attachment" "router_ssm" {
  role       = aws_iam_role.router.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_role_policy_attachment" "app_ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_role_policy" "router_secret" {
  role = aws_iam_role.router.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = concat([
      {
        Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = var.tailscale_auth_secret_arn

      }
      ], length(var.secrets_kms_key_arns) == 0 ? [] : [{
        Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.secrets_kms_key_arns, Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"

          }

        }

    }])

  })
}
resource "aws_iam_role_policy" "app_runtime" {
  role = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = concat([
      {
        Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = var.runtime_secret_arn

      },
      {
        Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*"

      },
      {
        Effect = "Allow", Action = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"], Resource = aws_ecr_repository.app.arn

      },
      {
        Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"], Resource = "${aws_cloudwatch_log_group.app.arn}:*"

      }
      ], length(var.secrets_kms_key_arns) == 0 ? [] : [{
        Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.secrets_kms_key_arns, Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"

          }

        }

    }])

  })
}
resource "aws_iam_instance_profile" "router" {
  name_prefix = "${local.name}-router-"
  role        = aws_iam_role.router.name
}
resource "aws_iam_instance_profile" "app" {
  name_prefix = "${local.name}-app-"
  role        = aws_iam_role.app.name
}
resource "aws_instance" "router" {
  ami                         = data.aws_ami.linux.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public[0].id
  private_ip                  = local.router_ip
  associate_public_ip_address = true
  source_dest_check           = false
  vpc_security_group_ids      = [aws_security_group.router.id]
  iam_instance_profile        = aws_iam_instance_profile.router.name
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1

  }
  root_block_device {
    encrypted   = true
    volume_type = "gp3"
    volume_size = 12

  }
  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/templates/router.sh.tftpl", {
    region    = var.aws_region, secret_arn = var.tailscale_auth_secret_arn,
    routes    = join(",", local.private_cidrs), expected_tailnet = var.tailscale_expected_tailnet,
    router_ip = local.router_ip, identity_service = base64encode(file("${path.module}/tailscale-identity.py"))


  })
  tags = {
    Name = "${local.name}-router"

  }
  depends_on = [aws_iam_role_policy.router_secret, aws_route_table_association.public]
}
resource "aws_launch_template" "app" {
  count         = var.image_digest == null ? 0 : 1
  name_prefix   = "${local.name}-"
  image_id      = data.aws_ami.linux.id
  instance_type = "t3.small"
  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.app.id]

  }
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      encrypted             = true
      volume_type           = "gp3"
      volume_size           = 20
      delete_on_termination = true
    }

  }
  user_data = base64encode(templatefile("${path.module}/templates/app.sh.tftpl", {
    region       = var.aws_region, secret_arn = var.runtime_secret_arn, image = local.app_image,
    registry     = split("/", aws_ecr_repository.app.repository_url)[0],
    identity_url = "http://${local.router_ip}:3101/identity", log_group = aws_cloudwatch_log_group.app.name

  }))
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = local.name, Project = "infra-futuro", Service = "backoffice"
    }
  }
  lifecycle {
    create_before_destroy = true
  }
}
resource "aws_autoscaling_group" "app" {
  count                     = var.image_digest == null ? 0 : 1
  name                      = local.name
  min_size                  = 1
  desired_capacity          = 1
  max_size                  = 2
  vpc_zone_identifier       = aws_subnet.private[*].id
  target_group_arns         = [aws_lb_target_group.app.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300
  wait_for_elb_capacity     = 1
  wait_for_capacity_timeout = "15m"
  launch_template {
    id      = aws_launch_template.app[0].id
    version = aws_launch_template.app[0].latest_version
  }
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 100
      max_healthy_percentage = 200
      instance_warmup        = 60
      skip_matching          = true
    }

  }
  depends_on = [aws_nat_gateway.egress, aws_route_table_association.private, aws_iam_role_policy.app_runtime, aws_lb_listener.https, aws_route_table.private]
}
