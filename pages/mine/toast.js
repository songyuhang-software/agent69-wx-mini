/**
 * Toast 提示组件
 * 用于显示优雅的提示消息
 */

/**
 * 显示 Toast 提示
 * @param {string} message - 提示消息内容
 * @param {string} type - 提示类型: 'success' | 'error' | 'info'
 * @param {number} duration - 显示时长(毫秒)
 */
export function showToast(message, type = 'success', duration = 2000) {
    // 移除已存在的 toast
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.textContent = message;

    // 添加样式（如果还没有添加）
    ensureToastStyles();

    // 添加到 body，确保在所有弹窗之上
    document.body.appendChild(toast);

    // 自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, duration);
}

/**
 * 确保 Toast 样式已添加到页面
 */
function ensureToastStyles() {
    if (document.querySelector('#toast-styles')) return;

    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        .custom-toast {
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 99999;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
            animation: toastSlideDown 0.3s ease, toastSlideUp 0.3s ease 1700ms;
            pointer-events: none;
            max-width: 350px;
            text-align: center;
            word-wrap: break-word;
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .toast-success {
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white;
            border: none;
        }

        .toast-error {
            background: linear-gradient(135deg, #f56565, #e53e3e);
            color: white;
            border: none;
        }

        .toast-info {
            background: linear-gradient(135deg, #4299e1, #3182ce);
            color: white;
            border: none;
        }

        @keyframes toastSlideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-30px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }

        @keyframes toastSlideUp {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-30px) scale(0.9);
            }
        }
    `;
    document.head.appendChild(style);
}



