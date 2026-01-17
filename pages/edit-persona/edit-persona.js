const { request } = require('../../utils/request.js');
const API_CONFIG = require('../../config/api.js');
const { uploadAvatar } = require('../../utils/avatarUpload.js');

Page({
  data: {
    mode: 'add', // 'add' 或 'edit'
    personaId: null,
    formData: {
      name: '',
      bio: '',
      avatarUrl: ''
    },
    errors: {
      name: '',
      bio: ''
    },
    isSubmitting: false,
    isRandomAvatar: false,
    isCurrent: false, // 是否是当前身份
    originalFormData: null, // 保存原始数据用于对比
    hasUnsavedChanges: false // 是否有未保存的修改
  },

  onLoad(options) {
    // 从页面参数中获取模式和数据
    const mode = options.mode || 'add';

    this.setData({ mode });

    if (mode === 'edit') {
      // 编辑模式，从参数中获取身份数据
      const personaId = options.personaId;
      const name = options.name || '';
      const bio = options.bio || '';
      const avatarUrl = options.avatarUrl || '';
      const isCurrent = options.isCurrent === 'true';

      const formData = {
        name: decodeURIComponent(name),
        bio: decodeURIComponent(bio),
        avatarUrl: decodeURIComponent(avatarUrl)
      };

      this.setData({
        personaId,
        isCurrent,
        formData,
        originalFormData: JSON.parse(JSON.stringify(formData)) // 深拷贝原始数据
      });
    } else {
      // 新增模式，保存初始空数据
      this.setData({
        originalFormData: JSON.parse(JSON.stringify(this.data.formData))
      });
    }
  },


  // 处理导航栏返回按钮点击
  onNavigationBack() {
    this.handleBackAction();
  },

  // 统一处理返回逻辑
  handleBackAction() {
    // 检查是否有未保存的修改
    if (this.checkUnsavedChanges()) {
      wx.showModal({
        title: '提示',
        content: '您有未保存的修改，确定要离开吗？',
        confirmText: '确定离开',
        cancelText: '继续编辑',
        success: (res) => {
          if (res.confirm) {
            // 用户确认离开，直接返回
            wx.navigateBack();
          }
        }
      });
    } else {
      // 没有修改，直接返回
      wx.navigateBack();
    }
  },

  // 检查是否有未保存的修改
  checkUnsavedChanges() {
    const { formData, originalFormData } = this.data;
    if (!originalFormData) return false;

    const hasChanges =
      formData.name !== originalFormData.name ||
      formData.bio !== originalFormData.bio ||
      formData.avatarUrl !== originalFormData.avatarUrl;

    this.setData({ hasUnsavedChanges: hasChanges });
    return hasChanges;
  },

  // 输入框变化事件
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value,
      'errors.name': ''
    }, () => {
      this.checkUnsavedChanges();
    });
  },

  onBioInput(e) {
    this.setData({
      'formData.bio': e.detail.value,
      'errors.bio': ''
    }, () => {
      this.checkUnsavedChanges();
    });
  },

  // 选择头像
  async onChooseAvatar() {
    try {
      wx.showLoading({ title: '上传中...' });

      const imageUrl = await uploadAvatar({
        onProgress: (progress) => {
          wx.showLoading({ title: `上传中 ${Math.floor(progress)}%` });
        }
      });

      // 更新头像并标记为非随机头像
      this.setData({
        'formData.avatarUrl': imageUrl,
        isRandomAvatar: false
      }, () => {
        this.checkUnsavedChanges();
      });

      wx.hideLoading();
      wx.showToast({
        title: '头像上传成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('选择头像失败:', error);
      wx.hideLoading();

      // 如果用户取消选择，不显示错误提示
      if (error.message && !error.message.includes('取消')) {
        wx.showToast({
          title: error.message || '选择头像失败',
          icon: 'none'
        });
      }
    }
  },

  // 获取随机头像
  async onGetRandomAvatar() {
    try {
      wx.showLoading({ title: '获取中...' });

      const result = await request({
        url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.randomAvatar}`,
        method: 'GET',
        needAuth: true
      });

      if (result && result.avatarUrl) {
        // 更新头像并标记为随机头像
        this.setData({
          'formData.avatarUrl': result.avatarUrl,
          isRandomAvatar: true
        }, () => {
          this.checkUnsavedChanges();
        });
        wx.showToast({
          title: '头像已更新',
          icon: 'success'
        });
      }

      wx.hideLoading();
    } catch (error) {
      console.error('获取随机头像失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '获取失败',
        icon: 'none'
      });
    }
  },

  // 移除头像
  onRemoveAvatar() {
    wx.showModal({
      title: '移除头像',
      content: '确定要移除当前头像吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'formData.avatarUrl': '',
            isRandomAvatar: false
          }, () => {
            this.checkUnsavedChanges();
          });
          wx.showToast({
            title: '头像已移除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 表单验证
  validateForm() {
    const { formData } = this.data;
    const errors = {
      name: '',
      bio: ''
    };
    let isValid = true;

    // 验证昵称
    if (!formData.name || formData.name.trim() === '') {
      errors.name = '请输入昵称';
      isValid = false;
    } else if (formData.name.length > 20) {
      errors.name = '昵称不能超过20个字符';
      isValid = false;
    }

    // 验证个人简介（可选）
    if (formData.bio && formData.bio.length > 200) {
      errors.bio = '个人简介不能超过200个字符';
      isValid = false;
    }

    this.setData({ errors });
    return isValid;
  },

  // 取消
  onCancel() {
    this.handleBackAction();
  },

  // 提交表单
  async onSubmit() {
    if (this.data.isSubmitting) {
      return;
    }

    // 验证表单
    if (!this.validateForm()) {
      return;
    }

    const { mode, formData, personaId, isCurrent } = this.data;

    try {
      this.setData({ isSubmitting: true });
      wx.showLoading({ title: mode === 'add' ? '创建中...' : '更新中...' });

      let result;
      if (mode === 'add') {
        // 创建新身份
        result = await request({
          url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.personas}`,
          method: 'POST',
          data: {
            name: formData.name.trim(),
            bio: formData.bio.trim(),
            avatarUrl: formData.avatarUrl
          },
          needAuth: true
        });
      } else {
        // 更新现有身份
        result = await request({
          url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.personas}`,
          method: 'PUT',
          data: {
            personaId: personaId,
            name: formData.name.trim(),
            bio: formData.bio.trim(),
            avatarUrl: formData.avatarUrl
          },
          needAuth: true
        });

        // 如果编辑的是当前身份且返回了新的 accessToken，更新本地存储
        if (isCurrent && result.c) {
          wx.setStorageSync('accessToken', result.c);
          console.log('Access token已更新');
        }
      }

      wx.hideLoading();
      wx.showToast({
        title: mode === 'add' ? '创建成功' : '更新成功',
        icon: 'success'
      });

      // 返回上一页并刷新
      setTimeout(() => {
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.loadPersonas) {
          prevPage.loadPersonas();
        }
        wx.navigateBack();
      }, 500);

    } catch (error) {
      console.error(`${mode === 'add' ? '创建' : '更新'}身份失败:`, error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || `${mode === 'add' ? '创建' : '更新'}失败`,
        icon: 'none'
      });
      this.setData({ isSubmitting: false });
    }
  }
});