import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getUser } from './store/userStore';

export default function Page() {
  const router = useRouter();
  const currentUser = getUser();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/profile');
      return;
    }

    if (currentUser.role === 'client') {
      router.replace('/client?openBooking=1&activeTab=booking');
      return;
    }

    router.replace('/barber?activeTab=booking');
  }, [currentUser, router]);

  return null;
}
