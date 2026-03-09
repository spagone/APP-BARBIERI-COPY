# Admin Dashboard

Dashboard web separata per gestione account MyBarber (`admin.barberapp.com`).

## Avvio locale rapido

Puoi servire la cartella con qualsiasi server statico.

Esempio (PowerShell):

```powershell
cd admin-dashboard
python -m http.server 4173
```

Poi apri:

`http://localhost:4173`

## Config

Puoi impostare `API Base URL` in due modi:

1. A runtime nel campo login (es. `http://localhost:5000` o `https://api.barberapp.com`).
2. In `config.js` (consigliato in produzione).

Esempio:

```js
window.MYBARBER_CONFIG = {
  apiBaseUrl: 'https://api.barberapp.com',
};
```

## Funzioni

- Login admin tramite API auth.
- Overview utenti.
- Ricerca/filter utenti.
- Blocca/sblocca account.
- Cambio ruolo utente.
- Reset password utente.
- Eliminazione account.
- Audit logs azioni admin.
