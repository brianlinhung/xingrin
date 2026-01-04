import apiClient from '@/lib/api-client'
import type { ScanEngine } from '@/types/engine.types'
import { USE_MOCK, mockDelay, getMockEngines, getMockEngineById } from '@/mock'

/**
 * Engine API service
 */

/**
 * Get engine list
 */
export async function getEngines(): Promise<ScanEngine[]> {
  if (USE_MOCK) {
    await mockDelay()
    return getMockEngines()
  }
  // Engines are usually not many, get all
  const response = await apiClient.get('/engines/', {
    params: { pageSize: 1000 }
  })
  // Backend returns paginated data: { results: [...], total, page, pageSize, totalPages }
  return response.data.results || response.data
}

/**
 * Get engine details
 */
export async function getEngine(id: number): Promise<ScanEngine> {
  if (USE_MOCK) {
    await mockDelay()
    const engine = getMockEngineById(id)
    if (!engine) throw new Error('Engine not found')
    return engine
  }
  const response = await apiClient.get(`/engines/${id}/`)
  return response.data
}

/**
 * Create engine
 */
export async function createEngine(data: {
  name: string
  configuration: string
}): Promise<ScanEngine> {
  const response = await apiClient.post('/engines/', data)
  return response.data
}

/**
 * Update engine
 */
export async function updateEngine(
  id: number,
  data: Partial<{
    name: string
    configuration: string
  }>
): Promise<ScanEngine> {
  const response = await apiClient.patch(`/engines/${id}/`, data)
  return response.data
}

/**
 * Delete engine
 */
export async function deleteEngine(id: number): Promise<void> {
  await apiClient.delete(`/engines/${id}/`)
}

