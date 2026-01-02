/**
 * Mock 数据统一导出
 * 
 * 使用方式：
 * import { USE_MOCK, mockData } from '@/mock'
 * 
 * if (USE_MOCK) {
 *   return mockData.dashboard.assetStatistics
 * }
 */

export { USE_MOCK, MOCK_DELAY, mockDelay } from './config'

// Dashboard
export {
  mockDashboardStats,
  mockAssetStatistics,
  mockStatisticsHistory7Days,
  mockStatisticsHistory30Days,
  getMockStatisticsHistory,
} from './data/dashboard'

// Organizations
export {
  mockOrganizations,
  getMockOrganizations,
} from './data/organizations'

// Targets
export {
  mockTargets,
  mockTargetDetails,
  getMockTargets,
  getMockTargetById,
} from './data/targets'

// Scans
export {
  mockScans,
  mockScanStatistics,
  getMockScans,
  getMockScanById,
} from './data/scans'

// Vulnerabilities
export {
  mockVulnerabilities,
  getMockVulnerabilities,
  getMockVulnerabilityById,
} from './data/vulnerabilities'

// Endpoints
export {
  mockEndpoints,
  getMockEndpoints,
  getMockEndpointById,
} from './data/endpoints'

// Websites
export {
  mockWebsites,
  getMockWebsites,
  getMockWebsiteById,
} from './data/websites'

// Subdomains
export {
  mockSubdomains,
  getMockSubdomains,
  getMockSubdomainById,
} from './data/subdomains'
