import { View, Text, StyleSheet } from 'react-native';

export default function Client() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Area Cliente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#c59d5f',
    fontSize: 22,
  },
});
