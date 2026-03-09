import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type UserRole = 'client' | 'barber';
export type SocialProvider = 'google' | 'apple' | 'facebook';

export type BarberShopInfo = {
  shopName: string;
  shopAddress: string;
  shopCity: string;
};

type BaseUser = {
  id: string;
  name: string;
  email: string;
  avatarUri?: string;
  emailVerified?: boolean;
};

export type ClientUser = BaseUser & {
  role: 'client';
};

export type BarberUser = BaseUser & {
  role: 'barber';
  shop: BarberShopInfo;
};

export type User = ClientUser | BarberUser;

export type RegisterPayload =
  | {
      name: string;
      email: string;
      password: string;
      role: 'client';
    }
  | {
      name: string;
      email: string;
      password: string;
      role: 'barber';
      shop: BarberShopInfo;
    };

type PersistedSession = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

type RegisterResult = { ok: true } | { ok: false; reason: 'email_exists' | 'validation' | 'network' | 'server'; message: string };

type AuthenticateResult =
  | {
      ok: true;
      user: User;
    }
  | {
      ok: false;
      reason: 'invalid_credentials' | 'network' | 'server';
      message: string;
    };

type SocialAuthenticatePayload = {
  provider: SocialProvider;
  idToken?: string;
  identityToken?: string;
  accessToken?: string;
  nameHint?: string;
};

type ForgotPasswordResult = { ok: true; message: string } | { ok: false; message: string };

type AvatarUpdateResult = { ok: true } | { ok: false; message: string };
type BookingConfirmationEmailPayload = {
  bookingId: string;
  shopName: string;
  shopAddress?: string;
  shopCity?: string;
  barberName: string;
  serviceName: string;
  startAt: number;
  endAt: number;
  durationMin: number;
  price: number;
};

type BookingConfirmationEmailResult = { ok: true } | { ok: false; message: string };
type BookingCancellationEmailPayload = {
  bookingId: string;
  shopName: string;
  shopAddress?: string;
  shopCity?: string;
  barberName: string;
  serviceName: string;
  startAt: number;
  endAt: number;
  durationMin: number;
  price: number;
  cancelledReason?: string;
  cancelledAt?: number;
};
type BookingCancellationEmailResult = { ok: true } | { ok: false; message: string };

type ApiRequestError = {
  status: number;
  code?: string;
  message: string;
};

const SESSION_STORAGE_KEY = 'mybarber_auth_session_v1';
const DEFAULT_API_PORT = '5000';

let currentUser: User | null = null;
let accessToken: string | null = null;
let refreshToken: string | null = null;
let isHydrated = false;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeShop = (shop: BarberShopInfo): BarberShopInfo => ({
  shopName: shop.shopName.trim(),
  shopAddress: shop.shopAddress.trim(),
  shopCity: shop.shopCity.trim(),
});

const normalizeUser = (user: User): User => {
  const normalizedAvatar = user.avatarUri?.trim();

  if (user.role === 'barber') {
    return {
      ...user,
      name: user.name.trim(),
      email: normalizeEmail(user.email),
      avatarUri: normalizedAvatar && normalizedAvatar.length > 0 ? normalizedAvatar : undefined,
      shop: normalizeShop(user.shop),
    };
  }

  return {
    ...user,
    name: user.name.trim(),
    email: normalizeEmail(user.email),
    avatarUri: normalizedAvatar && normalizedAvatar.length > 0 ? normalizedAvatar : undefined,
  };
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isValidShop = (value: unknown): value is BarberShopInfo => {
  if (!isObject(value)) return false;
  return (
    typeof value.shopName === 'string' &&
    typeof value.shopAddress === 'string' &&
    typeof value.shopCity === 'string'
  );
};

const isValidUser = (value: unknown): value is User => {
  if (!isObject(value)) return false;

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.email !== 'string' ||
    (value.avatarUri !== undefined && typeof value.avatarUri !== 'string') ||
    (value.emailVerified !== undefined && typeof value.emailVerified !== 'boolean')
  ) {
    return false;
  }

  if (value.role === 'client') return true;
  if (value.role === 'barber') return isValidShop(value.shop);
  return false;
};

