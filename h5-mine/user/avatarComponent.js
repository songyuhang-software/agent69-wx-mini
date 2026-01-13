/**
 * 头像上传UI组件
 * 提供可视化的头像上传界面
 */

import { uploadAvatar, compressImage, getSafeAvatarUrl } from './avatarUpload.js';
import { showToast } from '../utils/toast.js';
import { STORAGE_CONFIG } from './avatarUpload.js';
import { RandomAvatarManager } from './randomAvatar.js';
import { API_FILE_URL } from '../common.js';

/**
 * 创建头像上传组件
 * @param {Object} options - 配置选项
 * @param {string} options.containerId - 容器元素的ID
 * @param {string} options.currentAvatarUrl - 当前头像URL
 * @param {string} options.size - 头像大小: 'small' | 'medium' | 'large'
 * @param {Function} options.onAvatarChange - 头像变更回调，参数为新头像URL
 * @param {Object} options.uploadConfig - 上传配置
 * @param {boolean} options.enableRandomAvatar - 是否启用随机头像功能，默认false
 * @param {boolean} options.deleteOnRemove - 移除头像时是否调用删除接口，默认true
 * @returns {Object} 组件实例
 */
export function createAvatarUpload({
    containerId,
    currentAvatarUrl = null,
    size = 'medium',
    onAvatarChange,
    uploadConfig = {},
    enableRandomAvatar = false,
    deleteOnRemove = true
} = {}) {

    // 获取容器元素
    const container = document.getElementById(containerId);
    if (!container) {
        throw new Error(`找不到ID为 ${containerId} 的容器元素`);
    }

    // 组件状态
    const state = {
        isUploading: false,
        isSelecting: false, // 新增：标记是否处于选择图片阶段
        currentAvatarUrl: getSafeAvatarUrl(currentAvatarUrl),
        size: size,
        randomAvatarManager: enableRandomAvatar ? new RandomAvatarManager() : null,
        currentAvatarId: null // 用于存储当前随机头像的ID
    };

    // 创建组件DOM结构
    function createComponentDOM() {
        const sizeClass = `avatar-${size}`;
        const hasAvatar = state.currentAvatarUrl;

        const componentHTML = `
            <div class="avatar-upload-component ${sizeClass}">
                <div class="avatar-upload-container">
                    <div class="avatar-preview ${hasAvatar ? 'has-avatar' : 'no-avatar'}" id="avatarPreview_${containerId}">
                        ${hasAvatar ?
                            `<img src="${state.currentAvatarUrl}" alt="头像" class="avatar-image">` :
                            `<div class="avatar-placeholder">
                                <svg class="avatar-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                <span class="avatar-text">点击上传</span>
                            </div>`
                        }
                    </div>
                    <div class="avatar-upload-actions">
                        ${enableRandomAvatar && !hasAvatar ? `
                            <button type="button" class="avatar-random-btn" id="randomBtn_${containerId}">
                                <svg class="random-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                                </svg>
                                <span class="random-text">随机头像</span>
                            </button>
                        ` : ''}
                        <button type="button" class="avatar-upload-btn" id="uploadBtn_${containerId}">
                            <svg class="upload-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            <span class="upload-text">${state.currentAvatarUrl ? '更换头像' : '上传头像'}</span>
                        </button>
                        ${state.currentAvatarUrl ? `
                            <button type="button" class="avatar-remove-btn" id="removeBtn_${containerId}">
                                <svg class="remove-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                </svg>
                                <span class="remove-text">移除</span>
                            </button>
                        ` : ''}
                    </div>
                    ${enableRandomAvatar && state.currentAvatarUrl && state.currentAvatarId ? `
                        <div class="avatar-change-hint">
                            <button type="button" class="avatar-change-btn" id="changeBtn_${containerId}">
                                换一个？
                            </button>
                        </div>
                    ` : ''}
                    <div class="avatar-upload-progress" id="uploadProgress_${containerId}" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill_${containerId}"></div>
                        </div>
                        <div class="progress-text" id="progressText_${containerId}">上传中...</div>
                        <button type="button" class="avatar-cancel-btn" id="cancelBtn_${containerId}" style="display: none;">
                            <svg class="cancel-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                            <span class="cancel-text">取消选择</span>
                        </button>
                    </div>
                </div>
                <div class="avatar-help-text">
                    <small>支持 JPG、PNG、WebP 格式，文件大小不超过 5MB</small>
                </div>
            </div>
        `;

        container.innerHTML = componentHTML;
    }

    // 绑定事件
    function bindEvents() {
        const uploadBtn = document.getElementById(`uploadBtn_${containerId}`);
        const removeBtn = document.getElementById(`removeBtn_${containerId}`);
        const randomBtn = document.getElementById(`randomBtn_${containerId}`);
        const changeBtn = document.getElementById(`changeBtn_${containerId}`);
        const cancelBtn = document.getElementById(`cancelBtn_${containerId}`);

        if (uploadBtn) {
            uploadBtn.addEventListener('click', handleAvatarUpload);
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', handleAvatarRemove);
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', handleRandomAvatar);
        }

        if (changeBtn) {
            changeBtn.addEventListener('click', handleRandomAvatar);
        }

        // 新增：绑定取消按钮事件
        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancelSelection);
        }

        // 点击预览区域也可以上传（仅在没有头像时）
        const avatarPreview = document.getElementById(`avatarPreview_${containerId}`);
        if (avatarPreview && !state.currentAvatarUrl) {
            avatarPreview.addEventListener('click', handleAvatarUpload);
        }
    }

    // 处理头像上传
    async function handleAvatarUpload() {
        if (state.isUploading) return;

        try {
            state.isUploading = true;
            state.isSelecting = false; // 重置选择状态
            showUploadProgress(0, '准备上传...');

            await uploadAvatar({
                onStart: () => {
                    state.isSelecting = true; // 开始选择图片阶段
                    showUploadProgress(10, '正在选择图片...', true); // 显示取消按钮
                },
                onProgress: (progress) => {
                    if (progress > 30) {
                        // 上传进度超过30%，说明已经选择了图片，结束选择阶段
                        state.isSelecting = false;
                    }
                    showUploadProgress(progress, `上传中... ${Math.round(progress)}%`, false); // 隐藏取消按钮
                },
                onSuccess: (imageUrl) => {
                    showUploadProgress(100, '上传成功!');

                    // 更新头像显示
                    updateAvatarDisplay(imageUrl);

                    // 隐藏进度条
                    setTimeout(() => {
                        hideUploadProgress();
                    }, 1000);

                    // 回调通知
                    onAvatarChange && onAvatarChange(imageUrl);

                    showToast('头像上传成功!', 'success');
                },
                onError: (error) => {
                    hideUploadProgress();

                    // 检查是否为用户取消的错误
                    if (error.includes('取消') || error.includes('超时')) {
                        console.log('用户取消了头像选择');
                        // 用户取消不显示错误提示
                    } else {
                        showToast(error, 'error');
                        console.error('头像上传失败:', error);
                    }
                },
                sourceType: uploadConfig.sourceType || 'auto'
            });

        } catch (error) {
            hideUploadProgress();

            // 检查是否为用户取消的错误
            if (error.message.includes('取消') || error.message.includes('超时')) {
                console.log('用户取消了头像选择');
                // 用户取消不显示错误提示
            } else {
                showToast('头像上传失败: ' + error.message, 'error');
                console.error('头像上传失败:', error);
            }
        } finally {
            // 确保状态重置
            state.isUploading = false;
            state.isSelecting = false;
        }
    }

    // 处理取消选择
    function handleCancelSelection() {
        // 只有在选择阶段才能取消
        if (!state.isSelecting) {
            return;
        }

        // 重置状态
        state.isUploading = false;
        state.isSelecting = false;

        // 隐藏进度条
        hideUploadProgress();

        // 显示取消提示
        showToast('已取消选择', 'info');
        console.log('用户手动取消了头像选择');
    }

    // 处理头像移除
    async function handleAvatarRemove() {
        // 如果配置了需要删除且当前有头像URL，调用删除接口
        if (deleteOnRemove && state.currentAvatarUrl) {
            try {
                // 提取文件名（从URL中获取）
                let fileName = state.currentAvatarUrl;

                // 如果是完整URL，提取路径部分
                if (fileName.includes(STORAGE_CONFIG.domain)) {
                    fileName = fileName.replace(STORAGE_CONFIG.domain, '');
                }

                // 如果是相对路径，去掉开头的斜杠
                if (fileName.startsWith('/')) {
                    fileName = fileName.substring(1);
                }

                // 调用删除接口
                const deleteUrl = `${API_FILE_URL}/api/files?fileName=${encodeURIComponent(fileName)}`;

                const response = await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.warn('删除文件失败:', response.status, response.statusText);
                    // 即使删除失败，也继续移除UI上的头像显示
                }
            } catch (error) {
                console.error('删除文件时出错:', error);
                // 即使出错，也继续移除UI上的头像显示
            }
        }

        // 清除头像显示，使用null表示无头像
        updateAvatarDisplay(null);

        // 回调通知，传递null表示头像已移除
        onAvatarChange && onAvatarChange(null);

        showToast('头像已移除', 'info');
    }

    // 处理随机头像
    async function handleRandomAvatar() {
        if (state.isUploading || !state.randomAvatarManager) return;

        try {
            state.isUploading = true;
            state.isSelecting = false; // 随机头像不需要选择阶段
            showUploadProgress(0, '正在获取随机头像...', false); // 不显示取消按钮

            const result = await state.randomAvatarManager.getNewAvatar();

            if (result.success && result.avatarUrl) {
                showUploadProgress(100, '获取成功!');

                // 更新头像显示
                state.currentAvatarId = result.avatarId;
                updateAvatarDisplay(result.avatarUrl, true);

                // 隐藏进度条
                setTimeout(() => {
                    hideUploadProgress();
                }, 500);

                // 回调通知
                onAvatarChange && onAvatarChange(result.avatarUrl);

                showToast('随机头像获取成功!', 'success');
            } else {
                hideUploadProgress();

                // 检查是否为用户取消的错误
                if (result.message && (result.message.includes('取消') || result.message.includes('超时'))) {
                    console.log('用户取消了随机头像选择');
                } else {
                    showToast(result.message || '获取随机头像失败', 'error');
                }
            }

        } catch (error) {
            hideUploadProgress();

            // 检查是否为用户取消的错误
            if (error.message.includes('取消') || error.message.includes('超时')) {
                console.log('用户取消了随机头像选择');
            } else {
                showToast('获取随机头像失败: ' + error.message, 'error');
            }
        } finally {
            // 确保状态重置
            state.isUploading = false;
            state.isSelecting = false;
        }
    }

    // 更新头像显示
    function updateAvatarDisplay(avatarUrl, isRandomAvatar = false) {
        const avatarPreview = document.getElementById(`avatarPreview_${containerId}`);
        if (!avatarPreview) return;

        // 安全处理头像URL，确保null或空字符串都被正确处理
        const safeAvatarUrl = getSafeAvatarUrl(avatarUrl);

        // 如果不是随机头像，清除avatarId
        if (!isRandomAvatar) {
            state.currentAvatarId = null;
        }

        // 如果是完整URL，直接移除域名提取相对路径
        let relativePath = safeAvatarUrl;
        if (safeAvatarUrl && safeAvatarUrl.includes(STORAGE_CONFIG.domain)) {
            // 直接移除域名部分，提取路径
            relativePath = safeAvatarUrl.replace(STORAGE_CONFIG.domain, '');
        }

        state.currentAvatarUrl = relativePath;

        if (safeAvatarUrl) {
            // 有头像
            avatarPreview.className = 'avatar-preview has-avatar';
            // 显示完整URL给用户，如果是随机头像直接使用返回的URL
            const fullImageUrl = isRandomAvatar ? safeAvatarUrl :
                (relativePath ? `${STORAGE_CONFIG.domain}${relativePath}` : null);
            avatarPreview.innerHTML = `
                <img src="${fullImageUrl}" alt="头像" class="avatar-image">
            `;

            // 移除点击上传的事件监听器
            const avatarPreviewElement = document.getElementById(`avatarPreview_${containerId}`);
            if (avatarPreviewElement) {
                // 创建新元素替换旧元素以移除所有事件监听器
                const newAvatarPreview = avatarPreviewElement.cloneNode(true);
                avatarPreviewElement.parentNode.replaceChild(newAvatarPreview, avatarPreviewElement);
            }

            // 更新按钮文本：如果是随机头像，显示"手动上传"；否则显示"更换头像"
            const uploadBtn = document.getElementById(`uploadBtn_${containerId}`);
            if (uploadBtn) {
                const uploadText = uploadBtn.querySelector('.upload-text');
                if (uploadText) {
                    uploadText.textContent = isRandomAvatar ? '手动上传' : '更换头像';
                }
            }

            // 移除随机头像按钮（因为已经选择了头像）
            const randomBtn = document.getElementById(`randomBtn_${containerId}`);
            if (randomBtn) {
                randomBtn.remove();
            }

            // 添加移除按钮
            const actionsContainer = container.querySelector('.avatar-upload-actions');
            if (actionsContainer && !document.getElementById(`removeBtn_${containerId}`)) {
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'avatar-remove-btn';
                removeBtn.id = `removeBtn_${containerId}`;
                removeBtn.innerHTML = `
                    <svg class="remove-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                    <span class="remove-text">移除</span>
                `;
                removeBtn.addEventListener('click', handleAvatarRemove);
                actionsContainer.appendChild(removeBtn);
            }

            // 添加或更新"换一个？"按钮（仅在启用随机头像且当前是随机头像时）
            if (enableRandomAvatar && isRandomAvatar && state.currentAvatarId) {
                let changeHint = container.querySelector('.avatar-change-hint');
                if (!changeHint) {
                    changeHint = document.createElement('div');
                    changeHint.className = 'avatar-change-hint';
                    changeHint.innerHTML = `
                        <button type="button" class="avatar-change-btn" id="changeBtn_${containerId}">
                            换一个？
                        </button>
                    `;
                    const uploadContainer = container.querySelector('.avatar-upload-container');
                    const progressContainer = document.getElementById(`uploadProgress_${containerId}`);
                    uploadContainer.insertBefore(changeHint, progressContainer);

                    // 绑定事件
                    const changeBtn = document.getElementById(`changeBtn_${containerId}`);
                    if (changeBtn) {
                        changeBtn.addEventListener('click', handleRandomAvatar);
                    }
                }
            } else {
                // 移除"换一个？"按钮
                const changeHint = container.querySelector('.avatar-change-hint');
                if (changeHint) {
                    changeHint.remove();
                }
            }

        } else {
            // 没有头像
            avatarPreview.className = 'avatar-preview no-avatar';
            avatarPreview.innerHTML = `
                <div class="avatar-placeholder">
                    <svg class="avatar-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <span class="avatar-text">点击上传</span>
                </div>
            `;

            // 重新绑定点击上传事件
            const avatarPreviewElement = document.getElementById(`avatarPreview_${containerId}`);
            if (avatarPreviewElement) {
                // 创建新元素替换旧元素以移除所有旧的事件监听器
                const newAvatarPreview = avatarPreviewElement.cloneNode(true);
                avatarPreviewElement.parentNode.replaceChild(newAvatarPreview, avatarPreviewElement);
                // 绑定新的点击事件
                newAvatarPreview.addEventListener('click', handleAvatarUpload);
            }

            // 更新按钮文本
            const uploadBtn = document.getElementById(`uploadBtn_${containerId}`);
            if (uploadBtn) {
                const uploadText = uploadBtn.querySelector('.upload-text');
                if (uploadText) {
                    uploadText.textContent = '上传头像';
                }
            }

            // 移除移除按钮
            const removeBtn = document.getElementById(`removeBtn_${containerId}`);
            if (removeBtn) {
                removeBtn.remove();
            }

            // 移除"换一个？"按钮
            const changeHint = container.querySelector('.avatar-change-hint');
            if (changeHint) {
                changeHint.remove();
            }

            // 恢复随机头像按钮（如果启用了随机头像功能）
            if (enableRandomAvatar) {
                const actionsContainer = container.querySelector('.avatar-upload-actions');
                if (actionsContainer && !document.getElementById(`randomBtn_${containerId}`)) {
                    const randomBtn = document.createElement('button');
                    randomBtn.type = 'button';
                    randomBtn.className = 'avatar-random-btn';
                    randomBtn.id = `randomBtn_${containerId}`;
                    randomBtn.innerHTML = `
                        <svg class="random-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                        </svg>
                        <span class="random-text">随机头像</span>
                    `;
                    randomBtn.addEventListener('click', handleRandomAvatar);
                    // 将随机头像按钮插入到上传按钮之前
                    const uploadBtn = document.getElementById(`uploadBtn_${containerId}`);
                    actionsContainer.insertBefore(randomBtn, uploadBtn);
                }
            }
        }
    }

    // 显示上传进度
    function showUploadProgress(progress, text = '上传中...', showCancelBtn = false) {
        const progressContainer = document.getElementById(`uploadProgress_${containerId}`);
        const progressFill = document.getElementById(`progressFill_${containerId}`);
        const progressText = document.getElementById(`progressText_${containerId}`);
        const cancelBtn = document.getElementById(`cancelBtn_${containerId}`);

        if (progressContainer && progressFill && progressText) {
            progressContainer.style.display = 'block';
            progressFill.style.width = `${progress}%`;
            progressText.textContent = text;
        }

        // 控制取消按钮的显示
        if (cancelBtn) {
            cancelBtn.style.display = showCancelBtn ? 'flex' : 'none';
        }

        // 禁用上传按钮
        const uploadBtn = document.getElementById(`uploadBtn_${containerId}`);
        const removeBtn = document.getElementById(`removeBtn_${containerId}`);
        if (uploadBtn) uploadBtn.disabled = true;
        if (removeBtn) removeBtn.disabled = true;
    }

    // 隐藏上传进度
    function hideUploadProgress() {
        const progressContainer = document.getElementById(`uploadProgress_${containerId}`);
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }

        // 重置选择状态
        state.isSelecting = false;

        // 启用上传按钮
        const uploadBtn = document.getElementById(`uploadBtn_${containerId}`);
        const removeBtn = document.getElementById(`removeBtn_${containerId}`);
        if (uploadBtn) uploadBtn.disabled = false;
        if (removeBtn) removeBtn.disabled = false;
    }

    // 初始化组件
    function init() {
        createComponentDOM();
        bindEvents();
    }

    // 公共方法
    const component = {
        // 更新头像
        updateAvatar: (avatarUrl) => {
            updateAvatarDisplay(avatarUrl);
        },

        // 获取当前头像URL
        getCurrentAvatar: () => {
            return state.currentAvatarUrl;
        },

        // 设置上传状态
        setUploading: (isUploading) => {
            state.isUploading = isUploading;
        },

        // 销毁组件
        destroy: () => {
            const uploadBtn = document.getElementById(`uploadBtn_${containerId}`);
            const removeBtn = document.getElementById(`removeBtn_${containerId}`);

            if (uploadBtn) uploadBtn.removeEventListener('click', handleAvatarUpload);
            if (removeBtn) removeBtn.removeEventListener('click', handleAvatarRemove);

            container.innerHTML = '';
        }
    };

    // 初始化
    init();

    return component;
}

