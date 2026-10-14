import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, ServiceRequest } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatMoney } from '../../lib/format';
import { FINISHED, issueLabel, STATUS_TEXT } from '../../lib/labels';
import { colors } from '../../lib/theme';
import { usePolling } from '../../lib/usePolling';
import { Button, Card, ErrorText, StatusPill } from '../../components/ui';
import { CustomerStackParams } from '../../navigation';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParams>>();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePolling(async () => {
    try {
      setRequests(await api.myRequests());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, 5000);

  // The newest request that is still going.
  const current = requests?.find((r) => !FINISHED.includes(r.status));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.hello}>Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
      <Text style={styles.sub}>Stuck on the road? We will send the nearest verified provider.</Text>

      {error && <ErrorText>{error}</ErrorText>}

      {current ? (
        <Pressable onPress={() => navigation.navigate('RequestDetail', { id: current.id })}>
          <Card>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{issueLabel(current.issueType)}</Text>
              <StatusPill status={current.status} />
            </View>
            <Text style={styles.status}>{STATUS_TEXT[current.status]}</Text>
            {current.provider && (
              <Text style={styles.meta}>
                {current.provider.businessName}
                {current.distanceKm !== null ? ` · ${current.distanceKm} km away` : ''}
              </Text>
            )}
            {current.fareTotal !== null && (
              <Text style={styles.meta}>Fare {formatMoney(current.fareTotal, 'INR')}</Text>
            )}
            <Text style={styles.link}>View details</Text>
          </Card>
        </Pressable>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>No request in progress</Text>
          <Text style={styles.meta}>Tell us what happened and where you are.</Text>
        </Card>
      )}

      <View style={{ height: 8 }} />
      <Button title="Request roadside help" onPress={() => navigation.navigate('NewRequest')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hello: { fontSize: 26, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 20 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  status: { fontSize: 15, color: colors.ink, marginTop: 8 },
  meta: { fontSize: 14, color: colors.muted, marginTop: 4 },
  link: { fontSize: 14, color: colors.brand, fontWeight: '600', marginTop: 10 },
});
