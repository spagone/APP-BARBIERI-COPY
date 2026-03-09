import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomBar from '../components/BottomBar';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  clearUser,
  getUser,
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
} from './store/userStore';
import {
  addAppointment,
  getAllAppointments,
  getAppointmentsForClient,
  updateAppointmentById,
  type StoredAppointment,
} from './store/appointmentsStore';

type Barber = {
  id: string;
  shopId: string;
  name: string;
  rating: number;
  speciality: string;
};

type Shop = {
  id: string;
  name: string;
  city: string;
  address: string;
};

type Service = {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  icon: string;
};

type Appointment = StoredAppointment;
type CalendarFilter = 'all' | 'confirmed' | 'cancelled' | 'upcoming';

const SHOPS: Shop[] = [
  { id: 's1', name: 'Golden Cut Barber', city: 'Milano', address: 'Via Torino 18' },
  { id: 's2', name: 'North Fade Studio', city: 'Monza', address: 'Via Manzoni 44' },
  { id: 's3', name: 'Urban Beard House', city: 'Sesto San Giovanni', address: 'Viale Italia 102' },
];

const BARBERS: Barber[] = [
  { id: 'b1', shopId: 's1', name: 'Andrea', rating: 4.9, speciality: 'Fade / Modern' },
  { id: 'b2', shopId: 's1', name: 'Marco', rating: 4.8, speciality: 'Classico / Barba' },
  { id: 'b3', shopId: 's2', name: 'Luca', rating: 4.7, speciality: 'Skin Fade / Styling' },
  { id: 'b4', shopId: 's2', name: 'Samuele', rating: 4.8, speciality: 'Taglio classico' },
  { id: 'b5', shopId: 's3', name: 'Davide', rating: 4.9, speciality: 'Beard styling' },
];

const SERVICES: Service[] = [
  { id: 's1', name: 'Taglio Uomo', price: 15, durationMin: 30, icon: '\u2702\uFE0F' },
  { id: 's2', name: 'Barba', price: 10, durationMin: 20, icon: '\uD83E\uDDD4\u200D\u2642\uFE0F' },
  { id: 's3', name: 'Taglio + Barba', price: 22, durationMin: 45, icon: '\uD83D\uDC88' },
];
const CANCEL_REASONS = [
  'Imprevisto',
  'Cambio di programma',
  'Orario non piu comodo',
  'Ho trovato un altra data',
  'Altro',
];
const BOOKING_STEPS = ['Negozio', 'Barbiere', 'Servizio', 'Data', 'Orario'];
const CALENDAR_FILTERS: { key: CalendarFilter; label: string }[] = [
  { key: 'all', label: 'Tutti' },
  { key: 'upcoming', label: 'In arrivo' },
  { key: 'confirmed', label: 'Confermati' },
  { key: 'cancelled', label: 'Annullati' },
];

// Booking config
const SLOT_STEP_MIN = 30;
const OPEN_HOUR = 9;
const CLOSE_HOUR = 19;
const DAYS_AHEAD = 7;
const CANCEL_LIMIT_HOURS = 4;
const BOOKING_LOADING_MS = 3200;

// Colors
const GOLD = '#c59d5f';
const BG = '#0f0f0f';
const CARD = '#171717';
const CARD2 = '#1e1e1e';
const TXT = '#ffffff';
const MUTED = '#a8a8a8';

// Utils
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const addMinutes = (ts: number, minutes: number) => ts + minutes * 60_000;

const formatDateLabel = (ts: number) => {
  const d = new Date(ts);
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const weekday = d.toLocaleDateString('it-IT', { weekday: 'short' });
  return `${weekday.toUpperCase()} ${dd}/${mm}/${yyyy}`;
};

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

function makeDays(base: Date) {
  const days: { key: string; dateTsStart: number; label: string }[] = [];
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      key: `d${i}`,
      dateTsStart: d.getTime(),
      label: formatDateLabel(d.getTime()),
    });
  }
  return days;
}

function buildSlotsForDay(dayStartTs: number) {
  const slots: { startAt: number; label: string }[] = [];
  const start = new Date(dayStartTs);
  start.setHours(OPEN_HOUR, 0, 0, 0);
  const end = new Date(dayStartTs);
  end.setHours(CLOSE_HOUR, 0, 0, 0);

  let t = start.getTime();
  while (t < end.getTime()) {
    slots.push({ startAt: t, label: formatTime(t) });
    t = addMinutes(t, SLOT_STEP_MIN);
  }
  return slots;
}

