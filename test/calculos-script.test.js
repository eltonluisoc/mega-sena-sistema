'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/loadBrowserScript');

const sandbox = loadBrowserScript('script.js');

test('combinacao(n, k) - casos básicos', () => {
  assert.equal(sandbox.combinacao(6, 6), 1);
  assert.equal(sandbox.combinacao(6, 0), 1);
  assert.equal(sandbox.combinacao(7, 6), 7);
  assert.equal(sandbox.combinacao(10, 6), 210);
  assert.equal(sandbox.combinacao(15, 15), 1);
});

test('combinacao(n, k) - k maior que n retorna 0', () => {
  assert.equal(sandbox.combinacao(5, 6), 0);
});

test('nomeNivelAcerto - lotofácil sempre retorna "N PONTOS"', () => {
  assert.equal(sandbox.nomeNivelAcerto('lotofacil', 15), '15 PONTOS');
  assert.equal(sandbox.nomeNivelAcerto('lotofacil', 11), '11 PONTOS');
});

test('nomeNivelAcerto - mega usa nomes tradicionais', () => {
  assert.equal(sandbox.nomeNivelAcerto('mega', 6), 'SENA');
  assert.equal(sandbox.nomeNivelAcerto('mega', 5), 'QUINA');
  assert.equal(sandbox.nomeNivelAcerto('mega', 4), 'QUADRA');
});

test('nomeNivelAcerto - acerto sem nome cai no fallback "N ACERTOS"', () => {
  assert.equal(sandbox.nomeNivelAcerto('mega', 3), '3 ACERTOS');
  assert.equal(sandbox.nomeNivelAcerto('lotomania', 20), '20 ACERTOS');
});

test('ordenarCartoesPorAcertos - ordena do maior para o menor número de acertos', () => {
  const cartoes = [
    { id: 'a', numeros: [1, 2, 3] },
    { id: 'b', numeros: [1, 2, 3, 4, 5] },
    { id: 'c', numeros: [1] },
  ];
  const sorteados = [1, 2, 3, 4, 5, 6];

  const ordenado = sandbox.ordenarCartoesPorAcertos(cartoes, sorteados);

  // ordenado vem de um array criado dentro do sandbox `vm` (outro "realm"),
  // então convertemos para um array local antes de comparar.
  assert.deepEqual(Array.from(ordenado, c => c.id), ['b', 'a', 'c']);
});

// Antes de conferir o resultado não existe "acertos" pra ordenar por —
// pedido do usuário pra mostrar em ordem crescente pelas próprias
// dezenas do cartão em vez da ordem crua de gravação no Firestore
// (comportamento antigo, que este teste travava).
test('ordenarCartoesPorAcertos - sem números sorteados, ordena por QUANTIDADE de dezenas (maior pra menor)', () => {
  const cartoes = [
    { id: 'b', numeros: [8, 13, 23] },       // 3 dezenas
    { id: 'a', numeros: [5, 18, 23, 30] },   // 4 dezenas — deve vir primeiro
    { id: 'c', numeros: [5, 20] },           // 2 dezenas — deve vir por último
  ];
  const ordenado = sandbox.ordenarCartoesPorAcertos(cartoes, null);
  assert.deepEqual(Array.from(ordenado, c => c.id), ['a', 'b', 'c']);
});

test('ordenarCartoesPorAcertos - sem números sorteados, empate na quantidade desempata pelas dezenas (crescente)', () => {
  const cartoes = [
    { id: 'b', numeros: [8, 13, 23] },
    { id: 'a', numeros: [5, 18, 23] },
  ];
  const ordenado = sandbox.ordenarCartoesPorAcertos(cartoes, null);
  assert.deepEqual(Array.from(ordenado, c => c.id), ['a', 'b']);
});

test('ordenarCartoesPorAcertos - sem números sorteados, não modifica o array original', () => {
  const cartoes = [{ id: 'b', numeros: [2] }, { id: 'a', numeros: [1] }];
  sandbox.ordenarCartoesPorAcertos(cartoes, null);
  assert.deepEqual(Array.from(cartoes, c => c.id), ['b', 'a']);
});

