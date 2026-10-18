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

// Pedido do usuário: eram os 3 maiores concursos de cada loteria, agora
// são os 5 maiores.
test('calcularEstatisticas - ranking mostra até 5 concursos, não só 3', () => {
  const resultados = { mega: {}, lotofacil: {}, quina: {}, maismilionaria: {} };
  const cartoes = [];
  // 6 concursos distintos da mega, cada um com 1 cartão de 4 acertos
  // (quadra) — só pra gerar 6 entradas candidatas no ranking.
  for (let c = 1; c <= 6; c++) {
    cartoes.push({ tipo: 'mega', concurso: String(c), bolao: `B${c}`, numeros: [1, 2, 3, 4, 90 + c, 91 + c] });
    resultados.mega[c] = [1, 2, 3, 4, 5, 6];
  }
  const stats = sandbox.calcularEstatisticas(cartoes, resultados);
  assert.equal(stats.top3PorLoteria.mega.length, 5);
});

// Pedido do usuário: "3 13 pontos" (quantidade colada no nome da faixa,
// que na Lotofácil também começa com número) é ambíguo — parece 1 número
// só ou um erro de digitação. Separador deixa claro onde um termina e o
// outro começa, em qualquer loteria.
test('formatarTierAcerto - separador entre quantidade e nome da faixa', () => {
  assert.equal(sandbox.formatarTierAcerto('lotofacil', 13, 3), '3 - 13 pontos');
  assert.equal(sandbox.formatarTierAcerto('mega', 4, 2), '2 - quadras');
  assert.equal(sandbox.formatarTierAcerto('mega', 6, 1), '1 - sena');
});

// Bug real reportado pelo usuário: "no início diz uma quantidade de
// cartões e no meio tem outra somatória". Causa: atualizarDashboardEstatisticas
// lia a variável GLOBAL `cartoes` (da seção "Cartões" do admin) pro
// detalhamento por loteria, em vez dos cartões que calcularEstatisticas
// de fato recebeu — por isso o card "Total de Cartões" (stats.totalCartoes)
// e a linha "Mega: X · Lotofácil: Y..." logo abaixo dele raramente
// batiam. Corrigido calculando cartoesPorLoteria aqui dentro, na mesma
// passada que já soma stats.totalCartoes — mesma fonte de dado pros dois
// números, nunca mais podem divergir.
test('calcularEstatisticas - cartoesPorLoteria soma certo e bate com totalCartoes', () => {
  const cartoes = [
    { tipo: 'mega', concurso: '1', bolao: 'A', numeros: [1,2,3,4,5,6] },
    { tipo: 'mega', concurso: '2', bolao: 'B', numeros: [1,2,3,4,5,7] },
    { tipo: 'lotofacil', concurso: '1', bolao: 'C', numeros: Array.from({length:15}, (_,i)=>i+1) },
    { tipo: 'maismilionaria', concurso: '1', bolao: 'D', numeros: [1,2,3,4,5,6] },
  ];
  const stats = sandbox.calcularEstatisticas(cartoes, { mega: {}, lotofacil: {}, quina: {}, maismilionaria: {} });
  // Objeto devolvido pelo sandbox vm é de outro "realm" — deepEqual falha
  // na checagem de protótipo mesmo com valores idênticos (mesmo achado
  // documentado nos outros testes deste arquivo). Compara campo a campo.
  assert.equal(stats.cartoesPorLoteria.mega, 2);
  assert.equal(stats.cartoesPorLoteria.lotofacil, 1);
  assert.equal(stats.cartoesPorLoteria.quina, 0);
  assert.equal(stats.cartoesPorLoteria.maismilionaria, 1);
  const somaLoterias = Object.values(stats.cartoesPorLoteria).reduce((a, b) => a + b, 0);
  assert.equal(somaLoterias, stats.totalCartoes);
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

// Rodada 88: "FINANCEIRO POR PARTICIPANTE" — pedido do usuário pra ver,
// a partir de 1 participante, todos os bolões em que ele está. Não existe
// coleção "pessoas" no Firestore, então a mesma pessoa em bolões
// diferentes só é reconhecida como "a mesma" se _chavePessoaFinanceiro
// devolver a MESMA chave pros dois registros — telefone é a chave
// primária (mesmo critério já usado no desktop, _calcular_grupos_duplicados),
// nome normalizado é só o fallback pra quando não tem telefone.
test('_chavePessoaFinanceiro - mesma pessoa com telefone formatado diferente cai na mesma chave', () => {
  const a = sandbox._chavePessoaFinanceiro('Ana Silva', '(11) 99999-0000');
  const b = sandbox._chavePessoaFinanceiro('Ana Silva', '11999990000');
  assert.equal(a, b);
});

test('_chavePessoaFinanceiro - sem telefone cai no nome normalizado (minúsculo, sem espaços nas pontas)', () => {
  const a = sandbox._chavePessoaFinanceiro('  Bruno Costa  ', '');
  const b = sandbox._chavePessoaFinanceiro('bruno costa', null);
  assert.equal(a, b);
  assert.notEqual(a, sandbox._chavePessoaFinanceiro('Outra Pessoa', ''));
});

test('_chavePessoaFinanceiro - telefone e nome nunca colidem na mesma chave (prefixo distinto)', () => {
  // Nome que, coincidentemente, só tem dígitos — não pode virar igual à
  // chave de alguém cujo TELEFONE seja esse mesmo dígitos.
  const porNome = sandbox._chavePessoaFinanceiro('12345', '');
  const porTelefone = sandbox._chavePessoaFinanceiro('Outra Pessoa', '12345');
  assert.notEqual(porNome, porTelefone);
});
