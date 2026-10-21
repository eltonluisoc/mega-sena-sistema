'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const sandbox = loadBrowserScript('admin.js');

// compararChaveRanking NUNCA reimplementa nenhuma regra de negócio (o que
// conta como prêmio, qual faixa é "melhor", Duque excluído) -- ela só
// compara listas de inteiros JÁ PRONTAS, calculadas no Python
// (ver otimizador_cotas.py::_montar_documento_geracao). Estes testes
// cobrem só a comparação em si, com chaves de exemplo.

test('compararChaveRanking - geracao com Sena (tem_algo=1) vem antes de geracao so com Quadras', () => {
  const comSena = { chave_ranking: [1, 1, 1, 2] };     // 1 sena, 1 quina, 2 quadras
  const soQuadras = { chave_ranking: [1, 0, 0, 5] };    // 0 sena, 0 quina, 5 quadras
  assert.ok(sandbox.compararChaveRanking(comSena, soQuadras) < 0, 'comSena deve vir ANTES (negativo)');
  assert.ok(sandbox.compararChaveRanking(soQuadras, comSena) > 0, 'soQuadras deve vir DEPOIS (positivo)');
});

test('compararChaveRanking - geracao sem nenhum resultado (tem_algo=0) vai pro final', () => {
  const semResultado = { chave_ranking: [0, 0, 0, 0] };
  const comAlgo = { chave_ranking: [1, 0, 0, 1] };
  assert.ok(sandbox.compararChaveRanking(semResultado, comAlgo) > 0, 'semResultado deve vir DEPOIS');
});

test('compararChaveRanking - mesma faixa principal, desempata pela faixa seguinte', () => {
  const maisQuinas = { chave_ranking: [1, 0, 3, 1] };  // 0 sena, 3 quinas, 1 quadra
  const menosQuinas = { chave_ranking: [1, 0, 1, 10] }; // 0 sena, 1 quina, 10 quadras
  assert.ok(sandbox.compararChaveRanking(maisQuinas, menosQuinas) < 0, 'mais quinas deve vir ANTES, mesmo com menos quadras');
});

test('compararChaveRanking - empate total retorna 0 (ordem estavel)', () => {
  const a = { chave_ranking: [1, 2, 3, 4] };
  const b = { chave_ranking: [1, 2, 3, 4] };
  assert.equal(sandbox.compararChaveRanking(a, b), 0);
});

test('compararChaveRanking - lida com chave_ranking ausente sem lancar excecao', () => {
  const semChave = {};
  const comChave = { chave_ranking: [1, 0, 0, 1] };
  assert.doesNotThrow(() => sandbox.compararChaveRanking(semChave, comChave));
  assert.ok(sandbox.compararChaveRanking(semChave, comChave) > 0, 'sem chave_ranking deve ir pro final, nao travar');
});

test('Array.sort com compararChaveRanking ordena uma lista completa corretamente', () => {
  const lista = [
    { nome: 'sem resultado', chave_ranking: [0, 0, 0, 0] },
    { nome: 'so quadras', chave_ranking: [1, 0, 0, 5] },
    { nome: 'com sena', chave_ranking: [1, 1, 1, 2] },
    { nome: 'com quina', chave_ranking: [1, 0, 2, 0] },
  ];
  const ordenada = [...lista].sort(sandbox.compararChaveRanking);
  assert.deepEqual(ordenada.map(x => x.nome), ['com sena', 'com quina', 'so quadras', 'sem resultado']);
});
