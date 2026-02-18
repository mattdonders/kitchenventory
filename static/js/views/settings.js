/**
 * Settings view — version info and changelog
 */
const SettingsView = (() => {
  const APP_VERSION = '1.1.0';

  const CHANGELOG = [
    {
      version: '1.1.0',
      date: '2026-02-18',
      changes: [
        'Autocomplete on item name — suggestions from your inventory with unit/category auto-fill',
        'Quick-add mode — compact form that keeps category/location selected between adds',
        'Session list in quick-add — shows items added this session with one-tap undo',
        'Grouped inventory cards — items with the same name across multiple locations merge into one card with per-location sub-rows',
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

  function render(container) {
    const rows = CHANGELOG.map((entry, i) => `
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
          <div class="section-title">Changelog</div>
          ${rows}
        </div>
      </div>
    `;
  }

  return { render, APP_VERSION };
})();
