import { Platform } from 'react-native';
import { tokenStore } from './storage';

// The Android emulator can't see the PC as "localhost".
const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${fallbackHost}:3001/api/v1`;

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type Currency = 'INR' | 'USD';

export interface Me {
  id: string;
  phoneNumber: string;
  role: 'user' | 'admin';
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection.");
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(res.status, message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  requestOtp: (phoneNumber: string) =>
    request<void>('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),
  verifyOtp: (phoneNumber: string, code: string) =>
    request<{ accessToken: string }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    }),
  me: () => request<Me>('/auth/me'),
  payments: () => request<Payment[]>('/payments'),
  payment: (id: string) => request<Payment>(`/payments/${id}`),
  createPayment: (amount: number, currency: Currency) =>
    request<Payment>('/payments', { method: 'POST', body: JSON.stringify({ amount, currency }) }),
  confirmPayment: (id: string) => request<Payment>(`/payments/${id}/confirm`, { method: 'POST' }),
};
