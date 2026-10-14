import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { api, ApiError, Area, ProviderProfile, ServiceRequest } from '../../lib/api';
import { formatMoney, formatPhone } from '../../lib/format';
import { issueLabel, NEXT_JOB_STEP, STATUS_TEXT } from '../../lib/labels';
import { colors } from '../../lib/theme';
import { usePolling } from '../../lib/usePolling';
import { Button, Card, Chip, ErrorText, Notice, Row, StatusPill } from '../../components/ui';

export default function JobsScreen() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [area, setArea] = useState<string | null>(null);
  const [offer, setOffer] = useState<ServiceRequest | null>(null);
  const [active, setActive] = useState<ServiceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.areas().then(setAreas).catch(() => undefined);
  }, []);

  const reload = usePolling(async () => {
    try {
      const [p, jobs] = await Promise.all([api.providerProfile(), api.currentJobs()]);
      setProfile(p);
      setOffer(jobs.offer);
      setActive(jobs.active);
      setArea((current) => current ?? p.areaName);
      setError(null);
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

  if (!profile) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>{error ?? 'Loading...'}</Text>
      </View>
    );
  }

  const next = active ? NEXT_JOB_STEP[active.status] : undefined;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.business}>{profile.businessName}</Text>

      {profile.verification === 'pending' && (
        <Notice>
          Your account is waiting for approval. Add your documents in the Profile tab so an admin can review
          them. You can go online once you are approved.
        </Notice>
      )}
      {profile.verification === 'rejected' && (
        <ErrorText>
          Your application was not approved{profile.reviewNote ? `: ${profile.reviewNote}` : '.'}
        </ErrorText>
      )}
      {error && <ErrorText>{error}</ErrorText>}

      {profile.verification === 'approved' && (
        <Card>
          <View style={styles.presence}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{profile.online ? 'You are online' : 'You are offline'}</Text>
              <Text style={styles.muted}>
                {profile.online
                  ? `Waiting in ${profile.areaName}`
                  : 'Go online to receive requests near you'}
              </Text>
            </View>
            <Switch
              value={profile.online}
              disabled={busy || (!profile.online && !area)}
              onValueChange={(value) => act(() => api.setPresence(value, area ?? undefined))}
              trackColor={{ false: colors.line, true: colors.brand }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.label}>Where are you waiting?</Text>
          <View style={styles.chips}>
            {areas.map((a) => (
              <Chip
                key={a.name}
                label={a.name}
                selected={area === a.name}
                onPress={() => {
                  setArea(a.name);
                  // Moving while online updates the location straight away.
                  if (profile.online) act(() => api.setPresence(true, a.name));
                }}
              />
            ))}
          </View>
        </Card>
      )}

      {offer && (
        <Card style={{ borderColor: colors.brand, borderWidth: 2 }}>
          <Text style={styles.offerTag}>New request</Text>
          <View style={styles.top}>
            <Text style={styles.cardTitle}>{issueLabel(offer.issueType)}</Text>
            <Text style={styles.fare}>{formatMoney(offer.fareTotal ?? offer.baseFare, 'INR')}</Text>
          </View>
          <Row label="Customer" value={offer.customer?.name ?? 'Customer'} />
          <Row label="Location" value={offer.areaName ?? ''} />
          {offer.distanceKm !== null && <Row label="Distance" value={`${offer.distanceKm} km from you`} />}
          {offer.vehicle && <Row label="Vehicle" value={offer.vehicle} />}
          <View style={{ height: 8 }} />
          <Button title="Accept" loading={busy} onPress={() => act(() => api.acceptJob(offer.id))} />
          <View style={{ height: 8 }} />
          <Button title="Decline" variant="plain" loading={busy} onPress={() => act(() => api.rejectJob(offer.id))} />
        </Card>
      )}

      {active && (
        <Card>
          <View style={styles.top}>
            <Text style={styles.cardTitle}>Current job</Text>
            <StatusPill status={active.status} />
          </View>
          <Text style={styles.status}>{STATUS_TEXT[active.status]}</Text>
          <Row label="Problem" value={issueLabel(active.issueType)} />
          <Row label="Customer" value={active.customer?.name ?? 'Customer'} />
          {active.customer?.phoneNumber && (
            <Row label="Phone" value={formatPhone(active.customer.phoneNumber)} />
          )}
          <Row label="Location" value={active.areaName ?? ''} />
          <Row label="Fare" value={formatMoney(active.fareTotal ?? active.baseFare, 'INR')} />
          {next && (
            <>
              <View style={{ height: 8 }} />
              <Button
                title={next.label}
                loading={busy}
                onPress={() => act(() => api.setJobStatus(active.id, next.status))}
              />
            </>
          )}
        </Card>
      )}

      {profile.verification === 'approved' && profile.online && !offer && !active && (
        <Card>
          <Text style={styles.cardTitle}>Waiting for requests</Text>
          <Text style={styles.muted}>New requests near {profile.areaName} will appear here.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  business: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 16 },
  presence: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 14, color: colors.muted, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  fare: { fontSize: 18, fontWeight: '800', color: colors.brand },
  offerTag: { fontSize: 12, fontWeight: '700', color: colors.brand, textTransform: 'uppercase', marginBottom: 6 },
  status: { fontSize: 15, color: colors.ink, marginBottom: 12 },
});
