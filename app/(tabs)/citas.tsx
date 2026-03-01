import { getAuthToken, getCurrentUserRole } from '@/lib/auth-storage';
import { useI18n } from '@/lib/i18n-context';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
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

type Doctor = {
  id: string;
  name: string;
};

type Slot = {
  schedule_id: string;
  time: string;
  available: boolean;
};

export default function CitasScreen() {
  const { t } = useI18n();
  const [role, setRole] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('2026-03-05');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const userRole = await getCurrentUserRole();
      setRole(userRole);
    };

    loadRole();
  }, []);

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
    await loadDoctors();
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text>{t('appointments')}</Text>

      {role === 'patient' ? (
        <Button title={t('scheduleAppointment')} onPress={openScheduler} />
      ) : null}

      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <Text>{t('scheduleAppointment')}</Text>

          <Text>Doctor</Text>
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
