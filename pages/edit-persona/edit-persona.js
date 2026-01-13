// pages/edit-persona/edit-persona.js
const { request } = require('../../utils/request.js');
const API_CONFIG = require('../../config/api.js');
const { uploadAvatar, getSafeAvatarUrl, RandomAvatarManager } = require('../../utils/avatarUpload.js');

Page({
  data: {
    mode: 'add', // 'add' 或 'edit'
    personaId: null,
    personaName: '',
    personaBio: '',
    personaAvatarUrl: '',
    isCurrent: false, // 是否为当前默认身份
    currentAvatarId: null, // 当前随机头像的ID
    randomAvatarManager: null // 随机头像管理器
  },

  onLoad(options) {
    // 初始化随机头像管理器
    this.randomAvatarManager = new RandomAvatarManager();

    // 从页面参数中获取模式和数据
    if (options.mode) {
      this.setData({ mode: options.mode });
    }

    if (options.mode === 'edit') {
      // 编辑模式,从参数中获取身份数据
      const personaId = options.personaId;
      const personaName = decodeURIComponent(options.name || '');
      const personaBio = decodeURIComponent(options.bio || '');
      const personaAvatarUrl = options.avatarUrl ? decodeURIComponent(options.avatarUrl) : '';
      const isCurrent = options.isCurrent === 'true';

      this.setData({
        personaId,
        personaName,
        personaBio,
        personaAvatarUrl,
        isCurrent
      });

      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: '编辑身份'
      });
    } else {
      // 新增模式
      wx.setNavigationBarTitle({
        title: '新增身份'
      });
    }
  },

  // 昵称输入
  onNameInput(e) {
    this.setData({
      personaName: e.detail.value
    });
  },

  // 简介输入
  onBioInput(e) {
    this.setData({
      personaBio: e.detail.value
    });
  },

  // 选择头像
  async onChooseAvatar() {
    try {
      // 显示加载提示
      wx.showLoading({ title: '准备上传...' });

      // 使用头像上传工具
      const imageUrl = await uploadAvatar({
        onStart: () => {
          wx.showLoading({ title: '正在选择图片...' });
        },
        onProgress: (progress) => {
          if (progress > 30) {
            wx.showLoading({ title: `上传中... ${Math.round(progress)}%` });
          }
        },
        onSuccess: (url) => {
          wx.hideLoading();
          wx.showToast({
            title: '头像上传成功',
            icon: 'success'
          });
        },
        onError: (error) => {
          wx.hideLoading();
          // 如果是用户取消，不显示错误提示
          if (!error.includes('取消')) {
            wx.showToast({
              title: error,
              icon: 'none'
            });
          }
        },
        sourceType: 'auto' // 支持相册和相机
      });

      // 更新头像URL，清除随机头像ID
      this.setData({
        personaAvatarUrl: imageUrl,
        currentAvatarId: null
      });

    } catch (error) {
      console.error('头像上传失败:', error);
      wx.hideLoading();

      // 如果是用户取消，不显示错误提示
      if (!error.message.includes('取消')) {
        wx.showToast({
          title: error.message || '头像上传失败',
          icon: 'none'
        });
      }
    }
  },

  // 移除头像
  onRemoveAvatar() {
    this.setData({
      personaAvatarUrl: '',
      currentAvatarId: null
    });
    wx.showToast({
      title: '头像已移除',
      icon: 'none'
    });
  },

  // 随机头像
  async onRandomAvatar() {
    try {
      wx.showLoading({ title: '正在获取随机头像...' });

      const result = await this.randomAvatarManager.getNewAvatar();

      wx.hideLoading();

      if (result.success && result.avatarUrl) {
        this.setData({
          personaAvatarUrl: result.avatarUrl,
          currentAvatarId: result.avatarId
        });

        wx.showToast({
          title: '随机头像获取成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '获取随机头像失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取随机头像失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '获取随机头像失败',
        icon: 'none'
      });
    }
  },

  // 保存
  async onSave() {
    const { mode, personaId, personaName, personaBio, personaAvatarUrl } = this.data;

    // 验证昵称
    if (!personaName || personaName.trim() === '') {
      wx.showToast({
        title: '请输入身份昵称',
        icon: 'none'
      });
      return;
    }

    if (personaName.length > 10) {
      wx.showToast({
        title: '昵称长度不能超过10个字符',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: mode === 'add' ? '创建中...' : '保存中...' });

      const requestData = {
        name: personaName.trim(),
        avatarUrl: getSafeAvatarUrl(personaAvatarUrl), // 使用安全处理的头像URL
        bio: personaBio.trim() || null
      };

      let response;

      if (mode === 'edit') {
        // 编辑身份
        requestData.personaId = parseInt(personaId);
        response = await request({
          url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.personas}`,
          method: 'PUT',
          data: requestData,
          needAuth: true
        });
      } else {
        // 新增身份
        response = await request({
          url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.personas}`,
          method: 'POST',
          data: requestData,
          needAuth: true
        });
      }

      wx.hideLoading();

      wx.showToast({
        title: mode === 'add' ? '创建成功' : '保存成功',
        icon: 'success'
      });

      // 延迟返回,让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('保存失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 取消
  onCancel() {
    wx.navigateBack();
  }
});






