import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function RoleScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scegli il tuo ruolo</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/client')}
      >
        <Text style={styles.cardTitle}>Cliente</Text>
        <Text style={styles.cardSubtitle}>Prenota appuntamenti</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/barber')}
      >
        <Text style={styles.cardTitle}>Barbiere</Text>
        <Text style={styles.cardSubtitle}>Gestisci appuntamenti</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#c59d5f',
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#222',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#c59d5f',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#ccc',
    marginTop: 5,
  },
});
