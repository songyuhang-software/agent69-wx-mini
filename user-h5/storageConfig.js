/**
 * 又拍云存储服务配置
 * 包含敏感信息，建议在生产环境中通过环境变量或安全的配置管理
 */

// 头像上传存储服务配置
const AVATAR_STORAGE_CONFIG = {
    // 又拍云表单API端点
    uploadEndpoint: 'http://v0.api.upyun.com/agent69-image',
    bucket: 'agent69-image',
    username: 'songyuhang',
    password: 'DCbg9f9MT2NrT9TlBIWKxNAT3dhyAX32', // 操作员密码
    maxFileSize: 5 * 1024 * 1024, // 5MB
    path: '/img',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};

// 导出配置供头像上传模块使用
export { AVATAR_STORAGE_CONFIG };