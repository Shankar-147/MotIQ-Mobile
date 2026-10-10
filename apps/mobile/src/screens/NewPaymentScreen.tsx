import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError, Currency } from '../lib/api';
import { colors } from '../lib/theme';
import { Button, ErrorText, Field } from '../components/ui';
import { PaymentsStackParams } from '../navigation';

type Props = NativeStackScreenProps<PaymentsStackParams, 'NewPayment'>;

const CURRENCIES: Currency[] = ['INR', 'USD'];

// "499.50" -> 49950, or null if it isn't a valid amount with at most 2 decimals
function toMinorUnits(text: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(text.trim())) return null;
  const value = Math.round(parseFloat(text) * 100);
  return value > 0 ? value : null;
}

export default function NewPaymentScreen({ navigation }: Props) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minor = toMinorUnits(amount);

  async function submit() {
    if (minor === null) return;
    setError(null);
    setBusy(true);
    try {
      const payment = await api.createPayment(minor, currency);
      navigation.replace('PaymentDetail', { id: payment.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Currency</Text>
      <View style={styles.segment}>
        {CURRENCIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCurrency(c)}
            style={[styles.segmentItem, currency === c && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, currency === c && { color: '#fff' }]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Field
        label="Amount"
        placeholder="499.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        autoFocus
      />
      {amount !== '' && minor === null && (
        <Text style={styles.hint}>Enter an amount like 499 or 499.50</Text>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Create payment" onPress={submit} disabled={minor === null} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  segment: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  segmentActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.ink },
  hint: { fontSize: 13, color: colors.muted, marginTop: -8, marginBottom: 16 },
});
