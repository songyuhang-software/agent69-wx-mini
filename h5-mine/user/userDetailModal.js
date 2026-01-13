/**
 * 用户详情弹窗模块
 * 重构后的版本 - 使用模块化架构
 */

import { API_USERSERVICE_URL, getUserDetail, apiRequest } from '../common.js';
import modalManager from '../modal/ModalManager.js';
import { manageModalFocus } from '../modal/focusManagement.js';
import { showToast } from '../utils/toast.js';
import { showForgotPasswordModal } from './forgotPasswordModal.js';
import { showConfirmModal } from './confirmModal.js';
import { STORAGE_CONFIG } from './avatarUpload.js';

// 动态加载样式文件
function loadStyles() {
    // 使用 import.meta.url 获取当前模块的 URL
    const moduleUrl = new URL(import.meta.url);
    const modulePath = moduleUrl.pathname;

    // 计算样式文件的基础路径
    // 当前文件在 /js/user/userDetailModal.js
    // 样式文件在 /js/user/styles/
    const jsDir = modulePath.substring(0, modulePath.lastIndexOf('/'));
    const basePath = jsDir + '/styles/';

    const styles = [
        'userDetail.css',
        'persona.css',
        'email.css',
        'avatar.css',
        'account.css'
    ];

    styles.forEach(filename => {
        const href = basePath + filename;
        // 检查是否已加载(使用完整路径)
        if (!document.querySelector(`link[href*="${filename}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    });
}

// 初始化时加载样式
loadStyles();

// 显示用户详情弹窗
export function showUserDetailModal(userDetail) {
    // 创建弹窗
    const modal = document.createElement('div');
    modal.id = 'userDetailModal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content user-detail-modal">
                <div class="modal-header">
                    <h2>👤 用户详情</h2>
                    <button class="close-btn" id="closeUserDetailBtn">✕</button>
                </div>
                <div class="modal-body">
                    <!-- 用户信息区域 -->
                    <div class="user-info-section">
                        <div class="user-avatar-section">
                            <div class="user-avatar-large ${!userDetail.personaAvatarUrl ? 'default' : ''}" id="mainUserAvatar">
                                ${userDetail.personaAvatarUrl ?
                                    `<img src="${userDetail.personaAvatarUrl}" alt="头像">` :
                                    '默认'
                                }
                            </div>
                            <div class="user-basic-info">
                                <h3>${userDetail.personaName || userDetail.username}</h3>
                                <p class="username-line">
                                    <span>@${userDetail.username || '未设置'}</span>
                                    ${!userDetail.username ?
                                        `<span class="account-action-link" id="supplementAccountBtn">补全账号</span>` :
                                        `<span class="account-action-links">
                                            <span class="account-action-link" id="changePasswordBtn">修改密码</span>
                                        </span>`
                                    }
                                </p>
                            </div>
                        </div>
                        <p class="user-bio">
                            <span class="bio-text" data-full-text="${(userDetail.personaBio || '这个人很懒,什么都没有留下...').replace(/"/g, '&quot;')}">${userDetail.personaBio || '这个人很懒,什么都没有留下...'}</span>
                        </p>
                        <div class="user-footer-actions">
                            <button class="logout-link" id="logoutBtn">
                                退出登录
                            </button>
                        </div>

                    <!-- 详情信息区域 -->
                    <div class="detail-section">
                        <h3 class="section-title">账户信息</h3>
                        <div class="detail-card">
                            <div class="detail-icon">📧</div>
                            <div class="detail-content">
                                <div class="detail-label">邮箱</div>
                                <div class="detail-value">
                                    <span>${userDetail.email || '未设置'}</span>
                                    <button class="action-small-btn ${userDetail.email ? 'danger' : ''}" id="${userDetail.email ? 'unbindEmailBtn' : 'bindEmailBtn'}">
                                        ${userDetail.email ? '解绑' : '绑定'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 身份管理区域 -->
                    <div class="personas-section">
                        <div class="personas-header">
                            <h3 class="personas-title">身份管理</h3>
                            <button class="add-persona-btn" id="addPersonaBtn">
                                <span>+</span>
                                <span>新增身份</span>
                            </button>
                        </div>

                        <div class="personas-list">
                            <!-- 当前身份 -->
                            <div class="persona-card current">
                                <div class="persona-header">
                                    <div class="persona-info">
                                        <div class="persona-avatar-small ${!userDetail.personaAvatarUrl ? 'default' : ''}" id="currentPersonaAvatar">
                                            ${userDetail.personaAvatarUrl ?
                                                `<img src="${userDetail.personaAvatarUrl}" alt="头像">` :
                                                '默认'
                                            }
                                        </div>
                                        <div class="persona-details">
                                            <div class="persona-name-row">
                                                <span class="persona-name">${userDetail.personaName || '未设置昵称'}</span>
                                                <span class="current-badge">
                                                    <span class="star-icon">⭐</span>
                                                    <span>当前默认</span>
                                                </span>
                                            </div>
                                            <p class="persona-bio">
                                                <span class="bio-text" data-full-text="${(userDetail.personaBio || '这个人很懒,什么都没有留下...').replace(/"/g, '&quot;')}">${userDetail.personaBio || '这个人很懒,什么都没有留下...'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div class="persona-actions">
                                        <button class="action-icon-btn edit" title="编辑当前身份" data-action="editCurrent">
                                            ✏️
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- 其他身份 -->
                            ${userDetail.otherPersonas && userDetail.otherPersonas.length > 0 ? `
                                ${userDetail.otherPersonas.map((persona) => `
                                    <div class="persona-card" data-persona-id="${persona.personaId}">
                                        <div class="persona-header">
                                            <div class="persona-info">
                                                <div class="persona-avatar-small ${!persona.avatarUrl ? 'default' : ''}">
                                                    ${persona.avatarUrl ?
                                                        `<img src="${persona.avatarUrl}" alt="头像">` :
                                                        '默认'
                                                    }
                                                </div>
                                                <div class="persona-details">
                                                    <div class="persona-name-row">
                                                        <span class="persona-name">${persona.name}</span>
                                                    </div>
                                                    <p class="persona-bio">
                                                        <span class="bio-text" data-full-text="${(persona.bio || '这个人很懒,什么都没有留下...').replace(/"/g, '&quot;')}">${persona.bio || '这个人很懒,什么都没有留下...'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="persona-actions">
                                                <button class="action-icon-btn set-default" title="设为默认身份" data-action="setDefault">
                                                    ⭐
                                                </button>
                                                <button class="action-icon-btn edit" title="编辑" data-action="edit">
                                                    ✏️
                                                </button>
                                                <button class="action-icon-btn delete" title="删除" data-action="delete">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            ` : `
                                <div class="empty-personas">
                                    <p>暂无其他身份</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- 账号操作区域 -->
                    <div class="account-actions-section">
                        <button class="account-actions-toggle" id="accountActionsToggle">
                            <span class="toggle-text">账号与安全</span>
                            <span class="toggle-icon">▼</span>
                        </button>
                        <div class="account-actions-content" id="accountActionsContent" style="display: none;">
                            <button class="account-action-item delete-account-item" id="deleteAccountBtn">
                                <span class="action-label">注销账号</span>
                                <span class="action-arrow">›</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.appendChild(modal);

    // 使用弹窗管理器注册弹窗
    modalManager.pushModal('userDetailModal', modal, null, () => {
        // 清理焦点状态
        manageModalFocus(modal, 'hide');
        document.body.removeChild(modal);

        // 关闭弹窗后刷新左上角头像
        updateAvatarButton();
    });

    // 绑定关闭事件
    const closeBtn = document.getElementById('closeUserDetailBtn');
    const overlay = modal.querySelector('.modal-overlay');

    closeBtn.addEventListener('click', () => {
        modalManager.closeModal('userDetailModal');
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            modalManager.closeModal('userDetailModal');
        }
    });

    // 绑定身份管理事件
    bindPersonaManagementEvents(modal, userDetail);

    // 绑定邮箱管理事件
    bindEmailManagementEvents(modal, userDetail);

    // 绑定账号补全和修改密码事件
    bindAccountManagementEvents(modal, userDetail);

    // 绑定退出登录和注销账号事件
    bindAccountActionEvents(modal);

    // 初始化账号操作折叠功能
    initAccountActionsToggle(modal);

    // 初始化 bio 展开/收起功能
    initBioToggle(modal);
}

// 绑定身份管理事件
function bindPersonaManagementEvents(modal, userDetail) {
    // 新增身份按钮
    const addPersonaBtn = modal.querySelector('#addPersonaBtn');
    addPersonaBtn.addEventListener('click', (e) => {
        // 立即移除焦点,防止蓝色边框残留
        e.currentTarget.blur();
        showPersonaEditModal(modal, 'add', null, userDetail);
    });

    // 其他身份操作按钮
    const actionBtns = modal.querySelectorAll('.action-icon-btn');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 立即移除焦点,防止蓝色边框残留
            e.currentTarget.blur();

            const action = btn.dataset.action;
            const personaItem = btn.closest('.persona-card');

            // 处理当前身份的编辑
            if (action === 'editCurrent') {
                const personaData = {
                    personaId: userDetail.personaId,
                    name: userDetail.personaName,
                    bio: userDetail.personaBio,
                    avatarUrl: userDetail.personaAvatarUrl,
                    isCurrent: true
                };
                showPersonaEditModal(modal, 'edit', personaData, userDetail);
                return;
            }

            // 处理其他身份的操作
            const personaId = personaItem.dataset.personaId;
            const personaData = userDetail.otherPersonas.find(p => p.personaId.toString() === personaId);

            switch (action) {
                case 'setDefault':
                    handleSetDefaultPersona(personaData, personaItem);
                    break;
                case 'edit':
                    showPersonaEditModal(modal, 'edit', personaData, userDetail);
                    break;
                case 'delete':
                    handleDeletePersona(personaData, personaItem);
                    break;
            }
        });
    });
}

// 显示身份编辑模态框
function showPersonaEditModal(parentModal, mode, personaData, userDetail) {
    const isEdit = mode === 'edit';

    // 在打开子模态框时隐藏父模态框的焦点
    if (parentModal) {
        manageModalFocus(parentModal, 'hide');
    }
    const title = isEdit ? '编辑身份' : '新增身份';

    // 处理不同数据结构的字段
    let personaName, personaBio, personaAvatarUrl;

    if (isEdit) {
        // 检查是否为当前身份(数据结构不同)
        if (personaData.isCurrent) {
            personaName = userDetail.personaName || '';
            personaBio = userDetail.personaBio || '';
            personaAvatarUrl = userDetail.personaAvatarUrl || '';
        } else {
            // 其他身份
            personaName = personaData.name || '';
            personaBio = personaData.bio || '';
            personaAvatarUrl = personaData.avatarUrl || '';
        }
    } else {
        // 新增身份
        personaName = '';
        personaBio = '';
        personaAvatarUrl = '';
    }

    // 创建编辑模态框
    const editModal = document.createElement('div');
    editModal.className = 'persona-edit-modal';
    editModal.innerHTML = `
        <div class="edit-modal-overlay">
            <div class="edit-modal-content">
                <div class="edit-modal-header">
                    <h3>${title}</h3>
                    <button class="close-edit-btn" id="closeEditBtn">✕</button>
                </div>
                <div class="edit-modal-body">
                    <form id="personaEditForm">
                        <div class="form-group">
                            <label for="personaNameInput">昵称</label>
                            <input type="text" id="personaNameInput" value="${personaName}" maxlength="10" placeholder="请输入身份昵称(最多10个字)" required>
                        </div>
                        <div class="form-group">
                            <label for="personaBioInput">个人简介</label>
                            <textarea id="personaBioInput" placeholder="请输入个人简介(可选)" rows="3">${personaBio}</textarea>
                        </div>
                        <div class="form-group">
                            <label>头像</label>
                            <div class="avatar-upload-container" id="personaAvatarContainer"></div>
                            <div class="help-text">建议上传正方形图片，支持 JPG、PNG、WebP 格式</div>
                        </div>
                    </form>
                </div>
                <div class="edit-modal-footer">
                    <button type="button" class="btn-save" id="saveBtn">${isEdit ? '保存' : '创建'}</button>
                    <button type="button" class="btn-cancel" id="cancelBtn">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(editModal);

    // 使用弹窗管理器注册二级弹窗
    modalManager.pushModal('personaEditModal', editModal, 'userDetailModal', () => {
        // 恢复父模态框的焦点状态
        if (parentModal) {
            manageModalFocus(parentModal, 'restore');
        }
        document.body.removeChild(editModal);
    });

    // 初始化头像组件
    let personaAvatarComponent = null;

    // 动态导入并初始化头像组件
    import('./avatarComponent.js').then(({ createAvatarUpload, injectAvatarUploadStyles }) => {
        // 注入样式
        injectAvatarUploadStyles();

        // 创建头像组件
        personaAvatarComponent = createAvatarUpload({
            containerId: 'personaAvatarContainer',
            currentAvatarUrl: personaAvatarUrl,
            size: 'medium',
            onAvatarChange: (avatarUrl) => {
                console.log('身份头像变更:', avatarUrl);
            },
            uploadConfig: {
                sourceType: 'auto'
            },
            enableRandomAvatar: true,  // 启用随机头像功能
            deleteOnRemove: false  // 编辑身份时移除头像不调用删除接口
        });
    }).catch(error => {
        console.error('初始化头像组件失败:', error);
    });

    // 绑定事件
    bindPersonaEditEvents(editModal, parentModal, isEdit, personaData, personaAvatarComponent);
}

// 绑定身份编辑模态框事件
function bindPersonaEditEvents(editModal, parentModal, isEdit, personaData, personaAvatarComponent) {
    const closeEditBtn = editModal.querySelector('#closeEditBtn');
    const cancelBtn = editModal.querySelector('#cancelBtn');
    const saveBtn = editModal.querySelector('#saveBtn');
    const editModalOverlay = editModal.querySelector('.edit-modal-overlay');

    const closeEditModal = () => {
        modalManager.closeModal('personaEditModal');
    };

    closeEditBtn.addEventListener('click', closeEditModal);

    cancelBtn.addEventListener('click', closeEditModal);

    editModalOverlay.addEventListener('click', (e) => {
        if (e.target === editModalOverlay) {
            closeEditModal();
        }
    });

    saveBtn.addEventListener('click', async () => {
        const personaName = editModal.querySelector('#personaNameInput').value.trim();
        const personaBio = editModal.querySelector('#personaBioInput').value.trim();

        if (!personaName) {
            showToast('请输入身份昵称', 'error');
            return;
        }

        // 验证昵称长度不超过10个字符
        if (personaName.length > 10) {
            showToast('昵称长度不能超过10个字符', 'error');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = isEdit ? '保存中...' : '创建中...';

            // 动态导入头像安全处理函数
            const { prepareAvatarData } = await import('./avatarUpload.js');

            // 获取头像URL并安全处理 - 确保头像组件存在且正确获取URL
            let personaAvatarUrl = null;

            if (personaAvatarComponent && typeof personaAvatarComponent.getCurrentAvatar === 'function') {
                const fullAvatarUrl = personaAvatarComponent.getCurrentAvatar();
                console.log('从头像组件获取的完整URL:', fullAvatarUrl);

                // 如果是完整URL，需要提取相对路径（去掉域名部分）
                if (fullAvatarUrl && fullAvatarUrl.includes(STORAGE_CONFIG.domain)) {
                    // 从完整URL中提取文件名部分
                    personaAvatarUrl = fullAvatarUrl.replace(STORAGE_CONFIG.domain, '');
                    console.log('提取的头像相对路径:', personaAvatarUrl);
                } else {
                    personaAvatarUrl = fullAvatarUrl;
                    console.log('使用原始头像URL:', personaAvatarUrl);
                }
            } else {
                // 如果头像组件未初始化，尝试从DOM中获取（备用方案）
                const avatarPreview = editModal.querySelector(`#avatarPreview_personaAvatarContainer img`);
                if (avatarPreview) {
                    const fullSrc = avatarPreview.src;
                    console.log('从DOM获取的完整头像URL:', fullSrc);

                    // 同样需要提取相对路径
                    if (fullSrc && fullSrc.includes(STORAGE_CONFIG.domain)) {
                        personaAvatarUrl = fullSrc.replace(STORAGE_CONFIG.domain, '');
                    } else {
                        personaAvatarUrl = fullSrc;
                    }
                    console.log('DOM提取的头像相对路径:', personaAvatarUrl);
                }
            }

            // 安全处理头像URL
            personaAvatarUrl = prepareAvatarData(personaAvatarUrl);
            console.log('最终处理后的头像URL:', personaAvatarUrl);

            let response;

            if (isEdit) {
                // 编辑身份 - 使用获取到的头像URL
                response = await apiRequest(`${API_USERSERVICE_URL}/api/personas`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        personaId: personaData.personaId,
                        name: personaName,
                        avatarUrl: personaAvatarUrl,
                        bio: personaBio
                    })
                });
            } else {
                // 新增身份 - 使用获取到的头像URL
                response = await apiRequest(`${API_USERSERVICE_URL}/api/personas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: personaName,
                        avatarUrl: personaAvatarUrl,
                        bio: personaBio
                    })
                });
            }

            const result = await response.json();

            if (response.ok) {
                showToast(isEdit ? '身份编辑成功!' : '身份创建成功!');
                closeEditModal();
                // 成功后重新获取用户详情并更新弹窗
                await refreshUserDetailModal(parentModal);
            } else {
                showToast(`操作失败: ${result.message || result.error || '未知错误'}`, 'error');
            }
        } catch (error) {
            console.error('操作失败:', error);
            showToast('网络错误，请检查网络连接', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = isEdit ? '保存' : '创建';
        }
    });
}

// 处理设为默认身份
async function handleSetDefaultPersona(personaData, personaItem) {
    const confirmed = await showConfirmModal({
        title: '设置默认身份',
        message: `确定要将"${personaData.name}"设为默认身份吗？`,
        confirmText: '确认设置',
        cancelText: '取消',
        dangerType: false
    });

    if (!confirmed) {
        return;
    }

    try {
        const response = await apiRequest(`${API_USERSERVICE_URL}/api/personas/set-default`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personaId: personaData.personaId
            })
        });

        const result = await response.json();

        if (response.ok) {
            // 检查返回的新accessToken
            if (result.c) {
                localStorage.setItem('accessToken', result.c);
                console.log('Access token已更新');
            }

            showToast('设置默认身份成功!');
            // 获取父弹窗元素
            const parentModal = document.getElementById('userDetailModal');
            // 成功后重新获取用户详情并更新弹窗
            if (parentModal) {
                await refreshUserDetailModal(parentModal);
            }
        } else {
            showToast(`设置失败: ${result.message || result.error || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('设置默认身份失败:', error);
        showToast('网络错误，请检查网络连接', 'error');
    }
}

// 刷新用户详情弹窗
async function refreshUserDetailModal(modal) {
    try {
        const userDetail = await getUserDetail();
        if (!userDetail) {
            showToast('获取用户信息失败，请刷新页面重试', 'error');
            return;
        }

        // 直接更新弹窗内容,而不是关闭再打开
        const modalBody = modal.querySelector('.modal-body');
        if (!modalBody) {
            console.error('未找到 modal-body 元素');
            return;
        }

        // 生成新的内容
        const newContent = `
            <!-- 用户信息区域 -->
            <div class="user-info-section">
                <div class="user-avatar-section">
                    <div class="user-avatar-large ${!userDetail.personaAvatarUrl ? 'default' : ''}" id="mainUserAvatar">
                        ${userDetail.personaAvatarUrl ?
                            `<img src="${userDetail.personaAvatarUrl}" alt="头像">` :
                            '默认'
                        }
                    </div>
                    <div class="user-basic-info">
                        <h3>${userDetail.personaName || userDetail.username}</h3>
                        <p class="username-line">
                            <span>@${userDetail.username || '未设置'}</span>
                            ${!userDetail.username ?
                                `<span class="account-action-link" id="supplementAccountBtn">补全账号</span>` :
                                `<span class="account-action-links">
                                    <span class="account-action-link" id="changePasswordBtn">修改密码</span>
                                </span>`
                            }
                        </p>
                    </div>
                </div>
                <p class="user-bio">
                    <span class="bio-text" data-full-text="${(userDetail.personaBio || '这个人很懒,什么都没有留下...').replace(/"/g, '&quot;')}">${userDetail.personaBio || '这个人很懒,什么都没有留下...'}</span>
                </p>
                <div class="user-footer-actions">
                    <button class="logout-link" id="logoutBtn">
                        退出登录
                    </button>
                </div>
            </div>

            <!-- 详情信息区域 -->
            <div class="detail-section">
                <h3 class="section-title">账户信息</h3>
                <div class="detail-card">
                    <div class="detail-icon">📧</div>
                    <div class="detail-content">
                        <div class="detail-label">邮箱</div>
                        <div class="detail-value">
                            <span>${userDetail.email || '未设置'}</span>
                            <button class="action-small-btn ${userDetail.email ? 'danger' : ''}" id="${userDetail.email ? 'unbindEmailBtn' : 'bindEmailBtn'}">
                                ${userDetail.email ? '解绑' : '绑定'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 身份管理区域 -->
            <div class="personas-section">
                <div class="personas-header">
                    <h3 class="personas-title">身份管理</h3>
                    <button class="add-persona-btn" id="addPersonaBtn">
                        <span>+</span>
                        <span>新增身份</span>
                    </button>
                </div>

                <div class="personas-list">
                    <!-- 当前身份 -->
                    <div class="persona-card current">
                        <div class="persona-header">
                            <div class="persona-info">
                                <div class="persona-avatar-small ${!userDetail.personaAvatarUrl ? 'default' : ''}" id="currentPersonaAvatar">
                                    ${userDetail.personaAvatarUrl ?
                                        `<img src="${userDetail.personaAvatarUrl}" alt="头像">` :
                                        '默认'
                                    }
                                </div>
                                <div class="persona-details">
                                    <div class="persona-name-row">
                                        <span class="persona-name">${userDetail.personaName || '未设置昵称'}</span>
                                        <span class="current-badge">
                                            <span class="star-icon">⭐</span>
                                            <span>当前默认</span>
                                        </span>
                                    </div>
                                    <p class="persona-bio">
                                        <span class="bio-text" data-full-text="${(userDetail.personaBio || '这个人很懒,什么都没有留下...').replace(/"/g, '&quot;')}">${userDetail.personaBio || '这个人很懒,什么都没有留下...'}</span>
                                    </p>
                                </div>
                            </div>
                            <div class="persona-actions">
                                <button class="action-icon-btn edit" title="编辑当前身份" data-action="editCurrent">
                                    ✏️
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 其他身份 -->
                    ${userDetail.otherPersonas && userDetail.otherPersonas.length > 0 ? `
                        ${userDetail.otherPersonas.map((persona) => `
                            <div class="persona-card" data-persona-id="${persona.personaId}">
                                <div class="persona-header">
                                    <div class="persona-info">
                                        <div class="persona-avatar-small ${!persona.avatarUrl ? 'default' : ''}">
                                            ${persona.avatarUrl ?
                                                `<img src="${persona.avatarUrl}" alt="头像">` :
                                                '默认'
                                            }
                                        </div>
                                        <div class="persona-details">
                                            <div class="persona-name-row">
                                                <span class="persona-name">${persona.name}</span>
                                            </div>
                                            <p class="persona-bio">
                                                <span class="bio-text" data-full-text="${(persona.bio || '这个人很懒,什么都没有留下...').replace(/"/g, '&quot;')}">${persona.bio || '这个人很懒,什么都没有留下...'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div class="persona-actions">
                                        <button class="action-icon-btn set-default" title="设为默认身份" data-action="setDefault">
                                            ⭐
                                        </button>
                                        <button class="action-icon-btn edit" title="编辑" data-action="edit">
                                            ✏️
                                        </button>
                                        <button class="action-icon-btn delete" title="删除" data-action="delete">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    ` : `
                        <div class="empty-personas">
                            <p>暂无其他身份</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- 账号操作区域 -->
            <div class="account-actions-section">
                <button class="account-actions-toggle" id="accountActionsToggle">
                    <span class="toggle-text">账号与安全</span>
                    <span class="toggle-icon">▼</span>
                </button>
                <div class="account-actions-content" id="accountActionsContent" style="display: none;">
                    <button class="account-action-item delete-account-item" id="deleteAccountBtn">
                        <span class="action-label">注销账号</span>
                        <span class="action-arrow">›</span>
                    </button>
                </div>
            </div>
        `;

        // 更新内容
        modalBody.innerHTML = newContent;

        // 重新绑定事件
        bindPersonaManagementEvents(modal, userDetail);
        bindEmailManagementEvents(modal, userDetail);
        bindAccountManagementEvents(modal, userDetail);
        bindAccountActionEvents(modal);
        initAccountActionsToggle(modal);
        initBioToggle(modal);

    } catch (error) {
        console.error('刷新用户详情失败:', error);
        showToast('刷新失败，请重试', 'error');
    }
}

// 处理删除身份
async function handleDeletePersona(personaData, personaItem) {
    const confirmed = await showConfirmModal({
        title: '删除身份',
        message: `确定要删除身份"${personaData.name}"吗？此操作不可撤销。`,
        confirmText: '确认删除',
        cancelText: '取消',
        dangerType: true
    });

    if (!confirmed) {
        return;
    }

    try {
        const response = await apiRequest(`${API_USERSERVICE_URL}/api/personas`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personaId: personaData.personaId
            })
        });

        const result = await response.json();

        if (response.ok) {
            showToast('身份删除成功!');
            // 获取父弹窗元素
            const parentModal = document.getElementById('userDetailModal');
            // 成功后重新获取用户详情并更新弹窗
            if (parentModal) {
                await refreshUserDetailModal(parentModal);
            }
        } else {
            showToast(`删除失败: ${result.message || result.error || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('删除身份失败:', error);
        showToast('网络错误，请检查网络连接', 'error');
    }
}

// 绑定邮箱管理事件
function bindEmailManagementEvents(modal, userDetail) {
    // 绑定邮箱按钮
    const bindEmailBtn = modal.querySelector('#bindEmailBtn');
    if (bindEmailBtn) {
        bindEmailBtn.addEventListener('click', (e) => {
            // 立即移除焦点,防止蓝色边框残留
            e.currentTarget.blur();
            showEmailModal(modal, 'bind', userDetail);
        });
    }

    // 解绑邮箱按钮
    const unbindEmailBtn = modal.querySelector('#unbindEmailBtn');
    if (unbindEmailBtn) {
        unbindEmailBtn.addEventListener('click', (e) => {
            // 立即移除焦点,防止蓝色边框残留
            e.currentTarget.blur();
            showEmailModal(modal, 'unbind', userDetail);
        });
    }
}

// 显示邮箱绑定/解绑模态框
function showEmailModal(parentModal, action, userDetail) {
    const isBind = action === 'bind';
    const title = isBind ? '绑定邮箱' : '解绑邮箱';
    const buttonText = isBind ? '绑定' : '解绑';

    // 在打开子模态框时隐藏父模态框的焦点
    if (parentModal) {
        manageModalFocus(parentModal, 'hide');
    }

    const emailModal = document.createElement('div');
    emailModal.className = 'email-modal';
    emailModal.innerHTML = `
        <div class="email-modal-overlay">
            <div class="email-modal-content">
                <div class="email-modal-header">
                    <h3>${title}</h3>
                    <button class="close-email-btn" id="closeEmailBtn">✕</button>
                </div>
                <div class="email-modal-body">
                    <div class="email-input-group">
                        <label for="emailInput">邮箱地址</label>
                        <input type="email" id="emailInput" placeholder="请输入邮箱地址" ${!isBind ? 'value="' + (userDetail.email || '') + '" readonly' : ''} required>
                    </div>
                    <div class="verification-code-group">
                        <label for="verificationCodeInput">验证码</label>
                        <div class="code-input-container">
                            <input type="text" id="verificationCodeInput" placeholder="请输入验证码" required>
                            <button type="button" class="send-code-btn" id="sendEmailCodeBtn">发送验证码</button>
                        </div>
                    </div>
                </div>
                <div class="email-modal-footer">
                    <button type="button" class="cancel-email-btn" id="cancelEmailBtn">取消</button>
                    <button type="button" class="confirm-email-btn" id="confirmEmailBtn">${buttonText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(emailModal);

    // 使用弹窗管理器注册邮箱弹窗
    modalManager.pushModal('emailModal', emailModal, 'userDetailModal', () => {
        // 恢复父模态框的焦点状态
        if (parentModal) {
            manageModalFocus(parentModal, 'restore');
        }
        document.body.removeChild(emailModal);
    });

    // 绑定事件
    bindEmailModalEvents(emailModal, parentModal, action, userDetail);
}

// 绑定邮箱模态框事件
function bindEmailModalEvents(emailModal, parentModal, action, userDetail) {
    const closeEmailBtn = emailModal.querySelector('#closeEmailBtn');
    const cancelEmailBtn = emailModal.querySelector('#cancelEmailBtn');
    const confirmEmailBtn = emailModal.querySelector('#confirmEmailBtn');
    const sendEmailCodeBtn = emailModal.querySelector('#sendEmailCodeBtn');
    const emailInput = emailModal.querySelector('#emailInput');
    const verificationCodeInput = emailModal.querySelector('#verificationCodeInput');
    const emailModalOverlay = emailModal.querySelector('.email-modal-overlay');

    // 邮箱格式校验函数
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // 更新发送验证码按钮状态
    const updateSendCodeButtonState = () => {
        const email = emailInput.value.trim();

        // 更新邮箱输入框的视觉状态
        if (email === '') {
            emailInput.classList.remove('valid', 'invalid');
        } else if (isValidEmail(email)) {
            emailInput.classList.add('valid');
            emailInput.classList.remove('invalid');
        } else {
            emailInput.classList.add('invalid');
            emailInput.classList.remove('valid');
        }

        if (isValidEmail(email)) {
            sendEmailCodeBtn.disabled = false;
        } else {
            sendEmailCodeBtn.disabled = true;
        }
    };

    // 初始化按钮状态
    updateSendCodeButtonState();

    // 邮箱输入框变化时更新按钮状态
    emailInput.addEventListener('input', updateSendCodeButtonState);

    // 关闭模态框
    const closeEmailModal = () => {
        modalManager.closeModal('emailModal');
    };

    closeEmailBtn.addEventListener('click', closeEmailModal);
    cancelEmailBtn.addEventListener('click', closeEmailModal);
    emailModalOverlay.addEventListener('click', (e) => {
        if (e.target === emailModalOverlay) {
            closeEmailModal();
        }
    });

    // 发送验证码
    sendEmailCodeBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();

        // 由于按钮只有在邮箱格式正确时才可点击,这里不需要重复校验
        try {
            sendEmailCodeBtn.disabled = true;
            sendEmailCodeBtn.textContent = '发送中...';

            // 根据操作类型选择不同的API接口
            const apiEndpoint = action === 'bind' ? '/api/users/register/email/send-code' : '/api/users/email/verify/send-code';
            const response = await apiRequest(`${API_USERSERVICE_URL}${apiEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                showToast('验证码已发送，请查收邮箱', 'success');

                // 开始倒计时
                let countdown = 60;
                sendEmailCodeBtn.textContent = `重新发送(${countdown}s)`;

                const timer = setInterval(() => {
                    countdown--;
                    sendEmailCodeBtn.textContent = `重新发送(${countdown}s)`;
                    if (countdown === 0) {
                        clearInterval(timer);
                        sendEmailCodeBtn.textContent = '发送验证码';
                        sendEmailCodeBtn.disabled = false;
                    }
                }, 1000);
            } else {
                showToast(`发送验证码失败: ${result.message || result.error || '未知错误'}`, 'error');
                sendEmailCodeBtn.disabled = false;
                sendEmailCodeBtn.textContent = '发送验证码';
            }
        } catch (error) {
            console.error('发送验证码失败:', error);
            showToast('网络错误，请检查网络连接', 'error');
            sendEmailCodeBtn.disabled = false;
            sendEmailCodeBtn.textContent = '发送验证码';
        }
    });

    // 确认绑定/解绑
    confirmEmailBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const verificationCode = verificationCodeInput.value.trim();

        if (!email) {
            showToast('请输入邮箱地址', 'error');
            return;
        }

        if (!verificationCode) {
            showToast('请输入验证码', 'error');
            return;
        }

        try {
            confirmEmailBtn.disabled = true;
            confirmEmailBtn.textContent = action === 'bind' ? '绑定中...' : '解绑中...';

            const apiEndpoint = action === 'bind' ? '/api/users/email/bind' : '/api/users/email/unbind';
            const response = await apiRequest(`${API_USERSERVICE_URL}${apiEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, verificationCode })
            });

            const result = await response.json();

            if (response.ok) {
                showToast(action === 'bind' ? '邮箱绑定成功!' : '邮箱解绑成功!');
                closeEmailModal();

                // 检查返回的新 accessToken
                if (result.c) {
                    localStorage.setItem('accessToken', result.c);
                    console.log('Access token已更新');
                }

                // 刷新用户详情模态框
                setTimeout(() => {
                    refreshUserDetailModal(parentModal);
                }, 100);
            } else {
                showToast(`${action === 'bind' ? '绑定' : '解绑'}失败: ${result.message || result.error || '未知错误'}`, 'error');
                confirmEmailBtn.disabled = false;
                confirmEmailBtn.textContent = action === 'bind' ? '绑定' : '解绑';
            }
        } catch (error) {
            console.error(`${action === 'bind' ? '绑定' : '解绑'}失败:`, error);
            showToast('网络错误，请检查网络连接', 'error');
            confirmEmailBtn.disabled = false;
            confirmEmailBtn.textContent = action === 'bind' ? '绑定' : '解绑';
        }
    });
}

// 初始化 bio 展开/收起功能
function initBioToggle(modal) {
    // 获取所有包含 bio 的容器
    const bioContainers = modal.querySelectorAll('.user-bio, .persona-bio');

    bioContainers.forEach(container => {
        const bioText = container.querySelector('.bio-text');
        if (!bioText) return;

        // 检查是否需要展开按钮
        const checkOverflow = () => {
            // 先应用 clamped 状态
            bioText.classList.remove('expanded');

            // 强制重绘
            bioText.offsetHeight;

            // 检查是否溢出
            if (bioText.scrollHeight > bioText.offsetHeight) {
                // 添加展开按钮
                if (!container.querySelector('.bio-toggle-btn')) {
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'bio-toggle-btn';
                    toggleBtn.textContent = '展开';
                    toggleBtn.addEventListener('click', () => {
                        const isExpanded = bioText.classList.contains('expanded');
                        if (isExpanded) {
                            bioText.classList.remove('expanded');
                            toggleBtn.textContent = '展开';
                        } else {
                            bioText.classList.add('expanded');
                            toggleBtn.textContent = '收起';
                        }
                    });
                    container.appendChild(toggleBtn);
                }
            }
        };

        // 延迟检查,确保 DOM 已完全渲染
        setTimeout(checkOverflow, 100);
    });
}

// 初始化账号操作折叠功能
function initAccountActionsToggle(modal) {
    const toggleBtn = modal.querySelector('#accountActionsToggle');
    const content = modal.querySelector('#accountActionsContent');

    if (!toggleBtn || !content) return;

    toggleBtn.addEventListener('click', (e) => {
        // 立即移除焦点,防止蓝色边框残留
        e.currentTarget.blur();

        // 切换展开/收起状态
        const isActive = toggleBtn.classList.contains('active');

        if (isActive) {
            // 收起
            toggleBtn.classList.remove('active');
            content.classList.remove('show');
            content.style.display = 'none';
        } else {
            // 展开
            toggleBtn.classList.add('active');
            content.style.display = 'block';
            // 延迟添加 show 类以触发动画
            setTimeout(() => {
                content.classList.add('show');
            }, 10);
        }
    });
}

// 创建头像按钮
export function createAvatarButton() {
    const avatarButton = document.createElement('div');
    avatarButton.className = 'avatar-button';
    avatarButton.innerHTML = `
        <div class="avatar-container" id="mainAvatarBtn">
            <div class="default-avatar">默认</div>
        </div>
    `;

    // 点击事件
    avatarButton.addEventListener('click', async () => {
        const userDetail = await getUserDetail();
        if (userDetail) {
            showUserDetailModal(userDetail);
        } else {
            showToast('获取用户信息失败，请刷新页面重试', 'error');
        }
    });

    // 添加到页面
    document.body.appendChild(avatarButton);

    // 异步加载真实头像
    updateAvatarButton();
}

// 更新左上角头像按钮
export async function updateAvatarButton() {
    const avatarContainer = document.getElementById('mainAvatarBtn');
    if (!avatarContainer) return;

    try {
        const userDetail = await getUserDetail();
        if (userDetail && userDetail.personaAvatarUrl) {
            avatarContainer.innerHTML = `
                <img src="${userDetail.personaAvatarUrl}" alt="头像" class="avatar-img" onerror="this.style.display='none'; document.getElementById('mainAvatarBtn').innerHTML='<div class=default-avatar>默认</div>'">
            `;
        } else {
            avatarContainer.innerHTML = '<div class="default-avatar">默认</div>';
        }
    } catch (error) {
        console.error('更新头像按钮失败:', error);
    }
}

// 绑定退出登录和注销账号事件
function bindAccountActionEvents(modal) {
    // 退出登录按钮
    const logoutBtn = modal.querySelector('#logoutBtn');
    logoutBtn.addEventListener('click', handleLogout);

    // 注销账号按钮
    const deleteAccountBtn = modal.querySelector('#deleteAccountBtn');
    deleteAccountBtn.addEventListener('click', handleDeleteAccount);
}

// 处理退出登录
async function handleLogout() {
    try {
        const confirmed = await showConfirmModal({
            title: '退出登录',
            message: '确定要退出登录吗？',
            confirmText: '退出登录',
            cancelText: '取消',
            dangerType: false
        });

        if (confirmed) {
            // 调用后端登出接口
            try {
                const response = await apiRequest(`${API_USERSERVICE_URL}/api/users/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.warn('后端登出接口调用失败，但继续执行本地登出');
                }
            } catch (error) {
                console.error('调用后端登出接口失败:', error);
                // 即使后端接口调用失败，也继续执行本地登出
            }

            // 删除accessToken
            localStorage.removeItem('accessToken');
            showToast('已退出登录');

            // 关闭弹窗
            modalManager.closeModal('userDetailModal');

            // 跳转到登录页面
            setTimeout(() => {
                window.location.href = '../login/index.html';
            }, 500);
        }
    } catch (error) {
        console.error('退出登录失败:', error);
    }
}

// 处理注销账号
async function handleDeleteAccount() {
    try {
        // 使用自定义确认弹窗（统一处理所有设备）
        const confirmed = await showConfirmModal({
            title: '注销账号',
            message: '注销账号将删除所有数据且不可恢复，确定要继续吗？',
            confirmText: '确认注销',
            cancelText: '取消',
            dangerType: true
        });

        if (!confirmed) {
            showToast('操作已取消', 'info');
            return;
        }

        // 禁用按钮，防止重复点击
        const deleteAccountBtn = document.querySelector('#deleteAccountBtn');
        if (!deleteAccountBtn) return;

        deleteAccountBtn.disabled = true;
        deleteAccountBtn.textContent = '注销中...';

        // 调用注销API
        const response = await apiRequest(`${API_USERSERVICE_URL}/api/users/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            showToast('账号注销成功');

            // 删除accessToken
            localStorage.removeItem('accessToken');

            // 关闭弹窗（使用弹窗管理器）
            modalManager.closeModal('userDetailModal');

            // 跳转到登录页面
            setTimeout(() => {
                window.location.href = '../login/index.html';
            }, 1000);
        } else {
            showToast(`注销失败: ${result.message || result.error || '未知错误'}`, 'error');
            // 恢复按钮状态
            deleteAccountBtn.disabled = false;
            deleteAccountBtn.textContent = '注销账号';
        }
    } catch (error) {
        console.error('注销账号失败:', error);
        showToast('网络错误，请检查网络连接', 'error');
        // 恢复按钮状态
        const deleteAccountBtn = document.querySelector('#deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.disabled = false;
            deleteAccountBtn.textContent = '注销账号';
        }
    }
}

// 绑定账号补全和修改密码事件
function bindAccountManagementEvents(modal, userDetail) {
    // 补全账号按钮
    const supplementAccountBtn = modal.querySelector('#supplementAccountBtn');
    if (supplementAccountBtn) {
        supplementAccountBtn.addEventListener('click', (e) => {
            e.currentTarget.blur();
            showSupplementAccountModal(modal, userDetail);
        });
    }

    // 修改密码按钮
    const changePasswordBtn = modal.querySelector('#changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', (e) => {
            e.currentTarget.blur();
            showChangePasswordModal(modal, userDetail);
        });
    }
}

// 显示补全账号模态框
function showSupplementAccountModal(parentModal, userDetail) {
    // 隐藏父模态框的焦点
    if (parentModal) {
        manageModalFocus(parentModal, 'hide');
    }

    const supplementModal = document.createElement('div');
    supplementModal.className = 'account-modal';
    supplementModal.innerHTML = `
        <div class="account-modal-overlay">
            <div class="account-modal-content">
                <div class="account-modal-header">
                    <h3>补全账号</h3>
                    <button class="close-account-btn" id="closeSupplementBtn">✕</button>
                </div>
                <div class="account-modal-body">
                    <p class="account-tip">请设置用户名和密码以补全您的账号信息</p>
                    <div class="account-input-group">
                        <label for="supplementUsername">用户名</label>
                        <input type="text" id="supplementUsername" placeholder="3-50个字符，不能包含@符号" required>
                        <span class="input-hint">用户名长度必须在3-50个字符之间</span>
                    </div>
                    <div class="account-input-group">
                        <label for="supplementPassword">密码</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="supplementPassword" placeholder="请输入密码(6-100个字符)" required>
                            <button type="button" class="toggle-password-btn" data-target="supplementPassword" aria-label="显示密码" title="显示密码">
                                <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <svg class="eye-slash-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                        <span class="input-hint">密码长度必须在6-100个字符之间</span>
                    </div>
                    <div class="account-input-group">
                        <label for="supplementPasswordConfirm">确认密码</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="supplementPasswordConfirm" placeholder="请再次输入密码" required>
                            <button type="button" class="toggle-password-btn" data-target="supplementPasswordConfirm" aria-label="显示密码" title="显示密码">
                                <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <svg class="eye-slash-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="account-modal-footer">
                    <button type="button" class="cancel-account-btn" id="cancelSupplementBtn">取消</button>
                    <button type="button" class="confirm-account-btn" id="confirmSupplementBtn">确认</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(supplementModal);

    // 使用弹窗管理器注册
    modalManager.pushModal('supplementAccountModal', supplementModal, 'userDetailModal', () => {
        if (parentModal) {
            manageModalFocus(parentModal, 'restore');
        }
        document.body.removeChild(supplementModal);
    });

    // 绑定事件
    bindSupplementAccountEvents(supplementModal, parentModal, userDetail);

    // 初始化密码显示/隐藏功能
    initPasswordToggleForModal(supplementModal);
}

// 绑定补全账号模态框事件
function bindSupplementAccountEvents(supplementModal, parentModal, userDetail) {
    const closeBtn = supplementModal.querySelector('#closeSupplementBtn');
    const cancelBtn = supplementModal.querySelector('#cancelSupplementBtn');
    const confirmBtn = supplementModal.querySelector('#confirmSupplementBtn');
    const usernameInput = supplementModal.querySelector('#supplementUsername');
    const passwordInput = supplementModal.querySelector('#supplementPassword');
    const passwordConfirmInput = supplementModal.querySelector('#supplementPasswordConfirm');
    const overlay = supplementModal.querySelector('.account-modal-overlay');

    // 关闭模态框
    const closeSupplementModal = () => {
        modalManager.closeModal('supplementAccountModal');
    };

    closeBtn.addEventListener('click', closeSupplementModal);
    cancelBtn.addEventListener('click', closeSupplementModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeSupplementModal();
        }
    });

    // 确认补全账号
    confirmBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;

        // 前端验证
        if (username.length < 3 || username.length > 50) {
            showToast('用户名长度必须在3-50个字符之间', 'error');
            return;
        }

        if (username.includes('@')) {
            showToast('用户名中不能包含@符号', 'error');
            return;
        }

        if (password.length < 6 || password.length > 100) {
            showToast('密码长度必须在6-100个字符之间', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            showToast('两次输入的密码不一致', 'error');
            return;
        }

        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = '提交中...';

            const response = await apiRequest(`${API_USERSERVICE_URL}/api/users/supplement/password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });

            const result = await response.json();

            if (response.ok) {
                // 检查返回的新 accessToken
                if (result.c) {
                    localStorage.setItem('accessToken', result.c);
                    console.log('Access token已更新');
                }

                showToast('账号补全成功!');
                closeSupplementModal();

                // 刷新用户详情模态框
                setTimeout(() => {
                    refreshUserDetailModal(parentModal);
                }, 100);
            } else {
                showToast(`补全账号失败: ${result.message || result.error || '未知错误'}`, 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = '确认';
            }
        } catch (error) {
            console.error('补全账号失败:', error);
            showToast('网络错误，请检查网络连接', 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认';
        }
    });
}

// 显示修改密码模态框
function showChangePasswordModal(parentModal, userDetail) {
    // 隐藏父模态框的焦点
    if (parentModal) {
        manageModalFocus(parentModal, 'hide');
    }

    const changePasswordModal = document.createElement('div');
    changePasswordModal.className = 'account-modal';
    changePasswordModal.id = 'changePasswordModal';
    changePasswordModal.innerHTML = `
        <div class="account-modal-overlay">
            <div class="account-modal-content">
                <div class="account-modal-header">
                    <h3>修改密码</h3>
                    <button class="close-account-btn" id="closeChangePasswordBtn">✕</button>
                </div>
                <div class="account-modal-body">
                    <div class="account-input-group">
                        <label for="oldPassword">旧密码</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="oldPassword" placeholder="请输入旧密码" required>
                            <button type="button" class="toggle-password-btn" data-target="oldPassword" aria-label="显示密码" title="显示密码">
                                <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <svg class="eye-slash-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="account-input-group">
                        <label for="newPassword">新密码</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="newPassword" placeholder="请输入新密码(6-100个字符)" required>
                            <button type="button" class="toggle-password-btn" data-target="newPassword" aria-label="显示密码" title="显示密码">
                                <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <svg class="eye-slash-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                        <span class="input-hint">密码长度必须在6-100个字符之间</span>
                    </div>
                    <div class="account-input-group">
                        <label for="newPasswordConfirm">确认新密码</label>
                        <div class="password-input-wrapper">
                            <input type="password" id="newPasswordConfirm" placeholder="请再次输入新密码" required>
                            <button type="button" class="toggle-password-btn" data-target="newPasswordConfirm" aria-label="显示密码" title="显示密码">
                                <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <svg class="eye-slash-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    ${userDetail.email ? `<div class="forgot-password-section">
                        <span class="forgot-password-link" id="forgotPasswordInChangeModal">忘记旧密码？</span>
                    </div>` : ''}
                </div>
                <div class="account-modal-footer">
                    <button type="button" class="cancel-account-btn" id="cancelChangePasswordBtn">取消</button>
                    <button type="button" class="confirm-account-btn" id="confirmChangePasswordBtn">确认</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(changePasswordModal);

    // 使用弹窗管理器注册
    modalManager.pushModal('changePasswordModal', changePasswordModal, 'userDetailModal', () => {
        if (parentModal) {
            manageModalFocus(parentModal, 'restore');
        }
        document.body.removeChild(changePasswordModal);
    });

    // 绑定事件
    bindChangePasswordEvents(changePasswordModal, parentModal, userDetail);

    // 初始化密码显示/隐藏功能
    initPasswordToggleForModal(changePasswordModal);
}

// 绑定修改密码模态框事件
function bindChangePasswordEvents(changePasswordModal, parentModal, userDetail) {
    const closeBtn = changePasswordModal.querySelector('#closeChangePasswordBtn');
    const cancelBtn = changePasswordModal.querySelector('#cancelChangePasswordBtn');
    const confirmBtn = changePasswordModal.querySelector('#confirmChangePasswordBtn');
    const oldPasswordInput = changePasswordModal.querySelector('#oldPassword');
    const newPasswordInput = changePasswordModal.querySelector('#newPassword');
    const newPasswordConfirmInput = changePasswordModal.querySelector('#newPasswordConfirm');
    const overlay = changePasswordModal.querySelector('.account-modal-overlay');

    // 关闭模态框
    const closeChangePasswordModal = () => {
        modalManager.closeModal('changePasswordModal');
    };

    closeBtn.addEventListener('click', closeChangePasswordModal);
    cancelBtn.addEventListener('click', closeChangePasswordModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeChangePasswordModal();
        }
    });

    // 确认修改密码
    confirmBtn.addEventListener('click', async () => {
        const oldPassword = oldPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const newPasswordConfirm = newPasswordConfirmInput.value;

        // 前端验证
        if (!oldPassword) {
            showToast('请输入旧密码', 'error');
            return;
        }

        if (newPassword.length < 6 || newPassword.length > 100) {
            showToast('新密码长度必须在6-100个字符之间', 'error');
            return;
        }

        if (newPassword !== newPasswordConfirm) {
            showToast('两次输入的新密码不一致', 'error');
            return;
        }

        if (oldPassword === newPassword) {
            showToast('新密码不能与旧密码相同', 'error');
            return;
        }

        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = '提交中...';

            const response = await apiRequest(`${API_USERSERVICE_URL}/api/users/change/password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    oldPassword,
                    newPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                showToast('密码修改成功!');
                closeChangePasswordModal();
            } else {
                showToast(`修改密码失败: ${result.message || result.error || '未知错误'}`, 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = '确认';
            }
        } catch (error) {
            console.error('修改密码失败:', error);
            showToast('网络错误，请检查网络连接', 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认';
        }
    });

    // 绑定忘记密码链接事件
    const forgotPasswordInChangeModal = changePasswordModal.querySelector('#forgotPasswordInChangeModal');
    if (forgotPasswordInChangeModal) {
        forgotPasswordInChangeModal.addEventListener('click', (e) => {
            e.currentTarget.blur();

            // 关闭修改密码弹窗，回到用户详情弹窗
            closeChangePasswordModal();

            // 等待弹窗管理器完成清理和焦点恢复
            setTimeout(() => {
                // 验证用户详情弹窗仍然存在
                const userDetailModal = document.getElementById('userDetailModal');
                if (userDetailModal) {
                    showForgotPasswordModal({
                        mode: 'auto-fill',
                        email: userDetail.email,
                        parentModal: userDetailModal // 以用户详情弹窗为父弹窗
                    });
                }
            }, 100);
        });
    }
}


// 初始化模态框中的密码显示/隐藏切换功能
function initPasswordToggleForModal(modal) {
    console.log('初始化模态框密码显示/隐藏功能...');

    const toggleButtons = modal.querySelectorAll('.toggle-password-btn');

    toggleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const eyeIcon = this.querySelector('.eye-icon');
            const eyeSlashIcon = this.querySelector('.eye-slash-icon');

            if (!passwordInput || !eyeIcon || !eyeSlashIcon) {
                console.error('密码切换按钮元素未找到');
                return;
            }

            // 切换密码输入框类型
            // 图标表示当前状态：划线眼睛=隐藏状态，眼睛=显示状态
            if (passwordInput.type === 'password') {
                // 当前是隐藏状态，点击后显示密码
                passwordInput.type = 'text';
                eyeIcon.style.display = 'block';  // 显示眼睛图标（表示当前可见）
                eyeSlashIcon.style.display = 'none';  // 隐藏划线眼睛
                this.setAttribute('aria-label', '隐藏密码');
                this.setAttribute('title', '隐藏密码');
            } else {
                // 当前是显示状态，点击后隐藏密码
                passwordInput.type = 'password';
                eyeIcon.style.display = 'none';  // 隐藏眼睛图标
                eyeSlashIcon.style.display = 'block';  // 显示划线眼睛（表示当前隐藏）
                this.setAttribute('aria-label', '显示密码');
                this.setAttribute('title', '显示密码');
            }
        });
    });

    console.log(`✅ 已绑定 ${toggleButtons.length} 个密码切换按钮`);
}























































































