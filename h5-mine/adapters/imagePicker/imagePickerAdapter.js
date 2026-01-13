/**
 * 图片选择适配器
 * 提供统一的图片选择接口，支持多端适配
 *
 * 使用方式：
 * 1. 浏览器环境：直接使用，无需额外配置
 * 2. 原生 App：通过 registerImagePicker 注册原生实现
 * 3. 小程序：通过 registerImagePicker 注册小程序实现
 */

/**
 * 图片选择器接口定义
 * @typedef {Object} ImagePickerInterface
 * @property {Function} chooseImage - 选择图片方法
 * @property {string} name - 实现名称（用于调试）
 */

/**
 * 图片选择结果
 * @typedef {Object} ImagePickerResult
 * @property {boolean} success - 是否成功
 * @property {File|Blob|string} file - 文件对象或 base64 数据
 * @property {string} [error] - 错误信息
 * @property {boolean} [cancelled] - 是否用户取消
 */

// 存储当前使用的图片选择器实现
let currentPicker = null;

// 存储自定义实现
const customPickers = new Map();

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
    // 客户端需要在 window 上注入 NativeApp 或 webkit.messageHandlers
    if (typeof window !== 'undefined') {
        if (window.NativeApp ||
            window.webkit?.messageHandlers?.imagePickerHandler ||
            window.AndroidImagePicker) {
            return 'native-app';
        }
    }

    // 默认浏览器环境
    return 'browser';
}

/**
 * 浏览器环境的默认实现
 */
const browserImagePicker = {
    name: 'Browser Image Picker',

    /**
     * 浏览器环境选择图片
     * @param {Object} options - 配置选项
     * @param {string} options.sourceType - 来源类型：'camera' | 'album' | 'auto'
     * @param {number} options.timeout - 超时时间（毫秒），默认 60000
     * @returns {Promise<ImagePickerResult>}
     */
    async chooseImage(options = {}) {
        const {
            sourceType = 'auto',
            timeout = 60000
        } = options;

        return new Promise((resolve, reject) => {
            // 创建 input 元素
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            // 设置拍照或相册
            if (sourceType === 'camera') {
                input.setAttribute('capture', 'camera');
            } else if (sourceType === 'album') {
                input.removeAttribute('capture');
            }

            let isResolved = false;
            let focusCheckTimer = null;
            let timeoutTimer = null;

            // 清理函数
            const cleanup = () => {
                if (focusCheckTimer) clearTimeout(focusCheckTimer);
                if (timeoutTimer) clearTimeout(timeoutTimer);
                window.removeEventListener('focus', onWindowFocus);
                // 移除 input 元素
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
            };

            // 完成函数（确保只执行一次）
            const finish = (result) => {
                if (isResolved) return;
                isResolved = true;
                cleanup();

                if (result.success) {
                    resolve(result);
                } else {
                    reject(new Error(result.error || '选择图片失败'));
                }
            };

            // 1. Change 事件 - 用户选择了文件
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    finish({
                        success: true,
                        file: file,
                        cancelled: false
                    });
                } else {
                    finish({
                        success: false,
                        error: '未选择图片',
                        cancelled: true
                    });
                }
            };

            // 2. Error 事件
            input.onerror = () => {
                finish({
                    success: false,
                    error: '文件选择失败',
                    cancelled: false
                });
            };

            // 3. Focus 检测 - 快速检测用户取消
            const onWindowFocus = () => {
                // 延迟检查，给 change 事件触发的机会
                focusCheckTimer = setTimeout(() => {
                    if (!isResolved && input.files.length === 0) {
                        finish({
                            success: false,
                            error: '用户取消了选择',
                            cancelled: true
                        });
                    }
                }, 300);
            };

            // 监听窗口焦点（仅在浏览器环境）
            if (typeof window !== 'undefined' && window.addEventListener) {
                window.addEventListener('focus', onWindowFocus, { once: false });
            }

            // 4. 超时兜底
            timeoutTimer = setTimeout(() => {
                finish({
                    success: false,
                    error: '选择超时，操作已取消',
                    cancelled: true
                });
            }, timeout);

            // 触发文件选择
            try {
                input.click();
            } catch (error) {
                finish({
                    success: false,
                    error: '无法打开文件选择器: ' + error.message,
                    cancelled: false
                });
            }
        });
    }
};

