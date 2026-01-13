/**
 * 头像上传功能模块 - 微信小程序版本
 * 提供获取图片和上传到又拍云存储服务的功能
 *
 * 又拍云签名算法：
 * Signature = Base64(HMAC-SHA1(密码MD5, Method&URI&policy))
 */

// 引入hash工具函数 - 使用相对路径，明确指定当前目录
const hashUtil = require('./hash.js');
const HexMD5 = hashUtil.HexMD5;
const b64hamcsha1 = hashUtil.b64hamcsha1;

// 存储服务配置
const STORAGE_CONFIG = {
  uploadEndpoint: 'https://v0.api.upyun.com/agent69-image',
  bucket: 'agent69-image',
  username: 'songyuhang',
  password: 'DCbg9f9MT2NrT9TlBIWKxNAT3dhyAX32',
  path: 'avatars',
  domain: 'http://agent69-image.test.upcdn.net/',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};

/**
 * 选择图片 - 从相机或相册
 * @param {Object} options 配置选项
 * @param {string} options.sourceType - 图片来源: 'album'(相册), 'camera'(相机), 'auto'(自动)
 * @returns {Promise<string>} 返回临时文件路径
 */
function chooseImage(options = {}) {
  return new Promise((resolve, reject) => {
    const { sourceType = 'auto' } = options;

    // 根据sourceType设置来源
    let sourceTypeArray = ['album', 'camera'];
    if (sourceType === 'album') {
      sourceTypeArray = ['album'];
    } else if (sourceType === 'camera') {
      sourceTypeArray = ['camera'];
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'], // 使用压缩图
      sourceType: sourceTypeArray,
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];

        // 检查文件大小 - 使用推荐的 FileSystemManager API
        const fs = wx.getFileSystemManager();
        fs.getFileInfo({
          filePath: tempFilePath,
          success: (fileInfo) => {
            if (fileInfo.size > STORAGE_CONFIG.maxFileSize) {
              reject(new Error('图片大小不能超过50MB'));
              return;
            }
            resolve(tempFilePath);
          },
          fail: () => {
            // 如果获取文件信息失败，仍然继续上传
            resolve(tempFilePath);
          }
        });
      },
      fail: (error) => {
        if (error.errMsg.includes('cancel')) {
          reject(new Error('用户取消了选择'));
        } else {
          reject(new Error('选择图片失败: ' + error.errMsg));
        }
      }
    });
  });
}

/**
 * 上传图片到又拍云存储
 * @param {string} filePath 本地文件路径
 * @param {Object} callbacks 回调函数
 * @param {Function} callbacks.onProgress 上传进度回调
 * @returns {Promise<string>} 返回图片URL
 */
function uploadImageToStorage(filePath, callbacks = {}) {
  return new Promise((resolve, reject) => {
    const { onProgress } = callbacks;

    // 生成唯一文件名
    const fileName = generateUniqueFileName();

    // 计算policy
    const policyObj = {
      bucket: STORAGE_CONFIG.bucket,
      'save-key': `${STORAGE_CONFIG.path}/${fileName}`,
      expiration: new Date().getTime() + 1800000 // 30分钟过期
    };
    const policy = wx.base64ToArrayBuffer ?
      arrayBufferToBase64(stringToArrayBuffer(JSON.stringify(policyObj))) :
      base64Encode(JSON.stringify(policyObj));

    // 计算Authorization
    const passwordMd5 = HexMD5.MD5(STORAGE_CONFIG.password).toString(HexMD5.enc.Hex);
    const arr = ['POST', `/${STORAGE_CONFIG.bucket}`, policy];
    const authorization = `UPYUN ${STORAGE_CONFIG.username}:${b64hamcsha1(passwordMd5, arr.join('&'))}`;

    // 上传文件
    const uploadTask = wx.uploadFile({
      url: STORAGE_CONFIG.uploadEndpoint,
      filePath: filePath,
      name: 'file',
      formData: {
        policy: policy,
        authorization: authorization
      },
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            const imageUrl = data.url;
            resolve(imageUrl);
          } catch (error) {
            reject(new Error('解析上传结果失败'));
          }
        } else {
          reject(new Error('上传失败: ' + res.statusCode));
        }
      },
      fail: (error) => {
        reject(new Error('上传失败: ' + error.errMsg));
      }
    });

    // 监听上传进度
    if (onProgress) {
      uploadTask.onProgressUpdate((res) => {
        onProgress(res.progress);
      });
    }
  });
}

/**
 * 完整的头像上传流程
 * @param {Object} options 配置选项
 * @param {Function} options.onStart 开始选择回调
 * @param {Function} options.onProgress 上传进度回调
 * @param {Function} options.onSuccess 上传成功回调
 * @param {Function} options.onError 上传失败回调
 * @param {string} options.sourceType 图片来源
 * @returns {Promise<string>} 返回图片URL
 */
