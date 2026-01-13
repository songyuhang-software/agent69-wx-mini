# 创建新适配器指南

## 🚀 快速创建

### 方法1: 使用模板文件（推荐）


# 1. 进入 adapters 目录
cd js/adapters

# 2. 创建新适配器目录（使用 camelCase 命名）
mkdir yourAdapter

# 3. 复制模板文件
cp TEMPLATE_Adapter.js yourAdapter/yourAdapterAdapter.js
cp TEMPLATE_Init.js yourAdapter/yourAdapterInit.js

# 4. 创建 README
touch yourAdapter/README.md


### 方法2: 使用脚本（未来可以添加）


# 运行创建脚本
npm run create-adapter yourAdapter


## 📝 修改模板

### 1. 替换占位符

在新创建的文件中，全局替换以下内容：

- `YourAdapter` → 你的适配器名称（PascalCase）
- `yourAdapter` → 你的适配器名称（camelCase）
- `yourMethod` → 你的主要方法名
- `yourHandler` → 你的 JSBridge 处理器名
- `AndroidYourInterface` → Android 接口名

**示例**:

// 如果创建文件上传适配器
YourAdapter → FileUpload
yourAdapter → fileUpload
yourMethod → uploadFile
yourHandler → fileUploadHandler
AndroidYourInterface → AndroidFileUploadInterface


### 2. 实现浏览器版本

在 `yourAdapterAdapter.js` 中实现 `browserImplementation`:


const browserImplementation = {
    name: 'Browser FileUpload Implementation',
    
    async uploadFile(options = {}) {
        // 实现浏览器环境的文件上传逻辑
        const formData = new FormData();
        formData.append('file', options.file);
        
        const response = await fetch(options.url, {
            method: 'POST',
            body: formData
        });
        
        return {
            success: response.ok,
            data: await response.json()
        };
    }
};


### 3. 更新环境检测

根据实际的 JSBridge 接口修改 `detectEnvironment()`:


function detectEnvironment() {
    // 根据实际的全局对象判断
    if (window.FileUploadBridge) {
        return 'native-app';
    }
    
    // ... 其他判断
    
    return 'browser';
}


### 4. 实现各平台注册函数

在 `yourAdapterInit.js` 中实现各平台的具体逻辑。

## 📄 编写文档

### README.md 结构


# [适配器名称] 适配器

## 功能说明
简要描述适配器的功能和用途

