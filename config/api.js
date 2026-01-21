// config/api.js
const API_CONFIG = {
  userserviceUrl: 'https://api.agent69.cn/user-service',

  // API 端点
  endpoints: {
    // 用户相关
    userDetail: '/api/users/detail',
    wechatRegister: '/api/wechat/users/register',
    deleteAccount: '/api/users/delete',

    // 邮箱相关
    emailBind: '/api/users/email/bind',
    emailUnbind: '/api/users/email/unbind',
    emailSendCode: '/api/wechat/users/register/email/send-code',
    emailVerifySendCode: '/api/users/email/verify/send-code',
    emailAssociation: '/api/wechat/users/email/bind',

    // 身份管理
    personas: '/api/personas',
    setDefaultPersona: '/api/personas/set-default',
    showBio: '/api/users/show-bio',

    // 文件相关
    randomAvatar: '/api/avatar/getRandomAvatar'
  },

  // 又拍云存储配置
  storage: {
    uploadEndpoint: 'https://v0.api.upyun.com/agent69-image',
    bucket: 'agent69-image',
    username: 'songyuhang',
    password: 'DCbg9f9MT2NrT9TlBIWKxNAT3dhyAX32',
    path: 'avatars',
    domain: 'https://file.agent69.cn/',
    maxFileSize: 50 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  }
};

module.exports = API_CONFIG;