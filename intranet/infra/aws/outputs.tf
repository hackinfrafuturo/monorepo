output "certificate_dns_validation" {
  value = [for option in aws_acm_certificate.https.domain_validation_options : {
    name = option.resource_record_name, type = option.resource_record_type, value = option.resource_record_value
  }]
}
output "backoffice_dns" {
  value = {
    name = local.domain, type = "CNAME", value = aws_lb.private.dns_name
  }
}
output "source_bucket" {
  value = aws_s3_bucket.source.bucket
}
output "build_project" {
  value = aws_codebuild_project.image.name
}
output "ecr_repository" {
  value = aws_ecr_repository.app.name
}
output "tailscale_routes" {
  value = local.private_cidrs
}
output "router_instance_id" {
  value = aws_instance.router.id
}
output "app_autoscaling_group" {
  value = try(aws_autoscaling_group.app[0].name, null)
}
output "alb_target_group_arn" {
  value = aws_lb_target_group.app.arn
}
