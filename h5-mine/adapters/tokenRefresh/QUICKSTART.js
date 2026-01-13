/**
 * Token 刷新适配器使用示例
 *
 * 本文件展示如何在项目中使用 token 刷新适配器
 */

import {
    refreshAccessToken,
    saveRefreshToken,
    clearRefreshToken,
    getTokenRefreshInfo
} from './tokenRefreshAdapter.js';

// ============================================
// 示例 1: 登录成功后保存 refreshToken
// ============================================
async function exampleLogin() {
    const response = await fetch('https://userservice.preview.huawei-zeabur.cn/api/users/login/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'testuser',
            password: 'password123'
        })
    });

    const data = await response.json();

    if (data.accessToken) {
        // 保存 accessToken 到 localStorage
        localStorage.setItem('accessToken', data.accessToken);

        // 保存 refreshToken 到 cookie
        if (data.refreshToken) {
            saveRefreshToken(data.refreshToken);
            console.log('✅ RefreshToken 已保存到 cookie');
        }
    }
}

// ============================================
// 示例 2: 刷新 accessToken
// ============================================
async function exampleRefreshToken() {
    try {
        console.log('🔄 开始刷新 token...');

        const result = await refreshAccessToken();

        if (result.success) {
            // 更新 accessToken
            localStorage.setItem('accessToken', result.accessToken);
            console.log('✅ Token 刷新成功');
            console.log('新的 accessToken:', result.accessToken);

            // refreshToken 已自动更新到 cookie
        }
    } catch (error) {
        console.error('❌ Token 刷新失败:', error);

        // 刷新失败,跳转到登录页面
        window.location.href = '/login';
    }
}

// ============================================
// 示例 3: 在 API 请求前自动刷新 token
// ============================================
async function exampleApiRequest(url, options = {}) {
    let accessToken = localStorage.getItem('accessToken');

    // 检查 token 是否即将过期
    if (!accessToken || isTokenExpiringSoon(accessToken)) {
        console.log('⚠️ Token 即将过期,尝试刷新...');

        try {
            const result = await refreshAccessToken();
            if (result.success) {
                accessToken = result.accessToken;
                localStorage.setItem('accessToken', accessToken);
                console.log('✅ Token 已自动刷新');
            }
        } catch (error) {
            console.error('❌ Token 刷新失败:', error);
            window.location.href = '/login';
            return;
        }
    }

    // 使用新的 accessToken 发起请求
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
    };

    return fetch(url, { ...options, headers });
}

// 辅助函数: 检查 token 是否即将过期
function isTokenExpiringSoon(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;

        const payload = JSON.parse(atob(parts[1]));
        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        const ONE_MINUTE = 60 * 1000;

        return timeUntilExpiry < ONE_MINUTE;
    } catch (error) {
        return true;
    }
}

// ============================================
// 示例 4: 登出时清除 refreshToken
// ============================================
function exampleLogout() {
    // 清除 accessToken
    localStorage.removeItem('accessToken');

    // 清除 refreshToken
    clearRefreshToken();
    console.log('✅ 已清除所有 token');

    // 跳转到登录页面
    window.location.href = '/login';
}

// ============================================
// 示例 5: 查看当前环境信息
// ============================================
function exampleGetEnvironmentInfo() {
    const info = getTokenRefreshInfo();
    console.log('📊 当前环境信息:', info);
    // {
    //   environment: 'browser',
    //   refresherName: 'Browser Token Refresher',
    //   hasCustomRefresher: false,
    //   registeredEnvironments: [],
    //   hasRefreshToken: true
    // }
}

// ============================================
// 示例 6: 完整的登录流程
// ============================================
async function exampleCompleteLoginFlow() {
    try {
        // 1. 用户登录
        const loginResponse = await fetch('https://userservice.preview.huawei-zeabur.cn/api/users/login/username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser',
                password: 'password123'
            })
        });

        const loginData = await loginResponse.json();

        if (loginData.accessToken) {
            // 2. 保存 tokens
            localStorage.setItem('accessToken', loginData.accessToken);
            if (loginData.refreshToken) {
                saveRefreshToken(loginData.refreshToken);
            }
            console.log('✅ 登录成功');

            // 3. 模拟 token 即将过期
            console.log('⏰ 等待 token 即将过期...');

            // 4. 自动刷新 token
            const refreshResult = await refreshAccessToken();
            if (refreshResult.success) {
                localStorage.setItem('accessToken', refreshResult.accessToken);
                console.log('✅ Token 自动刷新成功');
            }

            // 5. 使用新的 token 发起 API 请求
            const apiResponse = await exampleApiRequest('https://api.example.com/data');
            console.log('✅ API 请求成功');

            // 6. 用户登出
            exampleLogout();
        }
    } catch (error) {
        console.error('❌ 流程失败:', error);
    }
}

// ============================================
// 导出示例函数
// ============================================
export {
    exampleLogin,
    exampleRefreshToken,
    exampleApiRequest,
    exampleLogout,
    exampleGetEnvironmentInfo,
    exampleCompleteLoginFlow
};

// ============================================
// 在浏览器控制台中测试
// ============================================
// 打开浏览器控制台,执行:
//
// import { exampleLogin, exampleRefreshToken } from './js/adapters/tokenRefresh/QUICKSTART.js';
//
// // 测试登录
// await exampleLogin();
//
// // 测试刷新
// await exampleRefreshToken();
