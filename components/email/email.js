// components/email/email.js
const { request } = require('../../utils/request.js');
const API_CONFIG = require('../../config/api.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前用户邮箱
    currentEmail: {
      type: String,
      value: ''
    },
    // 操作类型：bind（绑定）或 unbind（解绑）
    action: {
      type: String,
      value: 'bind' // 'bind' or 'unbind'
    },
    // 是否显示操作界面
    show: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 邮箱输入值
    email: '',
    // 验证码输入值
    verificationCode: '',
    // 发送验证码按钮文本
    sendCodeBtnText: '发送验证码',
    // 发送验证码按钮是否禁用
    sendCodeBtnDisabled: false,
    // 倒计时
    countdown: 0,
    // 定时器
    timer: null,
    // 邮箱是否有效
    isValidEmail: false,
    // 是否显示操作界面
    showOperation: false,
    // 卡片是否激活（点击时的高亮状态）
    isCardActive: false,
    // 卡片定时器
    cardTimer: null,
    // 是否进入关联模式
    isAssociationMode: false,
    // 微信授权码
    weChatCode: ''
  },

  /**
   * 组件的方法
   */
    methods: {
    // 邮箱卡片按下事件
    onCardTouchStart() {
      // 如果正在显示操作界面，不执行点击效果
      if (this.data.showOperation) {
        return;
      }

      // 清除之前的定时器
      if (this.data.cardTimer) {
        clearTimeout(this.data.cardTimer);
        this.setData({ cardTimer: null });
      }

      // 立即激活
      this.setData({
        isCardActive: true
      });
    },

    // 邮箱卡片松开事件
    onCardTouchEnd() {
      // 如果正在显示操作界面，不执行点击效果
      if (this.data.showOperation) {
        return;
      }

      // 松开后继续保持高亮 400ms
      const timer = setTimeout(() => {
        this.setData({
          isCardActive: false,
          cardTimer: null
        });
      }, 400);

      this.setData({ cardTimer: timer });
    },

    // 获取微信授权码
    getWeChatCode() {
      return new Promise((resolve, reject) => {
        wx.login({
          success: (res) => {
            if (res.code) {
              this.setData({
                weChatCode: res.code
              });
              console.log('通过wx.login获取到授权码:', res.code);
              resolve(res.code);
            } else {
              console.error('获取微信授权码失败');
              reject(new Error('获取授权码失败'));
            }
          },
          fail: (error) => {
            console.error('wx.login失败:', error);
            reject(error);
          }
        });
      });
    },

    // 邮箱卡片点击事件
    onCardTap() {
      // 保留原有的点击逻辑（如果有需要的话）
    },

    // 邮箱输入
    onEmailInput(e) {
      const email = e.detail.value;
      const isValid = this.isValidEmail(email);

      this.setData({
        email,
        isValidEmail: isValid
      });

      // 实时验证邮箱格式
      this.updateSendCodeButtonState();
    },

    // 验证码输入
    onVerificationCodeInput(e) {
      this.setData({
        verificationCode: e.detail.value
      });
    },

    // 邮箱格式验证
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    // 更新发送验证码按钮状态
    updateSendCodeButtonState() {
      const { email, action } = this.data;

      if (action === 'bind') {
        const isValid = this.isValidEmail(email);
        this.setData({
          sendCodeBtnDisabled: !isValid
        });
      } else {
        // 解绑时按钮总是可用的
        this.setData({
          sendCodeBtnDisabled: false
        });
      }
    },

    // 点击开始操作（绑定/解绑）
    onStartOperation() {
      const { action, currentEmail } = this.data;

      if (action === 'bind') {
        // 绑定时清空邮箱
        this.setData({
          email: '',
          isValidEmail: false
        });
      } else {
        // 解绑时显示当前邮箱
        this.setData({
          email: currentEmail,
          isValidEmail: true
        });
      }

      this.setData({
        showOperation: true,
        isCardActive: true  // 进入操作界面时激活图标
      });
    },

    // 发送验证码
    async onSendVerificationCode() {
      const { email, action, sendCodeBtnDisabled } = this.data;

      // 如果按钮禁用，不执行任何操作
      if (sendCodeBtnDisabled) {
        return;
      }

      if (action === 'bind' && !this.isValidEmail(email)) {
        wx.showToast({
          title: '请输入正确的邮箱地址',
          icon: 'none'
        });
        return;
      }

      try {
        this.setData({
          sendCodeBtnDisabled: true
        });

        wx.showLoading({ title: '发送中...' });

        // 根据操作类型选择不同的API接口
        const apiEndpoint = action === 'bind'
          ? API_CONFIG.endpoints.emailSendCode
          : API_CONFIG.endpoints.emailVerifySendCode;

        const requestData = action === 'bind'
          ? { email }
          : { email: this.data.currentEmail };

        const response = await request({
          url: `${API_CONFIG.userserviceUrl}${apiEndpoint}`,
          method: 'POST',
          data: requestData,
          needAuth: true
        });

        wx.hideLoading();

        // 检查返回的消息内容
        if (action === 'bind' && response.message === '该邮箱已存在agent69账号') {
          // 弹窗询问用户
          wx.showModal({
            title: '确认关联',
            content: '该邮箱已绑定agent69账号，是否关联？',
            confirmText: '是',
            cancelText: '否',
            success: async (modalRes) => {
              if (modalRes.cancel) {
                // 用户选择"否"，退出绑定
                console.log('用户选择不关联，退出绑定');
                wx.showToast({
                  title: '已取消绑定',
                  icon: 'none'
                });
                this.onCancelOperation();
                // 触发取消事件
                this.triggerEvent('cancel');
              } else {
                // 用户选择"是"，进入关联模式
                console.log('用户选择关联，进入关联模式');
                this.setData({
                  isAssociationMode: true
                });
                try {
                  wx.showLoading({ title: '发送中...' });
                  const response = await request({
                    url: `${API_CONFIG.userserviceUrl}/api/users/login/email/send-code`,
                    method: 'POST',
                    data: { email },
                    needAuth: false
                  });
                  wx.hideLoading();

                  wx.showToast({
                    title: '验证码已发送，请查收邮箱',
                    icon: 'success'
                  });
                  // 开始倒计时
                  this.startCountdown();
                } catch (error) {
                  wx.hideLoading();
                  console.error('发送验证码失败:', error);
                  wx.showToast({
                    title: error.message || '发送失败',
                    icon: 'none'
                  });
                }
              }
            }
          });
        } else {
          // 其他情况，正常显示发送成功
          wx.showToast({
            title: '验证码已发送，请查收邮箱',
            icon: 'success'
          });
          // 开始倒计时
          this.startCountdown();
        }

      } catch (error) {
        wx.hideLoading();
        console.error('发送验证码失败:', error);
        wx.showToast({
          title: error.message || '发送失败',
          icon: 'none'
        });

        this.setData({
          sendCodeBtnDisabled: false
        });
      }
    },

    // 开始倒计时
    startCountdown() {
      let countdown = 60;

      this.setData({
        sendCodeBtnText: `重新发送(${countdown}s)`,
        countdown,
        timer: setInterval(() => {
          countdown--;
          if (countdown === 0) {
            clearInterval(this.data.timer);
            this.setData({
              sendCodeBtnText: '发送验证码',
              sendCodeBtnDisabled: false,
              countdown: 0,
              timer: null
            });
          } else {
            this.setData({
              sendCodeBtnText: `重新发送(${countdown}s)`,
              countdown
            });
          }
        }, 1000)
      });
    },

    // 确认操作
    async onConfirm() {
      const { email, verificationCode, action, isAssociationMode } = this.data;

      if (!verificationCode) {
        wx.showToast({
          title: '请输入验证码',
          icon: 'none'
        });
        return;
      }

      try {
        if (isAssociationMode) {
          // 关联模式处理
          wx.showLoading({ title: '关联中...' });

          // 获取微信授权码
          const weChatCode = await this.getWeChatCode();

          // 调用关联接口
          const response = await request({
            url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.emailAssociation}`,
            method: 'POST',
            data: {
              email: email,
              verificationCode: verificationCode,
              weChatCode: weChatCode
            },
            needAuth: false
          });

          wx.hideLoading();

          // request 函数已经返回了 res.data，所以 response 就是实际的数据
          const result = response;

          wx.showToast({
            title: '关联成功!',
            icon: 'success'
          });

          // 保存返回的用户信息
          if (result.accessToken) {
            wx.setStorageSync('accessToken', result.accessToken);
            console.log('Access token已更新');
          }
          if (result.refreshToken) {
            wx.setStorageSync('refreshToken', result.refreshToken);
          }
          if (result.userId) {
            wx.setStorageSync('userId', result.userId);
          }

          // 触发成功事件，让父组件刷新数据
          this.triggerEvent('success', { action: 'association', email: email });

          // 关闭操作界面
          this.onCancelOperation();

        } else {
          // 正常的绑定/解绑操作
          wx.showLoading({ title: action === 'bind' ? '绑定中...' : '解绑中...' });

          // 根据操作类型选择不同的API接口
          const apiEndpoint = action === 'bind'
            ? API_CONFIG.endpoints.emailBind
            : API_CONFIG.endpoints.emailUnbind;

          const requestData = action === 'bind'
            ? { email, verificationCode }
            : { email: this.data.currentEmail, verificationCode };

          const result = await request({
            url: `${API_CONFIG.userserviceUrl}${apiEndpoint}`,
            method: 'POST',
            data: requestData,
            needAuth: true
          });

          wx.hideLoading();

          wx.showToast({
            title: action === 'bind' ? '邮箱绑定成功!' : '邮箱解绑成功!',
            icon: 'success'
          });

          // 检查返回的新 accessToken
          if (result.c) {
            wx.setStorageSync('accessToken', result.c);
            console.log('Access token已更新');
          }

          // 触发成功事件，让父组件刷新数据
          this.triggerEvent('success', { action, email: action === 'bind' ? email : '' });

          // 关闭操作界面
          this.onCancelOperation();
        }

      } catch (error) {
        wx.hideLoading();
        console.error(`${isAssociationMode ? '关联' : action === 'bind' ? '绑定' : '解绑'}失败:`, error);
        wx.showToast({
          title: error.message || '操作失败',
          icon: 'none'
        });
      }
    },

    // 取消操作
    onCancelOperation() {
      // 清理定时器
      if (this.data.timer) {
        clearInterval(this.data.timer);
        this.setData({ timer: null });
      }

      this.setData({
        email: '',
        verificationCode: '',
        sendCodeBtnText: '发送验证码',
        sendCodeBtnDisabled: false,
        countdown: 0,
        showOperation: false,
        isAssociationMode: false,
        weChatCode: '',
        isCardActive: false  // 退出操作界面时取消激活状态
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件被添加到页面时触发
    },

    detached() {
      // 组件被从页面移除时触发
      // 清理定时器
      if (this.data.timer) {
        clearInterval(this.data.timer);
      }
      if (this.data.cardTimer) {
        clearTimeout(this.data.cardTimer);
      }
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'show, action, currentEmail': function(show, action, currentEmail) {
      if (show) {
        if (action === 'unbind') {
          // 解绑时显示当前邮箱
          this.setData({
            email: currentEmail,
            isValidEmail: true
          });
        }
        // 更新发送按钮状态
        this.updateSendCodeButtonState();
      }
    }
  }
})