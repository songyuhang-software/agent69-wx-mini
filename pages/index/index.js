// index.js
Page({
  data: {
    cards: [
      { id: 1, icon: '📝', label: '智能笔记', disabled: false, action: 'goToUserNotes' },
      { id: 2, icon: '⏳', label: '请期待', disabled: true },
      { id: 3, icon: '⏳', label: '请期待', disabled: true },
      { id: 4, icon: '⏳', label: '请期待', disabled: true },
      { id: 5, icon: '⏳', label: '请期待', disabled: true }
    ],
    visibleCards: [],
    isSmallScreen: false,
    showModal: false
  },

  onLoad(options) {
    console.log('首页加载');
    this.checkScreenSize();
  },

  /**
   * 检测屏幕尺寸并智能调整卡片显示
   */
  checkScreenSize() {
    const systemInfo = wx.getSystemInfoSync();
    const screenHeight = systemInfo.windowHeight; // 可用窗口高度（px）
    const screenWidth = systemInfo.windowWidth;

    // 转换rpx到px的比例
    const rpxToPx = screenWidth / 750;

    // 计算各部分高度（rpx转px）
    const headerHeight = (60 + 40 + 120 + 16 + 52 + 20 + 26) * rpxToPx; // 顶部品牌区域
    const sectionTitleHeight = (32 + 30 + 20) * rpxToPx; // 标题区域
    const cardHeight = (88 + 24 + 30 + 50 * 2 + 24) * rpxToPx; // 单个卡片高度
    const contentPadding = (40 + 40 - 20) * rpxToPx; // 内容区域padding

    // 计算可用于显示卡片的高度
    const availableHeight = screenHeight - headerHeight - sectionTitleHeight - contentPadding;

    // 计算可以完整显示的行数（每行2个卡片）
    const maxRows = Math.floor(availableHeight / cardHeight);
    const maxCards = maxRows * 2; // 每行2个卡片

    console.log('屏幕信息:', {
      screenHeight,
      availableHeight,
      cardHeight,
      maxRows,
      maxCards
    });

    // 判断是否为小机型（无法完整显示所有5个卡片）
    const isSmallScreen = maxCards < 5;

    // 设置可见卡片
    let visibleCards = this.data.cards;
    if (isSmallScreen && maxCards >= 2) {
      // 小机型：只显示能完整展示的卡片数量
      visibleCards = this.data.cards.slice(0, maxCards);
    }

    this.setData({
      visibleCards,
      isSmallScreen
    });

    console.log(`${isSmallScreen ? '小' : '正常'}机型，显示 ${visibleCards.length} 个卡片`);
  },

  /**
   * 处理卡片点击
   */
  handleCardTap(e) {
    const { action, disabled } = e.currentTarget.dataset;

    // 如果是禁用的卡片（请期待），显示开发中弹窗
    if (disabled) {
      this.showModal();
      return;
    }

    // 如果有action且存在对应方法，执行跳转
    if (action && this[action]) {
      this[action]();
    }
  },

  /**
   * 显示功能开发中弹窗
   */
  showModal() {
    this.setData({
      showModal: true
    });
  },

  /**
   * 隐藏弹窗
   */
  hideModal() {
    this.setData({
      showModal: false
    });
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

