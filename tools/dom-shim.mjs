/**
 * ============================================================
 *  dom-shim.mjs — DOM tiruan super-ringan untuk uji boot headless
 * ------------------------------------------------------------
 *  BUKAN bagian dari game. Dipakai oleh `npm run check:boot`
 *  supaya seluruh aplikasi bisa di-import dan dijalankan di
 *  Node.js tanpa browser, untuk menangkap error saat start-up
 *  (import rusak, nama method salah, event tidak terdaftar).
 *
 *  Batasan yang disengaja: innerHTML TIDAK di-parse. Semua
 *  querySelector mengembalikan elemen tiruan yang permisif,
 *  jadi uji ini mendeteksi "crash", bukan kebenaran visual.
 * ============================================================
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

// ------------------------------------------------------------
//  Util
// ------------------------------------------------------------
const noop = () => {};
const noopChain = () => ctx2d;

/** Context 2D tiruan: semua method canvas ada dan tidak berbuat apa-apa. */
const ctx2d = new Proxy(
  {
    canvas: null,
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    font: "10px monospace",
    textAlign: "left",
    textBaseline: "top",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineJoin: "round",
    lineCap: "butt",
    shadowBlur: 0,
    shadowColor: "transparent",
    imageSmoothingEnabled: true,
    filter: "none",
    measureText: (t) => ({ width: String(t).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => ({}),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    putImageData: noop,
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    isPointInPath: () => false,
  },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      // method canvas apa pun → fungsi kosong yang bisa dirantai
      return noopChain;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  }
);

class ClassList {
  constructor(el) {
    this.el = el;
    this._set = new Set();
  }
  add(...c) {
    c.forEach((x) => x && this._set.add(String(x)));
    this.el.className = [...this._set].join(" ");
  }
  remove(...c) {
    c.forEach((x) => this._set.delete(String(x)));
    this.el.className = [...this._set].join(" ");
  }
  toggle(c, force) {
    const has = this._set.has(String(c));
    const want = force === undefined ? !has : !!force;
    if (want) this._set.add(String(c));
    else this._set.delete(String(c));
    this.el.className = [...this._set].join(" ");
    return want;
  }
  contains(c) {
    return this._set.has(String(c));
  }
  replace(a, b) {
    if (this._set.delete(String(a))) this._set.add(String(b));
  }
  get length() {
    return this._set.size;
  }
  forEach(fn) {
    [...this._set].forEach(fn);
  }
  [Symbol.iterator]() {
    return this._set[Symbol.iterator]();
  }
}

let elCounter = 0;

class Element {
  constructor(tag = "div", doc = null) {
    this.tagName = String(tag).toUpperCase();
    this.nodeName = this.tagName;
    this.nodeType = 1;
    this._doc = doc;
    this._uid = ++elCounter;
    this.id = "";
    this.className = "";
    this.classList = new ClassList(this);
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.childNodes = this.children;
    this.parentNode = null;
    this.parentElement = null;
    this.firstChild = null;
    this.lastChild = null;
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.scrollHeight = 1000;
    this.clientWidth = 1024;
    this.clientHeight = 700;
    this.offsetWidth = 1024;
    this.offsetHeight = 700;
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this.disabled = false;
    this.checked = false;
    this.hidden = false;
    this.readOnly = false;
    this.selectedIndex = 0;
    this.files = [];
    this.readyState = "complete";
    this._text = "";
    this._html = "";
    this._value = "";
    this._handlers = new Map();
    this._bySelector = new Map();
    this.style = new Proxy(
      { cssText: "", setProperty: (k, v) => (this.style[k] = v), removeProperty: (k) => delete this.style[k], getPropertyValue: (k) => this.style[k] ?? "" },
      { get: (t, p) => (p in t ? t[p] : ""), set: (t, p, v) => ((t[p] = v), true) }
    );
    this.options = [];
    this.width = 800;
    this.height = 600;
    this.currentTime = 0;
    this.volume = 1;
    this.paused = true;
    this.src = "";
    this.href = "";
  }

  get textContent() {
    return this._text;
  }
  set textContent(v) {
    this._text = String(v ?? "");
  }
  get innerText() {
    return this._text;
  }
  set innerText(v) {
    this._text = String(v ?? "");
  }
  get innerHTML() {
    return this._html;
  }
  set innerHTML(v) {
    this._html = String(v ?? "");
    // innerHTML tidak di-parse (lihat catatan di kepala berkas)
  }
  get outerHTML() {
    return `<${this.tagName.toLowerCase()}>${this._html}</${this.tagName.toLowerCase()}>`;
  }
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = v == null ? "" : String(v);
  }
  get firstElementChild() {
    return this.children[0] || null;
  }

  appendChild(child) {
    if (!child) return child;
    child.parentNode = this;
    child.parentElement = this;
    this.children.push(child);
    this.firstChild = this.children[0];
    this.lastChild = this.children[this.children.length - 1];
    if (child.id) this._doc?.registerById?.(child);
    // <script>/<link> dari CDN tidak akan pernah termuat di Node.
    // Picu event error supaya kode fallback jalan dan boot tidak menggantung.
    if (["SCRIPT", "LINK"].includes(child.tagName)) scheduleLoadFailure(child);
    if (child.tagName === "IMG") setTimeout(() => child.onload?.({ type: "load", target: child }), 0);
    return child;
  }
  append(...kids) {
    kids.forEach((k) => this.appendChild(typeof k === "string" ? this._doc.createTextNode(k) : k));
  }
  prepend(child) {
    child.parentNode = this;
    this.children.unshift(child);
    return child;
  }
  insertBefore(child) {
    return this.appendChild(child);
  }
  insertAdjacentHTML(_pos, html) {
    this._html += String(html ?? "");
  }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    return child;
  }
  replaceChildren(...kids) {
    this.children.length = 0;
    kids.forEach((k) => this.appendChild(k));
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
  contains(other) {
    return this.children.includes(other);
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === "id") this.id = String(v);
    if (k === "class") {
      this.className = String(v);
      this.classList._set = new Set(String(v).split(/\s+/).filter(Boolean));
    }
    if (k.startsWith("data-")) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
  }
  getAttribute(k) {
    return this.attributes[k] ?? null;
  }
  hasAttribute(k) {
    return k in this.attributes;
  }
  removeAttribute(k) {
    delete this.attributes[k];
  }
  addEventListener(type, fn) {
    if (!this._handlers.has(type)) this._handlers.set(type, []);
    this._handlers.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const list = this._handlers.get(type);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
  dispatchEvent(evt) {
    const list = this._handlers.get(evt?.type) || [];
    for (const fn of list.slice()) fn.call(this, evt);
    return true;
  }
  /** Uji headless: picu handler secara manual. */
  _fire(type, detail = {}) {
    return this.dispatchEvent({ type, target: this, currentTarget: this, preventDefault: noop, stopPropagation: noop, ...detail });
  }
  click() {
    this._fire("click");
  }
  focus() {}
  blur() {}
  scrollIntoView() {}
  scrollTo() {}
  animate() {
    return { finished: Promise.resolve(), cancel: noop, play: noop, pause: noop };
  }
  getBoundingClientRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 1024, bottom: 700, width: 1024, height: 700 };
  }
  getContext() {
    ctx2d.canvas = this;
    return ctx2d;
  }
  toDataURL() {
    return "data:image/png;base64,";
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  closest() {
    return this;
  }
  matches() {
    return true;
  }
  querySelector(sel) {
    if (!this._bySelector.has(sel)) this._bySelector.set(sel, new Element("div", this._doc));
    return this._bySelector.get(sel);
  }
  querySelectorAll() {
    return [];
  }
  getElementsByTagName() {
    return [];
  }
  getElementsByClassName() {
    return [];
  }
}