test('calcularChancesBolao - cobertura de números e total de cartões da mega', () => {
  const cartoes = [
    { numeros: [1, 2, 3, 4, 5, 6] },
    { numeros: [7, 8, 9, 10, 11, 12] },
  ];
  const html = sandbox.calcularChancesBolao(cartoes, 'mega');

  assert.match(html, /12\/60/);
  assert.match(html, />2<\/div>/);
});

// Histórico: a classificação por estrelas usava um número absoluto de
// "bilhetes equivalentes" (>=10000 = EXCELENTE etc.) igual pras 3
// loterias, mas esse número cresce em ritmos bem diferentes conforme a
// loteria (k=6 na Mega, k=15 na Lotofácil, k=5 na Quina) — um bolão de
// Quina com cartões do mínimo de 5 números (o mais comum na prática)
// quase nunca saía de 1 estrela, por maior que fosse o bolão.
// Rodada 70: a Quina saiu desse esquema de vez — a classificação passou
// a vir direto do % de chance de TERNO (não mais de bilhetes cobertos),
// sem faixa REGULAR/2★ (decisão explícita do usuário). 60 cartões do
// mínimo rendem ~6,9% de chance de terno, que cai em SIMPLES (<15%).
test('calcularChancesBolao - Quina classifica pelo % de chance de terno, não por bilhetes', () => {
  const cartoes = Array.from({ length: 60 }, (_, i) => ({
    numeros: [1 + i % 76, 2 + i % 76, 3 + i % 76, 4 + i % 76, 5 + i % 76],
  }));
  const html = sandbox.calcularChancesBolao(cartoes, 'quina');

  assert.match(html, /\(SIMPLES\)/);
});

test('calcularChancesBolao - Lotofácil: 3 cartões de 18 números (2.448 bilhetes) é BOM, nunca EXCELENTE', () => {
  // Caso real reportado: um bolão pequeno (3 cartões) não pode classificar
  // como EXCELENTE só porque a Lotofácil cresce rápido em bilhetes
  // equivalentes. combinacao(18,15) = 816; 3 cartões = 2.448.
  const dezoito = Array.from({ length: 18 }, (_, i) => i + 1);
  const cartoes = [{ numeros: dezoito }, { numeros: dezoito }, { numeros: dezoito }];
  const html = sandbox.calcularChancesBolao(cartoes, 'lotofacil');

  assert.match(html, /\(BOM\)/);
  assert.doesNotMatch(html, /\(EXCELENTE\)/);
  assert.doesNotMatch(html, /\(ÓTIMO\)/);
});

test('calcularChancesBolao - Lotofácil precisa de um bolão bem maior pra ser EXCELENTE', () => {
  // 10 cartões de 20 números (o máximo) = 10 x combinacao(20,15) =
  // 155.040 bilhetes — aí sim um bolão grande o suficiente pra 5 estrelas.
  const vinte = Array.from({ length: 20 }, (_, i) => i + 1);
  const cartoes = Array.from({ length: 10 }, () => ({ numeros: vinte }));
  const html = sandbox.calcularChancesBolao(cartoes, 'lotofacil');

  assert.match(html, /\(EXCELENTE\)/);
});

test('formatarProbabilidade - ajusta casas decimais conforme a grandeza', () => {
  assert.equal(sandbox.formatarProbabilidade(0), '0%');
  assert.equal(sandbox.formatarProbabilidade(0.05), '5.0%');
  assert.equal(sandbox.formatarProbabilidade(0.0005), '0.05%');
  assert.equal(sandbox.formatarProbabilidade(0.0000012), '0.0001%');
});

