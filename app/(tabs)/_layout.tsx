import { clearAuth, getAuthToken } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import { useAppTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function ThemeToggle({
  isDark,
  onSelectLight,
  onSelectDark,
  lightLabel,
  darkLabel,
  styles,
  primary,
  subtext,
}: {
  isDark: boolean;
  onSelectLight: () => void;
  onSelectDark: () => void;
  lightLabel: string;
  darkLabel: string;
  styles: ReturnType<typeof createStyles>;
  primary: string;
  subtext: string;
}) {
  return (
    <View style={styles.themeControl}>
      <Pressable
        onPress={onSelectLight}
        accessibilityRole="button"
        accessibilityLabel={lightLabel}
        style={[styles.themeButton, !isDark && styles.themeButtonActive]}>
        <Ionicons name="sunny" size={16} color={!isDark ? primary : subtext} />
      </Pressable>
      <Pressable
        onPress={onSelectDark}
        accessibilityRole="button"
        accessibilityLabel={darkLabel}
        style={[styles.themeButton, isDark && styles.themeButtonActive]}>
        <Ionicons name="moon" size={16} color={isDark ? primary : subtext} />
      </Pressable>
    </View>
  );
}

function LanguageSwitcher({
  language,
  onChange,
  spanishLabel,
  englishLabel,
  styles,
}: {
  language: 'es' | 'en';
  onChange: (language: 'es' | 'en') => void;
  spanishLabel: string;
  englishLabel: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.segmentedContainer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spanishLabel}
        onPress={() => onChange('es')}
        style={[styles.segmentButton, language === 'es' && styles.segmentButtonActive]}>
        <Text style={[styles.segmentLabel, language === 'es' && styles.segmentLabelActive]}>ES</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={englishLabel}
        onPress={() => onChange('en')}
        style={[styles.segmentButton, language === 'en' && styles.segmentButtonActive]}>
        <Text style={[styles.segmentLabel, language === 'en' && styles.segmentLabelActive]}>EN</Text>
      </Pressable>
    </View>
  );
}

function LogoutButton({
  label,
  onPress,
  styles,
  primary,
}: {
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  primary: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.logoutButton} accessibilityLabel={label}>
      <Ionicons name="log-out-outline" size={15} color={primary} />
      <Text style={styles.logoutText}>{label}</Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isDark, colors, toggleTheme } = useAppTheme();
  const { language, setLanguage, t } = useI18n();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
        headerLeft: () => (
          <ThemeToggle
            isDark={isDark}
            onSelectLight={() => {
              if (isDark) {
                toggleTheme();
              }
            }}
            onSelectDark={() => {
              if (!isDark) {
                toggleTheme();
              }
            }}
            lightLabel={t('lightMode')}
            darkLabel={t('darkMode')}
            styles={styles}
            primary={colors.primary}
            subtext={colors.subtext}
          />
        ),
        headerTitle: () => (
          <LanguageSwitcher
            language={language as 'es' | 'en'}
            onChange={(nextLanguage) => setLanguage(nextLanguage)}
            spanishLabel={t('spanish')}
            englishLabel={t('english')}
            styles={styles}
          />
        ),
        headerRight: () => (
          <LogoutButton label={t('signOut')} onPress={handleLogout} styles={styles} primary={colors.primary} />
        ),
        sceneStyle: styles.scene,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
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

const createStyles = (
  colors: { background: string; card: string; text: string; subtext: string; border: string; primary: string; pillBg: string },
  isDark: boolean,
) =>
  StyleSheet.create({
    header: {
      backgroundColor: colors.background,
      height: 96,
    },
    headerSide: {
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    headerCenter: {
      justifyContent: 'center',
    },
    themeControl: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(234,240,255,0.10)' : '#EDF2F8',
      borderRadius: 999,
      padding: 3,
      alignItems: 'center',
      minHeight: 40,
    },
    themeButton: {
      width: 36,
      height: 34,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeButtonActive: {
      backgroundColor: colors.pillBg,
    },
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(234,240,255,0.10)' : '#EDF2F8',
      borderRadius: 999,
      padding: 3,
      alignItems: 'center',
      minHeight: 40,
    },
    segmentButton: {
      minWidth: 44,
      height: 34,
      borderRadius: 999,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentButtonActive: {
      backgroundColor: colors.pillBg,
    },
    segmentLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.subtext,
    },
    segmentLabelActive: {
      color: colors.primary,
    },
    logoutButton: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
      backgroundColor: colors.card,
    },
    logoutText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    scene: {
      backgroundColor: colors.background,
    },
    tabBar: {
      height: 72,
      paddingTop: 8,
      paddingBottom: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      elevation: 0,
      shadowOpacity: 0,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
  });
