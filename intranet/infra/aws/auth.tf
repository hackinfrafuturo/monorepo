resource "aws_acm_certificate" "https" {
  domain_name       = local.domain
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}
resource "aws_acm_certificate_validation" "https" {
  certificate_arn         = aws_acm_certificate.https.arn
  validation_record_fqdns = [for option in aws_acm_certificate.https.domain_validation_options : option.resource_record_name]
  timeouts {
    create = "30m"
  }
}
resource "aws_lb" "private" {
  name                       = local.name
  internal                   = true
  load_balancer_type         = "application"
  subnets                    = aws_subnet.private[*].id
  security_groups            = [aws_security_group.alb.id]
  drop_invalid_header_fields = true
  enable_deletion_protection = true
  xff_header_processing_mode = "append"
  enable_xff_client_port     = false
}
resource "aws_lb_target_group" "app" {
  name                 = local.name
  vpc_id               = aws_vpc.app.id
  port                 = 3100
  protocol             = "HTTP"
  target_type          = "instance"
  deregistration_delay = 30
  health_check {
    path                = "/healthz"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.private.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.https.certificate_arn
  default_action {
    type             = "forward"
    order            = 1
    target_group_arn = aws_lb_target_group.app.arn
  }
}
