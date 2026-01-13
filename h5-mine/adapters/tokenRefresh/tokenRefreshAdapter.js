/**
 * Token 刷新适配器
 * 提供统一的 token 刷新接口，支持多端适配
 *
 * 使用方式：
 * 1. 浏览器环境：使用 refreshToken 调用后端接口
 * 2. 原生 App：通过 registerTokenRefresh 注册原生实现（使用设备号）
 * 3. 小程序：通过 registerTokenRefresh 注册小程序实现（使用 openid）
 */

/**
 * Token 刷新器接口定义
 * @typedef {Object} TokenRefreshInterface
 * @property {Function} refreshAccessToken - 刷新 token 方法
 * @property {string} name - 实现名称（用于调试）
 */

/**
 * Token 刷新结果
 * @typedef {Object} TokenRefreshResult
 * @property {boolean} success - 是否成功
 * @property {string} [accessToken] - 新的 accessToken
 * @property {string} [refreshToken] - 新的 refreshToken
 * @property {string} [error] - 错误信息
 */

// 存储当前使用的 token 刷新器实现
let currentRefresher = null;

// 存储自定义实现
const customRefreshers = new Map();

// API 配置
const API_USERSERVICE_URL = 'https://userservice.preview.huawei-zeabur.cn';

/**
 * 检测当前运行环境
 */
function detectEnvironment() {
    // 微信小程序
    if (typeof wx !== 'undefined' && wx.miniProgram) {
        return 'wechat-miniprogram';
    }

    // 支付宝小程序
    if (typeof my !== 'undefined' && my.env) {
        return 'alipay-miniprogram';
    }

    // 原生 App - 通过全局对象判断
    if (typeof window !== 'undefined') {
        if (window.NativeApp ||
            window.webkit?.messageHandlers?.tokenRefreshHandler ||
            window.AndroidTokenRefresh) {
            return 'native-app';
        }
    }

    // 默认浏览器环境
    return 'browser';
}

/**
 * Cookie 工具函数
 */
const CookieUtils = {
    /**
     * 设置 cookie
     * @param {string} name - cookie 名称
     * @param {string} value - cookie 值
     * @param {number} days - 过期天数
     */
    set(name, value, days = 30) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    },

    /**
     * 获取 cookie
     * @param {string} name - cookie 名称
     * @returns {string|null}
     */
    get(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },

    /**
     * 删除 cookie
     * @param {string} name - cookie 名称
     */
    remove(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    }
};

/**
 * 浏览器环境的默认实现
 */
