---
name: bpda-telemedicine-system
description: Work on the BPDA Telemedicine Center prescription management project. Use when modifying this React/Figma Make frontend, Supabase Edge Function backend, admin/doctor/polli-chikitsok role workflows, prescription archive, medicine list, backup/export/delete features, or production deployment configuration.
---

# BPDA Telemedicine System

## Project shape

- Frontend: React 18 + Vite + Tailwind CSS under `src/app/` and `src/styles/`.
- Main app entry: `src/app/App.tsx`.
- Admin dashboard: `src/app/components/AdminDashboard.tsx`.
- Database backup/delete UI: `src/app/components/DatabaseManagement.tsx`.
- Shared API helper: `src/app/lib/api.ts`.
- Supabase Edge Function: `supabase/functions/server/index.tsx`.
- KV helper: `supabase/functions/server/kv_store.tsx`.
- Supabase generated frontend info: `utils/supabase/info.tsx`.

## Product rules

Build for BPDA Telemedicine Center with these roles:

- `admin`: full control over users, doctors, medicines, prescriptions, archive, backup, and destructive database actions.
- `doctor`: can view/edit prescriptions from assigned `polli-chikitsok` users.
- `polli-chikitsok`: registers with email/phone, waits for admin approval, is assigned to a doctor, and can write prescriptions only from the admin-approved medicine list.

Preserve these core workflows:

1. User registration creates an unapproved user.
2. Admin approval sets `approved`, `doctor_id`, `can_write`, and prescription copy limits.
3. Medicine lists are admin-controlled.
4. Prescriptions must include automatic dates and support date-wise archive/history.
5. Admin can export backups and delete users/prescriptions/archive data only after confirmation.

## API conventions

Use `apiFetch` from `src/app/lib/api.ts` for frontend API calls. Do not add raw hardcoded Supabase `fetch` calls in components.

Production API configuration is environment-driven:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_FUNCTION_NAME=server
VITE_MAKE_SERVER_ID=make-server-f7e854ec
```

Or override the full API base:

```env
VITE_API_BASE_URL=https://your-project-id.supabase.co/functions/v1/server/make-server-f7e854ec
```

Critical operations, especially `/admin/export-all`, must not fake success when the backend is unavailable. Show a clear error instead.

Non-critical dashboard list loaders may return safe empty fallbacks so the UI remains usable when the backend is temporarily unavailable.

## Backup/export behavior

The admin backup flow must download a ZIP file from `DatabaseManagement.tsx`.

- ZIP filename: `bpda-telemedicine-backup-YYYY-MM-DD.zip`.
- ZIP contents: `bpda-telemedicine-backup-YYYY-MM-DD.json`.
- JSON should come from the real `/admin/export-all` Edge Function response.
- Do not generate fake successful backup data for production.
- Google Drive upload is currently manual to `bpdatelemedicine@gmail.com` unless a real Google Drive API integration is added.

## Supabase backend rules

Backend routes are mounted under:

```txt
/functions/v1/server/make-server-f7e854ec/...
```

The Hono app routes inside `supabase/functions/server/index.tsx` use paths like:

```txt
/make-server-f7e854ec/users
/make-server-f7e854ec/medicines
/make-server-f7e854ec/admin/export-all
```

Use the KV store prefixes consistently:

- Users: `user:`
- Prescriptions: `prescription:`
- Archive: `archive:`
- Video call requests: `video_call_request:`
- Medicines list: `medicines_list`

## UI implementation rules

- Preserve the Figma Make/Tailwind token contract in `src/styles/theme.css` and `src/styles/index.css`.
- Do not add a global CSS reset.
- Use Tailwind classes for styling.
- Keep existing Bengali UI copy where possible.
- Use clear Bengali production error messages for admin-facing failures.
- Keep destructive actions guarded by confirmation dialogs.

## Validation checklist

After changes:

1. Search for raw Supabase URLs in `src/app`; replace with `apiFetch` unless there is a strong reason.
2. Verify `src/app/lib/api.ts` still supports production environment variables.
3. Verify backup export does not report success if the Edge Function is unreachable.
4. Verify JSX braces/tags are balanced.
5. If build tooling is unavailable because this is a Figma Make project, at least run targeted grep/syntax inspection and report the limitation.
