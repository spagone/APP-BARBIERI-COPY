import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import BottomBar from '../../components/BottomBar';
import { clearUser, getUser } from '../store/userStore';

const { width } = Dimensions.get('window');

const GOLD = '#c59d5f';
const BG = '#0c0c0c';
const CARD = '#171717';
const MUTED = '#a8a8a8';
const IMAGE_WIDTH = width * 0.75;
const IMAGE_HEIGHT = 420;

const HOME_IMAGES = [
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70',
  'https://images.unsplash.com/photo-1605497788044-5a32c7078486',
  'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e1?w=900',
];

const HOME_LABELS = ['Precisione', 'Atmosfera', 'Riservatezza', 'Esperienza'];

const SERVICES_ROW = [
  { name: 'Taglio', meta: '30 min', price: '15 EUR', emoji: '\u2702\uFE0F' },
  { name: 'Barba', meta: '20 min', price: '10 EUR', emoji: '\uD83E\uDD14' },
  { name: 'Combo', meta: '45 min', price: '22 EUR', emoji: '\uD83D\uDC88' },
];

const STATS = [
  { value: '4.9/5', label: 'Media recensioni' },
  { value: '2 min', label: 'Tempo medio prenotazione' },
  { value: '7/7', label: 'Prenotazioni attive' },
];

const REVIEWS = [
  { name: 'Luca', text: 'Prenotazione veloce e servizio impeccabile.' },
  { name: 'Matteo', text: 'Ambiente top, orari rispettati, staff serio.' },
];

