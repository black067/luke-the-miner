/* ============================================================
   DOM.TS — Lightweight DOM helper functions
   ============================================================ */

// Helper to create an element with properties and children
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Record<string, string> | null,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props) setElementProps(element, props);
  appendChildren(element, children);
  return element;
}

function setElementProps(el: HTMLElement, props: Record<string, string>): void {
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'id') {
      el.id = value;
    } else if (key === 'textContent') {
      el.textContent = value;
    } else if (key === 'style') {
      el.style.cssText = value;
    } else if (key.startsWith('data-')) {
      el.dataset[key.slice(5)] = value;
    } else {
      el.setAttribute(key, value);
    }
  }
}

// Convenience wrappers
export function div(props?: Record<string, string> | null, ...children: (string | Node)[]): HTMLDivElement {
  return el('div', props, ...children);
}

export function span(props?: Record<string, string> | null, ...children: (string | Node)[]): HTMLSpanElement {
  return el('span', props, ...children);
}

export function button(props?: Record<string, string> | null, ...children: (string | Node)[]): HTMLButtonElement {
  return el('button', props, ...children);
}

// Set attributes from a props object
export function setAttrs(el: HTMLElement, props: Record<string, string>): void {
  for (const [key, value] of Object.entries(props)) {
    el.setAttribute(key, value);
  }
}

// Append children (strings become text nodes)
export function appendChildren(el: HTMLElement, children: (string | Node)[]): void {
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }
}

// Safely set text content
export function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}
