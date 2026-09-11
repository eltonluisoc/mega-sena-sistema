'use strict';

// Testa extrairJogosDeItensPosicionados: a função que separa jogos por
// COLUNA usando as posições x/y reais do pdf.js, em vez de texto já
// achatado. Necessária porque um comprovante de 2 colunas com jogo
// quebrado em 2 linhas (Lotofácil com mais de ~12 dezenas) faz a coluna
// A terminar uma linha com "|" solto que "gruda" direto no primeiro
// número da coluna B quando tudo vira uma string só — texto puro não
// tem como distinguir isso de uma continuação de verdade (é literalmente
// a mesma sequência de caracteres). Ver comentário em extrairJogosDoTexto
// no admin.js.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const sandbox = loadBrowserScript('admin.js');
const extrairJogos = sandbox.extrairJogosDeItensPosicionados;

const plano = (v) => Array.isArray(v) || (v && typeof v.length === 'number' && typeof v !== 'string')
  ? Array.from(v, plano) : v;

// Gera itens {str, x, y} a partir de colunas de "linhas de texto" —
// mesma linha (y) em colunas diferentes (x bem afastado), simulando
// como o pdf.js devolve um comprovante de 2 colunas lado a lado.
function criarItens(colunas, { passoX = 10, passoY = 15, gapColuna = 450, yInicial = 800 } = {}) {
  const itens = [];
  const nLinhas = Math.max(...colunas.map(c => c.length));
  for (let linha = 0; linha < nLinhas; linha++) {
    const y = yInicial - linha * passoY;
    colunas.forEach((coluna, colIdx) => {
      const texto = coluna[linha];
      if (texto === undefined) return;
      const xBase = 50 + colIdx * gapColuna;
      texto.split(' ').forEach((tok, i) => {
        itens.push({ str: tok, x: xBase + i * passoX, y });
      });
    });
  }
  return itens;
}

// Variante mais fiel ao pdf.js real: CADA LINHA DE UMA COLUNA É UM ÚNICO
// ITEM (não um por token/número) — foi por isso que a 1ª correção
// (mediana de gaps DENTRO da linha) não resolveu de verdade: uma linha
// com só 2 itens (1 por coluna) tem 1 gap só, e "mediana dos gaps desta
// linha" comparada com "o próprio gap" nunca classifica como grande.
function criarItensUmItemPorLinha(colunas, { xBase0 = 50, gapColuna = 500, passoY = 15, yInicial = 800, fontSize = 10 } = {}) {
  const itens = [];
  const nLinhas = Math.max(...colunas.map(c => c.length));
  for (let linha = 0; linha < nLinhas; linha++) {
    const y = yInicial - linha * passoY;
    colunas.forEach((coluna, colIdx) => {
      const texto = coluna[linha];
      if (texto === undefined) return;
      itens.push({ str: texto, x: xBase0 + colIdx * gapColuna, y, width: texto.length * 5, fontSize });
    });
  }
  return itens;
}

test('itens vazios/nulos não quebram, devolvem lista vazia', () => {
  assert.deepEqual(plano(extrairJogos([])), []);
  assert.deepEqual(plano(extrairJogos(null)), []);
});

test('1 coluna, jogo sem quebra de linha', () => {
  const itens = criarItens([
    ['Jogo 1', '12 | 14 | 19 | 27 | 41 | 45'],
  ]);
  const jogos = extrairJogos(itens);
  assert.equal(jogos.length, 1);
  assert.deepEqual(plano(jogos[0]), [12, 14, 19, 27, 41, 45]);
});

// Caso comprovante1/2 (Mega): 2 colunas lado a lado, cada jogo cabe numa
// linha só (sem quebra) — já funcionava com o extrator em texto puro,
// tem que continuar funcionando com o extrator por posição.
test('2 colunas, jogos sem quebra de linha (caso Mega já coberto antes)', () => {
  const itens = criarItens([
    ['Jogo 1', '12 | 14 | 19 | 27 | 41 | 45 | 48 | 54 | 59 | 60'],
    ['Jogo 2', '09 | 13 | 18 | 22 | 25 | 36 | 40 | 47 | 53 | 54'],
  ]);
  const jogos = extrairJogos(itens);
  assert.equal(jogos.length, 2);
  assert.deepEqual(plano(jogos[0]), [12, 14, 19, 27, 41, 45, 48, 54, 59, 60]);
  assert.deepEqual(plano(jogos[1]), [9, 13, 18, 22, 25, 36, 40, 47, 53, 54]);
});

