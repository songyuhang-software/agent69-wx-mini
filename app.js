// app.js
const API_CONFIG = require('./config/api.js');

App({
  onLaunch: function () {
    // 在 app.js 中不再执行登录逻辑
    // 登录逻辑将在 auth-select 页面执行
  },

  // 提供全局的登录检查方法
  checkLogin: function(callback) {
    wx.login({
      success: res => {
        if (res.code) {
          // 使用获取到的 code 调用后端接口
          wx.request({
            url: `${API_CONFIG.userserviceUrl}/api/wechat/users/login?weChatCode=${res.code}`,
            method: 'POST',
            success: response => {
              const data = response.data;
              if (callback) {
                callback({
                  success: true,
                  needWechatRegister: data.needWechatRegister,
                  accessToken: data.accessToken,
                  code: res.code
                });
              }
            },
            fail: error => {
              console.error('请求失败', error);
              if (callback) {
                callback({
                  success: false,
                  error: error
                });
              }
            }
          });
        } else {
          console.error('登录失败！' + res.errMsg);
          if (callback) {
            callback({
              success: false,
              error: res.errMsg
            });
          }
        }
      }
    });
  }
});