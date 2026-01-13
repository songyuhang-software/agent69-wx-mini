# 多端适配器架构

## 📋 概述

`js/adapters/` 目录包含了所有需要多端适配的功能模块。每个适配器提供统一的接口，在不同平台（浏览器、原生 App、小程序）上有不同的实现。

## 🎯 设计理念

### 核心原则

1. **统一接口**: 业务代码使用统一的 API，不关心平台差异
2. **环境检测**: 自动检测运行环境，选择合适的实现
3. **浏览器优先**: 浏览器环境内置实现，无需配置
4. **外部注入**: 原生/小程序环境通过注册机制注入实现
5. **易于扩展**: 新增平台或功能模块遵循相同模式

### 适配器模式


业务层 (Business Layer)
   ↓ 调用统一接口
适配器层 (Adapter Layer)
   ↓ 环境检测与路由
实现层 (Implementation Layer)
   ├─ 浏览器实现 (内置)
   ├─ iOS 实现 (注册)
   ├─ Android 实现 (注册)
   └─ 小程序实现 (注册)


## 📁 目录结构


js/adapters/
├── README.md                    # 本文件 - 适配器总览
├── index.js                     # 统一导出入口（可选）
│
├── imagePicker/                 # 图片选择适配器 ✅ 已实现
│   ├── imagePickerAdapter.js    # 核心适配器
│   ├── imagePickerInit.js       # 初始化模块
│   ├── README.md                # 详细使用文档
│   ├── QUICKSTART.md            # 快速开始指南
│   └── ARCHITECTURE.md          # 架构设计文档
│
├── fileUpload/                  # 文件上传适配器（规划中）
│   ├── fileUploadAdapter.js
│   ├── fileUploadInit.js
│   └── README.md
│
├── payment/                     # 支付适配器（规划中）
│   ├── paymentAdapter.js
│   ├── paymentInit.js
│   └── README.md
│
├── share/                       # 分享适配器（规划中）
│   ├── shareAdapter.js
│   ├── shareInit.js
│   └── README.md
│
├── location/                    # 定位适配器（规划中）
│   ├── locationAdapter.js
│   ├── locationInit.js
│   └── README.md
│
├── camera/                      # 相机/扫码适配器（规划中）
│   ├── cameraAdapter.js
│   ├── cameraInit.js
│   └── README.md
│
├── storage/                     # 本地存储适配器（规划中）
│   ├── storageAdapter.js
│   ├── storageInit.js
│   └── README.md
│
└── notification/                # 通知/推送适配器（规划中）
    ├── notificationAdapter.js
    ├── notificationInit.js
    └── README.md


## 🚀 已实现的适配器

### 1. 图片选择适配器 (imagePicker)

**功能**: 统一的图片选择接口，支持从相册或相机选择图片

**使用场景**:
- 用户注册时上传头像
- 用户详情页编辑头像
- 身份管理中上传身份头像

**快速开始**:

import { chooseImage } from './js/adapters/imagePicker/imagePickerAdapter.js';

const result = await chooseImage({
    sourceType: 'album',  // 'camera' | 'album' | 'auto'
    timeout: 60000
});


**详细文档**: [imagePicker/README.md](./imagePicker/README.md)

**特性**:
- ✅ 浏览器环境自动处理用户取消（超时+Focus检测）
- ✅ 原生环境准确获取用户取消状态
- ✅ 支持 iOS、Android、微信小程序、支付宝小程序
- ✅ 自动环境检测，无需手动配置

## 📝 创建新适配器的步骤

### 1. 创建目录结构


mkdir js/adapters/yourAdapter
cd js/adapters/yourAdapter
touch yourAdapterAdapter.js
touch yourAdapterInit.js
touch README.md


### 2. 实现核心适配器


// yourAdapterAdapter.js

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
    
    // 原生 App
    if (window.YourNativeInterface) {
        return 'native-app';
    }
    
    // 浏览器（默认）
    return 'browser';
}

/**
 * 浏览器环境的默认实现
 */
const browserImplementation = {
    name: 'Browser Implementation',
    
    async yourMethod(options) {
        // 浏览器环境的实现
        return {
            success: true,
            data: result
        };
    }
};

