# Convex PostgreSQL Database
resource "digitalocean_database_cluster" "convex-postgres" {
  name       = "convex-postgres"
  engine     = "pg"
  version    = "17"
  size       = "db-s-2vcpu-4gb"
  region     = "nyc1"
  node_count = 1
}

# Convex App Platform Application
# resource "digitalocean_app" "convex-app" {
#   spec {
#     name   = "convex-backend"
#     region = "nyc"
    
#     domain {
#       name = "convex.texas25.jasonaa.me"
#     }    
    
#     domain {
#       name = "api.convex.texas25.jasonaa.me"
#     }
    
#     ingress {
#       rule {
#         component {
#           name = "dashboard"
#         }
#         match {
#           authority {
#             exact = "convex.texas25.jasonaa.me"
#           }
#         }
#       }
#       rule {
#         component {
#           name = "backend"
#         }
#         match {
#           authority {
#             exact = "api.convex.texas25.jasonaa.me"
#           }
#         }
#       }
#     }
    
#     # Convex Backend Service
#     service {
#       name               = "backend"
#       instance_count     = 1
#       instance_size_slug = "basic-xxs"
      
#       image {
#         registry_type = "GHCR"
#         registry = "get-convex"
#         repository    = "convex-backend"
#         tag          = "latest"
#       }

#       # http_port = 3210

#       health_check {
#         http_path             = "/version"
#         initial_delay_seconds = 10
#         period_seconds        = 5
#         timeout_seconds       = 5
#         success_threshold     = 1
#         failure_threshold     = 3
#       }

#       env {
#         key   = "POSTGRES_URL"
#         value = "postgres://${digitalocean_database_cluster.convex-postgres.user}:${digitalocean_database_cluster.convex-postgres.password}@${digitalocean_database_cluster.convex-postgres.host}:${digitalocean_database_cluster.convex-postgres.port}"
#         type  = "SECRET"
#       }

#       env {
#         key   = "CONVEX_CLOUD_ORIGIN"
#         value = "https://api.convex.texas25.jasonaa.me"
#         type  = "GENERAL"
#       }

#       env {
#         key   = "CONVEX_SITE_ORIGIN"
#         value = "https://api.convex.texas25.jasonaa.me"
#         type  = "GENERAL"
#       }

#       env {
#         key   = "RUST_LOG"
#         value = "info"
#         type  = "GENERAL"
#       }

#       env {
#         key   = "DOCUMENT_RETENTION_DELAY"
#         value = "172800"
#         type  = "GENERAL"
#       }

#       env {
#         key   = "INSTANCE_NAME"
#         value = "defaultdb"
#         type  = "GENERAL"
#       }
#     }

#     # Convex Dashboard Service
#     service {
#       name               = "dashboard"
#       instance_count     = 1
#       instance_size_slug = "basic-xxs"

#       image {
#         registry_type = "GHCR"
#         registry = "get-convex"
#         repository    = "convex-dashboard"
#         tag          = "latest"
#       }

#       # http_port = 6791

#       env {
#         key   = "NEXT_PUBLIC_DEPLOYMENT_URL"
#         value = "https://convex.texas25.jasonaa.me"
#         type  = "GENERAL"
#       }
#     }
#   }
# }