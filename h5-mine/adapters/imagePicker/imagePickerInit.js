/**
 * 图片选择器初始化
 * 在应用启动时调用，根据不同环境注册相应的实现
 */

import { registerImagePicker, getEnvironmentInfo } from './imagePickerAdapter.js';

/**
 * 初始化图片选择器
 * 在应用入口调用此函数
 */
export function initImagePicker() {
    console.log('[ImagePicker] 开始初始化图片选择器...');

    // iOS App 环境
    if (window.webkit?.messageHandlers?.imagePickerHandler) {
        console.log('[ImagePicker] 检测到 iOS App 环境');
        registerIOSImagePicker();
    }

    // Android App 环境
    else if (window.AndroidImagePicker) {
        console.log('[ImagePicker] 检测到 Android App 环境');
        registerAndroidImagePicker();
    }

    // 微信小程序环境
    else if (typeof wx !== 'undefined' && wx.miniProgram) {
        console.log('[ImagePicker] 检测到微信小程序环境');
        registerWeChatImagePicker();
    }

    // 支付宝小程序环境
    else if (typeof my !== 'undefined' && my.env) {
        console.log('[ImagePicker] 检测到支付宝小程序环境');
        registerAlipayImagePicker();
    }

    // 浏览器环境（默认）
    else {
        console.log('[ImagePicker] 使用浏览器默认实现');
    }

    // 输出环境信息
    const envInfo = getEnvironmentInfo();
    console.log('[ImagePicker] 初始化完成:', envInfo);
}

/**
 * iOS App 实现
 */
function registerIOSImagePicker() {
    registerImagePicker('native-app', {
        name: 'iOS Native Image Picker',

        async chooseImage(options) {
            return new Promise((resolve, reject) => {
                const callbackId = 'imagePicker_' + Date.now();

                // 注册全局回调
                window[callbackId] = (result) => {
                    delete window[callbackId]; // 清理

                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || '选择图片失败'));
                    }
                };

                // 设置超时（防止原生没有响应）
                const timeoutId = setTimeout(() => {
                    if (window[callbackId]) {
                        delete window[callbackId];
                        reject(new Error('选择图片超时'));
                    }
                }, 120000); // 2分钟超时

                // 调用原生方法
                try {
                    window.webkit.messageHandlers.imagePickerHandler.postMessage({
                        action: 'chooseImage',
                        options: {
                            sourceType: options.sourceType || 'album',
                            maxSize: options.maxSize,
                            timeout: options.timeout
                        },
                        callbackId: callbackId
                    });
                } catch (error) {
                    clearTimeout(timeoutId);
                    delete window[callbackId];
                    reject(new Error('调用原生方法失败: ' + error.message));
                }
            });
        }
    });
}

/**
 * Android App 实现
 */
function registerAndroidImagePicker() {
    registerImagePicker('native-app', {
        name: 'Android Native Image Picker',

        async chooseImage(options) {
            return new Promise((resolve, reject) => {
                const callbackId = 'imagePicker_' + Date.now();

                // 注册回调
                window[callbackId] = (result) => {
                    delete window[callbackId];

                    if (result.success) {
                        // Android 返回 base64，需要转换为 Blob
                        if (result.dataUrl) {
                            fetch(result.dataUrl)
                                .then(res => res.blob())
                                .then(blob => {
                                    resolve({
                                        success: true,
                                        file: blob,
                                        cancelled: false
                                    });
                                })
                                .catch(err => {
                                    reject(new Error('转换图片失败: ' + err.message));
                                });
                        } else if (result.file) {
                            resolve(result);
                        } else {
                            reject(new Error('原生返回的数据格式不正确'));
                        }
                    } else {
                        if (result.cancelled) {
                            reject(new Error('用户取消了选择'));
                        } else {
                            reject(new Error(result.error || '选择图片失败'));
                        }
                    }
                };

                // 设置超时
                const timeoutId = setTimeout(() => {
                    if (window[callbackId]) {
                        delete window[callbackId];
                        reject(new Error('选择图片超时'));
                    }
                }, 120000);

                // 调用 Android 方法
                try {
                    window.AndroidImagePicker.chooseImage(
                        JSON.stringify({
                            sourceType: options.sourceType || 'album',
                            maxSize: options.maxSize
                        }),
                        callbackId
                    );
                } catch (error) {
                    clearTimeout(timeoutId);
                    delete window[callbackId];
                    reject(new Error('调用原生方法失败: ' + error.message));
                }
            });
        }
    });
}

/**
 * 微信小程序实现
 */
function registerWeChatImagePicker() {
    registerImagePicker('wechat-miniprogram', {
        name: 'WeChat MiniProgram Image Picker',

        async chooseImage(options) {
            return new Promise((resolve, reject) => {
                // 微信小程序需要跳转到专门的图片选择页面
                // 或者使用 wx.chooseImage（如果在小程序 WebView 中可用）

                // 方案1: 跳转到小程序页面
                wx.miniProgram.navigateTo({
                    url: `/pages/image-picker/index?sourceType=${options.sourceType || 'album'}`
                });

                // 监听返回消息
                const messageHandler = (e) => {
                    if (e.detail.data && e.detail.data.action === 'imageSelected') {
                        const result = e.detail.data.result;

                        // 清理监听器
                        wx.miniProgram.offMessage?.(messageHandler);

                        if (result.success) {
                            // 处理小程序返回的临时路径
                            resolve({
                                success: true,
                                file: result.file || result.tempFilePath,
                                cancelled: false
                            });
                        } else if (result.cancelled) {
                            reject(new Error('用户取消了选择'));
                        } else {
                            reject(new Error(result.error || '选择图片失败'));
                        }
                    }
                };

                wx.miniProgram.onMessage?.(messageHandler);

                // 设置超时
                setTimeout(() => {
                    wx.miniProgram.offMessage?.(messageHandler);
                    reject(new Error('选择图片超时'));
                }, 120000);
            });
        }
    });
}

/**
 * 支付宝小程序实现
 */
function registerAlipayImagePicker() {
    registerImagePicker('alipay-miniprogram', {
        name: 'Alipay MiniProgram Image Picker',

        async chooseImage(options) {
            return new Promise((resolve, reject) => {
                // 支付宝小程序的实现
                // 需要根据实际情况调整

                my.chooseImage({
                    count: 1,
                    sourceType: options.sourceType === 'camera' ? ['camera'] : ['album'],
                    success: (res) => {
                        const filePath = res.filePaths[0];

                        resolve({
                            success: true,
                            file: filePath, // 支付宝返回的是路径
                            cancelled: false
                        });
                    },
                    fail: (err) => {
                        if (err.error === 11) { // 用户取消
                            reject(new Error('用户取消了选择'));
                        } else {
                            reject(new Error(err.errorMessage || '选择图片失败'));
                        }
                    }
                });
            });
        }
    });
}

/**
 * 用于测试的模拟实现
 */
export function registerMockImagePicker() {
    registerImagePicker('native-app', {
        name: 'Mock Image Picker (for testing)',

        async chooseImage(options) {
            console.log('[Mock] 选择图片:', options);

            // 模拟延迟
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 模拟用户取消（30% 概率）
            if (Math.random() < 0.3) {
                throw new Error('用户取消了选择');
            }

            // 创建一个模拟的图片 Blob
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');

            // 绘制一个简单的图案
            ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16);
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('Mock Image', 50, 100);

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve({
                        success: true,
                        file: blob,
                        cancelled: false
                    });
                }, 'image/jpeg', 0.8);
            });
        }
    });
}
