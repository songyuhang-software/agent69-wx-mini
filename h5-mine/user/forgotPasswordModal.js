/**
 * 忘记密码弹窗模块
 * 支持两种模式：
 * 1. 自动填充邮箱模式（来自用户详情）
 * 2. 手动填写邮箱模式（来自登录页面）
 */

import { API_USERSERVICE_URL, apiRequest } from '../common.js';
import modalManager from '../modal/ModalManager.js';
import { manageModalFocus } from '../modal/focusManagement.js';
import { showToast } from '../utils/toast.js';
import { showConfirmModal } from './confirmModal.js';

// 动态加载样式文件
function loadStyles() {
    const moduleUrl = new URL(import.meta.url);
    const modulePath = moduleUrl.pathname;
    const jsDir = modulePath.substring(0, modulePath.lastIndexOf('/'));
    const basePath = jsDir + '/styles/';

    const styles = ['forgot-password.css'];
    styles.forEach(filename => {
        const href = basePath + filename;
        if (!document.querySelector(`link[href*="${filename}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    });
}

// 样式加载标记，避免重复加载
let stylesLoaded = false;

// 确保样式已加载的函数
function ensureStylesLoaded() {
    if (!stylesLoaded) {
        loadStyles();
        stylesLoaded = true;
    }
}

/**
 * 显示忘记密码模态框
 * @param {Object} options - 配置选项
 * @param {string} options.mode - 模式：'auto-fill'（自动填充） | 'manual-input'（手动输入）
 * @param {string} options.email - 预填充的邮箱地址（auto-fill模式时需要）
 * @param {HTMLElement} options.parentModal - 父模态框元素
 */
export function showForgotPasswordModal(options = {}) {
    // 延迟加载样式，避免动态导入时的副作用
    ensureStylesLoaded();

    const {
        mode = 'manual-input', // 默认手动输入模式
        email = '',
        parentModal = null
    } = options;

    // 在打开子模态框时隐藏父模态框的焦点
    if (parentModal) {
        manageModalFocus(parentModal, 'hide');
    }

    // 创建忘记密码模态框
    const forgotPasswordModal = document.createElement('div');
    forgotPasswordModal.className = 'forgot-password-modal';
    forgotPasswordModal.innerHTML = `
        <div class="forgot-password-overlay">
            <div class="forgot-password-content">
                <div class="forgot-password-header">
                    <h3>忘记密码</h3>
                    <button class="close-forgot-password-btn" id="closeForgotPasswordBtn">✕</button>
                </div>

                <!-- 第1步：邮箱验证 -->
                <div class="forgot-password-body" id="step1-verification">
                    <div class="step-indicator">
                        <div class="step-circle active">1</div>
                        <div class="step-line"></div>
                        <div class="step-circle">2</div>
                    </div>
                    <div class="step-title">邮箱验证</div>
                    <div class="step-description">请验证您的邮箱地址并输入验证码</div>

                    <div class="email-input-group">
                        <label for="forgotPasswordEmail">邮箱地址</label>
                        <input type="email" id="forgotPasswordEmail"
                               placeholder="请输入您的邮箱地址"
                               value="${email || ''}"
                               ${mode === 'auto-fill' ? 'readonly' : ''}
                               required>
                        ${mode === 'auto-fill' ? '<div class="email-hint">邮箱已自动填充</div>' : ''}
                    </div>
                    <div class="verification-code-group">
                        <label for="forgotPasswordCode">验证码</label>
                        <div class="code-input-container">
                            <input type="text" id="forgotPasswordCode" placeholder="请输入验证码" required>
                            <button type="button" class="send-code-btn" id="sendForgotPasswordCodeBtn">发送验证码</button>
                        </div>
                    </div>
                    <div class="step-actions">
                        <button type="button" class="next-step-btn" id="nextStepBtn" disabled>下一步</button>
                    </div>
                </div>

                <!-- 第2步：设置新密码 -->
                <div class="forgot-password-body hidden" id="step2-password">
                    <div class="step-indicator">
                        <div class="step-circle completed">1</div>
                        <div class="step-line"></div>
                        <div class="step-circle active">2</div>
                    </div>
                    <div class="step-title">设置新密码</div>
                    <div class="step-description">请设置您的新密码</div>

                    <div class="new-password-group">
                        <label for="newPasswordInput">新密码</label>
                        <input type="password" id="newPasswordInput" placeholder="请输入新密码(6-100个字符)" required>
                        <span class="input-hint">密码长度必须在6-100个字符之间</span>
                    </div>
                    <div class="confirm-password-group">
                        <label for="confirmPasswordInput">确认新密码</label>
                        <input type="password" id="confirmPasswordInput" placeholder="请再次输入新密码" required>
                    </div>
                    <div class="step-actions">
                        <button type="button" class="confirm-forgot-password-btn" id="confirmForgotPasswordBtn">确认修改</button>
                        <button type="button" class="prev-step-btn" id="prevStepBtn">上一步</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(forgotPasswordModal);

    // 使用弹窗管理器注册忘记密码弹窗
    const parentModalId = parentModal ? parentModal.id || 'unknown' : null;
    modalManager.pushModal('forgotPasswordModal', forgotPasswordModal, parentModalId, () => {
        // 恢复父模态框的焦点状态
        if (parentModal) {
            manageModalFocus(parentModal, 'restore');
        }
        document.body.removeChild(forgotPasswordModal);
    });

    // 绑定事件
    bindForgotPasswordModalEvents(forgotPasswordModal, parentModal, { mode, email });
}

/**
 * 绑定忘记密码模态框事件
 */
function bindForgotPasswordModalEvents(forgotPasswordModal, parentModal, options) {
    const { mode, email } = options;

    const closeForgotPasswordBtn = forgotPasswordModal.querySelector('#closeForgotPasswordBtn');
    const confirmForgotPasswordBtn = forgotPasswordModal.querySelector('#confirmForgotPasswordBtn');
    const sendForgotPasswordCodeBtn = forgotPasswordModal.querySelector('#sendForgotPasswordCodeBtn');
    const emailInput = forgotPasswordModal.querySelector('#forgotPasswordEmail');
    const verificationCodeInput = forgotPasswordModal.querySelector('#forgotPasswordCode');
    const newPasswordInput = forgotPasswordModal.querySelector('#newPasswordInput');
    const confirmPasswordInput = forgotPasswordModal.querySelector('#confirmPasswordInput');
    const overlay = forgotPasswordModal.querySelector('.forgot-password-overlay');

    // 步骤切换相关的元素
    const step1Container = forgotPasswordModal.querySelector('#step1-verification');
    const step2Container = forgotPasswordModal.querySelector('#step2-password');
    const nextStepBtn = forgotPasswordModal.querySelector('#nextStepBtn');
    const prevStepBtn = forgotPasswordModal.querySelector('#prevStepBtn');

    // 邮箱格式校验函数
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // 更新发送验证码按钮状态和下一步按钮状态
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

        if (isValidEmail(email) && mode === 'manual-input') {
            sendForgotPasswordCodeBtn.disabled = false;
        } else if (mode === 'auto-fill') {
            sendForgotPasswordCodeBtn.disabled = false; // 自动填充模式下总是可点击
        } else {
            sendForgotPasswordCodeBtn.disabled = true;
        }

        // 更新下一步按钮状态
        updateNextStepButtonState();
    };

    // 更新下一步按钮状态
    const updateNextStepButtonState = () => {
        const email = emailInput.value.trim();
        const verificationCode = verificationCodeInput.value.trim();
        const isEmailValid = isValidEmail(email);
        const isCodeValid = verificationCode.length >= 4; // 简单的验证码长度验证

        if (isEmailValid && isCodeValid) {
            nextStepBtn.disabled = false;
        } else {
            nextStepBtn.disabled = true;
        }
    };

    // 初始化按钮状态
    updateSendCodeButtonState();

    // 邮箱输入框变化时更新按钮状态（仅手动输入模式）
    if (mode === 'manual-input') {
        emailInput.addEventListener('input', updateSendCodeButtonState);
    }

    // 验证码输入框变化时更新下一步按钮状态
    verificationCodeInput.addEventListener('input', updateNextStepButtonState);

    // 关闭模态框
    const closeForgotPasswordModal = () => {
        modalManager.closeModal('forgotPasswordModal');
    };

    closeForgotPasswordBtn.addEventListener('click', closeForgotPasswordModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeForgotPasswordModal();
        }
    });

    // 步骤切换相关的事件
    const goToStep2 = () => {
        // 显示第2步，隐藏第1步
        step1Container.classList.add('hidden');
        step2Container.classList.remove('hidden');

        // 更新步骤指示器
        const stepCircles = forgotPasswordModal.querySelectorAll('.step-circle');
        const stepLines = forgotPasswordModal.querySelectorAll('.step-line');

        stepCircles[0].classList.remove('active');
        stepCircles[0].classList.add('completed');
        stepCircles[1].classList.add('active');
        stepLines[0].classList.add('active');

        // 聚焦到新密码输入框
        newPasswordInput.focus();
    };

    const goToStep1 = () => {
        // 显示第1步，隐藏第2步
        step2Container.classList.add('hidden');
        step1Container.classList.remove('hidden');

        // 重置步骤指示器
        const stepCircles = forgotPasswordModal.querySelectorAll('.step-circle');
        const stepLines = forgotPasswordModal.querySelectorAll('.step-line');

        stepCircles[0].classList.remove('completed');
        stepCircles[0].classList.add('active');
        stepCircles[1].classList.remove('active');
        stepLines[0].classList.remove('active');

        // 聚焦到验证码输入框
        verificationCodeInput.focus();
    };

    // 下一步按钮事件
    nextStepBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const verificationCode = verificationCodeInput.value.trim();

        if (!isValidEmail(email)) {
            showToast('请输入有效的邮箱地址', 'error');
            return;
        }

        if (!verificationCode) {
            showToast('请输入验证码', 'error');
            return;
        }

        // 简单的验证码验证（实际项目中可能需要服务器验证）
        if (verificationCode.length < 4) {
            showToast('请输入有效的验证码', 'error');
            return;
        }

        goToStep2();
    });

    // 上一步按钮事件
    prevStepBtn.addEventListener('click', goToStep1);

    // 发送验证码
    sendForgotPasswordCodeBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();

        // 自动填充模式下直接使用预填充的邮箱
        const targetEmail = mode === 'auto-fill' ? email : email;

        if (!targetEmail && mode === 'manual-input') {
            showToast('请先输入邮箱地址', 'error');
            return;
        }

        if (!isValidEmail(targetEmail)) {
            showToast('请输入有效的邮箱地址', 'error');
            return;
        }

        try {
            sendForgotPasswordCodeBtn.disabled = true;
            sendForgotPasswordCodeBtn.textContent = '发送中...';

            const response = await apiRequest(`${API_USERSERVICE_URL}/api/users/email/verify/send-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: targetEmail })
            });

            const result = await response.json();

            if (response.ok) {
                showToast('验证码已发送，请查收邮箱', 'success');

                // 开始倒计时
                let countdown = 60;
                sendForgotPasswordCodeBtn.textContent = `重新发送(${countdown}s)`;

                const timer = setInterval(() => {
                    countdown--;
                    sendForgotPasswordCodeBtn.textContent = `重新发送(${countdown}s)`;
                    if (countdown === 0) {
                        clearInterval(timer);
                        sendForgotPasswordCodeBtn.textContent = '发送验证码';
                        sendForgotPasswordCodeBtn.disabled = false;
                    }
                }, 1000);
            } else {
                showToast(`发送验证码失败: ${result.message || result.error || '未知错误'}`, 'error');
                sendForgotPasswordCodeBtn.disabled = false;
                sendForgotPasswordCodeBtn.textContent = '发送验证码';
            }
        } catch (error) {
            console.error('发送验证码失败:', error);
            showToast('网络错误，请检查网络连接', 'error');
            sendForgotPasswordCodeBtn.disabled = false;
            sendForgotPasswordCodeBtn.textContent = '发送验证码';
        }
    });

    // 确认修改密码
    confirmForgotPasswordBtn.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // 只验证密码（邮箱验证已在第1步完成）
        if (newPassword.length < 6 || newPassword.length > 100) {
            showToast('新密码长度必须在6-100个字符之间', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('两次输入的新密码不一致', 'error');
            return;
        }

        try {
            confirmForgotPasswordBtn.disabled = true;
            confirmForgotPasswordBtn.textContent = '修改中...';

            // 从第1步获取邮箱和验证码
            const email = emailInput.value.trim();
            const verificationCode = verificationCodeInput.value.trim();

            const response = await apiRequest(`${API_USERSERVICE_URL}/api/users/email/change/password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    verificationCode: verificationCode,
                    newPassword: newPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                showToast('密码修改成功!', 'success');
                closeForgotPasswordModal();
            } else {
                showToast(`修改密码失败: ${result.message || result.error || '未知错误'}`, 'error');
                confirmForgotPasswordBtn.disabled = false;
                confirmForgotPasswordBtn.textContent = '确认修改';
            }
        } catch (error) {
            console.error('修改密码失败:', error);
            showToast('网络错误，请检查网络连接', 'error');
            confirmForgotPasswordBtn.disabled = false;
            confirmForgotPasswordBtn.textContent = '确认修改';
        }
    });
}