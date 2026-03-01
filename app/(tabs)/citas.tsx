import { getAuthToken, getCurrentUserRole } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  Pressable,
  ScrollView,
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


function formatRawDate(dateValue: string) {
  if (!dateValue) {
    return '';
  }

  const rawDate = String(dateValue).split('T')[0];
  return rawDate;
}

type AppointmentItem = {
  id: string;
  doctor?: string;
  patient?: string;
  date: string;
  time: string;
  status: string;
};

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

  const loadAppointments = useCallback(async (currentRole: UserRole) => {
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
  }, [t]);

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

  const openScheduler = async () => {
    setShowModal(true);
    setSelectedDoctorId(null);
    setSelectedSlotId(null);
    setSlots([]);
    setHasLoadedSchedule(false);
    await loadDoctors();
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>{t('appointments')}</Text>

      {role === 'patient' ? <Button title={t('scheduleAppointment')} onPress={openScheduler} /> : null}

      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
        {appointments.length === 0 ? (
          <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14 }}>
            <Text>{t('noAppointments')}</Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <View
              key={appointment.id}
              style={{
                borderWidth: 1,
                borderColor: '#d5d8dc',
                borderRadius: 12,
                padding: 12,
                backgroundColor: '#f8f9f9',
                gap: 4,
              }}>
              <Text style={{ fontWeight: '700' }}>
                {role === 'doctor'
                  ? `${t('patientLabel')}: ${appointment.patient ?? '-'}`
                  : `${t('doctorLabel')}: ${appointment.doctor ?? '-'}`}
              </Text>
              <Text>{`${t('dateLabel')}: ${formatRawDate(appointment.date)}`}</Text>
              <Text>{`${t('timeLabel')}: ${appointment.time}`}</Text>
              <Text>{`${t('statusLabel')}: ${appointment.status}`}</Text>
            </View>
          ))
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
