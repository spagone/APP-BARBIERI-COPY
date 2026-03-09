import { useState } from 'react';
import {
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
import { requestPasswordResetEmail } from './store/userStore';

const GOLD = '#c59d5f';
const BG = '#080808';
const CARD = '#111111';
const BORDER = '#3c2f1d';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidEmail = email.trim().length > 3;

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage('Inserisci la tua email.');
      setSuccessMessage('');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const result = await requestPasswordResetEmail(normalizedEmail);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    setSuccessMessage('Email inviata. Controlla inbox/spam: troverai la key per reset password.');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>MY BARBER</Text>
              <Text style={styles.brandSub}>Recupero Accesso</Text>
            </View>
            <Pressable style={styles.headerChip} onPress={() => router.back()}>
              <Text style={styles.headerChipText}>Indietro</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.kicker}>Reset Password</Text>
            <Text style={styles.title}>Inserisci solo la tua email</Text>
            <Text style={styles.subtitle}>
              Ti inviamo una key di sicurezza valida per 15 minuti per reimpostare la password.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email account</Text>
              <View style={styles.inputShell}>
                <MaterialCommunityIcons name="email-outline" size={18} color="#b69458" />
                <TextInput
                  placeholder="nome@esempio.com"
                  placeholderTextColor="#737373"
                  style={styles.input}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errorMessage) setErrorMessage('');
                    if (successMessage) setSuccessMessage('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#d9a35f" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={16} color="#8dc88e" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                (!isValidEmail || isSubmitting) && styles.submitButtonDisabled,
                pressed && isValidEmail && !isSubmitting && styles.submitButtonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!isValidEmail || isSubmitting}>
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Invio in corso...' : 'Invia key reset via email'}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Torna al login</Text>
            </Pressable>
          </View>
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
    paddingVertical: 24,
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
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 18,
  },
  kicker: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 29,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    marginBottom: 4,
  },
  subtitle: {
    color: '#cfcfcf',
    fontSize: 13,
    lineHeight: 20,
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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    color: '#e0b47b',
    fontSize: 12,
    lineHeight: 17,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  successText: {
    flex: 1,
    color: '#8dc88e',
    fontSize: 12,
    lineHeight: 17,
  },
  submitButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonPressed: {
    transform: [{ scale: 0.992 }],
  },
  submitButtonText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  loginLink: {
    marginTop: 12,
    color: GOLD,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
});
