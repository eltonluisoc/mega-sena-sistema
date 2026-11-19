'use strict';

// Dupla Sena (v111): 6 a 15 dezenas de 1-50; o mesmo cartão concorre nos
// 2 sorteios do concurso (resultado: numeros = 1º, numeros2 = 2º).
// O comprovante abaixo é MONTADO no formato dos comprovantes reais das
// outras loterias (ainda não temos um PDF real de Dupla Sena).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const admin = loadBrowserScript('admin.js');
const site = loadBrowserScript('script.js');
const plano = (v) => JSON.parse(JSON.stringify(v));

const comprovante = (modalidade) => `Dados da Aposta
Loterias
Comprovante de Aposta Bolão ${modalidade}
Nome: TESTE
Data da aposta: 13/11/2026 Subcanal da compra: IOS
Valor total da aposta: R$ 30,00
Valor da cota: R$ 10,00 Data do sorteio: 14/11/2026
Modalidade: ${modalidade} Terminal aposta: 123
Cota: 1/3 Concurso: 3032
Seus Números:
Jogo 1
03 | 11 | 16 | 18 | 32 | 37
Jogo 2
01 | 05 | 09 | 13 | 18 | 24 | 28 | 50
`;

test('regras da Dupla Sena: 6 a 15 dezenas de 1 a 50', () => {
  assert.deepEqual(plano(admin.regrasLoteria('duplasena')),
    { minNumeros: 6, maxNumeros: 15, maxValor: 50, label: 'DUPLA SENA' });
});

for (const modalidade of ['Dupla Sena', 'Dupla-Sena', 'DUPLA SENA']) {
  test(`PDF: reconhece "${modalidade}"`, () => {
    const r = admin.parsearComprovanteCaixa(comprovante(modalidade), { loteriaEsperada: 'duplasena', concursoEsperado: '3032' });
    assert.equal(r.status, 'ok', r.erro);
    assert.equal(r.modalidade, 'duplasena');
    assert.equal(r.concurso, '3032');
    assert.deepEqual(plano(r.validacao.map(v => [v.jogo.length, v.ok])), [[6, true], [8, true]]);
    assert.deepEqual(plano(r.divergencias), []);
  });
}

test('PDF: dezena 51 é recusada na Dupla Sena', () => {
  const r = admin.parsearComprovanteCaixa(comprovante('Dupla Sena').replace('| 50', '| 51'), {});
  assert.equal(r.validacao[1].ok, false);
});

test('índice público inclui a Dupla Sena', () => {
  const idx = plano(admin.montarIndiceCartoes([{ tipo: 'duplasena', concurso: '3032', bolao: 'DS' }]));
  assert.equal(idx.ultimosConcursos.duplasena, 3032);
  assert.deepEqual(idx.boloesMap.duplasena['3032'], ['DS']);
});

test('site: prêmios separados por sorteio, com aposta múltipla', () => {
  const s1 = [1, 2, 3, 4, 5, 6];
  const s2 = [10, 20, 30, 40, 45, 50];
  const cartoes = [
    { numeros: [1, 2, 3, 4, 10, 20] },               // 4 no 1º (quadra), 2 no 2º
    { numeros: [1, 2, 3, 10, 20, 30, 40, 49] },      // 8 dezenas: 3 no 1º, 4 no 2º
  ];
  const p = plano(site.calcularPremios(cartoes, s1, 'duplasena', null, null, s2));
  // cartão 2, 2º sorteio: 4 de 8 → C(4,4)*C(4,2)=6 quadras, C(4,3)*C(4,3)=16 ternos
  // cartão 2, 1º sorteio: 3 de 8 → C(3,3)*C(5,3)=10 ternos
  assert.deepEqual(p, { sena: 0, quina: 0, quadra: 1, terno: 10, sena2: 0, quina2: 0, quadra2: 6, terno2: 16 });
});

test('site: cartão vale pelo melhor dos 2 sorteios na ordenação', () => {
  const s1 = [1, 2, 3, 4, 5, 6];
  const s2 = [10, 20, 30, 40, 45, 50];
  assert.equal(site.acertosNoMelhorSorteio({ numeros: [1, 10, 20, 30, 40, 49] }, s1, s2), 4);
  const ordem = site.ordenarCartoesPorAcertos(
    [{ numeros: [1, 2, 7, 8, 9, 11] }, { numeros: [10, 20, 30, 40, 45, 49] }], s1, null, s2);
  assert.deepEqual(plano(ordem[0].numeros), [10, 20, 30, 40, 45, 49]);
});

