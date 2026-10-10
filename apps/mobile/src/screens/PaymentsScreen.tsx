import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, Payment } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import { colors } from '../lib/theme';
import { Button, ErrorText, StatusPill } from '../components/ui';
import { PaymentsStackParams } from '../navigation';

type Props = NativeStackScreenProps<PaymentsStackParams, 'PaymentsList'>;

export default function PaymentsScreen({ navigation }: Props) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPayments(await api.payments());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // reload whenever the tab/screen comes back into view (e.g. after paying)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      {error && (
        <View style={{ padding: 16, paddingBottom: 0 }}>
          <ErrorText>{error}</ErrorText>
        </View>
      )}
      <FlatList
        data={payments ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          payments ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyCopy}>Payments you create will show up here.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('PaymentDetail', { id: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.amount}>{formatMoney(item.amount, item.currency)}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            <StatusPill status={item.status} />
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Button title="New payment" onPress={() => navigation.navigate('NewPayment')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  amount: { fontSize: 18, fontWeight: '700', color: colors.ink },
  date: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  emptyCopy: { fontSize: 14, color: colors.muted, marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
});
