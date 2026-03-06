export type UserRole = 'client' | 'barber';

export type BarberShopInfo = {
  shopName: string;
  shopAddress: string;
  shopCity: string;
};

type BaseUser = {
  name: string;
  email: string;
  password: string;
  avatarUri?: string;
};

export type ClientUser = BaseUser & {
  role: 'client';
};

export type BarberUser = BaseUser & {
  role: 'barber';
  shop: BarberShopInfo;
};

export type User = ClientUser | BarberUser;

let currentUser: User | null = null;

export const setUser = (user: User) => {
  currentUser = user;
};

export const getUser = () => {
  return currentUser;
};

export const clearUser = () => {
  currentUser = null;
};

export const updateUserAvatar = (avatarUri: string | null) => {
  if (!currentUser) return;

  const normalized = avatarUri?.trim();
  currentUser = {
    ...currentUser,
    avatarUri: normalized && normalized.length > 0 ? normalized : undefined,
  };
};
