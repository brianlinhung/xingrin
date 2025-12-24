/**
 * 子域名验证工具类
 * 
 * 提供子域名的解析和验证功能，用于批量添加子域名时的前端验证。
 * 注意：子域名是否匹配 Target name 由后端验证。
 */

export interface SubdomainValidationResult {
  isValid: boolean
  subdomain: string
  error?: string
  index: number
}

export interface ParseResult {
  subdomains: string[]
  validCount: number
  invalidCount: number
  duplicateCount: number
  invalidItems: SubdomainValidationResult[]
}

// 子域名格式正则：允许字母、数字、连字符，点号分隔
const SUBDOMAIN_REGEX = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})*$/

export class SubdomainValidator {
  /**
   * 解析输入文本，支持换行、逗号、空格分隔
   */
  static parse(input: string): string[] {
    if (!input || typeof input !== 'string') {
      return []
    }
    
    // 统一分隔符为换行，然后按行分割
    const normalized = input
      .replace(/,/g, '\n')
      .replace(/\s+/g, '\n')
    
    return normalized
      .split('\n')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0)
  }

  /**
   * 验证单个子域名格式（不验证是否匹配 Target）
   */
  static validate(subdomain: string, index: number = 0): SubdomainValidationResult {
    const trimmed = subdomain.trim().toLowerCase()
    
    // 空值检查
    if (!trimmed) {
      return {
        isValid: false,
        subdomain: subdomain,
        error: '子域名不能为空',
        index,
      }
    }
    
    // 长度检查（DNS 标准限制）
    if (trimmed.length > 253) {
      return {
        isValid: false,
        subdomain: trimmed,
        error: '子域名长度不能超过 253 个字符',
        index,
      }
    }
    
    // 格式检查
    if (!SUBDOMAIN_REGEX.test(trimmed)) {
      return {
        isValid: false,
        subdomain: trimmed,
        error: '子域名格式无效',
        index,
      }
    }
    
    return {
      isValid: true,
      subdomain: trimmed,
      index,
    }
  }

  /**
   * 批量验证并去重
   */
  static validateBatch(subdomains: string[]): ParseResult {
    const seen = new Set<string>()
    const validSubdomains: string[] = []
    const invalidItems: SubdomainValidationResult[] = []
    let duplicateCount = 0
    
    subdomains.forEach((subdomain, index) => {
      const result = this.validate(subdomain, index)
      
      if (!result.isValid) {
        invalidItems.push(result)
        return
      }
      
      // 去重检查
      if (seen.has(result.subdomain)) {
        duplicateCount++
        return
      }
      
      seen.add(result.subdomain)
      validSubdomains.push(result.subdomain)
    })
    
    return {
      subdomains: validSubdomains,
      validCount: validSubdomains.length,
      invalidCount: invalidItems.length,
      duplicateCount,
      invalidItems,
    }
  }
}
