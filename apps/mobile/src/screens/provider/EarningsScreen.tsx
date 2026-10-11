import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, Earnings } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import { issueLabel } from '../../lib/labels';
import { colors } from '../../lib/theme';
import { usePolling } from '../../lib/usePolling';
import { Card, ErrorText, StatusPill } from '../../components/ui';

export default function EarningsScreen() {
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePolling(async () => {
    try {
      setData(await api.earnings());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, 6000);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      {error && <ErrorText>{error}</ErrorText>}

      <View style={styles.totals}>
        <Card style={styles.total}>
          <Text style={styles.label}>Paid to you</Text>
          <Text style={styles.value}>{formatMoney(data?.paid ?? 0, 'INR')}</Text>
        </Card>
        <Card style={styles.total}>
          <Text style={styles.label}>Waiting for customer</Text>
          <Text style={styles.value}>{formatMoney(data?.waiting ?? 0, 'INR')}</Text>
        </Card>
      </View>

      <Text style={styles.heading}>Jobs</Text>
      {data && data.jobs.length === 0 && <Text style={styles.muted}>No finished jobs yet.</Text>}
      {data?.jobs.map((job) => (
        <Card key={job.id}>
          <View style={styles.top}>
            <Text style={styles.title}>
              {job.request ? issueLabel(job.request.issueType) : 'Job'}
              {job.request?.areaName ? ` · ${job.request.areaName}` : ''}
            </Text>
            <StatusPill status={job.status} />
          </View>
          <Text style={styles.muted}>{formatDate(job.createdAt)}</Text>
          <View style={styles.split}>
            <Text style={styles.muted}>Fare {formatMoney(job.amount, 'INR')}</Text>
            <Text style={styles.muted}>Platform fee {formatMoney(job.commissionAmount, 'INR')}</Text>
          </View>
          <Text style={styles.you}>You earn {formatMoney(job.providerAmount, 'INR')}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  totals: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  total: { flex: 1, marginBottom: 0 },
  label: { fontSize: 13, color: colors.muted },
  value: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 4 },
  heading: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 20, marginBottom: 10 },
  muted: { fontSize: 13, color: colors.muted, marginTop: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink, flex: 1, marginRight: 8 },
  split: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  you: { fontSize: 16, fontWeight: '700', color: colors.brand, marginTop: 8 },
});
