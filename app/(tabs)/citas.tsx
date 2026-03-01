import { getAuthToken, getCurrentUserRole } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import { useAppTheme } from '@/lib/theme-context';
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

const filterTabs: AppointmentFilter[] = ['programada', 'completada', 'no_asistio'];

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

function startOfDay(dateValue: Date) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
}

function isSameDay(leftDate: Date, rightDate: Date) {
  return startOfDay(leftDate).getTime() === startOfDay(rightDate).getTime();
}

function buildDateFromTime(selectedDateValue: string, timeValue: string) {
  const [hoursPart, minutesPart] = timeValue.split(':');
  const parsedHours = Number.parseInt(hoursPart ?? '0', 10);
  const parsedMinutes = Number.parseInt(minutesPart ?? '0', 10);
  const selected = new Date(`${selectedDateValue}T00:00:00`);

  if (Number.isNaN(selected.getTime()) || Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
    return null;
  }

  selected.setHours(parsedHours, parsedMinutes, 0, 0);
  return selected;
}

function getDateChipOptions() {
  const todayStart = startOfDay(new Date());
  const dayFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'short' });

  return Array.from({ length: 14 }).map((_, index) => {
    const currentDate = new Date(todayStart);
    currentDate.setDate(todayStart.getDate() + index);

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


function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; inCurrentMonth: boolean }[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    const day = daysInPreviousMonth - startOffset + i + 1;
    cells.push({ date: new Date(year, month - 1, day), inCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inCurrentMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const day = cells.length - (startOffset + daysInMonth) + 1;
    cells.push({ date: new Date(year, month + 1, day), inCurrentMonth: false });
  }

  return cells;
}

function isBeforeToday(dateValue: Date) {
  return startOfDay(dateValue).getTime() < startOfDay(new Date()).getTime();
}

function formatSelectedDateLabel(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(parsed)
    .replace('.', '');
}

export default function CitasScreen() {
  const { t, language } = useI18n();
  const { colors, isDark } = useAppTheme();
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(startOfDay(new Date()));

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const statusLabelMap: Record<AppointmentStatus, string> = useMemo(
    () => ({
      programada: t('upcoming'),
      completada: t('completed'),
      no_asistio: t('missed'),
    }),
    [t],
  );

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

  const loadScheduleForSelection = useCallback(
    async (doctorId: string, dateValue: string, showValidationAlerts = true) => {
      if (!API_URL) {
        if (showValidationAlerts) {
          Alert.alert(t('error'), t('missingApiUrl'));
        }
        return;
      }

      if (!doctorId) {
        if (showValidationAlerts) {
          Alert.alert(t('error'), t('doctorRequired'));
        }
        return;
      }

      if (!dateValue) {
        if (showValidationAlerts) {
          Alert.alert(t('error'), t('dateRequired'));
        }
        return;
      }

      try {
        const token = await getAuthToken();
        setIsLoading(true);
        const response = await fetch(
          `${API_URL}/doctors/${doctorId}/schedule?date=${encodeURIComponent(dateValue)}`,
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
              .map((slot: Slot) => ({
                ...slot,
                available: !bookedTimes.includes(slot.time),
              }));

        const selectedDateObject = new Date(`${dateValue}T00:00:00`);
        const isTodaySelection = !Number.isNaN(selectedDateObject.getTime()) && isSameDay(selectedDateObject, new Date());
        const nowWithBuffer = new Date(Date.now() + 10 * 60 * 1000);

        const visibleSlots = normalizedSlots.filter((slot) => {
          if (!slot.available || bookedTimes.includes(slot.time)) {
            return false;
          }

          if (!isTodaySelection) {
            return true;
          }

          const slotDateTime = buildDateFromTime(dateValue, slot.time);
          if (!slotDateTime) {
            return false;
          }

          return slotDateTime.getTime() > nowWithBuffer.getTime();
        });

        setSlots(visibleSlots);
        setSelectedSlotId(null);
        setHasLoadedSchedule(true);
      } catch {
        Alert.alert(t('error'), t('networkError'));
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );


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
    setShowCalendar(false);
    setCalendarMonth(startOfDay(new Date()));
    await loadDoctors();
  };

  const updateAppointmentStatus = async (appointmentId: string, status: 'completada' | 'no_asistio') => {
    if (!API_URL) {
      Alert.alert(t('error'), t('missingApiUrl'));
      return;
    }

    try {
      const token = await getAuthToken();
      setIsLoading(true);
      const response = await fetch(`${API_URL}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(t('error'), data?.message ?? t('networkError'));
        return;
      }

      if (role) {
        await loadAppointments(role);
      }
    } catch {
      Alert.alert(t('error'), t('networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId) ?? null;
  const dateOptions = useMemo(() => getDateChipOptions(), []);
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const selectedDateLabel = useMemo(() => formatSelectedDateLabel(selectedDate), [selectedDate]);

  useEffect(() => {
    const selectedParsed = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(selectedParsed.getTime()) || isBeforeToday(selectedParsed)) {
      const firstValidDate = dateOptions[0]?.value ?? toIsoDay(new Date());
      setSelectedDate(firstValidDate);
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

  useEffect(() => {
    if (!showModal || !selectedDoctorId || !selectedDate) {
      return;
    }

    loadScheduleForSelection(selectedDoctorId, selectedDate, false);
  }, [showModal, selectedDoctorId, selectedDate, loadScheduleForSelection]);

  const filteredAppointments = appointments.filter(
    (appointment) => sanitizeStatus(appointment.status) === activeFilter,
  );

  const renderCardActions = (appointment: AppointmentItem, status: AppointmentStatus) => {
    const onPlaceholderPress = () => {};

    if (role === 'doctor' && status === 'programada') {
      return (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => updateAppointmentStatus(appointment.id, 'completada')}
            disabled={isLoading}
            style={[styles.actionButton, styles.primaryActionButton]}>
            <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>{t('markAsCompleted')}</Text>
          </Pressable>
          <Pressable
            onPress={() => updateAppointmentStatus(appointment.id, 'no_asistio')}
            disabled={isLoading}
            style={[styles.actionButton, styles.missedActionButton]}>
            <Text style={[styles.actionButtonText, styles.missedActionButtonText]}>{t('markAsMissed')}</Text>
          </Pressable>
        </View>
      );
    }

    if (role !== 'doctor') {
      if (status === 'programada') {
        return (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onPlaceholderPress}
              style={[styles.actionButton, styles.primaryActionButton, styles.singleActionButton]}>
              <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>{t('reschedule')}</Text>
            </Pressable>
          </View>
        );
      }

      return null;
    }

    if (status === 'programada') {
      return (
        <View style={styles.actionsRow}>
          <Pressable onPress={onPlaceholderPress} style={[styles.actionButton, styles.primaryActionButton]}>
            <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>{t('reschedule')}</Text>
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
            <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>{t('viewDetails')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onPlaceholderPress}
          style={[styles.actionButton, styles.primaryActionButton, styles.singleActionButton]}>
          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>{t('scheduleNewAppointment')}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topSection}>
        <Text style={styles.title}>{t('appointments')}</Text>
        {role === 'patient' ? (
          <Pressable onPress={openScheduler} style={styles.scheduleButton}>
            <Text style={styles.scheduleButtonText}>{t('scheduleAppointment')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[styles.tabButton, isActive ? styles.activeTabButton : null]}>
              <Text style={[styles.tabButtonText, isActive ? styles.activeTabButtonText : null]}>{statusLabelMap[tab]}</Text>
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
                      <Ionicons name="person-outline" size={18} color={colors.subtext} />
                    </View>

                    <View style={styles.profileTextBlock}>
                      <Text style={styles.doctorName}>{mainName ?? '-'}</Text>
                      <Text style={styles.specialtyText}>
                        {role === 'doctor' ? t('patientLabel') : t('medicalConsultation')}
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
                    <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
                    <Text style={styles.dateTimeText}>{formatRawDate(appointment.date)}</Text>
                  </View>

                  <View style={styles.timeDivider} />

                  <View style={styles.dateTimeItem}>
                    <Ionicons name="time-outline" size={16} color={colors.subtext} />
                    <Text style={styles.dateTimeText}>{appointment.time}</Text>
                  </View>
                </View>

                {renderCardActions(appointment, normalizedStatus)}
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
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>
              <Text style={styles.modalTitle}>{t('scheduleAppointmentTitle')}</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>{t('doctorSection')}</Text>

                <View style={styles.doctorCard}>
                  <View style={styles.doctorAvatar}>
                    <Ionicons name="person-outline" size={18} color={colors.subtext} />
                  </View>

                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorCardName}>{selectedDoctor?.name ?? t('selectDoctor')}</Text>
                    <Text style={styles.doctorCardSpecialty}>{t('specialistGeneral')}</Text>
                  </View>

                  <Pressable onPress={() => setShowDoctorList((current) => !current)}>
                    <Text style={styles.changeDoctorText}>{t('change')}</Text>
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
                <Text style={styles.sectionLabel}>{t('selectDate').replace(' (YYYY-MM-DD)', '')}</Text>
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

                <Pressable onPress={() => setShowCalendar(true)} style={styles.calendarTrigger}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={styles.calendarTriggerText}>{t('chooseExactDate')}</Text>
                </Pressable>

                {selectedDateLabel ? <Text style={styles.selectedDateText}>{`${t('dateLabel')}: ${selectedDateLabel}`}</Text> : null}

              </View>

              {hasLoadedSchedule && slots.length === 0 ? <Text style={styles.noSlotsText}>{t('noSlotsForDay')}</Text> : null}

              {slots.length > 0 ? (
                <>
                  <Text style={styles.sectionLabel}>{t('availableSlots')}</Text>
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
                </>
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


          <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
            <View style={styles.calendarOverlay}>
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    onPress={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                      )
                    }
                    style={styles.calendarArrowButton}>
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                  </Pressable>
                  <Text style={styles.calendarTitle}>
                    {new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-ES', {
                      month: 'long',
                      year: 'numeric',
                    }).format(calendarMonth)}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                      )
                    }
                    style={styles.calendarArrowButton}>
                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                  </Pressable>
                </View>

                <View style={styles.calendarWeekRow}>
                  {t('calendarWeekdays').split(',').map((day) => (
                    <Text key={day} style={styles.calendarWeekDayLabel}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((cell) => {
                    const isoValue = toIsoDay(cell.date);
                    const isSelected = selectedDate === isoValue;
                    const isDisabled = isBeforeToday(cell.date);

                    return (
                      <Pressable
                        key={`${isoValue}-${cell.inCurrentMonth ? '1' : '0'}`}
                        disabled={isDisabled}
                        onPress={() => {
                          setSelectedDate(isoValue);
                          setSelectedSlotId(null);
                          setHasLoadedSchedule(false);
                          setSlots([]);
                          setShowCalendar(false);
                        }}
                        style={[
                          styles.calendarDay,
                          !cell.inCurrentMonth ? styles.calendarDayMuted : null,
                          isSelected ? styles.calendarDaySelected : null,
                        ]}>
                        <Text
                          style={[
                            styles.calendarDayText,
                            !cell.inCurrentMonth ? styles.calendarDayTextMuted : null,
                            isDisabled ? styles.calendarDayTextDisabled : null,
                            isSelected ? styles.calendarDayTextSelected : null,
                          ]}>
                          {cell.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable onPress={() => setShowCalendar(false)} style={styles.calendarCloseButton}>
                  <Text style={styles.calendarCloseText}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; subtext: string; border: string; primary: string; pillBg: string }, isDark: boolean) => StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
    backgroundColor: colors.background,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  scheduleButton: {
    backgroundColor: colors.pillBg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  scheduleButtonText: {
    color: colors.primary,
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
    backgroundColor: isDark ? 'rgba(234,240,255,0.08)' : '#EEF1F6',
  },
  activeTabButton: {
    backgroundColor: colors.pillBg,
  },
  tabButtonText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  cardsList: {
    gap: 14,
    paddingBottom: 26,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.card,
  },
  appointmentCard: {
    borderRadius: 18,
    backgroundColor: colors.card,
    padding: 16,
    gap: 14,
    shadowColor: isDark ? 'transparent' : '#0D1A2A',
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
    backgroundColor: isDark ? 'rgba(234,240,255,0.08)' : '#F1F4F9',
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
    color: colors.text,
  },
  specialtyText: {
    fontSize: 13,
    color: colors.subtext,
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
    backgroundColor: isDark ? 'rgba(234,240,255,0.06)' : '#F4F7FB',
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
    color: colors.text,
    fontWeight: '500',
    fontSize: 13,
  },
  timeDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
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
    backgroundColor: colors.pillBg,
  },
  primaryActionButtonText: {
    color: colors.primary,
  },
  secondaryActionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  secondaryActionButtonText: {
    color: colors.subtext,
  },
  missedActionButton: {
    backgroundColor: isDark ? 'rgba(194,65,76,0.25)' : '#FDECEF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,159,168,0.45)' : '#F4C9CF',
  },
  missedActionButtonText: {
    color: isDark ? '#FFB7BF' : '#B84A5A',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: isDark ? 'rgba(234,240,255,0.10)' : '#EFF4FB',
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
    color: colors.subtext,
    fontWeight: '600',
  },
  doctorCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: isDark ? 'transparent' : '#0D1A2A',
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
    backgroundColor: isDark ? 'rgba(234,240,255,0.10)' : '#EDF2FA',
  },
  doctorInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  doctorCardSpecialty: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
  changeDoctorText: {
    color: colors.primary,
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
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doctorPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.pillBg,
  },
  doctorPillText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '500',
  },
  doctorPillTextSelected: {
    color: colors.primary,
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
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: 'transparent',
    shadowColor: isDark ? 'transparent' : colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateChipDay: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: '600',
  },
  dateChipDaySelected: {
    color: '#E6F0FF',
  },
  dateChipNumber: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },
  dateChipNumberSelected: {
    color: '#FFFFFF',
  },
  dateChipMonth: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: '600',
    marginTop: -1,
  },
  dateChipMonthSelected: {
    color: '#E6F0FF',
  },
  noSlotsText: {
    color: colors.subtext,
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
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  slotChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  slotTimeText: {
    color: colors.text,
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
    color: colors.subtext,
  },
  modalFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: colors.card,
    shadowColor: isDark ? 'transparent' : '#0D1A2A',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  confirmButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isDark ? 'transparent' : '#0D1A2A',
    shadowOpacity: 0.14,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 1,
    backgroundColor: colors.pillBg,
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
    color: colors.subtext,
    fontSize: 13,
    fontWeight: '500',
  },

  calendarTrigger: {
    alignSelf: 'flex-start',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarTriggerText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedDateText: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: '#00000033',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  calendarCard: {
    borderRadius: 18,
    backgroundColor: colors.card,
    padding: 14,
    gap: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarArrowButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: isDark ? 'rgba(234,240,255,0.08)' : '#F1F5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  calendarWeekDayLabel: {
    width: '14.28%',
    textAlign: 'center',
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  calendarDayMuted: {
    opacity: 0.6,
  },
  calendarDaySelected: {
    backgroundColor: colors.primary,
  },
  calendarDayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  calendarDayTextMuted: {
    color: '#A8B4C6',
  },
  calendarDayTextDisabled: {
    color: '#C5CEDA',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  calendarCloseButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  calendarCloseText: {
    color: '#60728F',
    fontSize: 13,
    fontWeight: '600',
  },
});