test('admin: painel soma as faixas dos 2 sorteios (6/5/4/3)', () => {
  const stats = plano(admin.calcularEstatisticas(
    [{ tipo: 'duplasena', concurso: '3032', bolao: 'DS', numeros: [1, 2, 3, 10, 20, 30] }],
    { duplasena: { 3032: { numeros: [1, 2, 3, 4, 5, 6], numeros2: [10, 20, 30, 40, 45, 50], data: '14/11/2026' } } }));
  assert.equal(stats.cartoesPorLoteria.duplasena, 1);
  assert.equal(stats.bilhetesPorLoteria.duplasena, 1);
  // terno no 1º e terno no 2º = 2 ternos no concurso
  assert.deepEqual(stats.top3PorLoteria.duplasena[0], { concurso: '3032', maxAcertos: 3, quantidade: 2, data: '14/11/2026' });
  assert.equal(admin.formatarTierAcerto('duplasena', 3, 2), '2 - ternos');
});

test('caso real 3034: cada sorteio numa linha, quadra do 2º não vira "quina"', () => {
  const s1 = [8, 11, 15, 22, 28, 37], s2 = [19, 22, 23, 28, 30, 48];
  const cartao = [5, 15, 19, 22, 30, 31, 47, 48];
  const html = site.linhasDuplaSenaHtml(cartao, s1, s2);
  assert.match(html, /1º sorteio: 2 acertos</);
  assert.match(html, /2º sorteio: 4 acertos · <strong>QUADRA<\/strong> \(6 prêmios\)/);
  assert.doesNotMatch(html, /QUINA/);
  // cartões de 8 dezenas: 3 com quadra (2 no 1º, 1 no 2º) = 18 prêmios de quadra
  const cartoes = [{ numeros: [4, 7, 8, 10, 15, 28, 32, 37] }, { numeros: [1, 3, 4, 11, 22, 28, 37, 46] }, { numeros: cartao }];
  const p = plano(site.calcularPremios(cartoes, s1, 'duplasena', null, null, s2));
  assert.equal(p.quadra, 12);
  assert.equal(p.quadra2, 6);
  assert.equal(site.cartoesNaFaixa(cartoes, s1, 4), 2);
  assert.equal(site.cartoesNaFaixa(cartoes, s2, 4), 1);
});

test('setas só com 3+ acertos no sorteio (v120)', () => {
  const cartao = [4, 7, 8, 10, 15, 28, 32, 37];   // 1º: 4 acertos, 2º: 1 acerto (concurso 3034)
  const grupos = [{ sorteados: [8, 11, 15, 22, 28, 37], id: 1 }, { sorteados: [19, 22, 23, 28, 30, 48], id: 2 }];
  assert.deepEqual(plano(site.gruposComSetas(grupos, cartao).map(g => g.id)), [1]);
  assert.equal(site.gruposComSetas([{ sorteados: [1, 2, 50, 51, 52, 53] }], [1, 2, 3, 4, 5, 6]).length, 0); // 2 acertos
  assert.equal(site.gruposComSetas([{ sorteados: [1, 2, 3, 51, 52, 53] }], [1, 2, 3, 4, 5, 6]).length, 1); // 3 acertos
});

test('sublinhado "quase" nos outros cartões: só com 3+ acertos e a até 2 (v121, concurso 3034)', () => {
  const s1 = [8, 11, 15, 22, 28, 37];
  const q = (numeros, s) => plano([...site.numerosQuase(numeros, s).entries()]);
  assert.deepEqual(q([5, 11, 15, 18, 24, 31, 37, 42], s1), [[24, 22]]);   // KCIFyU: 3 acertos, 24 perto do 22
  assert.deepEqual(q([5, 7, 15, 22, 28, 29, 47, 49], s1), [[7, 8]]);      // 5cAtcp: 07 perto do 08
  assert.deepEqual(q([11, 16, 20, 25, 28, 29, 48, 50], s1), []);          // UNSRFL: só 2 acertos, sem sublinhado
});

test('PDF REAL (concurso 3034, 10 jogos em 2 colunas): extração por posição do pdf.js', () => {
  const fx = require('./fixtures/dupla-sena-3034-real.json');
  const ex = admin.extrairJogosDeItensPosicionados(fx.itens);
  const r = admin.parsearComprovanteCaixa(fx.texto, { loteriaEsperada: 'duplasena', concursoEsperado: '3034', jogosPreExtraidos: ex.jogos });
  assert.equal(r.status, 'ok', r.erro);
  assert.equal(r.modalidade, 'duplasena');
  assert.equal(r.concurso, '3034');
  assert.deepEqual(plano(r.divergencias), []);
  // a ordem segue as colunas do comprovante (esquerda, depois direita) — não importa pro cadastro
  assert.deepEqual(plano(r.validacao.map(v => v.jogo.join('-')).sort()), [
    '3-5-9-32-39-41-46-50', '2-3-5-6-12-24-28-47', '2-14-20-29-33-41-46-47', '9-10-11-13-14-25-26-33',
    '13-14-15-27-32-34-38-49', '1-7-14-21-30-42-47-48', '2-3-13-14-25-40-42-48', '2-21-25-26-30-32-45-47',
    '3-9-12-15-30-37-38-44', '4-7-8-10-15-28-32-37'].sort());
  assert.ok(r.validacao.every(v => v.ok));
});
