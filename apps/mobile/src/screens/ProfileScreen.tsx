import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { formatPhone } from '../lib/format';
import { colors } from '../lib/theme';
import { Button } from '../components/ui';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.label}>Mobile number</Text>
        <Text style={styles.value}>{user ? formatPhone(user.phoneNumber) : ''}</Text>
      </View>
      <Button title="Sign out" variant="plain" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  label: { fontSize: 13, color: colors.muted },
  value: { fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: 4 },
});
