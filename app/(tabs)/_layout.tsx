import { clearAuth, getAuthToken } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import { useAppTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: (value: boolean) => void }) {
  return (
    <View style={styles.toggleContainer}>
      <Switch
        value={isDark}
        onValueChange={onToggle}
        ios_backgroundColor="#DDE4F1"
        trackColor={{ false: '#DDE4F1', true: '#BFD4FF' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function LanguageSwitcher({
  language,
  onChange,
}: {
  language: 'es' | 'en';
  onChange: (language: 'es' | 'en') => void;
}) {
  return (
    <View style={styles.segmentedContainer}>
      <Pressable
        onPress={() => onChange('es')}
        style={[styles.segmentButton, language === 'es' && styles.segmentButtonActive]}>
        <Text style={[styles.segmentLabel, language === 'es' && styles.segmentLabelActive]}>ES</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('en')}
        style={[styles.segmentButton, language === 'en' && styles.segmentButtonActive]}>
        <Text style={[styles.segmentLabel, language === 'en' && styles.segmentLabelActive]}>EN</Text>
      </Pressable>
    </View>
  );
}

function LogoutButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.logoutButton}>
      <Text style={styles.logoutText}>{label}</Text>
    </Pressable>
  );
}

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
        headerStyle: styles.header,
        headerShadowVisible: false,
        headerLeftContainerStyle: styles.headerSide,
        headerRightContainerStyle: styles.headerSide,
        headerTitleContainerStyle: styles.headerCenter,
        headerTitleAlign: 'center',
        headerLeft: () => <ThemeToggle isDark={isDark} onToggle={toggleTheme} />,
        headerTitle: () => (
          <LanguageSwitcher
            language={language as 'es' | 'en'}
            onChange={(nextLanguage) => setLanguage(nextLanguage)}
          />
        ),
        headerRight: () => <LogoutButton label={t('logout')} onPress={handleLogout} />,
        sceneStyle: styles.scene,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: '#3D77CC',
        tabBarInactiveTintColor: '#8D99AE',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="citas"
        options={{
          title: t('appointments'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-clear-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#F7F9FC',
    height: 102,
  },
  headerSide: {
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  headerCenter: {
    justifyContent: 'center',
  },
  toggleContainer: {
    borderRadius: 16,
    backgroundColor: '#EEF3FB',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F8',
    borderRadius: 999,
    padding: 3,
    alignItems: 'center',
  },
  segmentButton: {
    minWidth: 44,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#DCE9FF',
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7D8798',
  },
  segmentLabelActive: {
    color: '#3D77CC',
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D77CC',
  },
  scene: {
    backgroundColor: '#F7F9FC',
  },
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAEFF6',
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
