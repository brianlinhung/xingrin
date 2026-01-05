/**
 * API Key 配置类型定义
 * 用于 subfinder 第三方数据源配置
 */

// 单字段 Provider 配置（hunter, shodan, zoomeye, securitytrails, threatbook, quake）
export interface SingleFieldProviderConfig {
  enabled: boolean
  apiKey: string
}

// FOFA Provider 配置（email + apiKey）
export interface FofaProviderConfig {
  enabled: boolean
  email: string
  apiKey: string
}

// Censys Provider 配置（apiId + apiSecret）
export interface CensysProviderConfig {
  enabled: boolean
  apiId: string
  apiSecret: string
}

// 完整的 API Key 配置
export interface ApiKeySettings {
  fofa: FofaProviderConfig
  hunter: SingleFieldProviderConfig
  shodan: SingleFieldProviderConfig
  censys: CensysProviderConfig
  zoomeye: SingleFieldProviderConfig
  securitytrails: SingleFieldProviderConfig
  threatbook: SingleFieldProviderConfig
  quake: SingleFieldProviderConfig
}

// Provider 类型
export type ProviderKey = keyof ApiKeySettings

// Provider 配置联合类型
export type ProviderConfig = FofaProviderConfig | CensysProviderConfig | SingleFieldProviderConfig
