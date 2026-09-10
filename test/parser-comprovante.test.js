'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const sandbox = loadBrowserScript('admin.js');
const parsear = sandbox.parsearComprovanteCaixa;

// Arrays devolvidos pelo sandbox `vm` são de outro "realm" — o
// deepStrictEqual falha na checagem de protótipo mesmo com o mesmo
// conteúdo. Converte pra array local (recursivo) antes de comparar.
const plano = (v) => Array.isArray(v) || (v && typeof v.length === 'number' && typeof v !== 'string')
  ? Array.from(v, plano) : v;

// Texto extraído do PDF real comprovante1.pdf (Mega-Sena, concurso 3056,
// 2 jogos de 10 dezenas — aposta múltipla).
const COMPROVANTE_1 = `Dados da Aposta
ESTE RECIBO PARTICIPA COM 01 COTA DO TOTAL DE 90 COTAS
Validade do prêmio: 90 dias
A3D5781B80416F0B04A9BF7E55F2197131A9
Loterias
Comprovante de Aposta Bolão Mega-Sena
Nome: ELTON LUIS DE OLIVEIRA
CONCEICAO CPF: 874.671.865-68
Data da aposta: 08/09/2026 Subcanal da compra: IOS
Hora da aposta: 21:46:47 Data da compra: 10/09/2026
Valor total da
aposta: R$ 37,80 Hora da compra: 19:43:32
Valor da cota: R$ 28,00 Data do sorteio: 10/09/2026
Valor tarifa de
serviço: R$ 9,80 Código E. Lotérico: 11.006336-8
Modalidade: Mega-Sena Terminal aposta: 3359
Cota: 54/90 Concurso: 3056
Seus Números:
Jogo 1
12 | 14 | 19 | 27 | 41 | 45 | 48 | 54 | 59 | 60
Jogo 2
09 | 13 | 18 | 22 | 25 | 36 | 40 | 47 | 53 | 54
0800 726 0101 4004 0104 0800 104 0104 0800 726 0207 0800 725 7474
SAC(Sugestões, reclamações e elogios) Alô CAIXA:(Regiões Metropolitanas) Alô CAIXA:(Demais
Regiões)
Atendimento CAIXA
Cidadão Ouvidoria
Página: 1 de 1`;

// comprovante2.pdf (Mega-Sena, concurso 3056, 10 jogos de 9 dezenas).
const COMPROVANTE_2 = `Dados da Aposta
ESTE RECIBO PARTICIPA COM 01 COTA DO TOTAL DE 100 COTAS
Validade do prêmio: 90 dias
A3D572139EDD8A546AFE18CD9902B1FFCB4D
Loterias
Comprovante de Aposta Bolão Mega-Sena
Nome: ELTON LUIS DE OLIVEIRA
CONCEICAO CPF: 874.671.865-68
Data da aposta: 08/09/2026 Subcanal da compra: IOS
Hora da aposta: 21:50:54 Data da compra: 10/09/2026
Valor total da
aposta: R$ 68,04 Hora da compra: 19:40:33
Valor da cota: R$ 50,40 Data do sorteio: 10/09/2026
Valor tarifa de
serviço: R$ 17,64 Código E. Lotérico: 19.012592-6
Modalidade: Mega-Sena Terminal aposta: 60529
Cota: 55/100 Concurso: 3056
Seus Números:
Jogo 1
05 | 14 | 17 | 33 | 39 | 42 | 44 | 48 | 54
Jogo 2
06 | 14 | 19 | 31 | 32 | 41 | 42 | 48 | 50
Jogo 3
03 | 04 | 07 | 10 | 30 | 31 | 47 | 55 | 60
Jogo 4
02 | 04 | 09 | 11 | 14 | 30 | 50 | 52 | 54
Jogo 5
03 | 14 | 20 | 22 | 30 | 39 | 47 | 57 | 58
Jogo 6
10 | 11 | 16 | 18 | 29 | 45 | 48 | 54 | 56
Jogo 7
17 | 22 | 30 | 36 | 38 | 46 | 50 | 55 | 60
Jogo 8
23 | 27 | 29 | 36 | 39 | 43 | 46 | 51 | 52
Jogo 9
01 | 10 | 17 | 25 | 28 | 32 | 34 | 35 | 57
Jogo 10
01 | 02 | 08 | 13 | 24 | 31 | 36 | 58 | 60
0800 726 0101 4004 0104 0800 104 0104 0800 726 0207 0800 725 7474
Página: 1 de 1`;

