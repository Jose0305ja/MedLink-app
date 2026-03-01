import { saveAuth } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.expoPublicApiUrl ?? process.env.EXPO_PUBLIC_API_URL;

type AuthMode = 'login' | 'register';
type Role = 'patient' | 'doctor';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('patient');
  const [isLoading, setIsLoading] = useState(false);
  const { language, setLanguage, t } = useI18n();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), t('fillEmailPassword'));
      return;
    }

    if (!API_URL) {
      Alert.alert(t('error'), t('missingApiUrl'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(t('error'), data?.message ?? t('loginFailed'));
        return;
      }

      await saveAuth(data);
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t('error'), t('networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !role) {
      Alert.alert(t('error'), t('fillRegisterFields'));
      return;
    }

    if (!API_URL) {
      Alert.alert(t('error'), t('missingApiUrl'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(t('error'), data?.message ?? t('registerFailed'));
        return;
      }

      await saveAuth(data);
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t('error'), t('networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const isRegisterMode = mode === 'register';

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 8 }}>
      <View style={{ position: 'absolute', top: 48, right: 16, flexDirection: 'row', gap: 8 }}>
        <Button title="ES" onPress={() => setLanguage('es')} disabled={language === 'es'} />
        <Button title="EN" onPress={() => setLanguage('en')} disabled={language === 'en'} />
      </View>

      {isRegisterMode ? (
        <>
          <Text>{t('name')}</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Antonio Delgado" />
        </>
      ) : null}

      <Text>{t('email')}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="antonio@gmail.com"
      />

      <Text>{t('password')}</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="americacampeon2023"
      />

      {isRegisterMode ? (
        <>
          <Text>{t('role')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={t('patient')} onPress={() => setRole('patient')} disabled={role === 'patient'} />
            <Button title={t('doctor')} onPress={() => setRole('doctor')} disabled={role === 'doctor'} />
          </View>
        </>
      ) : null}

      <Button
        title={isLoading ? (isRegisterMode ? t('registering') : t('loggingIn')) : isRegisterMode ? t('register') : t('login')}
        onPress={isRegisterMode ? handleRegister : handleLogin}
        disabled={isLoading}
      />

      <Button
        title={isRegisterMode ? t('goToLogin') : t('goToRegister')}
        onPress={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
        disabled={isLoading}
      />
    </View>
  );
}
