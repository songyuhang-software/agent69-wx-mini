/**
 * 焦点管理模块
 * 用于管理弹窗的焦点状态,防止焦点残留和样式污染
 */

/**
 * 清除所有焦点状态
 * @param {Array} modalStack - 弹窗栈数组
 */
export function clearAllFocus(modalStack = []) {
    // 清除当前活动元素的焦点
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
    }

    // 清除所有弹窗的焦点状态
    modalStack.forEach(modal => {
        if (modal.element) {
            hideModalFocus(modal.element);
        }
    });
}

/**
 * 隐藏指定弹窗的焦点状态
 * @param {HTMLElement} modalElement - 弹窗元素
 */
export function hideModalFocus(modalElement) {
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll(
        'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
        // 移除焦点
        if (element === document.activeElement) {
            element.blur();
        }

        // 添加临时类来隐藏焦点样式
        element.classList.add('modal-focus-hidden');

        // 移动端专用:添加触摸事件监听器
        if (!element._touchListenersAdded) {
            element.addEventListener('touchend', function(e) {
                // 触摸结束后立即移除焦点
                setTimeout(() => {
                    if (this && typeof this.blur === 'function') {
                        this.blur();
                    }
                }, 0);
            }, { passive: true });
            element._touchListenersAdded = true;
        }
    });

    // 为弹窗元素添加标记
    modalElement.classList.add('modal-focus-hidden-container');

    // 移动端专用:延迟再次确认焦点被移除
    setTimeout(() => {
        if (document.activeElement &&
            document.activeElement !== document.body &&
            modalElement.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    }, 50);
}

/**
 * 恢复焦点状态
 * @param {HTMLElement} modalElement - 弹窗元素
 */
export function restoreFocus(modalElement) {
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll(
        'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
        // 移除临时类
        element.classList.remove('modal-focus-hidden');
    });

    // 移除弹窗的标记
    modalElement.classList.remove('modal-focus-hidden-container');
}

/**
 * 焦点管理函数(用于兼容旧代码)
 * @param {HTMLElement} modal - 弹窗元素
 * @param {string} action - 操作类型: 'hide' | 'restore'
 */
export function manageModalFocus(modal, action) {
    if (!modal) return;

    if (action === 'hide') {
        hideModalFocus(modal);
    } else if (action === 'restore') {
        restoreFocus(modal);
    }
}

/**
 * 初始化全局焦点管理样式
 * 确保焦点管理样式只添加一次
 */
export function initGlobalFocusStyles() {
    if (document.querySelector('#modal-focus-management-styles')) return;

    const style = document.createElement('style');
    style.id = 'modal-focus-management-styles';
    style.textContent = `
        /* 移动端专用:禁用触摸高亮 */
        * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
        }

        /* 移动端:禁用按钮的触摸反馈 */
        button, a, input, textarea, select {
            -webkit-tap-highlight-color: transparent;
        }

        /* 隐藏被标记元素的焦点样式 */
        .modal-focus-hidden:focus {
            outline: none !important;
            box-shadow: none !important;
        }

        /* 移动端:隐藏 active 状态 */
        .modal-focus-hidden:active {
            outline: none !important;
            box-shadow: none !important;
            background-color: inherit !important;
        }

        /* 隐藏被标记容器内所有元素的焦点样式 */
        .modal-focus-hidden-container *:focus {
            outline: none !important;
            box-shadow: none !important;
        }

        /* 移动端:隐藏容器内所有元素的 active 状态 */
        .modal-focus-hidden-container *:active {
            outline: none !important;
            box-shadow: none !important;
        }

        /* 确保在弹窗打开时,底层元素不显示焦点 */
        .modal-focus-hidden-container button:focus,
        .modal-focus-hidden-container input:focus,
        .modal-focus-hidden-container textarea:focus,
        .modal-focus-hidden-container select:focus,
        .modal-focus-hidden-container a:focus {
            outline: none !important;
            box-shadow: none !important;
            border-color: inherit !important;
        }

        /* 移动端:确保 active 状态也被隐藏 */
        .modal-focus-hidden-container button:active,
        .modal-focus-hidden-container input:active,
        .modal-focus-hidden-container textarea:active,
        .modal-focus-hidden-container select:active,
        .modal-focus-hidden-container a:active {
            outline: none !important;
            box-shadow: none !important;
            background-color: inherit !important;
            transform: none !important;
        }

        /* 为了可访问性,保留键盘导航的焦点样式(仅在非隐藏状态) */
        button:focus-visible,
        input:focus-visible,
        textarea:focus-visible,
        select:focus-visible,
        a:focus-visible {
            outline: 2px solid #007bff;
            outline-offset: 2px;
        }

        /* 但在隐藏状态下,即使是键盘导航也不显示 */
        .modal-focus-hidden:focus-visible,
        .modal-focus-hidden-container *:focus-visible {
            outline: none !important;
        }

        /* 移动端专用:防止按钮在触摸时改变样式 */
        @media (hover: none) and (pointer: coarse) {
            .modal-focus-hidden-container button,
            .modal-focus-hidden-container a,
            .modal-focus-hidden-container input,
            .modal-focus-hidden-container textarea,
            .modal-focus-hidden-container select {
                -webkit-tap-highlight-color: transparent !important;
            }

            .modal-focus-hidden-container button:focus,
            .modal-focus-hidden-container button:active {
                outline: none !important;
                box-shadow: none !important;
                opacity: 1 !important;
            }
        }
    `;
    document.head.appendChild(style);
}
