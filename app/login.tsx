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
      <View style={styles.backgroundGlow} />
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.languageRowWrapper}>
            <View style={styles.languageRow}>
              <Pressable
                style={[styles.langChip, language === 'es' && styles.langChipActive]}
                onPress={() => setLanguage('es')}
              >
                <Text style={[styles.langText, language === 'es' && styles.langTextActive]}>ES</Text>
              </Pressable>
              <Pressable
                style={[styles.langChip, language === 'en' && styles.langChipActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>EN</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.container}>
            <View style={styles.logoCircle}>
              <Image source={require('../assets/images/icon.png')} style={styles.logoImage} resizeMode="cover" />
            </View>

            <Text style={styles.title}>MediSync</Text>
            <Text style={styles.subtitle}>
              {language === 'es'
                ? 'Tu puente seguro entre pacientes y doctores.'
                : 'Your secure bridge between patients and doctors.'}
            </Text>

            {isRegisterMode ? (
              <View style={styles.inputCard}>
                <Feather name="user" size={20} color="#7B8AA3" />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre"
                  placeholderTextColor="#A7B1C2"
                  style={styles.input}
                />
              </View>
            ) : null}

            <View style={[styles.inputCard, isRegisterMode ? styles.inputSpacing : styles.firstInputSpacing]}>
              <Feather name="mail" size={20} color="#7B8AA3" />
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder={language === 'es' ? 'Correo' : t('email')}
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
                placeholder={language === 'es' ? 'Contraseña' : t('password')}
                placeholderTextColor="#A7B1C2"
                style={styles.input}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? language === 'es'
                      ? 'Ocultar contraseña'
                      : 'Hide password'
                    : language === 'es'
                      ? 'Mostrar contraseña'
                      : 'Show password'
                }
                onPress={() => setShowPassword((current) => !current)}
                style={styles.eyeButton}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#7B8AA3" />
              </TouchableOpacity>
            </View>

            {isRegisterMode ? (
              <View style={styles.segmentedContainer}>
                <Pressable
                  onPress={() => setRole('patient')}
                  style={[styles.segmentItem, role === 'patient' && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, role === 'patient' && styles.segmentTextActive]}>
                    {language === 'es' ? 'Paciente' : 'Patient'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setRole('doctor')}
                  style={[styles.segmentItem, role === 'doctor' && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, role === 'doctor' && styles.segmentTextActive]}>
                    {language === 'es' ? 'Doctor' : 'Doctor'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={isRegisterMode ? handleRegister : handleLogin}
              disabled={isLoading}
              activeOpacity={0.9}
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>{isRegisterMode ? 'Registrarse' : 'Ingresar'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <TouchableOpacity
                onPress={() => {
                  setMode((current) => (current === 'login' ? 'register' : 'login'));
                  setRole('patient');
                }}
                disabled={isLoading}
              >
                <Text style={styles.footerText}>
                  {isRegisterMode
                    ? language === 'es'
                      ? '¿Ya tienes cuenta? Inicia sesión'
                      : 'Already have an account? Log in'
                    : language === 'es'
                      ? '¿No tienes cuenta? Regístrate aquí'
                      : "Don't have an account? Register here"}
                </Text>
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
    backgroundColor: '#F7FAFF',
    opacity: 0.65,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#DCE8FF',
    opacity: 0.22,
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
  languageRowWrapper: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 14,
    marginBottom: 10,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    borderWidth: 1,
    borderColor: 'rgba(47,107,255,0.2)',
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
    textAlign: 'center',
  },
  inputCard: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(47,107,255,0.28)',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  firstInputSpacing: {
    marginTop: 2,
  },
  inputSpacing: {
    marginTop: 14,
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
  segmentedContainer: {
    width: '100%',
    marginTop: 14,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#F1F5FD',
    flexDirection: 'row',
    gap: 6,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  segmentItemActive: {
    backgroundColor: '#2F6BFF',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7A93',
  },
  segmentTextActive: {
    color: '#FFFFFF',
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
    color: '#2F6BFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
