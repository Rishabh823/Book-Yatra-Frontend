import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Chalisa() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)'); }, []);
  return null;
}
