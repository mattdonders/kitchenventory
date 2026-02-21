/**
 * Settings view — app info, meal planner config, location manager, appearance, changelog
 */
const SettingsView = (() => {
  const APP_VERSION = '1.6.0';
  const LS_THEME = 'kv_theme';

  // Cached for partial DOM updates without re-fetching
  let _locations = [];

  const CHANGELOG = [
    {
      version: '1.6.0',
      date: '2026-02-18',
      changes: [
        'Breakfast, Lunch & Dinner — plan all three meals per day separately',
        'Meal slot icons — mug for breakfast, sun for lunch, moon for dinner',
        'Per-slot editing — tap any meal slot to add, edit, or clear that meal independently',
        'Existing dinner plans preserved — current entries migrate automatically to dinner slot',
      ],
    },
    {
      version: '1.5.0',
      date: '2026-02-18',
      changes: [
        'Recipe Saver — import recipes from URLs (AllRecipes, food blogs, 300+ sites)',
        'AI fallback — Claude parses recipes when site is unsupported',
        'Saved recipe library — browse, filter by tags and favorites',
        'Cooking checklist — tap ingredients and steps to check them off while cooking',
        'AI recipe save — save any AI-generated suggestion to your library',
        'Tag system — organize recipes with Family Favorites, Quick & Easy, One-Pan, and more',
      ],
    },
    {
      version: '1.4.0',
      date: '2026-02-18',
      changes: [
        'Meal Planner — weekly meal planning grid with pantry snapshot',
        'Week navigation — browse past and future weeks, jump to today',
        'Inline editing — tap any day to add or edit the meal for that day',
        'Pantry snapshot — see expired, expiring soon, and low-stock items at a glance',
      ],
    },
    {
      version: '1.3.0',
      date: '2026-02-18',
      changes: [
        'AI-powered list import — paste a freeform grocery list and let Claude parse it into structured items',
        'Preview and edit parsed items before importing',
      ],
    },
    {
      version: '1.2.0',
      date: '2026-02-18',
      changes: [
        'Dark mode — system-aware with manual Light / Dark / System override in Settings',
        'Quantity +/- debouncing — rapid taps batch into a single API call with optimistic display',
        'Installable PWA — add to home screen on iOS and Android',
      ],
    },
    {
      version: '1.1.0',
      date: '2026-02-18',
      changes: [
        'Autocomplete on item name — suggestions from your inventory with unit/category auto-fill',
        'Quick-add mode — compact form that keeps category/location selected between adds',
        'Session list in quick-add — shows items added this session with one-tap undo',
        'Grouped inventory cards — same-name items across locations merge into one card with per-location sub-rows',
        'Bulk create API endpoint (POST /api/items/bulk, up to 50 items)',
      ],
    },
    {
      version: '1.0.0',
      date: '2026-02-01',
      changes: [
        'Initial release',
        'Inventory management — add, edit, delete items with categories and locations',
        'Low stock and expiration tracking with visual badges',
        'Shopping list with manual entry and auto-suggest from low/expired inventory',
        'AI recipe suggestions based on current inventory (Claude Haiku)',
        'Mobile-first responsive layout with desktop sidebar',
      ],
    },
  ];

  // --- Theme ---

  function getTheme() {
    return localStorage.getItem(LS_THEME) || 'system';
  }

  function applyTheme(mode) {
    localStorage.setItem(LS_THEME, mode);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.setAttribute('data-theme', useDark ? 'dark' : 'light');
  }

  // --- Breakfast names ---

  function getBreakfastNames() {
    const raw = App.state.settings?.breakfast_slots || '';
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    // Legacy integer format ("1", "2") or empty
    const count = parseInt(raw) || 1;
    return Array.from({ length: count }, (_, i) => i === 0 ? 'Breakfast' : `Breakfast ${i + 1}`);
  }

  function renderBreakfastInputs(names) {
    return names.map((name, i) => `
      <div class="settings-name-row">
        <input type="text" class="settings-name-input" value="${escapeHtml(name)}" placeholder="Slot label" />
        ${names.length > 1
          ? `<button type="button" class="settings-btn-icon is-danger" data-action="remove-breakfast-slot" data-index="${i}" title="Remove">
               <i class="fa-solid fa-xmark"></i>
             </button>`
          : ''}
      </div>
    `).join('');
  }

  function renderBreakfastActions(count) {
    return `
      ${count < 3
        ? `<button type="button" class="settings-btn-secondary" data-action="add-breakfast-slot">
             <i class="fa-solid fa-plus"></i> Add slot
           </button>`
        : ''}
      <button type="button" class="settings-btn-primary" data-action="save-breakfast-names">Save</button>
    `;
  }

  function getNamesFromInputs(container) {
    return Array.from(container.querySelectorAll('#breakfast-name-inputs .settings-name-input'))
      .map(i => i.value);
  }

  // --- Location list ---

  function renderLocationRows(locations) {
    if (!locations.length) {
      return '<p class="settings-empty-msg">No locations yet.</p>';
    }
    return locations.map(loc => `
      <div class="settings-location-row" data-id="${loc.id}">
        <span class="settings-location-name">${escapeHtml(loc.name)}</span>
        <div class="settings-location-actions">
          <button class="settings-btn-icon" data-action="rename-location" data-id="${loc.id}" title="Rename">
            <i class="fa-solid fa-pencil"></i>
          </button>
          <button class="settings-btn-icon is-danger" data-action="delete-location" data-id="${loc.id}" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  // --- Main render ---

  async function render(container) {
    const currentTheme = getTheme();
    const breakfastNames = getBreakfastNames();

    try { _locations = await API.locations.list(); } catch { _locations = []; }

    const changelogRows = CHANGELOG.map((entry, i) => `
      <div class="changelog-entry ${i === 0 ? 'changelog-entry-latest' : ''}">
        <div class="changelog-version-row">
          <span class="changelog-version">v${entry.version}</span>
          ${i === 0 ? '<span class="badge badge-info" style="font-size:0.7rem">Current</span>' : ''}
          <span class="changelog-date">${entry.date}</span>
        </div>
        <ul class="changelog-list">
          ${entry.changes.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="settings-view">

        <div class="settings-section">
          <div class="settings-app-info">
            <div class="settings-app-name">Kitchenventory</div>
            <div class="settings-app-version">Version ${APP_VERSION}</div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">Meal Planner</div>
          <div class="settings-card">
            <div class="settings-card-label">Breakfast Slots</div>
            <div id="breakfast-name-inputs">${renderBreakfastInputs(breakfastNames)}</div>
            <div class="settings-card-actions" id="breakfast-actions">
              ${renderBreakfastActions(breakfastNames.length)}
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">Locations</div>
          <div class="settings-card" id="location-list">
            ${renderLocationRows(_locations)}
          </div>
          <form class="settings-add-row" id="add-location-form">
            <input type="text" class="settings-add-input" placeholder="New location…" required />
            <button type="submit" class="settings-btn-primary">Add</button>
          </form>
        </div>

        <div class="settings-section">
          <div class="section-title">Appearance</div>
          <div class="settings-row">
            <span class="settings-row-label">Theme</span>
            <div class="mode-toggle">
              <button type="button" class="mode-btn ${currentTheme === 'system' ? 'active' : ''}" data-theme="system">System</button>
              <button type="button" class="mode-btn ${currentTheme === 'light'  ? 'active' : ''}" data-theme="light">Light</button>
              <button type="button" class="mode-btn ${currentTheme === 'dark'   ? 'active' : ''}" data-theme="dark">Dark</button>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">Changelog</div>
          ${changelogRows}
        </div>

      </div>
    `;

    bindEvents(container);
  }

  // --- Event binding ---

  function bindEvents(container) {
    // All [data-action] delegation
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      // ---- Breakfast slots ----

      if (action === 'add-breakfast-slot') {
        const inputsEl = container.querySelector('#breakfast-name-inputs');
        const names = getNamesFromInputs(container);
        if (names.length >= 3) return;
        names.push('');
        inputsEl.innerHTML = renderBreakfastInputs(names);
        container.querySelector('#breakfast-actions').innerHTML = renderBreakfastActions(names.length);
        const inputs = inputsEl.querySelectorAll('.settings-name-input');
        inputs[inputs.length - 1]?.focus();
        return;
      }

      if (action === 'remove-breakfast-slot') {
        const idx = parseInt(btn.dataset.index);
        const inputsEl = container.querySelector('#breakfast-name-inputs');
        const names = getNamesFromInputs(container);
        names.splice(idx, 1);
        const newNames = names.length ? names : ['Breakfast'];
        inputsEl.innerHTML = renderBreakfastInputs(newNames);
        container.querySelector('#breakfast-actions').innerHTML = renderBreakfastActions(newNames.length);
        return;
      }

      if (action === 'save-breakfast-names') {
        let names = getNamesFromInputs(container).map(n => n.trim()).filter(Boolean);
        if (!names.length) names = ['Breakfast'];
        try {
          App.state.settings = await API.settings.update('breakfast_slots', JSON.stringify(names));
          container.querySelector('#breakfast-actions').innerHTML = renderBreakfastActions(names.length);
          Toast.show('Saved', 'success');
        } catch {
          Toast.show('Failed to save', 'error');
        }
        return;
      }

      // ---- Locations ----

      const id = parseInt(btn.dataset.id);

      if (action === 'rename-location') {
        const row = container.querySelector(`.settings-location-row[data-id="${id}"]`);
        const currentName = row.querySelector('.settings-location-name').textContent;
        row.innerHTML = `
          <input type="text" class="settings-add-input" value="${escapeHtml(currentName)}" style="flex:1;min-width:0" />
          <div class="settings-location-actions">
            <button class="settings-btn-primary"   data-action="confirm-rename" data-id="${id}">Save</button>
            <button class="settings-btn-secondary" data-action="cancel-rename"  data-id="${id}">Cancel</button>
          </div>
        `;
        row.querySelector('input').focus();
        return;
      }

      if (action === 'confirm-rename') {
        const row = container.querySelector(`.settings-location-row[data-id="${id}"]`);
        const newName = row.querySelector('input').value.trim();
        if (!newName) return;
        try {
          await API.locations.update(id, { name: newName });
          _locations = await API.locations.list();
          App.state.locations = _locations;
          container.querySelector('#location-list').innerHTML = renderLocationRows(_locations);
          Toast.show('Location renamed', 'success');
        } catch (err) {
          Toast.show(err.message, 'error');
        }
        return;
      }

      if (action === 'cancel-rename') {
        container.querySelector('#location-list').innerHTML = renderLocationRows(_locations);
        return;
      }

      if (action === 'delete-location') {
        const ok = await Modal.confirm('Delete location?', 'Cannot delete if any items are assigned to it.');
        if (!ok) return;
        try {
          await API.locations.delete(id);
          _locations = await API.locations.list();
          App.state.locations = _locations;
          container.querySelector('#location-list').innerHTML = renderLocationRows(_locations);
          Toast.show('Location deleted', 'success');
        } catch (err) {
          Toast.show(err.message, 'error');
        }
        return;
      }
    });

    // Add location form
    container.querySelector('#add-location-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = e.target.querySelector('.settings-add-input');
      const name = input.value.trim();
      if (!name) return;
      try {
        await API.locations.create({ name });
        _locations = await API.locations.list();
        App.state.locations = _locations;
        container.querySelector('#location-list').innerHTML = renderLocationRows(_locations);
        input.value = '';
        Toast.show('Location added', 'success');
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });

    // Theme toggle
    container.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
        container.querySelectorAll('[data-theme]').forEach(b =>
          b.classList.toggle('active', b.dataset.theme === btn.dataset.theme)
        );
      });
    });
  }

  return { render, applyTheme, getTheme, getBreakfastNames, APP_VERSION };
})();
