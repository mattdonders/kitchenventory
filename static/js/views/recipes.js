/**
 * Recipes view — AI-powered recipe suggestions
 */
const RecipesView = (() => {
  let _recipes = [];

  function renderRecipe(recipe, index) {
    const ingredientsList = (recipe.ingredients || [])
      .map(i => `<li>${escapeHtml(i)}</li>`).join('');
    const instructionsList = (recipe.instructions || [])
      .map(i => `<li>${escapeHtml(i)}</li>`).join('');
    const usesBadges = (recipe.uses_items || [])
      .map(i => `<span class="badge badge-neutral">${escapeHtml(i)}</span>`).join('');

    return `
      <div class="recipe-card" data-index="${index}">
        <div class="recipe-card-header" data-action="toggle" data-index="${index}">
          <div>
            <div class="recipe-name">${escapeHtml(recipe.name || 'Recipe')}</div>
            <div class="recipe-description">${escapeHtml(recipe.description || '')}</div>
          </div>
          <span class="recipe-expand-icon">▾</span>
        </div>
        <div class="recipe-card-body">
          ${usesBadges ? `
            <div class="recipe-section-title">Uses from your pantry</div>
            <div class="recipe-uses">${usesBadges}</div>
          ` : ''}
          <div class="recipe-section-title">Ingredients</div>
          <ul class="recipe-ingredients">${ingredientsList}</ul>
          <div class="recipe-section-title">Instructions</div>
          <ol class="recipe-instructions">${instructionsList}</ol>
        </div>
      </div>
    `;
  }

  function renderRecipes(container) {
    const grid = container.querySelector('.recipes-grid');
    if (!grid) return;

    if (_recipes.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🍳</div>
          <h3>No recipes yet</h3>
          <p>Click "Get Suggestions" to generate recipes based on your inventory.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = _recipes.map(renderRecipe).join('');

    // Bind toggle events
    grid.querySelectorAll('[data-action="toggle"]').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.recipe-card');
        card.classList.toggle('expanded');
      });
    });
  }

  async function render(container, state) {
    document.getElementById('page-title').textContent = 'Recipe Suggestions';

    container.innerHTML = `
      <div class="recipes-view">
        <div class="card recipe-form">
          <div class="form-group">
            <label class="form-label" for="dietary-notes">Dietary notes / restrictions (optional)</label>
            <input class="form-input" id="dietary-notes" type="text"
              placeholder="e.g. vegetarian, gluten-free, no nuts…" />
          </div>
          <button class="btn btn-primary btn-lg" id="suggest-btn">🍳 Get Suggestions</button>
        </div>

        <div class="recipes-grid" id="recipes-grid">
          ${_recipes.length > 0 ? _recipes.map(renderRecipe).join('') : `
            <div class="empty-state" style="grid-column:1/-1">
              <div class="empty-icon">🍳</div>
              <h3>No recipes yet</h3>
              <p>Click "Get Suggestions" to generate recipes based on your inventory.</p>
            </div>
          `}
        </div>
      </div>
    `;

    // Re-bind toggle events if recipes already loaded
    if (_recipes.length > 0) {
      container.querySelectorAll('[data-action="toggle"]').forEach(header => {
        header.addEventListener('click', () => {
          header.closest('.recipe-card').classList.toggle('expanded');
        });
      });
    }

    bindEvents(container.querySelector('.recipes-view'));
  }

  function bindEvents(container) {
    const btn = container.querySelector('#suggest-btn');

    btn.addEventListener('click', async () => {
      const dietaryNotes = container.querySelector('#dietary-notes').value.trim();

      btn.disabled = true;
      btn.textContent = '⏳ Thinking…';

      const grid = container.querySelector('.recipes-grid');
      grid.innerHTML = `
        <div style="grid-column:1/-1; padding: 24px 0;">
          <div class="loading-bar"><div class="loading-bar-fill"></div></div>
          <p class="text-center text-muted">Claude is looking at your inventory and creating recipes…</p>
        </div>
      `;

      try {
        const result = await API.recipes.suggest(dietaryNotes);
        _recipes = result.recipes || [];
        renderRecipes(container);
        if (_recipes.length === 0) {
          Toast.show('No recipes returned. Try again.', 'warning');
        } else {
          Toast.show(`Got ${_recipes.length} recipe suggestion${_recipes.length > 1 ? 's' : ''}!`, 'success');
          // Auto-expand first recipe
          const first = container.querySelector('.recipe-card');
          if (first) first.classList.add('expanded');
        }
      } catch (err) {
        _recipes = [];
        renderRecipes(container);
        Toast.show('Error: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🍳 Get Suggestions';
      }
    });
  }

  return { render };
})();
