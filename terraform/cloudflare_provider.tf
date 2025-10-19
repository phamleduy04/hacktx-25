terraform {
  # backend "s3" {
  #   bucket = "<YOUR_BUCKET_NAME>"
  #   key    = "terraform.tfstate"
  #   region                      = "auto"
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  #   skip_s3_checksum            = true
  #   use_path_style              = true
  #   access_key = "<YOUR_R2_ACCESS_KEY>"
  #   secret_key = "<YOUR_R2_ACCESS_SECRET>"
  #   endpoints = { s3 = "https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com" }
  # }
}
provider "cloudflare" {
  # token pulled from $CLOUDFLARE_API_TOKEN
}


variable "zone_id" {
  default = "2e7930837dd10f92fca8aab02cf79159"
}

variable "account_id" {
  default = "1b64a8c4eff655773684dc27044290ac"
}

variable "domain" {
  default = "texas25.jasonaa.me"
}

variable "frontend_project_name" {
  default = "texas25-frontend"
}

variable "frontend_production_branch" {
  default = "main"
}

# resource "cloudflare_pages_project" "frontend" {
#   account_id        = var.account_id
#   name              = var.frontend_project_name
#   production_branch = var.frontend_production_branch

#   build_config {
#     root_dir            = "."
#     build_command       = "npm run build"
#     destination_dir     = "dist"
#   }

#   source {
#       type = "github"
#       config {
#         # NOTE(@jasonappah): deploying from a fork of the repo to address permissions issues,
#         # as my personal Cloudflare account is already linked to my personal GitHub
#         # account and seems not to play nicely with deploying repos owned by other GitHub users.
#         owner                         = "phamleduy04"
#         repo_name                     = "hacktx-25"
#         production_branch             = var.frontend_production_branch
#         pr_comments_enabled           = true
#         deployments_enabled           = true
#         production_deployment_enabled = true
#         preview_deployment_setting    = "custom"
#         preview_branch_excludes       = [var.frontend_production_branch]
#       }
#     }
# }

# resource "cloudflare_pages_domain" "frontend_domain" {
#   account_id   = var.account_id
#   project_name = var.frontend_project_name
#   name       = var.domain
# }

# resource "cloudflare_record" "frontend_domain_record" {
#   zone_id = var.zone_id
#   name    = var.domain
#   content   = "${var.frontend_project_name}.pages.dev"
#   type    = "CNAME"
#   proxied = true
# }

# resource "cloudflare_record" "backend_domain_record" {
#   zone_id = var.zone_id
#   name    = "api.${var.domain}"
#   content   = "hackutd24-latest.onrender.com"
#   type    = "CNAME"
#   proxied = false
# }