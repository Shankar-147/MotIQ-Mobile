import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, Payment } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import { colors } from '../../lib/theme';
import { usePolling } from '../../lib/usePolling';
import { ErrorText, StatusPill } from '../../components/ui';
import { CustomerStackParams } from '../../navigation';

export default function PaymentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParams>>();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = usePolling(async () => {
    try {
      setPayments(await api.payments());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, 6000);

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          payments ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyCopy}>A bill appears here when a provider finishes your job.</Text>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  emptyCopy: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },
});
