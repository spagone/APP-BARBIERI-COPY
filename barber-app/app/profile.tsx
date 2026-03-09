import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomBar from '../components/BottomBar';
import { clearUser, getUser, updateUserAvatar } from './store/userStore';

type InfoIcon = 'mail-outline' | 'person-outline' | 'star-outline' | 'storefront-outline' | 'location-outline';

function InfoRow({ icon, label, value }: { icon: InfoIcon; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={14} color={GOLD} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function Page() {
  const router = useRouter();
  const user = getUser();
  const glowAnim = useRef(new Animated.Value(0)).current;

  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState('');
  const [avatarUriLocal, setAvatarUriLocal] = useState(user?.avatarUri ?? '');

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  useEffect(() => {
    setAvatarUriLocal(user?.avatarUri ?? '');
  }, [user?.avatarUri]);

  const isClient = user?.role === 'client';
  const isBarber = user?.role === 'barber';
  const initials = user?.name?.trim().charAt(0).toUpperCase() || 'U';
  const avatarUri = avatarUriLocal || user?.avatarUri || '';

  const pulseScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });
  const pulseOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.62],
  });
  const auraScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.12],
  });
  const roleText = isClient ? 'Account Cliente' : 'Account Barbiere';
  const rolePillText = isClient ? 'Cliente Premium' : 'Barber Pro';
  const roleSubtitle = isClient
    ? 'Gestisci prenotazioni e storico dal tuo spazio personale.'
    : 'Monitora agenda e appuntamenti clienti in tempo reale.';

  const handleLogout = () => {
    clearUser();
    router.replace('/login');
  };

  const openAvatarModal = () => {
    if (!user) return;
    setAvatarDraft(avatarUri);
    setAvatarModalVisible(true);
  };

  const closeAvatarModal = () => {
    setAvatarModalVisible(false);
  };

  const pickAvatarFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permesso negato', 'Consenti l\'accesso alla galleria per scegliere la foto profilo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      setAvatarDraft(result.assets[0].uri);
    } catch {
      Alert.alert('Errore', 'Non sono riuscito ad aprire la galleria. Riprova.');
    }
  };

  const saveAvatar = async () => {
    const next = avatarDraft.trim();

    if (!next) {
      const removeResult = await updateUserAvatar(null);
      if (!removeResult.ok) {
        Alert.alert('Errore', removeResult.message);
        return;
      }

      setAvatarUriLocal('');
      closeAvatarModal();
      return;
    }

    const saveResult = await updateUserAvatar(next);
    if (!saveResult.ok) {
      Alert.alert('Errore', saveResult.message);
      return;
    }

    setAvatarUriLocal(next);
    closeAvatarModal();
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgGlowTop} />
      <Animated.View style={[styles.bgGlowPulse, { opacity: pulseOpacity, transform: [{ scale: auraScale }] }]} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageTopRow}>
          <Text style={styles.pageTitle}>Profilo Premium</Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>Live</Text>
          </View>
        </View>

        {!user ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="sparkles-outline" size={28} color={GOLD} />
            </View>
            <Text style={styles.emptyTitle}>Nessun account attivo</Text>
            <Text style={styles.emptyText}>
              Accedi o registrati per sbloccare l&apos;esperienza premium cliente o barbiere.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>Vai al login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/register')}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryButtonText}>Crea account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Animated.View style={[styles.heroAura, { opacity: pulseOpacity, transform: [{ scale: auraScale }] }]} />

              <View style={styles.heroTopRow}>
                <View style={styles.statusPill}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#7DFF9C" />
                  <Text style={styles.statusPillText}>Account attivo</Text>
                </View>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{rolePillText}</Text>
                </View>
              </View>

              <View style={styles.userHead}>
                <View style={styles.avatarWrap}>
                  <Animated.View style={[styles.avatar, { transform: [{ scale: pulseScale }] }]}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.avatarText}>{initials}</Text>
                    )}
                  </Animated.View>

                  <TouchableOpacity style={styles.avatarEditBtn} onPress={openAvatarModal} activeOpacity={0.9}>
                    <Ionicons name="camera-outline" size={14} color="#111" />
                  </TouchableOpacity>
                </View>

                <View style={styles.userTextWrap}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userRole}>{roleText}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>

              <Text style={styles.heroSub}>{roleSubtitle}</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionCard, styles.actionPrimary]}
                onPress={() => router.push(isClient ? '/booking' : '/barber?activeTab=booking')}
                activeOpacity={0.9}
              >
                <Ionicons name={isClient ? 'calendar-outline' : 'grid-outline'} size={19} color="#111" />
                <Text style={styles.actionPrimaryTitle}>{isClient ? 'Apri Prenotazioni' : 'Vai alla Dashboard'}</Text>
                <Text style={styles.actionPrimarySub}>
                  {isClient ? 'Gestisci i tuoi slot' : 'Controlla la tua agenda'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, styles.actionSecondary]}
                onPress={() => router.push('/history')}
                activeOpacity={0.9}
              >
                <Ionicons name="time-outline" size={18} color={GOLD} />
                <Text style={styles.actionSecondaryTitle}>Storico rapido</Text>
                <Text style={styles.actionSecondarySub}>Passa in un tap alla cronologia</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Dati account</Text>
              <View style={styles.infoBlock}>
                <InfoRow icon="mail-outline" label="Email" value={user.email} />
                <InfoRow icon="person-outline" label="Ruolo" value={isClient ? 'Cliente' : 'Barbiere'} />
                <InfoRow icon="star-outline" label="Stato" value="Attivo" />
              </View>
            </View>

            {isBarber && user.role === 'barber' ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Profilo negozio</Text>
                <View style={styles.infoBlock}>
                  <InfoRow icon="storefront-outline" label="Negozio" value={user.shop.shopName} />
                  <InfoRow icon="location-outline" label="Indirizzo" value={user.shop.shopAddress} />
                  <InfoRow icon="location-outline" label="Citta" value={user.shop.shopCity} />
                </View>
              </View>
            ) : null}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.9}>
              <Ionicons name="log-out-outline" size={16} color="#f3c4c4" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal transparent visible={avatarModalVisible} animationType="fade" onRequestClose={closeAvatarModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeAvatarModal} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Foto profilo</Text>
          <Text style={styles.modalSub}>Scegli una foto dalla galleria del dispositivo.</Text>

          <View style={styles.modalPreviewWrap}>
            {avatarDraft.trim() ? (
              <Image source={{ uri: avatarDraft }} style={styles.modalPreviewImage} resizeMode="cover" />
            ) : (
              <View style={styles.modalPreviewEmpty}>
                <Ionicons name="image-outline" size={30} color={GOLD} />
                <Text style={styles.modalPreviewEmptyText}>Nessuna foto selezionata</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, styles.modalPickerButton]}
            onPress={pickAvatarFromGallery}
            activeOpacity={0.9}
          >
            <Ionicons name="images-outline" size={18} color="#f1f1f1" />
            <Text style={styles.secondaryButtonText}>Scegli dalla galleria</Text>
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.modalActionSecondary]}
              onPress={() => setAvatarDraft('')}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryButtonText}>Rimuovi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, styles.modalActionSecondary]}
              onPress={closeAvatarModal}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryButtonText}>Annulla</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, styles.modalActionPrimary]}
              onPress={saveAvatar}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Salva</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomBar />
    </View>
  );
}

