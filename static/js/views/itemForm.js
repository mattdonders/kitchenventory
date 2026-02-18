/**
 * Item form view — Quick Add and Edit
 * Persists last category/location to localStorage
 */
const ItemFormView = (() => {
  const LS_CATEGORY = 'kv_last_category';
  const LS_LOCATION = 'kv_last_location';

  let _categories = [];
  let _locations = [];
  let _editItem = null;

  function getLastCategory() {
    const v = localStorage.getItem(LS_CATEGORY);
    return v ? parseInt(v) : null;
  }

  function getLastLocation() {
    const v = localStorage.getItem(LS_LOCATION);
    return v ? parseInt(v) : null;
  }

  function renderPills(items, selected, type) {
    return items.map(item => `
      <button type="button" class="pill ${selected === item.id ? 'selected' : ''}"
        data-type="${type}" data-id="${item.id}">${escapeHtml(item.name)}</button>
    `).join('');
  }

  function buildForm(item) {
    const selectedCat = item?.category_id ?? getLastCategory();
    const selectedLoc = item?.location_id ?? getLastLocation();
    const isEdit = !!item;

    return `
      <form id="item-form" autocomplete="off">
        <div class="form-group">
          <label class="form-label" for="item-name">Item Name *</label>
          <input class="form-input" id="item-name" type="text" placeholder="e.g. Whole Milk"
            value="${escapeHtml(item?.name || '')}" required autofocus />
        </div>

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

        <div style="margin-top: 24px; display: flex; gap: 10px;">
          ${isEdit ? '<button type="button" class="btn btn-secondary" id="cancel-edit">Cancel</button>' : ''}
          <button type="submit" class="btn btn-primary btn-lg">${isEdit ? '💾 Save Changes' : '➕ Add Item'}</button>
        </div>
      </form>
    `;
  }

  function bindEvents(container) {
    const form = container.querySelector('#item-form');

    // Pill selection
    container.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const type = pill.dataset.type;
        const id = parseInt(pill.dataset.id);
        const hiddenInput = container.querySelector(
          type === 'category' ? '#selected-category' : '#selected-location'
        );
        const pills = container.querySelectorAll(`.pill[data-type="${type}"]`);

        // Toggle selection
        if (hiddenInput.value === String(id)) {
          // Deselect
          pill.classList.remove('selected');
          hiddenInput.value = '';
        } else {
          pills.forEach(p => p.classList.remove('selected'));
          pill.classList.add('selected');
          hiddenInput.value = id;
        }
      });
    });

    // Optional fields toggle
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
        low_threshold: parseFloat(container.querySelector('#item-threshold').value) || 1,
        expiration_date: container.querySelector('#item-expiry').value || null,
        notes: container.querySelector('#item-notes').value.trim(),
      };

      if (!payload.name) {
        Toast.show('Item name is required', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = _editItem ? '💾 Save Changes' : '➕ Add Item';
        return;
      }

      // Persist last category/location
      if (payload.category_id) localStorage.setItem(LS_CATEGORY, payload.category_id);
      if (payload.location_id) localStorage.setItem(LS_LOCATION, payload.location_id);

      try {
        if (_editItem) {
          await API.items.update(_editItem.id, payload);
          Toast.show(`${payload.name} updated`, 'success');
        } else {
          await API.items.create(payload);
          Toast.show(`${payload.name} added to inventory`, 'success');
          form.reset();
          // Reset pills
          container.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
          container.querySelector('#selected-category').value = '';
          container.querySelector('#selected-location').value = '';
          container.querySelector('#item-name').focus();
        }
        if (_editItem) App.navigate('inventory');
      } catch (err) {
        Toast.show('Error: ' + err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = _editItem ? '💾 Save Changes' : '➕ Add Item';
      }
    });
  }

  async function render(container, state) {
    _editItem = null;
    document.getElementById('page-title').textContent = 'Add Item';

    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
      [_categories, _locations] = await Promise.all([
        App.state.categories?.length ? Promise.resolve(App.state.categories) : API.categories.list(),
        App.state.locations?.length ? Promise.resolve(App.state.locations) : API.locations.list(),
      ]);

      App.state.categories = _categories;
      App.state.locations = _locations;

      // If editing, fetch the item
      if (state?.editId) {
        _editItem = await API.items.get(state.editId);
        document.getElementById('page-title').textContent = 'Edit Item';
      }

      container.innerHTML = buildForm(_editItem);
      bindEvents(container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading form: ${escapeHtml(err.message)}</p></div>`;
    }
  }

  return { render };
})();
