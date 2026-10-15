# URL Shortener

A self-hosted URL shortener with click analytics, re-pointing, search, and delete.

Built as two Node.js microservices backed by PostgreSQL and deployed to Kubernetes.

## Features

- Create short links from long URLs
- Redirect visitors to the original URL
- Re-point an existing link without changing the short code
- Search saved links by keyword
- Delete links along with their click history
- View click counts per link

## Architecture

- **shortener-service** — REST API for URL management (port 3000)
- **stats-service** — REST API for click analytics (port 3001)
- **PostgreSQL** — persistent storage (via PersistentVolumeClaim)
- **Kubernetes Ingress** — exposes the app at ``http://url-shortener.local``

The two services communicate over REST. The redirect endpoint calls stats-service
in a fire-and-forget manner, so an analytics outage never breaks the user-facing redirect.

## Deployment

Prerequisites: Docker Desktop with Kubernetes enabled, and the nginx Ingress controller installed.
