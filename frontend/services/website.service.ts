import { api } from "@/lib/api-client"

// 批量创建网站响应类型
export interface BulkCreateWebsitesResponse {
  message: string
  createdCount: number
}

/**
 * 网站相关 API 服务
 * 所有前端调用的网站接口都应该集中在这里
 */
export class WebsiteService {
  /**
   * 批量创建网站（绑定到目标）
   * POST /api/targets/{target_id}/websites/bulk-create/
   */
  static async bulkCreateWebsites(
    targetId: number,
    urls: string[]
  ): Promise<BulkCreateWebsitesResponse> {
    const response = await api.post<BulkCreateWebsitesResponse>(
      `/targets/${targetId}/websites/bulk-create/`,
      { urls }
    )
    return response.data
  }

  /** 按目标导出所有网站 URL（文本文件，一行一个） */
  static async exportWebsitesByTargetId(targetId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/targets/${targetId}/websites/export/`, {
      responseType: "blob",
    })
    return response.data
  }

  /** 按扫描任务导出所有网站 URL（文本文件，一行一个） */
  static async exportWebsitesByScanId(scanId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/scans/${scanId}/websites/export/`, {
      responseType: "blob",
    })
    return response.data
  }
}
