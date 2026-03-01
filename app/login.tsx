import { saveAuth } from '@/lib/auth-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';

const API_URL = Constants.expoConfig?.extra?.expoPublicApiUrl ?? process.env.EXPO_PUBLIC_API_URL;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completa correo y contraseña.');
      return;
    }

    if (!API_URL) {
      Alert.alert('Error', 'No existe EXPO_PUBLIC_API_URL.');
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
        Alert.alert('Error', data?.message ?? 'No se pudo iniciar sesión.');
        return;
      }

      await saveAuth(data);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 8 }}>
      <Text>Correo</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="juan@mail.com"
      />

      <Text>Contraseña</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="123456" />

      <Button title={isLoading ? 'Ingresando...' : 'Iniciar sesión'} onPress={handleLogin} disabled={isLoading} />
    </View>
  );
}
