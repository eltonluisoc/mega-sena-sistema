'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const sandbox = loadBrowserScript('script.js');

test('combinacao(n, k) - casos básicos', () => {
  assert.equal(sandbox.combinacao(6, 6), 1);
  assert.equal(sandbox.combinacao(6, 0), 1);
  assert.equal(sandbox.combinacao(7, 6), 7);
  assert.equal(sandbox.combinacao(10, 6), 210);
  assert.equal(sandbox.combinacao(15, 15), 1);
});

test('combinacao(n, k) - k maior que n retorna 0', () => {
  assert.equal(sandbox.combinacao(5, 6), 0);
});

test('nomeNivelAcerto - lotofácil sempre retorna "N PONTOS"', () => {
  assert.equal(sandbox.nomeNivelAcerto('lotofacil', 15), '15 PONTOS');
  assert.equal(sandbox.nomeNivelAcerto('lotofacil', 11), '11 PONTOS');
});

test('nomeNivelAcerto - mega usa nomes tradicionais', () => {
  assert.equal(sandbox.nomeNivelAcerto('mega', 6), 'SENA');
  assert.equal(sandbox.nomeNivelAcerto('mega', 5), 'QUINA');
  assert.equal(sandbox.nomeNivelAcerto('mega', 4), 'QUADRA');
});

test('nomeNivelAcerto - acerto sem nome cai no fallback "N ACERTOS"', () => {
  assert.equal(sandbox.nomeNivelAcerto('mega', 3), '3 ACERTOS');
  assert.equal(sandbox.nomeNivelAcerto('lotomania', 20), '20 ACERTOS');
});

test('ordenarCartoesPorAcertos - ordena do maior para o menor número de acertos', () => {
  const cartoes = [
    { id: 'a', numeros: [1, 2, 3] },
    { id: 'b', numeros: [1, 2, 3, 4, 5] },
    { id: 'c', numeros: [1] },
  ];
  const sorteados = [1, 2, 3, 4, 5, 6];

  const ordenado = sandbox.ordenarCartoesPorAcertos(cartoes, sorteados);

  // ordenado vem de um array criado dentro do sandbox `vm` (outro "realm"),
  // então convertemos para um array local antes de comparar.
  assert.deepEqual(Array.from(ordenado, c => c.id), ['b', 'a', 'c']);
});

test('ordenarCartoesPorAcertos - sem números sorteados retorna a lista original', () => {
  const cartoes = [{ id: 'a', numeros: [1] }, { id: 'b', numeros: [2] }];
  assert.equal(sandbox.ordenarCartoesPorAcertos(cartoes, null), cartoes);
});

test('calcularChancesBolao - cobertura de números e total de cartões da mega', () => {
  const cartoes = [
    { numeros: [1, 2, 3, 4, 5, 6] },
    { numeros: [7, 8, 9, 10, 11, 12] },
  ];
  const html = sandbox.calcularChancesBolao(cartoes, 'mega');

  assert.match(html, /12\/60/);
  assert.match(html, />2<\/div>/);
});
