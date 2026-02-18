/**
 * Settings view — version info, dark mode toggle, changelog
 */
const SettingsView = (() => {
  const APP_VERSION = '1.5.0';
  const LS_THEME = 'kv_theme';

  const CHANGELOG = [
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

  // --- Render ---

  function render(container) {
    const currentTheme = getTheme();

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
          <div class="section-title">Appearance</div>
          <div class="settings-row">
            <span class="settings-row-label">Theme</span>
            <div class="mode-toggle">
              <button type="button" class="mode-btn ${currentTheme === 'system' ? 'active' : ''}" data-theme="system">System</button>
              <button type="button" class="mode-btn ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">Light</button>
              <button type="button" class="mode-btn ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">Dark</button>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">Changelog</div>
          ${changelogRows}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
        container.querySelectorAll('[data-theme]').forEach(b =>
          b.classList.toggle('active', b.dataset.theme === btn.dataset.theme)
        );
      });
    });
  }

  return { render, applyTheme, getTheme, APP_VERSION };
})();
