resource "aws_ecs_cluster" "main" { name = var.app_name }
variable "app_name" { type = string }
variable "environment" { type = string }
variable "image_uri" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
output "service_url" { value = aws_ecs_cluster.main.name }
