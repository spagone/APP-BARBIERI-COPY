const STORAGE_KEY = 'mybarber_admin_session_v1';
const AUTO_REFRESH_MS = 5000;

const runtimeConfig =
  typeof window !== 'undefined' && window.MYBARBER_CONFIG && typeof window.MYBARBER_CONFIG === 'object'
    ? window.MYBARBER_CONFIG
    : {};

const state = {
  apiBaseUrl:
    localStorage.getItem('mybarber_admin_api_base_url') ||
    (typeof runtimeConfig.apiBaseUrl === 'string' && runtimeConfig.apiBaseUrl.trim().length > 0
      ? runtimeConfig.apiBaseUrl.trim()
      : 'http://localhost:5000'),
  accessToken: '',
  refreshToken: '',
  user: null,
  autoRefreshTimer: null,
  autoRefreshInFlight: false,
};

const els = {
  loginPanel: document.getElementById('login-panel'),
  dashboardPanel: document.getElementById('dashboard-panel'),
  apiBaseUrl: document.getElementById('api-base-url'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('login-btn'),
  adminIdentity: document.getElementById('admin-identity'),
  refreshAllBtn: document.getElementById('refresh-all-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  applyFiltersBtn: document.getElementById('apply-filters-btn'),
  searchInput: document.getElementById('search-input'),
  roleFilter: document.getElementById('role-filter'),
  statusFilter: document.getElementById('status-filter'),
  usersTableBody: document.getElementById('users-table-body'),
  logsTableBody: document.getElementById('logs-table-body'),
  refreshLogsBtn: document.getElementById('refresh-logs-btn'),
  liveIndicator: document.getElementById('live-indicator'),
  lastSync: document.getElementById('last-sync'),
  toast: document.getElementById('toast'),
  statTotalUsers: document.getElementById('stat-total-users'),
  statTotalClients: document.getElementById('stat-total-clients'),
  statTotalBarbers: document.getElementById('stat-total-barbers'),
  statTotalAdmins: document.getElementById('stat-total-admins'),
  statBlockedUsers: document.getElementById('stat-blocked-users'),
  statVerifiedUsers: document.getElementById('stat-verified-users'),
};

const toIsoDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const normalizeApiBase = (url) => url.trim().replace(/\/+$/, '');

const setLiveIndicator = (isLive) => {
  if (!els.liveIndicator) return;
  els.liveIndicator.textContent = isLive ? 'Auto-refresh ON' : 'Auto-refresh OFF';
  els.liveIndicator.classList.toggle('live-on', isLive);
  els.liveIndicator.classList.toggle('live-off', !isLive);
};

const setLastSync = (date) => {
  if (!els.lastSync) return;
  if (!date) {
    els.lastSync.textContent = 'Ultimo aggiornamento: --';
    return;
  }
  els.lastSync.textContent = `Ultimo aggiornamento: ${new Date(date).toLocaleTimeString()}`;
};

const readSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const persistSession = () => {
  if (!state.accessToken || !state.user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: state.accessToken,
      refreshToken: state.refreshToken || '',
      user: state.user,
    })
  );
};

const clearSession = () => {
  state.accessToken = '';
  state.refreshToken = '';
  state.user = null;
  persistSession();
};

const toast = (message) => {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  window.setTimeout(() => {
    els.toast.classList.add('hidden');
  }, 2800);
};

