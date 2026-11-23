'use strict';

// v123: lotérica do recibo + avisos de compra repetida na importação.
// O comprovante real (Dupla Sena 3034) traz "Código E. Lotérico: 21.019334-4".

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const admin = loadBrowserScript('admin.js');
const plano = (v) => JSON.parse(JSON.stringify(v));
const fx = require('./fixtures/dupla-sena-3034-real.json');

function reciboReal() {
  const ex = admin.extrairJogosDeItensPosicionados(fx.itens);
  return admin.parsearComprovanteCaixa(fx.texto, { loteriaEsperada: 'duplasena', concursoEsperado: '3034', jogosPreExtraidos: ex.jogos });
}

test('PDF real: lê o código da lotérica', () => {
  const r = reciboReal();
  assert.equal(r.loterica, '21.019334-4');
  assert.deepEqual(plano(r.cotasRecibo), { nossas: 1, total: 50, numero: '6' });
});

test('recibo sem a linha da lotérica: fica null', () => {
  const r = admin.parsearComprovanteCaixa(fx.texto.replace(/Código E\. Lotérico: [\d.\-]+/, ''), { loteriaEsperada: 'duplasena', concursoEsperado: '3034' });
  assert.equal(r.loterica, null);
});

test('rótulo usa o nome informado pelo admin', () => {
  assert.equal(admin.rotuloLoterica('21.019334-4', { '210193344': 'Sorte Grande' }), 'Sorte Grande (cód. 21.019334-4)');
  assert.equal(admin.rotuloLoterica('21.019334-4', {}), 'lotérica cód. 21.019334-4');
});

function chavesDe(r) {
  return r.validacao.filter(v => v.ok).map(v => admin._chaveCartaoGerencial({ numeros: v.jogo }));
}

test('aviso: outra cota do MESMO bolão já comprada', () => {
  const r = reciboReal();
  const id = admin._idGrupoCotas('duplasena', '3034', chavesDe(r), 50);
  const ctx = { nomes: { '210193344': 'Sorte Grande' }, grupos: { [id]: { loterica: '21.019334-4', recibos: { cota2: 1 } } } };
  const av = plano(admin.avisosCompraRepetida([{ arquivo: 'a.pdf', resultado: r }], [], ctx, 'duplasena', '3034'));
  assert.equal(av[0].length, 1);
  assert.equal(av[0][0].tipo, 'alerta');
  assert.match(av[0][0].texto, /já tem 1 cota\(s\) deste MESMO bolão \(Sorte Grande/);
});

test('reimportar o mesmo recibo: só informativo', () => {
  const r = reciboReal();
  const id = admin._idGrupoCotas('duplasena', '3034', chavesDe(r), 50);
  const ctx = { nomes: {}, grupos: { [id]: { recibos: { cota6: 1 } } } };
  const av = plano(admin.avisosCompraRepetida([{ arquivo: 'a.pdf', resultado: r }], [], ctx, 'duplasena', '3034'));
  assert.deepEqual(av[0].map(a => a.tipo), ['info']);
});

test('2 PDFs do mesmo bolão no mesmo lote', () => {
  const r1 = reciboReal(), r2 = reciboReal();
  r2.cotasRecibo = { ...r2.cotasRecibo, numero: '7' };
  const av = plano(admin.avisosCompraRepetida([{ arquivo: 'a.pdf', resultado: r1 }, { arquivo: 'b.pdf', resultado: r2 }], [], { nomes: {}, grupos: {} }, 'duplasena', '3034'));
  assert.deepEqual(av[0], []);
  assert.match(av[1][0].texto, /Mesmo bolão .* "a\.pdf"/);
});

test('jogos já cadastrados em outro bolão do concurso (sem grupo registrado)', () => {
  const r = reciboReal();
  const cartoes = [{ tipo: 'duplasena', concurso: '3034', bolao: 'Amigos', numeros: [4, 7, 8, 10, 15, 28, 32, 37] },
                   { tipo: 'duplasena', concurso: '3035', bolao: 'Outro', numeros: [3, 5, 9, 32, 39, 41, 46, 50] }];
  const av = plano(admin.avisosCompraRepetida([{ arquivo: 'a.pdf', resultado: r }], cartoes, { nomes: {}, grupos: {} }, 'duplasena', '3034'));
  assert.equal(av[0].length, 1);
  assert.match(av[0][0].texto, /1 de 10 jogo\(s\) já cadastrado\(s\) neste concurso \(Amigos\)/);
});

test('recibo novo, sem nada repetido: sem aviso', () => {
  const av = plano(admin.avisosCompraRepetida([{ arquivo: 'a.pdf', resultado: reciboReal() }], [], { nomes: {}, grupos: {} }, 'duplasena', '3034'));
  assert.deepEqual(av, [[]]);
});
