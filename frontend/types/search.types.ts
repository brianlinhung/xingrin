// 搜索结果类型
export interface SearchResult {
  url: string
  host: string
  title: string
  technologies: string[]
  statusCode: number | null
  responseHeaders: Record<string, string>
  responseBody: string
  vulnerabilities: Vulnerability[]
}

export interface Vulnerability {
  id?: number
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'unknown'
  vulnType: string
  url?: string
}

// 搜索状态
export type SearchState = 'initial' | 'searching' | 'results'

// 搜索响应类型
export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 搜索操作符类型
export type SearchOperator = '=' | '==' | '!='

// 单个搜索条件
export interface SearchCondition {
  field: string
  operator: SearchOperator
  value: string
}

// 搜索表达式（支持 AND/OR 组合）
export interface SearchExpression {
  conditions: SearchCondition[]  // 同一组内的条件用 AND 连接
  orGroups?: SearchExpression[]  // 多组之间用 OR 连接
}

// 发送给后端的搜索参数
export interface SearchParams {
  q?: string  // 完整的搜索表达式字符串
  page?: number
  pageSize?: number
}