// Pedido do usuário: "CHANCE REAL" mostrava a chance do prêmio MÁXIMO
// (sena/15 pontos/quina) — sempre uma fração minúscula, mesmo em bolões
// grandes (ex.: 0,007% com 85 cartões cobrindo 100% do universo da Mega).
// Virou a chance de uma faixa mais alcançável: quadra na Mega/Quina, 13
// pontos na Lotofácil — usando a probabilidade hipergeométrica real
// (P(exatamente j acertos) = C(n,j)·C(N-n,k-j)/C(N,k)), não mais
// combinação(n,k)/total (que é a chance do prêmio MÁXIMO, não da quadra).
test('calcularChancesBolao - Mega mostra a chance de QUADRA, não de sena', () => {
  // 1 cartão do mínimo (6 números) — P(exatamente 4 de 6) =
  // C(6,4)·C(54,2)/C(60,6) = 15·1431/50.063.860 ≈ 0,0429%.
  const cartoes = [{ numeros: [1, 2, 3, 4, 5, 6] }];
  const html = sandbox.calcularChancesBolao(cartoes, 'mega');

  assert.match(html, /CHANCE \(QUADRA\)/);
  assert.match(html, />0\.04%</);
});

test('calcularChancesBolao - Lotofácil mostra a chance de 13 pontos', () => {
  const cartoes = [{ numeros: Array.from({ length: 15 }, (_, i) => i + 1) }];
  const html = sandbox.calcularChancesBolao(cartoes, 'lotofacil');

  assert.match(html, /CHANCE \(13 PTS\)/);
});

// Rodada 70: trocado de QUADRA pra TERNO na Quina (0,63% de quadra
// ficava "ÓTIMO 4★" ao lado de um número minúsculo até pra bolões
// grandes — terno rende um % que já diz algo por si só).
test('calcularChancesBolao - Quina mostra a chance de TERNO, não de quina/quadra', () => {
  const cartoes = [{ numeros: [1, 2, 3, 4, 5] }];
  const html = sandbox.calcularChancesBolao(cartoes, 'quina');

  assert.match(html, /CHANCE \(TERNO\)/);
});

// Pedido do usuário: um cartão de 8 números na Mega com 4 acertos não é
// "1 quadra" — é uma aposta múltipla, equivalente a C(8,6)=28 apostas
// simples de uma vez. Das 28, C(4,4)·C(4,2)=6 batem exatamente quadra
// (mais C(4,3)·C(4,3)=16 ternos e C(4,2)·C(4,4)=6 duques escondidos no
// mesmo cartão — soma 28, confere com o total de apostas do cartão).
test('contarPremiosPorFaixa - cartão de 8 números com 4 acertos vale 6 quadras, não 1', () => {
  const faixas = sandbox.contarPremiosPorFaixa(8, 4, 6);
  assert.equal(faixas[4], 6);
  assert.equal(faixas[3], 16);
  assert.equal(faixas[2], 6);
  const total = Object.values(faixas).reduce((a, b) => a + b, 0);
  assert.equal(total, sandbox.combinacao(8, 6));
});

test('contarPremiosPorFaixa - cartão do tamanho mínimo vale exatamente 1 prêmio (comportamento antigo)', () => {
  const faixas = sandbox.contarPremiosPorFaixa(6, 4, 6);
  assert.deepEqual(Object.keys(faixas).map(Number), [4]);
  assert.equal(faixas[4], 1);
});

test('calcularPremios - soma corretamente as apostas múltiplas de vários cartões da Mega', () => {
  const numerosSorteados = [1, 2, 3, 4, 5, 6];
  const cartoes = [
    { numeros: [1, 2, 3, 4, 5, 6] },          // cartão mínimo, acerta os 6 -> 1 sena
    { numeros: [1, 2, 3, 4, 20, 21, 22, 23] }, // 8 números, 4 acertos -> 6 quadra + 16 terno + 6 duque
  ];
  const premios = sandbox.calcularPremios(cartoes, numerosSorteados, 'mega');
  assert.equal(premios.sena, 1);
  assert.equal(premios.quadra, 6);
  assert.equal(premios.terno, 16);
  assert.equal(premios.duque, 6);
});

