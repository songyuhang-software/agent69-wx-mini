/**
 * 自定义确认弹窗组件
 * 用于替代原生的 confirm 和 prompt，避免移动端兼容性问题
 */

import modalManager from '../modal/ModalManager.js';

/**
 * 显示自定义确认弹窗
 * @param {Object} options - 配置选项
 * @param {string} options.title - 标题
 * @param {string} options.message - 确认消息
 * @param {string} options.confirmText - 确认按钮文字
 * @param {string} options.cancelText - 取消按钮文字
 * @param {string} options.dangerType - 是否为危险操作（红色按钮）
 * @returns {Promise<boolean>} - 返回用户选择结果
 */
export function showConfirmModal(options = {}) {
    return new Promise((resolve) => {
        const {
            title = '确认操作',
            message = '确定要执行此操作吗？',
            confirmText = '确定',
            cancelText = '取消',
            dangerType = false
        } = options;

        // 创建确认弹窗
        const confirmModal = document.createElement('div');
        confirmModal.className = 'confirm-modal';
        confirmModal.innerHTML = `
            <div class="confirm-modal-overlay">
                <div class="confirm-modal-content">
                    <div class="confirm-modal-header">
                        <h3 class="confirm-modal-title">${title}</h3>
                    </div>
                    <div class="confirm-modal-body">
                        <p class="confirm-modal-message">${message}</p>
                    </div>
                    <div class="confirm-modal-footer">
                        <button type="button" class="confirm-btn ${dangerType ? 'danger' : ''}" id="confirmBtn">
                            ${confirmText}
                        </button>
                        <button type="button" class="cancel-btn" id="cancelBtn">
                            ${cancelText}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(confirmModal);

        // 使用弹窗管理器注册弹窗
        modalManager.pushModal('confirmModal', confirmModal, null, () => {
            document.body.removeChild(confirmModal);
        });

        // 绑定事件
        const confirmBtn = confirmModal.querySelector('#confirmBtn');
        const cancelBtn = confirmModal.querySelector('#cancelBtn');
        const overlay = confirmModal.querySelector('.confirm-modal-overlay');

        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modalManager.closeModal('confirmModal');
        };

        // 事件绑定
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleCancel();
            }
        });

        // ESC 键处理
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        };
        document.addEventListener('keydown', handleKeydown);

        // 清理事件监听器
        confirmModal.cleanup = () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    });
}