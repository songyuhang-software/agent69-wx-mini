# 图片选择适配器使用指南

## 概述

`imagePickerAdapter.js` 提供了统一的图片选择接口，支持多端环境：
- ✅ 浏览器环境（默认实现，无需配置）
- ✅ 原生 App WebView（需要注册原生实现）
- ✅ 微信小程序（需要注册小程序实现）
- ✅ 支付宝小程序（需要注册小程序实现）
- ✅ 其他自定义环境

## 浏览器环境（默认）

在浏览器中直接使用，无需任何配置：


import { chooseImage } from './js/adapters/imagePickerAdapter.js';

try {
    const result = await chooseImage({
        sourceType: 'album',  // 'camera' | 'album' | 'auto'
        timeout: 60000        // 60秒超时
    });
    
    console.log('选择的文件:', result.file);
} catch (error) {
    if (error.message.includes('取消')) {
        console.log('用户取消了选择');
    } else {
        console.error('选择失败:', error);
    }
}


**浏览器实现特性：**
- ✅ 使用 `<input type="file">` 实现
- ✅ 支持 60 秒超时检测
- ✅ 支持 focus 事件快速检测用户取消（300ms 延迟）
- ✅ 自动清理 DOM 元素

---

## 原生 App 环境

### iOS App 集成示例

#### 1. 在 H5 页面初始化时注册实现


// 在页面加载时注册（例如在 main.js 或 app.js 中）
import { registerImagePicker } from './js/adapters/imagePickerAdapter.js';

// 检测是否在 iOS App 中
if (window.webkit?.messageHandlers?.imagePickerHandler) {
    registerImagePicker('native-app', {
        name: 'iOS Native Image Picker',
        
        async chooseImage(options) {
            return new Promise((resolve, reject) => {
                const callbackId = 'imagePicker_' + Date.now();
                
                // 注册回调函数
                window[callbackId] = (result) => {
                    delete window[callbackId]; // 清理
                    
                    if (result.success) {
                        // 原生返回的数据格式：
                        // { success: true, file: Blob/File对象, cancelled: false }
                        resolve(result);
                    } else {
                        reject(new Error(result.error || '选择图片失败'));
                    }
                };
                
                // 调用原生方法
                window.webkit.messageHandlers.imagePickerHandler.postMessage({
                    action: 'chooseImage',
                    options: {
                        sourceType: options.sourceType,
                        maxSize: options.maxSize
                    },
                    callbackId: callbackId
                });
            });
        }
    });
}


#### 2. iOS 原生代码实现（Swift 示例）


// WKWebView 配置
class ImagePickerHandler: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    weak var viewController: UIViewController?
    
    func userContentController(_ userContentController: WKUserContentController, 
                              didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String,
              let callbackId = body["callbackId"] as? String else {
            return
        }
        
        if action == "chooseImage" {
            let options = body["options"] as? [String: Any] ?? [:]
            presentImagePicker(options: options, callbackId: callbackId)
        }
    }
    
    func presentImagePicker(options: [String: Any], callbackId: String) {
        let picker = UIImagePickerController()
        picker.delegate = self
        
        // 根据 sourceType 设置
        if let sourceType = options["sourceType"] as? String {
            switch sourceType {
            case "camera":
                picker.sourceType = .camera
            case "album":
                picker.sourceType = .photoLibrary
            default:
                picker.sourceType = .photoLibrary
            }
        }
        
        // 保存 callbackId 用于回调
        self.currentCallbackId = callbackId
        viewController?.present(picker, animated: true)
    }
}

extension ImagePickerHandler: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    // 用户选择了图片
    func imagePickerController(_ picker: UIImagePickerController, 
                              didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)
        
        guard let image = info[.originalImage] as? UIImage,
              let imageData = image.jpegData(compressionQuality: 0.8) else {
            callJavaScript(success: false, error: "无法获取图片数据")
            return
        }
        
        // 转换为 base64 或保存到临时文件
        let base64String = imageData.base64EncodedString()
        
        // 调用 JS 回调
        let script = """
        (function() {
            // 将 base64 转换为 Blob
            const base64Data = '\(base64String)';
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            // 调用回调
            if (window['\(currentCallbackId)']) {
                window['\(currentCallbackId)']({
                    success: true,
                    file: blob,
                    cancelled: false
                });
            }
        })();
        """
        
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }
    
    // 用户取消了选择 ✅ 关键：原生能准确告知取消
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        
        let script = """
        if (window['\(currentCallbackId)']) {
            window['\(currentCallbackId)']({
                success: false,
                error: '用户取消了选择',
                cancelled: true
            });
        }
        """
        
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }
}


### Android App 集成示例

#### 1. H5 页面注册


import { registerImagePicker } from './js/adapters/imagePickerAdapter.js';

