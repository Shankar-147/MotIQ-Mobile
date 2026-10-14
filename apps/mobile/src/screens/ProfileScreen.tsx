import { ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../lib/auth';
import { formatPhone } from '../lib/format';
import { colors } from '../lib/theme';
import { Button, Card, Row } from '../components/ui';

// Used for customers and as the fallback for admins.
export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Card>
        {user?.name && <Row label="Name" value={user.name} />}
        <Row label="Mobile number" value={user ? formatPhone(user.phoneNumber) : ''} />
        <Row label="Account" value={user?.role === 'user' ? 'Customer' : (user?.role ?? '')} />
      </Card>
      <Button title="Sign out" variant="plain" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
