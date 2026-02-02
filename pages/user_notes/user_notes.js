// user_notes.js
const { request } = require('../../utils/request.js');
const API_CONFIG = require('../../config/api.js');
const { formatTime, addTimeLabels } = require('../../utils/timeFormatter.js');

Page({
  data: {
    // 消息列表
    messages: [],
    // 输入框的值
    inputValue: '',
    // 是否正在发送消息
    isSending: false,
    // 是否正在加载历史记录
    isLoading: false,
    // 是否正在加载更多历史记录
    isLoadingMore: false,
    // 加载提示文本
    loadingText: '加载中...',
    // 状态提示
    statusVisible: false,
    statusMessage: '',
    statusType: 'loading', // loading, success, error
    // 分页参数
    currentPage: 1,
    pageSize: 30,
    hasMore: true,
    // 滚动到指定位置
    scrollToView: '',
    // 消息 ID 计数器
    messageIdCounter: 0,
    // 安全区域
    safeAreaTop: 0,
    safeAreaBottom: 0,
    statusBarHeight: 0,
    headerHeight: 0,
    // 字体缩放
    fontScale: 1, // 字体缩放比例，默认为 1（100%）
    initialDistance: 0, // 双指初始距离
    initialFontScale: 1, // 开始缩放时的字体比例
    hasScaled: false, // 是否发生了缩放
    cursorSpacing: 0, // 光标与键盘的距离
    // 滚动位置保持
    anchorMessageId: '' // 加载更多时的锚点消息ID
  },

  onLoad() {
    this.getSafeArea();
    this.loadFontScale();
    this.loadChatHistory();
    this.calculateCursorSpacing();
  },

  /**
   * 计算光标与键盘的距离
   * 目标：让整个输入框容器的底部对齐到键盘顶部
   */
  calculateCursorSpacing() {
    const systemInfo = wx.getSystemInfoSync();
    const pixelRatio = systemInfo.pixelRatio || 2;

    // 输入框容器的高度计算（rpx 转 px）
    // .input-area-wrapper padding: 20rpx 上下
    // .input-container padding: 12rpx 上下
    // 发送按钮高度: 80rpx
    // 总高度约: 20 + 12 + 80 + 12 + 20 = 144rpx

    const containerHeightRpx = 144;
    const containerHeightPx = (containerHeightRpx * systemInfo.windowWidth) / 750;

    // 加上底部安全区域
    const safeAreaBottom = this.data.safeAreaBottom || 0;

    // 最终的 cursor-spacing 值
    const cursorSpacing = Math.round(containerHeightPx + safeAreaBottom - 40);

    console.log('计算 cursor-spacing:', {
      containerHeightPx,
      safeAreaBottom,
      cursorSpacing
    });

    this.setData({
      cursorSpacing
    });
  },

  /**
   * 获取安全区域信息
   */
  getSafeArea() {
    const systemInfo = wx.getSystemInfoSync();
    console.log('系统信息:', systemInfo);

    // 获取状态栏高度
    const statusBarHeight = systemInfo.statusBarHeight || 0;

    // 获取安全区域
    const safeArea = systemInfo.safeArea || {};
    const safeAreaTop = safeArea.top || statusBarHeight;
    const safeAreaBottom = systemInfo.screenHeight - (safeArea.bottom || systemInfo.screenHeight);

    console.log('安全区域 - 顶部:', safeAreaTop, '底部:', safeAreaBottom);

    // 计算标题栏高度（安全区域 + 上边距8px + 标题高度约25px + 下边距10px）
    const headerHeight = safeAreaTop + 8 + 25 + 10;

    this.setData({
      statusBarHeight,
      safeAreaTop,
      safeAreaBottom,
      headerHeight
    });
  },

  /**
   * 加载聊天历史记录
   */
  async loadChatHistory() {
    if (this.data.isLoading || this.data.isLoadingMore) return;

    // 如果是第一页,显示加载状态
    if (this.data.currentPage === 1) {
      this.setData({ isLoading: true });
      this.showStatus('正在加载聊天记录...', 'loading');
    } else {
      this.setData({ isLoadingMore: true });
    }

    try {
      // 检查 llmServiceUrl 是否已配置
      if (!API_CONFIG.llmServiceUrl) {
        throw new Error('LLM API 地址未配置,请在 config/api.js 中填写 llmServiceUrl');
      }

      const result = await request({
        url: `${API_CONFIG.llmServiceUrl}/api/common/chat_history?scene_id=user_notes&page=${this.data.currentPage}&page_size=${this.data.pageSize}`,
        method: 'GET',
        needAuth: true
      });

      if (result.success && result.data) {
        // 后端返回的是从新到旧的顺序,需要反转
        const newMessages = result.data.length > 0
          ? result.data.reverse().map((msg, index) => ({
              id: `history-${this.data.currentPage}-${index}`,
              role: msg.role,
              content: this.formatMessageContent(msg.content),
              rawTimestamp: new Date(msg.created_at),
              isWelcome: false,
              isLatest: false  // 历史消息默认不是最新的
            }))
          : [];

        // 如果没有更多数据了
        if (result.data.length === 0) {
          this.setData({ hasMore: false });
        }

        // 如果是加载更多,插入到消息列表开头
        if (this.data.currentPage > 1) {
          const allMessages = [...newMessages, ...this.data.messages];
          this.setData({
            messages: addTimeLabels(allMessages),
            scrollToView: '' // 先清空，避免冲突
          }, () => {
            // 恢复到锚点消息位置
            this.restoreScrollPosition();
          });
        } else {
          // 首次加载,添加欢迎消息
          const welcomeMessage = {
            id: 'welcome',
            role: 'assistant',
            content: '您好,我是您的专属智能笔记!\n\n💡 我可以帮助您记录脑海中一闪而过的灵感,也可以用来记录日常事件。\n\n🔒 温馨提示:为保护您的隐私,我无法记录手机号、密码等敏感信息。\n\n(不满意字体大小可以双指缩放哦～)',
            rawTimestamp: new Date(),
            isWelcome: true,
            suggestedQuestions: [
              '如何记录信息？',
              '如何查询信息？',
              '我能修改或删除已记录的信息吗？'
            ],
            isLatest: true  // 欢迎消息是最新的
          };

          const allMessages = [...newMessages, welcomeMessage];
          this.setData({
            messages: addTimeLabels(allMessages)
          });

          // 滚动到底部
          setTimeout(() => {
            this.scrollToBottom();
          }, 100);
        }

        this.hideStatus();
      } else {
        throw new Error(result.message || '加载聊天记录失败');
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error);
      this.showStatus(`加载失败: ${error.message}`, 'error');

      // 如果是首次加载失败,仍然显示欢迎消息
      if (this.data.currentPage === 1 && this.data.messages.length === 0) {
        const welcomeMessage = {
          id: 'welcome',
          role: 'assistant',
          content: '您好,我是您的专属智能笔记!\n\n💡 我可以帮助您记录脑海中一闪而过的灵感,也可以用来记录日常事件。\n\n🔒 温馨提示:为保护您的隐私,我无法记录手机号、密码等敏感信息。\n\n(不满意字体大小可以双指缩放哦～)',
          rawTimestamp: new Date(),
          isWelcome: true,
          suggestedQuestions: [
            '如何记录信息？',
            '如何查询信息？',
            '我能修改或删除已记录的信息吗？'
          ],
          isLatest: true  // 欢迎消息是最新的
        };

        this.setData({
          messages: addTimeLabels([welcomeMessage])
        });
      }
    } finally {
      this.setData({
        isLoading: false,
        isLoadingMore: false
      });
    }
  },

  /**
   * 滚动到顶部时加载更多历史记录
   */
  onScrollToUpper() {
    if (!this.data.hasMore || this.data.isLoadingMore) return;

    // 记录当前第一条可见消息的ID作为锚点
    // 加载完成后滚动到这条消息，保持用户视角不变
    if (this.data.messages.length > 0) {
      // 找到第一条非时间标签的消息作为锚点
      const anchorMessage = this.data.messages.find(msg => msg.type !== 'time-label');
      if (anchorMessage) {
        this.setData({
          anchorMessageId: anchorMessage.id,
          currentPage: this.data.currentPage + 1
        });
      }
    }

    this.loadChatHistory();
  },

  /**
   * 恢复滚动位置（加载更多历史记录后）
   */
  restoreScrollPosition() {
    if (!this.data.anchorMessageId) return;

    // 使用 nextTick 确保 DOM 已更新
    wx.nextTick(() => {
      // 滚动到锚点消息，保持用户视角
      this.setData({
        scrollToView: `msg-${this.data.anchorMessageId}`,
        anchorMessageId: '' // 清空锚点
      });

      console.log('恢复到锚点消息:', this.data.anchorMessageId);
    });
  },

  /**
   * 输入框内容变化
   */
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  /**
   * 发送消息
   */
  async onSendMessage() {
    const input = this.data.inputValue.trim();
    if (!input) {
      this.showStatus('请输入内容', 'error');
      return;
    }

    if (this.data.isSending) return;

    // 隐藏所有推荐追问
    this.hideAllSuggestedQuestions();

    // 立即显示用户消息
    this.addUserMessage(input);

    // 清空输入框
    this.setData({
      inputValue: '',
      isSending: true,
      isLoading: true,
      loadingText: 'AI正在思考中...'
    });

    try {
      // 检查 llmServiceUrl 是否已配置
      if (!API_CONFIG.llmServiceUrl) {
        throw new Error('LLM API 地址未配置,请在 config/api.js 中填写 llmServiceUrl');
      }

      const result = await request({
        url: `${API_CONFIG.llmServiceUrl}/api/user-notes/process`,
        method: 'POST',
        data: {
          input: input
        },
        needAuth: true
      });

      if (result.success && result.data) {
        // 提取推荐追问
        const suggestedQuestions = result.suggested_follow_questions || [];
        this.addAssistantMessage(result.data, suggestedQuestions);
      } else {
        throw new Error(result.message || 'API 调用失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      this.addAssistantMessage(`发送失败: ${error.message}`);
      this.showStatus(`发送失败: ${error.message}`, 'error');
    } finally {
      this.setData({
        isSending: false,
        isLoading: false
      });
      this.scrollToBottom();
    }
  },

  /**
   * 添加用户消息
   */
  addUserMessage(content) {
    const messageId = `user-${Date.now()}-${this.data.messageIdCounter}`;
    const newMessage = {
      id: messageId,
      role: 'user',
      content: this.formatMessageContent(content),
      rawTimestamp: new Date(),
      isWelcome: false
    };

    const allMessages = [...this.data.messages, newMessage];
    this.setData({
      messageIdCounter: this.data.messageIdCounter + 1,
      messages: addTimeLabels(allMessages)
    });
    this.scrollToBottom();
  },

  /**
   * 添加助手消息
   */
  addAssistantMessage(content, suggestedQuestions = []) {
    const messageId = `assistant-${Date.now()}-${this.data.messageIdCounter}`;

    // 将之前所有消息的 isLatest 设为 false
    const updatedMessages = this.data.messages.map(msg => ({
      ...msg,
      isLatest: false
    }));

    const newMessage = {
      id: messageId,
      role: 'assistant',
      content: this.formatMessageContent(content),
      rawTimestamp: new Date(),
      isWelcome: false,
      suggestedQuestions: suggestedQuestions || [],
      isLatest: true  // 标记为最新消息
    };

    const allMessages = [...updatedMessages, newMessage];
    this.setData({
      messageIdCounter: this.data.messageIdCounter + 1,
      messages: addTimeLabels(allMessages)
    });
    this.scrollToBottom();
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    if (this.data.messages.length > 0) {
      const lastMessage = this.data.messages[this.data.messages.length - 1];
      this.setData({
        scrollToView: `msg-${lastMessage.id}`
      });
    }
  },

  /**
   * 格式化消息内容
   */
  formatMessageContent(content) {
    if (!content || typeof content !== 'string') {
      return content;
    }

    // 直接返回原始内容，让 wemark 组件处理 markdown
    return content;
  },

  /**
   * 显示状态提示
   */
  showStatus(message, type) {
    this.setData({
      statusVisible: true,
      statusMessage: message,
      statusType: type
    });

    // 非加载状态自动隐藏
    if (type !== 'loading') {
      setTimeout(() => {
        this.hideStatus();
      }, type === 'success' ? 3000 : 5000);
    }
  },

  /**
   * 点击推荐追问
   */
  onClickSuggestedQuestion(e) {
    const question = e.currentTarget.dataset.question;
    if (!question) return;

    // 设置输入框内容并发送（onSendMessage 会隐藏推荐追问）
    this.setData({
      inputValue: question
    }, () => {
      this.onSendMessage();
    });
  },

  /**
   * 隐藏状态提示
   */
  hideStatus() {
    this.setData({
      statusVisible: false
    });
  },

  /**
   * 隐藏所有推荐追问
   */
  hideAllSuggestedQuestions() {
    const updatedMessages = this.data.messages.map(msg => ({
      ...msg,
      isLatest: false
    }));

    this.setData({
      messages: updatedMessages
    });
  },

  /**
   * 加载字体缩放比例
   */
  loadFontScale() {
    try {
      const fontScale = wx.getStorageSync('fontScale');
      if (fontScale) {
        this.setData({ fontScale: parseFloat(fontScale) });
      }
    } catch (error) {
      console.error('加载字体缩放比例失败:', error);
    }
  },

  /**
   * 保存字体缩放比例
   */
  saveFontScale(scale) {
    try {
      wx.setStorageSync('fontScale', scale.toString());
    } catch (error) {
      console.error('保存字体缩放比例失败:', error);
    }
  },

  /**
   * 双指触摸开始
   */
  onTouchStart(e) {
    // 只有双指触摸才处理，单指触摸不做任何处理（允许文本选择）
    if (e.touches.length === 2) {
      // 阻止默认行为，避免触发文本选择
      e.preventDefault && e.preventDefault();
      const distance = this.getDistance(e.touches[0], e.touches[1]);
      this.setData({
        initialDistance: distance,
        initialFontScale: this.data.fontScale,
        hasScaled: false
      });
    }
  },

  /**
   * 双指触摸移动
   */
  onTouchMove(e) {
    if (e.touches.length === 2 && this.data.initialDistance > 0) {
      // 阻止默认行为和事件冒泡
      e.preventDefault && e.preventDefault();
      e.stopPropagation && e.stopPropagation();

      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / this.data.initialDistance;

      // 计算新的字体缩放比例，限制在 0.8 到 1.5 之间
      let newFontScale = this.data.fontScale * scale;
      newFontScale = Math.max(0.8, Math.min(1.5, newFontScale));

      // 判断是否真正发生了缩放（变化超过 1%）
      if (Math.abs(newFontScale - this.data.initialFontScale) > 0.01) {
        this.setData({ hasScaled: true });
      }

      this.setData({
        fontScale: newFontScale,
        initialDistance: currentDistance
      });
    }
  },

  /**
   * 双指触摸结束
   */
  onTouchEnd(e) {
    if (e.touches.length < 2 && this.data.initialDistance > 0) {
      // 只有真正发生了缩放才显示提示和保存
      if (this.data.hasScaled) {
        // 保存字体缩放比例
        this.saveFontScale(this.data.fontScale);

        // 显示提示
        const percentage = Math.round(this.data.fontScale * 100);
        this.showStatus(`字体大小: ${percentage}%`, 'success');
      }

      this.setData({
        initialDistance: 0,
        initialFontScale: 1,
        hasScaled: false
      });
    }
  },

  /**
   * 计算两点之间的距离
   */
  getDistance(touch1, touch2) {
    const x = touch1.pageX - touch2.pageX;
    const y = touch1.pageY - touch2.pageY;
    return Math.sqrt(x * x + y * y);
  }
})
