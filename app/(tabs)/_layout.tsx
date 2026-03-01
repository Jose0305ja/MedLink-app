import { getAuthToken } from '@/lib/auth-storage';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

export default function TabLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const token = await getAuthToken();
      setIsLoggedIn(Boolean(token));
      setIsLoading(false);
    };

    checkSession();
  }, []);

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="citas" options={{ title: 'Mis citas' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Mi perfil' }} />
    </Tabs>
  );
}
