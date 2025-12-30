/**
 * Toast 消息辅助函数
 * 
 * 提供 i18n 感知的 toast 消息显示功能：
 * - success(): 显示成功消息
 * - error(): 显示错误消息
 * - errorFromCode(): 根据错误码显示错误消息
 * - loading(): 显示加载消息
 * - dismiss(): 关闭指定 toast
 * 
 * 使用方式：
 * ```tsx
 * function MyComponent() {
 *   const toastMessages = useToastMessages();
 *   
 *   const handleDelete = async () => {
 *     try {
 *       await deleteItem(id);
 *       toastMessages.success('toast.item.delete.success', { name: item.name });
 *     } catch (error) {
 *       toastMessages.errorFromCode(getErrorCode(error));
 *     }
 *   };
 * }
 * ```
 */

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getErrorI18nKey, DEFAULT_ERROR_KEY } from './error-code-map';

/**
 * Toast 消息参数类型
 * 支持字符串和数字类型的插值变量
 */
export type ToastParams = Record<string, string | number>;

/**
 * Toast 消息 Hook 返回类型
 */
export interface ToastMessages {
  /**
   * 显示成功消息
   * @param key - i18n 消息键
   * @param params - 插值参数
   * @param toastId - 可选的 toast ID（用于替换或关闭）
   */
  success: (key: string, params?: ToastParams, toastId?: string) => void;
  
  /**
   * 显示错误消息
   * @param key - i18n 消息键
   * @param params - 插值参数
   * @param toastId - 可选的 toast ID（用于替换或关闭）
   */
  error: (key: string, params?: ToastParams, toastId?: string) => void;
  
  /**
   * 根据错误码显示错误消息
   * @param code - 后端返回的错误码
   * @param fallbackKey - 未知错误码的回退键（默认 'errors.unknown'）
   * @param toastId - 可选的 toast ID（用于替换或关闭）
   */
  errorFromCode: (code: string | null, fallbackKey?: string, toastId?: string) => void;
  
  /**
   * 显示加载消息
   * @param key - i18n 消息键
   * @param params - 插值参数
   * @param toastId - toast ID（用于后续关闭）
   */
  loading: (key: string, params?: ToastParams, toastId?: string) => void;
  
  /**
   * 显示警告消息
   * @param key - i18n 消息键
   * @param params - 插值参数
   * @param toastId - 可选的 toast ID（用于替换或关闭）
   */
  warning: (key: string, params?: ToastParams, toastId?: string) => void;
  
  /**
   * 关闭指定 toast
   * @param toastId - toast ID
   */
  dismiss: (toastId: string) => void;
}

/**
 * i18n 感知的 Toast 消息 Hook
 * 
 * 提供统一的 toast 消息显示接口，自动处理 i18n 翻译和参数插值。
 * 
 * @returns ToastMessages 对象，包含 success、error、errorFromCode、loading、warning、dismiss 方法
 * 
 * @example
 * ```tsx
 * function DeleteButton({ item }) {
 *   const toastMessages = useToastMessages();
 *   const { mutate: deleteItem } = useDeleteItem();
 *   
 *   const handleDelete = () => {
 *     toastMessages.loading('toast.item.delete.loading', {}, 'delete-item');
 *     
 *     deleteItem(item.id, {
 *       onSuccess: () => {
 *         toastMessages.dismiss('delete-item');
 *         toastMessages.success('toast.item.delete.success', { name: item.name });
 *       },
 *       onError: (error) => {
 *         toastMessages.dismiss('delete-item');
 *         toastMessages.errorFromCode(getErrorCode(error.response?.data));
 *       }
 *     });
 *   };
 *   
 *   return <button onClick={handleDelete}>Delete</button>;
 * }
 * ```
 */
export function useToastMessages(): ToastMessages {
  // 使用根命名空间，允许访问所有翻译键
  const t = useTranslations();
  
  return {
    success: (key: string, params?: ToastParams, toastId?: string) => {
      const message = t(key, params);
      if (toastId) {
        toast.success(message, { id: toastId });
      } else {
        toast.success(message);
      }
    },
    
    error: (key: string, params?: ToastParams, toastId?: string) => {
      const message = t(key, params);
      if (toastId) {
        toast.error(message, { id: toastId });
      } else {
        toast.error(message);
      }
    },
    
    errorFromCode: (code: string | null, fallbackKey = DEFAULT_ERROR_KEY, toastId?: string) => {
      const errorKey = code ? getErrorI18nKey(code) : fallbackKey;
      const message = t(errorKey);
      if (toastId) {
        toast.error(message, { id: toastId });
      } else {
        toast.error(message);
      }
    },
    
    loading: (key: string, params?: ToastParams, toastId?: string) => {
      const message = t(key, params);
      if (toastId) {
        toast.loading(message, { id: toastId });
      } else {
        toast.loading(message);
      }
    },
    
    warning: (key: string, params?: ToastParams, toastId?: string) => {
      const message = t(key, params);
      if (toastId) {
        toast.warning(message, { id: toastId });
      } else {
        toast.warning(message);
      }
    },
    
    dismiss: (toastId: string) => {
      toast.dismiss(toastId);
    },
  };
}

/**
 * 非 Hook 版本的 toast 辅助函数
 * 
 * 用于不在 React 组件中的场景（如 API 拦截器）。
 * 注意：这些函数不支持 i18n，只能显示原始字符串。
 * 
 * @example
 * ```ts
 * // 在 API 拦截器中使用
 * apiClient.interceptors.response.use(
 *   (response) => response,
 *   (error) => {
 *     if (error.response?.status === 401) {
 *       showToast.error('Session expired, please login again');
 *     }
 *     return Promise.reject(error);
 *   }
 * );
 * ```
 */
export const showToast = {
  success: (message: string, toastId?: string) => {
    if (toastId) {
      toast.success(message, { id: toastId });
    } else {
      toast.success(message);
    }
  },
  
  error: (message: string, toastId?: string) => {
    if (toastId) {
      toast.error(message, { id: toastId });
    } else {
      toast.error(message);
    }
  },
  
  loading: (message: string, toastId?: string) => {
    if (toastId) {
      toast.loading(message, { id: toastId });
    } else {
      toast.loading(message);
    }
  },
  
  warning: (message: string, toastId?: string) => {
    if (toastId) {
      toast.warning(message, { id: toastId });
    } else {
      toast.warning(message);
    }
  },
  
  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },
};
