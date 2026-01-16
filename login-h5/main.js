import { refreshAccessToken, API_USERSERVICE_URL, isTokenExpiringSoon } from '../../js/common.js';
import { showToast } from '../../js/utils/toast.js';
import { saveRefreshToken } from '../../js/adapters/index.js';

// 动态导入忘记密码弹窗
let showForgotPasswordModal;
async function importForgotPasswordModal() {
    if (!showForgotPasswordModal) {
        const module = await import('../../js/user/forgotPasswordModal.js');
        showForgotPasswordModal = module.showForgotPasswordModal;
    }
}

// ============ 初始化 ============
async function initializeLogin() {
    const accessToken = localStorage.getItem('accessToken');

    // 如果有 token 且未过期，直接跳转到 agent_list
    if (accessToken && !isTokenExpiringSoon(accessToken)) {
        console.log('Access token found and valid, redirecting to agent_list');
        window.location.href = '../agent_list/index.html';
        return;
    }

    // 如果 token 即将过期，尝试刷新
    if (!accessToken || isTokenExpiringSoon(accessToken)) {
        console.log('Access token is expiring soon, attempting to refresh...');
        try {
            const newToken = await refreshAccessToken();
            if (newToken) {
                localStorage.setItem('accessToken', newToken);
                console.log('Access token refreshed, redirecting to agent_list');
                window.location.href = '../agent_list/index.html';
                return;
            }
        } catch (error) {
            console.error('Failed to refresh access token:', error);
            // 刷新失败，清除旧 token，让用户重新登录
            localStorage.removeItem('accessToken');
        }
    }

    // 没有 token 或刷新失败，保持在登录页面
    console.log('No valid access token, staying on login page');
}

// ============ 选项卡切换 ============
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // 移除所有活跃状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 添加当前选项卡的活跃状态
            button.classList.add('active');
            document.getElementById(`${tabName}-content`).classList.add('active');

            // 清除所有错误信息
            hideError('username-error');
            hideError('email-error');

            // 如果切换到邮箱登录 tab，检查输入框状态（处理自动填充）
            if (tabName === 'email') {
                // 使用 requestAnimationFrame 确保 DOM 已更新
                requestAnimationFrame(() => {
                    const emailInput = document.getElementById('email');
                    const sendCodeBtn = document.getElementById('send-code-btn');
                    if (emailInput && sendCodeBtn && !sendCodeBtn.dataset.countdown) {
                        const email = emailInput.value || '';
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        sendCodeBtn.disabled = !emailRegex.test(email);
                    }
                });
            }
        });
    });
}

// 工具函数
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = message ? 'block' : 'none';
    }
}

function hideError(errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

// ============ 用户名密码登录 ============
function initUsernameLogin() {
    const form = document.getElementById('username-form');
    const submitButton = form?.querySelector('button[type="submit"]');
    const usernameInput = document.getElementById('username');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const forgotPasswordLink = form?.querySelector('a[href="#"]');

    // 页面加载时，检查是否有保存的用户名
    const savedUsername = localStorage.getItem('savedUsername');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        rememberMeCheckbox.checked = true;
    }

    // 绑定忘记密码链接事件
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            // 动态导入忘记密码弹窗
            await importForgotPasswordModal();
            showForgotPasswordModal({
                mode: 'manual-input',
                email: '',
                parentModal: null
            });
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value;
            const password = document.getElementById('password').value;
            const rememberMe = rememberMeCheckbox.checked;

            console.log('Username login attempt:', { username, rememberMe });

            // 禁用提交按钮，防止重复提交
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = '登录中...';
            }

            // 清除之前的错误信息
            hideError('username-error');

            try {
                const response = await fetch(`${API_USERSERVICE_URL}/api/users/login/username`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || errorData.message || `登录失败: ${response.status}`);
                }

                const data = await response.json();
                console.log('Username login response:', data);

                // 保存token和用户信息
                if (data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('loginType', data.type || 'username');

                    // 保存 refreshToken 到 cookie
                    if (data.refreshToken) {
                        saveRefreshToken(data.refreshToken);
                    }

                    // 保存用户ID
                    if (data.userId) {
                        localStorage.setItem('userId', data.userId);
                    }

                    // 根据"记住我"选项决定是否保存用户名
                    if (rememberMe) {
                        localStorage.setItem('savedUsername', username);
                    } else {
                        localStorage.removeItem('savedUsername');
                    }

                    // 当前会话的用户名（总是保存）
                    localStorage.setItem('username', data.username || username);

                    // 保存用户信息（使用返回的完整数据结构）
                    const userInfo = {
                        id: data.id,
                        userId: data.userId,
                        username: data.username,
                        email: data.email,
                        type: data.type
                    };
                    localStorage.setItem('userInfo', JSON.stringify(userInfo));

                    console.log('Login successful, redirecting to agent_list');
                    window.location.href = '../agent_list/index.html';
                } else {
                    throw new Error('服务器未返回有效的访问令牌');
                }
            } catch (error) {
                console.error('Login failed:', error);
                showError('username-error', `登录失败: ${error.message}`);

                // 恢复提交按钮
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = '登录';
                }
            }
        });
    }
}

