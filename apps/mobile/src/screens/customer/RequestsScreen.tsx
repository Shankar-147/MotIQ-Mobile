import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, ServiceRequest } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import { issueLabel } from '../../lib/labels';
import { colors } from '../../lib/theme';
import { usePolling } from '../../lib/usePolling';
import { ErrorText, StatusPill } from '../../components/ui';
import { CustomerStackParams } from '../../navigation';

export default function RequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParams>>();
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = usePolling(async () => {
    try {
      setRequests(await api.myRequests());
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
        data={requests ?? []}
        keyExtractor={(r) => r.id}
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
          requests ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyCopy}>Requests you make will show up here.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('RequestDetail', { id: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{issueLabel(item.issueType)}</Text>
              <Text style={styles.meta}>
                {item.areaName} · {formatDate(item.createdAt)}
              </Text>
              {item.fareTotal !== null && (
                <Text style={styles.meta}>{formatMoney(item.fareTotal, 'INR')}</Text>
              )}
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
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  emptyCopy: { fontSize: 14, color: colors.muted, marginTop: 4 },
});
