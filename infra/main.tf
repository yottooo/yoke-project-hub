# Local development infrastructure for Yoke, managed with Terraform.
# Creates the same PostgreSQL, Redis and pgAdmin containers as docker-compose.yml.
# Use one or the other, not both: they publish the same ports.
#
#   terraform init      # once: downloads the Docker provider
#   terraform plan      # preview what will change
#   terraform apply     # create/update the containers
#   terraform destroy   # remove everything this file created

terraform {
  required_version = ">= 1.5"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# ---------------------------------------------------------------------------
# Inputs. Values come from terraform.tfvars (see terraform.tfvars.example).
# ---------------------------------------------------------------------------

variable "docker_host" {
  description = "How Terraform reaches Docker. The default is Docker Desktop on Windows; use unix:///var/run/docker.sock on macOS/Linux."
  type        = string
  default     = "npipe:////.//pipe//docker_engine"
}

variable "db_username" {
  description = "PostgreSQL user. Must match DB_USERNAME in the root .env."
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "PostgreSQL password. Must match DB_PASSWORD in the root .env."
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database created on first start. Must match DB_NAME in the root .env."
  type        = string
  default     = "project_hub"
}

variable "db_port" {
  description = "Host port for PostgreSQL. Must match DB_PORT in the root .env."
  type        = number
  default     = 5432
}

variable "redis_port" {
  description = "Host port for Redis. Must match REDIS_PORT in the root .env."
  type        = number
  default     = 6379
}

variable "pgadmin_email" {
  description = "Login email for the pgAdmin web UI."
  type        = string
  default     = "admin@admin.com"
}

variable "pgadmin_password" {
  description = "Login password for the pgAdmin web UI."
  type        = string
  sensitive   = true
}

provider "docker" {
  host = var.docker_host
}

# ---------------------------------------------------------------------------
# Shared network and storage
# ---------------------------------------------------------------------------

# Compose creates a network automatically; here it is explicit so pgAdmin
# can reach Postgres by the hostname "db".
resource "docker_network" "yoke" {
  name = "yoke"
}

# Keeps database files when the container is replaced. `terraform destroy`
# deletes it too, so your local data goes with it.
resource "docker_volume" "postgres_data" {
  name = "yoke_postgres_data"
}

# ---------------------------------------------------------------------------
# Images (pulled from Docker Hub)
# ---------------------------------------------------------------------------

resource "docker_image" "postgres" {
  name         = "postgres:15-alpine"
  keep_locally = true
}

resource "docker_image" "redis" {
  name         = "redis:7-alpine"
  keep_locally = true
}

resource "docker_image" "pgadmin" {
  name         = "dpage/pgadmin4"
  keep_locally = true
}

# ---------------------------------------------------------------------------
# Containers
# ---------------------------------------------------------------------------

resource "docker_container" "postgres" {
  name    = "yoke-postgres"
  image   = docker_image.postgres.image_id
  restart = "always"

  env = [
    "POSTGRES_USER=${var.db_username}",
    "POSTGRES_PASSWORD=${var.db_password}",
    "POSTGRES_DB=${var.db_name}",
  ]

  ports {
    internal = 5432
    external = var.db_port
  }

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name    = docker_network.yoke.name
    aliases = ["db"]
  }
}

resource "docker_container" "redis" {
  name    = "yoke-redis"
  image   = docker_image.redis.image_id
  restart = "always"

  ports {
    internal = 6379
    external = var.redis_port
  }

  networks_advanced {
    name = docker_network.yoke.name
  }
}

resource "docker_container" "pgadmin" {
  name    = "yoke-pgadmin"
  image   = docker_image.pgadmin.image_id
  restart = "always"

  env = [
    "PGADMIN_DEFAULT_EMAIL=${var.pgadmin_email}",
    "PGADMIN_DEFAULT_PASSWORD=${var.pgadmin_password}",
  ]

  ports {
    internal = 80
    external = 5050
  }

  networks_advanced {
    name = docker_network.yoke.name
  }

  depends_on = [docker_container.postgres]
}

# ---------------------------------------------------------------------------
# Outputs, printed after `terraform apply` (or run `terraform output`)
# ---------------------------------------------------------------------------

output "postgres" {
  description = "Where the API connects to PostgreSQL."
  value       = "localhost:${var.db_port} (database ${var.db_name}, user ${var.db_username})"
}

output "redis" {
  description = "Where the API connects to Redis."
  value       = "localhost:${var.redis_port}"
}

output "pgadmin_url" {
  description = "pgAdmin web UI. Register a server with host \"db\", port 5432."
  value       = "http://localhost:5050"
}
