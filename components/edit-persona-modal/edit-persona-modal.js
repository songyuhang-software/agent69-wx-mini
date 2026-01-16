const { request } = require('../../utils/request.js');
const API_CONFIG = require('../../config/api.js');
const { uploadAvatar } = require('../../utils/avatarUpload.js');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    mode: {
      type: String,
      value: 'add' // 'add' 或 'edit'
    },
    personaData: {
      type: Object,
      value: null
    }
  },
  data: {
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
    isRandomAvatar: false  // 标记当前头像是否为随机头像
  },

  observers: {
    'visible, personaData': function(visible, personaData) {
      if (visible) {
        // 弹窗打开时初始化表单数据
        if (this.data.mode === 'edit' && personaData) {
          this.setData({
            formData: {
              name: personaData.name || '',
              bio: personaData.bio || '',
              avatarUrl: personaData.avatarUrl || ''
            },
            errors: {
              name: '',
              bio: ''
            },
            isRandomAvatar: false  // 编辑模式下默认不是随机头像
          });
        } else {
          // 新增模式，清空表单
          this.setData({
            formData: {
              name: '',
              bio: '',
              avatarUrl: ''
            },
            errors: {
              name: '',
              bio: ''
            },
            isRandomAvatar: false
          });
        }
      }
    }
  },

  methods: {
    onClose() {
      if (this.data.isSubmitting) {
        return;
      }
      this.triggerEvent('close');
    },

    // 输入框变化事件
    onNameInput(e) {
      this.setData({
        'formData.name': e.detail.value,
        'errors.name': ''
      });
    },

    onBioInput(e) {
      this.setData({
        'formData.bio': e.detail.value,
        'errors.bio': ''
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

    // 提交表单
    async onSubmit() {
      if (this.data.isSubmitting) {
        return;
      }

      // 验证表单
      if (!this.validateForm()) {
        return;
      }

      const { mode, formData, personaData } = this.data;

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
              personaId: personaData.personaId,
              name: formData.name.trim(),
              bio: formData.bio.trim(),
              avatarUrl: formData.avatarUrl
            },
            needAuth: true
          });

          // 如果编辑的是当前身份且返回了新的 accessToken，更新本地存储
          if (personaData.isCurrent && result.c) {
            wx.setStorageSync('accessToken', result.c);
            console.log('Access token已更新');
          }
        }

        wx.hideLoading();
        wx.showToast({
          title: mode === 'add' ? '创建成功' : '更新成功',
          icon: 'success'
        });

        // 触发成功事件
        this.triggerEvent('success', { mode });

        // 关闭弹窗
        setTimeout(() => {
          this.triggerEvent('close');
          this.setData({ isSubmitting: false });
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
  }
})







