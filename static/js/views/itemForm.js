/**
 * Item form view — Add/Edit with autocomplete and quick-add mode
 * Persists last category/location to localStorage
 */
const ItemFormView = (() => {
  const LS_CATEGORY = 'kv_last_category';
  const LS_LOCATION = 'kv_last_location';
  const LS_MODE = 'kv_form_mode';

  let _categories = [];
  let _locations = [];
  let _editItem = null;
  let _mode = 'standard'; // 'standard' | 'quickadd'
  let _sessionItems = [];
  let _autocompleteTimer = null;
  let _container = null;

  function getLastCategory() {
    const v = localStorage.getItem(LS_CATEGORY);
    return v ? parseInt(v) : null;
  }

  function getLastLocation() {
    const v = localStorage.getItem(LS_LOCATION);
    return v ? parseInt(v) : null;
  }

  function getLastMode() {
    return localStorage.getItem(LS_MODE) || 'standard';
  }

  function renderPills(items, selected, type) {
    return items.map(item => `
      <button type="button" class="pill ${selected === item.id ? 'selected' : ''}"
        data-type="${type}" data-id="${item.id}">${escapeHtml(item.name)}</button>
    `).join('');
  }

  function buildModeToggle() {
    return `
      <div class="mode-toggle-row">
        <div class="mode-toggle">
          <button type="button" class="mode-btn ${_mode === 'standard' ? 'active' : ''}" data-mode="standard">Standard</button>
          <button type="button" class="mode-btn ${_mode === 'quickadd' ? 'active' : ''}" data-mode="quickadd">Quick Add</button>
        </div>
        <button type="button" class="btn-link import-link" id="go-import">
          <i class="fa-solid fa-list-check"></i> Import from list
        </button>
      </div>
    `;
  }

  function buildForm(item) {
    const selectedCat = item?.category_id ?? getLastCategory();
    const selectedLoc = item?.location_id ?? getLastLocation();
    const isEdit = !!item;
    const isQuick = _mode === 'quickadd' && !isEdit;

    return `
      ${!isEdit ? buildModeToggle() : ''}

      <form id="item-form" autocomplete="off">
        ${isQuick ? buildQuickRow(item) : buildStandardNameRow(item)}

        ${!isQuick ? `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="item-qty">Quantity</label>
            <input class="form-input" id="item-qty" type="number" min="0" step="0.1"
              value="${item?.quantity ?? 1}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="item-unit">Unit</label>
            <input class="form-input" id="item-unit" type="text" placeholder="e.g. lbs, oz, pkg"
              value="${escapeHtml(item?.unit || '')}" />
          </div>
        </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">Category</label>
          <div class="pill-selector" id="category-pills">
            ${renderPills(_categories, selectedCat, 'category')}
          </div>
          <input type="hidden" id="selected-category" value="${selectedCat || ''}" />
        </div>

        <div class="form-group">
          <label class="form-label">Location</label>
          <div class="pill-selector" id="location-pills">
            ${renderPills(_locations, selectedLoc, 'location')}
          </div>
          <input type="hidden" id="selected-location" value="${selectedLoc || ''}" />
        </div>

        ${!isQuick ? `
        <div class="optional-section">
          <button type="button" class="optional-toggle" id="optional-toggle">
            <span id="optional-icon">▸</span> Optional fields
          </button>
          <div class="optional-fields hidden" id="optional-fields">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="item-threshold">Low Stock Alert ≤</label>
                <input class="form-input" id="item-threshold" type="number" min="0" step="0.1"
                  value="${item?.low_threshold ?? 1}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="item-expiry">Expiration Date</label>
                <input class="form-input" id="item-expiry" type="date"
                  value="${item?.expiration_date || ''}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="item-notes">Notes</label>
              <textarea class="form-input" id="item-notes" rows="2"
                placeholder="Any additional notes…">${escapeHtml(item?.notes || '')}</textarea>
            </div>
          </div>
        </div>
        ` : ''}

        <div style="margin-top: 24px; display: flex; gap: 10px;">
          ${isEdit ? '<button type="button" class="btn btn-secondary" id="cancel-edit">Cancel</button>' : ''}
          <button type="submit" class="btn btn-primary btn-lg">
            ${isEdit ? '💾 Save Changes' : isQuick ? '➕ Add & Next' : '➕ Add Item'}
          </button>
        </div>
      </form>

      ${isQuick ? buildSessionList() : ''}
    `;
  }

  function buildStandardNameRow(item) {
    return `
      <div class="form-group autocomplete-wrap" id="autocomplete-wrap">
        <label class="form-label" for="item-name">Item Name *</label>
        <input class="form-input" id="item-name" type="text" placeholder="e.g. Whole Milk"
          value="${escapeHtml(item?.name || '')}" required autofocus />
        <div class="autocomplete-dropdown hidden" id="autocomplete-dropdown"></div>
      </div>
    `;
  }

  function buildQuickRow(item) {
    return `
      <div class="quick-add-row">
        <div class="form-group autocomplete-wrap" id="autocomplete-wrap" style="flex:2;margin-bottom:0">
          <label class="form-label" for="item-name">Name *</label>
          <input class="form-input" id="item-name" type="text" placeholder="e.g. Milk"
            value="${escapeHtml(item?.name || '')}" required autofocus />
          <div class="autocomplete-dropdown hidden" id="autocomplete-dropdown"></div>
        </div>
        <div class="form-group" style="flex:0.6;margin-bottom:0">
          <label class="form-label" for="item-qty">Qty</label>
          <input class="form-input" id="item-qty" type="number" min="0" step="0.1"
            value="${item?.quantity ?? 1}" />
        </div>
        <div class="form-group" style="flex:0.8;margin-bottom:0">
          <label class="form-label" for="item-unit">Unit</label>
          <input class="form-input" id="item-unit" type="text" placeholder="lbs, oz…"
            value="${escapeHtml(item?.unit || '')}" />
        </div>
      </div>
    `;
  }

  function buildSessionList() {
    if (_sessionItems.length === 0) return '';
    const rows = _sessionItems.map((item, idx) => `
      <div class="session-item" data-idx="${idx}">
        <span class="session-item-name">${escapeHtml(item.name)}</span>
        <span class="session-item-qty">${item.quantity}${item.unit ? ' ' + escapeHtml(item.unit) : ''}</span>
        ${item._locationName ? `<span class="session-item-loc">${escapeHtml(item._locationName)}</span>` : ''}
        <button type="button" class="session-item-undo" data-idx="${idx}" title="Undo">✕</button>
      </div>
    `).join('');
    return `
      <div class="session-list">
        <div class="session-list-header">
          <span>Added this session (${_sessionItems.length})</span>
        </div>
        ${rows}
      </div>
    `;
  }

  // --- Autocomplete logic ---

  function getAutocompleteSuggestions(query) {
    const items = App.state.items || [];
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Build unique names map: name -> best item (first match per name)
    const seen = new Map();
    for (const item of items) {
      const key = item.name.toLowerCase().trim();
      if (key.includes(q) && !seen.has(key)) {
        seen.set(key, item);
      }
    }
    return Array.from(seen.values()).slice(0, 8);
  }

  function getExistingLocations(name) {
    const items = App.state.items || [];
    const key = name.toLowerCase().trim();
    return items.filter(i => i.name.toLowerCase().trim() === key && i.location);
  }

  function renderDropdown(suggestions, query) {
    const dropdown = _container.querySelector('#autocomplete-dropdown');
    if (!dropdown) return;

    if (suggestions.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.innerHTML = suggestions.map((item, i) => {
      const existingLocs = getExistingLocations(item.name);
      const hint = existingLocs.length
        ? `<span class="autocomplete-hint">${existingLocs.map(l => l.location.name + ' (' + l.quantity + ')').join(', ')}</span>`
        : '';
      return `
        <div class="autocomplete-item" data-name="${escapeHtml(item.name)}"
          data-unit="${escapeHtml(item.unit || '')}"
          data-category="${item.category_id || ''}"
          role="option" tabindex="-1">
          <span class="autocomplete-item-name">${escapeHtml(item.name)}</span>
          ${hint}
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');
  }

  function applyAutocompleteSelection(name, unit, categoryId) {
    const nameInput = _container.querySelector('#item-name');
    const unitInput = _container.querySelector('#item-unit');
    if (nameInput) nameInput.value = name;
    if (unitInput && unit) unitInput.value = unit;

    // Auto-select category pill if not already selected by user
    const selectedCatInput = _container.querySelector('#selected-category');
    if (categoryId && selectedCatInput && !selectedCatInput.value) {
      selectedCatInput.value = categoryId;
      _container.querySelectorAll('.pill[data-type="category"]').forEach(p => {
        p.classList.toggle('selected', parseInt(p.dataset.id) === parseInt(categoryId));
      });
    }

    closeDropdown();
  }

  function closeDropdown() {
    const dropdown = _container && _container.querySelector('#autocomplete-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  function bindAutocomplete() {
    const nameInput = _container.querySelector('#item-name');
    const dropdown = _container.querySelector('#autocomplete-dropdown');
    if (!nameInput || !dropdown) return;

    nameInput.addEventListener('input', () => {
      clearTimeout(_autocompleteTimer);
      _autocompleteTimer = setTimeout(() => {
        const suggestions = getAutocompleteSuggestions(nameInput.value);
        renderDropdown(suggestions, nameInput.value);
      }, 150);
    });

    nameInput.addEventListener('keydown', (e) => {
      if (dropdown.classList.contains('hidden')) return;
      const items = dropdown.querySelectorAll('.autocomplete-item');
      const active = dropdown.querySelector('.autocomplete-item.active');
      let idx = Array.from(items).indexOf(active);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < items.length - 1) idx++;
        else idx = 0;
        items.forEach(i => i.classList.remove('active'));
        items[idx].classList.add('active');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) idx--;
        else idx = items.length - 1;
        items.forEach(i => i.classList.remove('active'));
        items[idx].classList.add('active');
      } else if (e.key === 'Enter') {
        if (active) {
          e.preventDefault();
          applyAutocompleteSelection(
            active.dataset.name,
            active.dataset.unit,
            active.dataset.category
          );
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    nameInput.addEventListener('blur', () => {
      // Small delay so click on dropdown item fires first
      setTimeout(closeDropdown, 150);
    });

    dropdown.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item) {
        applyAutocompleteSelection(item.dataset.name, item.dataset.unit, item.dataset.category);
      }
    });
  }

  // --- Events ---

  function bindEvents(container) {
    _container = container;
    const form = container.querySelector('#item-form');

    // Import link
    const importLink = container.querySelector('#go-import');
    if (importLink) importLink.addEventListener('click', () => App.navigate('import'));

    // Mode toggle
    container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _mode = btn.dataset.mode;
        localStorage.setItem(LS_MODE, _mode);
        // Re-render the form area (keep category/location state)
        const selectedCat = parseInt(container.querySelector('#selected-category')?.value) || null;
        const selectedLoc = parseInt(container.querySelector('#selected-location')?.value) || null;
        if (selectedCat) localStorage.setItem(LS_CATEGORY, selectedCat);
        if (selectedLoc) localStorage.setItem(LS_LOCATION, selectedLoc);
        rebuildFormArea(container);
      });
    });

    // Pill selection
    container.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const type = pill.dataset.type;
        const id = parseInt(pill.dataset.id);
        const hiddenInput = container.querySelector(
          type === 'category' ? '#selected-category' : '#selected-location'
        );
        const pills = container.querySelectorAll(`.pill[data-type="${type}"]`);
        if (hiddenInput.value === String(id)) {
          pill.classList.remove('selected');
          hiddenInput.value = '';
        } else {
          pills.forEach(p => p.classList.remove('selected'));
          pill.classList.add('selected');
          hiddenInput.value = id;
        }
      });
    });

    // Optional fields toggle (standard mode only)
    const toggle = container.querySelector('#optional-toggle');
    const optFields = container.querySelector('#optional-fields');
    const optIcon = container.querySelector('#optional-icon');
    if (toggle) {
      toggle.addEventListener('click', () => {
        optFields.classList.toggle('hidden');
        optIcon.textContent = optFields.classList.contains('hidden') ? '▸' : '▾';
      });
    }

    // Cancel edit
    const cancelBtn = container.querySelector('#cancel-edit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => App.navigate('inventory'));
    }

    // Session list undo
    container.addEventListener('click', async (e) => {
      const undoBtn = e.target.closest('.session-item-undo');
      if (!undoBtn) return;
      const idx = parseInt(undoBtn.dataset.idx);
      const sessionItem = _sessionItems[idx];
      if (!sessionItem) return;
      try {
        await API.items.delete(sessionItem.id);
        _sessionItems.splice(idx, 1);
        rebuildSessionList(container);
        Toast.show('Item removed', 'success');
      } catch (err) {
        Toast.show('Error: ' + err.message, 'error');
      }
    });

    // Autocomplete
    bindAutocomplete();

    // Submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = _editItem ? '⏳ Saving…' : '⏳ Adding…';

      const categoryId = container.querySelector('#selected-category').value;
      const locationId = container.querySelector('#selected-location').value;

      const payload = {
        name: container.querySelector('#item-name').value.trim(),
        quantity: parseFloat(container.querySelector('#item-qty').value) || 0,
        unit: container.querySelector('#item-unit').value.trim(),
        category_id: categoryId ? parseInt(categoryId) : null,
        location_id: locationId ? parseInt(locationId) : null,
        low_threshold: parseFloat(container.querySelector('#item-threshold')?.value) || 1,
        expiration_date: container.querySelector('#item-expiry')?.value || null,
        notes: container.querySelector('#item-notes')?.value.trim() || '',
      };

      if (!payload.name) {
        Toast.show('Item name is required', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = _editItem ? '💾 Save Changes' : (_mode === 'quickadd' ? '➕ Add & Next' : '➕ Add Item');
        return;
      }

      if (payload.category_id) localStorage.setItem(LS_CATEGORY, payload.category_id);
      if (payload.location_id) localStorage.setItem(LS_LOCATION, payload.location_id);

      try {
        if (_editItem) {
          await API.items.update(_editItem.id, payload);
          Toast.show(`${payload.name} updated`, 'success');
          App.navigate('inventory');
        } else {
          const created = await API.items.create(payload);
          Toast.show(`${payload.name} added`, 'success');

          // Update global items cache
          if (!App.state.items) App.state.items = [];
          App.state.items.push(created);

          if (_mode === 'quickadd') {
            // Track in session list
            const locObj = _locations.find(l => l.id === payload.location_id);
            _sessionItems.push({ ...created, _locationName: locObj?.name || null });
            // Clear only name/qty/unit, keep category+location
            container.querySelector('#item-name').value = '';
            container.querySelector('#item-qty').value = '1';
            container.querySelector('#item-unit').value = '';
            closeDropdown();
            rebuildSessionList(container);
            container.querySelector('#item-name').focus();
          } else {
            form.reset();
            container.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
            container.querySelector('#selected-category').value = '';
            container.querySelector('#selected-location').value = '';
            container.querySelector('#item-name').focus();
          }
        }
      } catch (err) {
        Toast.show('Error: ' + err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = _editItem ? '💾 Save Changes' : (_mode === 'quickadd' ? '➕ Add & Next' : '➕ Add Item');
      }
    });
  }

  function rebuildFormArea(container) {
    container.innerHTML = buildForm(_editItem);
    bindEvents(container);
    container.querySelector('#item-name')?.focus();
  }

  function rebuildSessionList(container) {
    const existing = container.querySelector('.session-list');
    const html = buildSessionList();
    if (existing) {
      if (html) {
        existing.outerHTML = html;
      } else {
        existing.remove();
      }
    } else if (html) {
      container.insertAdjacentHTML('beforeend', html);
    }

    // Re-bind undo buttons (delegated via container listener, already bound)
  }

  async function render(container, state) {
    _editItem = null;
    _sessionItems = [];
    _mode = getLastMode();
    _container = container;
    document.getElementById('page-title').textContent = 'Add Item';

    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
      [_categories, _locations] = await Promise.all([
        App.state.categories?.length ? Promise.resolve(App.state.categories) : API.categories.list(),
        App.state.locations?.length ? Promise.resolve(App.state.locations) : API.locations.list(),
      ]);

      App.state.categories = _categories;
      App.state.locations = _locations;

      // Ensure items are loaded for autocomplete
      if (!App.state.items?.length) {
        App.state.items = await API.items.list();
      }

      if (state?.editId) {
        _editItem = await API.items.get(state.editId);
        document.getElementById('page-title').textContent = 'Edit Item';
        _mode = 'standard'; // always standard mode for edits
      }

      container.innerHTML = buildForm(_editItem);
      bindEvents(container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading form: ${escapeHtml(err.message)}</p></div>`;
    }
  }

  return { render };
})();
