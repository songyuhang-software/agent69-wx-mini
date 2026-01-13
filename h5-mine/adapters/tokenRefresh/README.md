# Token 刷新适配器

## 功能说明

Token 刷新适配器提供统一的 token 刷新接口,支持多端适配:
- **浏览器环境**: 使用 cookie 中存储的 refreshToken 调用后端接口刷新
- **原生 App (iOS/Android)**: 通过设备号刷新 token (接口预留,需客户端实现)
- **小程序 (微信/支付宝)**: 通过 openid 刷新 token (接口预留,需小程序端实现)

## 快速开始

### 浏览器环境使用


import { refreshAccessToken, saveRefreshToken } from './js/adapters/index.js';

// 1. 登录成功后保存 refreshToken
const loginResponse = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
});
const data = await loginResponse.json();

if (data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
    
    // 保存 refreshToken 到 cookie
    if (data.refreshToken) {
        saveRefreshToken(data.refreshToken);
    }
}

// 2. 需要刷新 token 时
try {
    const result = await refreshAccessToken();
    if (result.success) {
        // 更新 accessToken
        localStorage.setItem('accessToken', result.accessToken);
        console.log('Token 刷新成功');
    }
} catch (error) {
    console.error('Token 刷新失败:', error);
    // 跳转到登录页面
    window.location.href = '/login';
}


## API 文档

### refreshAccessToken()

刷新 accessToken

**参数**: 无

**返回值**:

Promise<{
    success: boolean;      // 是否成功
    accessToken?: string;  // 新的 accessToken
    refreshToken?: string; // 新的 refreshToken
    error?: string;        // 错误信息
}>


**示例**:

const result = await refreshAccessToken();
if (result.success) {
    localStorage.setItem('accessToken', result.accessToken);
}


### saveRefreshToken(refreshToken)

保存 refreshToken 到 cookie (仅浏览器环境)

**参数**:
- `refreshToken` (string) - 要保存的 refreshToken

**示例**:

saveRefreshToken('your_refresh_token_here');


### clearRefreshToken()

清除 cookie 中的 refreshToken (仅浏览器环境)

**示例**:

// 用户登出时清除 refreshToken
clearRefreshToken();
localStorage.removeItem('accessToken');


### registerTokenRefresh(environment, implementation)

注册自定义 token 刷新实现 (用于原生 App 和小程序)

**参数**:
- `environment` (string) - 环境标识: 'native-app' | 'wechat-miniprogram' | 'alipay-miniprogram'
- `implementation` (object) - 实现对象,必须包含 `refreshAccessToken` 方法

**示例**: 见下方各平台集成说明

## 浏览器环境

### 工作原理

1. 登录成功后,将 `refreshToken` 保存到 cookie (有效期 30 天)
2. 当 `accessToken` 即将过期时,自动从 cookie 中读取 `refreshToken`
3. 调用后端刷新接口: `POST /api/users/login/refresh-token`
4. 如果刷新成功,更新 cookie 中的 `refreshToken` 和 localStorage 中的 `accessToken`
5. 如果刷新失败 (refreshToken 过期或无效),清除 cookie 并跳转到登录页面

### 刷新接口


curl --location --request POST 'https://userservice.preview.huawei-zeabur.cn/api/users/login/refresh-token' \
--header 'Content-Type: application/json' \
--data-raw '{
    "refreshToken": "your_refresh_token_here"
}'


**返回值**:

{
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token",
    "userId": "user_id",
    "username": "username",
    "email": "email@example.com"
}


### Cookie 管理

适配器提供了 `CookieUtils` 工具类:


import { CookieUtils } from './js/adapters/index.js';

// 设置 cookie (默认 30 天过期)
CookieUtils.set('refreshToken', 'token_value', 30);

// 获取 cookie
const token = CookieUtils.get('refreshToken');

// 删除 cookie
CookieUtils.remove('refreshToken');


