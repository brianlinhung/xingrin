import { api } from "@/lib/api-client"
import type { 
  Endpoint, 
  CreateEndpointRequest, 
  UpdateEndpointRequest,
  GetEndpointsRequest,
  GetEndpointsResponse,
  BatchDeleteEndpointsRequest,
  BatchDeleteEndpointsResponse
} from "@/types/endpoint.types"
import { USE_MOCK, mockDelay, getMockEndpoints, getMockEndpointById } from '@/mock'

// Bulk create endpoints response type
export interface BulkCreateEndpointsResponse {
  message: string
  createdCount: number
}

export class EndpointService {

  /**
   * Bulk create endpoints (bind to target)
   * POST /api/targets/{target_id}/endpoints/bulk-create/
   */
  static async bulkCreateEndpoints(
    targetId: number,
    urls: string[]
  ): Promise<BulkCreateEndpointsResponse> {
    const response = await api.post<BulkCreateEndpointsResponse>(
      `/targets/${targetId}/endpoints/bulk-create/`,
      { urls }
    )
    return response.data
  }

  /**
   * Get single Endpoint details
   * @param id - Endpoint ID
   * @returns Promise<Endpoint>
   */
  static async getEndpointById(id: number): Promise<Endpoint> {
    if (USE_MOCK) {
      await mockDelay()
      const endpoint = getMockEndpointById(id)
      if (!endpoint) throw new Error('Endpoint not found')
      return endpoint
    }
    const response = await api.get<Endpoint>(`/endpoints/${id}/`)
    return response.data
  }

  /**
   * Get Endpoint list
   * @param params - Query parameters
   * @returns Promise<GetEndpointsResponse>
   */
  static async getEndpoints(params: GetEndpointsRequest): Promise<GetEndpointsResponse> {
    if (USE_MOCK) {
      await mockDelay()
      return getMockEndpoints(params)
    }
    // api-client.ts automatically converts camelCase params to snake_case
    const response = await api.get<GetEndpointsResponse>('/endpoints/', {
      params
    })
    return response.data
  }

  /**
   * Get Endpoint list by target ID (dedicated route)
   * @param targetId - Target ID
   * @param params - Other query parameters
   * @param filter - Smart filter query string
   * @returns Promise<GetEndpointsResponse>
   */
  static async getEndpointsByTargetId(targetId: number, params: GetEndpointsRequest, filter?: string): Promise<GetEndpointsResponse> {
    // api-client.ts automatically converts camelCase params to snake_case
    const response = await api.get<GetEndpointsResponse>(`/targets/${targetId}/endpoints/`, {
      params: { ...params, filter }
    })
    return response.data
  }

  /**
   * Get Endpoint list by scan ID (historical snapshot)
   * @param scanId - Scan task ID
   * @param params - Pagination and other query parameters
   * @param filter - Smart filter query string
   */
  static async getEndpointsByScanId(
    scanId: number,
    params: GetEndpointsRequest,
    filter?: string,
  ): Promise<any> {
    const response = await api.get(`/scans/${scanId}/endpoints/`, {
      params: { ...params, filter },
    })
    return response.data
  }

  /**
   * Batch create Endpoints
   * @param data - Create request object
   * @param data.endpoints - Endpoint data array
   * @returns Promise<CreateEndpointsResponse>
   */
  static async createEndpoints(data: { endpoints: Array<CreateEndpointRequest> }): Promise<any> {
    // api-client.ts automatically converts camelCase request body to snake_case
    const response = await api.post('/endpoints/create/', data)
    return response.data
  }

  /**
   * Delete Endpoint
   * @param id - Endpoint ID
   * @returns Promise<void>
   */
  static async deleteEndpoint(id: number): Promise<void> {
    await api.delete(`/endpoints/${id}/`)
  }

  /**
   * Batch delete Endpoints
   * @param data - Batch delete request object
   * @param data.endpointIds - Endpoint ID list
   * @returns Promise<BatchDeleteEndpointsResponse>
   */
  static async batchDeleteEndpoints(data: BatchDeleteEndpointsRequest): Promise<BatchDeleteEndpointsResponse> {
    // api-client.ts automatically converts camelCase request body to snake_case
    const response = await api.post<BatchDeleteEndpointsResponse>('/endpoints/batch-delete/', data)
    return response.data
  }

  /** Export all endpoint URLs by target (text file, one per line) */
  static async exportEndpointsByTargetId(targetId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/targets/${targetId}/endpoints/export/`, {
      responseType: 'blob',
    })
    return response.data
  }

  /** Export all endpoint URLs by scan task (text file, one per line) */
  static async exportEndpointsByScanId(scanId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/scans/${scanId}/endpoints/export/`, {
      responseType: 'blob',
    })
    return response.data
  }

}
