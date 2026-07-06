const jsdom = require('jsdom');
const {JSDOM} = jsdom;

const testGlobal = global as {__tmJsdomInitialized?: boolean};

function setGlobalProperty(name: string, value: unknown) {
  Object.defineProperty(global, name, {
    configurable: true,
    writable: true,
    value,
  });
}

if (testGlobal.__tmJsdomInitialized !== true) {
  const dom = new JSDOM(`<!DOCTYPE html>`);

  setGlobalProperty('document', dom.window.document);
  setGlobalProperty('navigator', dom.window.navigator);
  setGlobalProperty('window', dom.window);
  setGlobalProperty('self', dom.window);

  setGlobalProperty('Element', dom.window.Element);
  setGlobalProperty('HTMLBodyElement', dom.window.HTMLBodyElement);
  setGlobalProperty('HTMLElement', dom.window.HTMLElement);
  setGlobalProperty('MutationObserver', dom.window.MutationObserver);
  setGlobalProperty('Node', dom.window.Node);
  setGlobalProperty('SVGElement', dom.window.SVGElement);
  setGlobalProperty('Text', dom.window.Text);
  setGlobalProperty('Comment', dom.window.Comment);
  setGlobalProperty('getComputedStyle', dom.window.getComputedStyle);
  setGlobalProperty('XMLHttpRequest', dom.window.XMLHttpRequest);
  setGlobalProperty('alert', () => undefined);
  Object.defineProperty(dom.window, 'alert', {
    configurable: true,
    writable: true,
    value: () => undefined,
  });

  testGlobal.__tmJsdomInitialized = true;
}
