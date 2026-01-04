# Traccar GPS Tracking Integration

## Overview
- Traccar service runs as `traccar` in Docker; the backend reaches it at `http://traccar:8082`.
- Tracking endpoints and UI are admin-only; Traccar credentials never leave the server.
- Recommended polling: 5-10 seconds (backend enforces `BC_TRACCAR_MIN_POLL_INTERVAL`, default 5s).

## Run with Docker Compose
```bash
# Bring up Traccar + backend + Mongo
docker compose up -d traccar mongo bc-backend
# Or start everything
docker compose up -d
```
- Traccar UI: http://localhost:8082  
- Admin panel: http://localhost:3001

## First-time Traccar setup
1. Sign in to Traccar (default admin/admin).
2. Create a device (e.g., your tracker/IMEI).
3. Note the `deviceId` and `uniqueId` (IMEI).
4. Configure your hardware (e.g., FMC920) to point to your host/IP on port **5027** (Teltonika protocol).

## Map BookCars cars to Traccar devices
1. In BookCars Admin, open **Create Car** or **Update Car**.
2. Fill:
   - **Traccar Device ID**: numeric `deviceId`.
   - **Traccar Unique ID / IMEI**: optional but recommended.
3. Save. Device/unique IDs must be unique across cars.

## Admin-only tracking endpoints
- `GET /api/admin/cars/:carId/tracking`
- `GET /api/admin/fleet/tracking`

Responses include status (`ok`, `no_fix_yet`, `not_mapped`, `device_not_found`, `rate_limited`, `traccar_not_configured`) and `pollAfterSeconds`. Do not poll faster than the returned interval.

## Admin UI
- **Fleet Tracking** (`/fleet-tracking`): markers for all mapped cars, polling every 5-10 seconds.
- **Car Tracking** (`/car-tracking?cr=<carId>`): last known point, speed/heading, and timestamps.
- Renters/customers cannot see these pages or endpoints.

## Environment variables
- `BC_TRACCAR_BASE_URL` (e.g., `http://traccar:8082`)
- `BC_TRACCAR_USER`
- `BC_TRACCAR_PASS`
- `BC_TRACCAR_MIN_POLL_INTERVAL` (seconds, default 5)

## Notes
- Credentials remain server-side; no immobilization/engine-stop features are exposed.
- Keep polling to 5-10 seconds to avoid load on Traccar and the GPS devices.
