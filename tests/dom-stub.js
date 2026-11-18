/*
 * 最小 DOM / localStorage / clock 桩
 * 目的只有一个：让这个单页工具的函数能在 Node 里跑起来，好写自动化测试。
 * 它不模拟布局、不模拟样式、不模拟真实交互，只保证"调用不炸、返回值可断言"。
 */

class El {
  constructor(id, tag) {
    this.id = id || '';
    this.tagName = (tag || 'div').toUpperCase();
    this.value = '';
    this.innerHTML = '';
    this.textContent = '';
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.files = null;
    this.disabled = false;
    this.selectedOptions = [];
    this.label = '';
    this._listeners = {};
    const set = new Set();
    this.classList = {
      _set: set,
      add: (...c) => c.forEach(x => set.add(x)),
      remove: (...c) => c.forEach(x => set.delete(x)),
      contains: c => set.has(c),
      toggle: c => (set.has(c) ? set.delete(c) : set.add(c)),
      toString: () => Array.from(set).join(' ')
    };
  }
  appendChild(c) { this.children.push(c); return c; }
  insertBefore(c) { this.children.push(c); return c; }
  removeChild(c) {
    const i = this.children.indexOf(c);
    if (i >= 0) this.children.splice(i, 1);
    return c;
  }
  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }
  removeEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
  closest() { return null; }
  scrollIntoView() {}
  focus() {}
  select() {}
  click() {}
  remove() {}
  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k]; }
}

function createEnv(nowIso) {
  const store = {};
  const elements = {};

  class FixedDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(nowIso);
      else super(...args);
    }
    static now() { return new Date(nowIso).getTime(); }
  }

  const documentElement = new El('html', 'html');
  const body = new El('body', 'body');

  const document = {
    documentElement,
    body,
    title: '',
    getElementById(id) {
      if (!elements[id]) elements[id] = new El(id);
      return elements[id];
    },
    createElement(tag) { return new El('', tag); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    execCommand() { return true; }
  };

  const memory = [];
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); }
  };

  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    print() {},
    scrollTo() {}
  };

  return {
    elements,
    store,
    sandbox: {
      document,
      window,
      localStorage,
      navigator: {},
      Date: FixedDate,
      confirm: () => true,
      alert: () => {},
      setTimeout: () => 0,
      clearTimeout: () => {},
      console,
      URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
      Blob: function () {},
      memory
    }
  };
}

module.exports = { El, createEnv };
