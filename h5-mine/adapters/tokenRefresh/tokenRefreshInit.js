/**
 * Token 刷新器初始化
 * 在应用启动时调用，根据不同环境注册相应的实现
 */

import { registerTokenRefresh, getEnvironmentInfo } from './tokenRefreshAdapter.js';

/**
 * 初始化 token 刷新器
 * 在应用入口调用此函数
 */
export function initTokenRefresh() {
    console.log('[TokenRefresh] 开始初始化 token 刷新器...');

    // iOS App 环境
    if (window.webkit?.messageHandlers?.tokenRefreshHandler) {
        console.log('[TokenRefresh] 检测到 iOS App 环境');
        registerIOSTokenRefresh();
    }

    // Android App 环境
    else if (window.AndroidTokenRefresh) {
        console.log('[TokenRefresh] 检测到 Android App 环境');
        registerAndroidTokenRefresh();
    }

    // 微信小程序环境
    else if (typeof wx !== 'undefined' && wx.miniProgram) {
        console.log('[TokenRefresh] 检测到微信小程序环境');
        registerWeChatTokenRefresh();
    }

    // 支付宝小程序环境
    else if (typeof my !== 'undefined' && my.env) {
        console.log('[TokenRefresh] 检测到支付宝小程序环境');
        registerAlipayTokenRefresh();
    }

    // 浏览器环境（默认）
    else {
        console.log('[TokenRefresh] 使用浏览器默认实现');
    }

    // 输出环境信息
    const envInfo = getEnvironmentInfo();
    console.log('[TokenRefresh] 初始化完成:', envInfo);
}

/**
 * iOS App 实现
 * iOS 端需要通过设备号来刷新 token
 */
function registerIOSTokenRefresh() {
    registerTokenRefresh('native-app', {
        name: 'iOS Native Token Refresher',

        async refreshAccessToken() {
            return new Promise((resolve, reject) => {
                const callbackId = 'tokenRefresh_' + Date.now();

                // 注册全局回调
                window[callbackId] = (result) => {
                    delete window[callbackId]; // 清理

                    if (result.success) {
                        resolve({
                            success: true,
                            accessToken: result.accessToken,
                            refreshToken: result.refreshToken
                        });
                    } else {
                        reject(new Error(result.error || 'Token refresh failed'));
                    }
                };

                // 设置超时（防止原生没有响应）
                const timeoutId = setTimeout(() => {
                    if (window[callbackId]) {
                        delete window[callbackId];
                        reject(new Error('Token refresh timeout'));
                    }
                }, 30000); // 30秒超时

                // 调用原生方法
                try {
                    window.webkit.messageHandlers.tokenRefreshHandler.postMessage({
                        action: 'refreshToken',
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
 * Android 端需要通过设备号来刷新 token
 */
function registerAndroidTokenRefresh() {
    registerTokenRefresh('native-app', {
        name: 'Android Native Token Refresher',

        async refreshAccessToken() {
            return new Promise((resolve, reject) => {
                const callbackId = 'tokenRefresh_' + Date.now();

                // 注册回调
                window[callbackId] = (result) => {
                    delete window[callbackId];

                    if (result.success) {
                        resolve({
                            success: true,
                            accessToken: result.accessToken,
                            refreshToken: result.refreshToken
                        });
                    } else {
                        reject(new Error(result.error || 'Token refresh failed'));
                    }
                };

                // 设置超时
                const timeoutId = setTimeout(() => {
                    if (window[callbackId]) {
                        delete window[callbackId];
                        reject(new Error('Token refresh timeout'));
                    }
                }, 30000);

                // 调用 Android 方法
                try {
                    window.AndroidTokenRefresh.refreshToken(callbackId);
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
 * 小程序端需要通过 openid 来刷新 token
 */
function registerWeChatTokenRefresh() {
    registerTokenRefresh('wechat-miniprogram', {
        name: 'WeChat MiniProgram Token Refresher',

        async refreshAccessToken() {
            return new Promise((resolve, reject) => {
                // 微信小程序需要通过 postMessage 与小程序通信
                // 小程序端需要实现对应的处理逻辑

                // 方案：通过 wx.miniProgram.postMessage 发送刷新请求
                try {
                    wx.miniProgram.postMessage({
                        data: {
                            action: 'refreshToken'
                        }
                    });

                    // 监听返回消息
                    const messageHandler = (e) => {
                        if (e.detail.data && e.detail.data.action === 'tokenRefreshed') {
                            const result = e.detail.data.result;

                            // 清理监听器
                            wx.miniProgram.offMessage?.(messageHandler);

                            if (result.success) {
                                resolve({
                                    success: true,
                                    accessToken: result.accessToken,
                                    refreshToken: result.refreshToken
                                });
                            } else {
                                reject(new Error(result.error || 'Token refresh failed'));
                            }
                        }
                    };

                    wx.miniProgram.onMessage?.(messageHandler);

                    // 设置超时
                    setTimeout(() => {
                        wx.miniProgram.offMessage?.(messageHandler);
                        reject(new Error('Token refresh timeout'));
                    }, 30000);
                } catch (error) {
                    reject(new Error('微信小程序调用失败: ' + error.message));
                }
            });
        }
    });
}

/**
 * 支付宝小程序实现
 * 小程序端需要通过 openid 来刷新 token
 */
function registerAlipayTokenRefresh() {
    registerTokenRefresh('alipay-miniprogram', {
        name: 'Alipay MiniProgram Token Refresher',

        async refreshAccessToken() {
            return new Promise((resolve, reject) => {
                // 支付宝小程序的实现
                // 需要根据实际情况调整

                try {
                    my.postMessage({
                        action: 'refreshToken'
                    });

                    // 监听返回消息
                    const messageHandler = (res) => {
                        if (res.action === 'tokenRefreshed') {
                            if (res.success) {
                                resolve({
                                    success: true,
                                    accessToken: res.accessToken,
                                    refreshToken: res.refreshToken
                                });
                            } else {
                                reject(new Error(res.error || 'Token refresh failed'));
                            }
                        }
                    };

                    my.onMessage?.(messageHandler);

                    // 设置超时
                    setTimeout(() => {
                        my.offMessage?.(messageHandler);
                        reject(new Error('Token refresh timeout'));
                    }, 30000);
                } catch (error) {
                    reject(new Error('支付宝小程序调用失败: ' + error.message));
                }
            });
        }
    });
}

/**
 * 用于测试的模拟实现
 */
export function registerMockTokenRefresh() {
    registerTokenRefresh('native-app', {
        name: 'Mock Token Refresher (for testing)',

        async refreshAccessToken() {
            console.log('[Mock] 刷新 token...');

            // 模拟延迟
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 模拟刷新失败（20% 概率）
            if (Math.random() < 0.2) {
                throw new Error('Token refresh failed (mock)');
            }

            // 生成模拟的 token
            const mockAccessToken = 'mock_access_token_' + Date.now();
            const mockRefreshToken = 'mock_refresh_token_' + Date.now();

            return {
                success: true,
                accessToken: mockAccessToken,
                refreshToken: mockRefreshToken
            };
        }
    });
}
