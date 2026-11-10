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

test('bolões publicados são lidos uma vez só por carregamento', async () => {
  let leituras = 0;
  const original = db.collection;
  db.collection = (c) => {
    const ref = original(c);
    if (c === 'participantes') { const g = ref.get; ref.get = async () => { leituras++; return g(); }; }
    return ref;
  };
  await Promise.all([run('obterBoloesPublicados()'), run('obterBoloesPublicados()'), run('obterBoloesPublicados()')]);
  assert.equal(leituras, 1);
  await run('obterBoloesPublicados(true)');
  assert.equal(leituras, 2);
  assert.equal(run('boloes.length'), 1);
});

test('status do desktop: aberto recente, fechado e sinal antigo', () => {
  const agora = new Date().toISOString();
  const velho = new Date(Date.now() - 60 * 60000).toISOString();
  assert.match(run(`_textoStatusDesktop(${JSON.stringify({ aberto: true, ultimaVerificacao: agora, versao: 'v8.1' })}).txt`), /Desktop aberto/);
  assert.match(run(`_textoStatusDesktop(${JSON.stringify({ aberto: true, ultimaVerificacao: velho })}).txt`), /Desktop fechado/);
  assert.match(run(`_textoStatusDesktop(${JSON.stringify({ aberto: false, ultimaVerificacao: agora, conflitos: 2 })}).txt`), /2 com conflito/);
  assert.equal(run('_textoStatusDesktop(null).cls'), 'alerta');
});

const CASOS_ATRASO = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos_atraso.json'), 'utf8'));

test('regra de atraso igual à do desktop (casos compartilhados)', () => {
  for (const c of CASOS_ATRASO) {
    const r = run(`_situacaoAtraso(${c.pago}, ${c.esperado}, ${c.cotas}, ${c.devidas}, ${c.parcela})`);
    assert.deepEqual({ ...r }, { emAtraso: c.emAtraso, pagas: c.pagas, valor: c.valor }, c.caso);
  }
});

test('parcelas vencidas: mês atual não conta e limita ao total', () => {
  const b = { dataInicio: '2026-01-20', valorParcela: 75.1, parcelasTotal: 10 };
  assert.equal(run(`_parcelasVencidasBolao(${JSON.stringify(b)}, new Date(2026, 10, 10))`), 10);
  assert.equal(run(`_parcelasVencidasBolao(${JSON.stringify(b)}, new Date(2026, 2, 1))`), 2);
  assert.equal(run(`_parcelasVencidasBolao(${JSON.stringify({ ...b, dataInicio: '' })}, new Date(2026, 10, 10))`), 0);
});

test('cobranças: atrasado entra, quitado/isento não, pagamento aguardando o desktop conta', () => {
  const b = {
    id: 'b1', titulo: 'Super', valorPorCota: 75, valorParcela: 25, cotasTotais: 10, cotasOcupadas: 3,
    dataInicio: '2026-09-21', parcelasTotal: 3,
    participantes: [
      { nome: 'Atrasada', telefone: '61911110001', quantidadeCotas: 1, idLocal: 1, situacao: 'em_andamento', historicoPagamentos: [{ valor: 25, data: '21/09/2026' }] },
      { nome: 'Em dia', telefone: '61911110002', quantidadeCotas: 1, idLocal: 2, situacao: 'em_andamento', historicoPagamentos: [{ valor: 50, data: '01/10/2026' }] },
      { nome: 'ADM isento', telefone: '', quantidadeCotas: 1, situacao: 'quitado', valorPago: 0, historicoPagamentos: [] },
      { nome: 'Pagou pelo site', telefone: '61911110004', quantidadeCotas: 1, idLocal: 4, situacao: 'em_andamento', historicoPagamentos: [] },
    ],
  };
  run(`boloes = ${JSON.stringify([b])};
       _inscPendentes = [{ tipo: 'pagamento', bolaoDocId: 'b1', status: 'pendente', participanteIdLocal: 4, valorPago: 50 }];`);
  const r = run('_calcularCobrancas(new Date(2026, 10, 10))');
  assert.deepEqual(JSON.parse(JSON.stringify(r.itens.map(i => [i.p.nome, i.valor]))), [['Atrasada', 25]]);
  assert.equal(r.resumo[0].devidas, 2);
  const msg = run('_cobMensagem(_calcularCobrancas(new Date(2026, 10, 10)).itens[0])');
  assert.match(msg, /Oi Atrasada/);
  assert.match(msg, /venceram 2 parcela\(s\) de R\$ 25,00/);
  assert.match(msg, /em aberto \*R\$ 25,00\*/);
});

test('cobranças: bolão sem data válida ou ainda não publicado pelo v8.2 avisa em vez de calcular', () => {
  run(`boloes = [{ id: 'x', titulo: 'X', cotasTotais: 5, cotasOcupadas: 1, valorPorCota: 10, valorParcela: 10, dataInicio: '', participantes: [] },
                 { id: 'y', titulo: 'Y', cotasTotais: 5, cotasOcupadas: 1, valorPorCota: 10, valorParcela: 10, participantes: [] }]`);
  const r = run('_calcularCobrancas()').resumo;
  assert.equal(r[0].semData, true);
  assert.equal(r[1].antigo, true);
});
