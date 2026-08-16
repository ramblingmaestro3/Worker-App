import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

let apiBaseUrl = ENV_API_BASE_URL ? ENV_API_BASE_URL.replace(/\/$/, '') : DEFAULT_API_BASE_URL;
console.log('API Base URL:', apiBaseUrl, 'Platform:', Platform.OS);
let accessToken: string | null = null;
let refreshToken: string | null = null;

type AuthListener = (authenticated: boolean) => void;
const authListeners = new Set<AuthListener>();

export function onAuthChange(listener: AuthListener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

export function configureApi(baseUrl: string) {
  apiBaseUrl = baseUrl.replace(/\/$/, '');
}

export function setAuthSession(tokens?: { access_token?: string; refresh_token?: string }) {
  accessToken = tokens?.access_token ?? null;
  refreshToken = tokens?.refresh_token ?? null;
  authListeners.forEach(listener => listener(!!accessToken));
}

export function clearAuthSession() {
  accessToken = null;
  refreshToken = null;
  authListeners.forEach(listener => listener(false));
}

export function getAccessToken() {
  return accessToken;
}

export function getSocketBaseUrl() {
  return apiBaseUrl.replace(/\/api$/, '');
}

async function uploadJobImage(uri: string, mimeType?: string | null, fileName?: string | null) {
  const formData = new FormData();
  formData.append('image', {
    uri,
    name: fileName || `job-image.${mimeType?.split('/')[1] || 'jpg'}`,
    type: mimeType || 'image/jpeg',
  } as any);
  const response = await fetch(`${apiBaseUrl}/bookings/uploads`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<{ url: string }>;
  if (!response.ok || payload.success === false || !payload.data?.url) {
    throw new Error(payload.error || payload.message || 'Photo upload failed');
  }
  return payload.data.url;
}

export type AIProblemAssessment = {
  title: string;
  description: string;
  confidence: number;
  is_hazard?: boolean;
  hazard_warning?: string | null;
  quality_issue?: string | null;
};

export type AIWorkerRecommendation = {
  category: string;
  confidence: number;
  reason: string;
};

export type AIAnalysisResult = {
  problem: AIProblemAssessment | null;
  recommendations: AIWorkerRecommendation[];
};

async function analyzeProblem(
  uri: string,
  description?: string,
  mimeType?: string | null,
  fileName?: string | null
): Promise<AIAnalysisResult> {
  const formData = new FormData();
  formData.append('image', {
    uri,
    name: fileName || `problem-photo.${mimeType?.split('/')[1] || 'jpg'}`,
    type: mimeType || 'image/jpeg',
  } as any);
  if (description) formData.append('description', description);

  const response = await fetch(`${apiBaseUrl}/ai/analyze`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<AIAnalysisResult>;
  if (!response.ok || payload.success === false || !payload.data) {
    throw new Error(payload.error || payload.message || 'Could not analyze this photo right now.');
  }
  return payload.data;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const url = `${apiBaseUrl}${path}`;
  console.log('API Request:', url, options.method || 'GET');

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    console.log('API Response status:', response.status);

    const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
    console.log('API Response payload:', payload);

    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
    }

    return (payload.data ?? payload) as T;
  } catch (error) {
    console.error('API Request error:', error);
    throw error;
  }
}

export const api = {
  uploadJobImage,
  analyzeProblem,
  login: (payload: { credential: string; password: string; role?: 'customer' | 'worker' }) =>
    request<{ user: any; tokens: { access_token: string; refresh_token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: { name: string; email: string; password: string; role: 'client' | 'worker' }) =>
    request<{ user: any; tokens: { access_token: string; refresh_token: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProfile: (payload: { name: string; email: string; phone: string; city: string }) =>
    request<{ user: any }>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: any }>('/users/me'),

  createWorkerProfile: (payload: {
    skills: string[];
    bio: string;
    rate: string;
    idUploaded: boolean;
  }) =>
    request<{ worker: any }>('/workers/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyWorkerProfile: () => request<{ worker: any }>('/workers/me'),

  updateWorkerProfile: (payload: {
    occupation: string;
    skills: string[];
    bio: string;
    rate: string;
    idUploaded: boolean;
    service_category_id?: number;
  }) =>
    request<{ worker: any }>('/workers/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  searchWorkers: (params: Record<string, string | number | boolean | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
    return request<{ items: any[]; page: number; per_page: number; total: number }>(
      `/workers/search?${query.toString()}`
    );
  },

  getWorker: (workerId: number) => request<{ worker: any }>(`/workers/${workerId}`),

  getTopWorkers: (params: { limit?: number; category?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
    return request<{ workers: any[] }>(`/workers/top?${query.toString()}`);
  },

  getWorkerReviews: (workerId: number, page = 1, perPage = 10) =>
    request<{ items: any[]; pagination: any }>(`/reviews/worker/${workerId}?page=${page}&per_page=${perPage}`),

  createJobRequest: (payload: {
    service: string;
    desc: string;
    photos: string[];
    location: string;
    date: string;
    time: string;
    urgency?: string;
  }) =>
    request<{ job_request: any; matches: any }>('/bookings/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  hireWorker: (payload: {
    workerId: number;
    service: string;
    desc: string;
    photos: string[];
    location: string;
    date: string;
    time: string;
    urgency?: string;
  }) =>
    request<{ booking: any }>('/bookings', {
      method: 'POST',
      body: JSON.stringify({ worker_id: payload.workerId, ...payload }),
    }),

  getMyBookings: (params: { role?: 'customer' | 'worker'; status?: string; page?: number; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
    return request<{ items: any[]; pagination: any }>(`/bookings/my?${query.toString()}`);
  },

  getOpenJobRequests: (params: { page?: number; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
    return request<{ items: any[]; pagination: any }>(`/bookings/open?${query.toString()}`);
  },

  getBooking: (bookingId: number) => request<{ booking: any }>(`/bookings/${bookingId}`),

  getServices: () => request<{ items: any[]; pagination: any }>('/services?per_page=50'),

  acceptBooking: (bookingId: number) =>
    request<{ booking: any }>(`/bookings/${bookingId}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  rejectBooking: (bookingId: number, reason?: string) =>
    request<void>(`/bookings/${bookingId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  cancelBooking: (bookingId: number, reason?: string) =>
    request<{ booking: any }>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getConversations: (page = 1, perPage = 20) =>
    request<{ items: any[]; pagination: any }>(`/conversations?page=${page}&per_page=${perPage}`),

  getConversationMessages: (conversationId: number, page = 1, perPage = 50) =>
    request<{ conversation: any; items: any[]; pagination: any }>(`/conversations/${conversationId}/messages?page=${page}&per_page=${perPage}`),

  sendMessage: (payload: { receiverId?: number; conversationId?: number; message: string; messageType?: string }) =>
    request<{ message: any }>('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  markMessageRead: (messageId: number) => request<{ message: any }>(`/messages/${messageId}/read`, { method: 'PATCH' }),
  markConversationRead: (conversationId: number) => request<{ messageIds: number[] }>(`/conversations/${conversationId}/read`, { method: 'PATCH' }),
  deleteMessage: (messageId: number) => request(`/messages/${messageId}`, { method: 'DELETE' }),

  getNotifications: (params: { unreadOnly?: boolean; page?: number; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.unreadOnly !== undefined) query.set('unread_only', String(params.unreadOnly));
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.per_page !== undefined) query.set('per_page', String(params.per_page));
    return request<{ items: any[]; pagination: any }>(`/notifications?${query.toString()}`);
  },
  markNotificationRead: (notificationId: number) => request<{ notification: any }>(`/notifications/${notificationId}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request(`/notifications/read-all`, { method: 'POST' }),
};