/**
 * 注入头像上传组件样式
 */
export function injectAvatarUploadStyles() {
    // 检查样式是否已注入
    if (document.getElementById('avatarUploadStyles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'avatarUploadStyles';
    style.textContent = `
        /* 头像上传组件样式 */
        .avatar-upload-component {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .avatar-upload-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        }

        /* 不同尺寸的头像 */
        .avatar-small .avatar-preview {
            width: 60px;
            height: 60px;
        }

        .avatar-medium .avatar-preview {
            width: 80px;
            height: 80px;
        }

        .avatar-large .avatar-preview {
            width: 120px;
            height: 120px;
        }

        .avatar-preview {
            border-radius: 50%;
            overflow: hidden;
            border: 2px dashed #cbd5e0;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: #f7fafc;
        }

        .avatar-preview:hover {
            border-color: #667eea;
            border-style: solid;
        }

        .avatar-preview.has-avatar {
            border: none;
            cursor: pointer;
        }

        .avatar-preview.has-avatar:hover {
            transform: scale(1.05);
        }

        .avatar-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .avatar-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: #a0aec0;
            text-align: center;
        }

        .avatar-icon {
            width: 24px;
            height: 24px;
        }

        .avatar-small .avatar-icon {
            width: 20px;
            height: 20px;
        }

        .avatar-small .avatar-text {
            font-size: 10px;
        }

        .avatar-medium .avatar-text {
            font-size: 12px;
        }

        .avatar-large .avatar-text {
            font-size: 14px;
        }

        .avatar-text {
            font-weight: 500;
            line-height: 1;
        }

        /* 上传操作区域 */
        .avatar-upload-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .avatar-upload-btn,
        .avatar-remove-btn,
        .avatar-random-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #667eea;
            color: white;
        }

        .avatar-upload-btn:hover:not(:disabled),
        .avatar-random-btn:hover:not(:disabled) {
            background: #5a67d8;
            transform: translateY(-1px);
        }

        .avatar-random-btn {
            background: #48bb78;
        }

        .avatar-random-btn:hover:not(:disabled) {
            background: #38a169;
        }

        .avatar-remove-btn {
            background: #e53e3e;
        }

        .avatar-remove-btn:hover:not(:disabled) {
            background: #c53030;
        }

        .avatar-upload-btn:disabled,
        .avatar-remove-btn:disabled,
        .avatar-random-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .upload-icon,
        .remove-icon,
        .random-icon {
            width: 14px;
            height: 14px;
        }

        .upload-text,
        .remove-text,
        .random-text {
            font-size: 12px;
            font-weight: 500;
        }

        /* "换一个？"按钮样式 */
        .avatar-change-hint {
            margin-top: 8px;
        }

        .avatar-change-btn {
            background: transparent;
            border: none;
            color: #667eea;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.3s ease;
        }

        .avatar-change-btn:hover {
            background: rgba(102, 126, 234, 0.1);
            text-decoration: underline;
        }

        /* 进度条 */
        .avatar-upload-progress {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transition: width 0.3s ease;
            border-radius: 3px;
        }

        .progress-text {
            font-size: 12px;
            color: #667eea;
            font-weight: 500;
        }

        /* 取消按钮样式 */
        .avatar-cancel-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            background: white;
            color: #718096;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 4px;
        }

        .avatar-cancel-btn:hover {
            background: #f7fafc;
            border-color: #cbd5e0;
            color: #4a5568;
        }

        .cancel-icon {
            width: 12px;
            height: 12px;
        }

        .cancel-text {
            font-size: 12px;
            font-weight: 500;
        }

        /* 帮助文本 */
        .avatar-help-text {
            text-align: center;
        }

        .avatar-help-text small {
            color: #a0aec0;
            font-size: 11px;
            line-height: 1.4;
        }

        /* 响应式设计 */
        @media (max-width: 480px) {
            .avatar-upload-actions {
                flex-direction: column;
                gap: 8px;
                width: 100%;
            }

            .avatar-upload-btn,
            .avatar-remove-btn,
            .avatar-random-btn {
                width: 100%;
                justify-content: center;
                padding: 10px 16px;
            }
        }
    `;

    document.head.appendChild(style);
}

// 自动注入样式
injectAvatarUploadStyles();






























