// pages/bind-account/bind-account.js
Page({
  data: {
    weChatCode: ''
  },

  onLoad(options) {
    // 从页面参数中获取微信临时授权码
    if (options.code) {
      this.setData({
        weChatCode: options.code
      });
    }
  }

  // 后续实现绑定逻辑
});
