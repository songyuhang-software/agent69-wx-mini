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
    hasUnsavedChanges: false, // 是否有未保存的修改
    nameCursorSpacing: 20, // 昵称输入框光标与键盘的距离
    bioCursorSpacingBase: 70, // 个人简介输入框光标与键盘的基础距离（配置值）
    bioCursorSpacing: 70, // 个人简介输入框光标与键盘的距离（动态调整，初始化时设置）
    safeAreaBottom: 0 // 底部安全区域
  },

  onLoad(options) {
    // 从页面参数中获取模式和数据
    const mode = options.mode || 'add';

    this.setData({
      mode,
      bioCursorSpacing: this.data.bioCursorSpacingBase // 初始化为基础距离
    });

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

    // 获取底部安全区域信息
    this.getSafeAreaInfo();
  },

  /**
   * 获取底部安全区域信息
   */
  getSafeAreaInfo() {
    const systemInfo = wx.getSystemInfoSync();
    const safeArea = systemInfo.safeArea || {};
    const safeAreaBottom = systemInfo.screenHeight - (safeArea.bottom || systemInfo.screenHeight);

    console.log('底部安全区域:', {
      safeAreaBottom,
      nameCursorSpacing: this.data.nameCursorSpacing,
      bioCursorSpacing: this.data.bioCursorSpacing
    });

    this.setData({
      safeAreaBottom
    });
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
    const value = e.detail.value;
    const cursor = e.detail.cursor; // 当前光标位置

    console.log('onBioInput 触发:', {
      valueLength: value.length,
      cursor,
      currentCursorSpacing: this.data.bioCursorSpacing
    });

    this.setData({
      'formData.bio': value,
      'errors.bio': ''
    }, () => {
      this.checkUnsavedChanges();
    });
  },

  // 聚焦时触发，用于初始化光标距离
  onBioFocus(e) {
    console.log('onBioFocus 触发:', e.detail);
    // 聚焦时根据当前内容计算行数
    const text = this.data.formData.bio;
    if (text) {
      // 简单估算：每40个字符约为一行（可根据实际调整）
      const estimatedLines = Math.max(1, Math.ceil(text.length / 40) + (text.match(/\n/g) || []).length);
      this.updateCursorSpacing(estimatedLines);
    }
  },

  // 监听个人简介行数变化，动态调整光标距离（这是最可靠的方式）
  onBioLineChange(e) {
    const lineCount = e.detail.lineCount || 1;
    const height = e.detail.height || 0;

    console.log('onBioLineChange 触发:', {
      lineCount,
      height,
      oldCursorSpacing: this.data.bioCursorSpacing
    });

    this.updateCursorSpacing(lineCount);
  },

  // 统一更新光标距离的方法
  updateCursorSpacing(lineCount) {
    const baseCursorSpacing = this.data.bioCursorSpacingBase;
    const lineHeight = 20; // 每行增加的距离
    const maxCursorSpacing = 200; // 最大距离限制

    const newCursorSpacing = Math.min(
      baseCursorSpacing + (lineCount - 1) * lineHeight,
      maxCursorSpacing
    );

    // 只有当值真正变化时才更新，避免不必要的 setData
    if (this.data.bioCursorSpacing !== newCursorSpacing) {
      console.log('更新光标距离:', {
        lineCount,
        baseCursorSpacing,
        oldCursorSpacing: this.data.bioCursorSpacing,
        newCursorSpacing
      });

      this.setData({
        bioCursorSpacing: newCursorSpacing
      });
    }
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