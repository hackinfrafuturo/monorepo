resource "aws_s3_bucket" "source" {
  bucket = "${local.name}-source-${var.aws_account_id}-${var.aws_region}"
}
resource "aws_s3_bucket_public_access_block" "source" {
  bucket                  = aws_s3_bucket.source.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_versioning" "source" {
  bucket = aws_s3_bucket.source.id
  versioning_configuration {
    status = "Enabled"
  }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "source" {
  bucket = aws_s3_bucket.source.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
resource "aws_ecr_repository" "app" {
  name                 = local.name
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  encryption_configuration {
    encryption_type = "AES256"
  }
}
resource "aws_cloudwatch_log_group" "build" {
  name              = "/backoffice/build"
  retention_in_days = 14
}
resource "aws_cloudwatch_log_group" "app" {
  name              = "/backoffice/app"
  retention_in_days = 14
}
resource "aws_iam_role" "build" {
  name_prefix = "${local.name}-build-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Principal = {
        Service = "codebuild.amazonaws.com"
      }, Action = "sts:AssumeRole"
    }]
  })
}
resource "aws_iam_role_policy" "build" {
  role = aws_iam_role.build.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [
      {
        Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion"], Resource = "${aws_s3_bucket.source.arn}/backoffice/source.zip"
      },
      {
        Effect = "Allow", Action = ["s3:GetBucketLocation", "s3:GetBucketVersioning"], Resource = aws_s3_bucket.source.arn
      },
      {
        Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*"
      },
      {
        Effect = "Allow", Action = ["ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:DescribeImages"], Resource = aws_ecr_repository.app.arn
      },
      {
        Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.build.arn}:*"
      }
    ]
  })
}
resource "aws_codebuild_project" "image" {
  name          = local.name
  service_role  = aws_iam_role.build.arn
  build_timeout = 30
  source {
    type      = "S3"
    location  = "${aws_s3_bucket.source.bucket}/backoffice/source.zip"
    buildspec = "intranet/infra/aws/buildspec.yml"
  }
  artifacts {
    type = "NO_ARTIFACTS"
  }
  environment {
    type            = "LINUX_CONTAINER"
    image           = "aws/codebuild/standard:7.0"
    compute_type    = "BUILD_GENERAL1_SMALL"
    privileged_mode = true
    environment_variable {
      name  = "ECR_REPOSITORY_URI"
      value = aws_ecr_repository.app.repository_url
    }
    environment_variable {
      name  = "IMAGE_TAG"
      value = "SET_AT_BUILD_START"
    }

  }
  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.build.name
    }
  }
}