// 检测是否在 Android App 中
if (window.AndroidImagePicker) {
    registerImagePicker('native-app', {
        name: 'Android Native Image Picker',
        
        async chooseImage(options) {
            return new Promise((resolve, reject) => {
                const callbackId = 'imagePicker_' + Date.now();
                
                // 注册回调
                window[callbackId] = (result) => {
                    delete window[callbackId];
                    
                    if (result.success) {
                        // 将 base64 转换为 Blob
                        fetch(result.dataUrl)
                            .then(res => res.blob())
                            .then(blob => {
                                resolve({
                                    success: true,
                                    file: blob,
                                    cancelled: false
                                });
                            })
                            .catch(err => reject(err));
                    } else {
                        if (result.cancelled) {
                            reject(new Error('用户取消了选择'));
                        } else {
                            reject(new Error(result.error));
                        }
                    }
                };
                
                // 调用 Android 方法
                window.AndroidImagePicker.chooseImage(
                    JSON.stringify(options),
                    callbackId
                );
            });
        }
    });
}


#### 2. Android 原生代码（Kotlin 示例）


class ImagePickerJSInterface(
    private val activity: Activity,
    private val webView: WebView
) {
    private var currentCallbackId: String? = null
    
    @JavascriptInterface
    fun chooseImage(optionsJson: String, callbackId: String) {
        currentCallbackId = callbackId
        
        val options = JSONObject(optionsJson)
        val sourceType = options.optString("sourceType", "album")
        
        val intent = when (sourceType) {
            "camera" -> Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            else -> Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        }
        
        activity.startActivityForResult(intent, REQUEST_IMAGE_PICKER)
    }
    
    // 在 Activity 的 onActivityResult 中调用
    fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val callbackId = currentCallbackId ?: return
        
        when {
            resultCode == Activity.RESULT_OK && data != null -> {
                // 用户选择了图片
                val imageUri = data.data
                val base64 = convertImageToBase64(imageUri)
                
                val script = """
                    if (window['$callbackId']) {
                        window['$callbackId']({
                            success: true,
                            dataUrl: 'data:image/jpeg;base64,$base64',
                            cancelled: false
                        });
                    }
                """.trimIndent()
                
                activity.runOnUiThread {
                    webView.evaluateJavascript(script, null)
                }
            }
            resultCode == Activity.RESULT_CANCELED -> {
                // 用户取消了选择 ✅
                val script = """
                    if (window['$callbackId']) {
                        window['$callbackId']({
                            success: false,
                            error: '用户取消了选择',
                            cancelled: true
                        });
                    }
                """.trimIndent()
                
                activity.runOnUiThread {
                    webView.evaluateJavascript(script, null)
                }
            }
        }
        
        currentCallbackId = null
    }
}


---

## 微信小程序环境

### 在小程序的 WebView 页面中注册


// 在 H5 页面中
import { registerImagePicker } from './js/adapters/imagePickerAdapter.js';

// 检测微信小程序环境
if (typeof wx !== 'undefined' && wx.miniProgram) {
    registerImagePicker('wechat-miniprogram', {
        name: 'WeChat MiniProgram Image Picker',
        
        async chooseImage(options) {
            return new Promise((resolve, reject) => {
                // 跳转到小程序的图片选择页面
                wx.miniProgram.navigateTo({
                    url: `/pages/image-picker/index?sourceType=${options.sourceType || 'album'}`
                });
                
                // 监听小程序返回的消息
                const messageHandler = (e) => {
                    if (e.detail.data && e.detail.data.action === 'imageSelected') {
                        const result = e.detail.data.result;
                        
                        // 清理监听器
                        wx.miniProgram.offMessage(messageHandler);
                        
                        if (result.success) {
                            // 将小程序返回的临时路径转换为 Blob
                            fetch(result.tempFilePath)
                                .then(res => res.blob())
                                .then(blob => {
                                    resolve({
                                        success: true,
                                        file: blob,
                                        cancelled: false
                                    });
                                })
                                .catch(err => reject(err));
                        } else if (result.cancelled) {
                            reject(new Error('用户取消了选择'));
                        } else {
                            reject(new Error(result.error));
                        }
                    }
                };
                
                wx.miniProgram.onMessage(messageHandler);
            });
        }
    });
}


### 小程序端实现