/** Pengganti marked.js: cukup untuk Markdown.render() tanpa CDN. */
function makeMarkedStub() {
  class Renderer {
    text(t) { return String(t ?? ""); }
    heading(t) { return `<h>${t}</h>`; }
    paragraph(t) { return `<p>${t}</p>`; }
    list(body) { return `<ul>${body}</ul>`; }
    listitem(t) { return `<li>${t}</li>`; }
    strong(t) { return `<b>${t}</b>`; }
    em(t) { return `<i>${t}</i>`; }
    codespan(t) { return `<code>${t}</code>`; }
    code(t) { return `<pre>${t}</pre>`; }
    link(href, _title, text) { return `<a href="${href}">${text}</a>`; }
    image(href) { return `<img src="${href}">`; }
    blockquote(t) { return `<blockquote>${t}</blockquote>`; }
    br() { return "<br>"; }
    hr() { return "<hr>"; }
    table() { return "<table></table>"; }
    html(t) { return String(t ?? ""); }
  }
  const marked = (src) => String(src ?? "");
  marked.parse = (src) => String(src ?? "");
  marked.Renderer = Renderer;
  marked.Lexer = class { static lex(src) { return [{ type: "paragraph", text: String(src ?? "") }]; } };
  marked.Parser = class { static parse() { return ""; } };
  marked.setOptions = () => marked;
  marked.use = () => marked;
  marked.defaults = { gfm: true, breaks: true };
  return marked;
}