## 快速开始
\`\`\`javascript
import { yourMethod } from './js/adapters/yourAdapter/yourAdapterAdapter.js';

const result = await yourMethod({ /* options */ });
\`\`\`

## API 文档

### yourMethod(options)

**参数**:
- `options.param1` (type) - 参数说明
- `options.param2` (type) - 参数说明

**返回值**:
\`\`\`typescript
{
    success: boolean,
    data: any,
    error?: string
}
\`\`\`

## 浏览器环境
浏览器环境的使用说明和注意事项

## 原生 App 集成

### iOS 集成
iOS 客户端需要实现的接口和示例代码

### Android 集成
Android 客户端需要实现的接口和示例代码

## 小程序集成

### 微信小程序
微信小程序的集成方式

### 支付宝小程序
支付宝小程序的集成方式

## 常见问题
FAQ

## 示例
完整的使用示例


## 🔧 更新主配置

### 1. 更新 `adapters/index.js`

添加新适配器的导出：


// 在 index.js 中添加
export {
    yourMethod,
    registerYourAdapter,
    detectEnvironment as detectYourAdapterEnvironment,
    getEnvironmentInfo as getYourAdapterInfo,
    resetYourAdapter
} from './yourAdapter/yourAdapterAdapter.js';

export { 
    initYourAdapter,
    registerMockYourAdapter
} from './yourAdapter/yourAdapterInit.js';

// 在 initAllAdapters 中添加
export async function initAllAdapters() {
    console.log('[Adapters] 开始初始化所有适配器...');
    
    // ... 其他适配器
    
    // 初始化你的适配器
    const { initYourAdapter } = await import('./yourAdapter/yourAdapterInit.js');
    initYourAdapter();
    
    console.log('[Adapters] 所有适配器初始化完成');
}


### 2. 更新 `adapters/README.md`

在适配器列表中添加新适配器：


├── yourAdapter/                 # 你的适配器 ✅ 已实现
│   ├── yourAdapterAdapter.js    # 核心适配器
│   ├── yourAdapterInit.js       # 初始化模块
│   └── README.md                # 详细使用文档


## 🧪 测试

### 1. 创建测试文件


// yourAdapter/yourAdapter.test.js

import { yourMethod, registerMockYourAdapter } from './yourAdapterInit.js';

// 注册模拟实现
registerMockYourAdapter();

// 测试
async function test() {
    try {
        const result = await yourMethod({ /* test options */ });
        console.log('✅ 测试通过:', result);
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

test();


### 2. 浏览器测试

在浏览器控制台中：


// 导入适配器
import { yourMethod, getEnvironmentInfo } from './js/adapters/yourAdapter/yourAdapterAdapter.js';

// 查看环境信息
console.log(getEnvironmentInfo());

// 测试方法
const result = await yourMethod({ /* options */ });
console.log(result);


## 📋 检查清单

创建新适配器后，确保完成以下事项：

- [ ] 复制并修改模板文件
- [ ] 实现浏览器版本的核心逻辑
- [ ] 实现各平台的注册函数
- [ ] 编写完整的 README 文档
- [ ] 更新 `adapters/index.js`
- [ ] 更新 `adapters/README.md`
- [ ] 编写测试用例
- [ ] 在浏览器中测试
- [ ] 提供原生/小程序集成示例
- [ ] 添加错误处理和超时机制
- [ ] 添加日志输出
- [ ] 代码审查

## 🎯 最佳实践

### 命名规范

- **目录名**: `camelCase` (如 `fileUpload`, `imagePicker`)
- **文件名**: `{name}Adapter.js`, `{name}Init.js`
- **方法名**: 动词开头 (如 `uploadFile`, `chooseImage`)
- **常量名**: `UPPER_SNAKE_CASE`

### 接口设计

统一的返回格式：


interface Result {
    success: boolean;      // 是否成功
    data?: any;           // 返回的数据
    error?: string;       // 错误信息
    cancelled?: boolean;  // 是否用户取消
}


### 错误处理


try {
    const result = await yourMethod(options);
    if (!result.success) {
        throw new Error(result.error);
    }
    return result;
} catch (error) {
    // 区分用户取消和真正的错误
    if (error.message.includes('取消')) {
        // 静默处理或轻提示
    } else {
        // 显示错误提示
        showToast(error.message, 'error');
    }
    throw error;
}


### 日志规范


console.log('[AdapterName] 初始化完成');
console.error('[AdapterName] 操作失败:', error);
console.warn('[AdapterName] 警告信息');


## 📚 参考示例

查看 `imagePicker` 适配器作为完整的参考实现：

- [imagePickerAdapter.js](./imagePicker/imagePickerAdapter.js) - 核心实现
- [imagePickerInit.js](./imagePicker/imagePickerInit.js) - 初始化模块
- [README.md](./imagePicker/README.md) - 详细文档

## 💡 常见适配器类型

### 文件操作类
- 图片选择 (imagePicker) ✅
- 文件上传 (fileUpload)
- 文件下载 (fileDownload)
- 文件预览 (filePreview)

### 设备功能类
- 相机/扫码 (camera)
- 定位 (location)
- 通讯录 (contacts)
- 日历 (calendar)

### 系统交互类
- 分享 (share)
- 支付 (payment)
- 通知 (notification)
- 剪贴板 (clipboard)

### 数据存储类
- 本地存储 (storage)
- 数据库 (database)
- 缓存 (cache)

### 网络通信类
- WebSocket (websocket)
- 推送 (push)
- 下载管理 (downloadManager)

## 🔗 相关资源

- [适配器模式详解](https://refactoring.guru/design-patterns/adapter)
- [JSBridge 通信原理](https://juejin.cn/post/6844903585268891662)
- [微信小程序 API](https://developers.weixin.qq.com/miniprogram/dev/api/)
- [支付宝小程序 API](https://opendocs.alipay.com/mini/api)
