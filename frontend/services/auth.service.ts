/**
 * Authentication service
 */
import { api } from '@/lib/api-client'
import type { 
  LoginRequest, 
  LoginResponse, 
  MeResponse, 
  LogoutResponse,
  ChangePasswordRequest,
  ChangePasswordResponse
} from '@/types/auth.types'
import { USE_MOCK, mockDelay, mockLoginResponse, mockLogoutResponse, mockMeResponse } from '@/mock'

/**
 * User login
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  if (USE_MOCK) {
    await mockDelay()
    return mockLoginResponse
  }
  const res = await api.post<LoginResponse>('/auth/login/', data)
  return res.data
}

/**
 * User logout
 */
export async function logout(): Promise<LogoutResponse> {
  if (USE_MOCK) {
    await mockDelay()
    return mockLogoutResponse
  }
  const res = await api.post<LogoutResponse>('/auth/logout/')
  return res.data
}

/**
 * Get current user information
 */
export async function getMe(): Promise<MeResponse> {
  if (USE_MOCK) {
    await mockDelay()
    return mockMeResponse
  }
  const res = await api.get<MeResponse>('/auth/me/')
  return res.data
}

/**
 * Change password
 */
export async function changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  if (USE_MOCK) {
    await mockDelay()
    return { message: 'Password changed successfully' }
  }
  const res = await api.post<ChangePasswordResponse>('/auth/change-password/', data)
  return res.data
}
