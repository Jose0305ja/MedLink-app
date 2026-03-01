import { getAuthToken, getCurrentUserRole } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = Constants.expoConfig?.extra?.expoPublicApiUrl ?? process.env.EXPO_PUBLIC_API_URL;

type UserRole = 'patient' | 'doctor';

type Doctor = {
  id: string;
  name: string;
};

type Slot = {
  schedule_id: string;
  time: string;
  available: boolean;
};

type AppointmentStatus = 'programada' | 'completada' | 'no_asistio';
type AppointmentFilter = AppointmentStatus;

function formatRawDate(dateValue: string) {
  if (!dateValue) {
    return '';
  }

  return String(dateValue).split('T')[0];
}

type AppointmentItem = {
  id: string;
  doctor?: string;
  patient?: string;
  date: string;
  time: string;
  status: string;
};

const statusLabelMap: Record<AppointmentStatus, string> = {
  programada: 'Programada',
  completada: 'Completada',
  no_asistio: 'No asistió',
};

const filterTabs: { label: string; value: AppointmentFilter }[] = [
  { label: 'Próximas', value: 'programada' },
  { label: 'Completadas', value: 'completada' },
  { label: 'No asistió', value: 'no_asistio' },
];

function getStatusBadgeStyle(status: AppointmentStatus) {
  if (status === 'completada') {
    return { backgroundColor: '#EAF7F0', color: '#2F8F5B' };
  }

  if (status === 'no_asistio') {
    return { backgroundColor: '#FBEDEE', color: '#C34D59' };
  }

  return { backgroundColor: '#EAF2FF', color: '#3D77CC' };
}

function sanitizeStatus(rawStatus: string): AppointmentStatus {
  if (rawStatus === 'completada' || rawStatus === 'no_asistio') {
    return rawStatus;
  }

  return 'programada';
}

