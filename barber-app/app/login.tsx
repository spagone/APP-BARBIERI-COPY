import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest } from 'expo-auth-session/build/AuthRequestHooks';
import { makeRedirectUri } from 'expo-auth-session/build/AuthSession';
import { ResponseType } from 'expo-auth-session/build/AuthRequest.types';
import type { DiscoveryDocument } from 'expo-auth-session/build/Discovery';
import {
  authenticateUser,
  authenticateWithSocial,
  type SocialProvider,
  type User,
} from './store/userStore';

const GOLD = '#c59d5f';
const GOLD_SOFT = '#f0d8b0';
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
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim() ?? '';
const GOOGLE_DISCOVERY: DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};
const FACEBOOK_DISCOVERY: DiscoveryDocument = {
  authorizationEndpoint: 'https://www.facebook.com/v19.0/dialog/oauth',
};
const LOGIN_PILLS = ['Accesso in 10 sec', 'Sessione protetta', 'Stile premium'];

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSocialProvider, setActiveSocialProvider] = useState<SocialProvider | null>(null);

  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: 'barberapp',
      }),
    []
  );

  const [googleRequest, , promptGoogleAsync] = useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID || 'missing-google-client-id',
      redirectUri,
      responseType: ResponseType.IdToken,
      usePKCE: false,
      scopes: ['openid', 'profile', 'email'],
      extraParams: {
        nonce: 'mybarber_google_nonce',
      },
    },
    GOOGLE_DISCOVERY
  );

  const [facebookRequest, , promptFacebookAsync] = useAuthRequest(
    {
      clientId: FACEBOOK_APP_ID || 'missing-facebook-app-id',
      redirectUri,
      responseType: ResponseType.Token,
      usePKCE: false,
      scopes: ['public_profile', 'email'],
    },
    FACEBOOK_DISCOVERY
  );

  const isFormValid = email.trim().length > 0 && password.length > 0;
  const isSocialLoading = activeSocialProvider !== null;

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

  const routeAfterLogin = (user: User) => {
    if (user.role === 'client') {
      router.replace('/client');
      return;
    }

    router.replace('/barber?activeTab=booking');
  };

  const finishSocialLogin = async (payload: {
    provider: SocialProvider;
    idToken?: string;
    identityToken?: string;
    accessToken?: string;
    nameHint?: string;
  }) => {
    const result = await authenticateWithSocial(payload);
    if (!result.ok) {
      setErrorMessage(result.message);
      return false;
    }

    setErrorMessage('');
    routeAfterLogin(result.user);
    return true;
  };

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage('Inserisci email e password.');
      return;
    }

    const result = await authenticateUser(normalizedEmail, password);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    setErrorMessage('');
    routeAfterLogin(result.user);
  };

  const handleGoogleLogin = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setErrorMessage('Google login non configurato. Imposta EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }

    if (!googleRequest) {
      setErrorMessage('Google login non pronto. Riprova tra un attimo.');
      return;
    }

    setErrorMessage('');
    setActiveSocialProvider('google');

    try {
      const response = await promptGoogleAsync();
      if (response.type !== 'success') return;

      const idToken = typeof response.params.id_token === 'string' ? response.params.id_token : '';
      if (!idToken) {
        setErrorMessage('Google non ha restituito un idToken valido.');
        return;
      }

      await finishSocialLogin({
        provider: 'google',
        idToken,
      });
    } catch {
      setErrorMessage('Accesso Google non riuscito. Riprova.');
    } finally {
      setActiveSocialProvider(null);
    }
  };

  const handleFacebookLogin = async () => {
    if (!FACEBOOK_APP_ID) {
      setErrorMessage('Facebook login non configurato. Imposta EXPO_PUBLIC_FACEBOOK_APP_ID.');
      return;
    }

    if (!facebookRequest) {
      setErrorMessage('Facebook login non pronto. Riprova tra un attimo.');
      return;
    }

    setErrorMessage('');
    setActiveSocialProvider('facebook');

    try {
      const response = await promptFacebookAsync();
      if (response.type !== 'success') return;

      const accessToken = typeof response.params.access_token === 'string' ? response.params.access_token : '';
      if (!accessToken) {
        setErrorMessage('Facebook non ha restituito un accessToken valido.');
        return;
      }

      await finishSocialLogin({
        provider: 'facebook',
        accessToken,
      });
    } catch {
      setErrorMessage('Accesso Facebook non riuscito. Riprova.');
    } finally {
      setActiveSocialProvider(null);
    }
  };

  const handleAppleLogin = async () => {
    const isAppleAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAppleAvailable) {
      Alert.alert('Apple non disponibile', "Apple Sign In non e disponibile su questo dispositivo.");
      return;
    }

    setErrorMessage('');
    setActiveSocialProvider('apple');

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });

      if (!credential.identityToken) {
        setErrorMessage('Apple non ha restituito un identityToken valido.');
        return;
      }

      const nameHint = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ').trim();

      await finishSocialLogin({
        provider: 'apple',
        identityToken: credential.identityToken,
        nameHint: nameHint || undefined,
      });
    } catch (error) {
      const authError = error as { code?: string };
      if (authError.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMessage('Accesso Apple non riuscito. Riprova.');
      }
    } finally {
      setActiveSocialProvider(null);
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
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>MY BARBER</Text>
              <Text style={styles.brandSub}>Executive Grooming Club</Text>
            </View>

            <Pressable style={styles.headerChip} onPress={() => router.push('/')}>
              <Text style={styles.headerChipText}>Torna Home</Text>
            </Pressable>
          </View>

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
                <Text style={styles.heroKicker}>LIVE EXPERIENCE</Text>
                <Text style={styles.heroTitle}>Accesso Executive</Text>
                <Text style={styles.heroSubtitle}>
                  Accedi alla tua area My Barber e gestisci appuntamenti, storico e profilo in un solo spazio.
                </Text>
              </View>
            </ImageBackground>
          </Animated.View>

          <View style={styles.pillsRow}>
            {LOGIN_PILLS.map((pill) => (
              <View key={pill} style={styles.pill}>
                <Text style={styles.pillText}>{pill}</Text>
              </View>
            ))}
          </View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardAnim,
                transform: [{ translateY: cardTranslateY }],
              },
            ]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardMeta}>Command Access</Text>
              <Text style={styles.cardStatus}>Secure</Text>
            </View>
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

            <Pressable onPress={() => router.push('/forgot-password')} hitSlop={8}>
              <Text style={styles.forgotLink}>Password dimenticata? Ricevi key via email</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                !isFormValid && styles.loginButtonDisabled,
                pressed && isFormValid && styles.loginButtonPressed,
              ]}
              onPress={handleLogin}
              disabled={!isFormValid || isSocialLoading}>
              <Text style={styles.loginButtonText}>Accedi al Club</Text>
            </Pressable>

            <View style={styles.socialDivider}>
              <View style={styles.socialDividerLine} />
              <Text style={styles.socialDividerText}>oppure continua con</Text>
              <View style={styles.socialDividerLine} />
            </View>

            <View style={styles.socialButtonsWrap}>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  activeSocialProvider === 'google' && styles.socialButtonLoading,
                  pressed && styles.socialButtonPressed,
                ]}
                onPress={handleGoogleLogin}
                disabled={isSocialLoading}>
                <MaterialCommunityIcons name="google" size={18} color="#f1e4ce" />
                <Text style={styles.socialButtonText}>
                  {activeSocialProvider === 'google' ? 'Connessione...' : 'Google'}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  activeSocialProvider === 'apple' && styles.socialButtonLoading,
                  pressed && styles.socialButtonPressed,
                ]}
                onPress={handleAppleLogin}
                disabled={isSocialLoading}>
                <MaterialCommunityIcons name="apple" size={18} color="#f1e4ce" />
                <Text style={styles.socialButtonText}>
                  {activeSocialProvider === 'apple' ? 'Connessione...' : 'Apple'}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  activeSocialProvider === 'facebook' && styles.socialButtonLoading,
                  pressed && styles.socialButtonPressed,
                ]}
                onPress={handleFacebookLogin}
                disabled={isSocialLoading}>
                <MaterialCommunityIcons name="facebook" size={18} color="#f1e4ce" />
                <Text style={styles.socialButtonText}>
                  {activeSocialProvider === 'facebook' ? 'Connessione...' : 'Facebook'}
                </Text>
              </Pressable>
            </View>

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
    paddingVertical: 22,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 12,
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
  headerChip: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerChipText: {
    color: '#d4d4d4',
    fontWeight: '700',
    fontSize: 12,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -50,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(212,171,106,0.22)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(212,171,106,0.12)',
  },
  heroWrap: {
    marginBottom: 12,
  },
  heroImage: {
    height: 228,
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
    borderColor: '#8a6840',
    borderRadius: 999,
    backgroundColor: 'rgba(18,18,18,0.85)',
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
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 33,
    fontFamily: SERIF,
    lineHeight: 39,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#e3e3e3',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: '95%',
    fontWeight: '600',
  },
  pillsRow: {
    marginBottom: 12,
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
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#3c2f1d',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  cardStatus: {
    color: GOLD_SOFT,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    borderWidth: 1,
    borderColor: '#7f5b2e',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#1e1510',
  },
  title: {
    color: '#fff',
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
    marginBottom: 10,
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
  forgotLink: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
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
  socialDivider: {
    marginTop: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2b2b2b',
  },
  socialDividerText: {
    color: '#8f8f8f',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  socialButtonsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 11,
    backgroundColor: '#141414',
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  socialButtonPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.9,
  },
  socialButtonLoading: {
    borderColor: GOLD,
    backgroundColor: '#1f160d',
  },
  socialButtonText: {
    color: '#efe1c8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
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