function humanizeRemaining(ms: number) {
  if (ms <= 0) return '0 min';
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days} giorno/i e ${hours} ora/e`;
  if (totalHours > 0) return `${hours} ora/e e ${mins} min`;
  return `${mins} min`;
}

function humanizeMinutes(totalMinutes: number) {
  if (totalMinutes <= 0) return '0 min';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function Client() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openBooking?: string; activeTab?: string }>();
  const currentUser = getUser();
  const currentUserEmail = currentUser?.email ?? '';

  // Toggles
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showAppointments, setShowAppointments] = useState(true);

  // Selections
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [shopQuery, setShopQuery] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState<number | null>(null);

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>('all');
  const [activeCalendarDayKey, setActiveCalendarDayKey] = useState<string>('all');
  const [collapsedCalendarDays, setCollapsedCalendarDays] = useState<Record<string, boolean>>({});
  const calendarEntranceAnim = useRef(new Animated.Value(0)).current;

  // Booking UI states (loader + success)
  const [bookingState, setBookingState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [lastAppointment, setLastAppointment] = useState<Appointment | null>(null);
  const bookingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingPulseAnim = useRef(new Animated.Value(0)).current;
  const loadingTrimAnim = useRef(new Animated.Value(0)).current;
  const loadingBeamAnim = useRef(new Animated.Value(0)).current;
  const successTickPopAnim = useRef(new Animated.Value(0)).current;
  const successTickRingAnim = useRef(new Animated.Value(0)).current;
  const successTickGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (currentUser.role !== 'client') {
      router.replace('/barber?activeTab=booking');
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (params.openBooking === '1') {
      setShowNewBooking(true);
      setShowAppointments(false);
      return;
    }

    if (params.activeTab === 'history') {
      setShowNewBooking(false);
      setShowAppointments(true);
      return;
    }

    setShowAppointments(false);
  }, [params.activeTab, params.openBooking]);

  useEffect(
    () => () => {
      if (bookingTimerRef.current) clearTimeout(bookingTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (bookingState !== 'loading') return;

    const sceneLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(loadingPulseAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    const trimLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingTrimAnim, {
          toValue: 1,
          duration: 640,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(loadingTrimAnim, {
          toValue: 0,
          duration: 640,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const beamLoop = Animated.loop(
      Animated.timing(loadingBeamAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );

    sceneLoop.start();
    trimLoop.start();
    beamLoop.start();

    return () => {
      sceneLoop.stop();
      trimLoop.stop();
      beamLoop.stop();
      loadingPulseAnim.setValue(0);
      loadingTrimAnim.setValue(0);
      loadingBeamAnim.setValue(0);
    };
  }, [bookingState, loadingBeamAnim, loadingPulseAnim, loadingTrimAnim]);

  useEffect(() => {
    if (bookingState !== 'success') return;

    const popSequence = Animated.sequence([
      Animated.spring(successTickPopAnim, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(successTickPopAnim, {
        toValue: 0.92,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(successTickPopAnim, {
        toValue: 1,
        friction: 7,
        tension: 110,
        useNativeDriver: true,
      }),
    ]);

    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(successTickRingAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(successTickRingAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(successTickGlowAnim, {
          toValue: 1,
          duration: 680,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(successTickGlowAnim, {
          toValue: 0,
          duration: 680,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    popSequence.start();
    ringLoop.start();
    glowLoop.start();

    return () => {
      ringLoop.stop();
      glowLoop.stop();
      successTickPopAnim.setValue(0);
      successTickRingAnim.setValue(0);
      successTickGlowAnim.setValue(0);
    };
  }, [bookingState, successTickGlowAnim, successTickPopAnim, successTickRingAnim]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'client') return;
    setAppointments(getAppointmentsForClient(currentUser.email));
  }, [currentUser]);

  const handleLogout = () => {
    clearUser();
    router.replace('/login');
  };

  // Cancel flow
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelOtherText, setCancelOtherText] = useState<string>('');

  const days = useMemo(() => makeDays(new Date()), []);
  const selectedDay = useMemo(
    () => days.find((d) => d.key === selectedDayKey) || null,
    [days, selectedDayKey]
  );

  const selectedShop = useMemo(
    () => SHOPS.find((shop) => shop.id === selectedShopId) || null,
    [selectedShopId]
  );

  const filteredShops = useMemo(() => {
    const query = shopQuery.trim().toLowerCase();
    if (!query) return SHOPS;

    return SHOPS.filter((shop) => {
      const searchable = `${shop.name} ${shop.city} ${shop.address}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [shopQuery]);

  const barbersForSelectedShop = useMemo(() => {
    if (!selectedShopId) return [];
    return BARBERS.filter((barber) => barber.shopId === selectedShopId);
  }, [selectedShopId]);

  const selectedBarber = useMemo(
    () => BARBERS.find((b) => b.id === selectedBarberId) || null,
    [selectedBarberId]
  );

  const selectedService = useMemo(
    () => SERVICES.find((s) => s.id === selectedServiceId) || null,
    [selectedServiceId]
  );

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return buildSlotsForDay(selectedDay.dateTsStart);
  }, [selectedDay]);

  const isSlotOccupied = (barberId: string, slotStartAt: number, durationMin: number) => {
    const slotEndAt = addMinutes(slotStartAt, durationMin);
    return getAllAppointments().some((a) => {
      if (a.status !== 'confirmed') return false;
      if (a.barberId !== barberId) return false;
      return slotStartAt < a.endAt && slotEndAt > a.startAt;
    });
  };

  const canConfirm =
    !!selectedShop && !!selectedBarber && !!selectedService && !!selectedDay && !!selectedSlotStartAt;

  const currentStep = !selectedShop
    ? 1
    : !selectedBarber
    ? 2
    : !selectedService
    ? 3
    : !selectedDay
    ? 4
    : 5;

  const resetBookingSelections = () => {
    setSelectedShopId(null);
    setShopQuery('');
    setSelectedBarberId(null);
    setSelectedServiceId(null);
    setSelectedDayKey(null);
    setSelectedSlotStartAt(null);
  };

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.status === 'confirmed' && a.startAt >= Date.now())
        .sort((a, b) => a.startAt - b.startAt),
    [appointments]
  );

  const nextAppointment = upcomingAppointments[0] || null;
  const confirmedMinutesBooked = useMemo(
    () =>
      appointments
        .filter((a) => a.status === 'confirmed')
        .reduce((sum, appointment) => sum + appointment.durationMin, 0),
    [appointments]
  );
  const cancelledCount = useMemo(
    () => appointments.filter((a) => a.status === 'cancelled').length,
    [appointments]
  );
  const filteredCalendarAppointments = useMemo(() => {
    if (calendarFilter === 'all') return appointments;
    if (calendarFilter === 'confirmed') return appointments.filter((a) => a.status === 'confirmed');
    if (calendarFilter === 'cancelled') return appointments.filter((a) => a.status === 'cancelled');
    return appointments.filter((a) => a.status === 'confirmed' && a.startAt >= Date.now());
  }, [appointments, calendarFilter]);
  const calendarAppointmentsByDay = useMemo(() => {
    const ordered = [...filteredCalendarAppointments].sort((a, b) => a.startAt - b.startAt);
    const groups = new Map<number, Appointment[]>();

    ordered.forEach((appointment) => {
      const dayStart = new Date(appointment.startAt);
      dayStart.setHours(0, 0, 0, 0);
      const key = dayStart.getTime();
      const current = groups.get(key) ?? [];
      current.push(appointment);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dayStart, items]) => ({
        key: `${dayStart}`,
        label: formatDateLabel(dayStart),
        items,
      }));
  }, [filteredCalendarAppointments]);
  const visibleAppointmentsByDay = useMemo(
    () =>
      activeCalendarDayKey === 'all'
        ? calendarAppointmentsByDay
        : calendarAppointmentsByDay.filter((group) => group.key === activeCalendarDayKey),
    [activeCalendarDayKey, calendarAppointmentsByDay]
  );
  const calendarDayTabs = useMemo(
    () => [{ key: 'all', label: 'Tutti' }, ...calendarAppointmentsByDay.map(({ key, label }) => ({ key, label }))],
    [calendarAppointmentsByDay]
  );
  const hasCalendarMatches = visibleAppointmentsByDay.length > 0;

  useEffect(() => {
    if (!showAppointments || bookingState !== 'idle') return;

    calendarEntranceAnim.setValue(0);
    Animated.timing(calendarEntranceAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [
    activeCalendarDayKey,
    bookingState,
    calendarEntranceAnim,
    calendarFilter,
    showAppointments,
    filteredCalendarAppointments.length,
  ]);

  useEffect(() => {
    if (activeCalendarDayKey === 'all') return;
    if (calendarAppointmentsByDay.some((group) => group.key === activeCalendarDayKey)) return;
    setActiveCalendarDayKey('all');
  }, [activeCalendarDayKey, calendarAppointmentsByDay]);

  useEffect(() => {
    setCollapsedCalendarDays((prev) => {
      const next: Record<string, boolean> = {};
      visibleAppointmentsByDay.forEach((group) => {
        next[group.key] = prev[group.key] ?? false;
      });
      return next;
    });
  }, [visibleAppointmentsByDay]);

  const openBookingFlow = (shopId?: string) => {
    setShowAppointments(false);
    setShowNewBooking(true);

    if (!shopId) return;

    setSelectedShopId(shopId);
    setShopQuery('');
    setSelectedBarberId(null);
    setSelectedServiceId(null);
    setSelectedDayKey(null);
    setSelectedSlotStartAt(null);
  };

  const openCalendarView = () => {
    setShowNewBooking(false);
    setShowAppointments(true);
  };

  const generateBookingId = () => `MB-${Math.floor(1000 + Math.random() * 9000)}`;

  const confirmBooking = () => {
    if (!currentUser || currentUser.role !== 'client') return;

    if (!selectedShop || !selectedBarber || !selectedService || !selectedDay || !selectedSlotStartAt) {
      Alert.alert('Completa la prenotazione', 'Seleziona negozio, barbiere, servizio, data e orario.');
      return;
    }

    const occupied = isSlotOccupied(selectedBarber.id, selectedSlotStartAt, selectedService.durationMin);
    if (occupied) {
      Alert.alert('Orario non disponibile', 'Questo slot e gia prenotato. Scegli un altro orario.');
      return;
    }

    const startAt = selectedSlotStartAt;
    const endAt = addMinutes(startAt, selectedService.durationMin);

    const newAppointment: Appointment = {
      id: generateBookingId(),
      shopId: selectedShop.id,
      shopName: selectedShop.name,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      durationMin: selectedService.durationMin,
      startAt,
      endAt,
      status: 'confirmed',
      createdAt: Date.now(),
      clientEmail: currentUser.email,
      clientName: currentUser.name,
    };

    // Loader booking
    setBookingState('loading');

    if (bookingTimerRef.current) clearTimeout(bookingTimerRef.current);
    bookingTimerRef.current = setTimeout(() => {
      addAppointment(newAppointment);
      setAppointments(getAppointmentsForClient(currentUser.email));
      setLastAppointment(newAppointment);
      setBookingState('success');

      void sendBookingConfirmationEmail({
        bookingId: newAppointment.id,
        shopName: newAppointment.shopName,
        shopAddress: selectedShop.address,
        shopCity: selectedShop.city,
        barberName: newAppointment.barberName,
        serviceName: newAppointment.serviceName,
        startAt: newAppointment.startAt,
        endAt: newAppointment.endAt,
        durationMin: newAppointment.durationMin,
        price: newAppointment.price,
      });

      setShowNewBooking(false);
      setShowAppointments(true);
      resetBookingSelections();
    }, BOOKING_LOADING_MS);
  };
  const backToClientArea = () => {
    setBookingState('idle');
    setLastAppointment(null);
    setShowNewBooking(false);
    setShowAppointments(false);
  };

  const openCancelModal = (appointmentId: string) => {
    setCancelTargetId(appointmentId);
    setCancelReason('');
    setCancelOtherText('');
    setCancelModalVisible(true);
  };

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setCancelTargetId(null);
    setCancelReason('');
    setCancelOtherText('');
  };

  const cancelAppointment = () => {
    if (!currentUserEmail) return;
    if (!cancelTargetId) return;
    const target = appointments.find((a) => a.id === cancelTargetId);
    if (!target) return;

    const now = Date.now();
    const msToStart = target.startAt - now;
    const limitMs = CANCEL_LIMIT_HOURS * 3_600_000;

    if (msToStart <= limitMs) {
      Alert.alert(
        'Annullamento non disponibile',
        `Puoi annullare solo fino a ${CANCEL_LIMIT_HOURS} ore prima dell'appuntamento.`
      );
      return;
    }

    if (!cancelReason) {
      Alert.alert('Seleziona una motivazione', "Scegli un motivo per l'annullamento.");
      return;
    }

    const finalReason = cancelReason === 'Altro' ? cancelOtherText.trim() : cancelReason;

    if (cancelReason === 'Altro' && finalReason.length < 3) {
      Alert.alert('Motivazione troppo breve', 'Scrivi una motivazione (almeno 3 caratteri).');
      return;
    }

    updateAppointmentById(cancelTargetId, (appointment) =>
      appointment.clientEmail === currentUserEmail
        ? { ...appointment, status: 'cancelled', cancelledReason: finalReason }
        : appointment
    );
    setAppointments(getAppointmentsForClient(currentUserEmail));
    const cancelledShop = SHOPS.find((shop) => shop.id === target.shopId);

    void sendBookingCancellationEmail({
      bookingId: target.id,
      shopName: target.shopName,
      shopAddress: cancelledShop?.address,
      shopCity: cancelledShop?.city,
      barberName: target.barberName,
      serviceName: target.serviceName,
      startAt: target.startAt,
      endAt: target.endAt,
      durationMin: target.durationMin,
      price: target.price,
      cancelledReason: finalReason,
      cancelledAt: Date.now(),
    });

    closeCancelModal();

    Alert.alert(
      'Prenotazione annullata',
      'Grazie. Cosi dai la possibilita a un altra persona di prenotare.'
    );
  };
  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
      activeOpacity={0.9}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const calendarHeaderTranslateY = calendarEntranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const calendarHeaderScale = calendarEntranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const toggleCalendarDayCollapse = (dayKey: string) => {
    setCollapsedCalendarDays((prev) => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }));
  };
  const getCalendarCardEnterStyle = (order: number) => {
    const staggerStart = Math.min(order * 0.08, 0.72);
    const staggerEnd = Math.min(staggerStart + 0.24, 1);

    return {
      opacity: calendarEntranceAnim.interpolate({
        inputRange: [staggerStart, staggerEnd],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          translateY: calendarEntranceAnim.interpolate({
            inputRange: [staggerStart, staggerEnd],
            outputRange: [18, 0],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  };

  const renderAppointmentCard = (a: Appointment, order: number) => {
    const now = Date.now();
    const msToStart = a.startAt - now;
    const limitMs = CANCEL_LIMIT_HOURS * 3_600_000;

    const isCancelled = a.status === 'cancelled';
    const isPast = !isCancelled && a.endAt < now;
    const canCancel = a.status === 'confirmed' && msToStart > limitMs;
    const remainingToCancel = msToStart - limitMs;
    const statusColor = isCancelled ? '#efabab' : isPast ? '#c6c6c6' : '#7DFF9C';

    const countdownText =
      a.status === 'confirmed'
        ? msToStart > 0
          ? `Hai ancora ${humanizeRemaining(remainingToCancel)} per annullare`
          : 'Appuntamento passato'
        : 'Prenotazione annullata';

    return (
      <Animated.View key={a.id} style={getCalendarCardEnterStyle(order)}>
        <View style={[styles.apCard, isCancelled && styles.apCardCancelled]}>
          <View
            style={[
              styles.apTimelineRail,
              isCancelled && styles.apTimelineRailCancelled,
              isPast && styles.apTimelineRailPast,
            ]}
          />

          <View style={styles.apCardContent}>
            <View style={styles.apTopRow}>
              <View
                style={[
                  styles.apStatusBadge,
                  isCancelled
                    ? styles.apStatusBadgeCancelled
                    : isPast
                    ? styles.apStatusBadgePast
                    : styles.apStatusBadgeConfirmed,
                ]}
              >
                <Ionicons
                  name={isCancelled ? 'close-circle' : isPast ? 'time-outline' : 'checkmark-circle'}
                  size={13}
                  color={statusColor}
                />
                <Text style={[styles.apStatusText, { color: statusColor }]}>
                  {isCancelled ? 'Annullata' : isPast ? 'Passata' : 'Confermata'}
                </Text>
              </View>

              <View style={styles.apPricePill}>
                <Text style={styles.apPricePillText}>
                  {a.price}
                  {'\u20AC'}
                </Text>
              </View>
            </View>

            <Text style={styles.apTitle}>{a.serviceName}</Text>

            <View style={styles.apMetaStack}>
              <View style={styles.apMetaRow}>
                <Ionicons name="storefront-outline" size={14} color={GOLD} />
                <Text style={styles.apMeta}>{a.shopName}</Text>
              </View>
              <View style={styles.apMetaRow}>
                <Ionicons name="person-outline" size={14} color={GOLD} />
                <Text style={styles.apMeta}>{a.barberName}</Text>
              </View>
              <View style={styles.apMetaRow}>
                <Ionicons name="calendar-outline" size={14} color={GOLD} />
                <Text style={styles.apMeta}>
                  {formatDateLabel(a.startAt)} \u2022 {formatTime(a.startAt)}-{formatTime(a.endAt)}
                </Text>
              </View>
            </View>

            <View style={styles.apDivider} />

            <Text style={styles.manageTitle}>Gestisci prenotazione</Text>
            <Text style={styles.manageHint}>{countdownText}</Text>

            {isCancelled && a.cancelledReason ? (
              <Text style={styles.cancelReasonText}>Motivo: {a.cancelledReason}</Text>
            ) : null}

            <View style={styles.manageActions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.manageBtn, !canCancel && styles.btnDisabled]}
                disabled={!canCancel}
                onPress={() => openCancelModal(a.id)}
                activeOpacity={0.9}
              >
                <Text style={[styles.secondaryBtnText, !canCancel && styles.btnDisabledText]}>
                  Annulla prenotazione
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.badgesRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>ID Prenotazione</Text>
                <Text style={styles.badgeValue}>{a.id}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>Durata</Text>
                <Text style={styles.badgeValue}>{a.durationMin} min</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };
  if (!currentUser || currentUser.role !== 'client') {
    return null;
  }

  // ====== Booking LOADER / SUCCESS screens ======
  if (bookingState === 'loading') {
    const loadingWhen =
      selectedDay && selectedSlotStartAt
        ? `${selectedDay.label} - ${formatTime(selectedSlotStartAt)}`
        : 'Data e orario in conferma';
    const clipperTranslateX = loadingPulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-16, 18],
    });
    const clipperTranslateY = loadingPulseAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [8, -10, 8],
    });
    const clipperRotate = loadingPulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['-22deg', '10deg'],
    });
    const beardOpacity = loadingTrimAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.55],
    });
    const beardScaleX = loadingTrimAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.82],
    });
    const beamTranslateX = loadingBeamAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-170, 170],
    });

    return (
      <View style={styles.loadingWrap}>
        <View style={styles.loadingGlowTop} />
        <View style={styles.loadingGlowBottom} />

        <View style={styles.loadingContent}>
          <View style={styles.loadingBadge}>
            <Ionicons name="sparkles" size={14} color={GOLD} />
            <Text style={styles.loadingBadgeText}>Prenotazione in corso</Text>
          </View>

          <View style={styles.loadingCartoonWrap}>
            <View style={styles.loadingSceneCard}>
              <View style={styles.loadingSceneFloor} />

              <View style={styles.loadingBarber}>
                <View style={styles.loadingBarberHair} />
                <View style={styles.loadingBarberHead} />
                <View style={styles.loadingBarberBody} />
              </View>

              <View style={styles.loadingClient}>
                <View style={styles.loadingClientHead}>
                  <View style={styles.loadingClientHair} />
                  <Animated.View
                    style={[
                      styles.loadingClientBeard,
                      {
                        opacity: beardOpacity,
                        transform: [{ scaleX: beardScaleX }],
                      },
                    ]}
                  />
                </View>
                <View style={styles.loadingClientBody} />
              </View>

              <View style={styles.loadingChair} />

              <Animated.View
                style={[
                  styles.loadingClipper,
                  {
                    transform: [
                      { translateX: clipperTranslateX },
                      { translateY: clipperTranslateY },
                      { rotate: clipperRotate },
                    ],
                  },
                ]}
              >
                <Ionicons name="cut-outline" size={14} color="#121212" />
              </Animated.View>
            </View>
          </View>

          <Text style={styles.loadingTitle}>Stiamo bloccando il tuo orario</Text>
          <Text style={styles.loadingSub}>
            Verifichiamo disponibilita e confermiamo il tuo slot in pochi secondi.
          </Text>

          <View style={styles.loadingCard}>
            <View style={styles.loadingTopRow}>
              <ActivityIndicator size="large" color={GOLD} />
              <View style={styles.loadingTopTextWrap}>
                <Text style={styles.loadingCardTitle}>Conferma in arrivo</Text>
                <Text style={styles.loadingCardSub}>Non chiudere la schermata durante il check.</Text>
              </View>
            </View>

            <View style={styles.loadingProgressTrack}>
              <Animated.View
                style={[
                  styles.loadingProgressBeam,
                  {
                    transform: [{ translateX: beamTranslateX }],
                  },
                ]}
              />
            </View>

            <View style={styles.loadingDivider} />

            <View style={styles.loadingSummaryRow}>
              <Ionicons name="storefront-outline" size={16} color={GOLD} />
              <Text style={styles.loadingSummaryText}>{selectedShop?.name ?? 'Negozio selezionato'}</Text>
            </View>
            <View style={styles.loadingSummaryRow}>
              <Ionicons name="person-outline" size={16} color={GOLD} />
              <Text style={styles.loadingSummaryText}>{selectedBarber?.name ?? 'Barbiere selezionato'}</Text>
            </View>
            <View style={styles.loadingSummaryRow}>
              <Ionicons name="cut-outline" size={16} color={GOLD} />
              <Text style={styles.loadingSummaryText}>{selectedService?.name ?? 'Servizio selezionato'}</Text>
            </View>
            <View style={styles.loadingSummaryRow}>
              <Ionicons name="calendar-outline" size={16} color={GOLD} />
              <Text style={styles.loadingSummaryText}>{loadingWhen}</Text>
            </View>
          </View>

          <Text style={styles.loadingHint}>Di solito richiede meno di 2 secondi.</Text>
        </View>

        <BottomBar />
      </View>
    );
  }

  if (bookingState === 'success' && lastAppointment) {
    const successDate = formatDateLabel(lastAppointment.startAt);
    const successTime = `${formatTime(lastAppointment.startAt)} - ${formatTime(lastAppointment.endAt)}`;
    const successPrice = `${lastAppointment.price} EUR`;
    const successTickScale = successTickPopAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    });
    const successTickRotate = successTickPopAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['-18deg', '0deg'],
    });
    const successTickRingScale = successTickRingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1.5],
    });
    const successTickRingOpacity = successTickRingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 0],
    });
    const successTickGlowOpacity = successTickGlowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.26, 0.8],
    });
    const successTickGlowScale = successTickGlowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.12],
    });

    return (
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>MyBarber</Text>
            <Text style={styles.brandSub}>Area Cliente</Text>
          </View>

          <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logout}>Logout</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.successScrollContent}>
          <View style={styles.successGlowTop} />
          <View style={styles.successGlowBottom} />

          <View style={styles.successHero}>
            <View style={styles.successHeroBadge}>
              <Ionicons name="checkmark-circle" size={17} color={GOLD} />
              <Text style={styles.successHeroBadgeText}>Confermata</Text>
            </View>
            <View style={styles.successTickStage}>
              <Animated.View
                style={[
                  styles.successTickGlow,
                  {
                    opacity: successTickGlowOpacity,
                    transform: [{ scale: successTickGlowScale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.successTickRing,
                  {
                    opacity: successTickRingOpacity,
                    transform: [{ scale: successTickRingScale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.successTickCore,
                  {
                    transform: [{ scale: successTickScale }, { rotate: successTickRotate }],
                  },
                ]}
              >
                <Ionicons name="checkmark" size={34} color="#101010" />
              </Animated.View>
            </View>
            <View style={styles.successLiveRow}>
              <View style={styles.successLiveDot} />
              <Text style={styles.successLiveText}>Confermata live</Text>
            </View>
            <Text style={styles.successHeroTitle}>Prenotazione completata</Text>
            <Text style={styles.successHeroSub}>Perfetto, il tuo slot e stato riservato.</Text>
          </View>

          <View style={styles.successCard}>
            <View style={styles.successWelcomeRow}>
              <Ionicons name="person-circle-outline" size={20} color={GOLD} />
              <Text style={styles.successWelcomeText}>Ti aspettiamo, {currentUser.name}</Text>
            </View>

            <View style={styles.bookingIdBox}>
              <Text style={styles.bookingIdLabel}>ID Prenotazione</Text>
              <Text style={styles.bookingIdValue}>{lastAppointment.id}</Text>
            </View>

            <View style={styles.successMetaRow}>
              <View style={styles.successMetaCard}>
                <Text style={styles.successMetaLabel}>Data</Text>
                <Text style={styles.successMetaValue}>{successDate}</Text>
              </View>
              <View style={styles.successMetaCard}>
                <Text style={styles.successMetaLabel}>Orario</Text>
                <Text style={styles.successMetaValue}>{successTime}</Text>
              </View>
            </View>

            <View style={styles.successSummary}>
              <View style={styles.successSummaryRow}>
                <View style={styles.successSummaryLeft}>
                  <Ionicons name="storefront-outline" size={16} color={GOLD} />
                  <Text style={styles.successSummaryLabel}>Negozio</Text>
                </View>
                <Text style={styles.successSummaryValue}>{lastAppointment.shopName}</Text>
              </View>
              <View style={styles.successSummaryRow}>
                <View style={styles.successSummaryLeft}>
                  <Ionicons name="person-outline" size={16} color={GOLD} />
                  <Text style={styles.successSummaryLabel}>Barbiere</Text>
                </View>
                <Text style={styles.successSummaryValue}>{lastAppointment.barberName}</Text>
              </View>
              <View style={styles.successSummaryRow}>
                <View style={styles.successSummaryLeft}>
                  <Ionicons name="cut-outline" size={16} color={GOLD} />
                  <Text style={styles.successSummaryLabel}>Servizio</Text>
                </View>
                <Text style={styles.successSummaryValue}>{lastAppointment.serviceName}</Text>
              </View>
              <View style={styles.successSummaryRow}>
                <View style={styles.successSummaryLeft}>
                  <Ionicons name="calendar-outline" size={16} color={GOLD} />
                  <Text style={styles.successSummaryLabel}>Quando</Text>
                </View>
                <Text style={styles.successSummaryValue}>
                  {successDate} - {formatTime(lastAppointment.startAt)}
                </Text>
              </View>
              <View style={[styles.successSummaryRow, styles.successSummaryRowLast]}>
                <View style={styles.successSummaryLeft}>
                  <Ionicons name="cash-outline" size={16} color={GOLD} />
                  <Text style={styles.successSummaryLabel}>Prezzo</Text>
                </View>
                <Text style={styles.successSummaryValue}>{successPrice}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, styles.successPrimaryBtn]}
              onPress={() => {
                setBookingState('idle');
                setLastAppointment(null);
                setShowNewBooking(false);
                setShowAppointments(true);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnText}>Apri calendario</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, styles.successSecondaryBtn]}
              onPress={() => {
                setBookingState('idle');
                setLastAppointment(null);
                setShowNewBooking(true);
                setShowAppointments(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryBtnText}>Nuova prenotazione</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={backToClientArea} activeOpacity={0.8} style={styles.successBackAction}>
              <Text style={styles.resetText}>Torna all&apos;area cliente</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <BottomBar />
      </View>
    );
  }

  // ====== Normal client screen ======
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>MyBarber</Text>
          <Text style={styles.brandSub}>Area Cliente</Text>
        </View>

        <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroText}>
            Scegli prima il negozio, poi barbiere, servizio e orario.
          </Text>
        </View>

        {!showAppointments && (
          <>
            <View style={styles.heroPowerPanel}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Booking Lounge</Text>
              </View>

              <Text style={styles.heroPowerTitle}>Home Prenotazioni Premium</Text>
              <Text style={styles.heroPowerText}>
                Cerca il negozio giusto, scegli il barbiere e conferma lo slot migliore in pochi tap.
              </Text>

              {nextAppointment ? (
                <View style={styles.nextCard}>
                  <Text style={styles.nextCardLabel}>Prossimo appuntamento</Text>
                  <Text style={styles.nextCardTitle}>{nextAppointment.serviceName}</Text>
                  <Text style={styles.nextCardMeta}>
                    {nextAppointment.shopName} - {nextAppointment.barberName}
                  </Text>
                  <Text style={styles.nextCardDate}>
                    {formatDateLabel(nextAppointment.startAt)} - {formatTime(nextAppointment.startAt)}
                  </Text>
                </View>
              ) : (
                <View style={styles.nextCard}>
                  <Text style={styles.nextCardLabel}>Ancora nessun appuntamento confermato</Text>
                  <Text style={styles.nextCardMeta}>
                    Avvia ora una nuova prenotazione per bloccare il tuo orario.
                  </Text>
                </View>
              )}

              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.heroPrimaryBtn} onPress={() => openBookingFlow()} activeOpacity={0.9}>
                  <Text style={styles.heroPrimaryBtnText}>Inizia prenotazione</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroSecondaryBtn} onPress={openCalendarView} activeOpacity={0.9}>
                  <Text style={styles.heroSecondaryBtnText}>Apri calendario</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.powerStatsRow}>
              <View style={styles.powerStatCard}>
                <Text style={styles.powerStatValue}>{SHOPS.length}</Text>
                <Text style={styles.powerStatLabel}>Negozi attivi</Text>
              </View>
              <View style={styles.powerStatCard}>
                <Text style={styles.powerStatValue}>{BARBERS.length}</Text>
                <Text style={styles.powerStatLabel}>Barbieri online</Text>
              </View>
              <View style={styles.powerStatCard}>
                <Text style={styles.powerStatValue}>{upcomingAppointments.length}</Text>
                <Text style={styles.powerStatLabel}>Slot confermati</Text>
              </View>
            </View>

            <View style={styles.spotlightCard}>
              <View style={styles.spotlightHeader}>
                <Text style={styles.spotlightTitle}>Negozi in evidenza</Text>
                <Text style={styles.spotlightSub}>Tocca un negozio e parti subito con il booking.</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={styles.spotlightRow}>
                  {SHOPS.map((shop) => {
                    const active = shop.id === selectedShopId;

                    return (
                      <TouchableOpacity
                        key={shop.id}
                        style={[styles.spotlightShopCard, active && styles.spotlightShopCardActive]}
                        onPress={() => openBookingFlow(shop.id)}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.spotlightShopTitle}>{shop.name}</Text>
                        <Text style={styles.spotlightShopMeta}>{shop.city}</Text>
                        <Text style={styles.spotlightShopAddress}>{shop.address}</Text>
                        <Text style={styles.spotlightShopCta}>Prenota qui</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* TOGGLE: NUOVA PRENOTAZIONE */}
            <TouchableOpacity
              style={[styles.sectionToggle, showNewBooking && styles.sectionToggleActive]}
              onPress={() => setShowNewBooking((v) => !v)}
              activeOpacity={0.9}
            >
              <View style={styles.sectionToggleHead}>
                <Text style={styles.sectionToggleEyebrow}>Percorso guidato</Text>
                <Text style={styles.sectionToggleText}>Nuova prenotazione</Text>
              </View>
              <Ionicons
                name={showNewBooking ? 'chevron-down' : 'chevron-forward'}
                size={18}
                color={MUTED}
                style={styles.sectionToggleArrow}
              />
            </TouchableOpacity>

            {showNewBooking && (
          <View style={styles.sectionCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingHeaderTitle}>Percorso Prenotazione</Text>
              <Text style={styles.bookingHeaderSub}>Step {currentStep} di 5</Text>
            </View>

            <View style={styles.stepsTrack}>
              {BOOKING_STEPS.map((label, index) => {
                const stepNumber = index + 1;
                const isCompleted = currentStep > stepNumber || (stepNumber === 5 && !!selectedSlotStartAt);
                const isActive = currentStep === stepNumber;

                return (
                  <View key={label} style={styles.stepTrackItem}>
                    <View
                      style={[
                        styles.stepTrackDot,
                        isCompleted && styles.stepTrackDotCompleted,
                        isActive && styles.stepTrackDotActive,
                      ]}>
                      <Text style={[styles.stepTrackDotText, isCompleted && styles.stepTrackDotTextCompleted]}>
                        {isCompleted ? '\u2713' : stepNumber}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stepTrackLabel,
                        isCompleted && styles.stepTrackLabelCompleted,
                        isActive && styles.stepTrackLabelActive,
                      ]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {(selectedShop || selectedBarber || selectedService || selectedDay || selectedSlotStartAt) && (
              <View style={styles.quickSummaryRow}>
                {selectedShop ? (
                  <View style={styles.quickPill}>
                    <Text style={styles.quickPillText}>Negozio: {selectedShop.name}</Text>
                  </View>
                ) : null}
                {selectedBarber ? (
                  <View style={styles.quickPill}>
                    <Text style={styles.quickPillText}>Barbiere: {selectedBarber.name}</Text>
                  </View>
                ) : null}
                {selectedService ? (
                  <View style={styles.quickPill}>
                    <Text style={styles.quickPillText}>Servizio: {selectedService.name}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Step 1: NEGOZIO */}
            <Text style={styles.stepTitle}>1) Cerca e scegli il negozio</Text>
            <View style={styles.searchWrap}>
              <TextInput
                value={shopQuery}
                onChangeText={setShopQuery}
                placeholder="Cerca per nome, citta o indirizzo"
                placeholderTextColor="#7b7b7b"
                style={styles.searchInput}
              />
            </View>
            <View style={styles.grid2}>
              {filteredShops.map((shop) => {
                const active = shop.id === selectedShopId;
                return (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.choiceCard, styles.choiceCardFull, active && styles.choiceCardActive]}
                    onPress={() => {
                      setSelectedShopId(shop.id);
                      setSelectedBarberId(null);
                      setSelectedServiceId(null);
                      setSelectedDayKey(null);
                      setSelectedSlotStartAt(null);
                    }}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.choiceTitle}>{shop.name}</Text>
                    <Text style={styles.choiceSub}>
                      {shop.city} - {shop.address}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {filteredShops.length === 0 ? (
              <Text style={styles.emptySearchText}>Nessun negozio trovato con questa ricerca.</Text>
            ) : null}

            {!selectedShop ? (
              <Text style={styles.helper}>Seleziona un negozio per continuare con la prenotazione.</Text>
            ) : null}

            {selectedShop ? (
              <>
            {/* Step 2: BARBIERE */}
            <Text style={styles.stepTitle}>2) Seleziona il barbiere</Text>
            <View style={styles.grid2}>
              {barbersForSelectedShop.map((b) => {
                const active = b.id === selectedBarberId;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.choiceCard, active && styles.choiceCardActive]}
                    onPress={() => {
                      setSelectedBarberId(b.id);
                      setSelectedServiceId(null);
                      setSelectedDayKey(null);
                      setSelectedSlotStartAt(null);
                    }}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.choiceTitle}>{b.name}</Text>
                    <Text style={styles.choiceSub}>
                      {'\u2B50'} {b.rating} {'\u2022'} {b.speciality}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {barbersForSelectedShop.length === 0 ? (
              <Text style={styles.helper}>Nessun barbiere disponibile in questo negozio.</Text>
            ) : null}

            {selectedBarber ? (
              <>
            {/* Step 3: SERVIZIO */}
            <Text style={[styles.stepTitle, { marginTop: 16 }]}>3) Scegli il servizio</Text>
            <View style={styles.grid2}>
              {SERVICES.map((s) => {
                const active = s.id === selectedServiceId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.choiceCard, active && styles.choiceCardActive]}
                    onPress={() => {
                      setSelectedServiceId(s.id);
                      setSelectedDayKey(null);
                      setSelectedSlotStartAt(null);
                    }}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.choiceTitle}>
                      {s.icon} {s.name}
                    </Text>
                    <Text style={styles.choiceSub}>
                      {s.price}
                      {'\u20AC'} {'\u2022'} {s.durationMin} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedService ? (
              <>
            {/* Step 4: DATA */}
            <Text style={[styles.stepTitle, { marginTop: 16 }]}>4) Scegli la data</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10, paddingRight: 8 }}>
                {days.map((d) => (
                  <View key={d.key}>
                    {renderChip(d.label, d.key === selectedDayKey, () => {
                      setSelectedDayKey(d.key);
                      setSelectedSlotStartAt(null);
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>

            {selectedDay ? (
              <>
            {/* Step 5: ORARIO */}
            <Text style={[styles.stepTitle, { marginTop: 16 }]}>5) Seleziona l&apos;orario</Text>

            <View style={styles.slotsGrid}>
              {slotsForSelectedDay.map((slot) => {
                const occupied = isSlotOccupied(
                  selectedBarber.id,
                  slot.startAt,
                  selectedService.durationMin
                );
                const active = selectedSlotStartAt === slot.startAt;

                return (
                  <TouchableOpacity
                    key={slot.startAt}
                    style={[
                      styles.slot,
                      active && styles.slotActive,
                      occupied && styles.slotDisabled,
                    ]}
                    disabled={occupied}
                    onPress={() => setSelectedSlotStartAt(slot.startAt)}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        active && styles.slotTextActive,
                        occupied && styles.slotTextDisabled,
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* RIEPILOGO + CONFERMA */}
            {selectedSlotStartAt ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Riepilogo</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Negozio</Text>
                  <Text style={styles.summaryValue}>{selectedShop.name}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Barbiere</Text>
                  <Text style={styles.summaryValue}>{selectedBarber.name}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Servizio</Text>
                  <Text style={styles.summaryValue}>{selectedService.name}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Quando</Text>
                  <Text style={styles.summaryValue}>
                    {`${selectedDay.label} - ${formatTime(selectedSlotStartAt)}-${formatTime(
                      addMinutes(selectedSlotStartAt, selectedService.durationMin)
                    )}`}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Totale</Text>
                  <Text style={styles.summaryValue}>
                    {selectedService.price}
                    {'\u20AC'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, !canConfirm && styles.btnDisabled]}
                  disabled={!canConfirm}
                  onPress={confirmBooking}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.primaryBtnText, !canConfirm && styles.btnDisabledText]}>
                    Prenota
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    resetBookingSelections();
                  }}
                  activeOpacity={0.8}
                  style={{ marginTop: 10 }}
                >
                  <Text style={styles.resetText}>Reset selezioni</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.helper}>Seleziona un orario per vedere il riepilogo.</Text>
            )}
              </>
            ) : null}
              </>
            ) : null}
              </>
            ) : null}
              </>
            ) : null}
          </View>
            )}
          </>
        )}

        {showAppointments && (
          <View style={styles.calendarSection}>
            <View style={styles.calendarGlowTop} />
            <View style={styles.calendarGlowBottom} />

            <Animated.View
              style={[
                styles.calendarAnimatedBlock,
                {
                  opacity: calendarEntranceAnim,
                  transform: [{ translateY: calendarHeaderTranslateY }, { scale: calendarHeaderScale }],
                },
              ]}
            >
              <View style={styles.calendarHeaderRow}>
                <View style={styles.calendarHeaderTextWrap}>
                  <Text style={styles.calendarEyebrow}>Calendario Live</Text>
                  <Text style={styles.calendarTitle}>Agenda premium</Text>
                </View>
                <View style={styles.calendarCountPill}>
                  <Ionicons name="calendar-outline" size={14} color={GOLD} />
                  <Text style={styles.calendarCountText}>{filteredCalendarAppointments.length} slot</Text>
                </View>
              </View>

              <Text style={styles.calendarSub}>
                {nextAppointment
                  ? `Prossimo slot: ${formatDateLabel(nextAppointment.startAt)} alle ${formatTime(nextAppointment.startAt)}`
                  : 'Prossimo slot: nessun appuntamento confermato'}
              </Text>

              <View style={styles.calendarStatsRow}>
                <View style={styles.calendarStatCard}>
                  <Text style={styles.calendarStatValue}>{upcomingAppointments.length}</Text>
                  <Text style={styles.calendarStatLabel}>In arrivo</Text>
                </View>
                <View style={styles.calendarStatCard}>
                  <Text style={styles.calendarStatValue}>{humanizeMinutes(confirmedMinutesBooked)}</Text>
                  <Text style={styles.calendarStatLabel}>Tempo prenotato</Text>
                </View>
                <View style={styles.calendarStatCard}>
                  <Text style={styles.calendarStatValue}>{cancelledCount}</Text>
                  <Text style={styles.calendarStatLabel}>Annullate</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calendarFiltersRow}
              >
                {CALENDAR_FILTERS.map((filterItem) => {
                  const active = calendarFilter === filterItem.key;
                  return (
                    <TouchableOpacity
                      key={filterItem.key}
                      style={[
                        styles.calendarFilterChip,
                        active ? styles.calendarFilterChipActive : styles.calendarFilterChipInactive,
                      ]}
                      onPress={() => setCalendarFilter(filterItem.key)}
                      activeOpacity={0.88}
                    >
                      <Text
                        style={[
                          styles.calendarFilterText,
                          active ? styles.calendarFilterTextActive : styles.calendarFilterTextInactive,
                        ]}
                      >
                        {filterItem.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calendarDaysRow}
              >
                {calendarDayTabs.map((dayTab) => {
                  const active = activeCalendarDayKey === dayTab.key;
                  return (
                    <TouchableOpacity
                      key={dayTab.key}
                      style={[styles.calendarDayChip, active && styles.calendarDayChipActive]}
                      onPress={() => setActiveCalendarDayKey(dayTab.key)}
                      activeOpacity={0.88}
                    >
                      <Text style={[styles.calendarDayChipText, active && styles.calendarDayChipTextActive]}>
                        {dayTab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
            {appointments.length === 0 ? (
              <View style={styles.calendarEmptyCard}>
                <Ionicons name="sparkles-outline" size={28} color={GOLD} />
                <Text style={styles.calendarEmptyTitle}>Calendario ancora vuoto</Text>
                <Text style={styles.calendarEmptyText}>
                  Fai la prima prenotazione e vedrai qui la tua timeline completa.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.calendarEmptyBtn]}
                  onPress={() => {
                    setShowAppointments(false);
                    setShowNewBooking(true);
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryBtnText}>Prenota adesso</Text>
                </TouchableOpacity>
              </View>
            ) : !hasCalendarMatches ? (
              <View style={styles.calendarNoMatchCard}>
                <Ionicons name="funnel-outline" size={24} color={GOLD} />
                <Text style={styles.calendarNoMatchTitle}>Nessun risultato con i filtri attuali</Text>
                <Text style={styles.calendarNoMatchText}>
                  Cambia filtro o giorno per vedere di nuovo la timeline completa.
                </Text>
                <TouchableOpacity
                  style={[styles.secondaryBtn, styles.calendarResetBtn]}
                  onPress={() => {
                    setCalendarFilter('all');
                    setActiveCalendarDayKey('all');
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.secondaryBtnText}>Reset filtri</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.calendarGroupsWrap}>
                {visibleAppointmentsByDay.map((group, groupIndex) => {
                  const isCollapsed = collapsedCalendarDays[group.key] ?? false;

                  return (
                  <View key={group.key} style={styles.calendarDayGroup}>
                      <TouchableOpacity
                        style={styles.calendarDayHeader}
                        onPress={() => toggleCalendarDayCollapse(group.key)}
                        activeOpacity={0.9}
                      >
                        <View style={styles.calendarDayHeaderLeft}>
                          <Text style={styles.calendarDayTitle}>{group.label}</Text>
                          <Text style={styles.calendarDayCount}>{group.items.length} slot</Text>
                        </View>
                        <Ionicons
                          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                          size={18}
                          color="#b8b8b8"
                        />
                      </TouchableOpacity>
                      {isCollapsed ? (
                        <Text style={styles.calendarCollapsedHint}>Gruppo compresso. Tocca per aprire.</Text>
                      ) : (
                        <View style={styles.calendarDayList}>
                          {group.items.map((appointment, itemIndex) =>
                            renderAppointmentCard(appointment, groupIndex * 6 + itemIndex + 1)
                          )}
                        </View>
                      )}
                  </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL ANNULLAMENTO */}
      <Modal transparent visible={cancelModalVisible} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeCancelModal} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Annulla prenotazione</Text>
          <Text style={styles.modalSub}>Seleziona una motivazione (aiuta a migliorare il servizio).</Text>

          <View style={{ marginTop: 12, gap: 10 }}>
            {CANCEL_REASONS.map((r) => {
              const active = cancelReason === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonRow, active && styles.reasonRowActive]}
                  onPress={() => setCancelReason(r)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {cancelReason === 'Altro' && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                value={cancelOtherText}
                onChangeText={setCancelOtherText}
                placeholder="Scrivi il motivo..."
                placeholderTextColor="#777"
                style={styles.input}
              />
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={closeCancelModal} activeOpacity={0.9}>
              <Text style={styles.secondaryBtnText}>Chiudi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={cancelAppointment} activeOpacity={0.9}>
              <Text style={styles.primaryBtnText}>Conferma annullo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  brand: {
    color: GOLD,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSub: {
    color: MUTED,
    marginTop: 2,
  },
  logout: {
    color: '#8a8a8a',
    fontWeight: '600',
  },

  hero: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242424',
  },
  heroTitle: {
    color: TXT,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroText: {
    color: MUTED,
    lineHeight: 20,
  },
  heroPowerPanel: {
    marginTop: 14,
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f1912',
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroPowerTitle: {
    color: TXT,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  heroPowerText: {
    color: MUTED,
    lineHeight: 20,
    fontSize: 14,
  },
  nextCard: {
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  nextCardLabel: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
  },
  nextCardTitle: {
    color: TXT,
    fontWeight: '900',
    fontSize: 16,
  },
  nextCardMeta: {
    color: '#cdcdcd',
    fontWeight: '700',
    lineHeight: 18,
  },
  nextCardDate: {
    color: MUTED,
    fontWeight: '700',
    lineHeight: 18,
  },
  heroActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  heroPrimaryBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  heroPrimaryBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 13,
  },
  heroSecondaryBtn: {
    flex: 1,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#313131',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  heroSecondaryBtnText: {
    color: TXT,
    fontWeight: '800',
    fontSize: 13,
  },
  powerStatsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  powerStatCard: {
    flex: 1,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 3,
  },
  powerStatValue: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
  },
  powerStatLabel: {
    color: '#9d9d9d',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },
  spotlightCard: {
    marginTop: 12,
    backgroundColor: '#131313',
    borderWidth: 1,
    borderColor: '#282828',
    borderRadius: 18,
    padding: 14,
  },
  spotlightHeader: {
    gap: 3,
  },
  spotlightTitle: {
    color: TXT,
    fontWeight: '900',
    fontSize: 17,
  },
  spotlightSub: {
    color: MUTED,
    lineHeight: 18,
    fontSize: 12,
  },
  spotlightRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
  },
  spotlightShopCard: {
    width: 210,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  spotlightShopCardActive: {
    borderColor: GOLD,
    backgroundColor: '#1d1711',
  },
  spotlightShopTitle: {
    color: TXT,
    fontWeight: '900',
    fontSize: 14,
  },
  spotlightShopMeta: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
  },
  spotlightShopAddress: {
    color: MUTED,
    lineHeight: 18,
    fontSize: 12,
  },
  spotlightShopCta: {
    marginTop: 8,
    color: '#f0d5a6',
    fontWeight: '800',
    fontSize: 12,
  },

  sectionToggle: {
    marginTop: 14,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#242424',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionToggleActive: {
    borderColor: GOLD,
    backgroundColor: '#1c1610',
  },
  sectionToggleHead: {
    gap: 3,
  },
  sectionToggleEyebrow: {
    color: '#8c8c8c',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionToggleText: {
    color: GOLD,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionToggleArrow: {
    color: MUTED,
    fontSize: 18,
    fontWeight: '800',
  },

  sectionCard: {
    marginTop: 10,
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 8,
  },
  calendarSection: {
    marginTop: 16,
    backgroundColor: '#121212',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  calendarAnimatedBlock: {
    gap: 10,
    zIndex: 2,
  },
  calendarGlowTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.14)',
    right: -72,
    top: -96,
  },
  calendarGlowBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.08)',
    left: -68,
    bottom: -84,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  calendarHeaderTextWrap: {
    gap: 2,
    flexShrink: 1,
  },
  calendarEyebrow: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  calendarTitle: {
    color: TXT,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  calendarCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1b1610',
    borderWidth: 1,
    borderColor: '#3b3020',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  calendarCountText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
  },
  calendarSub: {
    color: '#d0d0d0',
    lineHeight: 19,
    fontWeight: '700',
    zIndex: 1,
  },
  calendarStatsRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  calendarStatCard: {
    flex: 1,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  calendarStatValue: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '900',
  },
  calendarStatLabel: {
    color: '#9f9f9f',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarFiltersRow: {
    marginTop: 2,
    gap: 8,
    paddingRight: 8,
  },
  calendarFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  calendarFilterChipActive: {
    backgroundColor: '#211a12',
    borderColor: GOLD,
  },
  calendarFilterChipInactive: {
    backgroundColor: '#161616',
    borderColor: '#2b2b2b',
  },
  calendarFilterText: {
    fontSize: 12,
    fontWeight: '800',
  },
  calendarFilterTextActive: {
    color: GOLD,
  },
  calendarFilterTextInactive: {
    color: '#b3b3b3',
  },
  calendarDaysRow: {
    gap: 8,
    paddingRight: 8,
  },
  calendarDayChip: {
    borderRadius: 999,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 210,
  },
  calendarDayChipActive: {
    backgroundColor: '#1e1710',
    borderColor: GOLD,
  },
  calendarDayChipText: {
    color: '#b5b5b5',
    fontSize: 12,
    fontWeight: '800',
  },
  calendarDayChipTextActive: {
    color: GOLD,
  },
  calendarGroupsWrap: {
    gap: 14,
    marginTop: 2,
    zIndex: 1,
  },
  calendarDayGroup: {
    gap: 10,
  },
  calendarDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#171717',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  calendarDayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  calendarDayTitle: {
    color: TXT,
    fontSize: 14,
    fontWeight: '900',
  },
  calendarDayCount: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
    backgroundColor: '#1d1710',
    borderWidth: 1,
    borderColor: '#3c3020',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  calendarDayList: {
    gap: 12,
  },
  calendarCollapsedHint: {
    color: '#8f8f8f',
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  calendarEmptyCard: {
    marginTop: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    backgroundColor: '#151515',
    padding: 16,
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  calendarEmptyTitle: {
    color: TXT,
    fontWeight: '900',
    fontSize: 18,
  },
  calendarEmptyText: {
    color: MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },
  calendarEmptyBtn: {
    width: '100%',
    marginTop: 6,
  },
  calendarNoMatchCard: {
    marginTop: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    backgroundColor: '#161616',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  calendarNoMatchTitle: {
    color: TXT,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarNoMatchText: {
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  calendarResetBtn: {
    width: '100%',
    marginTop: 4,
  },

  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookingHeaderTitle: {
    color: TXT,
    fontSize: 18,
    fontWeight: '900',
  },
  bookingHeaderSub: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
  },
  stepsTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepTrackItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  stepTrackDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#2f2f2f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTrackDotActive: {
    borderColor: GOLD,
    backgroundColor: '#1f1912',
  },
  stepTrackDotCompleted: {
    borderColor: GOLD,
    backgroundColor: GOLD,
  },
  stepTrackDotText: {
    color: '#c9c9c9',
    fontSize: 12,
    fontWeight: '900',
  },
  stepTrackDotTextCompleted: {
    color: '#101010',
  },
  stepTrackLabel: {
    color: '#7f7f7f',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepTrackLabelActive: {
    color: '#ddd',
  },
  stepTrackLabelCompleted: {
    color: GOLD,
  },
  quickSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  quickPill: {
    backgroundColor: '#1b1b1b',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  quickPillText: {
    color: '#d7d7d7',
    fontWeight: '700',
    fontSize: 11,
  },

  stepTitle: {
    color: TXT,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
    letterSpacing: 0.2,
  },
  helper: {
    color: MUTED,
    marginTop: 8,
    lineHeight: 19,
    fontSize: 13,
  },
  searchWrap: {
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    color: TXT,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  emptySearchText: {
    color: MUTED,
    marginTop: 8,
    fontWeight: '700',
  },

  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  choiceCard: {
    width: '48%',
    backgroundColor: CARD2,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  choiceCardFull: {
    width: '100%',
  },
  choiceCardActive: {
    borderColor: GOLD,
    backgroundColor: '#1d1711',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  choiceTitle: {
    color: TXT,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  choiceSub: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
  },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#201a12',
    borderColor: GOLD,
  },
  chipInactive: {
    backgroundColor: '#151515',
    borderColor: '#2a2a2a',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextActive: {
    color: GOLD,
  },
  chipTextInactive: {
    color: MUTED,
  },

  slotsGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slot: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  slotActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  slotDisabled: {
    backgroundColor: '#101010',
    borderColor: '#1a1a1a',
    opacity: 0.45,
  },
  slotText: {
    color: MUTED,
    fontWeight: '900',
    fontSize: 12,
  },
  slotTextActive: {
    color: '#000',
  },
  slotTextDisabled: {
    color: '#666',
  },

  summaryCard: {
    marginTop: 16,
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242424',
  },
  summaryTitle: {
    color: TXT,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  summaryLabel: {
    color: MUTED,
    fontWeight: '700',
  },
  summaryValue: {
    color: TXT,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },

  primaryBtn: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: TXT,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnDisabledText: {
    color: '#555',
  },

  resetText: {
    color: MUTED,
    textAlign: 'center',
    fontWeight: '700',
  },

  apCard: {
    position: 'relative',
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  apCardCancelled: {
    borderColor: '#4a2f2f',
  },
  apTimelineRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#67e68c',
  },
  apTimelineRailCancelled: {
    backgroundColor: '#d87d7d',
  },
  apTimelineRailPast: {
    backgroundColor: '#989898',
  },
  apCardContent: {
    paddingLeft: 4,
  },
  apTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 9,
  },
  apStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  apStatusBadgeConfirmed: {
    backgroundColor: 'rgba(125,255,156,0.08)',
    borderColor: 'rgba(125,255,156,0.3)',
  },
  apStatusBadgePast: {
    backgroundColor: 'rgba(181,181,181,0.1)',
    borderColor: 'rgba(181,181,181,0.25)',
  },
  apStatusBadgeCancelled: {
    backgroundColor: 'rgba(239,171,171,0.09)',
    borderColor: 'rgba(239,171,171,0.3)',
  },
  apStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  apTitle: {
    color: TXT,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  apMetaStack: {
    gap: 7,
  },
  apMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apMeta: {
    color: '#d0d0d0',
    lineHeight: 19,
    flex: 1,
    fontWeight: '700',
  },
  apPricePill: {
    backgroundColor: '#1f1912',
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  apPricePillText: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 13,
  },
  apDivider: {
    height: 1,
    backgroundColor: '#2b2b2b',
    marginTop: 12,
    marginBottom: 12,
  },

  manageTitle: {
    color: GOLD,
    fontWeight: '900',
    marginBottom: 8,
  },
  manageHint: {
    color: MUTED,
    lineHeight: 18,
  },
  manageActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  manageBtn: {
    width: '100%',
  },
  cancelReasonText: {
    color: '#caa',
    marginTop: 10,
    fontWeight: '700',
  },

  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  badge: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242424',
  },
  badgeLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeValue: {
    color: TXT,
    fontWeight: '900',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalCard: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '18%',
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  modalTitle: {
    color: TXT,
    fontSize: 18,
    fontWeight: '900',
  },
  modalSub: {
    color: MUTED,
    marginTop: 6,
    lineHeight: 18,
  },
  reasonRow: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  reasonRowActive: {
    backgroundColor: '#201a12',
    borderColor: GOLD,
  },
  reasonText: {
    color: MUTED,
    fontWeight: '800',
  },
  reasonTextActive: {
    color: GOLD,
  },
  input: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: TXT,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontWeight: '700',
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },

  // Loading screen
  loadingWrap: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 110,
    overflow: 'hidden',
  },
  loadingGlowTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.16)',
    top: -110,
    right: -70,
  },
  loadingGlowBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.08)',
    bottom: 100,
    left: -90,
  },
  loadingContent: {
    width: '100%',
    gap: 12,
    zIndex: 2,
  },
  loadingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1c160f',
    borderWidth: 1,
    borderColor: '#3f3220',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  loadingBadgeText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  loadingCartoonWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  loadingSceneCard: {
    width: '100%',
    maxWidth: 320,
    height: 118,
    borderRadius: 18,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    overflow: 'hidden',
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
  },
  loadingSceneFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 26,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  loadingBarber: {
    position: 'absolute',
    left: 22,
    bottom: 24,
    alignItems: 'center',
  },
  loadingBarberHair: {
    position: 'absolute',
    top: -18,
    width: 24,
    height: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#2b2b2b',
    zIndex: 2,
  },
  loadingBarberHead: {
    width: 22,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c49b6f',
    borderWidth: 1,
    borderColor: '#a98259',
  },
  loadingBarberBody: {
    marginTop: 5,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#202020',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  loadingClient: {
    position: 'absolute',
    right: 28,
    bottom: 24,
    alignItems: 'center',
  },
  loadingClientHead: {
    width: 26,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d5ae80',
    borderWidth: 1,
    borderColor: '#b48d61',
    overflow: 'hidden',
    alignItems: 'center',
  },
  loadingClientHair: {
    width: '100%',
    height: 9,
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  loadingClientBeard: {
    marginTop: 8,
    width: 18,
    height: 8,
    borderRadius: 10,
    backgroundColor: '#1f1f1f',
  },
  loadingClientBody: {
    marginTop: 5,
    width: 42,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#282828',
    borderWidth: 1,
    borderColor: '#363636',
  },
  loadingChair: {
    position: 'absolute',
    right: 12,
    bottom: 22,
    width: 58,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#313131',
    backgroundColor: 'rgba(41,41,41,0.35)',
  },
  loadingClipper: {
    position: 'absolute',
    left: '50%',
    top: '44%',
    marginLeft: -12,
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e7c38f',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingTitle: {
    color: TXT,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  loadingCard: {
    width: '100%',
    backgroundColor: '#131313',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 12,
  },
  loadingSub: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingTopTextWrap: {
    flex: 1,
    gap: 3,
  },
  loadingCardTitle: {
    color: TXT,
    fontSize: 16,
    fontWeight: '800',
  },
  loadingCardSub: {
    color: MUTED,
    lineHeight: 18,
    fontSize: 13,
  },
  loadingProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  loadingProgressBeam: {
    width: 170,
    height: '100%',
    borderRadius: 999,
    backgroundColor: GOLD,
    opacity: 0.85,
  },
  loadingDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#242424',
  },
  loadingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  loadingSummaryText: {
    color: TXT,
    flex: 1,
    fontWeight: '700',
  },
  loadingHint: {
    color: '#777',
    marginTop: 4,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Success card
  successScrollContent: {
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: 120,
    paddingTop: 6,
  },
  successGlowTop: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.13)',
    top: -88,
    right: -80,
  },
  successGlowBottom: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.08)',
    bottom: 30,
    left: -78,
  },
  successHero: {
    marginTop: 8,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 6,
  },
  successHeroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1d1710',
    borderWidth: 1,
    borderColor: '#3e3221',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  successHeroBadgeText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  successTickStage: {
    width: 128,
    height: 128,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  successTickGlow: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.24)',
  },
  successTickRing: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(197,157,95,0.65)',
  },
  successTickCore: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: '#e6c18e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  successLiveRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    backgroundColor: '#1d1710',
    borderWidth: 1,
    borderColor: '#3b2f20',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  successLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#7DFF9C',
  },
  successLiveText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  successHeroTitle: {
    color: TXT,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  successHeroSub: {
    color: MUTED,
    lineHeight: 19,
    fontWeight: '700',
  },
  successCard: {
    marginTop: 12,
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    alignItems: 'center',
  },
  successWelcomeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  successWelcomeText: {
    color: '#d8d8d8',
    fontWeight: '800',
  },
  bookingIdBox: {
    width: '100%',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  bookingIdLabel: {
    color: '#777',
    fontWeight: '700',
    marginBottom: 4,
  },
  bookingIdValue: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
  successMetaRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  successMetaCard: {
    flex: 1,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 3,
  },
  successMetaLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  successMetaValue: {
    color: TXT,
    fontWeight: '900',
    fontSize: 13,
  },
  successSummary: {
    width: '100%',
    marginTop: 12,
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  successSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  successSummaryRowLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  successSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  successSummaryLabel: {
    color: MUTED,
    fontWeight: '700',
  },
  successSummaryValue: {
    color: TXT,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  successPrimaryBtn: {
    marginTop: 14,
    width: '100%',
  },
  successSecondaryBtn: {
    marginTop: 10,
    width: '100%',
  },
  successBackAction: {
    marginTop: 12,
    paddingVertical: 2,
  },
});


