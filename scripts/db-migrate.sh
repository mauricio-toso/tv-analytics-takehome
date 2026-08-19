#!/bin/bash
# Wrapper script to run node-pg-migrate from inside the Docker container
# This works around Windows host authentication issues with the Postgres container

set -e

# Copy migration files and config into container (if needed)
# For now, mount the migrations directory and run node-pg-migrate inside the container

# Run node-pg-migrate from inside the container with proper DATABASE_URL
docker compose exec -T postgres sh -c "
  cd /tmp &&
  DATABASE_URL='postgresql://dash247:dash247_dev@localhost:5432/dash247' \
  node-pg-migrate up --migrations-dir=/migrations
"
