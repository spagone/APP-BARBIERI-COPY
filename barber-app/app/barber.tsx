import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomBar from '../components/BottomBar';
import { getAllAppointments, updateAppointmentById, type StoredAppointment } from './store/appointmentsStore';
import { clearUser, getUser } from './store/userStore';

type BarberTab = 'booking' | 'history';
type CalendarFilter = 'all' | 'confirmed' | 'cancelled';

const GOLD = '#c59d5f';
const BG = '#0f0f0f';
const CARD = '#171717';
const CARD2 = '#1d1d1d';
const TXT = '#ffffff';
const MUTED = '#a8a8a8';

const formatDateLabel = (ts: number) =>
  new Date(ts).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatTimeRange = (appointment: StoredAppointment) =>
  `${formatTime(appointment.startAt)} - ${formatTime(appointment.endAt)}`;

const dayKeyFromTs = (ts: number) => {
  const day = new Date(ts);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

const isSameDay = (a: number, b: number) => dayKeyFromTs(a) === dayKeyFromTs(b);

const normalize = (value: string) => value.trim().toLowerCase();

const getStatusLabel = (appointment: StoredAppointment, nowTs: number) => {
  if (appointment.status === 'cancelled') return 'Annullato';
  if (appointment.endAt < nowTs) return 'Completato';
  return 'Confermato';
};

const getStatusTone = (appointment: StoredAppointment, nowTs: number) => {
  if (appointment.status === 'cancelled') return 'cancelled';
  if (appointment.endAt < nowTs) return 'past';
  return 'upcoming';
};

export default function Barber() {
  const router = useRouter();
  const params = useLocalSearchParams<{ activeTab?: string }>();
  const currentUser = getUser();

  const [appointmentsSnapshot, setAppointmentsSnapshot] = useState<StoredAppointment[]>([]);
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>('all');

  const activeTabParam = Array.isArray(params.activeTab) ? params.activeTab[0] : params.activeTab;
  const activeTab: BarberTab = activeTabParam === 'history' ? 'history' : 'booking';

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (currentUser.role !== 'barber') {
      router.replace('/client');
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (activeTab === 'booking' && calendarFilter === 'cancelled') {
      setCalendarFilter('all');
    }
  }, [activeTab, calendarFilter]);

  useEffect(() => {
    setAppointmentsSnapshot(getAllAppointments());
  }, [activeTab, currentUser]);

  const now = Date.now();

  const relevantAppointments = useMemo(() => {
    if (!currentUser || currentUser.role !== 'barber') return [];

    const barberName = normalize(currentUser.name);
    const shopName = normalize(currentUser.shop.shopName);

    return appointmentsSnapshot
      .filter((appointment) => {
        const sameBarber = normalize(appointment.barberName) === barberName;
        const sameShop = normalize(appointment.shopName) === shopName;
        return sameBarber || sameShop;
      })
      .sort((a, b) => a.startAt - b.startAt);
  }, [appointmentsSnapshot, currentUser]);

  const bookingAppointments = useMemo(
    () =>
      relevantAppointments.filter(
        (appointment) => appointment.status === 'confirmed' && appointment.endAt >= now
      ),
    [now, relevantAppointments]
  );

  const historyAppointments = useMemo(
    () =>
      relevantAppointments.filter(
        (appointment) => appointment.status === 'cancelled' || appointment.endAt < now
      ),
    [now, relevantAppointments]
  );

  const scopedAppointments = activeTab === 'history' ? historyAppointments : bookingAppointments;

  const filteredAppointments = useMemo(() => {
    if (calendarFilter === 'all') return scopedAppointments;
    if (calendarFilter === 'cancelled') {
      return scopedAppointments.filter((appointment) => appointment.status === 'cancelled');
    }
    return scopedAppointments.filter((appointment) => appointment.status === 'confirmed');
  }, [calendarFilter, scopedAppointments]);

  const appointmentsByDay = useMemo(() => {
    const grouped = new Map<number, StoredAppointment[]>();

    filteredAppointments.forEach((appointment) => {
      const dayKey = dayKeyFromTs(appointment.startAt);
      const current = grouped.get(dayKey) ?? [];
      current.push(appointment);
      grouped.set(dayKey, current);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dayTs, items]) => ({
        key: `${dayTs}`,
        label: formatDateLabel(dayTs),
        items,
      }));
  }, [filteredAppointments]);

  const nextAppointment = bookingAppointments.find((appointment) => appointment.startAt >= now) ?? null;

  const todayConfirmedCount = useMemo(
    () =>
      relevantAppointments.filter(
        (appointment) => appointment.status === 'confirmed' && isSameDay(appointment.startAt, now)
      ).length,
    [now, relevantAppointments]
  );

  const cancelledCount = useMemo(
    () => relevantAppointments.filter((appointment) => appointment.status === 'cancelled').length,
    [relevantAppointments]
  );

  if (!currentUser || currentUser.role !== 'barber') return null;

  const handleLogout = () => {
    clearUser();
    router.replace('/login');
  };

  const handleCancelAppointment = (appointment: StoredAppointment) => {
    Alert.alert(
      'Annullare appuntamento?',
      `${appointment.clientName} - ${formatTimeRange(appointment)}`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Annulla',
          style: 'destructive',
          onPress: () => {
            updateAppointmentById(appointment.id, (current) => ({
              ...current,
              status: 'cancelled',
              cancelledReason: current.cancelledReason || 'Annullato dal barbiere',
            }));
            setAppointmentsSnapshot(getAllAppointments());
          },
        },
      ]
    );
  };

  const filters: { key: CalendarFilter; label: string }[] =
    activeTab === 'booking'
      ? [
          { key: 'all', label: 'Tutti' },
          { key: 'confirmed', label: 'Confermati' },
        ]
      : [
          { key: 'all', label: 'Tutti' },
          { key: 'confirmed', label: 'Completati' },
          { key: 'cancelled', label: 'Annullati' },
        ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>MyBarber</Text>
            <Text style={styles.subtitle}>Area Barbiere</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.9}>
            <Ionicons name="log-out-outline" size={15} color="#f3c4c4" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickTabsRow}>
          <TouchableOpacity
            style={[styles.quickTab, activeTab === 'booking' && styles.quickTabActive]}
            onPress={() => router.replace('/barber?activeTab=booking')}
            activeOpacity={0.9}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color={activeTab === 'booking' ? '#111111' : GOLD}
            />
            <Text style={[styles.quickTabText, activeTab === 'booking' && styles.quickTabTextActive]}>
              Agenda
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickTab, activeTab === 'history' && styles.quickTabActive]}
            onPress={() => router.replace('/barber?activeTab=history')}
            activeOpacity={0.9}>
            <Ionicons name="time-outline" size={15} color={activeTab === 'history' ? '#111111' : GOLD} />
            <Text style={[styles.quickTabText, activeTab === 'history' && styles.quickTabTextActive]}>
              Storico
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{currentUser.shop.shopName}</Text>
          <Text style={styles.heroSub}>
            {currentUser.name} - {currentUser.shop.shopCity}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Prossimo</Text>
              <Text style={styles.statValue}>
                {nextAppointment ? `${formatTime(nextAppointment.startAt)} ${nextAppointment.clientName}` : 'N/D'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Oggi</Text>
              <Text style={styles.statValue}>{todayConfirmedCount} confermati</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Annullati</Text>
              <Text style={styles.statValue}>{cancelledCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setCalendarFilter(filter.key)}
              style={[styles.filterChip, calendarFilter === filter.key && styles.filterChipActive]}
              activeOpacity={0.9}>
              <Text style={[styles.filterChipText, calendarFilter === filter.key && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {appointmentsByDay.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={20} color={MUTED} />
            <Text style={styles.emptyTitle}>Nessun appuntamento</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'booking'
                ? 'Non ci sono appuntamenti in agenda per i filtri selezionati.'
                : 'Nessun elemento nello storico per i filtri selezionati.'}
            </Text>
          </View>
        ) : (
          appointmentsByDay.map((dayGroup) => (
            <View key={dayGroup.key} style={styles.dayGroup}>
              <Text style={styles.dayTitle}>{dayGroup.label.toUpperCase()}</Text>

              <View style={styles.dayCards}>
                {dayGroup.items.map((appointment) => {
                  const statusTone = getStatusTone(appointment, now);
                  const isUpcomingConfirmed =
                    activeTab === 'booking' &&
                    appointment.status === 'confirmed' &&
                    appointment.startAt > now;

                  return (
                    <View key={appointment.id} style={styles.card}>
                      <View style={styles.cardTop}>
                        <Text style={styles.timeText}>{formatTimeRange(appointment)}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            statusTone === 'upcoming' && styles.statusPillUpcoming,
                            statusTone === 'past' && styles.statusPillPast,
                            statusTone === 'cancelled' && styles.statusPillCancelled,
                          ]}>
                          <Ionicons
                            name={
                              statusTone === 'cancelled'
                                ? 'close-circle-outline'
                                : statusTone === 'past'
                                ? 'checkmark-circle-outline'
                                : 'alert-circle-outline'
                            }
                            size={12}
                            color={
                              statusTone === 'cancelled'
                                ? '#efabab'
                                : statusTone === 'past'
                                ? '#c6c6c6'
                                : '#7dff9c'
                            }
                          />
                          <Text
                            style={[
                              styles.statusPillText,
                              statusTone === 'upcoming' && styles.statusPillTextUpcoming,
                              statusTone === 'past' && styles.statusPillTextPast,
                              statusTone === 'cancelled' && styles.statusPillTextCancelled,
                            ]}>
                            {getStatusLabel(appointment, now)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.serviceTitle}>{appointment.serviceName}</Text>

                      <View style={styles.metaStack}>
                        <View style={styles.metaRow}>
                          <Ionicons name="person-outline" size={14} color={GOLD} />
                          <Text style={styles.metaText}>Cliente: {appointment.clientName}</Text>
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="storefront-outline" size={14} color={GOLD} />
                          <Text style={styles.metaText}>Negozio: {appointment.shopName}</Text>
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="cash-outline" size={14} color={GOLD} />
                          <Text style={styles.metaText}>
                            {appointment.price} EUR - {appointment.durationMin} min
                          </Text>
                        </View>
                      </View>

                      {appointment.status === 'cancelled' && appointment.cancelledReason ? (
                        <Text style={styles.cancelReasonText}>Motivo: {appointment.cancelledReason}</Text>
                      ) : null}

                      {isUpcomingConfirmed ? (
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => handleCancelAppointment(appointment)}
                            activeOpacity={0.9}>
                            <Text style={styles.cancelButtonText}>Annulla appuntamento</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 140,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: GOLD,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: MUTED,
    marginTop: 2,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#553333',
    backgroundColor: '#251818',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: '#f3c4c4',
    fontWeight: '800',
    fontSize: 12,
  },
  quickTabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b3021',
    backgroundColor: '#19150f',
    paddingVertical: 10,
  },
  quickTabActive: {
    borderColor: GOLD,
    backgroundColor: GOLD,
  },
  quickTabText: {
    color: GOLD,
    fontWeight: '800',
  },
  quickTabTextActive: {
    color: '#111111',
  },
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    gap: 12,
  },
  heroTitle: {
    color: TXT,
    fontSize: 23,
    fontWeight: '900',
  },
  heroSub: {
    color: MUTED,
    fontWeight: '700',
    marginTop: -6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 9,
  },
  statLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  statValue: {
    color: TXT,
    fontSize: 12,
    fontWeight: '900',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    backgroundColor: '#151515',
  },
  filterChipActive: {
    borderColor: GOLD,
    backgroundColor: '#201a12',
  },
  filterChipText: {
    color: MUTED,
    fontWeight: '700',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: GOLD,
  },
  dayGroup: {
    gap: 8,
  },
  dayTitle: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dayCards: {
    gap: 10,
  },
  card: {
    backgroundColor: CARD2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 13,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusPillUpcoming: {
    backgroundColor: 'rgba(125,255,156,0.08)',
    borderColor: 'rgba(125,255,156,0.35)',
  },
  statusPillPast: {
    backgroundColor: 'rgba(181,181,181,0.1)',
    borderColor: 'rgba(181,181,181,0.25)',
  },
  statusPillCancelled: {
    backgroundColor: 'rgba(239,171,171,0.09)',
    borderColor: 'rgba(239,171,171,0.3)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPillTextUpcoming: {
    color: '#7dff9c',
  },
  statusPillTextPast: {
    color: '#c6c6c6',
  },
  statusPillTextCancelled: {
    color: '#efabab',
  },
  serviceTitle: {
    color: TXT,
    fontWeight: '900',
    fontSize: 17,
  },
  metaStack: {
    gap: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: '#d1d1d1',
    fontWeight: '700',
    flex: 1,
  },
  cancelReasonText: {
    color: '#d6a1a1',
    fontWeight: '700',
    marginTop: -2,
  },
  actionRow: {
    marginTop: 2,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#6f3434',
    backgroundColor: '#2a1818',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#f0b9b9',
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: TXT,
    fontWeight: '900',
    fontSize: 17,
  },
  emptyText: {
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
});
