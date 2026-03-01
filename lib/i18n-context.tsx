import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type Language = 'es' | 'en';

type TranslationKey =
  | 'language'
  | 'spanish'
  | 'english'
  | 'email'
  | 'password'
  | 'login'
  | 'loggingIn'
  | 'fillEmailPassword'
  | 'missingApiUrl'
  | 'loginFailed'
  | 'networkError'
  | 'error'
  | 'home'
  | 'appointments'
  | 'profile'
  | 'logout';

const translations: Record<Language, Record<TranslationKey, string>> = {
  es: {
    language: 'Idioma',
    spanish: 'Español',
    english: 'Inglés',
    email: 'Correo',
    password: 'Contraseña',
    login: 'Iniciar sesión',
    loggingIn: 'Ingresando...',
    fillEmailPassword: 'Completa correo y contraseña.',
    missingApiUrl: 'No existe EXPO_PUBLIC_API_URL.',
    loginFailed: 'No se pudo iniciar sesión.',
    networkError: 'No se pudo conectar con el servidor.',
    error: 'Error',
    home: 'Inicio',
    appointments: 'Mis citas',
    profile: 'Mi perfil',
    logout: 'Logout',
  },
  en: {
    language: 'Language',
    spanish: 'Spanish',
    english: 'English',
    email: 'Email',
    password: 'Password',
    login: 'Sign in',
    loggingIn: 'Signing in...',
    fillEmailPassword: 'Please fill in email and password.',
    missingApiUrl: 'EXPO_PUBLIC_API_URL is missing.',
    loginFailed: 'Could not sign in.',
    networkError: 'Could not connect to server.',
    error: 'Error',
    home: 'Home',
    appointments: 'Appointments',
    profile: 'Profile',
    logout: 'Logout',
  },
};

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey) => translations[language][key],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n debe usarse dentro de I18nProvider');
  }

  return context;
}