// O BUG relatado: comprovante Lotofácil de 2 colunas com jogos de 17
// dezenas cada, quebrando em 2 linhas. Antes (texto achatado) a coluna A
// terminava a 1ª linha com "|" solto que grudava no "01" da coluna B,
// misturando os 2 jogos num só de 29 números e deixando só 5 no outro.
test('2 colunas, jogo quebrado em 2 linhas (bug real da Lotofácil da Independência)', () => {
  const itens = criarItens([
    [
      'Jogo 1',
      '01 | 03 | 05 | 06 | 07 | 09 | 11 | 12 | 13 | 14 | 16 | 17 |',
      '19 | 20 | 21 | 23 | 24',
    ],
    [
      'Jogo 2',
      '01 | 02 | 04 | 05 | 06 | 07 | 11 | 12 | 15 | 16 | 17 | 18 |',
      '19 | 20 | 21 | 24 | 25',
    ],
  ]);
  const jogos = extrairJogos(itens);
  assert.equal(jogos.length, 2);
  assert.deepEqual(
    plano(jogos[0]),
    [1, 3, 5, 6, 7, 9, 11, 12, 13, 14, 16, 17, 19, 20, 21, 23, 24]
  );
  assert.deepEqual(
    plano(jogos[1]),
    [1, 2, 4, 5, 6, 7, 11, 12, 15, 16, 17, 18, 19, 20, 21, 24, 25]
  );
  assert.equal(jogos[0].length, 17);
  assert.equal(jogos[1].length, 17);
});

// Mesmo bug, mas com o formato de item mais provável no pdf.js real —
// cada fileira de dezenas de uma coluna é UM ÚNICO item de texto (não um
// por número/pipe). É o caso que a 1ª correção (mediana de gaps DENTRO
// da própria linha) não cobria: com só 2 itens na linha (1 por coluna),
// há um único gap medido, e ele nunca é maior que "a mediana dele
// mesmo" — o limiar baseado no tamanho da fonte resolve isso.
test('2 colunas, 1 item de texto por linha por coluna (formato real do pdf.js — reproduz o bug que persistiu)', () => {
  const itens = criarItensUmItemPorLinha([
    [
      'Jogo 1',
      '01 | 03 | 05 | 06 | 07 | 09 | 11 | 12 | 13 | 14 | 16 | 17 |',
      '19 | 20 | 21 | 23 | 24',
    ],
    [
      'Jogo 2',
      '01 | 02 | 04 | 05 | 06 | 07 | 11 | 12 | 15 | 16 | 17 | 18 |',
      '19 | 20 | 21 | 24 | 25',
    ],
  ]);
  const jogos = extrairJogos(itens);
  assert.equal(jogos.length, 2);
  assert.deepEqual(
    plano(jogos[0]),
    [1, 3, 5, 6, 7, 9, 11, 12, 13, 14, 16, 17, 19, 20, 21, 23, 24]
  );
  assert.deepEqual(
    plano(jogos[1]),
    [1, 2, 4, 5, 6, 7, 11, 12, 15, 16, 17, 18, 19, 20, 21, 24, 25]
  );
});

// Ponta a ponta: parsearComprovanteCaixa aceitando jogosPreExtraidos
// (o que processarPdfsImportacao realmente faz no navegador) — confirma
// que a validação por regrasLoteria roda em cima do resultado certo.
test('parsearComprovanteCaixa usa jogosPreExtraidos quando fornecido', () => {
  const itens = criarItens([
    [
      'Jogo 1',
      '01 | 03 | 05 | 06 | 07 | 09 | 11 | 12 | 13 | 14 | 16 | 17 |',
      '19 | 20 | 21 | 23 | 24',
    ],
    [
      'Jogo 2',
      '01 | 02 | 04 | 05 | 06 | 07 | 11 | 12 | 15 | 16 | 17 | 18 |',
      '19 | 20 | 21 | 24 | 25',
    ],
  ]);
  const jogosPreExtraidos = extrairJogos(itens);
  const texto = `Loterias
Comprovante de Aposta Bolão Lotofácil da Independência
Nome: ELTON LUIS DE OLIVEIRA CONCEICAO CPF: 874.671.865-68
Data da aposta: 17/08/2026 Subcanal da compra: IOS
Modalidade: Lotofácil da Independência Terminal aposta: 23812
Cota: 19/30 Concurso: 3780
Seus Números:`;
  const r = sandbox.parsearComprovanteCaixa(texto, {
    loteriaEsperada: 'lotofacil',
    concursoEsperado: '3780',
    jogosPreExtraidos,
  });
  assert.equal(r.status, 'ok');
  assert.equal(r.modalidade, 'lotofacil');
  assert.equal(r.concurso, '3780');
  assert.equal(r.jogos.length, 2);
  assert.ok(r.validacao.every(v => v.ok), JSON.stringify(plano(r.validacao)));
});
