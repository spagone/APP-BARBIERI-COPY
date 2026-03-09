import {
  Animated,
  Dimensions,
  Easing,
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
import { BlurView } from 'expo-blur';
import BottomBar from '../../components/BottomBar';
import { clearUser, getUser } from '../store/userStore';

const { width } = Dimensions.get('window');

const IS_WIDE = width >= 760;
const GOLD = '#d4ab6a';
const GOLD_SOFT = '#f0d8b0';
const BG = '#070707';
const CARD = '#121212';
const MUTED = '#a8a8a8';
const DEEP_RED = '#8a3b35';
const IMAGE_WIDTH = Math.min(width * 0.88, 560);
const IMAGE_HEIGHT = IS_WIDE ? 500 : 440;

const HOME_SCENES = [
  {
    image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033',
    label: 'Precisione',
    title: 'Fade perfetti e linee pulite',
    caption: 'Ogni dettaglio e studiato per un look premium, deciso e moderno.',
  },
  {
    image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70',
    label: 'Atmosfera',
    title: 'Ambiente elegante, ritmo giusto',
    caption: 'Relax, stile e servizio rapido: entri stressato, esci impeccabile.',
  },
  {
    image: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486',
    label: 'Riservatezza',
    title: 'Prenotazioni smart senza attese',
    caption: 'Slot puntuali e gestione completa direttamente dalla tua area.',
  },
  {
    image: 'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e1?w=900',
    label: 'Esperienza',
    title: 'My Barber signature care',
    caption: 'Servizi personalizzati per clienti che vogliono qualita costante.',
  },
];

const POWER_PILLS = ['Booking in 20 sec', '4.9 media reale', 'Supporto rapido', 'Club premium'];

const SERVICES_ROW = [
  { name: 'Taglio Signature', meta: '30 min', price: '15 EUR', emoji: '\u2702\uFE0F' },
  { name: 'Rituale Barba', meta: '20 min', price: '10 EUR', emoji: '\uD83E\uDDD4' },
  { name: 'Total Look', meta: '45 min', price: '22 EUR', emoji: '\uD83D\uDC88' },
];

const STATS = [
  { value: '4.9/5', label: 'Media recensioni' },
  { value: '2 min', label: 'Tempo medio prenotazione' },
  { value: '7/7', label: 'Prenotazioni attive' },
];

const REVIEWS = [
  {
    name: 'Luca',
    text: 'Interfaccia velocissima, prenoto in un attimo e trovo sempre tutto in ordine.',
  },
  {
    name: 'Matteo',
    text: 'Zero attese e livello alto. Si vede che il progetto e fatto seriamente.',
  },
];

const SIGNATURE_STEPS = [
  { id: 's1', title: 'Scan stile', text: 'Definiamo il look migliore per viso e routine.' },
  { id: 's2', title: 'Execution', text: 'Taglio e rifinitura con attenzione maniacale ai dettagli.' },
  { id: 's3', title: 'Finish', text: 'Styling finale e consigli per mantenere il risultato.' },
];

export default function Home() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const textOpacity = useRef(new Animated.Value(1)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const sectionsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const currentUser = getUser();
  const isClient = currentUser?.role === 'client';

  const [activeIndex, setActiveIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 460,
        useNativeDriver: true,
      }),
      Animated.timing(sectionsAnim, {
        toValue: 1,
        duration: 460,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, sectionsAnim]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 820,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 820,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      pulseAnim.setValue(0);
      floatAnim.setValue(0);
    };
  }, [floatAnim, pulseAnim]);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = activeIndex === HOME_SCENES.length - 1 ? 0 : activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }, 5200);

    return () => clearInterval(interval);
  }, [activeIndex]);

  useEffect(() => {
    const newText = HOME_SCENES[activeIndex].label;
    let typeInterval: ReturnType<typeof setInterval> | null = null;

    setDisplayText('');

    Animated.timing(textOpacity, {
      toValue: 0.2,
      duration: 220,
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
            duration: 280,
            useNativeDriver: true,
          }).start();
        }
      }, 70);
    });

    return () => {
      if (typeInterval) clearInterval(typeInterval);
    };
  }, [activeIndex, textOpacity]);

  const heroTranslateY = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 0],
  });

  const sectionTranslateY = sectionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.28],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.32, 0.05],
  });

  const sceneTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const carouselProgress = ((activeIndex + 1) / HOME_SCENES.length) * 100;

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

  const openCommandCenter = () => {
    if (!currentUser) {
      router.push('/register');
      return;
    }

    if (isClient) {
      router.push('/history');
      return;
    }

    router.push('/barber?activeTab=booking');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.wrapper}>
        <View pointerEvents="none" style={styles.bgOrbTop} />
        <View pointerEvents="none" style={styles.bgOrbBottom} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>MY BARBER</Text>
              <Text style={styles.brandSub}>Executive Grooming Club</Text>
            </View>

            <View style={styles.headerActions}>
              {!currentUser ? (
                <>
                  <Pressable onPress={() => router.push('/login')} style={styles.headerChip}>
                    <Text style={styles.headerChipText}>Accedi</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push('/register')} style={styles.headerChipStrong}>
                    <Text style={styles.headerChipStrongText}>Crea account</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => router.push('/profile')} style={styles.headerChip}>
                    <Text style={styles.headerChipText}>Profilo</Text>
                  </Pressable>
                  <Pressable
                    style={styles.headerChipDanger}
                    onPress={() => {
                      clearUser();
                      router.replace('/login');
                    }}>
                    <Text style={styles.headerChipDangerText}>Logout</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <View style={styles.sceneShell}>
            <FlatList
              ref={flatListRef}
              data={HOME_SCENES}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.label}
              onMomentumScrollEnd={handleScrollEnd}
              onScrollToIndexFailed={({ index }) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                }, 220);
              }}
              renderItem={({ item }) => (
                <View style={{ width }}>
                  <Animated.View style={[styles.sceneCard, { transform: [{ translateY: sceneTranslateY }] }]}>
                    <Image source={{ uri: item.image }} style={styles.image} />
                    <View style={styles.sceneOverlay} />

                    <View style={styles.sceneBadge}>
                      <Text style={styles.sceneBadgeText}>{item.label}</Text>
                    </View>

                    <BlurView intensity={26} tint="dark" style={styles.sceneBottom}>
                      <Text style={styles.sceneTitle}>{item.title}</Text>
                      <Text style={styles.sceneCaption}>{item.caption}</Text>
                    </BlurView>
                  </Animated.View>
                </View>
              )}
            />

            <View style={styles.sliderLabelContainer}>
              <Animated.Text style={[styles.sliderLabel, { opacity: textOpacity }]}>
                {displayText}
              </Animated.Text>

              <View style={styles.dotsRow}>
                {HOME_SCENES.map((_, index) => (
                  <View key={index} style={[styles.dot, activeIndex === index && styles.dotActive]} />
                ))}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${carouselProgress}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.pillsRow}>
            {POWER_PILLS.map((pill) => (
              <View key={pill} style={styles.pill}>
                <Text style={styles.pillText}>{pill}</Text>
              </View>
            ))}
          </View>

          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: heroAnim,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroKicker}>LIVE EXPERIENCE</Text>
              {currentUser ? (
                <View style={styles.liveBadge}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.liveDotPulse,
                      {
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                      },
                    ]}
                  />
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>Connesso</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.heroTitle}>
              {currentUser ? `Bentornato ${currentUser.name}` : 'Home potente. Stile dominante.'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {!currentUser
                ? `Prenotazione rapida, interfaccia premium, controllo totale del tuo look.`
                : isClient
                ? `Dal tuo pannello gestisci prenotazioni, storico e profilo in pochi tocchi.`
                : `Dashboard barbiere pronta: agenda, clienti e operazioni in tempo reale.`}
            </Text>

            <View style={styles.heroButtons}>
              <Pressable style={styles.primaryButton} onPress={handlePrimaryAction}>
                <Text style={styles.primaryButtonText}>
                  {!currentUser ? 'Inizia ora' : isClient ? 'Nuova prenotazione' : 'Apri dashboard'}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleSecondaryAction}>
                <Text style={styles.secondaryButtonText}>
                  {!currentUser ? 'Ho gia un account' : 'Vai al profilo'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.sectionsWrap,
              {
                opacity: sectionsAnim,
                transform: [{ translateY: sectionTranslateY }],
              },
            ]}>
            <View style={styles.commandCard}>
              <View style={styles.commandCardTop}>
                <Text style={styles.commandTitle}>Command Center</Text>
                <Text style={styles.commandMeta}>Controllo rapido</Text>
              </View>

              <View style={styles.commandActionsRow}>
                <Pressable style={styles.commandActionPrimary} onPress={openCommandCenter}>
                  <Text style={styles.commandActionTitle}>Apri controllo</Text>
                  <Text style={styles.commandActionText}>Storico, stato appuntamenti e azioni veloci.</Text>
                </Pressable>
                <Pressable style={styles.commandActionSecondary} onPress={() => router.push('/explore')}>
                  <Text style={styles.commandActionTitle}>Scopri servizi</Text>
                  <Text style={styles.commandActionText}>Trova opzioni adatte al tuo stile.</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.signatureCard}>
              <View style={styles.signatureHeader}>
                <Text style={styles.signatureTitle}>Signature Journey</Text>
                <Text style={styles.signatureMeta}>Metodo My Barber</Text>
              </View>
              {SIGNATURE_STEPS.map((step, index) => (
                <View key={step.id} style={styles.signatureStepRow}>
                  <View style={[styles.signatureDot, index === SIGNATURE_STEPS.length - 1 && styles.signatureDotLast]} />
                  <View style={styles.signatureTextWrap}>
                    <Text style={styles.signatureStepTitle}>{step.title}</Text>
                    <Text style={styles.signatureStepText}>{step.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.statsRow}>
              {STATS.map((item) => (
                <View key={item.label} style={styles.statCard}>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Servizi High Impact</Text>
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
              <Text style={styles.cardTitle}>Voce dei clienti</Text>
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
  wrapper: {
    flex: 1,
    backgroundColor: BG,
  },
  bgOrbTop: {
    position: 'absolute',
    top: -130,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(212,171,106,0.22)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: 190,
    left: -130,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(212,171,106,0.13)',
  },
  scrollContent: {
    paddingBottom: 176,
  },
  header: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    color: GOLD,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  brandSub: {
    color: '#8f784d',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerChip: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  headerChipText: {
    color: '#d4d4d4',
    fontWeight: '700',
    fontSize: 12,
  },
  headerChipStrong: {
    backgroundColor: '#21170e',
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  headerChipStrongText: {
    color: GOLD_SOFT,
    fontWeight: '800',
    fontSize: 12,
  },
  headerChipDanger: {
    backgroundColor: '#261515',
    borderWidth: 1,
    borderColor: '#7d3d3d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  headerChipDangerText: {
    color: '#f2b7b7',
    fontWeight: '700',
    fontSize: 12,
  },
  sceneShell: {
    marginTop: 18,
  },
  sceneCard: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3a2e1c',
    backgroundColor: '#121212',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 9,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  sceneOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  sceneBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(18,18,18,0.85)',
    borderWidth: 1,
    borderColor: '#8a6840',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  sceneBadgeText: {
    color: GOLD_SOFT,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sceneBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,171,106,0.32)',
    gap: 6,
    overflow: 'hidden',
  },
  sceneTitle: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    fontFamily: 'serif',
  },
  sceneCaption: {
    color: '#e3e3e3',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  sliderLabelContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  sliderLabel: {
    color: GOLD,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2.6,
    textTransform: 'uppercase',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  progressTrack: {
    marginTop: 12,
    width: IMAGE_WIDTH * 0.46,
    maxWidth: 230,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#2b2b2b',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: GOLD,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#3a3a3a',
  },
  dotActive: {
    width: 24,
    backgroundColor: GOLD,
  },
  pillsRow: {
    marginTop: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  pillText: {
    color: '#cfcfcf',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroSection: {
    marginTop: 22,
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3c2f1d',
    backgroundColor: '#121212',
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  heroKicker: {
    color: GOLD,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e1510',
    borderWidth: 1,
    borderColor: '#7f5b2e',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  liveDotPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 99,
    left: 9,
    backgroundColor: '#65f195',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#65f195',
  },
  liveBadgeText: {
    color: GOLD_SOFT,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    fontFamily: 'serif',
    marginBottom: 10,
  },
  heroSubtitle: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 15,
    fontWeight: '600',
  },
  heroButtons: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#120c06',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ececec',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionsWrap: {
    marginTop: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  commandCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  commandCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commandTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'serif',
  },
  commandMeta: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  commandActionsRow: {
    flexDirection: IS_WIDE ? 'row' : 'column',
    gap: 10,
  },
  commandActionPrimary: {
    flex: 1,
    backgroundColor: '#1f160d',
    borderWidth: 1,
    borderColor: '#866339',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  commandActionSecondary: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  commandActionTitle: {
    color: '#f7e0bc',
    fontWeight: '800',
    fontSize: 14,
  },
  commandActionText: {
    color: '#cacaca',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  signatureCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  signatureTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
    fontFamily: 'serif',
  },
  signatureMeta: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  signatureStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  signatureDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    marginTop: 6,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  signatureDotLast: {
    backgroundColor: DEEP_RED,
    shadowColor: DEEP_RED,
  },
  signatureTextWrap: {
    flex: 1,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 11,
    gap: 3,
  },
  signatureStepTitle: {
    color: GOLD_SOFT,
    fontSize: 14,
    fontWeight: '800',
  },
  signatureStepText: {
    color: '#cfcfcf',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
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
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    color: '#9c9c9c',
    fontSize: 11,
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
    fontSize: 19,
    fontFamily: 'serif',
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  serviceBox: {
    flex: 1,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    paddingVertical: 12,
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
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#373737',
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
    borderColor: '#222222',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  reviewText: {
    color: '#efefef',
    lineHeight: 19,
    fontWeight: '600',
  },
  reviewAuthor: {
    color: GOLD,
    fontWeight: '700',
  },
});