const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${state.apiBaseUrl}${normalizedPath}`;
};

const refreshSession = async () => {
  if (!state.refreshToken) return false;

  try {
    const response = await fetch(buildApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: state.refreshToken }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return false;

    const nextAccessToken = payload.accessToken || payload.token;
    if (!nextAccessToken || !payload.user) return false;

    state.accessToken = nextAccessToken;
    state.refreshToken = payload.refreshToken || state.refreshToken;
    state.user = payload.user;
    persistSession();
    return true;
  } catch {
    return false;
  }
};

const requestApi = async (path, { method = 'GET', body, auth = true, retry = true } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.accessToken) {
    headers.Authorization = `Bearer ${state.accessToken}`;
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && auth && retry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return requestApi(path, { method, body, auth, retry: false });
    }
  }

  if (!response.ok) {
    const message = payload && payload.message ? payload.message : 'Richiesta non riuscita.';
    throw new Error(message);
  }

  return payload;
};

const setAuthView = (isAuthenticated) => {
  if (isAuthenticated) {
    els.loginPanel.classList.add('hidden');
    els.dashboardPanel.classList.remove('hidden');
    els.adminIdentity.textContent = `${state.user?.name || '-'} · ${state.user?.email || '-'}`;
    return;
  }

  els.dashboardPanel.classList.add('hidden');
  els.loginPanel.classList.remove('hidden');
};

const renderOverview = (stats) => {
  els.statTotalUsers.textContent = String(stats.totalUsers ?? 0);
  els.statTotalClients.textContent = String(stats.totalClients ?? 0);
  els.statTotalBarbers.textContent = String(stats.totalBarbers ?? 0);
  els.statTotalAdmins.textContent = String(stats.totalAdmins ?? 0);
  els.statBlockedUsers.textContent = String(stats.blockedUsers ?? 0);
  els.statVerifiedUsers.textContent = String(stats.verifiedUsers ?? 0);
};

const createBadge = (text, variant) => `<span class="badge ${variant}">${text}</span>`;

const renderUsers = (users) => {
  if (!Array.isArray(users) || users.length === 0) {
    els.usersTableBody.innerHTML = `<tr><td colspan="6">Nessun utente trovato.</td></tr>`;
    return;
  }

  els.usersTableBody.innerHTML = users
    .map((user) => {
      const blockedBadge = user.isBlocked ? createBadge('Bloccato', 'badge-warn') : createBadge('Attivo', 'badge-ok');
      const verifiedBadge = user.emailVerified
        ? createBadge('Email verificata', 'badge-ok')
        : createBadge('Email non verificata', 'badge-muted');

      return `
        <tr data-user-id="${user.id}">
          <td>
            <div class="user-name">${user.name}</div>
            <div class="user-email">${user.email}</div>
            ${verifiedBadge}
          </td>
          <td>
            <div class="action-row">
              <select class="input role-select js-role-select">
                <option value="client" ${user.role === 'client' ? 'selected' : ''}>client</option>
                <option value="barber" ${user.role === 'barber' ? 'selected' : ''}>barber</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
              </select>
              <button class="btn btn-secondary btn-small js-save-role-btn">Salva</button>
            </div>
          </td>
          <td>${blockedBadge}</td>
          <td>${toIsoDateTime(user.lastLoginAt)}</td>
          <td>${toIsoDateTime(user.createdAt)}</td>
          <td>
            <div class="action-row">
              <button class="btn btn-secondary btn-small js-toggle-block-btn">
                ${user.isBlocked ? 'Sblocca' : 'Blocca'}
              </button>
              <button class="btn btn-secondary btn-small js-reset-password-btn">Reset password</button>
              <button class="btn btn-danger btn-small js-delete-user-btn">Elimina</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
};

const renderLogs = (logs) => {
  if (!Array.isArray(logs) || logs.length === 0) {
    els.logsTableBody.innerHTML = `<tr><td colspan="5">Nessun log disponibile.</td></tr>`;
    return;
  }

  els.logsTableBody.innerHTML = logs
    .map(
      (entry) => `
      <tr>
        <td>${toIsoDateTime(entry.createdAt)}</td>
        <td>${entry.actorEmail || '-'}</td>
        <td>${entry.action || '-'}</td>
        <td>${entry.targetUserId || '-'}</td>
        <td><pre>${JSON.stringify(entry.metadata || {}, null, 0)}</pre></td>
      </tr>
    `
    )
    .join('');
};

const loadOverview = async () => {
  const payload = await requestApi('/api/admin/overview');
  renderOverview(payload.stats || {});
};

const loadUsers = async () => {
  const params = new URLSearchParams();
  const search = els.searchInput.value.trim();
  const role = els.roleFilter.value;
  const status = els.statusFilter.value;

  if (search) params.set('search', search);
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  params.set('limit', '50');

  const payload = await requestApi(`/api/admin/users?${params.toString()}`);
  renderUsers(payload.users || []);
};

const loadLogs = async () => {
  const payload = await requestApi('/api/admin/audit-logs?limit=50');
  renderLogs(payload.logs || []);
};

const loadAllData = async () => {
  await Promise.all([loadOverview(), loadUsers(), loadLogs()]);
  setLastSync(new Date());
};

