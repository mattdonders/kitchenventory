/**
 * Inventory view — item list with search, filters, and inline quantity controls
 */
const InventoryView = (() => {
  let _items = [];
  let _locations = [];
  let _categories = [];
  let _filters = { search: '', location_id: null, low_only: false };
  let _searchTimeout = null;

  function formatDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderBadges(item) {
    const badges = [];
    if (item.is_expired) badges.push('<span class="badge badge-danger">Expired</span>');
    else if (item.is_expiring_soon) badges.push('<span class="badge badge-warning">Expiring Soon</span>');
    if (item.is_low && !item.is_expired) badges.push('<span class="badge badge-info">Low Stock</span>');
    return badges.join('');
  }

  function renderItem(item) {
    const statusClass = item.is_expired ? 'is-expired'
      : item.is_expiring_soon ? 'is-expiring-soon'
      : item.is_low ? 'is-low'
      : '';

    const metaTags = [];
    if (item.category) metaTags.push(`<span class="item-meta-tag">🏷 ${item.category.name}</span>`);
    if (item.location) metaTags.push(`<span class="item-meta-tag">📍 ${item.location.name}</span>`);
    if (item.expiration_date) metaTags.push(`<span class="item-meta-tag">📅 ${formatDate(item.expiration_date)}</span>`);
    if (item.notes) metaTags.push(`<span class="item-meta-tag" title="${item.notes}">📝</span>`);

    return `
      <div class="item-card ${statusClass}" data-id="${item.id}">
        <div class="item-card-header">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-badges">${renderBadges(item)}</div>
        </div>
        ${metaTags.length ? `<div class="item-meta">${metaTags.join('')}</div>` : ''}
        <div class="item-quantity-row">
          <div>
            <span class="quantity-display">${item.quantity}</span>
            ${item.unit ? `<span class="quantity-unit">${escapeHtml(item.unit)}</span>` : ''}
          </div>
          <div class="quantity-controls">
            <button class="qty-btn" data-action="dec" data-id="${item.id}" title="Decrease">−</button>
            <button class="qty-btn" data-action="inc" data-id="${item.id}" title="Increase">+</button>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${item.id}">Edit</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;
  }

  function applyFilters(items) {
    return items.filter(item => {
      if (_filters.search) {
        const s = _filters.search.toLowerCase();
        if (!item.name.toLowerCase().includes(s)) return false;
      }
      if (_filters.location_id && item.location_id !== _filters.location_id) return false;
      if (_filters.low_only && !item.is_low) return false;
      return true;
    });
  }

  function renderLocationChips() {
    return [
      `<button class="chip ${!_filters.location_id ? 'active' : ''}" data-location="">All</button>`,
      ..._locations.map(loc =>
        `<button class="chip ${_filters.location_id === loc.id ? 'active' : ''}" data-location="${loc.id}">${escapeHtml(loc.name)}</button>`
      ),
      `<button class="chip ${_filters.low_only ? 'active' : ''}" data-action="low-toggle">⚠ Low Stock</button>`,
    ].join('');
  }

  function bindEvents(container) {
    // Search
    const searchInput = container.querySelector('#inv-search');
    searchInput.addEventListener('input', (e) => {
      clearTimeout(_searchTimeout);
      _searchTimeout = setTimeout(() => {
        _filters.search = e.target.value;
        rerender(container);
      }, 250);
    });

    // Location chips
    container.querySelector('.filter-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-location]');
      if (chip) {
        _filters.location_id = chip.dataset.location ? parseInt(chip.dataset.location) : null;
        rerender(container);
        return;
      }
      const lowToggle = e.target.closest('[data-action="low-toggle"]');
      if (lowToggle) {
        _filters.low_only = !_filters.low_only;
        rerender(container);
      }
    });

    // Item actions (delegated)
    container.querySelector('.items-grid').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = parseInt(btn.dataset.id);
      const action = btn.dataset.action;

      if (action === 'inc') {
        await adjustQty(id, 1);
      } else if (action === 'dec') {
        await adjustQty(id, -1);
      } else if (action === 'edit') {
        App.navigate('add', { editId: id });
      } else if (action === 'delete') {
        const ok = await Modal.confirm('Delete item?', 'This cannot be undone.');
        if (ok) await deleteItem(id);
      }
    });
  }

  async function adjustQty(id, delta) {
    try {
      const updated = await API.items.adjustQty(id, delta);
      const idx = _items.findIndex(i => i.id === id);
      if (idx !== -1) _items[idx] = updated;
      const card = document.querySelector(`.item-card[data-id="${id}"]`);
      if (card) {
        card.outerHTML = renderItem(updated);
      }
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function deleteItem(id) {
    try {
      await API.items.delete(id);
      _items = _items.filter(i => i.id !== id);
      Toast.show('Item deleted', 'success');
      const card = document.querySelector(`.item-card[data-id="${id}"]`);
      if (card) card.remove();
      if (_items.length === 0) renderEmptyState(document.querySelector('.items-grid'));
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  function renderEmptyState(grid) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="empty-icon">📦</div>
        <h3>No items found</h3>
        <p>Add items to your inventory using the Add tab.</p>
      </div>
    `;
  }

  function rerender(container) {
    const grid = container.querySelector('.items-grid');
    const chips = container.querySelector('.filter-chips');
    chips.innerHTML = renderLocationChips();
    rebindChips(chips);

    const filtered = applyFilters(_items);
    if (filtered.length === 0) {
      renderEmptyState(grid);
    } else {
      grid.innerHTML = filtered.map(renderItem).join('');
    }
  }

  function rebindChips(chipsEl) {
    chipsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-location]');
      if (chip) {
        _filters.location_id = chip.dataset.location ? parseInt(chip.dataset.location) : null;
        rerender(chipsEl.closest('.inventory-view'));
        return;
      }
      const lowToggle = e.target.closest('[data-action="low-toggle"]');
      if (lowToggle) {
        _filters.low_only = !_filters.low_only;
        rerender(chipsEl.closest('.inventory-view'));
      }
    });
  }

  async function render(container, state) {
    container.innerHTML = `
      <div class="inventory-view">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input id="inv-search" type="search" placeholder="Search items…" value="${escapeHtml(_filters.search)}" autocomplete="off" />
        </div>
        <div class="filter-chips">${renderLocationChips()}</div>
        <div class="items-grid">
          <div class="loading-spinner" style="grid-column: 1/-1"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    bindEvents(container.querySelector('.inventory-view'));

    try {
      [_items, _locations, _categories] = await Promise.all([
        API.items.list(),
        API.locations.list(),
        API.categories.list(),
      ]);

      // Update cached state in App
      App.state.items = _items;
      App.state.locations = _locations;
      App.state.categories = _categories;

      rerender(container.querySelector('.inventory-view'));
    } catch (err) {
      Toast.show('Failed to load inventory: ' + err.message, 'error');
      document.querySelector('.items-grid').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">⚠️</div>
          <h3>Error loading inventory</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  // Refresh just the items without rebuilding whole view
  async function refresh() {
    try {
      _items = await API.items.list();
      App.state.items = _items;
      const grid = document.querySelector('.items-grid');
      if (grid) {
        const filtered = applyFilters(_items);
        if (filtered.length === 0) {
          renderEmptyState(grid);
        } else {
          grid.innerHTML = filtered.map(renderItem).join('');
        }
      }
    } catch (err) {
      Toast.show('Failed to refresh items', 'error');
    }
  }

  return { render, refresh };
})();

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
