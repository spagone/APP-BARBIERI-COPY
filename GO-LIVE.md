# Go Live MyBarber (Subito)

Questa guida mette online **API** + **dashboard admin** in pochi minuti, continuando a sviluppare dopo.

## 1) Backend online (Render)

1. Vai su Render: `https://render.com`
2. `New` -> `Web Service`
3. Collega il repo `APP-BARBIERI`
4. Imposta:
   - `Root Directory`: `server`
   - `Build Command`: `npm ci && npm run prisma:generate`
   - `Start Command`: `npm start`
5. Inserisci le env var minime:
   - `DATABASE_URL` = stringa Neon PostgreSQL
   - `JWT_SECRET` = stringa lunga (min 32 caratteri)
   - `JWT_ACCESS_EXPIRES=15m`
   - `JWT_REFRESH_EXPIRES_DAYS=30`
   - `TRUST_PROXY=true`
   - `CORS_ORIGINS=https://admin.tuo-dominio.com,https://tuo-admin.onrender.com,http://localhost:4173`
   - `ADMIN_BOOTSTRAP_NAME=MyBarber Super Admin`
   - `ADMIN_BOOTSTRAP_EMAIL=la-tua-admin-email`
   - `ADMIN_BOOTSTRAP_PASSWORD=una-password-forte`
   - SMTP/social env se gia configurate
6. Primo deploy completato -> apri la Shell del servizio e lancia:
   - `npm run prisma:push`
7. Verifica API online:
   - `https://tuo-api.onrender.com/healthz`

## 2) Dashboard admin online

1. In `admin-dashboard/config.js` imposta l'URL API reale:

```js
window.MYBARBER_CONFIG = {
  apiBaseUrl: 'https://tuo-api.onrender.com',
};
```

2. Su Render crea `New` -> `Static Site`
3. Collega lo stesso repo
4. Imposta:
   - `Root Directory`: `admin-dashboard`
   - `Build Command`: lascia vuoto
   - `Publish Directory`: `.`
5. Apri il link pubblico dashboard e fai login admin.

## 3) Collegare l'app mobile all'API online

Nel file `barber-app/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://tuo-api.onrender.com
```

Poi avvia app:

```powershell
cd barber-app
cmd /c npx expo start -c
```

## 4) Dominio personalizzato (consigliato subito)

1. API: `api.tuodominio.com` -> CNAME verso Render API
2. Admin: `admin.tuodominio.com` -> CNAME verso Render Static Site
3. Aggiorna `CORS_ORIGINS` con i domini finali HTTPS.

## 5) Go-live check finale

1. `GET /healthz` API = 200
2. Login admin funzionante in dashboard online
3. Registrazione utente da app = OK
4. Email benvenuto/reset/prenotazione = ricevute
5. Dashboard si aggiorna live (auto-refresh)

## 6) Deploy con comando unico (VSCode)

Se hai gia configurato Auto-Deploy su Render/Vercel:

```powershell
cd C:\Users\Andre\Desktop\APP-BARBIERI
.\deploy-online.ps1 "update home"
```

Oppure da VSCode:
- `Terminal -> Run Task -> Deploy Online`

Il comando fa:
1. `git add -A`
2. `git commit`
3. `git push`

Al push parte il deploy online automatico.
