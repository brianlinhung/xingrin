import { api } from "@/lib/api-client"
import type { GetIPAddressesParams, GetIPAddressesResponse } from "@/types/ip-address.types"

// Bulk delete response type
export interface BulkDeleteResponse {
  deletedCount: number
}

export class IPAddressService {
  /**
   * Bulk delete IP addresses
   * POST /api/assets/ip-addresses/bulk-delete/
   * Note: IP addresses are aggregated, so we pass IP strings instead of IDs
   */
  static async bulkDelete(ips: string[]): Promise<BulkDeleteResponse> {
    const response = await api.post<BulkDeleteResponse>(
      `/assets/ip-addresses/bulk-delete/`,
      { ips }
    )
    return response.data
  }

  static async getTargetIPAddresses(
    targetId: number,
    params?: GetIPAddressesParams
  ): Promise<GetIPAddressesResponse> {
    const response = await api.get<GetIPAddressesResponse>(`/targets/${targetId}/ip-addresses/`, {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
        ...(params?.filter && { filter: params.filter }),
      },
    })
    return response.data
  }

  static async getScanIPAddresses(
    scanId: number,
    params?: GetIPAddressesParams
  ): Promise<GetIPAddressesResponse> {
    const response = await api.get<GetIPAddressesResponse>(`/scans/${scanId}/ip-addresses/`, {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
        ...(params?.filter && { filter: params.filter }),
      },
    })
    return response.data
  }

  /** Export all IP addresses by target (text file, one per line) */
  static async exportIPAddressesByTargetId(targetId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/targets/${targetId}/ip-addresses/export/`, {
      responseType: 'blob',
    })
    return response.data
  }

  /** Export all IP addresses by scan task (text file, one per line) */
  static async exportIPAddressesByScanId(scanId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/scans/${scanId}/ip-addresses/export/`, {
      responseType: 'blob',
    })
    return response.data
  }
}
