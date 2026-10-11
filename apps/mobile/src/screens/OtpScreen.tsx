import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatPhone } from '../lib/format';
import { colors } from '../lib/theme';
import { Button, Chip, ErrorText, Field } from '../components/ui';
import { AuthStackParams } from '../navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Otp'>;

export default function OtpScreen({ route }: Props) {
  const { phoneNumber } = route.params;
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [role, setRole] = useState<'user' | 'provider'>('user');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      const { accessToken } = await api.verifyOtp(phoneNumber, code, {
        role,
        name: name.trim() || undefined,
        businessName: role === 'provider' ? businessName.trim() || undefined : undefined,
      });
      // signing in swaps the navigator, so there's nothing to navigate to here
      await signIn(accessToken);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await api.requestOtp(phoneNumber);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend the code');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.copy}>Enter the 6-digit code sent to {formatPhone(phoneNumber)}.</Text>
      <Field
        label="OTP"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
        autoFocus
        style={{ letterSpacing: 8, fontSize: 22 }}
      />

      <Text style={styles.section}>New to MotIQ? Tell us how you will use it.</Text>
      <View style={styles.chips}>
        <Chip label="I need help on the road" selected={role === 'user'} onPress={() => setRole('user')} />
        <Chip label="I am a service provider" selected={role === 'provider'} onPress={() => setRole('provider')} />
      </View>
      <Field label="Your name" value={name} onChangeText={setName} placeholder="Only for a new account" />
      {role === 'provider' && (
        <Field
          label="Business name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="e.g. Asha Auto Care"
        />
      )}
      <Text style={styles.note}>
        Already have an account? Just enter the code. These choices only apply the first time.
      </Text>

      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Verify" onPress={verify} disabled={code.length !== 6} loading={busy} />
      <View style={{ height: 12 }} />
      <Button title="Resend code" variant="plain" onPress={resend} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  copy: { fontSize: 15, color: colors.muted, marginBottom: 24 },
  section: { fontSize: 15, fontWeight: '600', color: colors.ink, marginTop: 8, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  note: { fontSize: 13, color: colors.muted, marginBottom: 16 },
});
