/**
 * Shopping list view
 */
const ShoppingView = (() => {
  let _items = [];

  function renderItem(item) {
    return `
      <div class="shopping-item ${item.is_checked ? 'checked' : ''}" data-id="${item.id}">
        <div class="shopping-checkbox ${item.is_checked ? 'checked' : ''}" data-action="toggle" data-id="${item.id}">
          ${item.is_checked ? '✓' : ''}
        </div>
        <div class="shopping-item-info">
          <div class="shopping-item-name">${escapeHtml(item.name)}</div>
          <div class="shopping-item-qty">${item.quantity} ${escapeHtml(item.unit || '')}</div>
        </div>
        ${item.source === 'auto' ? '<span class="shopping-item-source">auto</span>' : ''}
        <button class="shopping-item-delete btn" data-action="delete" data-id="${item.id}" title="Remove">✕</button>
      </div>
    `;
  }

  function renderList(container) {
    const listEl = container.querySelector('.shopping-list');
    if (!listEl) return;

    if (_items.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <h3>Shopping list is empty</h3>
          <p>Add items manually or use Auto-Suggest to find low-stock items.</p>
        </div>
      `;
      return;
    }

    const unchecked = _items.filter(i => !i.is_checked);
    const checked = _items.filter(i => i.is_checked);

    let html = unchecked.map(renderItem).join('');
    if (checked.length > 0) {
      html += `<div class="section-title mt-16">Checked (${checked.length})</div>`;
      html += checked.map(renderItem).join('');
    }
    listEl.innerHTML = html;
  }

  async function render(container, state) {
    document.getElementById('page-title').textContent = 'Shopping List';

    container.innerHTML = `
      <div class="shopping-view">
        <div class="shopping-header">
          <button class="btn btn-primary btn-sm" id="auto-suggest-btn">✨ Auto-Suggest</button>
          <button class="btn btn-secondary btn-sm" id="export-btn">📋 Copy List</button>
          <button class="btn btn-secondary btn-sm" id="clear-checked-btn">🗑 Clear Checked</button>
        </div>

        <div class="shopping-add-bar">
          <input type="text" id="shopping-add-input" placeholder="Add item…" autocomplete="off" />
          <button class="btn btn-primary" id="shopping-add-btn">Add</button>
        </div>

        <div class="shopping-list">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    bindEvents(container.querySelector('.shopping-view'));

    try {
      _items = await API.shopping.list();
      renderList(container.querySelector('.shopping-view'));
    } catch (err) {
      Toast.show('Failed to load shopping list: ' + err.message, 'error');
    }
  }

  function bindEvents(container) {
    // Auto-suggest
    container.querySelector('#auto-suggest-btn').addEventListener('click', async () => {
      const btn = container.querySelector('#auto-suggest-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Suggesting…';
      try {
        const added = await API.shopping.autoSuggest();
        _items = await API.shopping.list();
        renderList(container);
        if (added.length === 0) {
          Toast.show('No low-stock items to suggest', 'info');
        } else {
          Toast.show(`Added ${added.length} item${added.length > 1 ? 's' : ''} to shopping list`, 'success');
        }
      } catch (err) {
        Toast.show('Error: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '✨ Auto-Suggest';
      }
    });

    // Export
    container.querySelector('#export-btn').addEventListener('click', async () => {
      try {
        const result = await API.shopping.export();
        await navigator.clipboard.writeText(result.text);
        Toast.show('Shopping list copied to clipboard!', 'success');
      } catch (err) {
        Toast.show('Could not copy to clipboard', 'error');
      }
    });

    // Clear checked
    container.querySelector('#clear-checked-btn').addEventListener('click', async () => {
      const checkedCount = _items.filter(i => i.is_checked).length;
      if (checkedCount === 0) {
        Toast.show('No checked items to clear', 'info');
        return;
      }
      const ok = await Modal.confirm('Clear checked items?', `Remove ${checkedCount} checked item${checkedCount > 1 ? 's' : ''}?`);
      if (!ok) return;
      try {
        await API.shopping.clearChecked();
        _items = _items.filter(i => !i.is_checked);
        renderList(container);
        Toast.show('Checked items cleared', 'success');
      } catch (err) {
        Toast.show('Error: ' + err.message, 'error');
      }
    });

    // Quick add
    const addInput = container.querySelector('#shopping-add-input');
    const addBtn = container.querySelector('#shopping-add-btn');

    async function addItem() {
      const name = addInput.value.trim();
      if (!name) return;
      try {
        const item = await API.shopping.add({ name, quantity: 1, source: 'manual' });
        _items.unshift(item);
        renderList(container);
        addInput.value = '';
        addInput.focus();
      } catch (err) {
        Toast.show('Error: ' + err.message, 'error');
      }
    }

    addBtn.addEventListener('click', addItem);
    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addItem();
    });

    // List item actions (delegated)
    container.querySelector('.shopping-list').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = parseInt(btn.dataset.id);
      const action = btn.dataset.action;

      if (action === 'toggle') {
        const item = _items.find(i => i.id === id);
        if (!item) return;
        try {
          const updated = await API.shopping.update(id, { is_checked: !item.is_checked });
          const idx = _items.findIndex(i => i.id === id);
          if (idx !== -1) _items[idx] = updated;
          renderList(container);
        } catch (err) {
          Toast.show('Error: ' + err.message, 'error');
        }
      } else if (action === 'delete') {
        try {
          await API.shopping.delete(id);
          _items = _items.filter(i => i.id !== id);
          renderList(container);
        } catch (err) {
          Toast.show('Error: ' + err.message, 'error');
        }
      }
    });
  }

  return { render };
})();
