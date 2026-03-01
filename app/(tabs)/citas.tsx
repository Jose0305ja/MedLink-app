import { getAuthToken, getCurrentUserRole } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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

function toIsoDay(dateValue: Date) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()).toISOString().split('T')[0];
}

function getDateChipOptions(baseDate: string) {
  const parsedDate = new Date(`${baseDate}T00:00:00`);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const parsedStart = Number.isNaN(parsedDate.getTime())
    ? tomorrow
    : new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());

  const anchor = parsedStart > tomorrow ? parsedStart : tomorrow;
  const dayFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'short' });

  return Array.from({ length: 7 }).map((_, index) => {
    const currentDate = new Date(anchor);
    currentDate.setDate(anchor.getDate() + index);

    const dayLabel = dayFormat.format(currentDate).replace('.', '');
    const monthLabel = monthFormat.format(currentDate).replace('.', '');

    return {
      value: toIsoDay(currentDate),
      dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
      dayNumber: String(currentDate.getDate()),
      monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    };
  });
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
  const [showDoctorList, setShowDoctorList] = useState(false);

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

      const backendSlots = Array.isArray(data?.slots) ? data.slots : [];
      const backendAllSlots = Array.isArray(data?.allSlots) ? data.allSlots : [];
      const bookedTimes = Array.isArray(data?.bookedTimes)
        ? data.bookedTimes.filter((time: unknown): time is string => typeof time === 'string')
        : [];

      const normalizedSlots: Slot[] = backendSlots.length
        ? backendSlots
        : backendAllSlots
            .filter((slot: unknown): slot is Slot =>
              Boolean(slot && typeof slot === 'object' && 'schedule_id' in slot && 'time' in slot),
            )
            .map((slot) => ({
              ...slot,
              available: !bookedTimes.includes(slot.time),
            }));

      const visibleSlots = normalizedSlots.filter((slot) => slot.available && !bookedTimes.includes(slot.time));

      setSlots(visibleSlots);
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

  const openScheduler = async () => {
    setShowModal(true);
    setSelectedDoctorId(null);
    setSelectedSlotId(null);
    setSlots([]);
    setHasLoadedSchedule(false);
    setShowDoctorList(true);
    await loadDoctors();
  };

  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId) ?? null;
  const dateOptions = useMemo(() => getDateChipOptions(selectedDate), [selectedDate]);

  useEffect(() => {
    if (!dateOptions.length) {
      return;
    }

    const hasValidSelectedDate = dateOptions.some((option) => option.value === selectedDate);
    if (!hasValidSelectedDate) {
      setSelectedDate(dateOptions[0].value);
      setSelectedSlotId(null);
      setHasLoadedSchedule(false);
      setSlots([]);
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    if (selectedSlotId && !slots.some((slot) => slot.schedule_id === selectedSlotId)) {
      setSelectedSlotId(null);
    }
  }, [selectedSlotId, slots]);

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
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowModal(false)} style={styles.backButton}>
                <Ionicons name="chevron-back" size={18} color="#2B3A51" />
              </Pressable>
              <Text style={styles.modalTitle}>Agendar Cita</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Doctor</Text>

                <View style={styles.doctorCard}>
                  <View style={styles.doctorAvatar}>
                    <Ionicons name="person-outline" size={18} color="#8593AA" />
                  </View>

                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorCardName}>{selectedDoctor?.name ?? 'Selecciona un doctor'}</Text>
                    <Text style={styles.doctorCardSpecialty}>Medicina general</Text>
                  </View>

                  <Pressable onPress={() => setShowDoctorList((current) => !current)}>
                    <Text style={styles.changeDoctorText}>Cambiar</Text>
                  </Pressable>
                </View>

                {showDoctorList ? (
                  <View style={styles.doctorPillsWrap}>
                    {doctors.map((doctor) => {
                      const isSelected = doctor.id === selectedDoctorId;

                      return (
                        <Pressable
                          key={doctor.id}
                          onPress={() => {
                            setSelectedDoctorId(doctor.id);
                            setShowDoctorList(false);
                          }}
                          disabled={isLoading}
                          style={[styles.doctorPill, isSelected ? styles.doctorPillSelected : null]}>
                          <Text style={[styles.doctorPillText, isSelected ? styles.doctorPillTextSelected : null]}>
                            {doctor.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Selecciona una fecha</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateChipsRow}>
                  {dateOptions.map((dateOption) => {
                    const isSelected = selectedDate === dateOption.value;

                    return (
                      <Pressable
                        key={dateOption.value}
                        onPress={() => setSelectedDate(dateOption.value)}
                        style={[styles.dateChip, isSelected ? styles.dateChipSelected : null]}>
                        <Text style={[styles.dateChipDay, isSelected ? styles.dateChipDaySelected : null]}>
                          {dateOption.dayLabel}
                        </Text>
                        <Text style={[styles.dateChipNumber, isSelected ? styles.dateChipNumberSelected : null]}>
                          {dateOption.dayNumber}
                        </Text>
                        <Text style={[styles.dateChipMonth, isSelected ? styles.dateChipMonthSelected : null]}>
                          {dateOption.monthLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Pressable onPress={loadSchedule} disabled={isLoading} style={styles.loadScheduleLinkWrap}>
                  <Text style={[styles.loadScheduleLink, isLoading ? styles.linkDisabled : null]}>{t('loadSchedule')}</Text>
                </Pressable>
              </View>

              {hasLoadedSchedule && slots.length === 0 ? <Text style={styles.noSlotsText}>{t('noSlotsForDay')}</Text> : null}

              {slots.length > 0 ? (
                <View style={styles.slotsGrid}>
                  {slots.map((slot) => {
                    const isSelected = selectedSlotId === slot.schedule_id;

                    return (
                      <Pressable
                        key={slot.schedule_id}
                        onPress={() => {
                          if (slot.available) {
                            setSelectedSlotId(slot.schedule_id);
                          }
                        }}
                        style={[styles.slotChip, isSelected ? styles.slotChipSelected : null]}>
                        <Text
                          style={[
                            styles.slotTimeText,
                            isSelected ? styles.slotTimeTextSelected : null,
                          ]}>
                          {slot.time}
                        </Text>
                        <Text
                          style={[
                            styles.slotStateText,
                            isSelected ? styles.slotStateTextSelected : null,
                          ]}>
                          {t('available')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={createAppointment}
                disabled={isLoading || !selectedDate || !selectedSlotId}
                style={[
                  styles.confirmButton,
                  isLoading || !selectedDate || !selectedSlotId ? styles.confirmButtonDisabled : null,
                ]}>
                <Text style={styles.confirmButtonText}>{t('confirmAppointment')}</Text>
              </Pressable>

              <Pressable onPress={() => setShowModal(false)} style={styles.closeTextWrap}>
                <Text style={styles.closeText}>{t('close')}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  modalContainer: {
    flex: 1,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF4FB',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#172437',
  },
  headerSpacer: {
    width: 30,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 150,
    gap: 24,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#7E8AA0',
    fontWeight: '600',
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0D1A2A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  doctorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2FA',
  },
  doctorInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D2739',
  },
  doctorCardSpecialty: {
    fontSize: 12,
    color: '#A1ADBF',
    marginTop: 2,
  },
  changeDoctorText: {
    color: '#2F6CCB',
    fontWeight: '600',
    fontSize: 14,
  },
  doctorPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  doctorPill: {
    borderWidth: 1,
    borderColor: '#E2EAF4',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doctorPillSelected: {
    borderColor: '#326CC6',
    backgroundColor: '#EAF2FF',
  },
  doctorPillText: {
    color: '#4D5E79',
    fontSize: 13,
    fontWeight: '500',
  },
  doctorPillTextSelected: {
    color: '#2E67BE',
    fontWeight: '700',
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 2,
    paddingRight: 8,
  },
  dateChip: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5ECF6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  dateChipSelected: {
    backgroundColor: '#4E85DD',
    borderColor: 'transparent',
    shadowColor: '#2F6CCB',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateChipDay: {
    color: '#8B98AE',
    fontSize: 10,
    fontWeight: '600',
  },
  dateChipDaySelected: {
    color: '#E6F0FF',
  },
  dateChipNumber: {
    color: '#2D3D56',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },
  dateChipNumberSelected: {
    color: '#FFFFFF',
  },
  dateChipMonth: {
    color: '#9AA7BB',
    fontSize: 10,
    fontWeight: '600',
    marginTop: -1,
  },
  dateChipMonthSelected: {
    color: '#E6F0FF',
  },
  loadScheduleLinkWrap: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  loadScheduleLink: {
    color: '#2F6CCB',
    fontSize: 15,
    fontWeight: '600',
  },
  linkDisabled: {
    opacity: 0.55,
  },
  noSlotsText: {
    color: '#7A869B',
    fontSize: 13,
    marginTop: -6,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  slotChip: {
    width: '31.5%',
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5ECF6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  slotChipSelected: {
    borderColor: '#2F6CCB',
    backgroundColor: '#2F6CCB',
  },
  slotTimeText: {
    color: '#22324A',
    fontWeight: '700',
    fontSize: 13,
  },
  slotStateText: {
    color: '#A0AEC2',
    fontSize: 10,
    fontWeight: '500',
  },
  slotStateTextSelected: {
    color: '#FFFFFFB3',
  },
  slotTimeTextSelected: {
    color: '#FFFFFF',
  },
  slotTimeTextDisabled: {
    color: '#98A5BA',
  },
  modalFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0D1A2A',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  confirmButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#2F6CCB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D1A2A',
    shadowOpacity: 0.14,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 1,
    backgroundColor: '#B9D1F5',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeTextWrap: {
    alignSelf: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  closeText: {
    color: '#7B889D',
    fontSize: 13,
    fontWeight: '500',
  },
});
