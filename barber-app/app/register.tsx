import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { setUser } from './store/userStore';

const GOLD = '#c59d5f';
const BG = '#080808';
const CARD = '#111111';
const BORDER = '#2a2a2a';
const MUTED = '#9f9f9f';
const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1400&q=80';

export default function Register() {
  const router = useRouter();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'barber' | null>(null);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const needsShopDetails = role === 'barber';
  const hasShopDetails =
    shopName.trim().length > 0 && shopAddress.trim().length > 0 && shopCity.trim().length > 0;
  const isFormValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    role !== null &&
    (!needsShopDetails || hasShopDetails);

  useEffect(() => {
    Animated.stagger(130, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, cardAnim]);

  const heroTranslateY = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const clearError = () => {
    if (errorMessage) setErrorMessage('');
  };

  const updateName = (value: string) => {
    setName(value);
    clearError();
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    clearError();
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    clearError();
  };

  const updateShopName = (value: string) => {
    setShopName(value);
    clearError();
  };

  const updateShopAddress = (value: string) => {
    setShopAddress(value);
    clearError();
  };

  const updateShopCity = (value: string) => {
    setShopCity(value);
    clearError();
  };

  const chooseRole = (nextRole: 'client' | 'barber') => {
    setRole(nextRole);
    clearError();
  };

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const handleRegister = () => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedShopName = shopName.trim();
    const trimmedShopAddress = shopAddress.trim();
    const trimmedShopCity = shopCity.trim();

    if (!trimmedName || !normalizedEmail || !trimmedPassword || !role) {
      setErrorMessage('Compila tutti i campi prima di continuare.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Inserisci una email valida.');
      return;
    }

    if (role === 'barber' && (!trimmedShopName || !trimmedShopAddress || !trimmedShopCity)) {
      setErrorMessage('Per il barbiere servono anche i dati del negozio.');
      return;
    }

    if (role === 'barber') {
      setUser({
        name: trimmedName,
        email: normalizedEmail,
        password: trimmedPassword,
        role: 'barber',
        shop: {
          shopName: trimmedShopName,
          shopAddress: trimmedShopAddress,
          shopCity: trimmedShopCity,
        },
      });
    } else {
      setUser({
        name: trimmedName,
        email: normalizedEmail,
        password: trimmedPassword,
        role: 'client',
      });
    }

    setErrorMessage('');
    router.replace('/login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.heroWrap,
              {
                opacity: heroAnim,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}>
            <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
              <View style={styles.heroOverlay} />

              <View style={styles.heroBadgeWrap}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>JOIN MYBARBER</Text>
                </View>
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroKicker}>PRIVATE BARBER CLUB</Text>
                <Text style={styles.heroTitle}>Inizia il tuo stile</Text>
                <Text style={styles.heroSubtitle}>
                  Crea il tuo account e accedi all&apos;esperienza premium del salone.
                </Text>
              </View>
            </ImageBackground>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardAnim,
                transform: [{ translateY: cardTranslateY }],
              },
            ]}>
            <Text style={styles.title}>Crea account</Text>
            <Text style={styles.subtitle}>Pochi dati e sei subito operativo.</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nome</Text>
              <View style={styles.inputShell}>
                <MaterialCommunityIcons name="account-outline" size={18} color="#b69458" />
                <TextInput
                  placeholder="Il tuo nome"
                  placeholderTextColor="#737373"
                  style={styles.input}
                  value={name}
                  onChangeText={updateName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputShell}>
                <MaterialCommunityIcons name="email-outline" size={18} color="#b69458" />
                <TextInput
                  placeholder="nome@esempio.com"
                  placeholderTextColor="#737373"
                  style={styles.input}
                  value={email}
                  onChangeText={updateEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputShell}>
                <MaterialCommunityIcons name="lock-outline" size={18} color="#b69458" />
                <TextInput
                  placeholder="Crea una password"
                  placeholderTextColor="#737373"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                  onChangeText={updatePassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                  <Text style={styles.toggleText}>{showPassword ? 'Nascondi' : 'Mostra'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ruolo</Text>
              <View style={styles.roleRow}>
                <Pressable
                  style={[styles.roleCard, role === 'client' && styles.roleCardActive]}
                  onPress={() => chooseRole('client')}>
                  <MaterialCommunityIcons
                    name="account-circle-outline"
                    size={19}
                    color={role === 'client' ? '#111111' : '#d9c7a5'}
                  />
                  <Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>Cliente</Text>
                </Pressable>

                <Pressable
                  style={[styles.roleCard, role === 'barber' && styles.roleCardActive]}
                  onPress={() => chooseRole('barber')}>
                  <MaterialCommunityIcons
                    name="content-cut"
                    size={19}
                    color={role === 'barber' ? '#111111' : '#d9c7a5'}
                  />
                  <Text style={[styles.roleText, role === 'barber' && styles.roleTextActive]}>Barbiere</Text>
                </Pressable>
              </View>
            </View>

            {needsShopDetails ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Nome negozio</Text>
                  <View style={styles.inputShell}>
                    <MaterialCommunityIcons name="storefront-outline" size={18} color="#b69458" />
                    <TextInput
                      placeholder="Es. Golden Cut Barber"
                      placeholderTextColor="#737373"
                      style={styles.input}
                      value={shopName}
                      onChangeText={updateShopName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Indirizzo negozio</Text>
                  <View style={styles.inputShell}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#b69458" />
                    <TextInput
                      placeholder="Via, numero civico"
                      placeholderTextColor="#737373"
                      style={styles.input}
                      value={shopAddress}
                      onChangeText={updateShopAddress}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Citta</Text>
                  <View style={styles.inputShell}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#b69458" />
                    <TextInput
                      placeholder="Es. Milano"
                      placeholderTextColor="#737373"
                      style={styles.input}
                      value={shopCity}
                      onChangeText={updateShopCity}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#d9a35f" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                !isFormValid && styles.registerButtonDisabled,
                pressed && isFormValid && styles.registerButtonPressed,
              ]}
              onPress={handleRegister}
              disabled={!isFormValid}>
              <Text style={styles.registerButtonText}>Crea il tuo account</Text>
            </Pressable>

            <View style={styles.linksWrap}>
              <Pressable onPress={() => router.push('/login')}>
                <Text style={styles.linkPrimary}>Hai gia un account? Accedi</Text>
              </Pressable>

              <Pressable onPress={() => router.push('/')}>
                <Text style={styles.linkSecondary}>Torna alla Home</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 26,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -50,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: '#4b3414',
    opacity: 0.26,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: '#2b1e0d',
    opacity: 0.3,
  },
  heroWrap: {
    marginBottom: 14,
  },
  heroImage: {
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 16,
  },
  heroImageStyle: {
    borderRadius: 22,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.47)',
  },
  heroBadgeWrap: {
    zIndex: 1,
    alignItems: 'flex-start',
  },
  heroBadge: {
    borderWidth: 1,
    borderColor: '#6d5126',
    borderRadius: 999,
    backgroundColor: 'rgba(14, 14, 14, 0.72)',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  heroBadgeText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  heroTextWrap: {
    zIndex: 1,
  },
  heroKicker: {
    color: '#c7c7c7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#f5f5f5',
    fontSize: 31,
    fontFamily: SERIF,
    lineHeight: 38,
  },
  heroSubtitle: {
    color: '#d4d4d4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: '90%',
  },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    color: '#f7f7f7',
    fontSize: 28,
    fontFamily: SERIF,
    marginBottom: 2,
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 16,
  },
  fieldGroup: {
    gap: 8,
    marginBottom: 12,
  },
  label: {
    color: '#dfdfdf',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: '#f4f4f4',
    paddingVertical: 13,
    fontSize: 14,
  },
  toggleText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 12,
    backgroundColor: '#101010',
    paddingVertical: 12,
  },
  roleCardActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  roleText: {
    color: '#dfc89d',
    fontSize: 13,
    fontWeight: '700',
  },
  roleTextActive: {
    color: '#111111',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -2,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    color: '#e0b47b',
    fontSize: 12,
    lineHeight: 17,
  },
  registerButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  registerButtonDisabled: {
    opacity: 0.42,
  },
  registerButtonPressed: {
    transform: [{ scale: 0.992 }],
  },
  registerButtonText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  linksWrap: {
    marginTop: 15,
    gap: 10,
  },
  linkPrimary: {
    color: GOLD,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  linkSecondary: {
    color: '#959595',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
});
