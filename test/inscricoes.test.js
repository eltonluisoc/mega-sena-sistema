'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Firestore em memória: só o que registrarMovimentoNoFirestore e a tela
// de inscrições usam. Transação aplica as gravações no fim, tudo ou nada.
function fakeDb() {
  const store = new Map();
  let auto = 0;
  const nivel = (p) => p.split('/').length;
  function snap(p) {
    const d = store.get(p);
    return { exists: d !== undefined, id: p.split('/').pop(), data: () => d, ref: docRef(p) };
  }
  function docRef(p) {
    return {
      id: p.split('/').pop(), path: p,
      collection: (c) => colRef(`${p}/${c}`),
      get: async () => snap(p),
      set: async (d) => { store.set(p, d); },
      update: async (d) => { store.set(p, { ...store.get(p), ...d }); },
      delete: async () => { store.delete(p); },
    };
  }
  function colRef(p) {
    return {
      doc: (id) => docRef(`${p}/${id || 'auto' + (++auto)}`),
      get: async () => {
        const docs = [...store.keys()].filter(k => k.startsWith(p + '/') && nivel(k) === nivel(p) + 1).map(snap);
        return { docs, empty: !docs.length, forEach: (f) => docs.forEach(f) };
      },
    };
  }
  return {
    store,
    collection: (c) => colRef(c),
    runTransaction: async (fn) => {
      const writes = [];
      const tx = {
        get: async (r) => snap(r.path),
        set: (r, d) => writes.push(() => store.set(r.path, d)),
        update: (r, d) => writes.push(() => store.set(r.path, { ...store.get(r.path), ...d })),
        delete: (r) => writes.push(() => store.delete(r.path)),
      };
      await fn(tx);
      writes.forEach((w) => w());
    },
  };
}

function elemento() {
  return { value: '', textContent: '', innerHTML: '', className: '', style: {}, disabled: false,
    addEventListener() {}, setAttribute() {}, classList: { toggle() {} }, querySelectorAll: () => [] };
}

let sb, els, db;

function carregar() {
  els = {};
  db = fakeDb();
  const code = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
  sb = {
    console: { ...console, warn() {}, log() {} },
    document: {
      addEventListener() {},
      getElementById: (id) => (els[id] = els[id] || elemento()),
      querySelector: () => elemento(),
      querySelectorAll: () => [],
    },
    window: { addEventListener() {} },
    navigator: {}, localStorage: { getItem() { return null; }, setItem() {} },
    firebase: {}, db, confirm: () => true, __toasts: [],
  };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  vm.runInContext(`
    showToast = (m, t) => __toasts.push([t, m]);
    escapeHtml = (s) => String(s ?? '');
    carregarReservas = async () => {};
  `, sb);
}

const run = (js) => vm.runInContext(js, sb);
function campos(v) { for (const [k, val] of Object.entries(v)) els[k] = Object.assign(els[k] || elemento(), { value: val }); }

const BOLAO = {
  id: 'bolao_mega', titulo: 'Mega da Virada', loteria: 'mega', valorPorCota: 100, valorParcela: 25,
  cotasTotais: 3, cotasOcupadas: 1,
  participantes: [{ nome: 'Ana', telefone: '61999990001', quantidadeCotas: 1, valorPago: 25, idLocal: 7 }],
};

beforeEach(() => {
  carregar();
  db.store.set('participantes/bolao_mega', BOLAO);
  run(`boloes = ${JSON.stringify([BOLAO])};
       reservasCarregadas = [{ id: 'bia_61999990002', nome: 'Bia', telefone: '61999990002', saldo: 40 }];
       _inscPendentes = []; _inscModo = 'inscricao';`);
  campos({ inscBolao: 'bolao_mega', inscTelefone: '(61) 99999-0002', inscNome: 'Bia', inscCotas: '1',
    inscValor: '25', inscData: '2026-11-10', inscForma: 'pix', inscObs: '', inscPix: '', inscReservaPessoa: '', inscParticipante: '' });
});

test('inscrição válida monta o lançamento com data no formato do desktop', () => {
  const m = run('_inscMontar()');
  assert.equal(m.erro, undefined);
  assert.equal(m.dados.tipo, 'inscricao');
  assert.equal(m.dados.telefone, '61999990002');
  assert.equal(m.dados.valorEsperado, 100);
  assert.equal(m.dados.dataPagamento, '10/11/2026');
  assert.equal(m.dados.formaPagamento, 'pix');
});

test('quem já está no bolão não pode ser inscrito de novo', () => {
  campos({ inscTelefone: '61999990001' });
  assert.match(run('_inscMontar()').erro, /já está neste bolão/);
});

