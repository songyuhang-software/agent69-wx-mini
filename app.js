// app.js
const API_CONFIG = require('./config/api.js');

App({
  onLaunch: function () {
    // 调用 wx.login() 获取临时授权码
    wx.login({
      success: res => {
        if (res.code) {
          // 使用获取到的 code 调用后端接口
          wx.request({
            url: `${API_CONFIG.userservice}/api/wechat/users/login?weChatCode=${res.code}`,
            method: 'POST',
            success: response => {
              const data = response.data;
              if (data.needWechatRegister === false) {
                // 保存 accessToken 并跳转到主页
                wx.setStorageSync('accessToken', data.accessToken);
                wx.navigateTo({
                  url: '/pages/index/index' // 假设主页的路径为 /pages/home/home
                });
              } else {
                // 需要注册，跳转到授权选择页面
                wx.redirectTo({
                  url: `/pages/auth-select/auth-select?code=${res.code}`
                });
              }
            },
            fail: error => {
              console.error('请求失败', error);
            }
          });
        } else {
          console.error('登录失败！' + res.errMsg);
        }
      }
    });
  }
});