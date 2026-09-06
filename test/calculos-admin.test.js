'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const sandbox = loadBrowserScript('admin.js');

test('contarPremiosPorFaixaAdmin - cartão de 8 números com 4 acertos vale 6 quadras, não 1', () => {
  const faixas = sandbox.contarPremiosPorFaixaAdmin(8, 4, 6);
  assert.equal(faixas[4], 6);
  assert.equal(faixas[3], 16);
  assert.equal(faixas[2], 6);
  const total = Object.values(faixas).reduce((a, b) => a + b, 0);
  assert.equal(total, sandbox.combinacaoAdmin(8, 6));
});

test('contarPremiosPorFaixaAdmin - cartão do tamanho mínimo vale exatamente 1 prêmio', () => {
  const faixas = sandbox.contarPremiosPorFaixaAdmin(6, 4, 6);
  assert.deepEqual(Object.keys(faixas).map(Number), [4]);
  assert.equal(faixas[4], 1);
});

// Pedido do usuário: o card "TOP CONCURSOS MEGA-SENA" (dashboard admin)
// mostrava "Concurso 3054 — 2 quadras" contando CARTÕES, não prêmios reais.
// Um cartão de aposta múltipla (mais números que o mínimo) vale várias
// apostas simples, então o ranking precisa somar prêmios, não cartões.
test('calcularEstatisticas - ranking top-3 soma prêmios reais de um cartão de aposta múltipla', () => {
  const numerosSorteados = [1, 2, 3, 4, 5, 6];
  const cartoes = [
    { tipo: 'mega', concurso: '3054', bolao: 'Bolão 10,00', numeros: [1, 2, 3, 4, 20, 21, 22, 23] }, // 8 números, 4 acertos -> 6 quadras
  ];
  const resultados = { mega: { 3054: numerosSorteados }, lotofacil: {}, quina: {} };

  const stats = sandbox.calcularEstatisticas(cartoes, resultados);
  const top3 = stats.top3PorLoteria.mega;

  assert.equal(top3.length, 1);
  assert.equal(String(top3[0].concurso), '3054');
  assert.equal(top3[0].maxAcertos, 4);
  assert.equal(top3[0].quantidade, 6);
});

test('calcularEstatisticas - soma prêmios de vários cartões do mesmo concurso', () => {
  const numerosSorteados = [1, 2, 3, 4, 5, 6];
  const cartoes = [
    { tipo: 'mega', concurso: '3054', bolao: 'A', numeros: [1, 2, 3, 4, 5, 40] }, // mínimo, 5 acertos -> 1 quina
    { tipo: 'mega', concurso: '3054', bolao: 'B', numeros: [1, 2, 3, 4, 5, 41] }, // mínimo, 5 acertos -> 1 quina
  ];
  const resultados = { mega: { 3054: numerosSorteados }, lotofacil: {}, quina: {} };

  const stats = sandbox.calcularEstatisticas(cartoes, resultados);
  const top3 = stats.top3PorLoteria.mega;

  assert.equal(top3[0].maxAcertos, 5);
  assert.equal(top3[0].quantidade, 2);
});
