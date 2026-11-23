'use strict';

// Conferência consolidada (v122): resultado por bolão + nossa parte pela
// fração de cotas de cada bolão da Caixa (gerencial, só admin).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const admin = loadBrowserScript('admin.js');
const plano = (v) => JSON.parse(JSON.stringify(v));
const fx = require('./fixtures/dupla-sena-3034-conferencia.json');

function montar3034({ semGrupo = false } = {}) {
  const cartoes = [], grupos = [];
  fx.recibos.forEach((r, i) => {
    const chaves = r.jogos.map(j => admin._chaveCartaoGerencial({ numeros: j }));
    r.jogos.forEach(j => cartoes.push({ tipo: 'duplasena', concurso: '3034', bolao: '10,00', tipoParticipacao: 'cota', numeros: j }));
    if (!semGrupo) grupos.push({ loteria: 'duplasena', concurso: '3034', chaves, cotasTotal: r.cotasTotal, recibos: { ['cota' + i]: r.cotasNossas } });
  });
  return { cartoes, grupos };
}

test('3034 real: 18 quadras, R$ 2.321,86 dos bolões da Caixa e R$ 48,55 de nossa parte (1 cota em cada)', () => {
  const { cartoes, grupos } = montar3034();
  const r = plano(admin.consolidarConcurso('duplasena', cartoes, fx.resultado, fx.rateio, grupos, '3034'));
  assert.equal(r.boloes.length, 1);
  assert.equal(r.total.cartoes, 81);
  assert.equal(r.total.faixas['3'], 12);   // quadras 1º sorteio
  assert.equal(r.total.faixas['7'], 6);    // quadras 2º sorteio
  assert.equal(r.total.faixas['4'], 102);  // ternos 1º
  assert.equal(r.total.faixas['8'], 56);   // ternos 2º
  assert.equal(r.total.bruto, 2321.86);
  assert.equal(r.total.nossa, 48.55);
  assert.equal(r.total.semCota.length, 0);
  assert.equal(r.boloes[0].melhor.pontos, 4);   // 3 cartões empatados com 4 (2 no 1º sorteio, 1 no 2º)
});

test('cota sem cotas informadas fica fora da nossa parte (nunca valor errado)', () => {
  const { cartoes } = montar3034({ semGrupo: true });
  const r = plano(admin.consolidarConcurso('duplasena', cartoes, fx.resultado, fx.rateio, [], '3034'));
  assert.equal(r.total.bruto, 2321.86);
  assert.equal(r.total.nossa, 0);
  assert.equal(r.total.semCota.length, 81);
});

test('2 recibos do mesmo bolão somam cotas; exclusivo vale 100%', () => {
  const jogo = [8, 11, 15, 22, 28, 37];   // sena no 1º sorteio
  const ch = admin._chaveCartaoGerencial({ numeros: jogo });
  const rateio = [{ faixa: 1, descricao: '6 acertos', valor: 1000 }];
  const res = { numeros: jogo, numeros2: [1, 2, 3, 4, 5, 6] };
  const cota = [{ tipo: 'duplasena', concurso: '1', bolao: 'A', tipoParticipacao: 'cota', numeros: jogo }];
  const grupos = [{ loteria: 'duplasena', concurso: '1', chaves: [ch], cotasTotal: 10, recibos: { cota3: 1, cota4: 1 } }];
  assert.equal(admin.consolidarConcurso('duplasena', cota, res, rateio, grupos, '1').total.nossa, 200);
  const excl = [{ ...cota[0], tipoParticipacao: 'exclusivo' }];
  assert.equal(admin.consolidarConcurso('duplasena', excl, res, rateio, [], '1').total.nossa, 1000);
});

test('bolões ordenados pela maior pontuação; nome com espaço sobrando é o mesmo bolão', () => {
  const res = { numeros: [1, 2, 3, 4, 5, 6] };
  const c = (bolao, numeros) => ({ tipo: 'mega', concurso: '9', bolao, tipoParticipacao: 'exclusivo', numeros });
  const r = plano(admin.consolidarConcurso('mega', [
    c('Aleatório', [1, 2, 10, 11, 12, 13]), c('Aleatório ', [1, 2, 3, 4, 20, 21]), c('Outro', [1, 2, 3, 30, 31, 32]),
  ], res, null, [], '9'));
  assert.deepEqual(r.boloes.map(b => [b.nome, b.cartoes, b.melhor.rotulo]),
    [['Aleatório', 2, '4 acertos (QUADRA)'], ['Outro', 1, '3 acertos']]);
  assert.equal(r.boloes[0].faixas['3'], 1);       // 1 quadra (sem rateio: conta, sem valor)
  assert.equal(r.total.valorIndisponivel, true);
});

test('+Milionária: faixa "1 ou nenhum trevo" e trevos da aposta múltipla', () => {
  const f = plano(admin._faixasConsolidado('maismilionaria', null));
  assert.deepEqual(f[1].trevos, [0, 1]);
  assert.deepEqual(f[7].trevos, [1]);
  const res = { numeros: [1, 2, 3, 4, 5, 6], trevos: [1, 2] };
  const cartao = { numeros: [1, 2, 3, 4, 5, 6], trevos: [1, 2, 3] };   // 3 trevos = 3 combinações de 2
  // 6 acertos + 2 trevos: só a combinação {1,2}; + 1/0 trevo: {1,3} e {2,3}
  assert.equal(admin._qtdFaixaCartao('maismilionaria', cartao, res, f[0]), 1);
  assert.equal(admin._qtdFaixaCartao('maismilionaria', cartao, res, f[1]), 2);
});

test('recibo: lê "PARTICIPA COM 01 COTA DO TOTAL DE 50 COTAS" e "Cota: 6/50" do PDF real', () => {
  const real = require('./fixtures/dupla-sena-3034-real.json');
  const r = admin.parsearComprovanteCaixa(real.texto, {});
  assert.deepEqual(plano(r.cotasRecibo), { nossas: 1, total: 50, numero: '6' });
});