export default function CitasScreen() {
  const { t } = useI18n();
  const [role, setRole] = useState<UserRole | null>(null);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('2026-03-05');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [hasLoadedSchedule, setHasLoadedSchedule] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AppointmentFilter>('programada');

  const loadAppointments = useCallback(
    async (currentRole: UserRole) => {
      if (!API_URL) {
        Alert.alert(t('error'), t('missingApiUrl'));
        return;
      }

      try {
        const token = await getAuthToken();
        setIsLoading(true);
        const endpoint = currentRole === 'patient' ? '/appointments/me' : '/appointments/doctor';
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          Alert.alert(t('error'), data?.message ?? t('networkError'));
          return;
        }

        setAppointments(Array.isArray(data) ? data : []);
      } catch {
        Alert.alert(t('error'), t('networkError'));
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    const loadRoleAndAppointments = async () => {
      const userRole = await getCurrentUserRole();
      if (userRole === 'patient' || userRole === 'doctor') {
        setRole(userRole);
        await loadAppointments(userRole);
      }
    };

    loadRoleAndAppointments();
  }, [loadAppointments]);

  const loadDoctors = async () => {
    if (!API_URL) {
      Alert.alert(t('error'), t('missingApiUrl'));
      return;
    }

    try {
      const token = await getAuthToken();
      setIsLoading(true);
      const response = await fetch(`${API_URL}/doctors`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(t('error'), data?.message ?? t('networkError'));
        return;
      }

      setDoctors(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert(t('error'), t('networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedule = async () => {
    if (!API_URL) {
      Alert.alert(t('error'), t('missingApiUrl'));
      return;
    }

    if (!selectedDoctorId) {
      Alert.alert(t('error'), t('doctorRequired'));
      return;
    }

    if (!selectedDate) {
      Alert.alert(t('error'), t('dateRequired'));
      return;
    }

    try {
      const token = await getAuthToken();
      setIsLoading(true);
      const response = await fetch(
        `${API_URL}/doctors/${selectedDoctorId}/schedule?date=${encodeURIComponent(selectedDate)}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(t('error'), data?.message ?? t('networkError'));
        return;
      }

      setSlots(Array.isArray(data?.slots) ? data.slots : []);
      setSelectedSlotId(null);
      setHasLoadedSchedule(true);
    } catch {
      Alert.alert(t('error'), t('networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const createAppointment = async () => {
    if (!API_URL) {
      Alert.alert(t('error'), t('missingApiUrl'));
      return;
    }

    if (!selectedDoctorId) {
      Alert.alert(t('error'), t('doctorRequired'));
      return;
    }

    if (!selectedSlotId) {
      Alert.alert(t('error'), t('slotRequired'));
      return;
    }

    try {
      const token = await getAuthToken();
      setIsLoading(true);
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          schedule_id: selectedSlotId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(t('error'), data?.message ?? t('networkError'));
        return;
      }

      Alert.alert(t('appointments'), t('appointmentCreated'));
      setShowModal(false);
      if (role) {
        await loadAppointments(role);
      }
    } catch {
      Alert.alert(t('error'), t('networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const openScheduler = () => {
    router.push('/appointments/schedule');
  };

  const filteredAppointments = appointments.filter(
    (appointment) => sanitizeStatus(appointment.status) === activeFilter,
  );

  const renderCardActions = (status: AppointmentStatus) => {
    const onPlaceholderPress = () => {};

    if (status === 'programada') {
      return (
        <View style={styles.actionsRow}>
          <Pressable onPress={onPlaceholderPress} style={[styles.actionButton, styles.primaryActionButton]}>
            <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>Reprogramar</Text>
          </Pressable>
          <Pressable onPress={onPlaceholderPress} style={[styles.actionButton, styles.secondaryActionButton]}>
            <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>Cancelar</Text>
          </Pressable>
        </View>
      );
    }

    if (status === 'completada') {
      return (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onPlaceholderPress}
            style={[styles.actionButton, styles.secondaryActionButton, styles.singleActionButton]}>
            <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>Ver detalles</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onPlaceholderPress}
          style={[styles.actionButton, styles.primaryActionButton, styles.singleActionButton]}>
          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>Agendar nueva cita</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topSection}>
        <Text style={styles.title}>Mis citas</Text>
        {role === 'patient' ? (
          <Pressable onPress={openScheduler} style={styles.scheduleButton}>
            <Text style={styles.scheduleButtonText}>Agendar cita</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => setActiveFilter(tab.value)}
              style={[styles.tabButton, isActive ? styles.activeTabButton : null]}>
              <Text style={[styles.tabButtonText, isActive ? styles.activeTabButtonText : null]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.cardsList}>
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text>{t('noAppointments')}</Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => {
            const normalizedStatus = sanitizeStatus(appointment.status);
            const badgeStyle = getStatusBadgeStyle(normalizedStatus);
            const mainName = role === 'doctor' ? appointment.patient : appointment.doctor;

            return (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.profileBlock}>
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person-outline" size={18} color="#8A95A9" />
                    </View>

                    <View style={styles.profileTextBlock}>
                      <Text style={styles.doctorName}>{mainName ?? '-'}</Text>
                      <Text style={styles.specialtyText}>
                        {role === 'doctor' ? 'Paciente' : 'Consulta médica'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}>
                    <Text style={[styles.badgeText, { color: badgeStyle.color }]}>
                      {statusLabelMap[normalizedStatus]}
                    </Text>
                  </View>
                </View>

                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateTimeItem}>
                    <Ionicons name="calendar-outline" size={16} color="#71809A" />
                    <Text style={styles.dateTimeText}>{formatRawDate(appointment.date)}</Text>
                  </View>

                  <View style={styles.timeDivider} />

                  <View style={styles.dateTimeItem}>
                    <Ionicons name="time-outline" size={16} color="#71809A" />
                    <Text style={styles.dateTimeText}>{appointment.time}</Text>
                  </View>
                </View>

                {renderCardActions(normalizedStatus)}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <Text>{t('scheduleAppointment')}</Text>

          <Text>{t('doctorLabel')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {doctors.map((doctor) => (
              <Button
                key={doctor.id}
                title={doctor.name}
                onPress={() => setSelectedDoctorId(doctor.id)}
                disabled={isLoading || selectedDoctorId === doctor.id}
              />
            ))}
          </View>

          <Text>{t('selectDate')}</Text>
          <TextInput value={selectedDate} onChangeText={setSelectedDate} placeholder="2026-03-05" />

          <Button title={t('loadSchedule')} onPress={loadSchedule} disabled={isLoading} />

          {hasLoadedSchedule && slots.length === 0 ? <Text>{t('noSlotsForDay')}</Text> : null}

          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {slots.map((slot) => {
              const isSelected = selectedSlotId === slot.schedule_id;
              const bgColor = !slot.available ? '#f5b7b1' : isSelected ? '#7fb3d5' : '#d5f5e3';

              return (
                <Pressable
                  key={slot.schedule_id}
                  onPress={() => {
                    if (slot.available) {
                      setSelectedSlotId(slot.schedule_id);
                    }
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: '#333',
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: bgColor,
                    opacity: slot.available ? 1 : 0.65,
                  }}>
                  <Text>{slot.time}</Text>
                  <Text>{slot.available ? t('available') : t('occupied')}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Button title={t('confirmAppointment')} onPress={createAppointment} disabled={isLoading} />
          <Button title={t('close')} onPress={() => setShowModal(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
    backgroundColor: '#F7F9FC',
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2233',
  },
  scheduleButton: {
    backgroundColor: '#EAF2FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  scheduleButtonText: {
    color: '#346FCA',
    fontWeight: '600',
    fontSize: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF1F6',
  },
  activeTabButton: {
    backgroundColor: '#E5EEFD',
  },
  tabButtonText: {
    color: '#6B7383',
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#316BC2',
    fontWeight: '700',
  },
  cardsList: {
    gap: 14,
    paddingBottom: 26,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#E2E7EF',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  appointmentCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
    shadowColor: '#0D1A2A',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextBlock: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D2739',
  },
  specialtyText: {
    fontSize: 13,
    color: '#7B879A',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontWeight: '600',
    fontSize: 12,
  },
  dateTimeContainer: {
    borderRadius: 14,
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dateTimeText: {
    color: '#415066',
    fontWeight: '500',
    fontSize: 13,
  },
  timeDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#D5DDE8',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  singleActionButton: {
    flex: 0,
    minWidth: 170,
  },
  primaryActionButton: {
    backgroundColor: '#E5EEFD',
  },
  primaryActionButtonText: {
    color: '#2E65BC',
  },
  secondaryActionButton: {
    borderWidth: 1,
    borderColor: '#D6DEEA',
    backgroundColor: '#FFFFFF',
  },
  secondaryActionButtonText: {
    color: '#56657D',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
