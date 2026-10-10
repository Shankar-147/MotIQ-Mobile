import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError, Payment } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import { colors } from '../lib/theme';
import { Button, ErrorText, StatusPill } from '../components/ui';
import { PaymentsStackParams } from '../navigation';

type Props = NativeStackScreenProps<PaymentsStackParams, 'PaymentDetail'>;

export default function PaymentDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.payment(id).then(setPayment).catch((e) => setError(e.message));
  }, [id]);

  async function confirm() {
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
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={colors.brand} />}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.amount}>{formatMoney(payment.amount, payment.currency)}</Text>
        <StatusPill status={payment.status} />
        <View style={styles.divider} />
        <Detail label="Created" value={formatDate(payment.createdAt)} />
        <Detail label="Reference" value={payment.id.slice(0, 8).toUpperCase()} />
      </View>

      {error && <ErrorText>{error}</ErrorText>}
      {payment.status === 'pending' && (
        <>
          <Button title="Confirm payment" onPress={confirm} loading={busy} />
          <Text style={styles.note}>
            Card/UPI checkout isn&apos;t connected yet, so this confirms the payment directly.
          </Text>
        </>
      )}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  amount: { fontSize: 32, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 16 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 14, color: colors.muted },
  detailValue: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  note: { fontSize: 12, color: colors.muted, marginTop: 10, textAlign: 'center' },
});
