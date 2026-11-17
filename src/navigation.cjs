const layout = require('./layout.cjs');
const MAX_TABS = 30;
const MAX_PANELS = 4;

function members(state) { return layout.ids(state.tree); }
function visible(state) {
  return state.presentation === 'multi' ? members(state) : state.active ? [state.active] : [];
}
function activate(state, id, {focusOnly = false} = {}) {
  if (!state.tabs.some(tab => tab.id === id)) return false;
  state.active = id;
  if (!focusOnly) state.presentation = members(state).includes(id) ? 'multi' : 'single';
  return true;
}
function configure(state, ids, mode) {
  if (!Array.isArray(ids) || ids.length > MAX_PANELS || new Set(ids).size !== ids.length ||
      ids.some(id => !state.tabs.some(tab => tab.id === id)) || !['grid', 'columns'].includes(mode)) return false;
  state.tree = layout.preset(ids, mode);
  state.mode = mode;
  state.presentation = ids.length ? 'multi' : 'single';
  if (ids.length && !ids.includes(state.active)) state.active = ids[0];
  return true;
}
function remove(state, id) {
  const oldVisible = visible(state);
  state.tabs = state.tabs.filter(tab => tab.id !== id);
  state.tree = layout.remove(state.tree, id);
  if (state.active === id) {
    const next = oldVisible.find(value => value !== id && state.tabs.some(tab => tab.id === value)) || state.tabs[0]?.id;
    state.active = next || null;
    state.presentation = next && members(state).includes(next) ? 'multi' : 'single';
  }
  if (!state.tree) state.presentation = 'single';
}
module.exports = {MAX_TABS, MAX_PANELS, members, visible, activate, configure, remove};
