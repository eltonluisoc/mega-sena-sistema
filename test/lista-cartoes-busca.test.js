'use strict';

// v125: busca na Lista de Cartões e integridade ao editar um cartão.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const admin = loadBrowserScript('admin.js');
const plano = (v) => JSON.parse(JSON.stringify(v));

const lista = [
  { id: 'AAAAkf3b9z', tipo: 'duplasena', concurso: '3036', bolao: 'Bolão 8,00 + 56,08', numeros: [4, 7, 8, 10, 15, 28, 32, 37] },
  { id: 'BBBBx1y2z3', tipo: 'duplasena', concurso: '3036', bolao: 'Bolão 8,00 + 56,08', numeros: [3, 5, 9, 32, 39, 41, 46, 50] },
  { id: 'CCCCq9w8e7', tipo: 'duplasena', concurso: '3034', bolao: '10,00', numeros: [2, 3, 5, 6, 12, 24, 28, 47] },
];
const ids = (r) => plano(r.lista.map(c => c.id));

test('busca vazia não filtra', () => {
  const r = admin.filtrarCartoesPorBusca(lista, '  ', 'duplasena');
  assert.equal(r.ativa, false);
  assert.equal(r.lista.length, 3);
});

test('números: o cartão precisa ter TODOS (qualquer ordem, com zero à esquerda)', () => {
  assert.deepEqual(ids(admin.filtrarCartoesPorBusca(lista, '32 08', 'duplasena')), ['AAAAkf3b9z']);
  assert.deepEqual(ids(admin.filtrarCartoesPorBusca(lista, '32', 'duplasena')), ['AAAAkf3b9z', 'BBBBx1y2z3']);
  assert.deepEqual(plano([...admin.filtrarCartoesPorBusca(lista, '32,08', 'duplasena').numeros]), [32, 8]);
});

test('número maior que o volante vira concurso', () => {
  assert.deepEqual(ids(admin.filtrarCartoesPorBusca(lista, '3034', 'duplasena')), ['CCCCq9w8e7']);
  assert.deepEqual(ids(admin.filtrarCartoesPorBusca(lista, '3036 50', 'duplasena')), ['BBBBx1y2z3']);
});

test('código do cartão (#final) e nome do bolão sem acento', () => {
  assert.deepEqual(ids(admin.filtrarCartoesPorBusca(lista, '#x1y2z3', 'duplasena')), ['BBBBx1y2z3']);
  assert.deepEqual(ids(admin.filtrarCartoesPorBusca(lista, 'bolao', 'duplasena')), ['AAAAkf3b9z', 'BBBBx1y2z3']);
  assert.deepEqual(ids(admin.filtrarCartoesPorBusca(lista, 'nada', 'duplasena')), []);
});

test('edição: acusa cartão igual no mesmo concurso e bolão', () => {
  const novo = { tipo: 'duplasena', concurso: '3036', bolao: 'Bolão 8,00 + 56,08 ', numeros: [50, 46, 41, 39, 32, 9, 5, 3] };
  assert.equal(admin.cartaoIgualNaLista(lista, 'AAAAkf3b9z', novo).id, 'BBBBx1y2z3');
  // o próprio cartão não conta
  assert.equal(admin.cartaoIgualNaLista(lista, 'BBBBx1y2z3', novo), null);
  // outro bolão não é duplicado
  assert.equal(admin.cartaoIgualNaLista(lista, 'AAAAkf3b9z', { ...novo, bolao: 'Outro' }), null);
});

test('edição: cotas seguem o cartão quando muda dezena', () => {
  const ch = ['1,2,3,4,5,6', '7,8,9,10,11,12'];
  assert.deepEqual(plano(admin._chavesGrupoAposEdicao(ch, '1,2,3,4,5,6', '1,2,3,4,5,7', true, false)), ['1,2,3,4,5,7', '7,8,9,10,11,12']);
  // mudou de concurso: sai do grupo
  assert.deepEqual(plano(admin._chavesGrupoAposEdicao(ch, '1,2,3,4,5,6', 'x', false, false)), ['7,8,9,10,11,12']);
  // mesmo jogo ainda existe em outro bolão: a chave antiga fica
  assert.deepEqual(plano(admin._chavesGrupoAposEdicao(ch, '1,2,3,4,5,6', '1,2,3,4,5,7', true, true)), ['1,2,3,4,5,6', '1,2,3,4,5,7', '7,8,9,10,11,12']);
});
