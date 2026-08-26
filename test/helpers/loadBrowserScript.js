'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/**
 * Carrega um arquivo .js do site (pensado para rodar no browser, sem
 * module.exports) dentro de um sandbox Node via `vm`, para permitir testar
 * as funções puras que ele declara no escopo global.
 *
 * O arquivo NÃO é modificado nem precisa ser adaptado: script.js e
 * consulta.js só tocam document/window/firebase dentro de funções ou de um
 * listener de DOMContentLoaded que nunca dispara aqui, então stubs mínimos
 * bastam para o arquivo inteiro carregar sem lançar erro.
 */
function loadBrowserScript(relativePath) {
  const filePath = path.join(__dirname, '..', '..', relativePath);
  const code = fs.readFileSync(filePath, 'utf8');

  const sandbox = {
    console,
    document: { addEventListener() {} },
    window: { addEventListener() {} },
    navigator: {},
    localStorage: { getItem() { return null; }, setItem() {} },
    firebase: {},
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });

  return sandbox;
}

module.exports = { loadBrowserScript };
