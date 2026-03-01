import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type Language = 'es' | 'en';

type TranslationKey =
  | 'language'
  | 'spanish'
  | 'english'
  | 'email'
  | 'password'
  | 'name'
  | 'role'
  | 'patient'
  | 'doctor'
  | 'login'
  | 'register'
  | 'registering'
  | 'loggingIn'
  | 'fillEmailPassword'
  | 'fillRegisterFields'
  | 'missingApiUrl'
  | 'loginFailed'
  | 'registerFailed'
  | 'networkError'
  | 'error'
  | 'home'
  | 'appointments'
  | 'profile'
  | 'logout'
  | 'goToRegister'
  | 'goToLogin'
  | 'scheduleAppointment'
  | 'selectDate'
  | 'loadSchedule'
  | 'confirmAppointment'
  | 'doctorRequired'
  | 'dateRequired'
  | 'slotRequired'
  | 'appointmentCreated'
  | 'close'
  | 'available'
  | 'occupied'
  | 'noAppointments'
  | 'doctorLabel'
  | 'patientLabel'
  | 'dateLabel'
  | 'timeLabel'
  | 'statusLabel';

const translations: Record<Language, Record<TranslationKey, string>> = {
  es: {
    language: 'Idioma',
    spanish: 'Español',
    english: 'Inglés',
    email: 'Correo',
    password: 'Contraseña',
    name: 'Nombre',
    role: 'Rol',
    patient: 'patient',
    doctor: 'doctor',
    login: 'Iniciar sesión',
    register: 'Registrarse',
    registering: 'Registrando...',
    loggingIn: 'Ingresando...',
    fillEmailPassword: 'Completa correo y contraseña.',
    fillRegisterFields: 'Completa nombre, correo, contraseña y rol.',
    missingApiUrl: 'No existe EXPO_PUBLIC_API_URL.',
    loginFailed: 'No se pudo iniciar sesión.',
    registerFailed: 'No se pudo registrar.',
    networkError: 'No se pudo conectar con el servidor.',
    error: 'Error',
    home: 'Inicio',
    appointments: 'Mis citas',
    profile: 'Mi perfil',
    logout: 'Logout',
    goToRegister: '¿No tienes cuenta? Regístrate',
    goToLogin: '¿Ya tienes cuenta? Inicia sesión',
    scheduleAppointment: 'Agendar cita',
    selectDate: 'Selecciona fecha (YYYY-MM-DD)',
    loadSchedule: 'Cargar horarios',
    confirmAppointment: 'Confirmar cita',
    doctorRequired: 'Selecciona un doctor.',
    dateRequired: 'Selecciona una fecha.',
    slotRequired: 'Selecciona un horario disponible.',
    appointmentCreated: 'Cita creada exitosamente.',
    close: 'Cerrar',
    available: 'Disponible',
    occupied: 'Ocupado',
    noAppointments: 'Sin citas',
    doctorLabel: 'Doctor',
    patientLabel: 'Paciente',
    dateLabel: 'Fecha',
    timeLabel: 'Hora',
    statusLabel: 'Estado',
  },
  en: {
    language: 'Language',
    spanish: 'Spanish',
    english: 'English',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    role: 'Role',
    patient: 'patient',
    doctor: 'doctor',
    login: 'Sign in',
    register: 'Register',
    registering: 'Registering...',
    loggingIn: 'Signing in...',
    fillEmailPassword: 'Please fill in email and password.',
    fillRegisterFields: 'Please fill in name, email, password and role.',
    missingApiUrl: 'EXPO_PUBLIC_API_URL is missing.',
    loginFailed: 'Could not sign in.',
    registerFailed: 'Could not register.',
    networkError: 'Could not connect to server.',
    error: 'Error',
    home: 'Home',
    appointments: 'Appointments',
    profile: 'Profile',
    logout: 'Logout',
    goToRegister: "Don't have an account? Register",
    goToLogin: 'Already have an account? Sign in',
    scheduleAppointment: 'Schedule appointment',
    selectDate: 'Select date (YYYY-MM-DD)',
    loadSchedule: 'Load schedule',
    confirmAppointment: 'Confirm appointment',
    doctorRequired: 'Select a doctor.',
    dateRequired: 'Select a date.',
    slotRequired: 'Select an available slot.',
    appointmentCreated: 'Appointment created successfully.',
    close: 'Close',
    available: 'Available',
    occupied: 'Occupied',
    noAppointments: 'No appointments',
    doctorLabel: 'Doctor',
    patientLabel: 'Patient',
    dateLabel: 'Date',
    timeLabel: 'Time',
    statusLabel: 'Status',
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
