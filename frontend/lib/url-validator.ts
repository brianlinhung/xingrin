/**
 * URL 验证工具类
 * 
 * 提供 URL 的解析和验证功能，用于批量添加 URL 时的前端验证。
 * 支持 Endpoints、Websites、Directories 三种资产类型。
 */

export type TargetType = 'domain' | 'ip' | 'cidr'

export interface URLValidationResult {
  isValid: boolean
  url: string
  error?: string
  index: number
  isMatched?: boolean  // 是否匹配目标（仅当提供 targetName 时有效）
}

export interface ParseResult {
  urls: string[]
  validCount: number
  invalidCount: number
  duplicateCount: number
  mismatchedCount: number  // 不匹配目标的 URL 数量
  invalidItems: URLValidationResult[]
  mismatchedItems: URLValidationResult[]  // 不匹配目标的 URL 列表
}

// URL 最大长度
const MAX_URL_LENGTH = 2000

// URL 格式正则：必须以 http:// 或 https:// 开头
const URL_PROTOCOL_REGEX = /^https?:\/\//i

export class URLValidator {
  /**
   * 解析输入文本，仅支持换行分隔（每行一个 URL）
   */
  static parse(input: string): string[] {
    if (!input || typeof input !== 'string') {
      return []
    }
    
    return input
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  /**
   * 检查 URL 的 hostname 是否匹配目标
   * 
   * 匹配规则（简单前端校验，仅做提示，不阻止提交）：
   * - 域名类型：hostname === targetName 或 hostname.endsWith('.'+targetName)
   * - IP 类型：hostname === targetName
   * - CIDR 类型：跳过校验（前端无法判断 IP 是否在 CIDR 范围内）
   */
  static checkMatch(url: string, targetName: string, targetType: TargetType): boolean {
    // CIDR 类型跳过前端校验
    if (targetType === 'cidr') {
      return true
    }
    
    try {
      const parsed = new URL(url)
      const hostname = parsed.hostname.toLowerCase()
      const target = targetName.toLowerCase()
      
      if (targetType === 'domain') {
        // 域名类型：hostname 等于 target 或以 .target 结尾
        return hostname === target || hostname.endsWith('.' + target)
      } else if (targetType === 'ip') {
        // IP 类型：hostname 必须完全等于 target
        return hostname === target
      }
      
      return true
    } catch {
      return false
    }
  }

  /**
   * 验证单个 URL 格式
   */
  static validate(url: string, index: number = 0, targetName?: string, targetType?: TargetType): URLValidationResult {
    const trimmed = url.trim()
    
    // 空值检查
    if (!trimmed) {
      return {
        isValid: false,
        url: url,
        error: 'URL 不能为空',
        index,
      }
    }
    
    // 长度检查
    if (trimmed.length > MAX_URL_LENGTH) {
      return {
        isValid: false,
        url: trimmed,
        error: `URL 长度不能超过 ${MAX_URL_LENGTH} 个字符`,
        index,
      }
    }
    
    // 协议检查
    if (!URL_PROTOCOL_REGEX.test(trimmed)) {
      return {
        isValid: false,
        url: trimmed,
        error: 'URL 必须以 http:// 或 https:// 开头',
        index,
      }
    }
    
    // 尝试解析 URL
    try {
      const parsed = new URL(trimmed)
      if (!parsed.hostname) {
        return {
          isValid: false,
          url: trimmed,
          error: 'URL 必须包含主机名',
          index,
        }
      }
      
      // 检查是否匹配目标
      let isMatched = true
      if (targetName && targetType) {
        isMatched = this.checkMatch(trimmed, targetName, targetType)
      }
      
      return {
        isValid: true,
        url: trimmed,
        index,
        isMatched,
      }
    } catch {
      return {
        isValid: false,
        url: trimmed,
        error: 'URL 格式无效',
        index,
      }
    }
  }

  /**
   * 批量验证并去重
   */
  static validateBatch(urls: string[], targetName?: string, targetType?: TargetType): ParseResult {
    const seen = new Set<string>()
    const validUrls: string[] = []
    const invalidItems: URLValidationResult[] = []
    const mismatchedItems: URLValidationResult[] = []
    let duplicateCount = 0
    
    urls.forEach((url, index) => {
      const result = this.validate(url, index, targetName, targetType)
      
      if (!result.isValid) {
        invalidItems.push(result)
        return
      }
      
      // 去重检查
      if (seen.has(result.url)) {
        duplicateCount++
        return
      }
      
      seen.add(result.url)
      validUrls.push(result.url)
      
      // 记录不匹配的 URL（但仍然添加到有效列表）
      if (result.isMatched === false) {
        mismatchedItems.push(result)
      }
    })
    
    return {
      urls: validUrls,
      validCount: validUrls.length,
      invalidCount: invalidItems.length,
      duplicateCount,
      mismatchedCount: mismatchedItems.length,
      invalidItems,
      mismatchedItems,
    }
  }
}
