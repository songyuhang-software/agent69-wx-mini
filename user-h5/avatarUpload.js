/**
 * 头像上传功能模块 - 最终正确版本
 * 提供获取图片流和上传到存储服务的功能
 * 集成又拍云UPYUN存储服务
 *
 * 又拍云签名算法：
 * Signature = Base64(HMAC-SHA1(密码MD5, Method&URI&Date))
 */

import { showToast } from '../utils/toast.js';
import { chooseImage } from '../adapters/imagePicker/imagePickerAdapter.js';
// 全局axios变量（通过script标签引入）
const axios = window.axios;

// 存储服务配置
const STORAGE_CONFIG = {
    uploadEndpoint: 'https://v0.api.upyun.com/agent69-image',
    bucket: 'agent69-image',
    username: 'songyuhang',
    password: 'DCbg9f9MT2NrT9TlBIWKxNAT3dhyAX32',
    path: 'avatars',
    domain: 'http://agent69-image.test.upcdn.net/',
    maxFileSize: 50 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};

/**
 * 获取图片流 - 从相机或相册选择图片
 * 使用适配器模式，支持多端环境
 */
export async function getImageStream({
    onSuccess,
    onError,
    sourceType = 'auto'
} = {}) {
    try {
        // 使用适配器选择图片
        const result = await chooseImage({
            sourceType,
            timeout: 60000, // 60秒超时
            maxSize: STORAGE_CONFIG.maxFileSize,
            allowedTypes: STORAGE_CONFIG.allowedTypes
        });

        // 检查是否取消
        if (result.cancelled) {
            const errorMsg = '用户取消了选择';
            onError && onError(errorMsg);
            throw new Error(errorMsg);
        }

        // 获取文件对象
        const file = result.file;

        // 转换为图片流
        try {
            const imageStream = await fileToImageStream(file);
            onSuccess && onSuccess(imageStream);
            return imageStream;
        } catch (streamError) {
            const errorMsg = '图片处理失败';
            onError && onError(errorMsg);
            throw streamError;
        }

    } catch (error) {
        // 区分用户取消和真正的错误
        const isCancelled = error.message.includes('取消') || error.message.includes('超时');
        const errorMsg = isCancelled ? error.message : '获取图片流失败: ' + error.message;

        onError && onError(errorMsg);
        throw error;
    }
}

/**
 * 将File对象转换为图片流
 */
function fileToImageStream(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };
        reader.readAsDataURL(file);
    });
}

/**
 * 上传图片流到存储服务
 */
export async function uploadImageStream(imageStream, {
    onProgress,
    onSuccess,
    onError
} = {}) {
    try {
        if (!STORAGE_CONFIG.uploadEndpoint) {
            throw new Error('存储服务配置未完成，请联系管理员');
        }

        onProgress && onProgress(0);

        const uploadData = new FormData();
        const blob = dataURLtoBlob(imageStream);
        const fileName = generateUniqueFileName(blob);

        uploadData.append('file', blob, fileName);

         const url = STORAGE_CONFIG.uploadEndpoint

         /* 计算policy */  
        const policyObj = {  
             bucket: STORAGE_CONFIG.bucket,  
            'save-key': `${STORAGE_CONFIG.path}/${fileName}`,  
             expiration: new Date().getTime() + 1800, /* 过期时间，在当前时间+10分钟 */  
         }  
         const policy = btoa(JSON.stringify(policyObj))  
         uploadData.append('policy', policy);  


        /* 计算 Authorization */  
        const passwordMd5 = HexMD5.MD5(STORAGE_CONFIG.password).toString(HexMD5.enc.Hex)  

        /* [Method-请求方法, URI-请求路径, policy] */  
        const arr = ['POST', `/${ STORAGE_CONFIG.bucket }`, policy]  

        const authorization = `UPYUN ${ STORAGE_CONFIG.username }:${ b64hamcsha1(passwordMd5, arr.join('&')) }`
        uploadData.append('authorization', authorization);  

        // 返回axios的Promise，正确处理上传结果
        return axios({ method: 'POST', url, data: uploadData }).then((res) => {  
            onProgress && onProgress(100);
            
            // 构造完整的图片URL
            const imageUrl = res.data.url;
            
            onSuccess && onSuccess(imageUrl);
            return imageUrl;
        }).catch(e => {  
            console.error('上传失败', e)  
            const errorMsg = e.response?.data?.message || e.message || '上传失败';
            onError && onError(errorMsg);
            throw new Error(errorMsg);
        })  


    } catch (error) {
        const errorMsg = '图片上传失败: ' + error.message;
        onError && onError(errorMsg);
        throw error;
    }
}


/**
 * 将base64 DataURL转换为Blob对象
 */
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
}

/**
 * 根据MIME类型获取文件扩展名
 */
function getFileExtension(mimeType) {
    const extensionMap = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
    };
    return extensionMap[mimeType] || 'jpg';
}

/**
 * 生成唯一文件名
 */
function generateUniqueFileName(blob) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const fileExtension = getFileExtension(blob.type);

    return `avatar_${timestamp}_${randomStr}.${fileExtension}`;
}

/**
 * 完整的头像上传流程
 */
export async function uploadAvatar({
    onStart,
    onProgress,
    onSuccess,
    onError,
    sourceType = 'auto'
} = {}) {
    try {
        onStart && onStart();

        await getImageStream({
            sourceType,
            onSuccess: async (imageStream) => {
                try {
                    const imageUrl = await uploadImageStream(imageStream, {
                        onProgress: (progress) => {
                            onProgress && onProgress(30 + progress * 0.7);
                        },
                        onSuccess: (url) => {
                            onSuccess && onSuccess(url);
                        },
                        onError: (error) => {
                            onError && onError(error);
                        }
                    });
                } catch (uploadError) {
                    onError && onError(uploadError.message);
                }
            },
            onError: (error) => {
                onError && onError(error);
            }
        });

    } catch (error) {
        onError && onError(error.message);
        throw error;
    }
}

/**
 * 压缩图片
 */
export function compressImage(imageStream, {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8
} = {}) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let { width, height } = img;

            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const compressedStream = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedStream);
        };

        img.onerror = () => {
            reject(new Error('图片加载失败'));
        };

        img.src = imageStream;
    });
}

/**
 * 配置存储服务
 */
export function configureStorage(config) {
    if (config.uploadEndpoint) {
        STORAGE_CONFIG.uploadEndpoint = config.uploadEndpoint;
    }
    if (config.username) {
        STORAGE_CONFIG.username = config.username;
    }
    if (config.password) {
        STORAGE_CONFIG.password = config.password;
    }
}

/**
 * 安全获取头像URL，处理空值情况
 */
export function getSafeAvatarUrl(avatarUrl) {
    if (!avatarUrl || avatarUrl === '' || avatarUrl === 'undefined' || avatarUrl === 'null') {
        return null;
    }
    return avatarUrl;
}

/**
 * 准备安全的头像数据，用于API调用
 */
export function prepareAvatarData(avatarUrl) {
    return getSafeAvatarUrl(avatarUrl);
}

// 导出STORAGE_CONFIG供其他模块使用
export { STORAGE_CONFIG };