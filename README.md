# DASH-247 — Relay's "is this normal for us?" dashboard

## Quick Start

### Prerequisites

- Docker and Docker Compose
- pnpm 11.22.0 (managed via corepack)

### Database Setup

Start the Postgres database:

```bash
docker compose up -d
```

This command will:
- Pull the Postgres 16.4 image (if not already present)
- Start the database service with a named volume for data persistence
- Run a healthcheck to ensure the database is ready

The database will be available at `localhost:5432` with default credentials documented in `.env.example`.
