terraform {
  required_version = ">= 1.10, < 2.0"
  required_providers {
    aws = {
      source = "hashicorp/aws", version = "~> 6.0"
    }
  }
}

variable "aws_account_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "Set the intended 12-digit AWS account ID."
  }
}
variable "aws_region" {
  type = string
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "Use a standard AWS commercial region name."
  }
}
variable "vpc_cidr" {
  type    = string
  default = "10.203.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 1)) && can(regex("^[0-9.]+/16$", var.vpc_cidr))
    error_message = "Choose a non-overlapping IPv4 /16."
  }
}
variable "runtime_secret_arn" {
  type        = string
  description = "Existing Secrets Manager JSON secret: INFRA_FUTURO_API_TOKEN. Never put values in Terraform."
  validation {
    condition     = can(regex("^arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:[A-Za-z0-9/_+=.@-]+$", var.runtime_secret_arn))
    error_message = "Use a Secrets Manager ARN in the selected region and account."
  }
}
variable "tailscale_auth_secret_arn" {
  type        = string
  description = "Existing Secrets Manager secret containing only the router enrollment key for the intended tailnet."
  validation {
    condition     = can(regex("^arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:[A-Za-z0-9/_+=.@-]+$", var.tailscale_auth_secret_arn))
    error_message = "Use a Secrets Manager ARN in the selected region and account."
  }
}
variable "tailscale_expected_tailnet" {
  type        = string
  description = "Exact tailnet StableID from the admin console, or CurrentTailnet.Name. Enrollment fails closed if it differs."
  validation {
    condition     = can(regex("^[A-Za-z0-9@._-]+$", var.tailscale_expected_tailnet))
    error_message = "Use the exact tailnet name, without shell metacharacters."
  }
}
variable "secrets_kms_key_arns" {
  type        = list(string)
  default     = []
  description = "Customer-managed KMS keys used by the two secrets, if any."
}
variable "image_digest" {
  type        = string
  default     = null
  description = "Deploy only an immutable ECR sha256 digest. Null prepares infrastructure without an app instance."
  validation {
    condition     = var.image_digest == null ? true : can(regex("^sha256:[a-f0-9]{64}$", var.image_digest))
    error_message = "Use an immutable sha256 ECR digest."
  }
}

provider "aws" {
  region              = var.aws_region
  allowed_account_ids = [var.aws_account_id]
  default_tags {
    tags = {
      Project = "infra-futuro", Service = "backoffice", ManagedBy = "terraform"
    }
  }
}
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}
data "aws_ami" "linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
locals {
  name          = "hif-backoffice"
  domain        = "backoffice.hackinfrafuturo.cl"
  azs           = slice(data.aws_availability_zones.available.names, 0, 2)
  router_ip     = cidrhost(cidrsubnet(var.vpc_cidr, 8, 0), 10)
  private_cidrs = [for index in range(2) : cidrsubnet(var.vpc_cidr, 8, 16 + index)]
  app_image     = var.image_digest == null ? "" : "${aws_ecr_repository.app.repository_url}@${var.image_digest}"
}