export default function Home() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const textOpacity = useRef(new Animated.Value(1)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const sectionsAnim = useRef(new Animated.Value(0)).current;
  const currentUser = getUser();
  const isClient = currentUser?.role === 'client';

  const [activeIndex, setActiveIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(sectionsAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, sectionsAnim]);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = activeIndex === HOME_IMAGES.length - 1 ? 0 : activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeIndex]);

  useEffect(() => {
    const newText = HOME_LABELS[activeIndex];
    let typeInterval: ReturnType<typeof setInterval> | null = null;

    setDisplayText('');

    Animated.timing(textOpacity, {
      toValue: 0.2,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      let i = 0;
      typeInterval = setInterval(() => {
        i += 1;
        setDisplayText(newText.slice(0, i));

        if (i >= newText.length && typeInterval) {
          clearInterval(typeInterval);
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        }
      }, 80);
    });

    return () => {
      if (typeInterval) clearInterval(typeInterval);
    };
  }, [activeIndex, textOpacity]);

  const heroTranslateY = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const sectionTranslateY = sectionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const handlePrimaryAction = () => {
    if (!currentUser) {
      router.push('/register');
      return;
    }

    if (isClient) {
      router.push('/booking');
      return;
    }

    router.push('/barber?activeTab=booking');
  };

  const handleSecondaryAction = () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    router.push('/profile');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrapper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.brand}>MYBARBER</Text>

            <View style={styles.headerActions}>
              {!currentUser ? (
                <>
                  <Pressable onPress={() => router.push('/login')}>
                    <Text style={styles.headerText}>Accedi</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push('/register')}>
                    <Text style={styles.headerText}>Crea Account</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => router.push('/profile')}>
                    <Text style={styles.headerText}>Profilo</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      clearUser();
                      router.replace('/login');
                    }}>
                    <Text style={styles.headerText}>Logout</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={HOME_IMAGES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index, animated: true });
              }, 220);
            }}
            renderItem={({ item }) => (
              <View style={{ width }}>
                <Image source={{ uri: item }} style={styles.image} />
              </View>
            )}
          />

          <View style={styles.sliderLabelContainer}>
            <Animated.Text style={[styles.sliderLabel, { opacity: textOpacity }]}>
              {displayText}
            </Animated.Text>
            <View style={styles.dotsRow}>
              {HOME_IMAGES.map((_, index) => (
                <View key={index} style={[styles.dot, activeIndex === index && styles.dotActive]} />
              ))}
            </View>
          </View>

          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: heroAnim,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}>
            <Text style={styles.heroTitle}>
              {currentUser ? `Bentornato ${currentUser.name}` : 'Il tuo stile, elevato.'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {!currentUser
                ? `Prenota in pochi secondi.\nVivi un'esperienza premium.`
                : isClient
                ? `Gestisci appuntamenti e storico dal tuo account cliente.`
                : `Monitora agenda e prenotazioni dalla dashboard barbiere.`}
            </Text>

            <View style={styles.heroButtons}>
              <Pressable style={styles.primaryButton} onPress={handlePrimaryAction}>
                <Text style={styles.primaryButtonText}>
                  {!currentUser ? 'Prenota Ora' : isClient ? 'Nuova Prenotazione' : 'Apri Dashboard'}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleSecondaryAction}>
                <Text style={styles.secondaryButtonText}>
                  {!currentUser ? 'Ho gia un account' : 'Vai al Profilo'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {currentUser && (
            <View style={styles.loggedBadgeWrap}>
              <View style={styles.loggedBadge}>
                <Text style={styles.loggedBadgeText}>
                  Connesso come {currentUser.role === 'client' ? 'Cliente' : 'Barbiere'}
                </Text>
              </View>
            </View>
          )}

          <Animated.View
            style={[
              styles.sectionsWrap,
              {
                opacity: sectionsAnim,
                transform: [{ translateY: sectionTranslateY }],
              },
            ]}>
            <View style={styles.statsRow}>
              {STATS.map((item) => (
                <View key={item.label} style={styles.statCard}>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Servizi principali</Text>
              <View style={styles.servicesGrid}>
                {SERVICES_ROW.map((service) => (
                  <View key={service.name} style={styles.serviceBox}>
                    <View style={styles.serviceAccent} />
                    <View style={styles.serviceEmojiWrap}>
                      <Text style={styles.serviceEmoji}>{service.emoji}</Text>
                    </View>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceMeta}>{service.meta}</Text>
                    <Text style={styles.servicePrice}>{service.price}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dicono di noi</Text>
              {REVIEWS.map((review) => (
                <View key={review.name} style={styles.reviewRow}>
                  <Text style={styles.reviewText}>&quot;{review.text}&quot;</Text>
                  <Text style={styles.reviewAuthor}>- {review.name}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        <BottomBar />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  wrapper: { flex: 1 },
  scrollContent: {
    paddingBottom: 170,
  },
  header: {
    marginTop: 20,
    marginHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerText: {
    color: '#b3b3b3',
    fontSize: 14,
    fontWeight: '600',
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    alignSelf: 'center',
    borderRadius: 25,
    marginTop: 36,
  },
  sliderLabelContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  sliderLabel: {
    color: GOLD,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#3a3a3a',
  },
  dotActive: {
    width: 20,
    backgroundColor: GOLD,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 54,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    color: MUTED,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  heroButtons: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: GOLD,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ececec',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionsWrap: {
    marginTop: 26,
    paddingHorizontal: 18,
    gap: 12,
  },
  loggedBadgeWrap: {
    marginTop: 12,
    paddingHorizontal: 18,
  },
  loggedBadge: {
    backgroundColor: '#151515',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  loggedBadgeText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#151515',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#272727',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statValue: {
    color: GOLD,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    color: '#9c9c9c',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 17,
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  serviceBox: {
    flex: 1,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 5,
    overflow: 'hidden',
  },
  serviceAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: GOLD,
  },
  serviceEmojiWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#363636',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceEmoji: {
    fontSize: 18,
  },
  serviceName: {
    color: '#f3f3f3',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  serviceMeta: {
    color: '#aaaaaa',
    fontSize: 11,
    textAlign: 'center',
  },
  servicePrice: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  reviewRow: {
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  reviewText: {
    color: '#efefef',
    lineHeight: 19,
  },
  reviewAuthor: {
    color: GOLD,
    fontWeight: '700',
  },
});
