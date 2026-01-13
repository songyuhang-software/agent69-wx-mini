// pages/auth-select/auth-select.js
const API_CONFIG = require('../../config/api.js');

Page({
  data: {
    weChatCode: '' // 保存微信临时授权码
  },

  onLoad(options) {
    // 从页面参数中获取微信临时授权码
    if (options.code) {
      this.setData({
        weChatCode: options.code
      });
    }
  },

  // 微信授权登录
  onWechatAuth() {
    const that = this;

    // 获取用户信息授权
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        const nickName = userInfo.nickName;
        const avatarUrl = userInfo.avatarUrl;

        console.log('获取到用户信息:', nickName, avatarUrl);

        // 调用注册接口
        wx.request({
          url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.wechatRegister}`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            weChatCode: that.data.weChatCode,
            weChatNickName: nickName,
            weChatAvatarUrl: avatarUrl
          },
          success: (response) => {
            console.log('注册成功:', response.data);
            const data = response.data;

            if (data.accessToken) {
              // 保存 accessToken 和 refreshToken
              wx.setStorageSync('accessToken', data.accessToken);
              wx.setStorageSync('refreshToken', data.refreshToken);
              wx.setStorageSync('userId', data.userId);
              wx.setStorageSync('username', data.username);

              // 跳转到主页
              wx.reLaunch({
                url: '/pages/index/index'
              });
            } else {
              wx.showToast({
                title: '注册失败，请重试',
                icon: 'none'
              });
            }
          },
          fail: (error) => {
            console.error('注册失败:', error);
            wx.showToast({
              title: '网络请求失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (error) => {
        console.error('获取用户信息失败:', error);
        wx.showToast({
          title: '需要授权才能继续',
          icon: 'none'
        });
      }
    });
  },

  // 绑定已有账号
  onBindAccount() {
    wx.navigateTo({
      url: '/pages/bind-account/bind-account?code=' + this.data.weChatCode
    });
  }
});

