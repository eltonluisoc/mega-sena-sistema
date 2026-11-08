'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const sandbox = loadBrowserScript('admin.js');

const plano = (v) => JSON.parse(JSON.stringify(v));

test('montarIndiceCartoes - ordena concursos, acha o último e não repete bolão', () => {
  const indice = plano(sandbox.montarIndiceCartoes([
    { tipo: 'mega', concurso: '3070', bolao: 'A' },
    { tipo: 'mega', concurso: '3071', bolao: 'A' },
    { tipo: 'mega', concurso: '3071', bolao: 'A' },
    { tipo: 'mega', concurso: '3071', bolao: 'B' },
    { tipo: 'quina', concurso: '100' },
  ]));
  assert.equal(indice.ultimosConcursos.mega, 3071);
  assert.deepEqual(indice.concursosMap.mega, [3071, 3070]);
  assert.deepEqual(indice.boloesMap.mega['3071'], ['A', 'B']);
  assert.deepEqual(indice.boloesMap.quina['100'], ['Sem Bolão']);
  assert.equal(indice.ultimosConcursos.lotofacil, null);
});

test('montarIndiceCartoes - ignora tipo desconhecido e cartão sem concurso', () => {
  const indice = plano(sandbox.montarIndiceCartoes([
    { tipo: 'lotomania', concurso: '1', bolao: 'X' },
    { tipo: 'mega', bolao: 'Y' },
  ]));
  assert.deepEqual(indice.concursosMap.mega, []);
  assert.deepEqual(indice.boloesMap.mega, {});
});