// pages/image-picker/index.js
Page({
    onLoad(options) {
        const sourceType = options.sourceType || 'album';
        
        wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: sourceType === 'camera' ? ['camera'] : ['album'],
            success: (res) => {
                const tempFilePath = res.tempFilePaths[0];
                
                // 返回给 WebView
                wx.miniProgram.postMessage({
                    data: {
                        action: 'imageSelected',
                        result: {
                            success: true,
                            tempFilePath: tempFilePath,
                            cancelled: false
                        }
                    }
                });
                
                // 返回上一页
                wx.navigateBack();
            },
            fail: (err) => {
                if (err.errMsg.includes('cancel')) {
                    // 用户取消 ✅
                    wx.miniProgram.postMessage({
                        data: {
                            action: 'imageSelected',
                            result: {
                                success: false,
                                cancelled: true
                            }
                        }
                    });
                } else {
                    wx.miniProgram.postMessage({
                        data: {
                            action: 'imageSelected',
                            result: {
                                success: false,
                                error: err.errMsg,
                                cancelled: false
                            }
                        }
                    });
                }
                
                wx.navigateBack();
            }
        });
    }
});


---

## 支付宝小程序环境


import { registerImagePicker } from './js/adapters/imagePickerAdapter.js';

if (typeof my !== 'undefined' && my.env) {
    registerImagePicker('alipay-miniprogram', {
        name: 'Alipay MiniProgram Image Picker',
        
        async chooseImage(options) {
            return new Promise((resolve, reject) => {
                my.chooseImage({
                    count: 1,
                    sourceType: options.sourceType === 'camera' ? ['camera'] : ['album'],
                    success: (res) => {
                        const filePath = res.filePaths[0];
                        
                        // 读取文件并转换为 Blob
                        my.getFileInfo({
                            filePath: filePath,
                            success: (info) => {
                                // 转换逻辑...
                                resolve({
                                    success: true,
                                    file: blob,
                                    cancelled: false
                                });
                            }
                        });
                    },
                    fail: (err) => {
                        if (err.error === 11) { // 用户取消
                            reject(new Error('用户取消了选择'));
                        } else {
                            reject(new Error(err.errorMessage));
                        }
                    }
                });
            });
        }
    });
}


---

## 调试和测试

### 查看当前环境信息


import { getEnvironmentInfo } from './js/adapters/imagePickerAdapter.js';

const info = getEnvironmentInfo();
console.log('环境信息:', info);
// 输出:
// {
//   environment: 'browser',
//   pickerName: 'Browser Image Picker',
//   hasCustomPicker: false,
//   registeredEnvironments: []
// }


### 测试不同环境


import { registerImagePicker, chooseImage } from './js/adapters/imagePickerAdapter.js';

// 模拟原生环境进行测试
registerImagePicker('native-app', {
    name: 'Mock Native Picker',
    async chooseImage(options) {
        console.log('Mock: 选择图片', options);
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 返回模拟数据
        return {
            success: true,
            file: new Blob(['mock image data'], { type: 'image/jpeg' }),
            cancelled: false
        };
    }
});

// 测试
try {
    const result = await chooseImage({ sourceType: 'album' });
    console.log('选择成功:', result);
} catch (error) {
    console.error('选择失败:', error);
}


---

## 注意事项

1. **注册时机**：在页面加载时尽早注册，建议在主入口文件（如 `main.js`）中注册

2. **回调清理**：使用完回调函数后记得清理，避免内存泄漏

3. **错误处理**：始终区分"用户取消"和"真正的错误"，提供不同的用户提示

4. **数据格式**：确保原生/小程序返回的数据格式符合接口定义：
   
   {
       success: boolean,
       file: File | Blob,
       cancelled: boolean,
       error?: string
   }
   

5. **超时处理**：浏览器环境有 60 秒超时，原生环境建议也设置合理的超时

6. **权限处理**：原生环境需要提前申请相机/相册权限

---

## 完整集成示例


// main.js - 应用入口
import { registerImagePicker } from './js/adapters/imagePickerAdapter.js';

// 初始化图片选择器
function initImagePicker() {
    // iOS App
    if (window.webkit?.messageHandlers?.imagePickerHandler) {
        registerImagePicker('native-app', {
            name: 'iOS Native Image Picker',
            async chooseImage(options) {
                // iOS 实现...
            }
        });
    }
    
    // Android App
    else if (window.AndroidImagePicker) {
        registerImagePicker('native-app', {
            name: 'Android Native Image Picker',
            async chooseImage(options) {
                // Android 实现...
            }
        });
    }
    
    // 微信小程序
    else if (typeof wx !== 'undefined' && wx.miniProgram) {
        registerImagePicker('wechat-miniprogram', {
            name: 'WeChat MiniProgram Image Picker',
            async chooseImage(options) {
                // 微信小程序实现...
            }
        });
    }
    
    // 浏览器环境无需注册，使用默认实现
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initImagePicker();
});


---

## 总结

这个适配器方案的优势：

✅ **统一接口**：业务代码无需关心平台差异  
✅ **灵活扩展**：轻松支持新的平台  
✅ **浏览器默认**：无需配置即可在浏览器中使用  
✅ **准确的取消检测**：原生/小程序能准确告知用户取消  
✅ **类型安全**：清晰的接口定义和错误处理  
✅ **易于调试**：提供环境信息查询和日志输出
