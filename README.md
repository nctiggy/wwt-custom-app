# WWT Gas

Costco fuel station attendant app for the WWT Palette Edge demo. iPad-optimized, touch-first dark mode dashboard. Two versions demonstrate Palette profile version bumps.

## Versions

- **v1.0 — Station Monitor**: Manual pump grid. Tap to toggle occupied/available. Stats bar with avg time + cars served.
- **v2.0 — Smart Station Manager**: Simulated occupancy sensors (auto-detect arrivals/departures), overstay alerts, smart lane recommendations, live analytics panel, toast notifications.

## Build

```bash
docker build --build-arg APP_VERSION=v1 -t nctiggy/wwt-custom-app:1.0.0 -f app/Dockerfile .
docker build --build-arg APP_VERSION=v2 -t nctiggy/wwt-custom-app:2.0.0 -f app/Dockerfile .
```

## Helm Chart

Chart lives in [nctiggy/helm-library](https://github.com/nctiggy/helm-library) under `charts/wwt-custom-app/`.

## Demo Flow

1. Deploy v1 via Palette add-on profile — attendant manually taps pumps
2. Bump profile version 1.0.0 → 2.0.0 — Palette rolls out update
3. App upgrades to Smart Station Manager — sensors auto-detect, analytics panel appears
