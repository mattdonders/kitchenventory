/**
 * Bottom / sidebar navigation
 */
const Nav = (() => {
  const TABS = [
    { id: 'inventory', icon: '🏠', label: 'Inventory' },
    { id: 'add',       icon: '➕', label: 'Add Item' },
    { id: 'shopping',  icon: '🛒', label: 'Shopping' },
    { id: 'recipes',   icon: '🍳', label: 'Recipes' },
  ];

  function render(activeTab) {
    const nav = document.getElementById('bottom-nav');
    nav.innerHTML = TABS.map(tab => `
      <button
        class="nav-tab ${tab.id === activeTab ? 'active' : ''}"
        data-tab="${tab.id}"
        aria-label="${tab.label}"
      >
        <span class="nav-icon">${tab.icon}</span>
        <span>${tab.label}</span>
      </button>
    `).join('');

    nav.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        App.navigate(btn.dataset.tab);
      });
    });
  }

  return { render };
})();
