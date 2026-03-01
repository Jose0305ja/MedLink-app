import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Specialist = {
  id: string;
  name: string;
  specialty: string;
};

type DateItem = {
  id: string;
  dayShort: string;
  dayNumber: string;
};

type TimeSlot = {
  time: string;
  available: boolean;
};

const specialist: Specialist = {
  id: 'doc-1',
  name: 'Dra. María Fernanda',
  specialty: 'Cardióloga',
};

const availableDates: DateItem[] = [
  { id: '2026-03-10', dayShort: 'Mie', dayNumber: '10' },
  { id: '2026-03-11', dayShort: 'Jue', dayNumber: '11' },
  { id: '2026-03-12', dayShort: 'Vie', dayNumber: '12' },
  { id: '2026-03-15', dayShort: 'Lun', dayNumber: '15' },
  { id: '2026-03-16', dayShort: 'Mar', dayNumber: '16' },
];

const timeSlots: TimeSlot[] = [
  { time: '08:00 AM', available: false },
  { time: '09:00 AM', available: true },
  { time: '10:00 AM', available: true },
  { time: '11:00 AM', available: false },
  { time: '12:00 PM', available: false },
  { time: '01:00 PM', available: true },
  { time: '02:00 PM', available: true },
  { time: '03:00 PM', available: false },
  { time: '04:00 PM', available: true },
];

export default function ScheduleAppointmentScreen() {
  const [selectedDateId, setSelectedDateId] = useState<string | null>(availableDates[0]?.id ?? null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const canConfirm = useMemo(() => Boolean(selectedDateId && selectedTime), [selectedDateId, selectedTime]);

  const handleChangeSpecialist = () => {
    // TODO: Reemplazar por navegación a selector real cuando exista la ruta.
    Alert.alert('Pendiente', 'La pantalla para cambiar especialista aún no está disponible.');
  };

  const handleConfirm = () => {
    console.log('confirm-appointment', {
      specialistId: specialist.id,
      date: selectedDateId,
      time: selectedTime,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#1A2233" />
          </Pressable>
          <Text style={styles.headerTitle}>Agendar Cita</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Especialista</Text>
            <View style={styles.specialistCard}>
              <View style={styles.specialistLeft}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={20} color="#6E7C93" />
                </View>
                <View>
                  <Text style={styles.specialistName}>{specialist.name}</Text>
                  <Text style={styles.specialistSubtitle}>{specialist.specialty}</Text>
                </View>
              </View>

              <Pressable onPress={handleChangeSpecialist}>
                <Text style={styles.changeLink}>Cambiar</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fecha</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
              {availableDates.map((date) => {
                const isSelected = selectedDateId === date.id;
                return (
                  <Pressable
                    key={date.id}
                    onPress={() => setSelectedDateId(date.id)}
                    style={[styles.dateChip, isSelected ? styles.dateChipSelected : null]}>
                    <Text style={[styles.dayLabel, isSelected ? styles.dateTextSelected : null]}>{date.dayShort}</Text>
                    <Text style={[styles.dayNumber, isSelected ? styles.dateTextSelected : null]}>{date.dayNumber}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horario Disponible</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                const isDisabled = !slot.available;

                return (
                  <Pressable
                    key={slot.time}
                    disabled={isDisabled}
                    onPress={() => setSelectedTime(slot.time)}
                    style={[
                      styles.timeChip,
                      isDisabled ? styles.timeChipDisabled : null,
                      !isDisabled && !isSelected ? styles.timeChipAvailable : null,
                      isSelected ? styles.timeChipSelected : null,
                    ]}>
                    <Text
                      style={[
                        styles.timeChipText,
                        isDisabled ? styles.timeChipTextDisabled : null,
                        isSelected ? styles.timeChipTextSelected : null,
                      ]}>
                      {slot.time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={!canConfirm}
            onPress={handleConfirm}
            style={[styles.confirmButton, !canConfirm ? styles.confirmButtonDisabled : null]}>
            <Text style={styles.confirmButtonText}>Confirmar Cita</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A2233',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  specialistCard: {
    borderRadius: 17,
    padding: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0D1A2A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  specialistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F1F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialistName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2233',
  },
  specialistSubtitle: {
    fontSize: 13,
    color: '#8692A6',
    marginTop: 2,
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F6FDB',
  },
  datesRow: {
    gap: 10,
    paddingVertical: 2,
  },
  dateChip: {
    width: 58,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dateChipSelected: {
    backgroundColor: '#2F6FDB',
    borderColor: '#2F6FDB',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8A96AA',
  },
  dayNumber: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1E2A3D',
    lineHeight: 23,
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    width: '31.4%',
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipDisabled: {
    backgroundColor: '#EEF2F7',
  },
  timeChipAvailable: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E3F2',
  },
  timeChipSelected: {
    backgroundColor: '#2F6FDB',
    borderWidth: 1,
    borderColor: '#2F6FDB',
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#253044',
  },
  timeChipTextDisabled: {
    color: '#A0A7B4',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#0D1A2A',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  confirmButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#2F6FDB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F6FDB',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
