// utils/request.js
// 封装网络请求

const API_CONFIG = require('../config/api.js');
const { isTokenExpiringSoon } = require('./util.js');

// 用于防止多个请求同时刷新 token
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * 订阅 token 刷新完成事件
 * @param {Function} callback 回调函数
 */
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

/**
 * 通知所有订阅者 token 刷新完成
 * @param {string} newToken 新的 accessToken
 */
const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
};

/**
 * 刷新 accessToken
 * @returns {Promise<string>} 返回新的 accessToken
 */
const refreshAccessToken = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: `${API_CONFIG.userserviceUrl}/api/wechat/users/login?weChatCode=${res.code}`,
            method: 'POST',
            success: (response) => {
              if (response.statusCode === 200 && response.data.accessToken) {
                const newToken = response.data.accessToken;
                wx.setStorageSync('accessToken', newToken);
                resolve(newToken);
              } else {
                reject(new Error('刷新 token 失败'));
              }
            },
            fail: (error) => {
              console.error('刷新 token 请求失败:', error);
              reject(error);
            }
          });
        } else {
          reject(new Error('获取微信登录 code 失败'));
        }
      },
      fail: (error) => {
        console.error('微信登录失败:', error);
        reject(error);
      }
    });
  });
};

/**
 * 发起网络请求(带自动 token 刷新)
 * @param {Object} options 请求配置
 * @param {string} options.url 请求地址
 * @param {string} options.method 请求方法,默认 GET
 * @param {Object} options.data 请求数据
 * @param {Object} options.header 请求头
 * @param {boolean} options.needAuth 是否需要认证,默认 true
 * @returns {Promise}
 */
const request = async (options) => {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    needAuth = true
  } = options;

  // 如果需要认证,检查并刷新 token
  if (needAuth) {
    let accessToken = wx.getStorageSync('accessToken');

    // 检查 token 是否存在或即将过期
    if (!accessToken || isTokenExpiringSoon(accessToken)) {
      // 如果正在刷新 token,等待刷新完成
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            // 使用新 token 重新发起请求
            executeRequest({ url, method, data, header, needAuth: true, token: newToken })
              .then(resolve)
              .catch(reject);
          });
        });
      }

      // 开始刷新 token
      isRefreshing = true;
      try {
        accessToken = await refreshAccessToken();
        isRefreshing = false;
        onTokenRefreshed(accessToken);
      } catch (error) {
        isRefreshing = false;
        onTokenRefreshed(null);

        // 刷新失败,跳转到登录页
        wx.showToast({
          title: '登录已过期',
          icon: 'none'
        });
        wx.removeStorageSync('accessToken');
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/auth-select/auth-select'
          });
        }, 1500);
        throw new Error('刷新 token 失败');
      }
    }
  }

  // 执行实际的请求
  return executeRequest({ url, method, data, header, needAuth });
};

/**
 * 执行实际的网络请求
 * @param {Object} params 请求参数
 * @returns {Promise}
 */
const executeRequest = ({ url, method, data, header, needAuth, token }) => {
  return new Promise((resolve, reject) => {
    // 构建请求头
    const requestHeader = {
      'Content-Type': 'application/json',
      'terminal': 'wechat-mini',
      ...header
    };

    // 如果需要认证,添加 Authorization 头
    if (needAuth) {
      const accessToken = token || wx.getStorageSync('accessToken');
      if (accessToken) {
        requestHeader['Authorization'] = `Bearer ${accessToken}`;
      } else {
        // 如果需要认证但没有 token,跳转到登录页
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/auth-select/auth-select'
          });
        }, 1500);
        reject(new Error('未登录'));
        return;
      }
    }

    // 发起请求
    wx.request({
      url,
      method,
      data,
      header: requestHeader,
      success: (res) => {
        // 处理响应
        // 2xx 状态码都认为是成功
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token 失效,跳转到登录页
          wx.showToast({
            title: '登录已过期',
            icon: 'none'
          });
          wx.removeStorageSync('accessToken');
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/auth-select/auth-select'
            });
          }, 1500);
          reject(new Error('登录已过期'));
        } else {
          // 其他错误 - 兼容多种错误消息格式
          const errorMessage = res.data?.message || res.data?.error || '请求失败';
          reject(new Error(errorMessage));
        }
      },
      fail: (error) => {
        console.error('网络请求失败:', error);
        reject(error);
      }
    });
  });
};

module.exports = {
  request
};