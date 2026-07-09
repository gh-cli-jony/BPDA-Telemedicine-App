# BPDA Telemedicine Center — Project Creation Prompt

Create a production-ready multi-user prescription management system for **BPDA Telemedicine Center**.

The system must support an admin, approximately 30 doctors, and approximately 250 polli-chikitsok / rural medical assistants. It must include role-based permissions, prescription creation/editing, approved medicine control, video call requests, archive/history, data backup/export, and secure admin database management.

## 1. Technology Stack

Use this stack:

- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS
- UI style: clean medical admin interface with Bengali-friendly typography and responsive layout
- Backend: Supabase Edge Functions using Hono
- Database: Supabase PostgreSQL or Supabase KV-style storage
- Authentication: Supabase-compatible auth or project-managed email/password authentication
- File export: downloadable ZIP backup containing JSON data
- Deployment: production-ready Supabase Edge Function + frontend build

## 2. User Roles

Implement three main roles.

### Admin

Admin has full system control:

- Login with protected admin credentials.
- View dashboard summary.
- View pending user registrations.
- Approve or reject users.
- Assign polli-chikitsok users to doctors.
- Create/manage doctors.
- View all users.
- Delete users.
- Manage approved medicine list.
- View all prescriptions.
- Edit prescriptions if needed.
- View date-wise prescription archive.
- Export full database backup as ZIP.
- Delete users, prescriptions, archive, or wipe database with strong confirmation.
- View system/backend configuration status.

### Doctor

Doctor can:

- Login after admin approval.
- View assigned polli-chikitsok users.
- View prescriptions created by assigned polli-chikitsok users.
- Edit prescriptions from assigned polli-chikitsok users.
- Create prescriptions if allowed.
- View prescription archive/history.
- Handle video call requests.

### Polli Chikitsok

Polli-chikitsok can:

- Register using name, email, phone, and password.
- Wait for admin approval.
- Login only after approval.
- Be assigned under one doctor by admin.
- Create prescriptions only if `can_write` is enabled.
- Use only admin-approved medicine list.
- View own prescriptions and archive.
- Request video call with assigned doctor.

## 3. Core Data Models

Use these logical models.

### User

```ts
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'admin' | 'doctor' | 'polli-chikitsok';
  approved: boolean;
  doctor_id?: string | null;
  can_write: boolean;
  prescription_copies?: number;
  created_at: number;
}
```

### Prescription

```ts
interface Prescription {
  id: string;
  patientName: string;
  gender: string;
  age: string;
  drName: string;
  hoCode: string;
  date: string;
  cc: string;
  oe: string;
  advice: string;
  rx: string;
  nextVisit: string;
  status: string;
  createdAt: number;
  createdBy: string;
  userId: string;
  completed?: boolean;
  completedAt?: number;
}
```

### Medicine List

```ts
interface MedicineList {
  medicines: string[];
}
```

### Video Call Request

```ts
interface VideoCallRequest {
  id: string;
  requestedBy: string;
  doctorId: string;
  prescriptionId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: number;
}
```

## 4. Supabase / KV Storage Keys

If using KV-style storage, use these key prefixes:

- Users: `user:{userId}`
- Prescriptions: `prescription:{prescriptionId}`
- Archived prescriptions: `archive:{userId}:{date}:{prescriptionId}`
- Video call requests: `video_call_request:{requestId}`
- Medicine list: `medicines_list`

## 5. Backend API Structure

Create a Supabase Edge Function named `server`.

Frontend base URL should be configurable:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_FUNCTION_NAME=server
VITE_MAKE_SERVER_ID=make-server-f7e854ec
```

Or:

```env
VITE_API_BASE_URL=https://your-project-id.supabase.co/functions/v1/server/make-server-f7e854ec
```

Backend route prefix:

```txt
/functions/v1/server/make-server-f7e854ec
```

Implement these endpoints:

### Health

```txt
GET /health
```

Returns backend status.

### Auth / Users

```txt
POST /register
POST /login
GET /user/:userId
GET /users/pending
POST /users/approve
GET /doctors
GET /users
DELETE /users/:userId
POST /users/update-copies
```

### Doctor Assignment

```txt
GET /doctor/:doctorId/polli-chikitsok
```

### Medicines

```txt
GET /medicines
POST /medicines
```

### Prescriptions

```txt
GET /prescriptions
POST /prescription
PUT /prescription/:id
DELETE /prescription/:id
POST /prescription/:id/complete
GET /prescriptions/current
GET /prescriptions/archive/:userId/dates
GET /prescriptions/archive/:userId/:date
```

### Video Calls

```txt
POST /video-call-request
GET /video-call-requests/:doctorId
POST /video-call-request/:id/status
```

### Admin Backup / Delete

```txt
GET /admin/export-all
DELETE /admin/delete-all-users
DELETE /admin/delete-all-prescriptions
DELETE /admin/delete-all-archived
DELETE /admin/wipe-database
```

## 6. Frontend File Structure

Create this structure:

```txt
src/
  app/
    App.tsx
    lib/
      api.ts
    components/
      AdminDashboard.tsx
      RegisterForm.tsx
      ProfileManagement.tsx
      DatabaseManagement.tsx
      SystemInfo.tsx
  styles/
    fonts.css
    theme.css
    index.css
