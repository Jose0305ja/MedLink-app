import { useAppTheme } from '@/lib/theme-context';
import { clearAuth, getAuthToken } from '@/lib/auth-storage';
import { Redirect, Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Switch, View } from 'react-native';

export default function TabLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isDark, toggleTheme } = useAppTheme();

  useEffect(() => {
    const checkSession = async () => {
      const token = await getAuthToken();
      setIsLoggedIn(Boolean(token));
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/login');
  };

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: () => (
          <View style={{ marginLeft: 12 }}>
            <Switch value={isDark} onValueChange={toggleTheme} />
          </View>
        ),
        headerRight: () => <Button title="Logout" onPress={handleLogout} />,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="citas" options={{ title: 'Mis citas' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Mi perfil' }} />
    </Tabs>
  );
}
