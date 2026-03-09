# MyBarber Server

## Setup

1. Copy `.env.example` to `.env`.
2. Fill real values for `DATABASE_URL`, `JWT_SECRET`, `ADMIN_API_KEY`.
3. Install deps:

```bash
npm install
```

4. Generate Prisma client + sync schema:

```bash
npm run prisma:generate
npm run prisma:push
```

5. Start in dev:

```bash
npm run dev
```

## Setup Rapido Cloud (consigliato, senza Docker)

1. Crea un database PostgreSQL su Neon o Supabase.
2. Copia la connection string in `server/.env` come `DATABASE_URL`.
3. Assicurati che la URL abbia `sslmode=require`.

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require&pgbouncer=true&connect_timeout=15
```

Comandi (Windows PowerShell):

```powershell
cd server
cmd /c npm install
cmd /c npm run db:check
cmd /c npm run db:init
cmd /c npm run dev
```

## Email Benvenuto (SMTP)

Quando un utente si registra, il backend puo inviare automaticamente una email di benvenuto.

Variabili da configurare in `.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=MyBarber <noreply@barberapp.com>
SMTP_REPLY_TO=support@barberapp.com
```

Note:
- Se non configuri SMTP, la registrazione funziona lo stesso (email saltata).
- In ambiente `test` le email vengono sempre saltate.

## Reset Password via Email

Con `POST /api/auth/forgot-password` il server genera una key di reset e invia una email al cliente.

Note:
- La key scade in 15 minuti.
- `POST /api/auth/reset-password` richiede `token` (key ricevuta) + `newPassword`.
- In sviluppo non-production la risposta API include anche `passwordResetToken` per debug.

## Social Login (Google, Apple, Facebook)

Il backend supporta `POST /api/auth/social-login` con verifica token lato server.

Variabili da configurare in `.env`:

```env
GOOGLE_OAUTH_CLIENT_IDS=google-client-id.apps.googleusercontent.com
APPLE_CLIENT_IDS=com.barberapp.mobile,com.barberapp.service
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=facebook-app-secret
```

Note:
- `FACEBOOK_APP_SECRET` e opzionale, ma consigliata per validazione token con `debug_token`.
- Dopo modifica schema Prisma, esegui `npm run prisma:push`.

## Core Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/social-login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me/avatar`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/request-email-verification`
- `POST /api/auth/verify-email`
- `POST /api/auth/booking-confirmation-email`
- `POST /api/auth/booking-cancellation-email`
- `GET /api/auth/users` (requires `x-admin-key`)

## Admin Endpoints (JWT admin role required)

- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/users/:id/role`
- `POST /api/admin/users/:id/reset-password`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/audit-logs`

## Health

- `GET /healthz`
- `GET /readyz`

## Tests

```bash
npm test
```

## Docker

From project root:

```bash
docker compose up --build
```
