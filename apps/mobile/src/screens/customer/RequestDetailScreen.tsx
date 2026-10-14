import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError, ServiceRequest } from '../../lib/api';
import { formatMoney, formatPhone } from '../../lib/format';
import { CANCELLABLE, issueLabel, STATUS_TEXT, STEPS, stepIndex } from '../../lib/labels';
import { colors } from '../../lib/theme';
import { usePolling } from '../../lib/usePolling';
import { Button, Card, ErrorText, Notice, Row, StatusPill } from '../../components/ui';
import { CustomerStackParams } from '../../navigation';

type Props = NativeStackScreenProps<CustomerStackParams, 'RequestDetail'>;

export default function RequestDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = usePolling(async () => {
    try {
      setRequest(await api.getRequest(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, 4000);

  async function act(run: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await run();
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (!request) {
    return (
      <View style={[styles.screen, { padding: 20 }]}>
        <Text style={styles.muted}>{error ?? 'Loading...'}</Text>
      </View>
    );
  }

  const done = stepIndex(request.status);
  const distanceCharge =
    request.fareTotal !== null ? request.fareTotal - request.baseFare : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Card>
        <View style={styles.top}>
          <Text style={styles.title}>{issueLabel(request.issueType)}</Text>
          <StatusPill status={request.status} />
        </View>
        <Text style={styles.status}>{STATUS_TEXT[request.status]}</Text>
        <Text style={styles.muted}>
          {request.areaName}
          {request.vehicle ? ` · ${request.vehicle}` : ''}
        </Text>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}

      {request.status === 'no_provider' && (
        <Notice>No approved provider is online right now. You can try again in a moment.</Notice>
      )}

      {request.status !== 'cancelled' && request.status !== 'no_provider' && (
        <Card>
          {STEPS.map((step) => {
            const reached = done >= stepIndex(step.status);
            return (
              <View key={step.status} style={styles.step}>
                <View style={[styles.dot, reached && styles.dotDone]} />
                <Text style={[styles.stepText, reached && styles.stepTextDone]}>{step.label}</Text>
              </View>
            );
          })}
        </Card>
      )}

      {request.provider && (
        <Card>
          <Text style={styles.section}>Your provider</Text>
          <Row label="Business" value={request.provider.businessName} />
          {request.provider.user.name && <Row label="Name" value={request.provider.user.name} />}
          <Row label="Phone" value={formatPhone(request.provider.user.phoneNumber)} />
          {request.distanceKm !== null && <Row label="Distance" value={`${request.distanceKm} km`} />}
        </Card>
      )}

      {request.fareTotal !== null && (
        <Card>
          <Text style={styles.section}>Fare</Text>
          <Row label="Base fare" value={formatMoney(request.baseFare, 'INR')} />
          {distanceCharge !== null && (
            <Row label={`Distance (${request.distanceKm} km)`} value={formatMoney(distanceCharge, 'INR')} />
          )}
          <Row label="Total" value={formatMoney(request.fareTotal, 'INR')} />
        </Card>
      )}

      {request.status === 'completed' && request.payment && (
        request.payment.status === 'succeeded' ? (
          <Notice>Paid. Thank you!</Notice>
        ) : (
          <Button
            title={`Pay ${formatMoney(request.payment.amount ?? request.fareTotal ?? 0, 'INR')}`}
            loading={busy}
            onPress={() => act(() => api.confirmPayment(request.payment!.id))}
          />
        )
      )}

      {request.status === 'no_provider' && (
        <>
          <Button title="Try again" loading={busy} onPress={() => act(() => api.retryRequest(id))} />
          <View style={{ height: 10 }} />
        </>
      )}

      {CANCELLABLE.includes(request.status) && (
        <>
          <View style={{ height: 6 }} />
          <Button
            title="Cancel request"
            variant="danger"
            loading={busy}
            onPress={() => act(() => api.cancelRequest(id))}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  status: { fontSize: 16, color: colors.ink, marginTop: 10 },
  muted: { fontSize: 14, color: colors.muted, marginTop: 4 },
  section: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.line, marginRight: 12 },
  dotDone: { backgroundColor: colors.brand },
  stepText: { fontSize: 15, color: colors.muted },
  stepTextDone: { color: colors.ink, fontWeight: '600' },
});
