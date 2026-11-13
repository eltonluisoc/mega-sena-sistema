'use strict';

// Dia de Sorte (v110): 7 a 15 dezenas de 1-31 + 1 "Mês da Sorte" por aposta.
// O comprovante abaixo é MONTADO no formato dos comprovantes reais das
// outras loterias (ainda não temos um PDF real de Dia de Sorte) — quando o
// primeiro real chegar, ele deve virar um caso aqui.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const admin = loadBrowserScript('admin.js');
const site = loadBrowserScript('script.js');
const plano = (v) => JSON.parse(JSON.stringify(v));

const CABECALHO = `Dados da Aposta
Loterias
Comprovante de Aposta Bolão Dia de Sorte
Nome: TESTE
Data da aposta: 10/11/2026 Subcanal da compra: IOS
Valor total da aposta: R$ 40,00
Valor da cota: R$ 8,00 Data do sorteio: 14/11/2026
Modalidade: Dia de Sorte Terminal aposta: 123
Cota: 1/5 Concurso: 1347
Seus Números:
`;

test('regras do Dia de Sorte: 7 a 15 dezenas de 1 a 31, com mês', () => {
  assert.deepEqual(plano(admin.regrasLoteria('diadesorte')),
    { minNumeros: 7, maxNumeros: 15, maxValor: 31, label: 'DIA DE SORTE', mesSorte: true });
});

test('mês da sorte aceita nome, abreviação e número', () => {
  assert.equal(admin.parseMesSorte('Março'), 3);
  assert.equal(admin.parseMesSorte('MARCO'), 3);
  assert.equal(admin.parseMesSorte('nov'), 11);
  assert.equal(admin.parseMesSorte('Novembro'), 11);
  assert.equal(admin.parseMesSorte('07'), 7);
  assert.equal(admin.parseMesSorte('13'), null);
  assert.equal(admin.parseMesSorte('xyz'), null);
  assert.equal(admin.nomeMesSorte(5), 'Maio');
});

test('PDF: reconhece "Dia de Sorte" (3 palavras) e o mês de cada jogo', () => {
  const texto = CABECALHO + `Jogo 1
02 | 07 | 11 | 16 | 22 | 27 | 31
Mês da Sorte: Março
Jogo 2
01 | 05 | 09 | 13 | 18 | 24 | 28 | 30
Mês da Sorte: Novembro
`;
  const r = admin.parsearComprovanteCaixa(texto, { loteriaEsperada: 'diadesorte', concursoEsperado: '1347' });
  assert.equal(r.status, 'ok', r.erro);
  assert.equal(r.modalidade, 'diadesorte');
  assert.equal(r.modalidadeLabel, 'Dia de Sorte');
  assert.equal(r.concurso, '1347');
  assert.deepEqual(plano(r.validacao.map(v => [v.jogo.length, v.mesSorte, v.ok])), [[7, 3, true], [8, 11, true]]);
  assert.deepEqual(plano(r.divergencias), []);
});

test('PDF: um mês só no comprovante vale para todos os jogos', () => {
  const texto = CABECALHO + `Mês da Sorte: Julho
Jogo 1
02 | 07 | 11 | 16 | 22 | 27 | 31
Jogo 2
01 | 05 | 09 | 13 | 18 | 24 | 28
`;
  const r = admin.parsearComprovanteCaixa(texto, {});
  assert.deepEqual(plano(r.validacao.map(v => v.mesSorte)), [7, 7]);
});

test('PDF: sem mês o jogo não entra (não dá pra conferir o prêmio do mês)', () => {
  const texto = CABECALHO + `Jogo 1
02 | 07 | 11 | 16 | 22 | 27 | 31
`;
  const r = admin.parsearComprovanteCaixa(texto, {});
  assert.equal(r.validacao[0].ok, false);
  assert.match(r.validacao[0].erro, /Mês da Sorte/);
});

test('PDF: dezena 32 é recusada no Dia de Sorte', () => {
  const texto = CABECALHO + `Jogo 1
02 | 07 | 11 | 16 | 22 | 27 | 32
Mês da Sorte: Março
`;
  const r = admin.parsearComprovanteCaixa(texto, {});
  assert.equal(r.validacao[0].ok, false);
});

test('índice público inclui o Dia de Sorte', () => {
  const idx = plano(admin.montarIndiceCartoes([{ tipo: 'diadesorte', concurso: '1347', bolao: 'DS' }]));
  assert.equal(idx.ultimosConcursos.diadesorte, 1347);
  assert.deepEqual(idx.boloesMap.diadesorte['1347'], ['DS']);
});

test('prêmios: faixas 7/6/5/4 com aposta múltipla + cartões com o Mês da Sorte', () => {
  const sorteados = [1, 2, 3, 4, 5, 6, 7];
  const cartoes = [
    { numeros: [1, 2, 3, 4, 20, 21, 22], mesSorte: 11 },          // 4 pontos, acertou o mês
    { numeros: [1, 2, 3, 4, 5, 20, 21, 22], mesSorte: 3 },        // 8 dezenas, 5 acertos
    { numeros: [10, 11, 12, 13, 14, 15, 16], mesSorte: 11 },      // nada, mas acertou o mês
  ];
  const p = plano(site.calcularPremios(cartoes, sorteados, 'diadesorte', null, 11));
  // 8 dezenas com 5 acertos: C(5,5)*C(3,2)=3 de 5 pontos e C(5,4)*C(3,3)=5 de 4 pontos
  assert.deepEqual(p, { pontos7: 0, pontos6: 0, pontos5: 3, pontos4: 1 + 5, mes: 2 });
  assert.equal(site.nomeNivelAcerto('diadesorte', 5), '5 PONTOS');
});

test('admin: painel conta Dia de Sorte nas faixas 7/6/5/4', () => {
  const stats = plano(admin.calcularEstatisticas(
    [{ tipo: 'diadesorte', concurso: '1347', bolao: 'DS', numeros: [1, 2, 3, 4, 5, 20, 21] }],
    { diadesorte: { 1347: { numeros: [1, 2, 3, 4, 5, 6, 7], data: '14/11/2026' } } }));
  assert.equal(stats.cartoesPorLoteria.diadesorte, 1);
  assert.equal(stats.bilhetesPorLoteria.diadesorte, 1);
  assert.equal(stats.top3PorLoteria.diadesorte[0].maxAcertos, 5);
  assert.equal(admin.formatarTierAcerto('diadesorte', 5, 1), '1 - 5 pontos');
});
