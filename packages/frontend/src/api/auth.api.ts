import api from './client';
import type { ApiResponse, User } from '@/types';

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/send-otp', { phone }).then((r) => r.data.data),

  verifyOtp: (phone: string, code: string, role?: 'CUSTOMER' | 'VENDOR' | 'TRADER') =>
    api.post<ApiResponse<{ token: string; user: User; isNewUser: boolean }>>('/auth/verify-otp', { phone, code, role }).then((r) => r.data.data),

  getProfile: () =>
    api.get<ApiResponse<User>>('/auth/me').then((r) => r.data.data),

  updateProfile: (data: {
    name?: string;
    businessName?: string;
    address?: string;
    role?: 'CUSTOMER' | 'VENDOR' | 'TRADER';
  }) => api.put<ApiResponse<User>>('/auth/me', data).then((r) => r.data.data),
};
