/**
 * 弹窗层级管理系统
 * 负责管理多层弹窗的栈、历史记录、手势返回等功能
 */

import { clearAllFocus, hideModalFocus, restoreFocus, initGlobalFocusStyles } from './focusManagement.js';

class ModalManager {
    constructor() {
        this.modalStack = []; // 弹窗栈
        this.isInitialized = false;
        this.isHandlingPopstate = false; // 防止递归处理
        this.initEventListeners();
    }

    // 初始化事件监听
    initEventListeners() {
        if (this.isInitialized) return;

        // 监听浏览器返回键
        window.addEventListener('popstate', (e) => {
            if (this.isHandlingPopstate) return;

            this.isHandlingPopstate = true;

            // 从 state 中读取目标层级
            const targetLevel = (e.state && e.state.modalLevel) || 0;

            // 关闭多余的弹窗(从栈顶开始)
            while (this.modalStack.length > targetLevel) {
                const modal = this.getCurrentModal();
                if (modal) {
                    this.closeModalInternal(modal.id, false); // false 表示不操作历史记录
                }
            }

            this.isHandlingPopstate = false;
        });

        // 监听移动端手势返回 (通过监听touch事件模拟)
        let startX = 0;
        let startY = 0;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!this.modalStack.length) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = endX - startX;
            const diffY = Math.abs(endY - startY);

            // 检测从屏幕左边缘向右滑动手势
            if (startX < 30 && diffX > 100 && diffY < 50) {
                // 手势触发回退,使用 history.back()
                if (this.modalStack.length > 0) {
                    history.back();
                }
            }
        }, { passive: true });

        this.isInitialized = true;
    }

    // 添加弹窗到栈中
    pushModal(modalId, modalElement, parentModalId = null, cleanupCallback = null) {
        // 立即移除当前焦点,防止焦点状态残留
        const currentFocused = document.activeElement;
        if (currentFocused && currentFocused !== document.body) {
            currentFocused.blur();
        }

        // 如果有父弹窗,隐藏父弹窗中所有元素的焦点状态
        if (parentModalId) {
            const parentModal = this.modalStack.find(m => m.id === parentModalId);
            if (parentModal && parentModal.element) {
                hideModalFocus(parentModal.element);
            }
        } else {
            // 如果是一级弹窗,清除页面上所有焦点
            clearAllFocus(this.modalStack);
        }

        // 添加到栈中
        this.modalStack.push({
            id: modalId,
            element: modalElement,
            parentId: parentModalId,
            cleanupCallback: cleanupCallback, // 重命名为 cleanupCallback,只负责清理
            timestamp: Date.now()
        });

        // 推入历史记录
        const modalLevel = this.modalStack.length;
        history.pushState({ modalLevel }, '', `#modal-${modalLevel}`);

        // 延迟执行,确保 DOM 已渲染
        setTimeout(() => {
            // 再次确保父弹窗的焦点被清除
            if (parentModalId) {
                const parentModal = this.modalStack.find(m => m.id === parentModalId);
                if (parentModal && parentModal.element) {
                    hideModalFocus(parentModal.element);
                }
            }
        }, 0);
    }

    // 统一的关闭弹窗方法(对外接口)
    closeModal(modalId) {
        this.closeModalInternal(modalId, true); // true 表示需要操作历史记录
    }

    // 内部关闭方法
    closeModalInternal(modalId, shouldUpdateHistory) {
        const index = this.modalStack.findIndex(m => m.id === modalId);
        if (index === -1) return;

        const modal = this.modalStack[index];

        // 1. 执行清理回调(清理 DOM、恢复父弹窗状态等)
        if (modal.cleanupCallback) {
            modal.cleanupCallback();
        }

        // 2. 从栈中移除
        this.modalStack.splice(index, 1);

        // 3. 恢复父弹窗焦点
        if (modal.parentId && this.modalStack.length > 0) {
            const parentModal = this.modalStack.find(m => m.id === modal.parentId);
            if (parentModal && parentModal.element) {
                restoreFocus(parentModal.element);
            }
        }

        // 4. 同步历史记录
        if (shouldUpdateHistory) {
            this.syncHistory();
        }
    }

    // 同步历史记录
    syncHistory() {
        const targetLevel = this.modalStack.length;

        if (targetLevel === 0) {
            // 所有弹窗都关闭,清除 hash
            if (window.location.hash.includes('modal')) {
                const originalUrl = window.location.pathname + window.location.search;
                history.replaceState({}, '', originalUrl);
            }
        } else {
            // 需要同步历史记录到正确层级
            const currentHash = window.location.hash;
            const targetHash = `#modal-${targetLevel}`;

            if (currentHash !== targetHash) {
                // 直接替换历史记录状态，避免使用history.go()引发递归
                history.replaceState({ modalLevel: targetLevel }, '', targetHash);
            }
        }
    }

    // 获取当前历史记录的层级
    getCurrentHistoryLevel() {
        const hash = window.location.hash;
        const match = hash.match(/#modal-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    // 从栈中移除弹窗(保留用于兼容性,内部使用 closeModal)
    popModal(modalId = null) {
        if (!this.modalStack.length) return null;

        // 如果指定了modalId,找到对应的弹窗
        if (modalId) {
            this.closeModal(modalId);
            return null;
        }

        // 默认弹出栈顶弹窗
        const currentModal = this.getCurrentModal();
        if (currentModal) {
            this.closeModal(currentModal.id);
        }
        return null;
    }

    // 获取当前栈顶弹窗
    getCurrentModal() {
        return this.modalStack[this.modalStack.length - 1] || null;
    }

    // 获取弹窗数量
    getModalCount() {
        return this.modalStack.length;
    }

    // 清空弹窗栈
    clearStack() {
        while (this.modalStack.length > 0) {
            const modal = this.getCurrentModal();
            if (modal) {
                this.closeModalInternal(modal.id, false);
            }
        }

        // 清除历史记录
        if (window.location.hash.includes('modal')) {
            const originalUrl = window.location.pathname + window.location.search;
            history.replaceState({}, '', originalUrl);
        }
    }
}

// 创建全局弹窗管理器实例
const modalManager = new ModalManager();

// 初始化全局焦点管理样式
initGlobalFocusStyles();

// 导出全局实例
export default modalManager;
export { ModalManager };

