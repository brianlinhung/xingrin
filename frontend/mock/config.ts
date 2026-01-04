/**
 * Mock 数据配置
 * 
 * 使用方式：
 * 1. 在 .env.local 中设置 NEXT_PUBLIC_USE_MOCK=true 启用 mock 数据
 * 2. 或者直接修改下面的 FORCE_MOCK 为 true
 */

// 强制使用 mock 数据（一般保持 false，通过环境变量控制）
const FORCE_MOCK = false

// 从环境变量读取 mock 配置
export const USE_MOCK = FORCE_MOCK || process.env.NEXT_PUBLIC_USE_MOCK === 'true'

// Mock 数据延迟（模拟网络请求）
export const MOCK_DELAY = 300 // ms

/**
 * 模拟网络延迟
 */
export function mockDelay(ms: number = MOCK_DELAY): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
