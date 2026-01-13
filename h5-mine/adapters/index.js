/**
 * 适配器统一导出入口
 * 提供便捷的导入方式
 */

// 图片选择适配器
export {
    chooseImage,
    registerImagePicker,
    detectEnvironment as detectImagePickerEnvironment,
    getEnvironmentInfo as getImagePickerInfo,
    resetImagePicker
} from './imagePicker/imagePickerAdapter.js';

export { 
    initImagePicker,
    registerMockImagePicker
} from './imagePicker/imagePickerInit.js';

// Token 刷新适配器
export {
    refreshAccessToken,
    registerTokenRefresh,
    saveRefreshToken,
    clearRefreshToken,
    detectEnvironment as detectTokenRefreshEnvironment,
    getEnvironmentInfo as getTokenRefreshInfo,
    resetTokenRefresher,
    CookieUtils
} from './tokenRefresh/tokenRefreshAdapter.js';

export {
    initTokenRefresh,
    registerMockTokenRefresh
} from './tokenRefresh/tokenRefreshInit.js';

// 未来的适配器可以在这里添加
// export { ... } from './fileUpload/fileUploadAdapter.js';
// export { ... } from './payment/paymentAdapter.js';
// export { ... } from './share/shareAdapter.js';

/**
 * 初始化所有适配器
 * 在应用启动时调用
 */
export async function initAllAdapters() {
    console.log('[Adapters] 开始初始化所有适配器...');

    // 初始化图片选择适配器
    const { initImagePicker } = await import('./imagePicker/imagePickerInit.js');
    initImagePicker();

    // 未来添加其他适配器的初始化
    // await initFileUpload();
    // await initPayment();
    // await initShare();

    console.log('[Adapters] 所有适配器初始化完成');
}

/**
 * 获取所有适配器的环境信息
 */
export async function getAllAdaptersInfo() {
    const info = {};

    // 图片选择适配器信息
    const { getEnvironmentInfo } = await import('./imagePicker/imagePickerAdapter.js');
    info.imagePicker = getEnvironmentInfo();

    // 未来添加其他适配器的信息
    // info.fileUpload = getFileUploadInfo();
    // info.payment = getPaymentInfo();

    return info;
}

