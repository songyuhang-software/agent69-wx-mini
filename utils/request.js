// utils/request.js
// 封装网络请求

/**
 * 发起网络请求
 * @param {Object} options 请求配置
 * @param {string} options.url 请求地址
 * @param {string} options.method 请求方法,默认 GET
 * @param {Object} options.data 请求数据
 * @param {Object} options.header 请求头
 * @param {boolean} options.needAuth 是否需要认证,默认 true
 * @returns {Promise}
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    const {
      url,
      method = 'GET',
      data = {},
      header = {},
      needAuth = true
    } = options;

    // 构建请求头
    const requestHeader = {
      'Content-Type': 'application/json',
      ...header
    };

    // 如果需要认证,添加 Authorization 头
    if (needAuth) {
      const accessToken = wx.getStorageSync('accessToken');
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
            url: '/pages/login/login'
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
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token 失效,跳转到登录页
          wx.showToast({
            title: '登录已过期',
            icon: 'none'
          });
          wx.removeStorageSync('accessToken');
          wx.removeStorageSync('refreshToken');
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 1500);
          reject(new Error('登录已过期'));
        } else {
          // 其他错误
          reject(new Error(res.data.message || '请求失败'));
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
