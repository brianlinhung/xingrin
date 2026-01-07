import { api } from "@/lib/api-client"

// Bulk create directories response type
export interface BulkCreateDirectoriesResponse {
  message: string
  createdCount: number
}

// Bulk delete response type
export interface BulkDeleteResponse {
  deletedCount: number
}

/** Directory related API service */
export class DirectoryService {
  /**
   * Bulk delete directories
   * POST /api/assets/directories/bulk-delete/
   */
  static async bulkDelete(ids: number[]): Promise<BulkDeleteResponse> {
    const response = await api.post<BulkDeleteResponse>(
      `/assets/directories/bulk-delete/`,
      { ids }
    )
    return response.data
  }

  /**
   * Bulk create directories (bind to target)
   * POST /api/targets/{target_id}/directories/bulk-create/
   */
  static async bulkCreateDirectories(
    targetId: number,
    urls: string[]
  ): Promise<BulkCreateDirectoriesResponse> {
    const response = await api.post<BulkCreateDirectoriesResponse>(
      `/targets/${targetId}/directories/bulk-create/`,
      { urls }
    )
    return response.data
  }

  /** Export all directory URLs by target (text file, one per line) */
  static async exportDirectoriesByTargetId(targetId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/targets/${targetId}/directories/export/`, {
      responseType: "blob",
    })
    return response.data
  }

  /** Export all directory URLs by scan task (text file, one per line) */
  static async exportDirectoriesByScanId(scanId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/scans/${scanId}/directories/export/`, {
      responseType: "blob",
    })
    return response.data
  }
}