test('comprovante1: extrai modalidade, concurso e os 2 jogos de 10 dezenas', () => {
  const r = parsear(COMPROVANTE_1, { loteriaEsperada: 'mega', concursoEsperado: '3056' });
  assert.equal(r.status, 'ok');
  assert.equal(r.modalidade, 'mega');
  assert.equal(r.modalidadeLabel, 'Mega-Sena');
  assert.equal(r.concurso, '3056');
  assert.equal(r.jogos.length, 2);
  assert.deepEqual(plano(r.jogos[0]), [12, 14, 19, 27, 41, 45, 48, 54, 59, 60]);
  assert.deepEqual(plano(r.jogos[1]), [9, 13, 18, 22, 25, 36, 40, 47, 53, 54]);
  assert.ok(r.validacao.every(v => v.ok));
  assert.equal(r.divergencias.length, 0);
});

test('comprovante2: extrai os 10 jogos de 9 dezenas, todos válidos', () => {
  const r = parsear(COMPROVANTE_2, { loteriaEsperada: 'mega', concursoEsperado: '3056' });
  assert.equal(r.status, 'ok');
  assert.equal(r.jogos.length, 10);
  assert.ok(r.jogos.every(j => j.length === 9));
  assert.deepEqual(plano(r.jogos[9]), [1, 2, 8, 13, 24, 31, 36, 58, 60]);
  assert.ok(r.validacao.every(v => v.ok));
});

// O comprovante é 2 colunas — o pdf.js devolve "Jogo 1"/"Jogo 2" na
// MESMA linha e as duas fileiras de dezenas também. O parser precisa
// separar as colunas pelo espaço (não "|") entre "... | 60" e "09 | ...".
test('layout de 2 colunas (pdf.js junta as colunas numa linha só) — pega os 2 jogos', () => {
  const texto = `Loterias
Comprovante de Aposta Bolão Mega-Sena
Modalidade: Mega-Sena Terminal aposta: 3359
Cota: 54/90 Concurso: 3056
Seus Números:
Jogo 1 Jogo 2
12 | 14 | 19 | 27 | 41 | 45 | 48 | 54 | 59 | 60 09 | 13 | 18 | 22 | 25 | 36 | 40 | 47 | 53 | 54
0800 726 0101 4004 0104 0800 104 0104 0800 726 0207 0800 725 7474
Página: 1 de 1`;
  const r = parsear(texto, { loteriaEsperada: 'mega', concursoEsperado: '3056' });
  assert.equal(r.status, 'ok');
  assert.equal(r.jogos.length, 2);
  assert.deepEqual(plano(r.jogos[0]), [12, 14, 19, 27, 41, 45, 48, 54, 59, 60]);
  assert.deepEqual(plano(r.jogos[1]), [9, 13, 18, 22, 25, 36, 40, 47, 53, 54]);
  assert.ok(r.validacao.every(v => v.ok));
});

