// pages/bind-account/bind-account.js
const { request } = require('../../utils/request.js');
const API_CONFIG = require('../../config/api.js');

Page({
  data: {
    // 微信授权码
    weChatCode: '',

    // 当前选项卡
    currentTab: 'username',

    // 用户名登录表单
    usernameForm: {
      username: '',
      password: ''
    },
    usernameLoading: false,
    usernameError: '',

    // 邮箱登录表单
    emailForm: {
      email: '',
      code: ''
    },
    emailLoading: false,
    emailError: '',
    isEmailValid: false,
    countdown: 0,

    // 密码显示状态
    showPassword: false
  },

  onLoad(options) {
    // 页面加载时获取新的微信授权码
    this.getWeChatCode();
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
            wx.showToast({
              title: '获取授权失败',
              icon: 'none'
            });
            reject(new Error('获取授权码失败'));
          }
        },
        fail: (error) => {
          console.error('wx.login失败:', error);
          wx.showToast({
            title: '获取授权失败',
            icon: 'none'
          });
          reject(error);
        }
      });
    });
  },

  // 切换选项卡
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab,
      usernameError: '',
      emailError: ''
    });
  },

  // 切换密码显示
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // ========== 用户名登录相关 ==========
  onUsernameInput(e) {
    this.setData({
      'usernameForm.username': e.detail.value
    });
  },

  onPasswordInput(e) {
    this.setData({
      'usernameForm.password': e.detail.value
    });
  },

  async handleUsernameLogin(e) {
    const { username, password } = this.data.usernameForm;

    if (!username || !password) {
      this.setData({
        usernameError: '请输入用户名和密码'
      });
      return;
    }

    this.setData({
      usernameLoading: true,
      usernameError: ''
    });

    try {
      // 第一步: 调用登录接口
      console.log('开始用户名登录...');
      const loginResponse = await new Promise((resolve, reject) => {
        wx.request({
          url: `${API_CONFIG.userserviceUrl}/api/users/login/username`,
          method: 'POST',
          data: {
            username,
            password
          },
          header: {
            'Content-Type': 'application/json'
          },
          success: resolve,
          fail: reject
        });
      });

      if ((loginResponse.statusCode < 200 || loginResponse.statusCode >= 300) || !loginResponse.data.accessToken) {
        throw new Error(loginResponse.data?.error || loginResponse.data?.message || '登录失败');
      }

      const targetAccessToken = loginResponse.data.accessToken;
      console.log('登录成功,获取到accessToken');

      // 第二步: 获取最新的微信授权码
      console.log('获取最新的微信授权码...');
      const weChatCode = await this.getWeChatCode();

      // 第三步: 调用账号绑定接口
      console.log('开始绑定微信账号...');
      const bindUrl = `${API_CONFIG.userserviceUrl}/api/wechat/users/account/merging?targetAccessToken=${targetAccessToken}&weChatCode=${weChatCode}`;

      const bindResponse = await request({
        url: bindUrl,
        method: 'POST',
        needAuth: false
      });

      if (!bindResponse.accessToken) {
        throw new Error('绑定失败: 未返回有效的accessToken');
      }

      // 保存最终的accessToken
      wx.setStorageSync('accessToken', bindResponse.accessToken);
      console.log('绑定成功,保存新的accessToken');

      // 保存用户信息
      if (bindResponse.userId) {
        wx.setStorageSync('userId', bindResponse.userId);
      }

      wx.showToast({
        title: '绑定成功',
        icon: 'success'
      });

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (error) {
      console.error('用户名登录或绑定失败:', error);
      this.setData({
        usernameError: error.message || '登录或绑定失败,请重试'
      });
    } finally {
      this.setData({
        usernameLoading: false
      });
    }
  },

  // ========== 邮箱登录相关 ==========
  onEmailInput(e) {
    const email = e.detail.value;
    const isValid = this.validateEmail(email);
    this.setData({
      'emailForm.email': email,
      isEmailValid: isValid
    });
  },

  onCodeInput(e) {
    this.setData({
      'emailForm.code': e.detail.value
    });
  },

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  async sendVerificationCode() {
    const { email } = this.data.emailForm;

    if (!this.validateEmail(email)) {
      this.setData({
        emailError: '请输入有效的邮箱地址'
      });
      return;
    }

    this.setData({
      emailError: ''
    });

    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${API_CONFIG.userserviceUrl}/api/users/login/email/send-code`,
          method: 'POST',
          data: { email },
          header: {
            'Content-Type': 'application/json'
          },
          success: resolve,
          fail: reject
        });
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(response.data?.error || response.data?.message || '发送失败');
      }

      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      });

      // 开始倒计时
      this.startCountdown();

    } catch (error) {
      console.error('发送验证码失败:', error);
      this.setData({
        emailError: error.message || '发送验证码失败'
      });
    }
  },

  startCountdown() {
    let countdown = 60;
    this.setData({ countdown });

    const timer = setInterval(() => {
      countdown--;
      this.setData({ countdown });

      if (countdown <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  },

  async handleEmailLogin(e) {
    const { email, code } = this.data.emailForm;

    if (!email || !code) {
      this.setData({
        emailError: '请输入邮箱和验证码'
      });
      return;
    }

    if (!this.validateEmail(email)) {
      this.setData({
        emailError: '请输入有效的邮箱地址'
      });
      return;
    }

    this.setData({
      emailLoading: true,
      emailError: ''
    });

    try {
      // 第一步: 调用邮箱登录接口
      console.log('开始邮箱登录...');
      const loginResponse = await new Promise((resolve, reject) => {
        wx.request({
          url: `${API_CONFIG.userserviceUrl}/api/users/login/email`,
          method: 'POST',
          data: {
            email,
            verificationCode: code
          },
          header: {
            'Content-Type': 'application/json'
          },
          success: resolve,
          fail: reject
        });
      });

      if ((loginResponse.statusCode < 200 || loginResponse.statusCode >= 300) || !loginResponse.data.accessToken) {
        throw new Error(loginResponse.data?.error || loginResponse.data?.message || '登录失败');
      }

      const targetAccessToken = loginResponse.data.accessToken;
      console.log('登录成功,获取到accessToken');

      // 第二步: 获取最新的微信授权码
      console.log('获取最新的微信授权码...');
      const weChatCode = await this.getWeChatCode();

      // 第三步: 调用账号绑定接口
      console.log('开始绑定微信账号...');
      const bindUrl = `${API_CONFIG.userserviceUrl}/api/wechat/users/account/merging?targetAccessToken=${targetAccessToken}&weChatCode=${weChatCode}`;

      const bindResponse = await request({
        url: bindUrl,
        method: 'POST',
        needAuth: false
      });

      if (!bindResponse.accessToken) {
        throw new Error('绑定失败: 未返回有效的accessToken');
      }

      // 保存最终的accessToken
      wx.setStorageSync('accessToken', bindResponse.accessToken);
      console.log('绑定成功,保存新的accessToken');

      // 保存用户信息
      if (bindResponse.userId) {
        wx.setStorageSync('userId', bindResponse.userId);
      }

      wx.showToast({
        title: '绑定成功',
        icon: 'success'
      });

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (error) {
      console.error('邮箱登录或绑定失败:', error);
      this.setData({
        emailError: error.message || '登录或绑定失败,请重试'
      });
    } finally {
      this.setData({
        emailLoading: false
      });
    }
  }
});










