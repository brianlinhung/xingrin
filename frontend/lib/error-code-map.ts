/**
 * 错误码到 i18n 键的映射
 * 
 * 采用简化方案（参考 Stripe、GitHub 等大厂做法）：
 * - 只映射通用错误码（5-10 个）
 * - 未知错误码使用 errors.unknown
 * - 错误码与后端 ErrorCodes 类保持一致
 * 
 * 后端错误码定义: backend/apps/common/error_codes.py
 */

/**
 * 错误码到 i18n 键的映射表
 * 
 * 键: 后端返回的错误码（大写字母和下划线）
 * 值: 前端 i18n 键（在 messages/en.json 和 messages/zh.json 中定义）
 */
export const ERROR_CODE_MAP: Record<string, string> = {
  // 通用错误码（8 个，与后端 ErrorCodes 类一致）
  VALIDATION_ERROR: 'errors.validation',
  NOT_FOUND: 'errors.notFound',
  PERMISSION_DENIED: 'errors.permissionDenied',
  SERVER_ERROR: 'errors.serverError',
  BAD_REQUEST: 'errors.badRequest',
  CONFLICT: 'errors.conflict',
  UNAUTHORIZED: 'errors.unauthorized',
  RATE_LIMITED: 'errors.rateLimited',
};

/**
 * 默认错误 i18n 键
 * 用于未知错误码的回退
 */
export const DEFAULT_ERROR_KEY = 'errors.unknown';

/**
 * 获取错误码对应的 i18n 键
 * 
 * @param code - 后端返回的错误码
 * @returns 对应的 i18n 键，未知错误码返回 'errors.unknown'
 * 
 * @example
 * const errorKey = getErrorI18nKey('NOT_FOUND');
 * // 返回: 'errors.notFound'
 * 
 * const unknownKey = getErrorI18nKey('SOME_UNKNOWN_ERROR');
 * // 返回: 'errors.unknown'
 */
export function getErrorI18nKey(code: string): string {
  return ERROR_CODE_MAP[code] ?? DEFAULT_ERROR_KEY;
}

/**
 * 检查错误码是否已知
 * 
 * @param code - 后端返回的错误码
 * @returns 如果错误码在映射表中返回 true
 */
export function isKnownErrorCode(code: string): boolean {
  return code in ERROR_CODE_MAP;
}

/**
 * 获取所有已知的错误码列表
 * 
 * @returns 错误码数组
 */
export function getAllErrorCodes(): string[] {
  return Object.keys(ERROR_CODE_MAP);
}
