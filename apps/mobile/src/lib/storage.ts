import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'motiq_token';

// SecureStore doesn't exist on web, so fall back to localStorage there.
export const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return window.localStorage.getItem(KEY);
    return SecureStore.getItemAsync(KEY);
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') return window.localStorage.setItem(KEY, token);
    await SecureStore.setItemAsync(KEY, token);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') return window.localStorage.removeItem(KEY);
    await SecureStore.deleteItemAsync(KEY);
  },
};
