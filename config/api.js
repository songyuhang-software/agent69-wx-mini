// config/api.js
const API_CONFIG = {
  userserviceUrl: 'https://userservice.preview.huawei-zeabur.cn',

  // API 端点
  endpoints: {
    // 用户相关
    userDetail: '/api/users/detail',
    wechatRegister: '/api/wechat/users/register',

    // 身份管理
    personas: '/api/personas',
    setDefaultPersona: '/api/personas/set-default'
  },

  // 又拍云存储配置
  storage: {
    uploadEndpoint: 'https://v0.api.upyun.com/agent69-image',
    bucket: 'agent69-image',
    username: 'songyuhang',
    password: 'DCbg9f9MT2NrT9TlBIWKxNAT3dhyAX32',
    path: 'avatars',
    domain: 'http://agent69-image.test.upcdn.net/',
    maxFileSize: 50 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  }
};

module.exports = API_CONFIG;