supabase/
  functions/
    server/
      index.tsx
      kv_store.tsx
utils/
  supabase/
    info.tsx
BACKUP_AND_DELETE_GUIDE.md
SKILL.md
project.md
```

## 7. Frontend Requirements

### App Shell

The main app should include:

- Login screen.
- Register screen.
- Role-aware dashboard routing without exposing unauthorized actions.
- Admin dashboard for admin users.
- Prescription dashboard for doctors and polli-chikitsok users.
- Logout.

### Admin Dashboard Tabs

Admin dashboard should include tabs for:

1. Pending approvals
2. Medicine management
3. All users
4. All prescriptions
5. Profiles / doctor-polli assignment view
6. Database backup/delete
7. System info

### Prescription Form

Prescription form should include:

- Patient name
- Gender
- Age
- Doctor name
- HO code
- Automatic date
- Chief complaint / CC
- OE
- Advice
- RX / medicine section
- Next visit
- Save/update button

Medicine input must be restricted to admin-approved medicines.

### Archive

Implement date-wise prescription archive:

- Show available archive dates.
- Load prescriptions by selected date.
- Allow admin/doctor/user view based on permission.

## 8. API Helper Requirements

Create `src/app/lib/api.ts`.

It must:

- Build API base URL from environment variables.
- Attach Supabase anon token to requests.
- Support `GET`, `POST`, `PUT`, `DELETE`.
- Apply request timeout, e.g. 30 seconds.
- Throw clear production errors for critical operations.
- Never fake successful backup export.
- Optionally return safe empty arrays for non-critical dashboard list loaders when backend is temporarily unavailable.

Critical route:

```txt
/admin/export-all
```

This route must fail clearly if the backend is unavailable.

## 9. Backup Export Requirement

Admin backup must create a downloadable ZIP file.

ZIP filename:

```txt
bpda-telemedicine-backup-YYYY-MM-DD.zip
```

ZIP contents:

```txt
bpda-telemedicine-backup-YYYY-MM-DD.json
```

JSON must include:

```ts
{
  export_date: string;
  export_timestamp: number;
  users: User[];
  prescriptions: Prescription[];
  medicines: string[];
  video_call_requests: VideoCallRequest[];
  archived_prescriptions: Prescription[];
  metadata: {
    total_users: number;
    total_prescriptions: number;
    total_medicines: number;
    total_video_requests: number;
    total_archived: number;
  };
}
```

The backup flow should show Bengali success/error messages.

Manual Google Drive backup instruction:

- Download ZIP.
- Login to Google Drive using `bpdatelemedicine@gmail.com`.
- Upload ZIP into a `BPDA Backups` folder.

## 10. Delete / Wipe Safety

Destructive admin actions must have strong confirmation.

For full database wipe:

- First confirmation dialog.
- Second confirmation dialog reminding backup requirement.
- Third final confirmation.
- Prompt user to type exactly `DELETE ALL`.

Only then perform wipe.

## 11. Security Requirements

For production:

- Do not expose service role keys in frontend.
- Use Supabase service role key only inside Edge Functions.
- Validate role permissions on backend, not only frontend.
- Admin-only endpoints must verify admin identity.
- Do not store plaintext passwords in production; use Supabase Auth or password hashing.
- Use HTTPS-only deployment.
- Keep CORS configured for production domain where possible.

## 12. UI / Styling Requirements

Use Tailwind CSS.

Design requirements:

- Professional medical admin dashboard look.
- Bengali text support.
- Responsive layout for desktop/tablet/mobile.
- Clear visual distinction between admin, doctor, and polli-chikitsok actions.
- High contrast text.
- Clear loading, success, and error states.
- No global CSS reset beyond Tailwind.

Preserve Tailwind theme token contract:

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--border`
- `--ring`
- `--radius`

## 13. Production Deployment Checklist

Before production:

1. Deploy Supabase Edge Function named `server`.
2. Set `SUPABASE_URL` in Edge Function environment.
3. Set `SUPABASE_SERVICE_ROLE_KEY` in Edge Function environment.
4. Set frontend environment variables.
5. Verify `/health` endpoint works.
6. Verify registration works.
7. Verify admin can approve users.
8. Verify doctor assignment works.
9. Verify medicine list loads and updates.
10. Verify prescription create/edit/archive works.
11. Verify backup ZIP downloads real data.
12. Verify delete/wipe actions are protected.
13. Verify no service role key exists in frontend bundle.

## 14. Expected Deliverables

Deliver a complete working codebase with:

- React frontend.
- Supabase Edge Function backend.
- Role-based dashboards.
- Medicine management.
- Prescription management.
- Archive system.
- Video call request workflow.
- Admin backup ZIP export.
- Admin delete/wipe controls.
- Production-ready API helper.
- Bengali UI copy where appropriate.
- Setup/deployment guide.

