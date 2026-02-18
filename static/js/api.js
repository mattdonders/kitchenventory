/**
 * API client — wraps all fetch calls to the backend
 */
const API = (() => {
  const BASE = '/api';

  async function request(method, path, body) {
    const opts = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);

    if (res.status === 204) return null;

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.detail || `HTTP ${res.status}`;
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  }

  // Items
  const items = {
    list: (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''))
      ).toString();
      return request('GET', `/items${qs ? '?' + qs : ''}`);
    },
    get: (id) => request('GET', `/items/${id}`),
    create: (data) => request('POST', '/items', data),
    bulkCreate: (dataArray) => request('POST', '/items/bulk', { items: dataArray }),
    parseList: (text) => request('POST', '/items/parse-list', { text }),
    update: (id, data) => request('PUT', `/items/${id}`, data),
    delete: (id) => request('DELETE', `/items/${id}`),
    adjustQty: (id, delta) => request('PATCH', `/items/${id}/quantity`, { delta }),
  };

  // Categories
  const categories = {
    list: () => request('GET', '/categories'),
  };

  // Locations
  const locations = {
    list: () => request('GET', '/locations'),
  };

  // Shopping
  const shopping = {
    list: () => request('GET', '/shopping'),
    add: (data) => request('POST', '/shopping', data),
    update: (id, data) => request('PUT', `/shopping/${id}`, data),
    delete: (id) => request('DELETE', `/shopping/${id}`),
    autoSuggest: () => request('POST', '/shopping/auto-suggest'),
    export: () => request('GET', '/shopping/export'),
    clearChecked: () => request('DELETE', '/shopping/checked'),
  };

  // Recipes
  const recipes = {
    suggest: (dietary_notes = '') => request('POST', '/recipes/suggest', { dietary_notes }),
  };

  return { items, categories, locations, shopping, recipes };
})();
