const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'motiq_token';

export type Role = 'user' | 'provider' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type Verification = 'pending' | 'approved' | 'rejected';
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
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Me {
  id: string;
  phoneNumber: string;
  name: string | null;
  role: Role;
}

export interface User {
  id: string;
  phoneNumber: string;
  name: string | null;
  role: Role;
  status: UserStatus;
  suspendedAt: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface AdminPayment extends Payment {
  user: { phoneNumber: string; name: string | null };
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProviderRow {
  id: string;
  businessName: string;
  verification: Verification;
  online: boolean;
  areaName: string | null;
  createdAt: string;
  user: { phoneNumber: string; name: string | null };
  _count: { documents: number };
}

export interface ProviderDetail {
  id: string;
  businessName: string;
  verification: Verification;
  reviewNote: string | null;
  online: boolean;
  areaName: string | null;
  user: { phoneNumber: string; name: string | null };
  documents: { id: string; type: string; fileUrl: string; createdAt: string }[];
}

export interface RequestRow {
  id: string;
  issueType: string;
  status: RequestStatus;
  areaName: string | null;
  distanceKm: number | null;
  fareTotal: number | null;
  baseFare: number;
  createdAt: string;
  customer: { name: string | null; phoneNumber: string };
  provider: { businessName: string } | null;
}

export interface Stats {
  users: Record<UserStatus, number>;
  payments: {
    counts: Record<PaymentStatus, number>;
    collected: { currency: string; amount: number; commission: number }[];
  };
  requests: Record<RequestStatus, number>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (value: string) => localStorage.setItem(TOKEN_KEY, value),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const saved = token.get();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(saved ? { Authorization: `Bearer ${saved}` } : {}),
      },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
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

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  requestOtp: (phoneNumber: string) => request<void>('/auth/otp/request', post({ phoneNumber })),
  verifyOtp: (phoneNumber: string, code: string, name?: string) =>
    request<{ accessToken: string }>('/auth/otp/verify', post({ phoneNumber, code, name })),
  me: () => request<Me>('/auth/me'),
  updateName: (name: string) =>
    request<Me>('/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) }),

  myPayments: () => request<Payment[]>('/payments'),
  createPayment: (amount: number, currency: string) =>
    request<Payment>('/payments', post({ amount, currency })),
  confirmPayment: (id: string) => request<Payment>(`/payments/${id}/confirm`, post()),

  stats: () => request<Stats>('/admin/stats'),
  users: (params: { search?: string; status?: string; page?: number }) =>
    request<Page<User>>(`/admin/users${query({ ...params, pageSize: 10 })}`),
  setUserStatus: (id: string, status: UserStatus) =>
    request<User>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  allPayments: (params: { status?: string; page?: number }) =>
    request<Page<AdminPayment>>(`/admin/payments${query({ ...params, pageSize: 10 })}`),
  refund: (id: string) => request<Payment>(`/admin/payments/${id}/refund`, post()),
  audit: (page: number) => request<Page<AuditEntry>>(`/admin/audit${query({ page, pageSize: 15 })}`),

  providers: (params: { verification?: string; page?: number }) =>
    request<Page<ProviderRow>>(`/admin/providers${query({ ...params, pageSize: 10 })}`),
  provider: (id: string) => request<ProviderDetail>(`/admin/providers/${id}`),
  reviewProvider: (id: string, decision: 'approved' | 'rejected', note?: string) =>
    request<ProviderDetail>(`/admin/providers/${id}/review`, post({ decision, note })),
  requests: (params: { status?: string; page?: number }) =>
    request<Page<RequestRow>>(`/admin/requests${query({ ...params, pageSize: 10 })}`),
};
