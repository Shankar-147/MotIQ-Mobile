import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, DocumentType, ProviderProfile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatPhone } from '../../lib/format';
import { colors } from '../../lib/theme';
import { usePolling } from '../../lib/usePolling';
import { Button, Card, Chip, ErrorText, Field, Notice, Row, StatusPill } from '../../components/ui';

const DOCUMENTS: { value: DocumentType; label: string }[] = [
  { value: 'driving_license', label: 'Driving licence' },
  { value: 'vehicle_registration', label: 'Vehicle registration' },
  { value: 'id_proof', label: 'ID proof' },
];

export default function ProviderProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [type, setType] = useState<DocumentType>('driving_license');
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = usePolling(async () => {
    try {
      setProfile(await api.providerProfile());
    } catch (e) {
      setError((e as Error).message);
    }
  }, 8000);

  async function addDocument() {
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      await api.addDocument(type, fileUrl.trim());
      setFileUrl('');
      setSaved(true);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Row label="Business" value={profile?.businessName ?? ''} />
        {user?.name && <Row label="Name" value={user.name} />}
        <Row label="Mobile number" value={user ? formatPhone(user.phoneNumber) : ''} />
        <View style={styles.statusRow}>
          <Text style={styles.label}>Verification</Text>
          {profile && <StatusPill status={profile.verification} />}
        </View>
        {profile?.reviewNote && <Text style={styles.note}>Admin note: {profile.reviewNote}</Text>}
      </Card>

      <Text style={styles.heading}>Documents</Text>
      {profile && profile.documents.length === 0 && (
        <Notice>No documents yet. Add at least one so an admin can approve your account.</Notice>
      )}
      {profile?.documents.map((d) => (
        <Card key={d.id}>
          <Text style={styles.docTitle}>{DOCUMENTS.find((x) => x.value === d.type)?.label}</Text>
          <Text style={styles.note}>{d.fileUrl}</Text>
          <Text style={styles.note}>Added {formatDate(d.createdAt)}</Text>
        </Card>
      ))}

      <Text style={styles.heading}>Add a document</Text>
      <View style={styles.chips}>
        {DOCUMENTS.map((d) => (
          <Chip key={d.value} label={d.label} selected={type === d.value} onPress={() => setType(d.value)} />
        ))}
      </View>
      <Field
        label="Link to the photo"
        value={fileUrl}
        onChangeText={setFileUrl}
        placeholder="https://..."
        autoCapitalize="none"
      />
      {error && <ErrorText>{error}</ErrorText>}
      {saved && <Notice>Document added.</Notice>}
      <Button title="Add document" onPress={addDocument} disabled={fileUrl.trim().length < 3} loading={busy} />

      <View style={{ height: 24 }} />
      <Button title="Sign out" variant="plain" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, color: colors.muted },
  note: { fontSize: 13, color: colors.muted, marginTop: 6 },
  heading: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 8, marginBottom: 10 },
  docTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
});
