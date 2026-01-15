// pages/mine/mine.js
const { request } = require('../../utils/request.js');
const API_CONFIG = require('../../config/api.js');

Component({
  data: {
    userDetail: {
      personaName: '',
      personaAvatarUrl: '',
      personaBio: '',
      showBio: false,
      username: '',
      email: '',
      personaId: '',
      otherPersonas: []
    },
    accountActionsExpanded: false,
    // 当前身份卡片激活状态
    currentPersonaActive: false,
    // 其他身份卡片激活状态数组
    otherPersonasActive: [],
    // 显示个人简介说明弹窗
    showBioInfoModal: false
  },

  lifetimes: {
    attached() {
      this.loadUserDetail();
    }
  },

  pageLifetimes: {
    // 页面显示时触发
    show() {
      // 当从其他页面返回时,重新加载用户详情
      this.loadUserDetail();
    }
  },

  methods: {
    // 当前身份卡片点击事件
    onCurrentPersonaTap() {
      // 添加点击时的激活状态
      this.setData({
        currentPersonaActive: true
      });

      // 400ms后移除激活状态
      setTimeout(() => {
        this.setData({
          currentPersonaActive: false
        });
      }, 400);
    },

    // 其他身份卡片点击事件
    onPersonaCardTap(e) {
      const index = e.currentTarget.dataset.index;
      const newOtherPersonasActive = [...this.data.otherPersonasActive];

      // 重置所有状态
      for (let i = 0; i < newOtherPersonasActive.length; i++) {
        newOtherPersonasActive[i] = false;
      }

      // 设置当前点击的卡片为激活状态
      if (index !== undefined && index < newOtherPersonasActive.length) {
        newOtherPersonasActive[index] = true;
      }

      this.setData({
        otherPersonasActive: newOtherPersonasActive
      });

      // 400ms后移除激活状态
      setTimeout(() => {
        const resetOtherPersonasActive = [...this.data.otherPersonasActive];
        if (index !== undefined && index < resetOtherPersonasActive.length) {
          resetOtherPersonasActive[index] = false;
        }

        this.setData({
          otherPersonasActive: resetOtherPersonasActive
        });
      }, 400);
    },
    // 加载用户详情
    async loadUserDetail() {
      try {
        wx.showLoading({ title: '加载中...' });

        // 调用用户详情 API
        const data = await request({
          url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.userDetail}`,
          method: 'GET',
          needAuth: true
        });

        // 处理返回的数据,映射到组件的数据结构
        const userDetail = {
          personaName: data.personaName || '',
          personaAvatarUrl: data.personaAvatarUrl || '',
          personaBio: data.personaBio || '',
          showBio: data.showBio || false,
          username: data.username || '',
          email: data.email || '',
          personaId: data.personaId || '',
          otherPersonas: data.otherPersonas || []
        };

        // 初始化其他身份卡片的激活状态数组
        const otherPersonasActive = new Array(userDetail.otherPersonas.length).fill(false);

        this.setData({
          userDetail,
          otherPersonasActive
        });

        wx.hideLoading();
      } catch (error) {
        console.error('加载用户详情失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      }
    },

    // 点击头像
    onAvatarTap() {
      wx.showToast({
        title: '头像点击',
        icon: 'none'
      });
      // TODO: 实现头像上传功能
    },

    // 补全账号
    onSupplementAccount() {
      wx.showToast({
        title: '补全账号功能待实现',
        icon: 'none'
      });
      // TODO: 跳转到补全账号页面或弹出弹窗
    },

    // 修改密码
    onChangePassword() {
      wx.showToast({
        title: '修改密码功能待实现',
        icon: 'none'
      });
      // TODO: 跳转到修改密码页面或弹出弹窗
    },

    // 移除了退出登录功能

    // 邮箱组件成功事件
    onEmailComponentSuccess(e) {
      const { action } = e.detail;
      console.log(`邮箱${action === 'bind' ? '绑定' : '解绑'}成功`);

      // 刷新用户详情数据
      this.loadUserDetail();
    },

    // 新增身份
    onAddPersona() {
      wx.navigateTo({
        url: '/pages/edit-persona/edit-persona?mode=add'
      });
    },

    // 编辑当前身份
    onEditCurrentPersona() {
      const { userDetail } = this.data;

      wx.navigateTo({
        url: `/pages/edit-persona/edit-persona?mode=edit&personaId=${userDetail.personaId}&name=${encodeURIComponent(userDetail.personaName || '')}&bio=${encodeURIComponent(userDetail.personaBio || '')}&avatarUrl=${encodeURIComponent(userDetail.personaAvatarUrl || '')}&isCurrent=true`
      });
    },

    // 设为默认身份
    onSetDefaultPersona(e) {
      const persona = e.currentTarget.dataset.persona;

      wx.showModal({
        title: '设置默认身份',
        content: `确定要将"${persona.name}"设为默认身份吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({ title: '设置中...' });

              // 调用设置默认身份 API
              const result = await request({
                url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.setDefaultPersona}`,
                method: 'PUT',
                data: {
                  personaId: persona.personaId
                },
                needAuth: true
              });

              // 如果返回了新的 accessToken,更新本地存储
              if (result.c) {
                wx.setStorageSync('accessToken', result.c);
                console.log('Access token已更新');
              }

              wx.hideLoading();
              wx.showToast({
                title: '设置成功',
                icon: 'success'
              });

              // 重新加载用户详情
              this.loadUserDetail();
            } catch (error) {
              console.error('设置默认身份失败:', error);
              wx.hideLoading();
              wx.showToast({
                title: error.message || '设置失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },

    // 编辑身份
    onEditPersona(e) {
      const persona = e.currentTarget.dataset.persona;

      wx.navigateTo({
        url: `/pages/edit-persona/edit-persona?mode=edit&personaId=${persona.personaId}&name=${encodeURIComponent(persona.name || '')}&bio=${encodeURIComponent(persona.bio || '')}&avatarUrl=${encodeURIComponent(persona.avatarUrl || '')}&isCurrent=false`
      });
    },

    // 删除身份
    onDeletePersona(e) {
      const persona = e.currentTarget.dataset.persona;

      wx.showModal({
        title: '删除身份',
        content: `确定要删除身份"${persona.name}"吗？此操作不可撤销。`,
        confirmText: '确认删除',
        confirmColor: '#dc3545',
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({ title: '删除中...' });

              // 调用删除身份 API
              const result = await request({
                url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.personas}`,
                method: 'DELETE',
                data: {
                  personaId: persona.personaId
                },
                needAuth: true
              });

              wx.hideLoading();
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });

              // 重新加载用户详情
              this.loadUserDetail();
            } catch (error) {
              console.error('删除身份失败:', error);
              wx.hideLoading();
              wx.showToast({
                title: error.message || '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },

    // 切换账号操作区域展开/收起
    onToggleAccountActions() {
      this.setData({
        accountActionsExpanded: !this.data.accountActionsExpanded
      });
    },

    // 注销账号
    onDeleteAccount() {
      wx.showModal({
        title: '注销账号',
        content: '注销账号将删除所有数据且不可恢复，确定要继续吗？',
        confirmText: '确认注销',
        confirmColor: '#dc3545',
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({ title: '注销中...' });

              // 调用注销账号 API
              const result = await request({
                url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.deleteAccount}`,
                method: 'DELETE',
                needAuth: true
              });

              wx.hideLoading();
              wx.showToast({
                title: '账号已注销',
                icon: 'success'
              });

              // 清除登录状态
              wx.removeStorageSync('accessToken');

              // 跳转到登录页
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/login/login'
                });
              }, 1500);
            } catch (error) {
              console.error('注销账号失败:', error);
              wx.hideLoading();
              wx.showToast({
                title: error.message || '注销失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },

    // 切换showBio开关
    async onToggleShowBio() {
      const { userDetail } = this.data;
      const newShowBio = !userDetail.showBio;

      try {
        wx.showLoading({ title: '更新中...' });

        // 调用showBio API
        const result = await request({
          url: `${API_CONFIG.userserviceUrl}${API_CONFIG.endpoints.showBio}?showBio=${newShowBio}`,
          method: 'PUT',
          needAuth: true
        });

        // 更新本地数据
        const updatedUserDetail = {
          ...userDetail,
          showBio: newShowBio
        };

        this.setData({
          userDetail: updatedUserDetail
        });

        wx.hideLoading();
        wx.showToast({
          title: newShowBio ? '已开启个人简介展示' : '已关闭个人简介展示',
          icon: 'success'
        });
      } catch (error) {
        console.error('更新showBio失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: error.message || '更新失败',
          icon: 'none'
        });
      }
    },

    // 显示个人简介说明
    onShowBioInfo() {
      this.setData({
        showBioInfoModal: true
      });
    },

    // 关闭个人简介说明
    onCloseBioInfoModal() {
      this.setData({
        showBioInfoModal: false
      });
    }
  }
})





