## 原生 App 集成

### iOS 集成

iOS 客户端需要实现 JSBridge 接口,通过设备号刷新 token。

#### 1. 注入 JSBridge Handler


// 在 WKWebView 配置中注入 handler
let contentController = WKUserContentController()
contentController.add(self, name: "tokenRefreshHandler")

let config = WKWebViewConfiguration()
config.userContentController = contentController


#### 2. 实现刷新逻辑


func userContentController(_ userContentController: WKUserContentController, 
                          didReceive message: WKScriptMessage) {
    guard message.name == "tokenRefreshHandler",
          let body = message.body as? [String: Any],
          let action = body["action"] as? String,
          let callbackId = body["callbackId"] as? String else {
        return
    }
    
    if action == "refreshToken" {
        // 获取设备号
        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? ""
        
        // 调用后端接口刷新 token (使用设备号)
        refreshTokenWithDeviceId(deviceId) { result in
            // 回调 JS
            let jsCallback = """
                window['\(callbackId)']({
                    success: \(result.success),
                    accessToken: '\(result.accessToken)',
                    refreshToken: '\(result.refreshToken)',
                    error: '\(result.error ?? "")'
                });
            """
            self.webView.evaluateJavaScript(jsCallback)
        }
    }
}


#### 3. Web 端会自动检测并使用

Web 端会自动检测 `window.webkit.messageHandlers.tokenRefreshHandler` 的存在,并使用 iOS 的实现。

### Android 集成

Android 客户端需要实现 JSBridge 接口,通过设备号刷新 token。

#### 1. 创建 JSBridge 接口


public class TokenRefreshBridge {
    private WebView webView;
    
    @JavascriptInterface
    public void refreshToken(String callbackId) {
        // 获取设备号
        String deviceId = Settings.Secure.getString(
            context.getContentResolver(), 
            Settings.Secure.ANDROID_ID
        );
        
        // 调用后端接口刷新 token (使用设备号)
        refreshTokenWithDeviceId(deviceId, new Callback() {
            @Override
            public void onSuccess(String accessToken, String refreshToken) {
                String jsCallback = String.format(
                    "window['%s']({success: true, accessToken: '%s', refreshToken: '%s'});",
                    callbackId, accessToken, refreshToken
                );
                
                webView.post(() -> {
                    webView.evaluateJavascript(jsCallback, null);
                });
            }
            
            @Override
            public void onError(String error) {
                String jsCallback = String.format(
                    "window['%s']({success: false, error: '%s'});",
                    callbackId, error
                );
                
                webView.post(() -> {
                    webView.evaluateJavascript(jsCallback, null);
                });
            }
        });
    }
}


#### 2. 注入 JSBridge


WebView webView = findViewById(R.id.webview);
webView.getSettings().setJavaScriptEnabled(true);
webView.addJavascriptInterface(new TokenRefreshBridge(webView), "AndroidTokenRefresh");


#### 3. Web 端会自动检测并使用

Web 端会自动检测 `window.AndroidTokenRefresh` 的存在,并使用 Android 的实现。

## 小程序集成

### 微信小程序

微信小程序需要通过 openid 刷新 token。

#### 1. 小程序端实现


// 在小程序的 app.js 或页面中监听 web-view 消息
Page({
  onLoad() {
    // 监听来自 web-view 的消息
    wx.onMessage((res) => {
      const data = res.detail.data[0];
      
      if (data.action === 'refreshToken') {
        // 获取 openid (从本地存储或调用 wx.login 获取)
        const openid = wx.getStorageSync('openid');
        
        // 调用后端接口刷新 token (使用 openid)
        wx.request({
          url: 'https://your-api.com/api/refresh-token',
          method: 'POST',
          data: { openid },
          success: (res) => {
            // 发送消息给 web-view
            wx.miniProgram.postMessage({
              data: {
                action: 'tokenRefreshed',
                result: {
                  success: true,
                  accessToken: res.data.accessToken,
                  refreshToken: res.data.refreshToken
                }
              }
            });
          },
          fail: (err) => {
            wx.miniProgram.postMessage({
              data: {
                action: 'tokenRefreshed',
                result: {
                  success: false,
                  error: err.errMsg
                }
              }
            });
          }
        });
      }
    });
  }
});


