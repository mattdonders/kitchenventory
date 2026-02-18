/**
 * Confirm modal dialog
 * Usage: Modal.confirm('Title', 'Body text').then(confirmed => { ... })
 */
const Modal = (() => {
  function confirm(title, body) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modal-overlay');
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').textContent = body;
      overlay.classList.remove('hidden');

      function cleanup() {
        overlay.classList.add('hidden');
        document.getElementById('modal-confirm').onclick = null;
        document.getElementById('modal-cancel').onclick = null;
      }

      document.getElementById('modal-confirm').onclick = () => {
        cleanup();
        resolve(true);
      };

      document.getElementById('modal-cancel').onclick = () => {
        cleanup();
        resolve(false);
      };

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      };
    });
  }

  return { confirm };
})();
