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
      router.replace('/client?activeTab=history');
      return;
    }

    router.replace('/barber?activeTab=history');
  }, [currentUser, router]);

  return null;
}