/** AudioContext tiruan: cukup untuk AudioManager.init() tanpa suara. */
class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.sampleRate = 44100;
    this.destination = { connect: () => {}, numberOfInputs: 1 };
    this.listener = {};
  }
  createOscillator() {
    return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, value: 440 }, type: "sine" };
  }
  createGain() {
    return { connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, value: 1 } };
  }
  createBufferSource() {
    return { connect: () => {}, start: () => {}, stop: () => {}, buffer: null, loop: false };
  }
  createBuffer(ch, len) {
    return { length: len, numberOfChannels: ch, getChannelData: () => new Float32Array(len) };
  }
  createBiquadFilter() {
    return { connect: () => {}, frequency: { value: 1000 }, type: "lowpass" };
  }
  createStereoPanner() {
    return { connect: () => {}, pan: { value: 0 } };
  }
  createDynamicsCompressor() {
    return { connect: () => {} };
  }
  createWaveShaper() {
    return { connect: () => {}, curve: null };
  }
  createConvolver() {
    return { connect: () => {}, buffer: null };
  }
  createDelay() {
    return { connect: () => {}, delayTime: { value: 0 } };
  }
  decodeAudioData(_buf, ok) {
    ok?.({ length: 1, numberOfChannels: 1, getChannelData: () => new Float32Array(1) });
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

class ResizeObserverStub {
  constructor(cb) { this.cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** CDN tidak tersedia di uji headless → jalankan jalur fallback (onerror). */
function scheduleLoadFailure(el) {
  setTimeout(() => {
    try {
      if (typeof el.onerror === "function") el.onerror({ type: "error", target: el });
      el.dispatchEvent?.({ type: "error", target: el });
    } catch {
      /* abaikan */
    }
  }, 0);
}

class TextNode {
  constructor(text) {
    this.nodeType = 3;
    this.textContent = String(text);
    this.parentNode = null;
  }
}

class ShimDocument {
  constructor() {
    this._byId = new Map();
    this.documentElement = new Element("html", this);
    this.body = new Element("body", this);
    this.head = new Element("head", this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.readyState = "complete";
    this.title = "RetroSleuth";
    this.visibilityState = "visible";
    this.hidden = false;
    this.activeElement = this.body;
    this._handlers = new Map();
    this.fonts = { ready: Promise.resolve(), load: () => Promise.resolve([]) };
  }
  registerById(el) {
    if (el.id) this._byId.set(el.id, el);
  }
  getElementById(id) {
    if (!this._byId.has(id)) {
      const el = new Element("div", this);
      el.id = id;
      this._byId.set(id, el);
      this.body.appendChild(el);
    }
    return this._byId.get(id);
  }
  createElement(tag) {
    return new Element(tag, this);
  }
  createElementNS(_ns, tag) {
    return new Element(tag, this);
  }
  createTextNode(text) {
    return new TextNode(text);
  }
  createDocumentFragment() {
    return new Element("fragment", this);
  }
  querySelector(sel) {
    // "#id" → elemen terdaftar; selector lain → elemen tiruan permisif
    if (typeof sel === "string" && sel.startsWith("#") && !sel.includes(" ")) {
      return this.getElementById(sel.slice(1));
    }
    return this.body.querySelector(sel);
  }
  querySelectorAll(sel) {
    if (typeof sel === "string" && sel.startsWith(".")) return [];
    return [];
  }
  addEventListener(type, fn) {
    if (!this._handlers.has(type)) this._handlers.set(type, []);
    this._handlers.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const list = this._handlers.get(type);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
  dispatchEvent(evt) {
    for (const fn of (this._handlers.get(evt?.type) || []).slice()) fn(evt);
    return true;
  }
  execCommand() {
    return true;
  }
}

class MemoryStorage {
  constructor() {
    this._m = new Map();
  }
  get length() {
    return this._m.size;
  }
  key(i) {
    return [...this._m.keys()][i] ?? null;
  }
  getItem(k) {
    return this._m.has(String(k)) ? this._m.get(String(k)) : null;
  }
  setItem(k, v) {
    this._m.set(String(k), String(v));
  }
  removeItem(k) {
    this._m.delete(String(k));
  }
  clear() {
    this._m.clear();
  }
}

class ShimEvent {
  constructor(type, opts = {}) {
    this.type = type;
    Object.assign(this, opts);
    this.detail = opts.detail ?? null;
  }
  preventDefault() {}
  stopPropagation() {}
  stopImmediatePropagation() {}
}

/** fetch tiruan: membaca berkas dari disk repo (tanpa jaringan). */
function makeFetch() {
  return async function fetchShim(url, _opts = {}) {
    const u = String(url).split("?")[0].split("#")[0];
    const rel = u.replace(/^[a-z]+:\/\/[^/]+\//, "").replace(/^\//, "");
    if (/^https?:/i.test(u) && !u.includes("127.0.0.1") && !u.includes("localhost")) {
      const err = new Error(`Network request blocked in headless check: ${u}`);
      err.name = "TypeError";
      throw err;
    }
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
        url: u,
        headers: new Map(),
        json: async () => ({}),
        text: async () => "",
      };
    }
    const body = fs.readFileSync(file, "utf8");
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      url: u,
      headers: new Map([["content-type", rel.endsWith(".json") ? "application/json" : "text/plain"]]),
      json: async () => JSON.parse(body),
      text: async () => body,
      arrayBuffer: async () => new Uint8Array(Buffer.from(body)).buffer,
      blob: async () => ({ size: body.length, type: "text/plain" }),
    };
  };
}

/**
 * Pasang semua global tiruan. Aman dipanggil berkali-kali.
 * @returns {{document: ShimDocument, window: Object, errors: Array}}
 */
export function installDomShim() {
  const errors = [];
  const document = new ShimDocument();
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();

  const timers = {
    // Semua jeda dipercepat (maks 4 ms) supaya animasi boot typewriter
    // tidak memakan waktu nyata — ini uji logika, bukan uji animasi.
    setTimeout: (fn, ms = 0, ...args) => setTimeout(() => fn?.(...args), Math.min(ms, 4)),
    clearTimeout,
    setInterval: (fn, ms = 1000) => setInterval(() => fn?.(), Math.max(ms, 50)),
    clearInterval,
    requestAnimationFrame: (fn) => setTimeout(() => fn?.(Date.now()), 8),
    cancelAnimationFrame: clearTimeout,
    queueMicrotask,
  };

  const window = {
    ...timers,
    document,
    localStorage,
    sessionStorage,
    location: { href: "http://localhost/", origin: "http://localhost", pathname: "/index.html", protocol: "http:", host: "localhost", search: "", hash: "", reload: noop, assign: noop, replace: noop },
    history: { pushState: noop, replaceState: noop, back: noop, forward: noop },
    navigator: {
      onLine: false,
      userAgent: "node-boot-check",
      language: "id-ID",
      clipboard: { writeText: () => Promise.resolve() },
      storage: { estimate: async () => ({ quota: 0, usage: 0 }) },
    },
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    screen: { width: 1440, height: 900 },
    fetch: makeFetch(),
    CustomEvent: ShimEvent,
    Event: ShimEvent,
    MouseEvent: ShimEvent,
    KeyboardEvent: ShimEvent,
    Blob: class {
      constructor(parts = []) {
        this.size = parts.join("").length;
      }
    },
    File: class {},
    FileReader: class {
      readAsText() {
        this.onload?.({ target: { result: "" } });
      }
    },
    URL: Object.assign((u) => new URL(u, "http://localhost/"), { createObjectURL: () => "blob:mock", revokeObjectURL: noop }),
    Image: class {
      set src(_v) {
        setTimeout(() => this.onload?.(), 0);
      }
    },
    Audio: class {
      play() {
        return Promise.resolve();
      }
      pause() {}
      addEventListener() {}
    },
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    getComputedStyle: () => ({ getPropertyValue: () => "", fontSize: "16px" }),
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop }),
    ResizeObserver: ResizeObserverStub,
    IntersectionObserver: ResizeObserverStub,
    MutationObserver: ResizeObserverStub,
    addEventListener: (type, fn) => document.addEventListener(type, fn),
    removeEventListener: (type, fn) => document.removeEventListener(type, fn),
    dispatchEvent: (e) => document.dispatchEvent(e),
    alert: noop,
    confirm: () => true,
    prompt: () => "",
    open: () => null,
    close: noop,
    print: noop,
    scroll: noop,
    scrollTo: noop,
    requestFullscreen: () => Promise.resolve(),
    // pustaka CDN (tidak dimuat di Node) → pengganti aman
    marked: makeMarkedStub(),
    DOMPurify: { sanitize: (s) => String(s ?? ""), addHook: noop },
    lunr: undefined,
    confetti: noop,
    saveAs: noop,
    idb: undefined,
    indexedDB: undefined,
    console,
  };
  window.window = window;
  window.self = window;
  window.globalThis = globalThis;
  window.top = window;
  window.parent = window;

  const g = globalThis;
  const define = (name, value) => {
    try {
      Object.defineProperty(g, name, { value, writable: true, configurable: true });
    } catch {
      try {
        g[name] = value;
      } catch {
        /* navigator dll. mungkin read-only — abaikan */
      }
    }
  };

  define("window", window);
  define("document", document);
  define("localStorage", localStorage);
  define("sessionStorage", sessionStorage);
  define("fetch", window.fetch);
  define("CustomEvent", ShimEvent);
  define("Event", ShimEvent);
  define("MouseEvent", ShimEvent);
  define("KeyboardEvent", ShimEvent);
  define("Image", window.Image);
  define("Audio", window.Audio);
  define("FileReader", window.FileReader);
  define("Blob", window.Blob);
  define("requestAnimationFrame", window.requestAnimationFrame);
  define("cancelAnimationFrame", window.cancelAnimationFrame);
  define("getComputedStyle", window.getComputedStyle);
  define("matchMedia", window.matchMedia);
  define("ResizeObserver", ResizeObserverStub);
  define("AudioContext", MockAudioContext);
  define("IntersectionObserver", ResizeObserverStub);
  define("MutationObserver", ResizeObserverStub);
  define("DOMPurify", window.DOMPurify);
  define("marked", window.marked);
  define("confetti", window.confetti);
  define("HTMLElement", Element);
  define("Node", Element);
  try {
    Object.defineProperty(g, "navigator", { value: window.navigator, writable: true, configurable: true });
  } catch {
    /* Node punya navigator read-only — biarkan */
  }

  // rekam semua console.error sebagai kegagalan
  const origError = console.error.bind(console);
  console.error = (...args) => {
    errors.push(args.map(String).join(" "));
    origError(...args);
  };
  process.on("uncaughtException", (e) => errors.push(`uncaughtException: ${e?.stack || e}`));
  process.on("unhandledRejection", (e) => errors.push(`unhandledRejection: ${e?.stack || e}`));

  return { document, window, errors, Element };
}

export { Element as ShimElement, ROOT };
