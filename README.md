# WWT Custom App

WWT-branded web application for the Palette Edge update demo. Two versions with visible differences demonstrate profile version bumps rolling out across edge clusters.

## Architecture

- **v1.0.0**: Green badge, "Deployed via Palette Edge"
- **v2.0.0**: Blue badge, "Updated via Palette Profile Versioning", "What's New" card

## Build

```bash
# Build both versions
docker build --build-arg APP_VERSION=v1 -t nctiggy/wwt-custom-app:1.0.0 -f app/Dockerfile .
docker build --build-arg APP_VERSION=v2 -t nctiggy/wwt-custom-app:2.0.0 -f app/Dockerfile .

# Push to Docker Hub
docker push nctiggy/wwt-custom-app:1.0.0
docker push nctiggy/wwt-custom-app:2.0.0
```

## Helm Chart

```bash
# Lint
helm lint charts/wwt-custom-app

# Template
helm template wwt-app charts/wwt-custom-app

# Install locally
helm install wwt-app charts/wwt-custom-app

# From GitHub Pages repo
helm repo add wwt https://nctiggy.github.io/wwt-custom-app
helm install wwt-app wwt/wwt-custom-app

# From GHCR OCI
helm install wwt-app oci://ghcr.io/nctiggy/charts/wwt-custom-app --version 1.0.0
```

## Demo Workflow

1. Deploy v1.0.0 via Palette add-on profile
2. Show app at `<node-ip>:30080` — green badge, v1
3. Bump profile version to 2.0.0 in Terraform
4. Apply — Palette rolls out update
5. Refresh — blue badge, v2, "What's New" card
