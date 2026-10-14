import { Platform } from 'react-native';
import { tokenStore } from './storage';

// The Android emulator can't see the PC as "localhost".
const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${fallbackHost}:3001/api/v1`;

export type Role = 'user' | 'provider' | 'admin';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type IssueType = 'flat_tyre' | 'battery' | 'fuel' | 'towing' | 'engine' | 'other';
export type RequestStatus =
  | 'requested'
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_provider';
export type DocumentType = 'driving_license' | 'vehicle_registration' | 'id_proof';

export interface Me {
  id: string;
  phoneNumber: string;
  name: string | null;
  role: Role;
}

export interface Area {
  name: string;
  latitude: number;
  longitude: number;
}

export interface Payment {
  id: string;
  userId: string;
  requestId: string | null;
  amount: number;
  commissionAmount: number;
  providerAmount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  issueType: IssueType;
  status: RequestStatus;
  areaName: string | null;
  vehicle: string | null;
  description: string | null;
  baseFare: number;
  distanceKm: number | null;
  fareTotal: number | null;
  createdAt: string;
  provider?: {
    id: string;
    businessName: string;
    areaName: string | null;
    user: { name: string | null; phoneNumber: string };
  } | null;
  customer?: { name: string | null; phoneNumber?: string };
  payment?: { id: string; status: PaymentStatus; amount?: number } | null;
}

export interface ProviderProfile {
  id: string;
  businessName: string;
  verification: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  online: boolean;
  areaName: string | null;
  documents: { id: string; type: DocumentType; fileUrl: string; createdAt: string }[];
}

export interface Earnings {
  paid: number;
  waiting: number;
  jobs: {
    id: string;
    status: PaymentStatus;
    amount: number;
    providerAmount: number;
    commissionAmount: number;
    createdAt: string;
    request?: { issueType: IssueType; areaName: string | null; completedAt: string | null };
  }[];
}

export interface SignupDetails {
  role?: 'user' | 'provider';
  name?: string;
  businessName?: string;
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

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  // account
  requestOtp: (phoneNumber: string) => request<void>('/auth/otp/request', post({ phoneNumber })),
  verifyOtp: (phoneNumber: string, code: string, signup: SignupDetails = {}) =>
    request<{ accessToken: string }>('/auth/otp/verify', post({ phoneNumber, code, ...signup })),
  me: () => request<Me>('/auth/me'),
  areas: () => request<Area[]>('/areas'),

  // customer
  createRequest: (body: {
    issueType: IssueType;
    areaName: string;
    vehicle?: string;
    description?: string;
  }) => request<ServiceRequest>('/requests', post(body)),
  myRequests: () => request<ServiceRequest[]>('/requests'),
  getRequest: (id: string) => request<ServiceRequest>(`/requests/${id}`),
  cancelRequest: (id: string) => request<ServiceRequest>(`/requests/${id}/cancel`, post()),
  retryRequest: (id: string) => request<ServiceRequest>(`/requests/${id}/retry`, post()),

  // payments
  payments: () => request<Payment[]>('/payments'),
  payment: (id: string) => request<Payment>(`/payments/${id}`),
  confirmPayment: (id: string) => request<Payment>(`/payments/${id}/confirm`, post()),

  // provider
  providerProfile: () => request<ProviderProfile>('/providers/me'),
  addDocument: (type: DocumentType, fileUrl: string) =>
    request<unknown>('/providers/me/documents', post({ type, fileUrl })),
  setPresence: (online: boolean, areaName?: string) =>
    request<ProviderProfile>('/providers/me/presence', {
      method: 'PATCH',
      body: JSON.stringify({ online, areaName }),
    }),
  currentJobs: () =>
    request<{ offer: ServiceRequest | null; active: ServiceRequest | null }>(
      '/providers/me/jobs/current',
    ),
  jobHistory: () => request<ServiceRequest[]>('/providers/me/jobs/history'),
  acceptJob: (id: string) => request<ServiceRequest>(`/providers/me/jobs/${id}/accept`, post()),
  rejectJob: (id: string) => request<unknown>(`/providers/me/jobs/${id}/reject`, post()),
  setJobStatus: (id: string, status: 'en_route' | 'arrived' | 'in_progress' | 'completed') =>
    request<ServiceRequest>(`/providers/me/jobs/${id}/status`, post({ status })),
  earnings: () => request<Earnings>('/providers/me/earnings'),
};