const browserTokenRefresher = {
    name: 'Browser Token Refresher',

    /**
     * 浏览器环境刷新 token
     * @returns {Promise<TokenRefreshResult>}
     */
    async refreshAccessToken() {
        try {
            // 从 cookie 中获取 refreshToken
            const refreshToken = CookieUtils.get('refreshToken');

            if (!refreshToken) {
                console.warn('[TokenRefreshAdapter] No refreshToken found in cookie');
                return {
                    success: false,
                    error: 'No refreshToken available'
                };
            }

            console.log('[TokenRefreshAdapter] Attempting to refresh token...');

            // 调用刷新接口
            const response = await fetch(`${API_USERSERVICE_URL}/api/users/login/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: refreshToken
                })
            });

            const data = await response.json();

            if (response.ok && data.accessToken) {
                console.log('[TokenRefreshAdapter] Token refreshed successfully');

                // 更新 cookie 中的 refreshToken
                if (data.refreshToken) {
                    CookieUtils.set('refreshToken', data.refreshToken, 30);
                }

                return {
                    success: true,
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken
                };
            } else {
                console.warn('[TokenRefreshAdapter] Token refresh failed:', data.message || data.error);

                // 如果刷新失败，清除旧的 refreshToken
                CookieUtils.remove('refreshToken');

                return {
                    success: false,
                    error: data.message || data.error || 'Token refresh failed'
                };
            }
        } catch (error) {
            console.error('[TokenRefreshAdapter] Token refresh error:', error);
            return {
                success: false,
                error: error.message || 'Network error'
            };
        }
    }
};

/**
 * 注册自定义 token 刷新器实现
 *
 * @param {string} environment - 环境标识：'native-app' | 'wechat-miniprogram' | 'alipay-miniprogram' | 自定义
 * @param {TokenRefreshInterface} implementation - 实现对象
 *
 * @example
 * // 在原生 App 中注册
 * registerTokenRefresh('native-app', {
 *   name: 'iOS Native Token Refresher',
 *   async refreshAccessToken() {
 *     return new Promise((resolve, reject) => {
 *       window.webkit.messageHandlers.tokenRefreshHandler.postMessage({
 *         action: 'refreshToken',
 *         callbackId: 'callback_' + Date.now()
 *       });
 *
 *       window.tokenRefreshCallback = (result) => {
 *         if (result.success) {
 *           resolve(result);
 *         } else {
 *           reject(new Error(result.error));
 *         }
 *       };
 *     });
 *   }
 * });
 */
export function registerTokenRefresh(environment, implementation) {
    if (!implementation || typeof implementation.refreshAccessToken !== 'function') {
        throw new Error('Invalid token refresh implementation: must have a refreshAccessToken method');
    }

    customRefreshers.set(environment, implementation);
    console.log(`[TokenRefreshAdapter] 已注册 ${environment} 环境的 token 刷新器:`, implementation.name);

    // 如果当前环境匹配，立即切换
    const currentEnv = detectEnvironment();
    if (currentEnv === environment) {
        currentRefresher = implementation;
        console.log(`[TokenRefreshAdapter] 已切换到 ${environment} 实现`);
    }
}

/**
 * 获取当前环境的 token 刷新器
 */
function getCurrentRefresher() {
    if (currentRefresher) {
        return currentRefresher;
    }

    const env = detectEnvironment();

    // 查找自定义实现
    if (customRefreshers.has(env)) {
        currentRefresher = customRefreshers.get(env);
        console.log(`[TokenRefreshAdapter] 使用 ${env} 环境的自定义实现:`, currentRefresher.name);
        return currentRefresher;
    }

    // 使用浏览器默认实现
    currentRefresher = browserTokenRefresher;
    console.log(`[TokenRefreshAdapter] 使用默认浏览器实现`);
    return currentRefresher;
}

/**
 * 统一的 token 刷新接口
 *
 * @returns {Promise<TokenRefreshResult>}
 *
 * @example
 * try {
 *   const result = await refreshAccessToken();
 *   if (result.success) {
 *     localStorage.setItem('accessToken', result.accessToken);
 *     console.log('Token refreshed successfully');
 *   }
 * } catch (error) {
 *   console.error('Token refresh failed:', error);
 * }
 */
export async function refreshAccessToken() {
    const refresher = getCurrentRefresher();

    try {
        const result = await refresher.refreshAccessToken();

        // 验证结果格式
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid refresher result format');
        }

        if (!result.success) {
            throw new Error(result.error || 'Token refresh failed');
        }

        if (!result.accessToken) {
            throw new Error('No accessToken returned from refresher');
        }

        return result;

    } catch (error) {
        console.error('[TokenRefreshAdapter] Token refresh failed:', error);
        throw error;
    }
}

/**
 * 保存 refreshToken（浏览器环境）
 * @param {string} refreshToken - 要保存的 refreshToken
 */
export function saveRefreshToken(refreshToken) {
    if (detectEnvironment() === 'browser') {
        CookieUtils.set('refreshToken', refreshToken, 30);
        console.log('[TokenRefreshAdapter] RefreshToken saved to cookie');
    }
}

/**
 * 清除 refreshToken（浏览器环境）
 */
export function clearRefreshToken() {
    if (detectEnvironment() === 'browser') {
        CookieUtils.remove('refreshToken');
        console.log('[TokenRefreshAdapter] RefreshToken cleared from cookie');
    }
}

/**
 * 重置 token 刷新器（用于测试）
 */
export function resetTokenRefresher() {
    currentRefresher = null;
    customRefreshers.clear();
}

/**
 * 获取当前环境信息（用于调试）
 */
export function getEnvironmentInfo() {
    const env = detectEnvironment();
    const refresher = getCurrentRefresher();

    return {
        environment: env,
        refresherName: refresher.name,
        hasCustomRefresher: customRefreshers.has(env),
        registeredEnvironments: Array.from(customRefreshers.keys()),
        hasRefreshToken: detectEnvironment() === 'browser' ? !!CookieUtils.get('refreshToken') : 'N/A'
    };
}

// 导出环境检测函数（供外部使用）
export { detectEnvironment };

// 导出 Cookie 工具（供外部使用）
export { CookieUtils };
