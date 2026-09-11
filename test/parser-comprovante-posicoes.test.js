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

// Fixture com os 61 itens REAIS extraídos do pdf.js (log de debug da
// Rodada 31, comprovante2.pdf) — a página inteira, não só o bloco de
// jogos. É o que revelou o gap real entre colunas de dezenas: só 31
// (269→300, fonte 10), bem menor que qualquer limiar "generoso" tentado
// nas 2 correções anteriores. Trava o valor calibrado nesse dado real
// e serve de regressão pro resto da página não interferir (nenhum outro
// bloco tem "|", então mesmo sendo "cortado" em colunas por engano não
// pode virar jogo).
const ITENS_REAIS_COMPROVANTE2 = [
  { str: 'Loterias', x: 36, y: 786, width: 47, fontSize: 12 },
  { str: 'Comprovante de Aposta Bolão Lotofácil da Independência', x: 36, y: 768, width: 333, fontSize: 12 },
  { str: 'Dados da Aposta', x: 36, y: 731, width: 82, fontSize: 10 },
  { str: 'ELTON LUIS DE OLIVEIRA', x: 150, y: 687, width: 124, fontSize: 10 },
  { str: 'Nome:', x: 50, y: 682, width: 31, fontSize: 10 },
  { str: 'CPF:', x: 300, y: 682, width: 23, fontSize: 10 },
  { str: '874.671.865-68', x: 449, y: 682, width: 70, fontSize: 10 },
  { str: 'CONCEICAO', x: 150, y: 677, width: 61, fontSize: 10 },
  { str: 'Data da aposta:', x: 50, y: 663, width: 74, fontSize: 10 },
  { str: '17/08/2026', x: 150, y: 663, width: 50, fontSize: 10 },
  { str: 'Subcanal da compra:', x: 300, y: 663, width: 101, fontSize: 10 },
  { str: 'IOS', x: 449, y: 663, width: 17, fontSize: 10 },
  { str: 'Hora da aposta:', x: 50, y: 649, width: 76, fontSize: 10 },
  { str: '10:33:00', x: 150, y: 649, width: 39, fontSize: 10 },
  { str: 'Data da compra:', x: 300, y: 649, width: 78, fontSize: 10 },
  { str: '11/09/2026', x: 449, y: 649, width: 50, fontSize: 10 },
  { str: 'Valor total da', x: 50, y: 635, width: 63, fontSize: 10 },
  { str: 'R$ 42,83', x: 150, y: 630, width: 41, fontSize: 10 },
  { str: 'Hora da compra:', x: 300, y: 630, width: 79, fontSize: 10 },
  { str: '10:16:44', x: 449, y: 630, width: 39, fontSize: 10 },
  { str: 'aposta:', x: 50, y: 625, width: 36, fontSize: 10 },
  { str: 'Valor da cota:', x: 50, y: 611, width: 66, fontSize: 10 },
  { str: 'R$ 31,73', x: 150, y: 611, width: 41, fontSize: 10 },
  { str: 'Data do sorteio:', x: 300, y: 611, width: 76, fontSize: 10 },
  { str: '15/09/2026', x: 449, y: 611, width: 50, fontSize: 10 },
  { str: 'Valor tarifa de', x: 50, y: 597, width: 67, fontSize: 10 },
  { str: 'R$ 11,10', x: 150, y: 592, width: 41, fontSize: 10 },
  { str: 'Código E. Lotérico:', x: 300, y: 592, width: 92, fontSize: 10 },
  { str: '04.000326-4', x: 449, y: 592, width: 56, fontSize: 10 },
  { str: 'serviço:', x: 50, y: 587, width: 38, fontSize: 10 },
  { str: 'Modalidade:', x: 50, y: 573, width: 58, fontSize: 10 },
  { str: 'Lotofácil da Independência', x: 150, y: 573, width: 120, fontSize: 10 },
  { str: 'Terminal aposta:', x: 300, y: 573, width: 80, fontSize: 10 },
  { str: '23812', x: 449, y: 573, width: 28, fontSize: 10 },
  { str: 'Cota:', x: 50, y: 559, width: 26, fontSize: 10 },
  { str: '19/30', x: 150, y: 559, width: 25, fontSize: 10 },
  { str: 'Concurso:', x: 300, y: 559, width: 50, fontSize: 10 },
  { str: '3780', x: 449, y: 559, width: 22, fontSize: 10 },
  { str: 'Seus Números:', x: 38, y: 524, width: 73, fontSize: 10 },
  { str: 'Jogo 1', x: 38, y: 501, width: 32, fontSize: 10 },
  { str: 'Jogo 2', x: 300, y: 501, width: 32, fontSize: 10 },
  { str: '01 | 03 | 05 | 06 | 07 | 09 | 11 | 12 | 13 | 14 | 16 | 17 |', x: 38, y: 487, width: 231, fontSize: 10 },
  { str: '01 | 02 | 04 | 05 | 06 | 07 | 11 | 12 | 15 | 16 | 17 | 18 |', x: 300, y: 487, width: 231, fontSize: 10 },
  { str: '19 | 20 | 21 | 23 | 24', x: 38, y: 477, width: 89, fontSize: 10 },
  { str: '19 | 20 | 21 | 24 | 25', x: 300, y: 477, width: 89, fontSize: 10 },
  { str: 'ESTE RECIBO PARTICIPA COM 01 COTA DO TOTAL DE 30 COTAS', x: 109, y: 352, width: 377, fontSize: 12 },
  { str: 'Validade do prêmio: 90 dias', x: 236, y: 332, width: 124, fontSize: 10 },
  { str: 'A3BF7D780AF3031A2EFBC210CAEAB8513236', x: 167, y: 154, width: 261, fontSize: 12 },
  { str: '0800 726 0101', x: 36, y: 50, width: 53, fontSize: 8 },
  { str: '4004 0104', x: 190, y: 50, width: 38, fontSize: 8 },
  { str: '0800 104 0104', x: 324, y: 50, width: 53, fontSize: 8 },
  { str: '0800 726 0207', x: 401, y: 50, width: 53, fontSize: 8 },
  { str: '0800 725 7474', x: 478, y: 50, width: 53, fontSize: 8 },
  { str: 'Alô CAIXA:(Demais', x: 324, y: 38, width: 70, fontSize: 8 },
  { str: 'Atendimento CAIXA', x: 401, y: 38, width: 71, fontSize: 8 },
  { str: 'SAC(Sugestões, reclamações e elogios)', x: 36, y: 34, width: 144, fontSize: 8 },
  { str: 'Alô CAIXA:(Regiões Metropolitanas)', x: 190, y: 34, width: 129, fontSize: 8 },
  { str: 'Ouvidoria', x: 478, y: 34, width: 34, fontSize: 8 },
  { str: 'Regiões)', x: 324, y: 30, width: 32, fontSize: 8 },
  { str: 'Cidadão', x: 401, y: 30, width: 30, fontSize: 8 },
  { str: 'Página: 1 de 1', x: 495, y: 11, width: 64, fontSize: 10 },
];

test('dados REAIS do pdf.js (comprovante2.pdf, log de debug) — os 2 jogos saem certos', () => {
  const jogos = extrairJogos(ITENS_REAIS_COMPROVANTE2);
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
