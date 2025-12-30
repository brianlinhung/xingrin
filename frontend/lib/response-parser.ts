/**
 * API 响应解析器
 * 
 * 统一处理后端 API 响应，支持新的标准化响应格式：
 * - 成功响应: { data?: T, meta?: {...} }
 * - 错误响应: { error: { code: string, message?: string, details?: unknown[] } }
 * 
 * 同时保持对旧格式的向后兼容性：
 * - 旧格式: { code: string, state: string, message: string, data?: T }
 */

/**
 * 标准化成功响应类型
 */
export interface ApiSuccessResponse<T = unknown> {
  data?: T;
  meta?: {
    count?: number;
    total?: number;
    page?: number;
    pageSize?: number;
    [key: string]: unknown;
  };
}

/**
 * 标准化错误响应类型
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message?: string;
    details?: unknown[];
  };
}

/**
 * 统一 API 响应类型（新格式）
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 旧版 API 响应类型（向后兼容）
 */
export interface LegacyApiResponse<T = unknown> {
  code: string;
  state: string;
  message: string;
  data?: T;
}

/**
 * 判断响应是否为错误响应
 * 
 * @param response - API 响应对象
 * @returns 如果是错误响应返回 true
 * 
 * @example
 * const response = await api.get('/scans');
 * if (isErrorResponse(response)) {
 *   console.error('Error:', response.error.code);
 * }
 */
export function isErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'object' &&
    (response as ApiErrorResponse).error !== null &&
    typeof (response as ApiErrorResponse).error.code === 'string'
  );
}

/**
 * 判断响应是否为成功响应
 * 
 * @param response - API 响应对象
 * @returns 如果是成功响应返回 true
 */
export function isSuccessResponse<T = unknown>(
  response: unknown
): response is ApiSuccessResponse<T> {
  // 新格式：没有 error 字段
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  
  // 如果有 error 字段，则不是成功响应
  if ('error' in response) {
    return false;
  }
  
  return true;
}

/**
 * 判断响应是否为旧版格式
 * 
 * @param response - API 响应对象
 * @returns 如果是旧版格式返回 true
 */
export function isLegacyResponse<T = unknown>(
  response: unknown
): response is LegacyApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'state' in response &&
    'code' in response &&
    typeof (response as LegacyApiResponse).state === 'string'
  );
}

/**
 * 判断旧版响应是否为错误
 * 
 * @param response - 旧版 API 响应对象
 * @returns 如果是错误响应返回 true
 */
export function isLegacyErrorResponse<T = unknown>(
  response: LegacyApiResponse<T>
): boolean {
  return response.state !== 'success';
}

/**
 * 从响应中解析数据
 * 
 * 支持新旧两种响应格式：
 * - 新格式: { data: T }
 * - 旧格式: { state: 'success', data: T }
 * 
 * @param response - API 响应对象
 * @returns 解析出的数据，如果是错误响应则返回 null
 * 
 * @example
 * const response = await api.get('/scans');
 * const data = parseResponse<Scan[]>(response);
 * if (data) {
 *   console.log('Scans:', data);
 * }
 */
export function parseResponse<T>(response: unknown): T | null {
  // 处理新格式错误响应
  if (isErrorResponse(response)) {
    return null;
  }
  
  // 处理旧格式响应
  if (isLegacyResponse<T>(response)) {
    if (isLegacyErrorResponse(response)) {
      return null;
    }
    return response.data ?? null;
  }
  
  // 处理新格式成功响应
  if (isSuccessResponse<T>(response)) {
    return response.data ?? null;
  }
  
  return null;
}

/**
 * 从响应中获取错误码
 * 
 * 支持新旧两种响应格式：
 * - 新格式: { error: { code: 'ERROR_CODE' } }
 * - 旧格式: { state: 'error', code: '400' }
 * 
 * @param response - API 响应对象
 * @returns 错误码字符串，如果不是错误响应则返回 null
 * 
 * @example
 * const response = await api.delete('/scans/123');
 * const errorCode = getErrorCode(response);
 * if (errorCode) {
 *   toast.error(t(`errors.${errorCode}`));
 * }
 */
export function getErrorCode(response: unknown): string | null {
  // 处理新格式错误响应
  if (isErrorResponse(response)) {
    return response.error.code;
  }
  
  // 处理旧格式错误响应
  if (isLegacyResponse(response) && isLegacyErrorResponse(response)) {
    // 旧格式的 code 是 HTTP 状态码，不是错误码
    // 返回通用错误码
    return 'SERVER_ERROR';
  }
  
  return null;
}

/**
 * 从响应中获取错误消息（用于调试）
 * 
 * @param response - API 响应对象
 * @returns 错误消息字符串，如果不是错误响应则返回 null
 */
export function getErrorMessage(response: unknown): string | null {
  // 处理新格式错误响应
  if (isErrorResponse(response)) {
    return response.error.message ?? null;
  }
  
  // 处理旧格式错误响应
  if (isLegacyResponse(response) && isLegacyErrorResponse(response)) {
    return response.message;
  }
  
  return null;
}

/**
 * 从响应中获取元数据
 * 
 * @param response - API 响应对象
 * @returns 元数据对象，如果没有则返回 null
 */
export function getResponseMeta(
  response: unknown
): ApiSuccessResponse['meta'] | null {
  if (isSuccessResponse(response)) {
    return response.meta ?? null;
  }
  return null;
}