const stopAutoRefresh = () => {
  if (state.autoRefreshTimer) {
    window.clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
  state.autoRefreshInFlight = false;
  setLiveIndicator(false);
};

const refreshAllDataSilently = async () => {
  if (!state.accessToken || !state.user) return;
  if (state.autoRefreshInFlight) return;

  state.autoRefreshInFlight = true;
  try {
    await loadAllData();
  } catch {
    // Silent fail for periodic refresh.
  } finally {
    state.autoRefreshInFlight = false;
  }
};

const startAutoRefresh = () => {
  stopAutoRefresh();
  if (!state.accessToken || !state.user) return;

  setLiveIndicator(true);
  state.autoRefreshTimer = window.setInterval(() => {
    if (document.hidden) return;
    void refreshAllDataSilently();
  }, AUTO_REFRESH_MS);
};

const handleLogin = async () => {
  const email = els.email.value.trim();
  const password = els.password.value;

  if (!email || !password) {
    toast('Inserisci email e password admin.');
    return;
  }

  try {
    const payload = await requestApi('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });

    const token = payload.accessToken || payload.token;
    const refresh = payload.refreshToken || '';
    const user = payload.user;

    if (!token || !user || user.role !== 'admin') {
      throw new Error('Accesso negato: account non admin.');
    }

    state.accessToken = token;
    state.refreshToken = refresh;
    state.user = user;
    persistSession();

    setAuthView(true);
    await loadAllData();
    startAutoRefresh();
    toast('Accesso admin effettuato.');
  } catch (error) {
    toast(error.message || 'Login fallito.');
  }
};

const handleLogout = async () => {
  const previousRefresh = state.refreshToken;
  stopAutoRefresh();
  clearSession();
  setAuthView(false);
  setLastSync(null);

  if (previousRefresh) {
    try {
      await requestApi('/api/auth/logout', {
        method: 'POST',
        auth: false,
        body: { refreshToken: previousRefresh },
      });
    } catch {
      // ignore
    }
  }

  toast('Logout completato.');
};

const wireUserTableActions = () => {
  els.usersTableBody.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const row = target.closest('tr[data-user-id]');
    if (!row) return;

    const userId = row.getAttribute('data-user-id');
    if (!userId) return;

    try {
      if (target.classList.contains('js-save-role-btn')) {
        const select = row.querySelector('.js-role-select');
        const role = select ? select.value : '';
        await requestApi(`/api/admin/users/${userId}/role`, {
          method: 'PATCH',
          body: { role },
        });
        toast('Ruolo aggiornato.');
        await loadUsers();
        await loadLogs();
        return;
      }

      if (target.classList.contains('js-toggle-block-btn')) {
        const shouldBlock = target.textContent?.trim().toLowerCase() === 'blocca';
        const reason = shouldBlock ? window.prompt('Motivo blocco (opzionale):', '') || '' : '';

        await requestApi(`/api/admin/users/${userId}/status`, {
          method: 'PATCH',
          body: {
            isBlocked: shouldBlock,
            reason,
          },
        });
        toast(shouldBlock ? 'Utente bloccato.' : 'Utente sbloccato.');
        await loadUsers();
        await loadOverview();
        await loadLogs();
        return;
      }

      if (target.classList.contains('js-reset-password-btn')) {
        const newPassword = window.prompt('Nuova password (lascia vuoto per generata automaticamente):', '');

        const payload = await requestApi(`/api/admin/users/${userId}/reset-password`, {
          method: 'POST',
          body: {
            newPassword: newPassword || undefined,
          },
        });

        if (payload.temporaryPassword) {
          window.alert(`Password temporanea: ${payload.temporaryPassword}`);
        }

        toast('Password resettata.');
        await loadLogs();
        return;
      }

      if (target.classList.contains('js-delete-user-btn')) {
        const confirmed = window.confirm('Confermi eliminazione account? Azione irreversibile.');
        if (!confirmed) return;

        await requestApi(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });
        toast('Utente eliminato.');
        await loadUsers();
        await loadOverview();
        await loadLogs();
      }
    } catch (error) {
      toast(error.message || 'Operazione non riuscita.');
    }
  });
};

const bootstrap = async () => {
  const savedSession = readSession();
  if (savedSession) {
    state.accessToken = savedSession.accessToken || savedSession.token || '';
    state.refreshToken = savedSession.refreshToken || '';
    state.user = savedSession.user || null;
  }

  els.apiBaseUrl.value = state.apiBaseUrl;

  if (state.accessToken && state.user?.role === 'admin') {
    setAuthView(true);
    try {
      await loadAllData();
      startAutoRefresh();
    } catch {
      stopAutoRefresh();
      clearSession();
      setAuthView(false);
      setLastSync(null);
      toast('Sessione scaduta, effettua nuovamente login.');
    }
  } else {
    stopAutoRefresh();
    setLastSync(null);
    setAuthView(false);
  }
};

els.loginBtn.addEventListener('click', handleLogin);
els.logoutBtn.addEventListener('click', handleLogout);

els.applyFiltersBtn.addEventListener('click', async () => {
  try {
    await loadUsers();
    setLastSync(new Date());
  } catch (error) {
    toast(error.message || 'Impossibile filtrare utenti.');
  }
});

els.refreshAllBtn.addEventListener('click', async () => {
  try {
    await loadAllData();
    toast('Dati aggiornati.');
  } catch (error) {
    toast(error.message || 'Impossibile aggiornare dati.');
  }
});

els.refreshLogsBtn.addEventListener('click', async () => {
  try {
    await loadLogs();
    setLastSync(new Date());
    toast('Log aggiornati.');
  } catch (error) {
    toast(error.message || 'Impossibile aggiornare log.');
  }
});

els.apiBaseUrl.addEventListener('change', () => {
  state.apiBaseUrl = normalizeApiBase(els.apiBaseUrl.value || 'http://localhost:5000');
  localStorage.setItem('mybarber_admin_api_base_url', state.apiBaseUrl);
  void refreshAllDataSilently();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    void refreshAllDataSilently();
  }
});

setLiveIndicator(false);
setLastSync(null);
wireUserTableActions();
bootstrap();
