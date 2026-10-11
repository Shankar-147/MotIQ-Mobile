import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatPhone } from '../lib/format';
import { colors } from '../lib/theme';
import { Button, ErrorText, Field } from '../components/ui';
import { AuthStackParams } from '../navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Otp'>;

export default function OtpScreen({ route }: Props) {
  const { phoneNumber } = route.params;
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      const { accessToken } = await api.verifyOtp(phoneNumber, code);
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
    <View style={styles.screen}>
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
      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Verify" onPress={verify} disabled={code.length !== 6} loading={busy} />
      <View style={{ height: 12 }} />
      <Button title="Resend code" variant="plain" onPress={resend} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  copy: { fontSize: 15, color: colors.muted, marginBottom: 24 },
});
