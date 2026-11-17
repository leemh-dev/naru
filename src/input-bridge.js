// Shared DOM operations for desktop and the Android compatibility app.
// Keep native privileges and logging outside these scripts.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NaruInput = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  function operation(name, args) {
    function allowed(e) {
      return !!e && e.isConnected && !e.disabled && !e.readOnly &&
        (e.tagName === 'TEXTAREA' || (e.tagName === 'INPUT' && ['text', 'search'].includes(e.type)) || e.isContentEditable);
    }
    function value(e) { return 'value' in e ? e.value : e.innerText; }
    if (name === 'selection') {
      const e = document.activeElement;
      if (e?.tagName === 'INPUT' && e.type === 'password') return '';
      if (allowed(e) && typeof e.selectionStart === 'number' && e.selectionEnd > e.selectionStart)
        return e.value.slice(e.selectionStart, e.selectionEnd);
      return window.getSelection()?.toString() || '';
    }
    const fields = globalThis.__naruReceivingFields ||= Object.create(null);
    if (name === 'register') {
      const e = document.activeElement;
      if (!allowed(e)) return 'unsupported';
      fields[args.field] = e;
      return 'ok';
    }
    const e = fields[args.field];
    if (!allowed(e)) return name === 'inspect' ? {status: 'gone'} : 'gone';
    if (name === 'ready') {
      if (value(e).length) return 'occupied';
      e.focus();
      return document.activeElement === e ? 'ok' : 'focus-failed';
    }
    if (name === 'insert') {
      if (value(e).length) return 'occupied';
      e.focus();
      if (document.activeElement !== e) return 'focus-failed';
      if ('value' in e) {
        const prototype = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(e, args.text);
        e.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText', data: args.text}));
        e.dispatchEvent(new Event('change', {bubbles: true}));
      } else document.execCommand('insertText', false, args.text);
      return 'ok';
    }
    if (name === 'inspect') {
      const actual = value(e), expected = args.text;
      return {status: actual === expected ? 'exact' : 'changed',
        expectedNewlines: (expected.match(/\n/g) || []).length,
        actualNewlines: (actual.match(/\n/g) || []).length};
    }
    return 'unsupported';
  }
  return {run: operation, script(name, args = {}) { return '(' + operation.toString() + ')(' + JSON.stringify(name) + ',' + JSON.stringify(args) + ')'; }};
});