function uploadAvatar(options = {}) {
  const {
    onStart,
    onProgress,
    onSuccess,
    onError,
    sourceType = 'auto'
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      // 开始选择
      if (onStart) onStart();

      // 选择图片
      onProgress && onProgress(10);
      const filePath = await chooseImage({ sourceType });

      // 上传图片
      onProgress && onProgress(30);
      const imageUrl = await uploadImageToStorage(filePath, {
        onProgress: (progress) => {
          // 将上传进度映射到30-100区间
          const mappedProgress = 30 + (progress * 0.7);
          onProgress && onProgress(mappedProgress);
        }
      });

      // 上传成功
      onProgress && onProgress(100);
      if (onSuccess) onSuccess(imageUrl);
      resolve(imageUrl);

    } catch (error) {
      if (onError) onError(error.message);
      reject(error);
    }
  });
}

/**
 * 生成唯一文件名
 * @returns {string}
 */
function generateUniqueFileName() {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 9);
  return `avatar_${timestamp}_${randomStr}.jpg`;
}

/**
 * Base64编码（兼容处理）
 */
function base64Encode(str) {
  // 简单的base64编码实现
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;

    const bitmap = (a << 16) | (b << 8) | c;

    result += base64chars.charAt((bitmap >> 18) & 63);
    result += base64chars.charAt((bitmap >> 12) & 63);
    result += base64chars.charAt(i > str.length + 1 ? 64 : (bitmap >> 6) & 63);
    result += base64chars.charAt(i > str.length ? 64 : bitmap & 63);
  }

  return result.replace(/A(?=A$|A$)/g, '=');
}

/**
 * 字符串转ArrayBuffer
 */
function stringToArrayBuffer(str) {
  const buffer = new ArrayBuffer(str.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i);
  }
  return buffer;
}

/**
 * ArrayBuffer转Base64
 */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return wx.arrayBufferToBase64(buffer);
}

/**
 * 安全获取头像URL，处理空值情况
 */
function getSafeAvatarUrl(avatarUrl) {
  if (!avatarUrl || avatarUrl === '' || avatarUrl === 'undefined' || avatarUrl === 'null') {
    return null;
  }
  return avatarUrl;
}

/**
 * 准备安全的头像数据，用于API调用
 */
function prepareAvatarData(avatarUrl) {
  return getSafeAvatarUrl(avatarUrl);
}

/**
 * 获取随机头像
 * @param {Array<number>} excludeIds - 需要排除的头像ID列表
 * @returns {Promise<Object>} 返回头像信息 { avatarId, avatarUrl, success, message }
 */
function getRandomAvatar(excludeIds = []) {
  return new Promise((resolve, reject) => {
    // 引入 API 配置
    const API_CONFIG = require('../config/api.js');
    const RANDOM_AVATAR_API = API_CONFIG.filePlatformUrl + API_CONFIG.endpoints.randomAvatar;

    // 构建查询参数
    let url = RANDOM_AVATAR_API;
    if (excludeIds.length > 0) {
      url += '?excludeIds=' + excludeIds.join(',');
    }

    wx.request({
      url: url,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const data = res.data;

          if (!data.success) {
            reject(new Error(data.message || '获取随机头像失败'));
            return;
          }

          resolve({
            avatarId: data.avatarId,
            avatarUrl: data.avatarUrl,
            success: true,
            message: data.message
          });
        } else {
          reject(new Error('获取随机头像失败: HTTP ' + res.statusCode));
        }
      },
      fail: (error) => {
        console.error('获取随机头像失败:', error);
        reject(new Error(error.errMsg || '获取随机头像失败'));
      }
    });
  });
}

/**
 * 随机头像管理器类
 * 用于管理已使用的头像ID列表
 */
class RandomAvatarManager {
  constructor() {
    this.usedAvatarIds = [];
  }

  /**
   * 获取一个新的随机头像
   * @returns {Promise<Object>} 返回头像信息
   */
  async getNewAvatar() {
    try {
      const result = await getRandomAvatar(this.usedAvatarIds);

      if (result.success && result.avatarId) {
        // 将新头像ID添加到已使用列表
        this.usedAvatarIds.push(result.avatarId);
      }

      return result;
    } catch (error) {
      return {
        avatarId: null,
        avatarUrl: null,
        success: false,
        message: error.message || '获取随机头像失败'
      };
    }
  }

  /**
   * 重置已使用的头像ID列表
   */
  reset() {
    this.usedAvatarIds = [];
  }

  /**
   * 获取已使用的头像ID列表
   * @returns {Array<number>}
   */
  getUsedIds() {
    return [...this.usedAvatarIds];
  }
}

// 导出模块
module.exports = {
  uploadAvatar,
  chooseImage,
  uploadImageToStorage,
  getSafeAvatarUrl,
  prepareAvatarData,
  getRandomAvatar,
  RandomAvatarManager,
  STORAGE_CONFIG
};










