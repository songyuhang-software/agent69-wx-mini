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
    // 当前身份卡片激活状态
    currentPersonaActive: false,
    // 其他身份卡片激活状态数组
    otherPersonasActive: [],
    // 显示个人简介说明弹窗
    showBioInfoModal: false,
    // 编辑身份弹窗相关
    showEditPersonaModal: false,
    editPersonaMode: 'add', // 'add' 或 'edit'
    editPersonaData: null,
    // 个人简介展开/收起状态
    bioExpanded: false, // 用户信息区域的bio
    currentBioExpanded: false, // 当前身份卡片的bio
    otherPersonasBioExpanded: {} // 其他身份bio的展开状态 {personaId: boolean}
  },

  lifetimes: {
    attached() {
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
          showBio: data.showBio === true, // 严格判断，只有明确为 true 时才为 true
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

        // 延迟检查文本溢出，决定是否显示展开按钮
        setTimeout(() => {
          this.checkAndInitBioExpansion();
        }, 100);

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
    },

    // 关联已有账号
    onBindAccount() {
      // 跳转到bind-account页面
      wx.navigateTo({
        url: '/pages/bind-account/bind-account'
      });
    },

    // 修改密码功能已移除

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
      this.setData({
        showEditPersonaModal: true,
        editPersonaMode: 'add',
        editPersonaData: null
      });
    },

    // 编辑当前身份
    onEditCurrentPersona() {
      const { userDetail } = this.data;

      this.setData({
        showEditPersonaModal: true,
        editPersonaMode: 'edit',
        editPersonaData: {
          personaId: userDetail.personaId,
          name: userDetail.personaName,
          bio: userDetail.personaBio,
          avatarUrl: userDetail.personaAvatarUrl,
          isCurrent: true
        }
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

      this.setData({
        showEditPersonaModal: true,
        editPersonaMode: 'edit',
        editPersonaData: {
          personaId: persona.personaId,
          name: persona.name,
          bio: persona.bio,
          avatarUrl: persona.avatarUrl,
          isCurrent: false
        }
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

    // 注销账号功能已移除

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
    },

    // 关闭编辑身份弹窗
    onCloseEditPersonaModal() {
      this.setData({
        showEditPersonaModal: false
      });
    },

    // 编辑身份成功回调
    onEditPersonaSuccess(e) {
      const { mode } = e.detail;
      console.log(`身份${mode === 'add' ? '创建' : '编辑'}成功`);

      // 刷新用户详情数据
      this.loadUserDetail();
    },

    // 检查并初始化个人简介展开/收起状态
    checkAndInitBioExpansion() {
      // 根据文本长度决定是否需要展开按钮
      const newUserDetail = { ...this.data.userDetail };
      const newOtherPersonasBioExpanded = { ...this.data.otherPersonasBioExpanded };

      // 检查用户信息区域的bio是否需要展开按钮（超过30个字符）
      if (this.data.userDetail.personaBio && this.data.userDetail.personaBio.length > 30) {
        newUserDetail.bioExpanded = this.data.bioExpanded;
        // 设置显示文本：收起时显示截断文本，展开时显示完整文本
        newUserDetail.bioDisplayText = this.data.bioExpanded ? 
          this.data.userDetail.personaBio : 
          this.data.userDetail.personaBio.substring(0, 30) + '...';
      } else {
        newUserDetail.bioExpanded = undefined;
        newUserDetail.bioDisplayText = this.data.userDetail.personaBio || '这个人很懒,什么都没有留下...';
      }

      // 检查当前身份卡片的bio是否需要展开按钮（超过30个字符）
      if (this.data.userDetail.personaBio && this.data.userDetail.personaBio.length > 30) {
        newUserDetail.currentBioExpanded = this.data.currentBioExpanded;
        // 设置当前身份卡片的显示文本
        newUserDetail.currentBioDisplayText = this.data.currentBioExpanded ? 
          this.data.userDetail.personaBio : 
          this.data.userDetail.personaBio.substring(0, 30) + '...';
      } else {
        newUserDetail.currentBioExpanded = undefined;
        newUserDetail.currentBioDisplayText = this.data.userDetail.personaBio || '这个人很懒,什么都没有留下...';
      }

      // 检查其他身份的bio是否需要展开按钮
      if (newUserDetail.otherPersonas && newUserDetail.otherPersonas.length > 0) {
        newUserDetail.otherPersonas = newUserDetail.otherPersonas.map(persona => {
          if (persona.bio && persona.bio.length > 30) {
            newOtherPersonasBioExpanded[persona.personaId] = 
              newOtherPersonasBioExpanded[persona.personaId] || false;
            return {
              ...persona,
              bioExpanded: newOtherPersonasBioExpanded[persona.personaId],
              bioDisplayText: newOtherPersonasBioExpanded[persona.personaId] ? 
                persona.bio : 
                persona.bio.substring(0, 30) + '...'
            };
          } else {
            return {
              ...persona,
              bioExpanded: undefined,
              bioDisplayText: persona.bio || '这个人很懒,什么都没有留下...'
            };
          }
        });
      }

      this.setData({
        userDetail: newUserDetail,
        otherPersonasBioExpanded: newOtherPersonasBioExpanded
      });
    },

    // 切换用户信息区域的bio展开/收起
    onToggleBio(e) {
      const target = e.currentTarget.dataset.target;
      let newBioExpanded, newCurrentBioExpanded;
      const newUserDetail = { ...this.data.userDetail };

      if (target === 'user') {
        newBioExpanded = !this.data.bioExpanded;
        newUserDetail.bioExpanded = newBioExpanded;
        // 更新显示文本
        newUserDetail.bioDisplayText = newBioExpanded ? 
          this.data.userDetail.personaBio : 
          this.data.userDetail.personaBio.substring(0, 30) + '...';
        this.setData({
          userDetail: newUserDetail,
          bioExpanded: newBioExpanded
        });
      } else if (target === 'currentPersona') {
        newCurrentBioExpanded = !this.data.currentBioExpanded;
        newUserDetail.currentBioExpanded = newCurrentBioExpanded;
        // 更新显示文本
        newUserDetail.currentBioDisplayText = newCurrentBioExpanded ? 
          this.data.userDetail.personaBio : 
          this.data.userDetail.personaBio.substring(0, 30) + '...';
        this.setData({
          userDetail: newUserDetail,
          currentBioExpanded: newCurrentBioExpanded
        });
      }
    },

    // 切换其他身份bio的展开/收起
    onToggleOtherBio(e) {
      const personaId = e.currentTarget.dataset.personaId;
      const newOtherPersonasBioExpanded = { ...this.data.otherPersonasBioExpanded };
      
      // 切换状态
      const newExpandedState = !newOtherPersonasBioExpanded[personaId];
      newOtherPersonasBioExpanded[personaId] = newExpandedState;
      
      // 更新userDetail中对应的otherPersonas
      const newUserDetail = { ...this.data.userDetail };
      newUserDetail.otherPersonas = newUserDetail.otherPersonas.map(persona => {
        if (persona.personaId === personaId) {
          const expandedBio = newExpandedState ? persona.bio : 
            (persona.bio.length > 30 ? persona.bio.substring(0, 30) + '...' : persona.bio);
          return {
            ...persona,
            bioExpanded: newExpandedState,
            bioDisplayText: expandedBio
          };
        }
        return persona;
      });

      this.setData({
        userDetail: newUserDetail,
        otherPersonasBioExpanded: newOtherPersonasBioExpanded
      });
    }
  }
})


















