# 图片选择适配器架构


┌─────────────────────────────────────────────────────────────────────┐
│                          业务层 (Business Layer)                    │
│                                                                      │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │ avatarComponent  │────────▶│  avatarUpload    │                 │
│  │   (UI组件)       │         │  (上传逻辑)      │                 │
│  └──────────────────┘         └────────┬─────────┘                 │
│                                         │                            │
│                                         │ getImageStream()           │
└─────────────────────────────────────────┼────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       适配器层 (Adapter Layer)                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │            imagePickerAdapter.js (核心适配器)               │    │
│  │                                                              │    │
│  │  • chooseImage() - 统一接口                                 │    │
│  │  • detectEnvironment() - 环境检测                           │    │
│  │  • registerImagePicker() - 注册实现                         │    │
│  │  • getEnvironmentInfo() - 调试信息                          │    │
│  └────────────────┬───────────────────────────────────────────┘    │
│                   │                                                  │
│                   │ 根据环境路由到不同实现                          │
│                   │                                                  │
└───────────────────┼──────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    实现层 (Implementation Layer)                      │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │ Browser  │  │   iOS    │  │ Android  │  │  WeChat  │  │Alipay ││
│  │  实现    │  │   App    │  │   App    │  │   Mini   │  │ Mini  ││
│  │          │  │  实现    │  │  实现    │  │ Program  │  │Program││
│  │(内置)    │  │(外部注册)│  │(外部注册)│  │(外部注册)│  │(外部) ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬───┘│
│       │             │              │             │             │    │
└───────┼─────────────┼──────────────┼─────────────┼─────────────┼────┘
        │             │              │             │             │
        ▼             ▼              ▼             ▼             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    平台层 (Platform Layer)                            │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │<input    │  │ UIImage  │  │ Android  │  │   wx.    │  │  my.  ││
│  │type=file>│  │ Picker   │  │ Intent   │  │chooseImg │  │choose ││
│  │          │  │Controller│  │          │  │          │  │ Image ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └───────┘│
└──────────────────────────────────────────────────────────────────────┘


## 数据流

### 1. 初始化流程


页面加载
   │
   ▼
initializeApp()
   │
   ▼
initImagePickerAdapter()
   │
   ├─▶ 检测环境 (detectEnvironment)
   │
   ├─▶ 如果是浏览器 ──▶ 使用默认实现 ✅
   │
   ├─▶ 如果是 iOS ──▶ 注册 iOS 实现
   │
   ├─▶ 如果是 Android ──▶ 注册 Android 实现
   │
   └─▶ 如果是小程序 ──▶ 注册小程序实现


### 2. 选择图片流程


用户点击上传
   │
   ▼
avatarComponent.handleAvatarUpload()
   │
   ▼
avatarUpload.getImageStream()
   │
   ▼
imagePickerAdapter.chooseImage()
   │
   ├─▶ 获取当前环境的实现 (getCurrentPicker)
   │
   ▼
执行具体实现的 chooseImage()
   │
   ├─▶ 浏览器: input.click() + 超时检测
   │   │
   │   ├─▶ 用户选择 ──▶ change 事件 ──▶ resolve(file)
   │   │
   │   ├─▶ 用户取消 ──▶ focus 事件(300ms) ──▶ reject('取消')
   │   │
   │   └─▶ 超时(60s) ──▶ timeout ──▶ reject('超时')
   │
   ├─▶ 原生: JSBridge 调用
   │   │
   │   ├─▶ 用户选择 ──▶ 原生回调 ──▶ resolve(file)
   │   │
   │   └─▶ 用户取消 ──▶ 原生回调(cancelled:true) ──▶ reject('取消')
   │
   └─▶ 小程序: 跳转页面
       │
       ├─▶ 用户选择 ──▶ postMessage ──▶ resolve(file)
       │
       └─▶ 用户取消 ──▶ postMessage(cancelled:true) ──▶ reject('取消')


### 3. 结果处理流程


chooseImage() 返回结果
   │
   ├─▶ 成功: { success: true, file: Blob, cancelled: false }
   │   │
   │   ▼
   │   转换为 base64 (fileToImageStream)
   │   │
   │   ▼
   │   上传到服务器 (uploadImageStream)
   │   │
   │   ▼
   │   更新 UI
   │
   └─▶ 失败/取消: throw Error
       │
       ├─▶ 包含"取消"/"超时" ──▶ 静默处理,恢复 UI
       │
       └─▶ 其他错误 ──▶ 显示错误提示


