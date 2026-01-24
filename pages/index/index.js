// index.js
const { request } = require('../../utils/request.js');
const API_CONFIG = require('../../config/api.js');

Component({
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
    // 状态提示
    statusVisible: false,
    statusMessage: '',
    statusType: 'loading', // loading, success, error
    // 分页参数
    currentPage: 1,
    pageSize: 100,
    hasMore: true,
    // 滚动到指定位置
    scrollToView: '',
    // 消息 ID 计数器
    messageIdCounter: 0
  },

  lifetimes: {
    attached() {
      this.loadChatHistory();
    }
  },

  methods: {
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
          if (result.data.length === 0) {
            this.setData({ hasMore: false });
          } else {
            // 后端返回的是从新到旧的顺序,需要反转
            const newMessages = result.data.reverse().map((msg, index) => ({
              id: `history-${this.data.currentPage}-${index}`,
              role: msg.role,
              content: this.formatMessageContent(msg.content),
              timestamp: this.formatTime(msg.created_at),
              isWelcome: false
            }));

            // 如果是加载更多,插入到消息列表开头
            if (this.data.currentPage > 1) {
              this.setData({
                messages: [...newMessages, ...this.data.messages]
              });
            } else {
              // 首次加载,添加欢迎消息
              const welcomeMessage = {
                id: 'welcome',
                role: 'assistant',
                content: '您好,我是灵感笔记助手!💡 我可以帮助您随时随地记录脑海中一闪而过的灵感,也可以用来记录日常事件。\n\n🔒 温馨提示:为保护您的隐私,我无法记录手机号、密码等敏感信息。',
                timestamp: this.formatTime(new Date()),
                isWelcome: true
              };

              this.setData({
                messages: [...newMessages, welcomeMessage]
              });

              // 滚动到底部
              setTimeout(() => {
                this.scrollToBottom();
              }, 100);
            }
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
            content: '您好,我是灵感笔记助手!💡 我可以帮助您随时随地记录脑海中一闪而过的灵感,也可以用来记录日常事件。\n\n🔒 温馨提示:为保护您的隐私,我无法记录手机号、密码等敏感信息。',
            timestamp: this.formatTime(new Date()),
            isWelcome: true
          };

          this.setData({
            messages: [welcomeMessage]
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

      this.setData({
        currentPage: this.data.currentPage + 1
      });

      this.loadChatHistory();
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

      // 立即显示用户消息
      this.addUserMessage(input);

      // 清空输入框
      this.setData({
        inputValue: '',
        isSending: true,
        isLoading: true
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
          this.addAssistantMessage(result.data);
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
      this.setData({
        messageIdCounter: this.data.messageIdCounter + 1,
        messages: [...this.data.messages, {
          id: messageId,
          role: 'user',
          content: this.formatMessageContent(content),
          timestamp: this.formatTime(new Date()),
          isWelcome: false
        }]
      });
      this.scrollToBottom();
    },

    /**
     * 添加助手消息
     */
    addAssistantMessage(content) {
      const messageId = `assistant-${Date.now()}-${this.data.messageIdCounter}`;
      this.setData({
        messageIdCounter: this.data.messageIdCounter + 1,
        messages: [...this.data.messages, {
          id: messageId,
          role: 'assistant',
          content: this.formatMessageContent(content),
          timestamp: this.formatTime(new Date()),
          isWelcome: false
        }]
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
      // 小程序中直接返回文本,样式通过 CSS 处理
      return content;
    },

    /**
     * 格式化时间
     */
    formatTime(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;

      // 如果是今天
      if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }

      // 如果是昨天
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.getDate() === yesterday.getDate() &&
          date.getMonth() === yesterday.getMonth() &&
          date.getFullYear() === yesterday.getFullYear()) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `昨天 ${hours}:${minutes}`;
      }

      // 其他日期
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${month}-${day} ${hours}:${minutes}`;
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
     * 隐藏状态提示
     */
    hideStatus() {
      this.setData({
        statusVisible: false
      });
    }
  }
})



