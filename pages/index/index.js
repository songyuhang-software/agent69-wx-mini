// index.js
Page({
  data: {},

  onLoad(options) {
    console.log('首页加载');
  },

  /**
   * 跳转到智能笔记页面
   */
  goToUserNotes() {
    wx.navigateTo({
      url: '/pages/user_notes/user_notes'
    });
  }
})