#### 2. Web 端会自动检测并使用

Web 端会自动检测 `wx.miniProgram` 的存在,并使用微信小程序的实现。

### 支付宝小程序

支付宝小程序的实现类似微信小程序,使用 `my.postMessage` 和 `my.onMessage`。

## 自动初始化

适配器会在应用启动时自动初始化:


import { initAllAdapters } from './js/adapters/index.js';

// 在应用入口调用
initAllAdapters();


这会自动检测当前环境并注册相应的实现。

## 环境检测

可以查看当前环境信息:


import { getTokenRefreshInfo } from './js/adapters/index.js';

const info = getTokenRefreshInfo();
console.log('当前环境:', info);
// {
//   environment: 'browser',
//   refresherName: 'Browser Token Refresher',
//   hasCustomRefresher: false,
//   registeredEnvironments: [],
//   hasRefreshToken: true
// }


## 常见问题

### 1. refreshToken 存储在哪里?

浏览器环境下,`refreshToken` 存储在 cookie 中,有效期 30 天。原生 App 和小程序不需要存储 refreshToken,而是使用设备号或 openid。

### 2. 如何判断是否需要刷新 token?

适配器会自动判断 `accessToken` 是否即将过期 (少于 1 分钟),如果即将过期则自动调用刷新接口。

### 3. 刷新失败怎么办?

如果刷新失败 (refreshToken 过期或无效),适配器会抛出错误,应用应该清除本地存储并跳转到登录页面。

### 4. 原生 App 如何测试?

可以使用模拟实现进行测试:


import { registerMockTokenRefresh } from './js/adapters/index.js';

// 注册模拟实现
registerMockTokenRefresh();

// 测试刷新
const result = await refreshAccessToken();
console.log('刷新结果:', result);


### 5. 小程序端如何获取 openid?

小程序端需要先调用 `wx.login` 获取 code,然后调用后端接口换取 openid。具体实现请参考微信小程序官方文档。

## 完整示例

### 登录流程


import { saveRefreshToken } from './js/adapters/index.js';

async function login(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.accessToken) {
        // 保存 accessToken
        localStorage.setItem('accessToken', data.accessToken);
        
        // 保存 refreshToken 到 cookie
        if (data.refreshToken) {
            saveRefreshToken(data.refreshToken);
        }
        
        // 跳转到首页
        window.location.href = '/home';
    }
}


### Token 刷新流程


import { refreshAccessToken } from './js/adapters/index.js';

async function apiRequest(url, options = {}) {
    let accessToken = localStorage.getItem('accessToken');
    
    // 检查 token 是否即将过期
    if (isTokenExpiringSoon(accessToken)) {
        try {
            const result = await refreshAccessToken();
            if (result.success) {
                accessToken = result.accessToken;
                localStorage.setItem('accessToken', accessToken);
            }
        } catch (error) {
            console.error('Token 刷新失败:', error);
            // 跳转到登录页面
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


### 登出流程


import { clearRefreshToken } from './js/adapters/index.js';

function logout() {
    // 清除 accessToken
    localStorage.removeItem('accessToken');
    
    // 清除 refreshToken
    clearRefreshToken();
    
    // 清除其他用户信息
    localStorage.removeItem('userId');
    localStorage.removeItem('userInfo');
    
    // 跳转到登录页面
    window.location.href = '/login';
}


## 相关文档

- [创建新适配器指南](../CREATE_NEW_ADAPTER.md)
- [适配器架构说明](../README.md)
- [图片选择适配器](../imagePicker/README.md)
