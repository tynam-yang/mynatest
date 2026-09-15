// core/utils.js — UI 工具函数（全局）

window.MynaUtils = {
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * 顶部 toast 提示
   * @param {string} msg   提示文字
   * @param {boolean|number} [opts=false]  传 boolean 则是 isError；传 number 则是 duration（ms）
   * @param {number} [duration=2000]       当 opts 是 boolean 时，可显式指定停留时间
   */
  flashMessage(msg, opts = false, duration = 2000) {
    let isError = false;
    let dur = duration;
    if (typeof opts === 'boolean') {
      isError = opts;
    } else if (typeof opts === 'number') {
      dur = opts;  // 把第二个参数当 duration（常见误用兼容）
    }

    let el = document.getElementById('mynatest-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mynatest-flash';
      document.body.appendChild(el);
    }

    el.style.cssText = `
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      padding: 8px 16px; border-radius: 6px; font-size: 12px; z-index: 9999;
      background: ${isError ? '#e74c3c' : '#27ae60'}; color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15); opacity: 1;
      transition: opacity 0.3s;
    `;
    el.textContent = msg;

    if (window.MynaUtils._flashTimer) clearTimeout(window.MynaUtils._flashTimer);
    window.MynaUtils._flashTimer = setTimeout(() => { el.style.opacity = '0'; }, dur);
  }
};