test('cotas livres descontam as inscrições que aguardam o desktop', () => {
  run(`_inscPendentes = [{ tipo: 'inscricao', bolaoDocId: 'bolao_mega', status: 'pendente', cotas: 1, telefone: '61988887777' }]`);
  campos({ inscCotas: '2' });
  assert.match(run('_inscMontar()').erro, /1 cota\(s\) livre/);
  run(`_inscPendentes[0].status = 'recusado'`);
  assert.equal(run('_inscMontar()').erro, undefined);
});

test('sem pagamento agora grava forma "nenhum" e sem data', () => {
  campos({ inscValor: '0' });
  const d = run('_inscMontar()').dados;
  assert.equal(d.formaPagamento, 'nenhum');
  assert.equal(d.dataPagamento, '');
});

test('reserva insuficiente pede confirmação, não bloqueia', () => {
  campos({ inscForma: 'reserva', inscReservaPessoa: 'bia_61999990002', inscValor: '50' });
  const m = run('_inscMontar()');
  assert.equal(m.erro, undefined);
  assert.match(m.avisos.join(' '), /ficará negativa/);
});

test('pagamento de parcela leva o id local do participante', () => {
  run(`_inscModo = 'pagamento'`);
  campos({ inscParticipante: '0', inscValor: '25' });
  const d = run('_inscMontar()').dados;
  assert.equal(d.tipo, 'pagamento');
  assert.equal(d.participanteIdLocal, 7);
  assert.equal(d.nome, 'Ana');
});

test('pago com reserva: saque e item da fila gravados juntos e ligados', async () => {
  campos({ inscForma: 'reserva', inscReservaPessoa: 'bia_61999990002', inscValor: '25' });
  db.store.set('reservas_participantes/bia_61999990002', { nome: 'Bia', saldoReserva: 40 });
  db.store.set('reservas_participantes/bia_61999990002/movimentos/m0', { tipo: 'deposito', valor: 40 });
  await run('registrarLancamentoSite()');
  const fila = [...db.store.entries()].filter(([k]) => k.startsWith('lancamentos_pendentes/'));
  assert.equal(fila.length, 1);
  const item = fila[0][1];
  assert.equal(item.status, 'pendente');
  assert.equal(item.formaPagamento, 'reserva');
  const mov = db.store.get(`reservas_participantes/bia_61999990002/movimentos/${item.reservaMovId}`);
  assert.equal(mov.tipo, 'saque');
  assert.equal(mov.valor, 25);
  assert.equal(db.store.get('reservas_participantes/bia_61999990002').saldoReserva, 15);
});

test('cancelar item pago com reserva devolve o valor e tira da fila', async () => {
  db.store.set('reservas_participantes/bia_61999990002', { nome: 'Bia', saldoReserva: 15 });
  db.store.set('reservas_participantes/bia_61999990002/movimentos/m0', { tipo: 'deposito', valor: 40 });
  db.store.set('reservas_participantes/bia_61999990002/movimentos/m1', { tipo: 'saque', valor: 25 });
  const item = { tipo: 'inscricao', status: 'pendente', nome: 'Bia', bolaoTitulo: 'Mega', valorPago: 25,
    formaPagamento: 'reserva', reservaPessoaId: 'bia_61999990002' };
  db.store.set('lancamentos_pendentes/x1', item);
  run(`_inscPendentes = [${JSON.stringify({ id: 'x1', ...item })}]`);
  await run(`cancelarLancamentoPendente('x1')`);
  assert.equal(db.store.has('lancamentos_pendentes/x1'), false);
  assert.equal(db.store.get('reservas_participantes/bia_61999990002').saldoReserva, 40);
});

test('não cancela o que o desktop já está gravando, e não mexe na reserva', async () => {
  db.store.set('reservas_participantes/bia_61999990002', { nome: 'Bia', saldoReserva: 15 });
  db.store.set('reservas_participantes/bia_61999990002/movimentos/m0', { tipo: 'deposito', valor: 40 });
  db.store.set('reservas_participantes/bia_61999990002/movimentos/m1', { tipo: 'saque', valor: 25 });
  const item = { tipo: 'inscricao', status: 'pendente', nome: 'Bia', bolaoTitulo: 'Mega', valorPago: 25,
    formaPagamento: 'reserva', reservaPessoaId: 'bia_61999990002' };
  run(`_inscPendentes = [${JSON.stringify({ id: 'x1', ...item })}]`);
  db.store.set('lancamentos_pendentes/x1', { ...item, status: 'importando' });
  await run(`cancelarLancamentoPendente('x1')`);
  assert.equal(db.store.has('lancamentos_pendentes/x1'), true);
  assert.equal(db.store.get('reservas_participantes/bia_61999990002').saldoReserva, 15);
  const movs = [...db.store.keys()].filter(k => k.includes('/movimentos/'));
  assert.equal(movs.length, 2);
  assert.ok(sb.__toasts.some(([t, m]) => t === 'error' && /gravando/.test(m)));
});
