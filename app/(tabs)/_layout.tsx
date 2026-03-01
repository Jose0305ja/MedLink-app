import { clearAuth, getAuthToken } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import { useAppTheme } from '@/lib/theme-context';
import { Redirect, Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Switch, View } from 'react-native';

export default function TabLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isDark, toggleTheme } = useAppTheme();
  const { language, setLanguage, t } = useI18n();

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
        headerTitle: () => (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button title="ES" onPress={() => setLanguage('es')} disabled={language === 'es'} />
            <Button title="EN" onPress={() => setLanguage('en')} disabled={language === 'en'} />
          </View>
        ),
        headerRight: () => <Button title={t('logout')} onPress={handleLogout} />,
      }}>
      <Tabs.Screen name="index" options={{ title: t('home') }} />
      <Tabs.Screen name="citas" options={{ title: t('appointments') }} />
      <Tabs.Screen name="perfil" options={{ title: t('profile') }} />
    </Tabs>
  );
}
