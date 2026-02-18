/**
 * App router and global state
 */
const App = (() => {
  // Shared state cache to avoid redundant API calls
  const state = {
    items: [],
    categories: [],
    locations: [],
  };

  const VIEWS = {
    inventory: {
      title: 'Inventory',
      render: (container, s) => InventoryView.render(container, s),
    },
    add: {
      title: 'Add Item',
      render: (container, s) => ItemFormView.render(container, s),
    },
    shopping: {
      title: 'Shopping List',
      render: (container, s) => ShoppingView.render(container, s),
    },
    recipes: {
      title: 'Recipes',
      render: (container, s) => RecipesView.render(container, s),
    },
    settings: {
      title: 'Settings',
      render: (container) => SettingsView.render(container),
    },
  };

  let _currentView = null;
  let _previousView = null;
  let _viewState = null;

  function renderHeaderActions(viewId) {
    const el = document.getElementById('header-actions');
    if (viewId === 'settings') {
      el.innerHTML = `<button id="header-back" title="Back" aria-label="Back">← Back</button>`;
      el.querySelector('#header-back').addEventListener('click', () => {
        navigate(_previousView || 'inventory');
      });
    } else {
      el.innerHTML = `<button id="header-settings" title="Settings" aria-label="Settings">⚙️</button>`;
      el.querySelector('#header-settings').addEventListener('click', () => {
        navigate('settings');
      });
    }
  }

  function navigate(viewId, viewState = null) {
    const view = VIEWS[viewId];
    if (!view) return;

    _previousView = _currentView;
    _currentView = viewId;
    _viewState = viewState;

    // Update page title
    document.getElementById('page-title').textContent = view.title;

    // Update nav (settings is not a tab, so pass null to clear active state when on settings)
    Nav.render(viewId === 'settings' ? null : viewId);

    // Update header button
    renderHeaderActions(viewId);

    // Render view
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    view.render(main, viewState);
  }

  async function init() {
    const loader = document.getElementById('initial-loader');
    if (loader) loader.remove();

    navigate('inventory');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { navigate, state };
})();
