'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const sandbox = loadBrowserScript('consulta.js');

test('formatarTelefone - celular com DDD (11 dígitos)', () => {
  assert.equal(sandbox.formatarTelefone('11987654321'), '(11) 98765-4321');
});

test('formatarTelefone - fixo com DDD (10 dígitos)', () => {
  assert.equal(sandbox.formatarTelefone('1133334444'), '(11) 3333-4444');
});

test('formatarTelefone - ignora caracteres não numéricos na entrada', () => {
  assert.equal(sandbox.formatarTelefone('(11) 98765-4321'), '(11) 98765-4321');
});

test('formatarTelefone - tamanho fora do padrão retorna só os dígitos', () => {
  assert.equal(sandbox.formatarTelefone('123'), '123');
});

test('validarTelefone - aceita 10 ou 11 dígitos', () => {
  assert.equal(sandbox.validarTelefone('1133334444'), true);
  assert.equal(sandbox.validarTelefone('11987654321'), true);
});

test('validarTelefone - rejeita quantidade de dígitos inválida', () => {
  assert.equal(sandbox.validarTelefone('123456'), false);
  assert.equal(sandbox.validarTelefone('119876543210'), false);
});

test('normalizarTelefone - remove tudo que não for dígito', () => {
  assert.equal(sandbox.normalizarTelefone('(11) 98765-4321'), '11987654321');
});
