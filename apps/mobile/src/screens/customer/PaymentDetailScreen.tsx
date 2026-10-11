import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError, Payment } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import { colors } from '../../lib/theme';
import { Button, Card, ErrorText, Row, StatusPill } from '../../components/ui';
import { CustomerStackParams } from '../../navigation';

type Props = NativeStackScreenProps<CustomerStackParams, 'PaymentDetail'>;

export default function PaymentDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.payment(id).then(setPayment).catch((e) => setError(e.message));
  }, [id]);

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      setPayment(await api.confirmPayment(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (!payment) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.brand} />}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Card>
        <Text style={styles.amount}>{formatMoney(payment.amount, payment.currency)}</Text>
        <StatusPill status={payment.status} />
      </Card>

      <Card>
        <Row label="Created" value={formatDate(payment.createdAt)} />
        <Row label="Reference" value={payment.id.slice(0, 8).toUpperCase()} />
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      {payment.status === 'pending' && (
        <>
          <Button title="Pay now" onPress={pay} loading={busy} />
          <Text style={styles.note}>
            Card and UPI checkout is not connected yet, so this marks the bill as paid.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  amount: { fontSize: 30, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  note: { fontSize: 12, color: colors.muted, marginTop: 10, textAlign: 'center' },
});
