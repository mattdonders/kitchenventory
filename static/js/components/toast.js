/**
 * Toast notification system
 * Usage: Toast.show('Message', 'success' | 'error' | 'info' | 'warning')
 */
const Toast = (() => {
  const ICONS = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  function show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${ICONS[type] || 'ℹ'}</span>
      <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();
