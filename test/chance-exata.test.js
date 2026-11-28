'use strict';

// v129: "CHANCE" do card Potencial do Bolão = probabilidade EXATA de pelo
// menos um cartão fazer a faixa-alvo (ou mais). Antes era a SOMA das
// chances de cada cartão (= nº médio de cartões premiados), que inflava os
// bolões grandes (Quina 7173: mostrava 72,3%, o certo é 53,49%).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const site = loadBrowserScript('script.js');

// Força bruta: percorre TODOS os sorteios possíveis.
function forcaBruta(cartoes, N, k, alvo) {
  const sets = cartoes.map(c => new Set(c));
  let tot = 0, hit = 0;
  const d = [];
  (function rec(ini) {
    if (d.length === k) {
      tot++;
      if (sets.some(s => d.reduce((a, x) => a + (s.has(x) ? 1 : 0), 0) >= alvo)) hit++;
      return;
    }
    for (let n = ini; n <= N; n++) { d.push(n); rec(n + 1); d.pop(); }
  })(1);
  return hit / tot;
}

function rng(seed) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
function cartaoAleatorio(r, N, tam) {
  const s = new Set();
  while (s.size < tam) s.add(1 + Math.floor(r() * N));
  return [...s];
}

test('igual à força bruta em 60 bolões aleatórios (vários tamanhos, alvos e repetidos)', () => {
  const r = rng(42);
  for (let caso = 0; caso < 60; caso++) {
    const N = 14 + Math.floor(r() * 14);       // 14..27 (inclui universo > 32: bits em 2 palavras)
    const k = 3 + Math.floor(r() * 4);         // 3..6
    const alvo = 1 + Math.floor(r() * k);      // 1..k
    const qtd = 1 + Math.floor(r() * 12);
    const cartoes = [];
    for (let i = 0; i < qtd; i++) cartoes.push(cartaoAleatorio(r, N, Math.min(N, k + Math.floor(r() * 4))));
    if (qtd > 2) cartoes.push([...cartoes[0]].reverse()); // repetido, outra ordem
    const esperado = forcaBruta(cartoes, N, k, alvo);
    const obtido = site.chanceExataUmSorteio(cartoes, N, k, alvo);
    assert.ok(Math.abs(esperado - obtido) < 1e-12, `caso ${caso} N=${N} k=${k} alvo=${alvo}: ${obtido} != ${esperado}`);
  }
});

test('universo de 40 (2 palavras de bits) também bate com força bruta', () => {
  const r = rng(7);
  const cartoes = Array.from({ length: 9 }, () => cartaoAleatorio(r, 40, 7));
  assert.ok(Math.abs(site.chanceExataUmSorteio(cartoes, 40, 5, 3) - forcaBruta(cartoes, 40, 5, 3)) < 1e-12);
});

test('1 cartão: igual à fórmula hipergeométrica (Quina, 7 dezenas, terno ou mais)', () => {
  const C = site.combinacao;
  let esperado = 0;
  for (let j = 3; j <= 5; j++) esperado += C(7, j) * C(73, 5 - j) / C(80, 5);
  assert.ok(Math.abs(site.chanceExataUmSorteio([[1, 9, 22, 35, 48, 61, 77]], 80, 5, 3) - esperado) < 1e-12);
});

test('cartões menores que o alvo e lista vazia dão 0', () => {
  assert.equal(site.chanceExataUmSorteio([[1, 2]], 80, 5, 3), 0);
  assert.equal(site.chanceExataUmSorteio([], 60, 6, 4), 0);
});

test('nunca passa de 100% nem da soma das chances (erro antigo)', () => {
  const r = rng(99);
  const cartoes = Array.from({ length: 30 }, () => cartaoAleatorio(r, 25, 9));
  const p = site.chanceExataUmSorteio(cartoes, 25, 5, 3);
  const C = site.combinacao;
  let soma = 0;
  for (const c of cartoes) for (let j = 3; j <= 5; j++) soma += C(c.length, j) * C(25 - c.length, 5 - j) / C(25, 5);
  assert.ok(p <= 1 && p < soma, `p=${p} soma=${soma}`);
});

test('Dupla Sena combina os 2 sorteios: 1-(1-p)²', () => {
  assert.ok(Math.abs(site.combinarSorteiosChance(0.27226446915491453, 'duplasena') - 0.47040) < 1e-5);
  assert.equal(site.combinarSorteiosChance(0.3, 'mega'), 0.3);
});

test('Quina: classificação pelo % exato', () => {
  assert.equal(site.classeQuinaPorChance(0.5349).classificacao, 'ÓTIMO');
  assert.equal(site.classeQuinaPorChance(0.1596).classificacao, 'BOM');
  assert.equal(site.classeQuinaPorChance(0.0933).classificacao, 'SIMPLES');
  assert.equal(site.classeQuinaPorChance(null).classificacao, 'CALCULANDO');
});

test('card: "calculando…" até ter a conta; depois mostra o valor exato', () => {
  const cartoes = [{ numeros: [1, 2, 3, 4, 5, 6, 7] }, { numeros: [5, 6, 7, 8, 9, 10, 11] }];
  const antes = site.calcularChancesBolao(cartoes, 'quina');
  assert.match(antes, /calculando…/);
  assert.match(antes, /\(CALCULANDO\)/);
  assert.match(antes, /CHANCE \(TERNO OU \+\)/);
  const chave = site.chaveChanceBolao(cartoes, 'quina', 80, 5, 3);
  site._guardarChance(chave, site.chanceExataUmSorteio(cartoes.map(c => c.numeros), 80, 5, 3));
  const depois = site.calcularChancesBolao(cartoes, 'quina');
  assert.doesNotMatch(depois, /calculando/);
  assert.match(depois, /0\.\d{2}%/);
});

test('chave do cache muda se qualquer cartão mudar (nunca reaproveita chance velha)', () => {
  const a = [{ numeros: [1, 2, 3, 4, 5, 6] }, { numeros: [7, 8, 9, 10, 11, 12] }];
  const b = [{ numeros: [1, 2, 3, 4, 5, 7] }, { numeros: [7, 8, 9, 10, 11, 12] }];
  const ordemTrocada = [{ numeros: [12, 11, 10, 9, 8, 7] }, { numeros: [6, 5, 4, 3, 2, 1] }];
  assert.notEqual(site.chaveChanceBolao(a, 'mega', 60, 6, 4), site.chaveChanceBolao(b, 'mega', 60, 6, 4));
  assert.equal(site.chaveChanceBolao(a, 'mega', 60, 6, 4), site.chaveChanceBolao(ordemTrocada, 'mega', 60, 6, 4));
});
