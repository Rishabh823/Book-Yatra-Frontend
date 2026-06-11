import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Donate() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)'); }, []);
  return null;
}
