# Profile photos (admin panel)

## Canonical backend field

- `EmployeeProfile.profile_photo` (ImageField, `employee_photos/%Y/%m/`)
- `profile_photo_updated_at` — set on every upload for cache busting

## API fields (read)

- `profile_photo_url` — absolute URL via `request.build_absolute_uri`
- `profile_photo_updated_at` — ISO timestamp; append `?v=` in UI

## Upload (admin)

| Entity | Method | Endpoint | Body |
|--------|--------|----------|------|
| Employee | PATCH | `/api/v1/admin/employees/{profile_id}/photo/` | `multipart/form-data`, field `profile_photo` |
| Farmer | PATCH | `/api/v1/admin/farmers/{farmer_id}/photo/` | same |

## Upload (mobile employee)

| Method | Endpoint |
|--------|----------|
| PATCH | `/api/v1/mobile/profile/photo/` |
| PATCH | `/api/v1/employees/me/photo/` (alias, same DB field) |

Both update the same `profile_photo` on `EmployeeProfile`.

## Frontend

- `ProfileAvatar` — circular image or initials; hides broken images via `onError`
- `ProfilePhotoUpload` — preview, loading, error; calls upload APIs
- Employee list uses `employees/admin/employees/` when available (includes `profile_photo_url`)

## Limits

- Max 5 MB; JPG, PNG, WebP (backend validation)
