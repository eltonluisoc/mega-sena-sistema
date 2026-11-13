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
