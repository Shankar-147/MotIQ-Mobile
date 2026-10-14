import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError, Area, IssueType } from '../../lib/api';
import { ISSUES } from '../../lib/labels';
import { colors } from '../../lib/theme';
import { Button, Chip, ErrorText, Field, Notice } from '../../components/ui';
import { CustomerStackParams } from '../../navigation';

type Props = NativeStackScreenProps<CustomerStackParams, 'NewRequest'>;

export default function NewRequestScreen({ navigation }: Props) {
  const [issue, setIssue] = useState<IssueType | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [area, setArea] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.areas().then(setAreas).catch((e) => setError(e.message));
  }, []);

  async function submit() {
    if (!issue || !area) return;
    setError(null);
    setBusy(true);
    try {
      const created = await api.createRequest({
        issueType: issue,
        areaName: area,
        vehicle: vehicle.trim() || undefined,
        description: description.trim() || undefined,
      });
      navigation.replace('RequestDetail', { id: created.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>What happened?</Text>
      <View style={styles.chips}>
        {ISSUES.map((i) => (
          <Chip key={i.value} label={i.label} selected={issue === i.value} onPress={() => setIssue(i.value)} />
        ))}
      </View>

      <Text style={styles.heading}>Where are you?</Text>
      <View style={styles.chips}>
        {areas.map((a) => (
          <Chip key={a.name} label={a.name} selected={area === a.name} onPress={() => setArea(a.name)} />
        ))}
      </View>

      <Field label="Vehicle (optional)" value={vehicle} onChangeText={setVehicle} placeholder="e.g. Maruti Swift" />
      <Field
        label="Anything else we should know? (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ minHeight: 70, textAlignVertical: 'top' }}
      />

      <Notice>
        The fare is a base price for the problem plus Rs 10 for every kilometre the provider travels. You
        will see the exact amount once a provider is matched.
      </Notice>
      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Find a provider" onPress={submit} disabled={!issue || !area} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  heading: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
});
