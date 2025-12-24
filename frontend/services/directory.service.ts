import { api } from "@/lib/api-client"

// 批量创建目录响应类型
export interface BulkCreateDirectoriesResponse {
  message: string
  createdCount: number
}

/** 目录相关 API 服务 */
export class DirectoryService {
  /**
   * 批量创建目录（绑定到目标）
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

  /** 按目标导出所有目录 URL（文本文件，一行一个） */
  static async exportDirectoriesByTargetId(targetId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/targets/${targetId}/directories/export/`, {
      responseType: "blob",
    })
    return response.data
  }

  /** 按扫描任务导出所有目录 URL（文本文件，一行一个） */
  static async exportDirectoriesByScanId(scanId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/scans/${scanId}/directories/export/`, {
      responseType: "blob",
    })
    return response.data
  }
}
