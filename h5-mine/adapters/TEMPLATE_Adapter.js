/**
 * [适配器名称] 适配器模板
 * 
 * 使用此模板创建新的适配器：
 * 1. 复制此文件到新的适配器目录
 * 2. 将所有 "YourAdapter" 替换为实际的适配器名称
 * 3. 实现具体的功能逻辑
 * 4. 编写对应的 README 文档
 */

/**
 * 检测当前运行环境
 * @returns {string} 环境标识
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
    
    // 原生 App - 根据实际的 JSBridge 接口判断
    // 修改这里的判断条件以匹配你的原生接口
    if (typeof window !== 'undefined') {
        if (window.YourNativeInterface || 
            window.webkit?.messageHandlers?.yourHandler ||
            window.AndroidYourInterface) {
            return 'native-app';
        }
    }
    
    // 默认浏览器环境
    return 'browser';
}

/**
 * 浏览器环境的默认实现
 */
const browserImplementation = {
    name: 'Browser YourAdapter Implementation',
    
    /**
     * 主要方法 - 浏览器实现
     * @param {Object} options - 配置选项
     * @returns {Promise<Object>} 操作结果
     */
    async yourMethod(options = {}) {
        // TODO: 实现浏览器环境的逻辑
        
        return new Promise((resolve, reject) => {
            try {
                // 浏览器实现逻辑
                const result = {
                    success: true,
                    data: 'result data',
                    cancelled: false
                };
                
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }
};

// 存储当前使用的实现
let currentImplementation = null;

// 存储自定义实现
const customImplementations = new Map();

/**
 * 注册自定义实现
 * 
 * @param {string} environment - 环境标识
 * @param {Object} implementation - 实现对象
 * 
 * @example
 * registerYourAdapter('native-app', {
 *   name: 'iOS Implementation',
 *   async yourMethod(options) {
 *     // iOS 实现
 *   }
 * });
 */
export function registerYourAdapter(environment, implementation) {
    if (!implementation || typeof implementation.yourMethod !== 'function') {
        throw new Error('Invalid implementation: must have a yourMethod method');
    }
    
    customImplementations.set(environment, implementation);
    console.log(`[YourAdapter] 已注册 ${environment} 环境的实现:`, implementation.name);
    
    // 如果当前环境匹配，立即切换
    const currentEnv = detectEnvironment();
    if (currentEnv === environment) {
        currentImplementation = implementation;
        console.log(`[YourAdapter] 已切换到 ${environment} 实现`);
    }
}

/**
 * 获取当前环境的实现
 */
function getCurrentImplementation() {
    if (currentImplementation) {
        return currentImplementation;
    }
    
    const env = detectEnvironment();
    
    // 查找自定义实现
    if (customImplementations.has(env)) {
        currentImplementation = customImplementations.get(env);
        console.log(`[YourAdapter] 使用 ${env} 环境的自定义实现:`, currentImplementation.name);
        return currentImplementation;
    }
    
    // 使用浏览器默认实现
    currentImplementation = browserImplementation;
    console.log(`[YourAdapter] 使用默认浏览器实现`);
    return currentImplementation;
}

/**
 * 统一的接口 - 主要方法
 * 
 * @param {Object} options - 配置选项
 * @param {number} [options.timeout=60000] - 超时时间（毫秒）
 * @returns {Promise<Object>} 操作结果
 * 
 * @example
 * try {
 *   const result = await yourMethod({ timeout: 30000 });
 *   console.log('成功:', result.data);
 * } catch (error) {
 *   console.error('失败:', error);
 * }
 */
export async function yourMethod(options = {}) {
    const implementation = getCurrentImplementation();
    
    try {
        const result = await implementation.yourMethod(options);
        
        // 验证结果格式
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid result format');
        }
        
        if (!result.success) {
            throw new Error(result.error || '操作失败');
        }
        
        return result;
        
    } catch (error) {
        console.error('[YourAdapter] 操作失败:', error);
        throw error;
    }
}

/**
 * 重置适配器（用于测试）
 */
export function resetYourAdapter() {
    currentImplementation = null;
    customImplementations.clear();
}

/**
 * 获取当前环境信息（用于调试）
 */
export function getEnvironmentInfo() {
    const env = detectEnvironment();
    const implementation = getCurrentImplementation();
    
    return {
        environment: env,
        implementationName: implementation.name,
        hasCustomImplementation: customImplementations.has(env),
        registeredEnvironments: Array.from(customImplementations.keys())
    };
}

// 导出环境检测函数（供外部使用）
export { detectEnvironment };
