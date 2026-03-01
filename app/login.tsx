import { saveAuth } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
  const [showPassword, setShowPassword] = useState(false);
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
    <View style={styles.screen}>
      <View style={styles.backgroundTint} />
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.languageRow}>
            <Pressable
              style={[styles.langChip, language === 'es' && styles.langChipActive]}
              onPress={() => setLanguage('es')}
              disabled={language === 'es'}
            >
              <Text style={[styles.langText, language === 'es' && styles.langTextActive]}>ES</Text>
            </Pressable>
            <Pressable
              style={[styles.langChip, language === 'en' && styles.langChipActive]}
              onPress={() => setLanguage('en')}
              disabled={language === 'en'}
            >
              <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>EN</Text>
            </Pressable>
          </View>

          <View style={styles.container}>
            <View style={styles.logoCircle}>
              <Image source={require('../assets/images/icon.png')} style={styles.logoImage} resizeMode="cover" />
            </View>

            <Text style={styles.title}>MediSync</Text>
            <Text style={styles.subtitle}>Tu puente seguro entre pacientes y doctores.</Text>

            {isRegisterMode ? (
              <View style={styles.inputCard}>
                <Feather name="user" size={20} color="#7B8AA3" />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Antonio Delgado"
                  placeholderTextColor="#A7B1C2"
                  style={styles.input}
                />
              </View>
            ) : null}

            <View style={[styles.inputCard, styles.inputSpacing]}>
              <Feather name="mail" size={20} color="#7B8AA3" />
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="Correo Electrónico"
                placeholderTextColor="#A7B1C2"
                style={styles.input}
              />
            </View>

            <View style={[styles.inputCard, styles.inputSpacing]}>
              <Feather name="lock" size={20} color="#7B8AA3" />
              <TextInput
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Contraseña"
                placeholderTextColor="#A7B1C2"
                style={styles.input}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onPress={() => setShowPassword((current) => !current)}
                style={styles.eyeButton}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#7B8AA3" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={isRegisterMode ? handleRegister : handleLogin}
              disabled={isLoading}
              activeOpacity={0.9}
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>{isRegisterMode ? t('register') : 'Ingresar'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity
                onPress={() => {
                  setMode((current) => (current === 'login' ? 'register' : 'login'));
                  setRole('patient');
                }}
                disabled={isLoading}
              >
                <Text style={styles.footerLink}>Regístrate aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F6F9FF',
    opacity: 0.35,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  languageRow: {
    position: 'absolute',
    top: 36,
    right: 0,
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    borderWidth: 1,
    borderColor: 'rgba(47,107,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  langChipActive: {
    backgroundColor: '#2F6BFF',
  },
  langText: {
    fontSize: 12,
    color: '#2F6BFF',
    fontWeight: '600',
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#2F6BFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  logoImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0B1528',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#9AA3B2',
    marginBottom: 18,
  },
  inputCard: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(47,107,255,0.35)',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputSpacing: {
    marginTop: 18,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: '#1B2432',
    fontSize: 16,
    paddingVertical: 14,
  },
  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },
  submitButton: {
    width: '100%',
    height: 56,
    borderRadius: 20,
    marginTop: 20,
    backgroundColor: '#2F6BFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F6BFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerText: {
    color: '#7F8AA0',
    fontSize: 14,
  },
  footerLink: {
    color: '#2F6BFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
