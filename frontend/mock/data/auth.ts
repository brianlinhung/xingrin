import type { User, MeResponse, LoginResponse, LogoutResponse } from '@/types/auth.types'

export const mockUser: User = {
  id: 1,
  username: 'admin',
  isStaff: true,
  isSuperuser: true,
}

export const mockMeResponse: MeResponse = {
  authenticated: true,
  user: mockUser,
}

export const mockLoginResponse: LoginResponse = {
  message: 'Login successful',
  user: mockUser,
}

export const mockLogoutResponse: LogoutResponse = {
  message: 'Logout successful',
}
