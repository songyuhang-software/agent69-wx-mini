/**
 * [适配器名称] 初始化模板
 * 
 * 使用此模板创建新的适配器初始化模块：
 * 1. 复制此文件到新的适配器目录
 * 2. 将所有 "YourAdapter" 替换为实际的适配器名称
 * 3. 实现各平台的注册逻辑
 */

import { registerYourAdapter, getEnvironmentInfo } from './yourAdapterAdapter.js';

/**
 * 初始化适配器
 * 在应用入口调用此函数
 */
export function initYourAdapter() {
    console.log('[YourAdapter] 开始初始化适配器...');
    
    // iOS App 环境
    if (window.webkit?.messageHandlers?.yourHandler) {
        console.log('[YourAdapter] 检测到 iOS App 环境');
        registerIOSImplementation();
    }
    
    // Android App 环境
    else if (window.AndroidYourInterface) {
        console.log('[YourAdapter] 检测到 Android App 环境');
        registerAndroidImplementation();
    }
    
    // 微信小程序环境
    else if (typeof wx !== 'undefined' && wx.miniProgram) {
        console.log('[YourAdapter] 检测到微信小程序环境');
        registerWeChatImplementation();
    }
    
    // 支付宝小程序环境
    else if (typeof my !== 'undefined' && my.env) {
        console.log('[YourAdapter] 检测到支付宝小程序环境');
        registerAlipayImplementation();
    }
    
    // 浏览器环境（默认）
    else {
        console.log('[YourAdapter] 使用浏览器默认实现');
    }
    
    // 输出环境信息
    const envInfo = getEnvironmentInfo();
    console.log('[YourAdapter] 初始化完成:', envInfo);
}

/**
 * iOS App 实现
 */
function registerIOSImplementation() {
    registerYourAdapter('native-app', {
        name: 'iOS YourAdapter Implementation',
        
        async yourMethod(options) {
            return new Promise((resolve, reject) => {
                const callbackId = 'yourAdapter_' + Date.now();
                
                // 注册全局回调
                window[callbackId] = (result) => {
                    delete window[callbackId]; // 清理
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || '操作失败'));
                    }
                };
                
                // 设置超时（防止原生没有响应）
                const timeoutId = setTimeout(() => {
                    if (window[callbackId]) {
                        delete window[callbackId];
                        reject(new Error('操作超时'));
                    }
                }, options.timeout || 120000);
                
                // 调用原生方法
                try {
                    window.webkit.messageHandlers.yourHandler.postMessage({
                        action: 'yourMethod',
                        options: options,
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
function registerAndroidImplementation() {
    registerYourAdapter('native-app', {
        name: 'Android YourAdapter Implementation',
        
        async yourMethod(options) {
            return new Promise((resolve, reject) => {
                const callbackId = 'yourAdapter_' + Date.now();
                
                // 注册回调
                window[callbackId] = (result) => {
                    delete window[callbackId];
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        if (result.cancelled) {
                            reject(new Error('用户取消了操作'));
                        } else {
                            reject(new Error(result.error || '操作失败'));
                        }
                    }
                };
                
                // 设置超时
                const timeoutId = setTimeout(() => {
                    if (window[callbackId]) {
                        delete window[callbackId];
                        reject(new Error('操作超时'));
                    }
                }, options.timeout || 120000);
                
                // 调用 Android 方法
                try {
                    window.AndroidYourInterface.yourMethod(
                        JSON.stringify(options),
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
function registerWeChatImplementation() {
    registerYourAdapter('wechat-miniprogram', {
        name: 'WeChat MiniProgram YourAdapter Implementation',
        
        async yourMethod(options) {
            return new Promise((resolve, reject) => {
                // 方式1: 使用微信小程序 API（如果可用）
                // wx.yourAPI({
                //     success: (res) => {
                //         resolve({
                //             success: true,
                //             data: res
                //         });
                //     },
                //     fail: (err) => {
                //         reject(new Error(err.errMsg));
                //     }
                // });
                
                // 方式2: 跳转到小程序页面
                wx.miniProgram.navigateTo({
                    url: `/pages/your-adapter/index`
                });
                
                // 监听返回消息
                const messageHandler = (e) => {
                    if (e.detail.data && e.detail.data.action === 'yourAdapterResult') {
                        const result = e.detail.data.result;
                        
                        // 清理监听器
                        wx.miniProgram.offMessage?.(messageHandler);
                        
                        if (result.success) {
                            resolve(result);
                        } else if (result.cancelled) {
                            reject(new Error('用户取消了操作'));
                        } else {
                            reject(new Error(result.error || '操作失败'));
                        }
                    }
                };
                
                wx.miniProgram.onMessage?.(messageHandler);
                
                // 设置超时
                setTimeout(() => {
                    wx.miniProgram.offMessage?.(messageHandler);
                    reject(new Error('操作超时'));
                }, options.timeout || 120000);
            });
        }
    });
}

/**
 * 支付宝小程序实现
 */
function registerAlipayImplementation() {
    registerYourAdapter('alipay-miniprogram', {
        name: 'Alipay MiniProgram YourAdapter Implementation',
        
        async yourMethod(options) {
            return new Promise((resolve, reject) => {
                // 使用支付宝小程序 API
                // my.yourAPI({
                //     success: (res) => {
                //         resolve({
                //             success: true,
                //             data: res
                //         });
                //     },
                //     fail: (err) => {
                //         if (err.error === 11) { // 用户取消
                //             reject(new Error('用户取消了操作'));
                //         } else {
                //             reject(new Error(err.errorMessage));
                //         }
                //     }
                // });
                
                reject(new Error('支付宝小程序实现待完成'));
            });
        }
    });
}

/**
 * 用于测试的模拟实现
 */
export function registerMockYourAdapter() {
    registerYourAdapter('native-app', {
        name: 'Mock YourAdapter Implementation (for testing)',
        
        async yourMethod(options) {
            console.log('[Mock] 调用方法:', options);
            
            // 模拟延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟用户取消（20% 概率）
            if (Math.random() < 0.2) {
                throw new Error('用户取消了操作');
            }
            
            // 模拟错误（10% 概率）
            if (Math.random() < 0.1) {
                throw new Error('模拟错误');
            }
            
            // 返回模拟数据
            return {
                success: true,
                data: {
                    mockData: 'test data',
                    timestamp: Date.now()
                },
                cancelled: false
            };
        }
    });
}
