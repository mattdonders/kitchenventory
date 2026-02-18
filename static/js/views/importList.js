/**
 * Import List view — paste a freeform list, parse with AI, review and import
 */
const ImportListView = (() => {
  let _parsed = [];       // items returned from AI
  let _checked = new Set(); // indices of checked items
  let _categories = [];
  let _locations = [];
  let _locationId = null;
  let _container = null;

  function categoryIdFromName(name) {
    if (!name) return null;
    const n = name.toLowerCase().trim();
    const cat = _categories.find(c => c.name.toLowerCase() === n);
    return cat ? cat.id : null;
  }

  // --- Input phase ---

  function renderInput() {
    return `
      <div class="import-view">
        <p class="import-description">
          Paste your list below — one item per line. Plain language works great:
        </p>
        <p class="import-examples">
          2 gallons whole milk &nbsp;·&nbsp; eggs &nbsp;·&nbsp; 3 cans tomatoes &nbsp;·&nbsp; pasta 2 boxes
        </p>

        <textarea class="form-input import-textarea" id="import-text"
          placeholder="2 gallons whole milk&#10;1 dozen eggs&#10;3 cans diced tomatoes&#10;pasta&#10;olive oil 16oz&#10;Greek yogurt 4 cups" rows="10"></textarea>

        <div style="margin-top: 16px;">
          <button class="btn btn-primary btn-lg" id="parse-btn">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Parse List
          </button>
        </div>
      </div>
    `;
  }

  // --- Preview phase ---

  function renderLocationPills() {
    return _locations.map(loc => `
      <button type="button" class="pill ${_locationId === loc.id ? 'selected' : ''}"
        data-loc-id="${loc.id}">${escapeHtml(loc.name)}</button>
    `).join('');
  }

  function renderPreview() {
    const rows = _parsed.map((item, i) => {
      const catId = categoryIdFromName(item.category);
      const catName = catId ? _categories.find(c => c.id === catId)?.name : item.category || '—';
      return `
        <div class="import-row ${_checked.has(i) ? '' : 'import-row-unchecked'}" data-idx="${i}">
          <button type="button" class="import-check ${_checked.has(i) ? 'checked' : ''}" data-idx="${i}">
            ${_checked.has(i) ? '<i class="fa-solid fa-check"></i>' : ''}
          </button>
          <input class="form-input import-row-name" data-idx="${i}" data-field="name"
            value="${escapeHtml(item.name)}" />
          <input class="form-input import-row-qty" data-idx="${i}" data-field="quantity"
            type="number" min="0" step="0.1" value="${item.quantity}" />
          <input class="form-input import-row-unit" data-idx="${i}" data-field="unit"
            placeholder="unit" value="${escapeHtml(item.unit || '')}" />
          <span class="import-row-cat">${escapeHtml(catName)}</span>
        </div>
      `;
    }).join('');

    const checkedCount = _checked.size;

    return `
      <div class="import-view">
        <div class="import-preview-header">
          <div>
            <strong>${_parsed.length}</strong> items parsed —
            <button class="btn-link" id="select-all">select all</button> /
            <button class="btn-link" id="select-none">none</button>
          </div>
          <button class="btn btn-secondary btn-sm" id="back-btn">
            <i class="fa-solid fa-arrow-left"></i> Edit list
          </button>
        </div>

        <div class="form-group" style="margin-top: 16px;">
          <label class="form-label">Location for all items</label>
          <div class="pill-selector">${renderLocationPills()}</div>
        </div>

        <div class="import-col-headers">
          <span></span>
          <span>Name</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Category</span>
        </div>

        <div class="import-rows" id="import-rows">${rows}</div>

        <div style="margin-top: 20px; display: flex; gap: 10px;">
          <button class="btn btn-primary btn-lg" id="import-btn" ${checkedCount === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-box-archive"></i> Import ${checkedCount} item${checkedCount !== 1 ? 's' : ''}
          </button>
          <button class="btn btn-secondary" id="cancel-import-btn">Cancel</button>
        </div>
      </div>
    `;
  }

  // --- Bind events ---

  function bindInputEvents() {
    _container.querySelector('#parse-btn').addEventListener('click', async () => {
      const text = _container.querySelector('#import-text').value.trim();
      if (!text) { Toast.show('Paste something first', 'error'); return; }

      const btn = _container.querySelector('#parse-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Parsing…';

      try {
        _parsed = await API.items.parseList(text);
        if (!_parsed.length) throw new Error('No items found in that list');
        _checked = new Set(_parsed.map((_, i) => i)); // all checked by default
        _container.innerHTML = renderPreview();
        bindPreviewEvents();
      } catch (err) {
        Toast.show('Parse failed: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Parse List';
      }
    });
  }

  function bindPreviewEvents() {
    // Back
    _container.querySelector('#back-btn').addEventListener('click', () => {
      _container.innerHTML = renderInput();
      bindInputEvents();
    });

    // Cancel
    _container.querySelector('#cancel-import-btn').addEventListener('click', () => {
      App.navigate('inventory');
    });

    // Select all / none
    _container.querySelector('#select-all').addEventListener('click', () => {
      _checked = new Set(_parsed.map((_, i) => i));
      _container.innerHTML = renderPreview();
      bindPreviewEvents();
    });
    _container.querySelector('#select-none').addEventListener('click', () => {
      _checked = new Set();
      _container.innerHTML = renderPreview();
      bindPreviewEvents();
    });

    // Location pills
    _container.querySelectorAll('[data-loc-id]').forEach(pill => {
      pill.addEventListener('click', () => {
        const id = parseInt(pill.dataset.locId);
        _locationId = _locationId === id ? null : id;
        _container.querySelectorAll('[data-loc-id]').forEach(p =>
          p.classList.toggle('selected', parseInt(p.dataset.locId) === _locationId)
        );
      });
    });

    // Row checkboxes
    _container.querySelectorAll('.import-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (_checked.has(idx)) _checked.delete(idx);
        else _checked.add(idx);
        // Update just this row and the import button count
        const row = _container.querySelector(`.import-row[data-idx="${idx}"]`);
        row.classList.toggle('import-row-unchecked', !_checked.has(idx));
        btn.classList.toggle('checked', _checked.has(idx));
        btn.innerHTML = _checked.has(idx) ? '<i class="fa-solid fa-check"></i>' : '';
        updateImportBtn();
      });
    });

    // Inline editing
    _container.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.idx);
        const field = input.dataset.field;
        _parsed[idx][field] = field === 'quantity' ? parseFloat(input.value) || 0 : input.value;
      });
    });

    // Import
    _container.querySelector('#import-btn').addEventListener('click', async () => {
      const toImport = Array.from(_checked).map(i => {
        const item = _parsed[i];
        return {
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || '',
          category_id: categoryIdFromName(item.category),
          location_id: _locationId,
          notes: '',
          low_threshold: 1,
          expiration_date: null,
        };
      });

      if (!toImport.length) return;

      const btn = _container.querySelector('#import-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing…';

      try {
        const created = await API.items.bulkCreate(toImport);
        if (!App.state.items) App.state.items = [];
        App.state.items.push(...created);
        Toast.show(`${created.length} items added to inventory`, 'success');
        App.navigate('inventory');
      } catch (err) {
        Toast.show('Import failed: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-box-archive"></i> Import ${_checked.size} items`;
      }
    });
  }

  function updateImportBtn() {
    const btn = _container.querySelector('#import-btn');
    if (!btn) return;
    const count = _checked.size;
    btn.disabled = count === 0;
    btn.innerHTML = `<i class="fa-solid fa-box-archive"></i> Import ${count} item${count !== 1 ? 's' : ''}`;
  }

  // --- Entry point ---

  async function render(container) {
    _container = container;
    _parsed = [];
    _checked = new Set();
    _locationId = null;

    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
      [_categories, _locations] = await Promise.all([
        App.state.categories?.length ? Promise.resolve(App.state.categories) : API.categories.list(),
        App.state.locations?.length ? Promise.resolve(App.state.locations) : API.locations.list(),
      ]);
      App.state.categories = _categories;
      App.state.locations = _locations;

      container.innerHTML = renderInput();
      bindInputEvents();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading: ${escapeHtml(err.message)}</p></div>`;
    }
  }

  return { render };
})();
