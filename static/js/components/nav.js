/**
 * Bottom / sidebar navigation
 */
const Nav = (() => {
  const TABS = [
    { id: 'inventory', icon: 'fa-solid fa-boxes-stacked', label: 'Inventory' },
    { id: 'add',       icon: 'fa-solid fa-circle-plus',   label: 'Add Item' },
    { id: 'shopping',  icon: 'fa-solid fa-cart-shopping', label: 'Shopping' },
    { id: 'recipes',   icon: 'fa-solid fa-utensils',      label: 'Recipes' },
  ];

  function render(activeTab) {
    const nav = document.getElementById('bottom-nav');
    nav.innerHTML = TABS.map(tab => `
      <button
        class="nav-tab ${activeTab && tab.id === activeTab ? 'active' : ''}"
        data-tab="${tab.id}"
        aria-label="${tab.label}"
      >
        <span class="nav-icon"><i class="${tab.icon}"></i></span>
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