const resolveApiBaseUrl = () => {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envBaseUrl) return trimTrailingSlash(envBaseUrl);

  const expoConfig = Constants.expoConfig as { hostUri?: string } | null;
  const hostUri = expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0]?.trim();
    if (host) return `http://${host}:${DEFAULT_API_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
};

const API_BASE_URL = resolveApiBaseUrl();

const makeApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const parseJsonSafe = async (response: Response): Promise<Record<string, unknown> | null> => {
  try {
    const payload = (await response.json()) as unknown;
    return isObject(payload) ? payload : null;
  } catch {
    return null;
  }
};

const readMessageFromPayload = (payload: Record<string, unknown> | null, fallback: string) => {
  if (payload && typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }
  return fallback;
};

const isApiRequestError = (value: unknown): value is ApiRequestError => {
  return (
    isObject(value) &&
    typeof value.status === 'number' &&
    typeof value.message === 'string' &&
    (value.code === undefined || typeof value.code === 'string')
  );
};

const requestJson = async <T extends Record<string, unknown>>(
  path: string,
  init: RequestInit,
  token?: string
): Promise<T> => {
  const headers = new Headers(init.headers ?? undefined);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(makeApiUrl(path), {
      ...init,
      headers,
    });
  } catch {
    throw {
      status: 0,
      message: 'Impossibile contattare il server. Controlla rete e EXPO_PUBLIC_API_BASE_URL.',
    } as ApiRequestError;
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw {
      status: response.status,
      code: payload && typeof payload.code === 'string' ? payload.code : undefined,
      message: readMessageFromPayload(payload, 'Richiesta non riuscita.'),
    } as ApiRequestError;
  }

  return (payload ?? {}) as T;
};

const mapApiUser = (rawUser: unknown): User | null => {
  if (!isObject(rawUser)) return null;

  const id = typeof rawUser.id === 'string' ? rawUser.id : '';
  const name = typeof rawUser.name === 'string' ? rawUser.name : '';
  const email = typeof rawUser.email === 'string' ? rawUser.email : '';
  const role = rawUser.role;
  const avatarUri = typeof rawUser.avatarUri === 'string' ? rawUser.avatarUri : undefined;
  const emailVerified = typeof rawUser.emailVerified === 'boolean' ? rawUser.emailVerified : undefined;

  if (!id || !name || !email || (role !== 'client' && role !== 'barber')) {
    return null;
  }

  if (role === 'barber') {
    if (!isValidShop(rawUser.shop)) return null;

    return normalizeUser({
      id,
      name,
      email,
      role: 'barber',
      avatarUri,
      emailVerified,
      shop: rawUser.shop,
    });
  }

  return normalizeUser({
    id,
    name,
    email,
    role: 'client',
    avatarUri,
    emailVerified,
  });
};

const persistSession = async () => {
  try {
    if (currentUser && accessToken) {
      const payload: PersistedSession = {
        user: currentUser,
        accessToken,
        refreshToken: refreshToken ?? undefined,
      };
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
      return;
    }

    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore persistence failures to avoid blocking UI interactions.
  }
};

const readAccessTokenFromPayload = (payload: Record<string, unknown>) => {
  if (typeof payload.accessToken === 'string') return payload.accessToken;
  if (typeof payload.token === 'string') return payload.token;
  return '';
};

const readRefreshTokenFromPayload = (payload: Record<string, unknown>) => {
  return typeof payload.refreshToken === 'string' ? payload.refreshToken : '';
};

const setSessionFromPayload = async (payload: Record<string, unknown>) => {
  const nextAccessToken = readAccessTokenFromPayload(payload);
  const nextRefreshToken = readRefreshTokenFromPayload(payload);
  const mappedUser = mapApiUser(payload.user);

  if (!nextAccessToken || !mappedUser) {
    return false;
  }

  accessToken = nextAccessToken;
  refreshToken = nextRefreshToken || refreshToken;
  currentUser = mappedUser;
  await persistSession();

  return true;
};

const refreshAccessToken = async () => {
  if (!refreshToken) return false;

  try {
    const payload = await requestJson<{ accessToken?: unknown; token?: unknown; refreshToken?: unknown; user?: unknown }>(
      '/api/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    );

    return setSessionFromPayload(payload);
  } catch {
    return false;
  }
};

const requestAuthJson = async <T extends Record<string, unknown>>(path: string, init: RequestInit): Promise<T> => {
  if (!accessToken) {
    throw {
      status: 401,
      code: 'AUTH_REQUIRED',
      message: 'Sessione non valida. Effettua di nuovo il login.',
    } as ApiRequestError;
  }

  try {
    return await requestJson<T>(path, init, accessToken);
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed && accessToken) {
        return requestJson<T>(path, init, accessToken);
      }
    }

    throw error;
  }
};

export const hydrateUserStore = async () => {
  if (isHydrated) return;

  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      isHydrated = true;
      return;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) {
      currentUser = null;
      accessToken = null;
      refreshToken = null;
      isHydrated = true;
      return;
    }

    const parsedAccessToken =
      typeof parsed.accessToken === 'string'
        ? parsed.accessToken
        : typeof parsed.token === 'string'
          ? parsed.token
          : '';

    const parsedRefreshToken = typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null;
    const parsedUser = parsed.user;

    if (!parsedAccessToken || !isValidUser(parsedUser)) {
      currentUser = null;
      accessToken = null;
      refreshToken = null;
      isHydrated = true;
      return;
    }

    accessToken = parsedAccessToken;
    refreshToken = parsedRefreshToken;
    currentUser = normalizeUser(parsedUser);
  } catch {
    currentUser = null;
    accessToken = null;
    refreshToken = null;
  } finally {
    isHydrated = true;
  }
};

export const getApiBaseUrl = () => API_BASE_URL;

export const setUser = (user: User) => {
  currentUser = normalizeUser(user);
  void persistSession();
};

export const getUser = () => {
  return currentUser;
};

export const getAuthToken = () => {
  return accessToken;
};

export const registerUser = async (payload: RegisterPayload): Promise<RegisterResult> => {
  const normalizedEmail = normalizeEmail(payload.email);
  const trimmedName = payload.name.trim();

  const requestBody: Record<string, unknown> = {
    name: trimmedName,
    email: normalizedEmail,
    password: payload.password,
    role: payload.role,
  };

  if (payload.role === 'barber') {
    requestBody.shop = normalizeShop(payload.shop);
  }

  try {
    await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    return { ok: true };
  } catch (error) {
    if (isApiRequestError(error)) {
      if (error.status === 409 || error.code === 'EMAIL_ALREADY_EXISTS') {
        return {
          ok: false,
          reason: 'email_exists',
          message: 'Esiste gia un account con questa email.',
        };
      }

      if (error.status === 400) {
        return {
          ok: false,
          reason: 'validation',
          message: error.message,
        };
      }

      if (error.status === 0) {
        return {
          ok: false,
          reason: 'network',
          message: error.message,
        };
      }

      return {
        ok: false,
        reason: 'server',
        message: error.message,
      };
    }

    return {
      ok: false,
      reason: 'server',
      message: 'Errore imprevisto durante la registrazione.',
    };
  }
};

export const authenticateUser = async (email: string, password: string): Promise<AuthenticateResult> => {
  try {
    const payload = await requestJson<{ accessToken?: unknown; token?: unknown; refreshToken?: unknown; user?: unknown }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: normalizeEmail(email),
          password,
        }),
      }
    );

    const sessionSet = await setSessionFromPayload(payload);
    if (!sessionSet || !currentUser) {
      return {
        ok: false,
        reason: 'server',
        message: 'Risposta non valida dal server.',
      };
    }

    return {
      ok: true,
      user: currentUser,
    };
  } catch (error) {
    if (isApiRequestError(error)) {
      if (error.status === 401 || error.code === 'INVALID_CREDENTIALS') {
        return {
          ok: false,
          reason: 'invalid_credentials',
          message: 'Email o password non corretti.',
        };
      }

      if (error.status === 0) {
        return {
          ok: false,
          reason: 'network',
          message: error.message,
        };
      }

      return {
        ok: false,
        reason: 'server',
        message: error.message,
      };
    }

    return {
      ok: false,
      reason: 'server',
      message: 'Errore imprevisto durante il login.',
    };
  }
};

export const authenticateWithSocial = async (payloadInput: SocialAuthenticatePayload): Promise<AuthenticateResult> => {
  try {
    const payload = await requestJson<{ accessToken?: unknown; token?: unknown; refreshToken?: unknown; user?: unknown }>(
      '/api/auth/social-login',
      {
        method: 'POST',
        body: JSON.stringify({
          provider: payloadInput.provider,
          idToken: payloadInput.idToken,
          identityToken: payloadInput.identityToken,
          accessToken: payloadInput.accessToken,
          nameHint: payloadInput.nameHint,
        }),
      }
    );

    const sessionSet = await setSessionFromPayload(payload);
    if (!sessionSet || !currentUser) {
      return {
        ok: false,
        reason: 'server',
        message: 'Risposta non valida dal server.',
      };
    }

    return {
      ok: true,
      user: currentUser,
    };
  } catch (error) {
    if (isApiRequestError(error)) {
      if (error.status === 401 || error.code === 'SOCIAL_TOKEN_INVALID') {
        return {
          ok: false,
          reason: 'invalid_credentials',
          message: 'Login social non valido o scaduto. Riprova.',
        };
      }

      if (error.status === 0) {
        return {
          ok: false,
          reason: 'network',
          message: error.message,
        };
      }

      return {
        ok: false,
        reason: 'server',
        message: error.message,
      };
    }

    return {
      ok: false,
      reason: 'server',
      message: 'Errore imprevisto durante il login social.',
    };
  }
};

export const requestPasswordResetEmail = async (email: string): Promise<ForgotPasswordResult> => {
  try {
    const payload = await requestJson<{ message?: unknown }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: normalizeEmail(email),
      }),
    });

    return {
      ok: true,
      message:
        typeof payload.message === 'string' && payload.message.trim().length > 0
          ? payload.message
          : 'Se l\'email esiste, riceverai una key per il reset password.',
    };
  } catch (error) {
    if (isApiRequestError(error)) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: false,
      message: 'Errore imprevisto durante richiesta reset password.',
    };
  }
};

export const clearUser = () => {
  const previousRefreshToken = refreshToken;

  currentUser = null;
  accessToken = null;
  refreshToken = null;
  void persistSession();

  if (previousRefreshToken) {
    void requestJson('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: previousRefreshToken }),
    }).catch(() => undefined);
  }
};

export const updateUserAvatar = async (avatarUri: string | null): Promise<AvatarUpdateResult> => {
  try {
    const payload = await requestAuthJson<{ user?: unknown }>('/api/auth/me/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatarUri }),
    });

    const mappedUser = mapApiUser(payload.user);
    if (!mappedUser) {
      return {
        ok: false,
        message: 'Risposta non valida dal server.',
      };
    }

    currentUser = mappedUser;
    await persistSession();

    return { ok: true };
  } catch (error) {
    if (isApiRequestError(error)) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: false,
      message: 'Errore imprevisto durante aggiornamento avatar.',
    };
  }
};

export const sendBookingConfirmationEmail = async (
  payload: BookingConfirmationEmailPayload
): Promise<BookingConfirmationEmailResult> => {
  try {
    await requestAuthJson('/api/auth/booking-confirmation-email', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: payload.bookingId,
        shopName: payload.shopName,
        shopAddress: payload.shopAddress,
        shopCity: payload.shopCity,
        barberName: payload.barberName,
        serviceName: payload.serviceName,
        startAt: payload.startAt,
        endAt: payload.endAt,
        durationMin: payload.durationMin,
        price: payload.price,
      }),
    });

    return { ok: true };
  } catch (error) {
    if (isApiRequestError(error)) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: false,
      message: 'Errore imprevisto durante invio email prenotazione.',
    };
  }
};

export const sendBookingCancellationEmail = async (
  payload: BookingCancellationEmailPayload
): Promise<BookingCancellationEmailResult> => {
  try {
    await requestAuthJson('/api/auth/booking-cancellation-email', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: payload.bookingId,
        shopName: payload.shopName,
        shopAddress: payload.shopAddress,
        shopCity: payload.shopCity,
        barberName: payload.barberName,
        serviceName: payload.serviceName,
        startAt: payload.startAt,
        endAt: payload.endAt,
        durationMin: payload.durationMin,
        price: payload.price,
        cancelledReason: payload.cancelledReason,
        cancelledAt: payload.cancelledAt,
      }),
    });

    return { ok: true };
  } catch (error) {
    if (isApiRequestError(error)) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: false,
      message: 'Errore imprevisto durante invio email annullamento.',
    };
  }
};
