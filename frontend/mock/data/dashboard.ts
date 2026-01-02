import type { AssetStatistics, StatisticsHistoryItem, DashboardStats } from '@/types/dashboard.types'

export const mockDashboardStats: DashboardStats = {
  totalTargets: 156,
  totalSubdomains: 4823,
  totalEndpoints: 12456,
  totalVulnerabilities: 89,
}

export const mockAssetStatistics: AssetStatistics = {
  totalTargets: 156,
  totalSubdomains: 4823,
  totalIps: 892,
  totalEndpoints: 12456,
  totalWebsites: 3421,
  totalVulns: 89,
  totalAssets: 21638,
  runningScans: 3,
  updatedAt: new Date().toISOString(),
  // 变化值
  changeTargets: 12,
  changeSubdomains: 234,
  changeIps: 45,
  changeEndpoints: 567,
  changeWebsites: 89,
  changeVulns: -5,
  changeAssets: 942,
  // 漏洞严重程度分布
  vulnBySeverity: {
    critical: 3,
    high: 12,
    medium: 28,
    low: 34,
    info: 12,
  },
}

// 生成过去 N 天的历史数据
function generateHistoryData(days: number): StatisticsHistoryItem[] {
  const data: StatisticsHistoryItem[] = []
  const now = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // 模拟逐渐增长的趋势
    const factor = 1 + (days - i) * 0.02
    
    data.push({
      date: date.toISOString().split('T')[0],
      totalTargets: Math.floor(140 * factor),
      totalSubdomains: Math.floor(4200 * factor),
      totalIps: Math.floor(780 * factor),
      totalEndpoints: Math.floor(10800 * factor),
      totalWebsites: Math.floor(2980 * factor),
      totalVulns: Math.floor(75 * factor),
      totalAssets: Math.floor(18900 * factor),
    })
  }
  
  return data
}

export const mockStatisticsHistory7Days = generateHistoryData(7)
export const mockStatisticsHistory30Days = generateHistoryData(30)

export function getMockStatisticsHistory(days: number): StatisticsHistoryItem[] {
  if (days <= 7) return mockStatisticsHistory7Days
  return generateHistoryData(days)
}