// 存储自定义实现
let currentImplementation = null;
const customImplementations = new Map();

/**
 * 注册自定义实现
 */
export function registerYourAdapter(environment, implementation) {
    customImplementations.set(environment, implementation);
    console.log(`[YourAdapter] 已注册 ${environment} 环境的实现`);
    
    const currentEnv = detectEnvironment();
    if (currentEnv === environment) {
        currentImplementation = implementation;
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
    
    if (customImplementations.has(env)) {
        currentImplementation = customImplementations.get(env);
        return currentImplementation;
    }
    
    // 使用浏览器默认实现
    currentImplementation = browserImplementation;
    return currentImplementation;
}

/**
 * 统一的接口
 */
export async function yourMethod(options = {}) {
    const implementation = getCurrentImplementation();
    
    try {
        const result = await implementation.yourMethod(options);
        
        if (!result.success) {
            throw new Error(result.error || '操作失败');
        }
        
        return result;
    } catch (error) {
        console.error('[YourAdapter] 操作失败:', error);
        throw error;
    }
}

export { detectEnvironment };


### 3. 实现初始化模块


// yourAdapterInit.js

import { registerYourAdapter } from './yourAdapterAdapter.js';

export function initYourAdapter() {
    console.log('[YourAdapter] 开始初始化...');
    
    // iOS App
    if (window.webkit?.messageHandlers?.yourHandler) {
        registerIOSImplementation();
    }
    
    // Android App
    else if (window.AndroidYourInterface) {
        registerAndroidImplementation();
    }
    
    // 微信小程序
    else if (typeof wx !== 'undefined' && wx.miniProgram) {
        registerWeChatImplementation();
    }
    
    // 浏览器（默认）
    else {
        console.log('[YourAdapter] 使用浏览器默认实现');
    }
}

function registerIOSImplementation() {
    registerYourAdapter('native-app', {
        name: 'iOS Implementation',
        async yourMethod(options) {
            // iOS 实现
        }
    });
}

function registerAndroidImplementation() {
    registerYourAdapter('native-app', {
        name: 'Android Implementation',
        async yourMethod(options) {
            // Android 实现
        }
    });
}

function registerWeChatImplementation() {
    registerYourAdapter('wechat-miniprogram', {
        name: 'WeChat Implementation',
        async yourMethod(options) {
            // 微信小程序实现
        }
    });
}


### 4. 编写文档

在 `README.md` 中包含：
- 功能说明
- 使用示例
- API 文档
- 各平台集成指南
- 常见问题

### 5. 在业务代码中使用


// 在页面初始化时
import { initYourAdapter } from './js/adapters/yourAdapter/yourAdapterInit.js';
initYourAdapter();

// 在业务代码中使用
import { yourMethod } from './js/adapters/yourAdapter/yourAdapterAdapter.js';

try {
    const result = await yourMethod({ /* options */ });
    console.log('成功:', result);
} catch (error) {
    console.error('失败:', error);
}


## 🎨 适配器设计模板

### 标准接口定义

每个适配器应该遵循以下接口规范：


// 实现接口
interface AdapterImplementation {
    name: string;  // 实现名称（用于调试）
    [methodName: string]: Function;  // 具体方法
}

// 结果格式
interface AdapterResult {
    success: boolean;     // 是否成功
    data?: any;          // 返回的数据
    error?: string;      // 错误信息
    cancelled?: boolean; // 是否用户取消（如适用）
}


### 必需的导出

每个适配器模块应该导出：


// 核心方法
export async function mainMethod(options) { }

// 注册方法
export function registerAdapter(environment, implementation) { }

// 环境检测
export function detectEnvironment() { }

// 调试信息（可选）
export function getEnvironmentInfo() { }

// 重置方法（用于测试，可选）
export function resetAdapter() { }


## 📊 适配器对比

| 适配器 | 状态 | 浏览器 | iOS | Android | 微信 | 支付宝 |
|--------|------|--------|-----|---------|------|--------|
| imagePicker | ✅ 已实现 | ✅ | ✅ | ✅ | ✅ | ✅ |
| fileUpload | 📋 规划中 | - | - | - | - | - |
| payment | 📋 规划中 | - | - | - | - | - |
| share | 📋 规划中 | - | - | - | - | - |
| location | 📋 规划中 | - | - | - | - | - |
| camera | 📋 规划中 | - | - | - | - | - |
| storage | 📋 规划中 | - | - | - | - | - |
| notification | 📋 规划中 | - | - | - | - | - |

## 🔧 通用工具

### 统一的环境检测

可以创建一个通用的环境检测工具：


// js/adapters/utils/envDetector.js

export function detectPlatform() {
    // 微信小程序
    if (typeof wx !== 'undefined' && wx.miniProgram) {
        return {
            platform: 'wechat-miniprogram',
            type: 'miniprogram',
            vendor: 'wechat'
        };
    }
    
    // 支付宝小程序
    if (typeof my !== 'undefined' && my.env) {
        return {
            platform: 'alipay-miniprogram',
            type: 'miniprogram',
            vendor: 'alipay'
        };
    }
    
    // iOS App
    if (window.webkit?.messageHandlers) {
        return {
            platform: 'native-app',
            type: 'native',
            os: 'ios'
        };
    }
    
    // Android App
    if (window.AndroidInterface) {
        return {
            platform: 'native-app',
            type: 'native',
            os: 'android'
        };
    }
    
    // 浏览器
    return {
        platform: 'browser',
        type: 'web',
        userAgent: navigator.userAgent
    };
}


## 📚 最佳实践

### 1. 命名规范

- 适配器目录: `camelCase` (如 `imagePicker`, `fileUpload`)
- 核心文件: `{name}Adapter.js`
- 初始化文件: `{name}Init.js`
- 主方法: 动词开头 (如 `chooseImage`, `uploadFile`)

### 2. 错误处理


// 统一的错误处理
try {
    const result = await adapterMethod(options);
    if (!result.success) {
        throw new Error(result.error);
    }
    return result;
} catch (error) {
    // 区分用户取消和真正的错误
    if (error.message.includes('取消') || error.message.includes('cancelled')) {
        // 用户取消，静默处理或轻提示
    } else {
        // 真正的错误，需要提示用户
        showToast(error.message, 'error');
    }
    throw error;
}


### 3. 日志规范


// 使用统一的日志前缀
console.log('[AdapterName] 初始化完成');
console.error('[AdapterName] 操作失败:', error);
console.warn('[AdapterName] 警告信息');


### 4. 超时处理

所有异步操作都应该设置合理的超时：


const DEFAULT_TIMEOUT = 60000; // 60秒

async function methodWithTimeout(options) {
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    
    return Promise.race([
        actualOperation(options),
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error('操作超时')), timeout);
        })
    ]);
}