const GOLD = '#c59d5f';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    overflow: 'hidden',
  },
  bgGlowTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.15)',
    top: -92,
    right: -62,
  },
  bgGlowPulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.09)',
    bottom: 170,
    left: -84,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 130,
    gap: 14,
  },
  pageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pageTitle: {
    color: GOLD,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2f2f2f',
    borderRadius: 999,
    backgroundColor: '#141414',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#7DFF9C',
  },
  livePillText: {
    color: '#d4d4d4',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroCard: {
    position: 'relative',
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  heroAura: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: 'rgba(197,157,95,0.18)',
    right: -48,
    top: -82,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(125,255,156,0.3)',
    backgroundColor: 'rgba(125,255,156,0.08)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusPillText: {
    color: '#9effb7',
    fontSize: 12,
    fontWeight: '800',
  },
  rolePill: {
    borderWidth: 1,
    borderColor: '#3a3021',
    backgroundColor: '#1b1510',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  rolePillText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  userHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#221b12',
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: GOLD,
    fontSize: 26,
    fontWeight: '900',
  },
  avatarEditBtn: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 25,
    height: 25,
    borderRadius: 999,
    backgroundColor: GOLD,
    borderWidth: 1,
    borderColor: '#f0cf99',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextWrap: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  userRole: {
    color: '#d8d8d8',
    marginTop: 3,
    fontWeight: '700',
  },
  userEmail: {
    color: '#9c9c9c',
    marginTop: 2,
    fontWeight: '600',
    fontSize: 12,
  },
  heroSub: {
    color: '#b0b0b0',
    lineHeight: 20,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 5,
  },
  actionPrimary: {
    borderColor: GOLD,
    backgroundColor: GOLD,
  },
  actionSecondary: {
    borderColor: '#2f2f2f',
    backgroundColor: '#151515',
  },
  actionPrimaryTitle: {
    color: '#111',
    fontWeight: '900',
    fontSize: 14,
  },
  actionPrimarySub: {
    color: '#2e2415',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
  },
  actionSecondaryTitle: {
    color: '#f2f2f2',
    fontWeight: '900',
    fontSize: 14,
  },
  actionSecondarySub: {
    color: '#9f9f9f',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#171717',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  infoBlock: {
    gap: 10,
  },
  infoRow: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    paddingVertical: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#392f20',
    backgroundColor: '#1b1610',
  },
  infoTextWrap: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: '#878787',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    color: '#f1f1f1',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#171717',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3e3221',
    backgroundColor: '#1d1711',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#f5f5f5',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: '#a8a8a8',
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#111',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#f1f1f1',
    fontWeight: '800',
  },
  logoutButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#553333',
    backgroundColor: '#251818',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  logoutButtonText: {
    color: '#f3c4c4',
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalCard: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '16%',
    backgroundColor: '#131313',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  modalSub: {
    color: '#a4a4a4',
    lineHeight: 18,
  },
  modalPreviewWrap: {
    width: '100%',
    height: 168,
    borderWidth: 1,
    borderColor: '#2f2f2f',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#101010',
  },
  modalPreviewImage: {
    width: '100%',
    height: '100%',
  },
  modalPreviewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalPreviewEmptyText: {
    color: '#a4a4a4',
    fontWeight: '700',
    fontSize: 12,
  },
  modalPickerButton: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  modalActionSecondary: {
    flex: 1,
    marginTop: 0,
  },
  modalActionPrimary: {
    flex: 1,
    marginTop: 0,
  },
});