test('2 colunas × 5 linhas (10 jogos numa linha por par) — pega os 10', () => {
  const texto = `Modalidade: Mega-Sena Terminal aposta: 1
Cota: 1/100 Concurso: 3056
Seus Números:
Jogo 1 Jogo 2
05 | 14 | 17 | 33 | 39 | 42 | 44 | 48 | 54 06 | 14 | 19 | 31 | 32 | 41 | 42 | 48 | 50
Jogo 3 Jogo 4
03 | 04 | 07 | 10 | 30 | 31 | 47 | 55 | 60 02 | 04 | 09 | 11 | 14 | 30 | 50 | 52 | 54
Jogo 5 Jogo 6
03 | 14 | 20 | 22 | 30 | 39 | 47 | 57 | 58 10 | 11 | 16 | 18 | 29 | 45 | 48 | 54 | 56
Jogo 7 Jogo 8
17 | 22 | 30 | 36 | 38 | 46 | 50 | 55 | 60 23 | 27 | 29 | 36 | 39 | 43 | 46 | 51 | 52
Jogo 9 Jogo 10
01 | 10 | 17 | 25 | 28 | 32 | 34 | 35 | 57 01 | 02 | 08 | 13 | 24 | 31 | 36 | 58 | 60
Página: 1 de 1`;
  const r = parsear(texto, { loteriaEsperada: 'mega', concursoEsperado: '3056' });
  assert.equal(r.status, 'ok');
  assert.equal(r.jogos.length, 10);
  assert.ok(r.jogos.every(j => j.length === 9));
  assert.deepEqual(plano(r.jogos[0]), [5, 14, 17, 33, 39, 42, 44, 48, 54]);
  assert.deepEqual(plano(r.jogos[1]), [6, 14, 19, 31, 32, 41, 42, 48, 50]);
  assert.deepEqual(plano(r.jogos[9]), [1, 2, 8, 13, 24, 31, 36, 58, 60]);
  assert.ok(r.validacao.every(v => v.ok));
});

test('divergência de concurso é sinalizada, não bloqueia a extração', () => {
  const r = parsear(COMPROVANTE_1, { loteriaEsperada: 'mega', concursoEsperado: '3050' });
  assert.equal(r.status, 'ok');
  assert.equal(r.jogos.length, 2);
  assert.equal(r.divergencias.length, 1);
  assert.match(r.divergencias[0], /concurso 3056.*você selecionou 3050/);
});

test('divergência de modalidade é sinalizada', () => {
  const r = parsear(COMPROVANTE_1, { loteriaEsperada: 'lotofacil', concursoEsperado: '3056' });
  assert.equal(r.status, 'ok');
  assert.equal(r.divergencias.length, 1);
  assert.match(r.divergencias[0], /Mega-Sena.*loteria selecionada/);
});

test('PDF sem camada de texto é rejeitado com mensagem clara (nunca tenta OCR)', () => {
  const r = parsear('', {});
  assert.equal(r.status, 'erro');
  assert.match(r.erro, /sem texto extraível/i);
});

test('modalidade não suportada é rejeitada, sem inventar dado', () => {
  const texto = `Loterias
Comprovante de Aposta Bolão Timemania
Modalidade: Timemania Terminal aposta: 1
Concurso: 999
Seus Números:
Jogo 1
01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10`;
  const r = parsear(texto, {});
  assert.equal(r.status, 'erro');
  assert.match(r.erro, /Timemania.*não suportada/i);
});

test('validação por jogo: dezena repetida, fora do intervalo e contagem errada', () => {
  const texto = `Modalidade: Mega-Sena Terminal aposta: 1
Cota: 1/10 Concurso: 3056
Seus Números:
Jogo 1
05 | 05 | 12 | 20 | 33 | 41
Jogo 2
04 | 08 | 15 | 16 | 23 | 61
Jogo 3
07 | 22 | 40`;
  const r = parsear(texto, { loteriaEsperada: 'mega', concursoEsperado: '3056' });
  assert.equal(r.status, 'ok');
  assert.equal(r.jogos.length, 3);
  assert.equal(r.validacao[0].ok, false);
  assert.match(r.validacao[0].erro, /repetida/);
  assert.equal(r.validacao[1].ok, false);
  assert.match(r.validacao[1].erro, /intervalo/);
  assert.equal(r.validacao[2].ok, false);
  assert.match(r.validacao[2].erro, /mínimo 6/);
});