// +Milionária: as 10 faixas oficiais (confirmadas via busca externa, não
// achei a tabela no site da Caixa) combinam acertos de números (2 a 6)
// com acertos de trevo (1 ou 2) — e a combinação NÃO é só "todo par
// conta": 3 ou 2 números com ZERO trevo não paga nada, só com 1 ou 2
// trevos. tierChaveMilionaria é a função que decide isso; testa as 10
// faixas válidas e os 2 casos "sem prêmio" mais fáceis de errar.
test('tierChaveMilionaria - as 10 faixas oficiais, mais os casos sem prêmio', () => {
  assert.equal(sandbox.tierChaveMilionaria(6, 2), 'n6t2');
  assert.equal(sandbox.tierChaveMilionaria(6, 1), 'n6t');
  assert.equal(sandbox.tierChaveMilionaria(6, 0), 'n6t');
  assert.equal(sandbox.tierChaveMilionaria(5, 2), 'n5t2');
  assert.equal(sandbox.tierChaveMilionaria(5, 1), 'n5t');
  assert.equal(sandbox.tierChaveMilionaria(5, 0), 'n5t');
  assert.equal(sandbox.tierChaveMilionaria(4, 2), 'n4t2');
  assert.equal(sandbox.tierChaveMilionaria(4, 1), 'n4t');
  assert.equal(sandbox.tierChaveMilionaria(4, 0), 'n4t');
  assert.equal(sandbox.tierChaveMilionaria(3, 2), 'n3t2');
  assert.equal(sandbox.tierChaveMilionaria(3, 1), 'n3t1');
  assert.equal(sandbox.tierChaveMilionaria(2, 2), 'n2t2');
  assert.equal(sandbox.tierChaveMilionaria(2, 1), 'n2t1');
  // Casos sem prêmio: 3 ou 2 números com ZERO trevo não paga (diferente
  // de 6/5/4 números, que pagam mesmo com 0 trevo).
  assert.equal(sandbox.tierChaveMilionaria(3, 0), null);
  assert.equal(sandbox.tierChaveMilionaria(2, 0), null);
  assert.equal(sandbox.tierChaveMilionaria(1, 2), null);
  assert.equal(sandbox.tierChaveMilionaria(0, 2), null);
});

// Mesmo padrão do teste de aposta múltipla da Mega acima: 1 número extra
// (7 em vez do mínimo 6) faz o cartão valer C(7,6)=7 apostas simples —
// 6 delas batendo 5 números (sobrando a 7ª fora do sorteio) e 1 batendo
// os 6. Os 2 trevos do cartão são exatamente o mínimo (sem multiplicar
// nessa dimensão), então toda a combinatória de trevo some num fator 1.
test('calcularPremiosMilionaria - cartão de 7 números (aposta múltipla) cruza certo com os 2 trevos', () => {
  const cartoes = [{ numeros: [1, 2, 3, 4, 5, 6, 7], trevos: [1, 2] }];
  const premios = sandbox.calcularPremios(cartoes, [1, 2, 3, 4, 5, 6], 'maismilionaria', [1, 2]);
  assert.equal(premios.n6t2, 1);  // C(6,6)·C(1,1) × C(2,2)·C(0,0) = 1×1
  assert.equal(premios.n5t2, 6);  // C(6,5)·C(1,1) × C(2,2)·C(0,0) = 6×1
  const total = Object.values(premios).reduce((a, b) => a + b, 0);
  assert.equal(total, sandbox.combinacao(7, 6)); // as 7 apostas simples do cartão, todas pagando
});

// A assimetria real da +Milionária: 3 (ou 2) números batidos só vira
// prêmio se vier com pelo menos 1 trevo — 0 trevo não paga nada nessas
// faixas (diferente de 6/5/4 números, que pagam mesmo sem trevo).
test('calcularPremiosMilionaria - 3 números sem nenhum trevo não gera prêmio nenhum', () => {
  const cartoes = [{ numeros: [1, 2, 3, 4, 5, 6], trevos: [1, 2] }];
  // Sorteio bate só 3 dos números do cartão e nenhum dos 2 trevos.
  const premios = sandbox.calcularPremios(cartoes, [1, 2, 3, 40, 41, 42], 'maismilionaria', [5, 6]);
  const total = Object.values(premios).reduce((a, b) => a + b, 0);
  assert.equal(total, 0);
});
