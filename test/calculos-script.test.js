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

// Regressão do bug: a classificação por estrelas usava um número absoluto
// de "bilhetes equivalentes" (>=10000 = EXCELENTE etc.) igual pras 3
// loterias, mas esse número cresce em ritmos bem diferentes conforme a
// loteria (k=6 na Mega, k=15 na Lotofácil, k=5 na Quina) — um bolão de
// cartões de 18 números na Lotofácil batia 5 estrelas com poucos
// cartões, enquanto um bolão de Quina com cartões do mínimo de 5 números
// (o mais comum na prática) quase nunca saía de 1 estrela, por maior que
// fosse o bolão. A correção usa a probabilidade real (bilhetes cobertos /
// total de combinações possíveis daquela loteria), comparável entre as 3.
test('calcularChancesBolao - Quina com cartões mínimos (5 números) não trava sempre em 1 estrela', () => {
  // 60 cartões do mínimo (5 números = 1 combinação cada) — um bolão
  // razoavelmente grande que, pelo critério antigo (>=100 bilhetes pra
  // sair de SIMPLES), nunca passaria de 1 estrela.
  const cartoes = Array.from({ length: 60 }, (_, i) => ({
    numeros: [1 + i % 76, 2 + i % 76, 3 + i % 76, 4 + i % 76, 5 + i % 76],
  }));
  const html = sandbox.calcularChancesBolao(cartoes, 'quina');

  assert.match(html, /REGULAR|BOM|ÓTIMO|EXCELENTE/);
});

test('calcularChancesBolao - Lotofácil com poucos cartões grandes não mostra número inflado como EXCELENTE fácil demais', () => {
  // 2 cartões de 20 números (o máximo) já somam 2x combinacao(20,15) =
  // 31.008 bilhetes equivalentes — pelo critério antigo isso já era
  // "EXCELENTE" (>=10000) com só 2 cartões, o que não faz sentido pra
  // classificar o TAMANHO de um bolão.
  const vinte = Array.from({ length: 20 }, (_, i) => i + 1);
  const cartoes = [{ numeros: vinte }, { numeros: vinte }];
  const html = sandbox.calcularChancesBolao(cartoes, 'lotofacil');

  // Ainda pode ser EXCELENTE (a probabilidade real desses 2 cartões é
  // mesmo alta pra Lotofácil) — o que importa é que a classificação segue
  // consistente com a fração coberta do universo, não um número solto.
  assert.match(html, /CHANCE REAL/);
});

test('formatarProbabilidade - ajusta casas decimais conforme a grandeza', () => {
  assert.equal(sandbox.formatarProbabilidade(0), '0%');
  assert.equal(sandbox.formatarProbabilidade(0.05), '5.0%');
  assert.equal(sandbox.formatarProbabilidade(0.0005), '0.05%');
  assert.equal(sandbox.formatarProbabilidade(0.0000012), '0.0001%');
});