## 🧪 测试

### 模拟实现

每个适配器应该提供模拟实现用于测试：


// yourAdapterInit.js

export function registerMockImplementation() {
    registerYourAdapter('native-app', {
        name: 'Mock Implementation',
        async yourMethod(options) {
            console.log('[Mock] 调用方法:', options);
            
            // 模拟延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟随机成功/失败
            if (Math.random() > 0.8) {
                throw new Error('模拟错误');
            }
            
            return {
                success: true,
                data: 'mock data'
            };
        }
    });
}


## 📖 相关文档

- [图片选择适配器文档](./imagePicker/README.md)
- [图片选择快速开始](./imagePicker/QUICKSTART.md)
- [图片选择架构设计](./imagePicker/ARCHITECTURE.md)

## 🤝 贡献指南

添加新适配器时，请遵循以下步骤：

1. 在 `js/adapters/` 下创建新目录
2. 实现核心适配器文件
3. 实现初始化模块
4. 编写完整的 README 文档
5. 更新本文件的适配器列表
6. 添加使用示例
7. 编写测试用例

## 📞 支持

如有问题或建议，请：
1. 查看具体适配器的 README 文档
2. 查看 QUICKSTART 快速开始指南
3. 使用 `getEnvironmentInfo()` 查看当前环境信息
4. 查看浏览器控制台的日志输出
