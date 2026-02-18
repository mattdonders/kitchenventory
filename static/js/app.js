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
  };

  let _currentView = null;
  let _viewState = null;

  function navigate(viewId, viewState = null) {
    const view = VIEWS[viewId];
    if (!view) return;

    _currentView = viewId;
    _viewState = viewState;

    // Update page title
    document.getElementById('page-title').textContent = view.title;

    // Update nav
    Nav.render(viewId);

    // Render view
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    view.render(main, viewState);
  }

  async function init() {
    // Remove initial loader
    const loader = document.getElementById('initial-loader');
    if (loader) loader.remove();

    // Start on inventory
    navigate('inventory');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { navigate, state };
})();
