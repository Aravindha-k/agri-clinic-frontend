# Visit location / reverse geocoding

## Backend fields (persist on Visit)

| Field | Example |
|-------|---------|
| `location_name` | Annur |
| `locality` | Annur |
| `district` | Coimbatore |
| `state` | Tamil Nadu |
| `formatted_address` | Annur, Coimbatore, Tamil Nadu |
| `address` | alias of `formatted_address` (legacy) |
| `latitude` / `longitude` | 11.144800, 77.083800 |

Mobile app should call reverse geocoding when GPS is captured and **save these fields on visit create/complete**.  
Submit must **not** fail if geocoding fails — store coordinates only.

## Admin panel

- **Display:** `formatted_address` (or composed fields) shown prominently; coordinates shown smaller below.
- **Legacy visits:** one Nominatim lookup per coordinate pair, cached in `localStorage` (`agri_geocode_v1:lat,lng`). Not called on every page load if DB/cache has address.
- **Create visit:** optional client geocode preview; `createVisit` enriches payload before POST if address missing.

## Geocoding service

OpenStreetMap **Nominatim** (`reverseGeocode.js`), 1 req/s, User-Agent set.

## API

`POST/PATCH visits/` — include location fields in body.  
`GET admin/visits/{id}/` — return location fields for admin detail UI.
