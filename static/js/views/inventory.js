/**
 * Inventory view — item list with search, filters, and inline quantity controls
 * Items sharing the same name are grouped into a single card with per-location sub-rows.
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

  // Single-item card (unchanged appearance)
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

  // Per-location sub-row inside a grouped card
  function renderLocationRow(item) {
    const expiry = item.expiration_date
      ? `<span class="item-meta-tag">📅 ${formatDate(item.expiration_date)}</span>`
      : '';
    const notesTag = item.notes
      ? `<span class="item-meta-tag" title="${escapeHtml(item.notes)}">📝</span>`
      : '';
    const statusBadges = renderBadges(item);

    return `
      <div class="item-location-row" data-id="${item.id}">
        <div class="item-location-row-meta">
          <span class="item-meta-tag">📍 ${item.location ? escapeHtml(item.location.name) : 'No location'}</span>
          ${expiry}
          ${notesTag}
          ${statusBadges ? `<span class="item-location-badges">${statusBadges}</span>` : ''}
        </div>
        <div class="item-location-row-controls">
          <div class="quantity-controls">
            <button class="qty-btn" data-action="dec" data-id="${item.id}" title="Decrease">−</button>
            <span class="quantity-display">${item.quantity}</span>
            ${item.unit ? `<span class="quantity-unit">${escapeHtml(item.unit)}</span>` : ''}
            <button class="qty-btn" data-action="inc" data-id="${item.id}" title="Increase">+</button>
          </div>
          <div class="item-actions" style="border-top:none;padding-top:0">
            <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${item.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${item.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  // Grouped card for items with same name across multiple locations
  function renderGroupedCard(group) {
    // Aggregate status
    const anyExpired = group.some(i => i.is_expired);
    const anyExpiring = group.some(i => i.is_expiring_soon);
    const anyLow = group.some(i => i.is_low);
    const statusClass = anyExpired ? 'is-expired' : anyExpiring ? 'is-expiring-soon' : anyLow ? 'is-low' : '';

    const totalQty = group.reduce((sum, i) => sum + i.quantity, 0);
    const unit = group[0].unit || '';
    const category = group[0].category;

    const aggBadges = [];
    if (anyExpired) aggBadges.push('<span class="badge badge-danger">Expired</span>');
    else if (anyExpiring) aggBadges.push('<span class="badge badge-warning">Expiring Soon</span>');
    if (anyLow && !anyExpired) aggBadges.push('<span class="badge badge-info">Low Stock</span>');

    return `
      <div class="item-card item-card-grouped ${statusClass}">
        <div class="item-card-header">
          <div class="item-name">${escapeHtml(group[0].name)}</div>
          <div class="item-badges">${aggBadges.join('')}</div>
        </div>
        <div class="item-grouped-summary">
          ${category ? `<span class="item-meta-tag">🏷 ${escapeHtml(category.name)}</span>` : ''}
          <span class="item-meta-tag item-total-qty">Total: ${totalQty}${unit ? ' ' + escapeHtml(unit) : ''}</span>
          <span class="item-meta-tag badge-neutral">${group.length} locations</span>
        </div>
        <div class="item-location-rows">
          ${group.map(renderLocationRow).join('')}
        </div>
      </div>
    `;
  }

  // Group items by normalised name; returns array of render results
  function renderItems(items) {
    const groups = new Map();
    for (const item of items) {
      const key = item.name.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }

    const cards = [];
    for (const group of groups.values()) {
      if (group.length === 1) {
        cards.push(renderItem(group[0]));
      } else {
        cards.push(renderGroupedCard(group));
      }
    }
    return cards.join('');
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

  // When a location filter is active, filter within grouped cards too:
  // Show grouped card only if at least one entry matches; show only matching sub-rows.
  function applyFiltersGrouped(items) {
    if (!_filters.location_id) return applyFilters(items);

    // Filter + group simultaneously to support "only show matching sub-rows"
    const filtered = applyFilters(items);
    return filtered;
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

      // Re-render the affected card (may be single or grouped)
      const card = document.querySelector(`.item-card[data-id="${id}"]`);
      if (card) {
        // Single-item card
        card.outerHTML = renderItem(updated);
      } else {
        // It's in a grouped card — re-render the whole group
        const locRow = document.querySelector(`.item-location-row[data-id="${id}"]`);
        if (locRow) {
          const groupCard = locRow.closest('.item-card-grouped');
          if (groupCard) {
            const key = updated.name.toLowerCase().trim();
            const group = _items.filter(i => i.name.toLowerCase().trim() === key);
            groupCard.outerHTML = renderGroupedCard(group);
          }
        }
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
      rerender(document.querySelector('.inventory-view'));
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

    const filtered = applyFiltersGrouped(_items);
    if (filtered.length === 0) {
      renderEmptyState(grid);
    } else {
      grid.innerHTML = renderItems(filtered);
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

  async function refresh() {
    try {
      _items = await API.items.list();
      App.state.items = _items;
      const container = document.querySelector('.inventory-view');
      if (container) rerender(container);
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