## 关键设计原则

### 1. 单一职责
- **适配器层**: 只负责图片选择,不关心上传
- **业务层**: 只关心上传逻辑,不关心平台差异

### 2. 开闭原则
- 对扩展开放: 可以注册新的平台实现
- 对修改封闭: 业务代码无需修改

### 3. 依赖倒置
- 业务层依赖抽象接口 (chooseImage)
- 不依赖具体实现 (input/JSBridge)

### 4. 接口隔离
- 统一的接口定义
- 明确的数据格式
- 清晰的错误处理

## 环境检测逻辑


function detectEnvironment() {
    // 优先级从高到低
    
    // 1. 微信小程序
    if (typeof wx !== 'undefined' && wx.miniProgram) {
        return 'wechat-miniprogram';
    }
    
    // 2. 支付宝小程序
    if (typeof my !== 'undefined' && my.env) {
        return 'alipay-miniprogram';
    }
    
    // 3. 原生 App
    if (window.NativeApp || 
        window.webkit?.messageHandlers ||
        window.AndroidImagePicker) {
        return 'native-app';
    }
    
    // 4. 浏览器 (默认)
    return 'browser';
}


## 浏览器实现的取消检测机制


用户点击上传按钮
   │
   ▼
创建 <input type="file">
   │
   ▼
input.click() ──▶ 打开文件选择器
   │              (窗口失去焦点)
   │
   ├─────────────────────────────────┐
   │                                  │
   ▼                                  ▼
用户选择文件                     用户点击取消/ESC
   │                                  │
   ▼                                  ▼
change 事件触发                   窗口重新获得焦点
   │                                  │
   ▼                                  ▼
resolve(file)                     focus 事件触发
   │                                  │
   ▼                                  ▼
清理资源                          延迟 300ms
   │                                  │
   ▼                                  ▼
完成                              检查 input.files.length
                                      │
                                      ├─▶ = 0 ──▶ reject('取消')
                                      │
                                      └─▶ > 0 ──▶ 等待 change 事件


## 超时机制


触发选择
   │
   ▼
启动 60 秒计时器
   │
   ├─────────────────────┐
   │                      │
   ▼                      ▼
正常完成              60秒后仍未完成
   │                      │
   ▼                      ▼
清除计时器            reject('超时')
   │                      │
   ▼                      ▼
返回结果              清理资源


## 文件结构


js/
├── adapters/
│   ├── imagePickerAdapter.js    # 核心适配器 (必需)
│   ├── imagePickerInit.js       # 初始化模块 (必需)
│   ├── README.md                # 详细文档
│   ├── QUICKSTART.md            # 快速开始
│   └── ARCHITECTURE.md          # 本文件
│
└── user/
    ├── avatarUpload.js          # 已修改为使用适配器
    └── avatarComponent.js       # 无需修改

pages/
└── register/
    └── main.js                  # 已添加适配器初始化


## 扩展性

### 添加新平台


// 1. 注册新实现
registerImagePicker('new-platform', {
    name: 'New Platform Picker',
    async chooseImage(options) {
        // 实现逻辑
        return {
            success: true,
            file: blob,
            cancelled: false
        };
    }
});

// 2. 无需修改其他代码
// 3. 自动生效


### 自定义超时时间


// 在调用时传入
await chooseImage({
    sourceType: 'album',
    timeout: 30000  // 30秒超时
});


### 添加文件验证


// 在调用时传入
await chooseImage({
    sourceType: 'album',
    maxSize: 5 * 1024 * 1024,  // 5MB
    allowedTypes: ['image/jpeg', 'image/png']
});


## 优势总结

✅ **解决核心问题**: 用户取消不会导致页面卡死  
✅ **多端支持**: 浏览器/原生/小程序统一接口  
✅ **浏览器优化**: 超时+Focus双重检测  
✅ **原生准确**: JSBridge能准确告知用户取消  
✅ **易于扩展**: 注册机制支持新平台  
✅ **向后兼容**: 业务代码无需修改  
✅ **开箱即用**: 浏览器环境无需配置  
✅ **类型安全**: 清晰的接口定义  
✅ **易于调试**: 详细的日志和环境信息
