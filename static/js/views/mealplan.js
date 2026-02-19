/**
 * Meal Planner view — weekly grid with 3 meal slots per day (breakfast, lunch, dinner)
 */
const MealPlanView = (() => {
  // State
  let _weekMonday = null;     // Date object — Monday of displayed week
  let _entries = [];          // MealPlanEntryOut[] for current week
  let _editingSlot = null;    // { date: "YYYY-MM-DD", meal_type: "breakfast"|"lunch"|"dinner" } or null
  let _pantryItems = [];      // ItemOut[] — loaded once per view render

  // Meal type config — breakfast count driven by Settings
  function getMealTypes() {
    const slots = parseInt(App.state.settings?.breakfast_slots || '1');
    const breakfasts = Array.from({ length: slots }, (_, i) => ({
      key:   i === 0 ? 'breakfast' : `breakfast_${i + 1}`,
      label: i === 0 ? 'Breakfast' : `Breakfast ${i + 1}`,
      icon:  'fa-mug-hot',
    }));
    return [
      ...breakfasts,
      { key: 'lunch',   label: 'Lunch',   icon: 'fa-sun' },
      { key: 'dinner',  label: 'Dinner',  icon: 'fa-moon' },
    ];
  }

  // ---- Date helpers ----

  function parseISODate(iso) {
    // Avoid UTC-shift: "2026-02-17" → local midnight
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function toISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getMondayOf(dateObj) {
    const d = new Date(dateObj);
    const day = d.getDay();          // 0=Sun, 1=Mon…
    const diff = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function formatWeekLabel(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const opts = { month: 'short', day: 'numeric' };
    const startStr = monday.toLocaleDateString('en-US', opts);
    const endStr = sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }

  // Short day names
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ---- Rendering helpers ----

  function renderMealSlot(iso, mealType) {
    const entry = _entries.find(e => e.date === iso && e.meal_type === mealType.key) || null;
    const isEditing = _editingSlot && _editingSlot.date === iso && _editingSlot.meal_type === mealType.key;

    let contentHtml;

    if (isEditing) {
      const placeholders = {
        breakfast: "What's for breakfast?",
        lunch: "What's for lunch?",
        dinner: "What's for dinner?",
      };
      contentHtml = `
        <form class="mealplan-edit-form" data-date="${iso}" data-meal-type="${mealType.key}">
          <input
            type="text"
            class="mealplan-input-name"
            placeholder="${placeholders[mealType.key]}"
            value="${entry ? escapeHtml(entry.meal_name) : ''}"
            autocomplete="off"
            required
          />
          <textarea
            class="mealplan-input-notes"
            placeholder="Notes (optional)"
            rows="2"
          >${entry ? escapeHtml(entry.notes || '') : ''}</textarea>
          <div class="mealplan-edit-actions">
            <button type="submit" class="mealplan-btn-save" data-action="save" data-date="${iso}" data-meal-type="${mealType.key}">Save</button>
            <button type="button" class="mealplan-btn-cancel" data-action="cancel" data-date="${iso}" data-meal-type="${mealType.key}">Cancel</button>
          </div>
        </form>
      `;
    } else if (entry) {
      contentHtml = `
        <div class="mealplan-meal-name">${escapeHtml(entry.meal_name)}</div>
        ${entry.notes ? `<div class="mealplan-meal-notes">${escapeHtml(entry.notes)}</div>` : ''}
        <div class="mealplan-day-actions">
          <button class="mealplan-btn-edit" data-action="edit" data-date="${iso}" data-meal-type="${mealType.key}">
            <i class="fa-solid fa-pencil"></i> Edit
          </button>
          <button class="mealplan-btn-clear" data-action="delete" data-id="${entry.id}" data-date="${iso}" data-meal-type="${mealType.key}">
            <i class="fa-solid fa-trash"></i> Clear
          </button>
        </div>
      `;
    } else {
      contentHtml = `
        <button class="mealplan-btn-add" data-action="edit" data-date="${iso}" data-meal-type="${mealType.key}">
          <i class="fa-solid fa-plus"></i> Add
        </button>
      `;
    }

    const slotClasses = ['mealplan-meal-slot', isEditing ? 'is-editing' : ''].filter(Boolean).join(' ');
    return `
      <div class="${slotClasses}" data-date="${iso}" data-meal-type="${mealType.key}">
        <div class="mealplan-meal-slot-header">
          <i class="fa-solid ${mealType.icon}"></i>
          <span>${mealType.label}</span>
        </div>
        ${contentHtml}
      </div>
    `;
  }

  function renderDayCard(dateObj) {
    const iso = toISO(dateObj);
    const todayISO = toISO(new Date());
    const isToday = iso === todayISO;

    const dayName = DAY_NAMES[dateObj.getDay()];
    const dayNum = dateObj.getDate();

    let cardClasses = 'mealplan-day-card';
    if (isToday) cardClasses += ' is-today';

    const mealTypes = getMealTypes();
    const breakfastSlots = mealTypes.filter(mt => mt.key.startsWith('breakfast'));
    const otherSlots     = mealTypes.filter(mt => !mt.key.startsWith('breakfast'));
    const slotsHtml =
      `<div class="mealplan-breakfast-group">${breakfastSlots.map(mt => renderMealSlot(iso, mt)).join('')}</div>` +
      otherSlots.map(mt => renderMealSlot(iso, mt)).join('');

    return `
      <div class="${cardClasses}" data-date="${iso}">
        <div class="mealplan-day-header">
          <span class="mealplan-day-name">${dayName}</span>
          <span class="mealplan-day-date">${dayNum}</span>
        </div>
        ${slotsHtml}
      </div>
    `;
  }

  function renderWeekGrid() {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(_weekMonday);
      d.setDate(_weekMonday.getDate() + i);
      days.push(renderDayCard(d));
    }
    return days.join('');
  }

  function renderPantrySnapshot(container) {
    const expired = _pantryItems.filter(i => i.is_expired);
    const expiringSoon = _pantryItems.filter(i => i.is_expiring_soon);
    const lowStock = _pantryItems.filter(i => i.is_low && !i.is_expired);

    // Group by category
    const byCategory = {};
    for (const item of _pantryItems) {
      const catName = item.category?.name || 'Uncategorized';
      if (!byCategory[catName]) byCategory[catName] = [];
      byCategory[catName].push(item);
    }
    const sortedCats = Object.keys(byCategory).sort();

    let alertHtml = '';

    if (expired.length > 0) {
      alertHtml += `
        <div class="mealplan-alert-section">
          <div class="mealplan-alert-header danger">
            <i class="fa-solid fa-circle-xmark"></i> Expired (${expired.length})
          </div>
          <div class="mealplan-alert-pills">
            ${expired.map(i => `<span class="mealplan-pill">${escapeHtml(i.name)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    if (expiringSoon.length > 0) {
      alertHtml += `
        <div class="mealplan-alert-section">
          <div class="mealplan-alert-header warning">
            <i class="fa-solid fa-triangle-exclamation"></i> Expiring Soon (${expiringSoon.length})
          </div>
          <div class="mealplan-alert-pills">
            ${expiringSoon.map(i => `<span class="mealplan-pill">${escapeHtml(i.name)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    if (lowStock.length > 0) {
      alertHtml += `
        <div class="mealplan-alert-section">
          <div class="mealplan-alert-header info">
            <i class="fa-solid fa-arrow-trend-down"></i> Low Stock (${lowStock.length})
          </div>
          <div class="mealplan-alert-pills">
            ${lowStock.map(i => `<span class="mealplan-pill">${escapeHtml(i.name)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    const catRows = sortedCats.map(cat => `
      <div class="mealplan-pantry-cat-header">${escapeHtml(cat)}</div>
      <div class="mealplan-pantry-items">
        ${byCategory[cat].map(i => `
          <span class="mealplan-pantry-item ${i.is_low ? 'is-low' : ''}">
            ${escapeHtml(i.name)}${i.quantity ? ` <small>(${i.quantity}${i.unit ? ' ' + escapeHtml(i.unit) : ''})</small>` : ''}
          </span>
        `).join('')}
      </div>
    `).join('');

    const el = container.querySelector('.mealplan-pantry');
    if (!el) return;
    el.innerHTML = `
      <div class="mealplan-pantry-title">
        <i class="fa-solid fa-box-archive"></i> Pantry Snapshot
      </div>
      ${alertHtml || ''}
      ${_pantryItems.length === 0
        ? '<p style="color:var(--color-text-muted);font-size:0.875rem">No inventory items found.</p>'
        : `<div class="mealplan-pantry-categories">${catRows}</div>`
      }
    `;
  }

  function reRenderGrid(container) {
    const grid = container.querySelector('.mealplan-week-grid');
    if (grid) grid.innerHTML = renderWeekGrid();
  }

  // ---- Event binding (delegated on .mealplan-view) ----

  function bindEvents(viewEl) {
    // Week navigation
    viewEl.querySelector('#mealplan-prev').addEventListener('click', async () => {
      _weekMonday = new Date(_weekMonday);
      _weekMonday.setDate(_weekMonday.getDate() - 7);
      await loadWeek(viewEl);
    });

    viewEl.querySelector('#mealplan-next').addEventListener('click', async () => {
      _weekMonday = new Date(_weekMonday);
      _weekMonday.setDate(_weekMonday.getDate() + 7);
      await loadWeek(viewEl);
    });

    viewEl.querySelector('#mealplan-today').addEventListener('click', async () => {
      _weekMonday = getMondayOf(new Date());
      await loadWeek(viewEl);
    });

    // Delegated actions on the view (not the re-rendered grid)
    viewEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const dateStr = btn.dataset.date;
      const mealType = btn.dataset.mealType;

      if (action === 'edit') {
        _editingSlot = { date: dateStr, meal_type: mealType };
        reRenderGrid(viewEl);
        // Focus the input after re-render
        const form = viewEl.querySelector(`.mealplan-edit-form[data-date="${dateStr}"][data-meal-type="${mealType}"]`);
        if (form) form.querySelector('.mealplan-input-name')?.focus();
        return;
      }

      if (action === 'cancel') {
        _editingSlot = null;
        reRenderGrid(viewEl);
        return;
      }

      if (action === 'delete') {
        const id = parseInt(btn.dataset.id);
        const ok = await Modal.confirm('Clear meal?', 'Remove this meal from the plan?');
        if (!ok) return;
        try {
          await API.mealplan.delete(id);
          _entries = _entries.filter(e => e.id !== id);
          _editingSlot = null;
          reRenderGrid(viewEl);
          Toast.show('Meal cleared', 'success');
        } catch (err) {
          Toast.show('Error: ' + err.message, 'error');
        }
        return;
      }
    });

    // Form submit (save)
    viewEl.addEventListener('submit', async (e) => {
      if (!e.target.classList.contains('mealplan-edit-form')) return;
      e.preventDefault();

      const form = e.target;
      const dateStr = form.dataset.date;
      const mealType = form.dataset.mealType;
      const mealName = form.querySelector('.mealplan-input-name').value.trim();
      const notes = form.querySelector('.mealplan-input-notes').value.trim();

      if (!mealName) return;

      const existing = _entries.find(e => e.date === dateStr && e.meal_type === mealType);

      try {
        let saved;
        if (existing) {
          saved = await API.mealplan.update(existing.id, { meal_name: mealName, notes });
          const idx = _entries.findIndex(e => e.id === existing.id);
          if (idx !== -1) _entries[idx] = saved;
        } else {
          saved = await API.mealplan.create({ date: dateStr, meal_type: mealType, meal_name: mealName, notes });
          _entries.push(saved);
        }
        _editingSlot = null;
        reRenderGrid(viewEl);
        Toast.show('Meal saved', 'success');
      } catch (err) {
        Toast.show('Error: ' + err.message, 'error');
      }
    });
  }

  // ---- Week loading ----

  async function loadWeek(viewEl) {
    // Update label
    viewEl.querySelector('.mealplan-week-label').textContent = formatWeekLabel(_weekMonday);

    // Show loading state in grid
    const grid = viewEl.querySelector('.mealplan-week-grid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      _entries = await API.mealplan.list(toISO(_weekMonday));
      _editingSlot = null;
      reRenderGrid(viewEl);
    } catch (err) {
      Toast.show('Failed to load meal plan: ' + err.message, 'error');
    }
  }

  // ---- Main render ----

  async function render(container) {
    _weekMonday = getMondayOf(new Date());
    _entries = [];
    _editingSlot = null;
    _pantryItems = [];

    container.innerHTML = `
      <div class="mealplan-view">
        <div class="mealplan-week-nav">
          <button class="mealplan-nav-btn" id="mealplan-prev">
            <i class="fa-solid fa-chevron-left"></i> Prev
          </button>
          <span class="mealplan-week-label">${formatWeekLabel(_weekMonday)}</span>
          <button class="mealplan-nav-btn" id="mealplan-next">
            Next <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button class="mealplan-today-btn" id="mealplan-today">Today</button>
        </div>

        <div class="mealplan-week-grid">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>

        <div class="mealplan-pantry">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    const viewEl = container.querySelector('.mealplan-view');
    bindEvents(viewEl);

    // Load meal plan and pantry in parallel
    try {
      [_entries, _pantryItems] = await Promise.all([
        API.mealplan.list(toISO(_weekMonday)),
        API.items.list(),
      ]);
      _editingSlot = null;
      reRenderGrid(viewEl);
      renderPantrySnapshot(viewEl);
    } catch (err) {
      Toast.show('Failed to load: ' + err.message, 'error');
    }
  }

  return { render };
})();