// ============ 邮箱登录 ============
function initEmailLogin() {
    const form = document.getElementById('email-form');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const submitButton = form?.querySelector('button[type="submit"]');
    const emailInput = document.getElementById('email');

    // 邮箱格式验证函数
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 更新发送验证码按钮状态
    function updateSendCodeButtonState() {
        const email = emailInput?.value || '';
        if (sendCodeBtn && !sendCodeBtn.dataset.countdown) {
            sendCodeBtn.disabled = !isValidEmail(email);
        }
    }

    // 监听邮箱输入框的变化
    if (emailInput) {
        // 监听手动输入（实时验证）
        emailInput.addEventListener('input', updateSendCodeButtonState);

        // 监听自动填充和失去焦点（处理浏览器自动填充）
        emailInput.addEventListener('change', updateSendCodeButtonState);

        // 监听失去焦点（额外保障）
        emailInput.addEventListener('blur', updateSendCodeButtonState);

        // 页面加载时也检查一次
        updateSendCodeButtonState();
    }

    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;

            if (!email) {
                showError('email-error', '请先输入邮箱地址');
                return;
            }

            // 验证邮箱格式
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('email-error', '请输入有效的邮箱地址');
                return;
            }

            // 清除之前的错误信息
            hideError('email-error');

            console.log('Sending verification code to:', email);

            // 禁用按钮，防止重复点击
            sendCodeBtn.disabled = true;
            sendCodeBtn.textContent = '发送中...';

            try {
                const response = await fetch(`${API_USERSERVICE_URL}/api/users/login/email/send-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || errorData.message || `发送验证码失败: ${response.status}`);
                }

                console.log('Verification code sent successfully');
                showToast('验证码已发送，请查收邮箱', 'success');

                // 清除错误信息并显示成功消息
                hideError('email-error');

                sendCodeBtn.textContent = '验证码已发送';
                sendCodeBtn.dataset.countdown = 'true'; // 标记正在倒计时

                // 60秒后恢复按钮
                let countdown = 60;
                const timer = setInterval(() => {
                    countdown--;
                    sendCodeBtn.textContent = `重新发送(${countdown}s)`;
                    if (countdown === 0) {
                        clearInterval(timer);
                        sendCodeBtn.textContent = '发送验证码';
                        delete sendCodeBtn.dataset.countdown; // 移除倒计时标记
                        updateSendCodeButtonState(); // 重新检查邮箱格式
                    }
                }, 1000);
            } catch (error) {
                console.error('Failed to send verification code:', error);
                showError('email-error', `发送验证码失败: ${error.message}`);

                // 恢复按钮
                sendCodeBtn.textContent = '发送验证码';
                sendCodeBtn.disabled = false;
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const verificationCode = document.getElementById('email-code').value;

            console.log('Email login attempt:', { email, verificationCode });

            if (!verificationCode) {
                showError('email-error', '请输入验证码');
                return;
            }

            // 清除之前的错误信息
            hideError('email-error');

            // 禁用提交按钮，防止重复提交
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = '登录中...';
            }

            try {
                const response = await fetch(`${API_USERSERVICE_URL}/api/users/login/email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, verificationCode })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || errorData.message || `登录失败: ${response.status}`);
                }

                const data = await response.json();
                console.log('Email login response:', data);

                // 保存token和用户信息
                if (data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('loginType', data.type || 'email');

                    // 保存 refreshToken 到 cookie
                    if (data.refreshToken) {
                        saveRefreshToken(data.refreshToken);
                    }

                    // 保存用户ID
                    if (data.userId) {
                        localStorage.setItem('userId', data.userId);
                    }

                    // 保存邮箱
                    localStorage.setItem('email', data.email || email);

                    // 保存用户信息（使用返回的完整数据结构）
                    const userInfo = {
                        id: data.id,
                        userId: data.userId,
                        username: data.username,
                        email: data.email,
                        type: data.type
                    };
                    localStorage.setItem('userInfo', JSON.stringify(userInfo));

                    console.log('Email login successful, redirecting to agent_list');
                    window.location.href = '../agent_list/index.html';
                } else {
                    throw new Error('服务器未返回有效的访问令牌');
                }
            } catch (error) {
                console.error('Email login failed:', error);
                showError('email-error', `登录失败: ${error.message}`);

                // 恢复提交按钮
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = '登录';
                }
            }
        });
    }
}

