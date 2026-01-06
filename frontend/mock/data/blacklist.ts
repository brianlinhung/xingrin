/**
 * Blacklist Mock Data
 * 
 * 黑名单规则 mock 数据
 * - 全局黑名单：适用于所有 Target
 * - Target 黑名单：仅适用于特定 Target
 */

export interface BlacklistResponse {
  patterns: string[]
}

export interface UpdateBlacklistRequest {
  patterns: string[]
}

// 全局黑名单 mock 数据
let mockGlobalBlacklistPatterns: string[] = [
  '*.gov',
  '*.edu',
  '*.mil',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
]

// Target 黑名单 mock 数据（按 targetId 存储）
const mockTargetBlacklistPatterns: Record<number, string[]> = {
  1: ['*.internal.example.com', '192.168.1.0/24'],
  2: ['cdn.example.com', '*.cdn.*'],
}

/**
 * 获取全局黑名单
 */
export function getMockGlobalBlacklist(): BlacklistResponse {
  return {
    patterns: [...mockGlobalBlacklistPatterns],
  }
}

/**
 * 更新全局黑名单（全量替换）
 */
export function updateMockGlobalBlacklist(data: UpdateBlacklistRequest): BlacklistResponse {
  mockGlobalBlacklistPatterns = [...data.patterns]
  return {
    patterns: mockGlobalBlacklistPatterns,
  }
}

/**
 * 获取 Target 黑名单
 */
export function getMockTargetBlacklist(targetId: number): BlacklistResponse {
  return {
    patterns: mockTargetBlacklistPatterns[targetId] ? [...mockTargetBlacklistPatterns[targetId]] : [],
  }
}

/**
 * 更新 Target 黑名单（全量替换）
 */
export function updateMockTargetBlacklist(targetId: number, data: UpdateBlacklistRequest): BlacklistResponse {
  mockTargetBlacklistPatterns[targetId] = [...data.patterns]
  return {
    patterns: mockTargetBlacklistPatterns[targetId],
  }
}
