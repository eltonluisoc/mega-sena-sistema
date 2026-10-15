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

test('regrasLoteria - +Milionária tem as 2 dimensões (números e trevos)', () => {
  const regras = sandbox.regrasLoteria('maismilionaria');
  assert.equal(regras.minNumeros, 6);
  assert.equal(regras.maxNumeros, 12);
  assert.equal(regras.maxValor, 50);
  assert.equal(regras.trevos.min, 2);
  assert.equal(regras.trevos.max, 6);
  assert.equal(regras.trevos.maxValor, 6);
});

test('parseTrevosTexto - valida quantidade mínima/máxima e intervalo', () => {
  const regrasTrevos = { min: 2, max: 6, maxValor: 6 };
  // Array construído dentro do sandbox (vm context) é de um "realm"
  // diferente do array literal aqui — deepEqual falha por causa disso
  // mesmo com os valores idênticos; o spread recria num array nativo.
  assert.deepEqual([...sandbox.parseTrevosTexto('02 05', regrasTrevos).trevos], [2, 5]);
  assert.match(sandbox.parseTrevosTexto('05', regrasTrevos).erro, /mínimo 2/);
  assert.match(sandbox.parseTrevosTexto('01 02 03 04 05 06 07', regrasTrevos).erro, /máximo 6/);
  assert.match(sandbox.parseTrevosTexto('02 07', regrasTrevos).erro, /entre 1 e 6/);
  assert.match(sandbox.parseTrevosTexto('02 02', regrasTrevos).erro, /repetidos/);
});

// Achado real (Rodada 82): ordenar strings "DD/MM/AAAA" direto (sort
// nativo/localeCompare) ordena pelo DIA primeiro, não pelo ano/mês —
// "05/01/2026" viria ANTES de "20/12/2025" mesmo sendo depois de
// verdade. _compararDataBR corrige isso tanto no backend (SQL) quanto
// aqui no admin.js (defesa contra dado sincronizado fora de ordem).
test('_compararDataBR - ordena cronologicamente, não por dia em string', () => {
  const hist = [
    { data: '05/01/2026' },  // mais recente
    { data: '20/12/2025' },  // mais antigo, mas dia (20) > dia do outro (05)
    { data: '12/02/2026' },  // no meio
  ];
  const ordenado = [...hist].sort(sandbox._compararDataBR);
  assert.deepEqual(ordenado.map(h => h.data), ['20/12/2025', '05/01/2026', '12/02/2026']);
});

test('_compararDataBR - datas inválidas/vazias vão pro fim, sem travar', () => {
  const hist = [{ data: '' }, { data: '10/05/2026' }, { data: 'lixo' }];
  const ordenado = [...hist].sort(sandbox._compararDataBR);
  assert.equal(ordenado[0].data, '10/05/2026');
});

// Rodada 87: resumo financeiro no topo da nova seção "Financeiro" do
// admin web (pedido do usuário: "ver todos os participantes e tudo que
// foi pago"). _calcularKpisFinanceiro é a parte pura (sem DOM) de
// _financeiroKpisAtualizar, testável direto.
test('_calcularKpisFinanceiro - soma arrecadado e pendente certo, cotas múltiplas incluídas', () => {
  const participantes = [
    { valorPago: 100, quantidadeCotas: 1, valorPorCota: 100 }, // quitado
    { valorPago: 40,  quantidadeCotas: 2, valorPorCota: 100 }, // deve 160
    { valorPago: 0,   quantidadeCotas: 1, valorPorCota: 100 }, // deve 100
  ];
  const r = sandbox._calcularKpisFinanceiro(participantes);
  assert.equal(r.totalParticipantes, 3);
  assert.equal(r.totalArrecadado, 140);
  assert.equal(r.totalPendente, 260);
});

test('_calcularKpisFinanceiro - nunca conta pendente negativo (quem pagou mais que o esperado)', () => {
  const participantes = [{ valorPago: 150, quantidadeCotas: 1, valorPorCota: 100 }];
  const r = sandbox._calcularKpisFinanceiro(participantes);
  assert.equal(r.totalPendente, 0);
});

test('_calcularKpisFinanceiro - lista vazia/indefinida não quebra', () => {
  // Objeto devolvido pelo sandbox vm é de outro "realm" — deepEqual
  // falha na checagem de protótipo mesmo com valores idênticos (mesmo
  // achado documentado no helper `plano` de parser-comprovante.test.js).
  // Compara campo a campo em vez do objeto inteiro.
  for (const entrada of [[], undefined]) {
    const r = sandbox._calcularKpisFinanceiro(entrada);
    assert.equal(r.totalParticipantes, 0);
    assert.equal(r.totalArrecadado, 0);
    assert.equal(r.totalPendente, 0);
  }
});