/**
 * 注册自定义图片选择器实现
 *
 * @param {string} environment - 环境标识：'native-app' | 'wechat-miniprogram' | 'alipay-miniprogram' | 自定义
 * @param {ImagePickerInterface} implementation - 实现对象
 *
 * @example
 * // 在原生 App 中注册
 * registerImagePicker('native-app', {
 *   name: 'iOS Native Picker',
 *   async chooseImage(options) {
 *     return new Promise((resolve, reject) => {
 *       window.webkit.messageHandlers.imagePickerHandler.postMessage({
 *         action: 'chooseImage',
 *         options: options,
 *         callbackId: 'callback_' + Date.now()
 *       });
 *
 *       window.imagePickerCallback = (result) => {
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
export function registerImagePicker(environment, implementation) {
    if (!implementation || typeof implementation.chooseImage !== 'function') {
        throw new Error('Invalid image picker implementation: must have a chooseImage method');
    }

    customPickers.set(environment, implementation);
    console.log(`[ImagePickerAdapter] 已注册 ${environment} 环境的图片选择器:`, implementation.name);

    // 如果当前环境匹配，立即切换
    const currentEnv = detectEnvironment();
    if (currentEnv === environment) {
        currentPicker = implementation;
        console.log(`[ImagePickerAdapter] 已切换到 ${environment} 实现`);
    }
}

/**
 * 获取当前环境的图片选择器
 */
function getCurrentPicker() {
    if (currentPicker) {
        return currentPicker;
    }

    const env = detectEnvironment();

    // 查找自定义实现
    if (customPickers.has(env)) {
        currentPicker = customPickers.get(env);
        console.log(`[ImagePickerAdapter] 使用 ${env} 环境的自定义实现:`, currentPicker.name);
        return currentPicker;
    }

    // 使用浏览器默认实现
    currentPicker = browserImagePicker;
    console.log(`[ImagePickerAdapter] 使用默认浏览器实现`);
    return currentPicker;
}

/**
 * 统一的图片选择接口
 *
 * @param {Object} options - 配置选项
 * @param {string} [options.sourceType='auto'] - 来源类型：'camera' | 'album' | 'auto'
 * @param {number} [options.timeout=60000] - 超时时间（毫秒）
 * @param {number} [options.maxSize] - 最大文件大小（字节）
 * @param {string[]} [options.allowedTypes] - 允许的文件类型
 * @returns {Promise<ImagePickerResult>}
 *
 * @example
 * try {
 *   const result = await chooseImage({ sourceType: 'album' });
 *   console.log('选择的图片:', result.file);
 * } catch (error) {
 *   if (error.message.includes('取消')) {
 *     console.log('用户取消了选择');
 *   } else {
 *     console.error('选择失败:', error);
 *   }
 * }
 */
export async function chooseImage(options = {}) {
    const picker = getCurrentPicker();

    try {
        const result = await picker.chooseImage(options);

        // 验证结果格式
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid picker result format');
        }

        if (!result.success) {
            throw new Error(result.error || '选择图片失败');
        }

        if (!result.file) {
            throw new Error('No file returned from picker');
        }

        // 可选：文件大小验证
        if (options.maxSize && result.file.size > options.maxSize) {
            throw new Error(`文件大小超过限制 (${Math.round(options.maxSize / 1024 / 1024)}MB)`);
        }

        // 可选：文件类型验证
        if (options.allowedTypes && result.file.type) {
            if (!options.allowedTypes.includes(result.file.type)) {
                throw new Error(`不支持的文件类型: ${result.file.type}`);
            }
        }

        return result;

    } catch (error) {
        console.error('[ImagePickerAdapter] 选择图片失败:', error);
        throw error;
    }
}

/**
 * 重置图片选择器（用于测试）
 */
export function resetImagePicker() {
    currentPicker = null;
    customPickers.clear();
}

/**
 * 获取当前环境信息（用于调试）
 */
export function getEnvironmentInfo() {
    const env = detectEnvironment();
    const picker = getCurrentPicker();

    return {
        environment: env,
        pickerName: picker.name,
        hasCustomPicker: customPickers.has(env),
        registeredEnvironments: Array.from(customPickers.keys())
    };
}

// 导出环境检测函数（供外部使用）
export { detectEnvironment };
