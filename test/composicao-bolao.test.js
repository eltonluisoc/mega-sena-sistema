'use strict';

// v128: card "Composição do bolão" no index (abaixo do Potencial do Bolão).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const site = loadBrowserScript('script.js');
const texto = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

function cartoesMega(qtd8, qtd9) {
  const l = [];
  for (let i = 0; i < qtd8; i++) l.push({ numeros: [1, 2, 3, 4, 5, 6, 7, 8].map(n => ((n + i * 8 - 1) % 60) + 1) });
  for (let i = 0; i < qtd9; i++) l.push({ numeros: [10, 11, 12, 13, 14, 15, 16, 17, 18] });
  return l;
}

test('bolão misto: grupos por tamanho, apostas e % (Mega 56×8 + 4×9)', () => {
  const t = texto(site.gerarComposicaoBolao(cartoesMega(56, 4), 'mega'));
  assert.match(t, /9 dezenas 336 apostas \(18%\)/);
  assert.match(t, /4 cartões × 84 apostas cada/);
  assert.match(t, /8 dezenas 1\.568 apostas \(82%\)/);
  assert.match(t, /Total: 60 cartões = 1\.904 apostas simples/);
  // 9 dezenas vem antes de 8
  assert.ok(t.indexOf('9 dezenas') < t.indexOf('8 dezenas'));
});

test('cobertura: todos os números x parte deles', () => {
  assert.match(texto(site.gerarComposicaoBolao(cartoesMega(8, 0), 'mega')), /Todos os 60 números estão no bolão/);
  const parcial = site.gerarComposicaoBolao([{ numeros: [1, 2, 3, 4, 5, 6, 7] }], 'quina');
  assert.match(texto(parcial), /7 de 80 números estão no bolão · cada um em 1 cartão/);
  assert.equal((parcial.match(/comp-n vazio/g) || []).length, 73);
});

test('singular: 1 cartão, 1 aposta', () => {
  const t = texto(site.gerarComposicaoBolao([{ numeros: [1, 2, 3, 4, 5, 6] }], 'mega'));
  assert.match(t, /1 cartão × 1 aposta cada/);
});

test('+Milionária: trevos entram no grupo e nas apostas', () => {
  const t = texto(site.gerarComposicaoBolao([
    { numeros: [1, 2, 3, 4, 5, 6], trevos: [1, 2] },
    { numeros: [1, 2, 3, 4, 5, 6], trevos: [1, 2, 3] },
  ], 'maismilionaria'));
  assert.match(t, /6 dezenas \+ 3 trevos 3 apostas/);
  assert.match(t, /Total: 2 cartões = 4 apostas simples/);
});

test('Lotofácil usa "números" e não mostra valores em R$', () => {
  const html = site.gerarComposicaoBolao([{ numeros: Array.from({ length: 17 }, (_, i) => i + 1) }], 'lotofacil');
  assert.match(texto(html), /17 números 136 apostas/);
  assert.doesNotMatch(html, /R\$|cota/i);
});

test('lista vazia não quebra', () => {
  assert.equal(site.gerarComposicaoBolao([], 'mega'), '');
});
