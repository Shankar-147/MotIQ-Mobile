import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError } from '../lib/api';
import { colors } from '../lib/theme';
import { Button, ErrorText, Field } from '../components/ui';
import { AuthStackParams } from '../navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Login'>;

function toE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = phone.replace(/\D/g, '').length >= 10;

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      const phoneNumber = toE164(phone);
      await api.requestOtp(phoneNumber);
      navigation.navigate('Otp', { phoneNumber });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>
          MOT<Text style={{ color: colors.brand }}>IQ</Text>
        </Text>
        <Text style={styles.tagline}>Roadside help, when you need it.</Text>
      </View>

      <Field
        label="Mobile number"
        placeholder="98765 43210"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        autoFocus
      />
      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Get OTP" onPress={sendCode} disabled={!valid} loading={busy} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 36 },
  logo: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  tagline: { fontSize: 16, color: colors.muted, marginTop: 4 },
});
