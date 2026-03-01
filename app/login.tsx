import { saveAuth } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.expoPublicApiUrl ?? process.env.EXPO_PUBLIC_API_URL;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 8 }}>
      <View style={{ position: 'absolute', top: 48, right: 16, flexDirection: 'row', gap: 8 }}>
        <Button title="ES" onPress={() => setLanguage('es')} disabled={language === 'es'} />
        <Button title="EN" onPress={() => setLanguage('en')} disabled={language === 'en'} />
      </View>

      <Text>{t('email')}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="juan@mail.com"
      />

      <Text>{t('password')}</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="123456" />

      <Button title={isLoading ? t('loggingIn') : t('login')} onPress={handleLogin} disabled={isLoading} />
    </View>
  );
}
