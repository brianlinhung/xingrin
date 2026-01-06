import { api } from '@/lib/api-client'

export interface GlobalBlacklistResponse {
  patterns: string[]
}

export interface UpdateGlobalBlacklistRequest {
  patterns: string[]
}

/**
 * Get global blacklist rules
 */
export async function getGlobalBlacklist(): Promise<GlobalBlacklistResponse> {
  const res = await api.get<GlobalBlacklistResponse>('/blacklist/rules/')
  return res.data
}

/**
 * Update global blacklist rules (full replace)
 */
export async function updateGlobalBlacklist(data: UpdateGlobalBlacklistRequest): Promise<GlobalBlacklistResponse> {
  const res = await api.put<GlobalBlacklistResponse>('/blacklist/rules/', data)
  return res.data
}
