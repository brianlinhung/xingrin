/**
 * Notification service
 * Handles all notification-related API requests
 */

import api from '@/lib/api-client'
import type {
  Notification,
  GetNotificationsRequest,
  GetNotificationsResponse,
} from '@/types/notification.types'
import { USE_MOCK, mockDelay, getMockNotifications, getMockUnreadCount } from '@/mock'

export class NotificationService {
  /**
   * Get notification list
   * 后端返回分页格式: { results, total, page, pageSize, totalPages }
   */
  static async getNotifications(
    params: GetNotificationsRequest = {}
  ): Promise<GetNotificationsResponse> {
    if (USE_MOCK) {
      await mockDelay()
      return getMockNotifications(params)
    }
    const response = await api.get<GetNotificationsResponse>('/notifications/', {
      params,
    })
    return response.data
  }

  /**
   * Mark all notifications as read
   * 后端返回: { updated: number }
   */
  static async markAllAsRead(): Promise<{ updated: number }> {
    if (USE_MOCK) {
      await mockDelay()
      return { updated: 2 }
    }
    const response = await api.post<{ updated: number }>('/notifications/mark-all-as-read/')
    return response.data
  }

  /**
   * Get unread notification count
   * 后端返回: { count: number }
   */
  static async getUnreadCount(): Promise<{ count: number }> {
    if (USE_MOCK) {
      await mockDelay()
      return getMockUnreadCount()
    }
    const response = await api.get<{ count: number }>('/notifications/unread-count/')
    return response.data
  }
}
