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
import { getUser } from './store/userStore';

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
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1400&q=80';

export default function Login() {
  const router = useRouter();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid = email.trim().length > 0 && password.length > 0;

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

  const updateEmail = (value: string) => {
    setEmail(value);
    if (errorMessage) setErrorMessage('');
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    if (errorMessage) setErrorMessage('');
  };

  const handleLogin = () => {
    const user = getUser();
    const normalizedEmail = email.trim().toLowerCase();

    if (!user) {
      setErrorMessage('Nessun account trovato. Registrati prima di accedere.');
      return;
    }

    if (!normalizedEmail || !password) {
      setErrorMessage('Inserisci email e password.');
      return;
    }

    const userEmail = user.email.trim().toLowerCase();

    if (normalizedEmail !== userEmail || password !== user.password) {
      setErrorMessage('Email o password non corretti.');
      return;
    }

    setErrorMessage('');

    if (user.role === 'client') {
      router.replace('/client');
    } else {
      router.replace('/barber?activeTab=booking');
    }
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
                  <Text style={styles.heroBadgeText}>CRAFTED GROOMING</Text>
                </View>
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroKicker}>MYBARBER CLUB</Text>
                <Text style={styles.heroTitle}>Eleganza su misura</Text>
                <Text style={styles.heroSubtitle}>
                  Accedi al tuo spazio personale e gestisci ogni appuntamento con stile.
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
            <Text style={styles.title}>Bentornato</Text>
            <Text style={styles.subtitle}>Inserisci le tue credenziali per continuare.</Text>

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
                  placeholder="Inserisci password"
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

            {errorMessage ? (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#d9a35f" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.optionsRow}>
              <Pressable style={styles.rememberWrap} onPress={() => setRememberMe((prev) => !prev)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe ? <MaterialCommunityIcons name="check" size={11} color="#111111" /> : null}
                </View>
                <Text style={styles.rememberText}>Ricordami</Text>
              </Pressable>

              <Text style={styles.helpText}>Accesso sicuro</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                !isFormValid && styles.loginButtonDisabled,
                pressed && isFormValid && styles.loginButtonPressed,
              ]}
              onPress={handleLogin}
              disabled={!isFormValid}>
              <Text style={styles.loginButtonText}>Accedi al Club</Text>
            </Pressable>

            <View style={styles.linksWrap}>
              <Pressable onPress={() => router.push('/register')}>
                <Text style={styles.linkPrimary}>Non hai un account? Registrati</Text>
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
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#565656',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  checkboxActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  rememberText: {
    color: '#d6d6d6',
    fontSize: 12,
    fontWeight: '600',
  },
  helpText: {
    color: '#9a9a9a',
    fontSize: 12,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.42,
  },
  loginButtonPressed: {
    transform: [{ scale: 0.992 }],
  },
  loginButtonText: {
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
