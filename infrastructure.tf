provider "aws" {
  region = "us-east-1"
}

# Cognito User Pool
resource "aws_cognito_user_pool" "novi_chat_pool" {
  name = "novi-chat-users"

  password_policy {
    minimum_length    = 6
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }
}

resource "aws_cognito_user_pool_client" "novi_chat_client" {
  name         = "novi-chat-client"
  user_pool_id = aws_cognito_user_pool.novi_chat_pool.id

  generate_secret = false
  explicit_auth_flows = [
    "ADMIN_NO_SRP_AUTH",
    "USER_PASSWORD_AUTH"
  ]
}

resource "aws_cognito_user" "admin_user" {
  user_pool_id = aws_cognito_user_pool.novi_chat_pool.id
  username     = "admin"
  
  temporary_password = "pass123"
  message_action     = "SUPPRESS"

  attributes = {
    email          = "admin@novamarket.com"
    email_verified = "true"
  }
}

resource "aws_cognito_user_pool_domain" "novi_chat_domain" {
  domain       = "novi-chat-${random_string.bucket_suffix.result}"
  user_pool_id = aws_cognito_user_pool.novi_chat_pool.id
}

# S3 Bucket para imágenes
resource "aws_s3_bucket" "pictures_bucket" {
  bucket = "novi-chat-pictures-${random_string.bucket_suffix.result}"
}

resource "aws_s3_bucket_cors_configuration" "pictures_bucket_cors" {
  bucket = aws_s3_bucket.pictures_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# IAM Role para Lambda
resource "aws_iam_role" "lambda_role" {
  name = "novi-chat-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "novi-chat-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.pictures_bucket.arn}/*"
      }
    ]
  })
}

# Función Lambda
resource "aws_lambda_function" "image_validator" {
  filename         = "image_validator.zip"
  function_name    = "novi-chat-image-validator"
  role            = aws_iam_role.lambda_role.arn
  handler         = "lambda_function.lambda_handler"
  runtime         = "python3.9"
  timeout         = 30

  depends_on = [data.archive_file.lambda_zip]
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "lambda_function.py"
  output_path = "image_validator.zip"
}

# S3 Bucket Notification
resource "aws_s3_bucket_notification" "pictures_notification" {
  bucket = aws_s3_bucket.pictures_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_validator.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.s3_invoke]
}

resource "aws_lambda_permission" "s3_invoke" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_validator.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.pictures_bucket.arn
}

# S3 Bucket para contenido estático
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "chatbot-frontend-${random_string.bucket_suffix.result}"
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_public_access_block" "frontend_bucket_pab" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend_bucket_pab]
}

resource "aws_s3_bucket_website_configuration" "frontend_bucket_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend_distribution" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend_bucket_website.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.frontend_bucket.bucket}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend_bucket.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

output "bucket_name" {
  value = aws_s3_bucket.frontend_bucket.bucket
}

output "pictures_bucket_name" {
  value = aws_s3_bucket.pictures_bucket.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend_distribution.domain_name
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.novi_chat_pool.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.novi_chat_client.id
}

output "cognito_domain" {
  value = aws_cognito_user_pool_domain.novi_chat_domain.domain
}