// ============ 游客登录 ============
function initGuestLogin() {
    const guestLink = document.getElementById('guest-link');

    if (guestLink) {
        guestLink.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Guest login initiated');

            // 清除之前的错误信息
            hideError('guest-error');

            // 禁用链接，防止重复点击
            guestLink.style.pointerEvents = 'none';
            guestLink.textContent = '登录中...';

            try {
                const response = await fetch(`${API_USERSERVICE_URL}/api/users/login/guest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || errorData.message || `游客登录失败: ${response.status}`);
                }

                const data = await response.json();
                console.log('Guest login response:', data);

                // 保存 accessToken（最重要）
                if (data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('loginType', data.type || 'guest');
                    localStorage.setItem('isGuest', 'true');

                    // 保存 refreshToken 到 cookie
                    if (data.refreshToken) {
                        saveRefreshToken(data.refreshToken);
                    }

                    // 保存用户ID
                    if (data.userId) {
                        localStorage.setItem('userId', data.userId);
                    }

                    // 保存其他用户信息（如果有的话）
                    const userInfo = {
                        id: data.id,
                        userId: data.userId,
                        username: data.username,
                        email: data.email,
                        type: data.type
                    };
                    localStorage.setItem('userInfo', JSON.stringify(userInfo));

                    console.log('Guest login successful, redirecting to agent_list');
                    window.location.href = '../agent_list/index.html';
                } else {
                    throw new Error('服务器未返回有效的访问令牌');
                }
            } catch (error) {
                console.error('Guest login failed:', error);
                showError('guest-error', `游客登录失败: ${error.message}`);

                // 恢复链接状态
                guestLink.style.pointerEvents = 'auto';
                guestLink.textContent = '以游客身份继续';
            }
        });
    }
}

// ============ 密码显示/隐藏切换 ============
function initPasswordToggle() {
    console.log('初始化密码显示/隐藏功能...');

    const toggleButtons = document.querySelectorAll('.toggle-password-btn');

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

// ============ 页面加载时初始化 ============
window.addEventListener('load', () => {
    initializeLogin();
    initTabs();
    initUsernameLogin();
    initEmailLogin();
    initGuestLogin();
    initPasswordToggle();
});