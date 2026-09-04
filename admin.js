// ============================================
// AUTENTICAÇÃO - Firebase Auth (Google)
// ============================================
const ADMIN_EMAIL = 'eltonluisoc@gmail.com';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let cartoes = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let resultadosQuina = {};
let loteriaAdmin = 'mega';
let cartoesFiltrados = [];
let boloes = [];
let reservasCarregadas = []; // última lista carregada em carregarReservas() — usada pelo modal de registrar movimento

// ============================================
// VARIÁVEIS DO CADASTRO EM LOTE
// ============================================
let cartoesLote = [];
let cartaoAtualIndex = 0;
const MAX_NUMEROS_LOTOFACIL = 15;
const TOTAL_NUMEROS = 25;

// ============================================
// VARIÁVEIS DO MODO SELEÇÃO INDIVIDUAL
// ============================================
let modoSelecaoAtivo = false;
let numerosSelecionados = [];
let cartaoAtualSelecao = 0;
let todosCartoesSelecao = [];

// ============================================
// VARIÁVEIS DUPLICADOS
// ============================================
let cartoesDuplicadosSelecionados = {};

// Escapa texto vindo do Firestore (nome de participante, título de bolão)
// antes de inserir em innerHTML/atributo — sem isso, um nome cadastrado
// com HTML (ex.: "<img src=x onerror=...>") executaria dentro da própria
// sessão autenticada do admin ao abrir a lista.
function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    // textContent->innerHTML já escapa <, > e &, mas não aspas — precisamos
    // delas também porque alguns usos inserem o valor dentro de atributos
    // (data-titulo="...", data-nome="...").
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `${icon} ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => { if (toast.parentNode) toast.remove(); if (container.children.length === 0 && container.parentNode) container.remove(); }, 300);
    }, 3000);
}

// ============================================
// LOADING
// ============================================
function showLoading(mensagem) {
    let overlay = document.getElementById('globalLoading');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'globalLoading';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 9999;
            display: flex; justify-content: center; align-items: center;
            flex-direction: column; gap: 15px;
        `;
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 25px; text-align: center; min-width: 200px;">
            <div style="font-size: 40px; animation: spin 1s linear infinite;">🔄</div>
            <div style="margin-top: 10px; font-weight: bold;">${mensagem}</div>
        </div>
    `;
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('globalLoading');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ============================================
// AUTENTICAÇÃO
// ============================================
function verificarAutenticacao() {
    const modal = document.getElementById('authModal');

    if (!modal) {
        console.error('❌ Modal de autenticação não encontrado!');
        return;
    }

    firebase.auth().onAuthStateChanged(user => {
        if (user && user.email === ADMIN_EMAIL) {
            console.log('✅ Usuário autenticado:', user.email);
            modal.classList.remove('show');
            modal.style.display = 'none';
            carregarPixConfig();
            carregarDadosAdmin();
        } else {
            if (user) {
                console.warn('⛔ Conta sem permissão de acesso:', user.email);
                showToast('⛔ Esta conta não tem acesso ao painel', 'error');
                firebase.auth().signOut();
            }
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
    });
}

function entrarComSenha() {
    const senhaInput = document.getElementById('senhaAdmin');
    const senha = senhaInput ? senhaInput.value : '';

    if (!senha) {
        showToast('⚠️ Digite a senha', 'warning');
        return;
    }

    firebase.auth().signInWithEmailAndPassword(ADMIN_EMAIL, senha).catch(error => {
        console.error('❌ Erro no login:', error);
        showToast('❌ Senha incorreta ou erro no login', 'error');
        if (senhaInput) {
            senhaInput.value = '';
            senhaInput.focus();
        }
    });
}

function sair() {
    firebase.auth().signOut();
    showToast('🔒 Saiu do sistema', 'info');
}

// ============================================
// FUNÇÕES DO DASHBOARD MELHORADAS
// ============================================
function atualizarDashboardAdmin() {
    // Total de cartões, cartões por loteria, total de bolões e as demais
    // estatísticas avançadas são calculados e exibidos por
    // atualizarDashboardEstatisticas() (via carregarEstatisticasDashboard),
    // que é a versão correta e completa. Essa função cuidava disso também,
    // com uma conta de "total de bolões" desatualizada (boloes.length em
    // vez de contar por concurso) — e como ela roda toda vez que os dados
    // são recarregados, sobrescrevia o número certo pelo errado. Agora só
    // cuida do que mais ninguém calcula: status dos bolões e timestamp.

    // Bolões ativos por status
    db.collection('config_boloes').doc('ativos').get().then(configDoc => {
        if (configDoc.exists) {
            const dados = configDoc.data();
            const statusMap = dados.status || {};
            let abertos = 0, andamento = 0, encerrados = 0;
            for (const id in statusMap) {
                const status = statusMap[id];
                if (status === 'aberto') abertos++;
                else if (status === 'andamento') andamento++;
                else if (status === 'encerrado') encerrados++;
            }
            
            const abertosEl = document.getElementById('dashboardAbertos');
            const andamentoEl = document.getElementById('dashboardAndamento');
            const encerradosEl = document.getElementById('dashboardEncerrados');
            
            if (abertosEl) abertosEl.textContent = abertos;
            if (andamentoEl) andamentoEl.textContent = andamento;
            if (encerradosEl) encerradosEl.textContent = encerrados;
        }
    }).catch(error => {
        console.error('Erro ao carregar status dos bolões:', error);
    });
    
    // Atualizar timestamp
    const ultimaAtualizacao = document.getElementById('ultimaAtualizacao');
    if (ultimaAtualizacao) {
        ultimaAtualizacao.textContent = new Date().toLocaleString('pt-BR');
    }
}

// ============================================
// INICIALIZAR GRADE DE SELEÇÃO INDIVIDUAL
// ============================================
function inicializarGradeSelecaoIndividual() {
    const grade = document.getElementById('gradeSelecaoIndividual');
    if (!grade) return;
    
    let totalNumeros = 60;
    if (loteriaAdmin === 'lotofacil') totalNumeros = 25;
    else if (loteriaAdmin === 'quina') totalNumeros = 80;
    else totalNumeros = 60;
    
    // 12 em vez de 10 — pedido do usuário: caixinhas largas demais,
    // exigindo mais deslocamento de mouse por clique (mesmo ajuste do
    // padrão .grade-numeros em admin.html; aqui precisa ser repetido
    // porque style.gridTemplateColumns inline sobrescreve a classe).
    grade.style.gridTemplateColumns = 'repeat(12, 1fr)';
    grade.style.gap = '6px';
    
    grade.innerHTML = '';
    for (let i = 1; i <= totalNumeros; i++) {
        const btn = document.createElement('button');
        btn.className = 'numero-btn';
        btn.dataset.numero = i;
        btn.textContent = i.toString().padStart(2, '0');
        btn.style.fontSize = (totalNumeros > 60) ? '11px' : '13px';
        btn.style.padding = (totalNumeros > 60) ? '6px 2px' : '8px 4px';
        btn.style.minHeight = (totalNumeros > 60) ? '32px' : '38px';
        btn.style.borderRadius = '6px';
        btn.onclick = () => toggleNumeroSelecao(i);
        grade.appendChild(btn);
    }
}

// ============================================
// PREENCHER POR TEXTO — compartilhado pelos 3 pontos de "digitar/colar em
// vez de clicar" (Modo Seleção, cartão atual do Lote, e lote em massa).
// Pedido do usuário: ele gera os cartões no app da Caixa e fica com a
// IMAGEM — sem IA de visão (custo em volume alto), a forma mais rápida de
// levar isso pro sistema é digitar/colar os números direto, em vez de
// clicar um por um na grade.
// ============================================
function regrasLoteria(loteria) {
    if (loteria === 'mega')      return { minNumeros: 6,  maxNumeros: 20, maxValor: 60, label: 'MEGA-SENA' };
    if (loteria === 'lotofacil') return { minNumeros: 15, maxNumeros: 20, maxValor: 25, label: 'LOTOFÁCIL' };
    if (loteria === 'quina')     return { minNumeros: 5,  maxNumeros: 15, maxValor: 80, label: 'QUINA' };
    return null;
}

function parseNumerosTexto(texto, { minNumeros, maxNumeros, maxValor, label }) {
    const numeros = (texto.match(/\d+/g) || []).map(Number);
    if (numeros.length === 0) return { erro: 'nenhum número encontrado no texto' };
    if (numeros.length < minNumeros) return { erro: `${label}: mínimo ${minNumeros} números (veio ${numeros.length})` };
    if (numeros.length > maxNumeros) return { erro: `${label}: máximo ${maxNumeros} números (veio ${numeros.length})` };
    const unicos = [...new Set(numeros)];
    if (unicos.length !== numeros.length) return { erro: 'números repetidos no mesmo cartão' };
    if (numeros.some(n => n < 1 || n > maxValor)) return { erro: `números devem estar entre 1 e ${maxValor}` };
    numeros.sort((a, b) => a - b);
    return { numeros, erro: null };
}

// ============================================
// TOGGLE NÚMERO NA SELEÇÃO INDIVIDUAL
// ============================================
function toggleNumeroSelecao(numero) {
    let minNumeros, maxNumeros;
    if (loteriaAdmin === 'mega') {
        minNumeros = 6;
        maxNumeros = 20;
    } else if (loteriaAdmin === 'lotofacil') {
        minNumeros = 15;
        maxNumeros = 20;
    } else if (loteriaAdmin === 'quina') {
        minNumeros = 5;
        maxNumeros = 15;
    } else {
        return;
    }
    
    const index = numerosSelecionados.indexOf(numero);
    if (index > -1) {
        numerosSelecionados.splice(index, 1);
    } else {
        if (numerosSelecionados.length >= maxNumeros) {
            showToast(`⚠️ Máximo de ${maxNumeros} números!`, 'warning');
            return;
        }
        numerosSelecionados.push(numero);
        numerosSelecionados.sort((a, b) => a - b);
    }
    
    atualizarGradeSelecaoVisual();
    atualizarContadorSelecao();
    atualizarPreviaSelecao();
}

// ============================================
// ATUALIZAR GRADE VISUAL DA SELEÇÃO
// ============================================
function atualizarGradeSelecaoVisual() {
    const botoes = document.querySelectorAll('#gradeSelecaoIndividual .numero-btn');
    botoes.forEach(btn => {
        const num = parseInt(btn.dataset.numero);
        if (numerosSelecionados.includes(num)) {
            btn.classList.add('selecionado');
            btn.style.background = '#0071e3';
            btn.style.color = 'white';
            btn.style.borderColor = '#0071e3';
            btn.style.transform = 'scale(1.05)';
        } else {
            btn.classList.remove('selecionado');
            btn.style.background = 'white';
            btn.style.color = '#1e293b';
            btn.style.borderColor = '#e2e8f0';
            btn.style.transform = 'scale(1)';
        }
    });
}

// ============================================
// ATUALIZAR CONTADOR DA SELEÇÃO
// ============================================
function atualizarContadorSelecao() {
    const contador = document.getElementById('contadorSelecao');
    if (contador) {
        let minNumeros, maxNumeros;
        if (loteriaAdmin === 'mega') {
            minNumeros = 6;
            maxNumeros = 20;
        } else if (loteriaAdmin === 'lotofacil') {
            minNumeros = 15;
            maxNumeros = 20;
        } else if (loteriaAdmin === 'quina') {
            minNumeros = 5;
            maxNumeros = 15;
        } else {
            return;
        }
        const cor = numerosSelecionados.length >= minNumeros ? '#10b981' : '#0071e3';
        contador.textContent = `${numerosSelecionados.length} números selecionados (mínimo ${minNumeros})`;
        contador.style.color = cor;
    }
}

// ============================================
// ATUALIZAR PRÉVIA DA SELEÇÃO
// ============================================
function atualizarPreviaSelecao() {
    const previa = document.getElementById('previaNumerosSelecionados');
    if (!previa) return;
    
    if (numerosSelecionados.length === 0) {
        previa.innerHTML = '<span style="color: #94a3b8; font-size: 12px;">Nenhum número selecionado</span>';
        return;
    }
    
    let html = '';
    for (const n of numerosSelecionados) {
        html += `<span class="numero-cartao-badge numero-cartao-badge-sm numero-cartao-badge-accent">${n.toString().padStart(2, '0')}</span>`;
    }
    previa.innerHTML = html;
}

// ============================================
// PREENCHER A SELEÇÃO POR TEXTO — alternativa a clicar número por número
// ============================================
function preencherSelecaoPorTexto() {
    const input = document.getElementById('numerosTextoSelecao');
    if (!input) return;
    const regras = regrasLoteria(loteriaAdmin);
    if (!regras) { showToast('⚠️ Loteria não reconhecida!', 'error'); return; }

    const { numeros, erro } = parseNumerosTexto(input.value, regras);
    if (erro) { showToast('❌ ' + erro, 'error'); return; }

    numerosSelecionados = numeros;
    atualizarGradeSelecaoVisual();
    atualizarContadorSelecao();
    atualizarPreviaSelecao();
    input.value = '';
    showToast(`✅ ${numeros.length} números preenchidos — confira a grade e clique em Adicionar`, 'success');
}

// ============================================
// ATUALIZAR TOTAL DE CARTÕES DA SELEÇÃO
// ============================================
function atualizarTotalCartoesSelecao() {
    const el = document.getElementById('totalCartoesSelecao');
    if (el) el.textContent = todosCartoesSelecao.length || 1;
}

// ============================================
// NAVEGAÇÃO ENTRE CARTÕES DA SELEÇÃO
// ============================================
function navegarSelecao(direcao) {
    const total = todosCartoesSelecao.length || 1;
    cartaoAtualSelecao += direcao;
    if (cartaoAtualSelecao < 0) cartaoAtualSelecao = total - 1;
    if (cartaoAtualSelecao >= total) cartaoAtualSelecao = 0;
    
    const elAtual = document.getElementById('cartaoSelecaoAtual');
    const elTotal = document.getElementById('totalCartoesSelecao');
    if (elAtual) elAtual.textContent = cartaoAtualSelecao + 1;
    if (elTotal) elTotal.textContent = total;
    
    if (todosCartoesSelecao.length > 0 && cartaoAtualSelecao < todosCartoesSelecao.length) {
        const cartao = todosCartoesSelecao[cartaoAtualSelecao];
        numerosSelecionados = [...cartao.numeros];
        atualizarGradeSelecaoVisual();
        atualizarContadorSelecao();
        atualizarPreviaSelecao();
    } else {
        numerosSelecionados = [];
        atualizarGradeSelecaoVisual();
        atualizarContadorSelecao();
        atualizarPreviaSelecao();
    }
}

// ============================================
// ADICIONAR CARTÃO ATUAL DA SELEÇÃO
// ============================================
async function adicionarCartaoSelecaoAtual() {
    const concurso = document.getElementById('concursoIndividualSelecao').value;
    const bolao = document.getElementById('bolaoIndividualSelecao').value || 'Bolão Seleção';
    const tipoParticipacao = document.getElementById('tipoCartaoIndividualSelecao').value;
    
    if (!concurso) {
        showToast('⚠️ Informe o concurso!', 'warning');
        return;
    }
    
    if (numerosSelecionados.length === 0) {
        showToast('⚠️ Selecione pelo menos um número!', 'warning');
        return;
    }
    
    let minNumeros, maxNumeros, maxValor, label;
    if (loteriaAdmin === 'mega') {
        minNumeros = 6;
        maxNumeros = 20;
        maxValor = 60;
        label = 'MEGA-SENA';
    } else if (loteriaAdmin === 'lotofacil') {
        minNumeros = 15;
        maxNumeros = 20;
        maxValor = 25;
        label = 'LOTOFÁCIL';
    } else if (loteriaAdmin === 'quina') {
        minNumeros = 5;
        maxNumeros = 15;
        maxValor = 80;
        label = 'QUINA';
    } else {
        showToast('⚠️ Loteria não reconhecida!', 'error');
        return;
    }
    
    if (numerosSelecionados.length < minNumeros) {
        showToast(`❌ ${label}: mínimo ${minNumeros} números!`, 'error');
        return;
    }
    
    if (numerosSelecionados.length > maxNumeros) {
        showToast(`❌ ${label}: máximo ${maxNumeros} números!`, 'error');
        return;
    }
    
    const numeros = [...numerosSelecionados].sort((a, b) => a - b);
    
    try {
        await db.collection('cartoes').add({
            concurso: concurso,
            bolao: bolao,
            numeros: numeros,
            tipo: loteriaAdmin,
            tipoParticipacao: tipoParticipacao,
            admin: true,
            dataCadastro: new Date().toISOString(),
            totalNumeros: numeros.length
        });
        showToast(`✅ Cartão #${todosCartoesSelecao.length + 1} adicionado à ${label}!`, 'success');
        
        todosCartoesSelecao.push({
            concurso: concurso,
            bolao: bolao,
            numeros: numeros,
            tipo: loteriaAdmin,
            tipoParticipacao: tipoParticipacao
        });
        
        numerosSelecionados = [];
        atualizarGradeSelecaoVisual();
        atualizarContadorSelecao();
        atualizarPreviaSelecao();
        atualizarTotalCartoesSelecao();
        
        carregarDadosAdmin();
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao adicionar', 'error');
    }
}

// ============================================
// LIMPAR TODOS OS CARTÕES DA SELEÇÃO
// ============================================
function limparTodosCartoesSelecao() {
    if (!confirm('⚠️ ATENÇÃO!\n\nLimpar todos os cartões da seleção?\n\nEsta ação NÃO pode ser desfeita!')) return;
    todosCartoesSelecao = [];
    cartaoAtualSelecao = 0;
    numerosSelecionados = [];
    atualizarGradeSelecaoVisual();
    atualizarContadorSelecao();
    atualizarPreviaSelecao();
    atualizarTotalCartoesSelecao();
    showToast('🧹 Todos os cartões limpos!', 'info');
}

// ============================================
// PIX CONFIG
// ============================================
async function carregarPixConfig() {
    try {
        const doc = await db.collection('config_geral').doc('pix').get();
        const pix = doc.exists ? doc.data().chave : '';
        document.getElementById('pixConfig').value = pix;
    } catch(e) { console.log('Erro ao carregar PIX:', e); }
}

async function salvarPixConfig() {
    const pix = document.getElementById('pixConfig').value;
    await db.collection('config_geral').doc('pix').set({ chave: pix });
    showToast('✅ Chave PIX salva!', 'success');
}

// ============================================
// CARREGAR DADOS ADMIN
// ============================================
async function carregarDadosAdmin() {
    try {
        const snapshot = await db.collection('cartoes').get();
        cartoes = [];
        snapshot.forEach(doc => {
            cartoes.push({ id: doc.id, ...doc.data() });
        });
        
        try {
            const snapshotParticipantes = await db.collection('participantes').get();
            boloes = [];
            snapshotParticipantes.forEach(doc => {
                boloes.push({ id: doc.id, ...doc.data() });
            });
            console.log(`✅ ${boloes.length} bolões carregados`);
        } catch (e) {
            console.log('⚠️ Nenhum bolão encontrado:', e);
            boloes = [];
        }
        
        exibirCartoesAdmin();
        carregarConcursosAdmin();
        atualizarDashboardAdmin();
        
        const total = cartoes.filter(c => c.tipo === loteriaAdmin).length;
        const totalDiv = document.getElementById('totalCartoes');
        if (totalDiv) totalDiv.innerHTML = total + ' cartões';
        showToast('✅ Dados carregados!', 'success');
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao carregar: ' + error.message, 'error');
    }
}

// ============================================
// EXIBIR CARTÕES ADMIN
// ============================================
function exibirCartoesAdmin() {
    console.log(`📋 Exibindo cartões da loteria: ${loteriaAdmin}`);
    
    let cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    
    const filtro = document.getElementById('filtroConcursoLista')?.value || 'todos';
    if (filtro !== 'todos') {
        cartoesFiltrados = cartoesFiltrados.filter(c => c.concurso == filtro);
    }
    
    const ordenarPor = document.getElementById('ordenarPorLista')?.value || 'data_desc';
    switch(ordenarPor) {
        case 'concurso_desc': cartoesFiltrados.sort((a,b) => (b.concurso||0) - (a.concurso||0)); break;
        case 'concurso_asc': cartoesFiltrados.sort((a,b) => (a.concurso||0) - (b.concurso||0)); break;
        case 'bolao': cartoesFiltrados.sort((a,b) => (a.bolao||'Sem Bolão').localeCompare(b.bolao||'Sem Bolão')); break;
        case 'data_desc': cartoesFiltrados.sort((a,b) => new Date(b.dataCadastro||0) - new Date(a.dataCadastro||0)); break;
        case 'data_asc': cartoesFiltrados.sort((a,b) => new Date(a.dataCadastro||0) - new Date(b.dataCadastro||0)); break;
        default: cartoesFiltrados.sort((a,b) => new Date(b.dataCadastro||0) - new Date(a.dataCadastro||0));
    }
    
    const container = document.getElementById('cartoesLista');
    if (!container) return;
    
    if (cartoesFiltrados.length === 0) {
        container.innerHTML = `<div class="empty-state">📭 Nenhum cartão da ${loteriaAdmin.toUpperCase()} cadastrado</div>`;
        return;
    }
    
    let html = '';

    // Números do cartão: antes eram tags cinzas retangulares em fonte
    // monoespaçada minúscula (10px na Lotofácil, pra caber os até 20
    // números) — difícil de ler rápido e sem nada em comum com a "bolinha"
    // que o site público usa pra mostrar dezena sorteada. Virou uma
    // bolinha só (.numero-cartao-badge, definida em admin.html), tamanho
    // fixo e legível não importa quantos números o cartão tenha — mais
    // números só ocupam mais linhas (flex-wrap), não ficam menores.
    for (const cartao of cartoesFiltrados) {
        const dataFormatada = cartao.dataCadastro ? new Date(cartao.dataCadastro).toLocaleDateString('pt-BR') : 'Data não disponível';
        const tipoParticipacao = cartao.tipoParticipacao === 'cota' ? '🎟️ Cota' : '👥 Exclusivo';
        const qtdNumeros = cartao.numeros.length;

        html += `
            <div class="cartao-item">
                <div style="display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap;">
                    <div><input type="checkbox" class="checkbox-cartao" data-id="${cartao.id}" style="width:22px; height:22px;"></div>
                    <div style="flex:1; min-width:150px;">
                        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                            <div>
                                <strong>Cartão #${cartao.id ? cartao.id.slice(-6) : '???'}</strong>
                                <span style="font-size:11px; color:#64748b; margin-left:8px;">${tipoParticipacao}</span>
                                <span style="font-size:11px; color:#94a3b8; margin-left:8px;">${qtdNumeros} números</span>
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button class="btn-editar" data-id="${cartao.id}" style="background:#0071e3; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;">✏️ Editar</button>
                            </div>
                        </div>
                        <div style="font-size:12px; color:#666; margin:5px 0;">
                            Concurso ${cartao.concurso} | Bolão: ${cartao.bolao || 'Sem Bolão'} | 📅 ${dataFormatada}
                        </div>
                        <div class="numeros-cartao-lista">
                            ${cartao.numeros.map(n => `<span class="numero-cartao-badge">${n.toString().padStart(2,'0')}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
    
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            editarCartao(this.dataset.id);
        });
    });
    
    document.querySelectorAll('.checkbox-cartao').forEach(cb => cb.onchange = atualizarContadorSelecionados);
    atualizarContadorSelecionados();
    
    const totalDiv = document.getElementById('totalCartoes');
    if (totalDiv) totalDiv.innerHTML = cartoesFiltrados.length + ' cartões';
}

// ============================================
// CARREGAR CONCURSOS ADMIN
// ============================================
function carregarConcursosAdmin() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    const concursos = [...new Set(cartoesFiltrados.map(c => c.concurso))];
    concursos.sort((a,b) => b - a);
    const filtro = document.getElementById('filtroConcursoLista');
    
    if (filtro) {
        filtro.innerHTML = '<option value="todos">Todos os concursos</option>';
        concursos.forEach(c => filtro.innerHTML += `<option value="${c}">Concurso ${c}</option>`);
    }
}

// ============================================
// SELECIONAR LOTERIA
// ============================================
function setLoteriaAdmin(loteria) {
    console.log(`🔄 Mudando loteria admin para: ${loteria}`);
    loteriaAdmin = loteria;
    
    const btnMega = document.getElementById('adminBtnMega');
    const btnLotofacil = document.getElementById('adminBtnLotofacil');
    const btnQuina = document.getElementById('adminBtnQuina');
    
    [btnMega, btnLotofacil, btnQuina].forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
            btn.style.transform = 'scale(1)';
            btn.style.filter = 'brightness(1)';
            btn.style.boxShadow = 'none';
        }
    });
    
    let btnSelecionado = null;
    if (loteria === 'mega') btnSelecionado = btnMega;
    else if (loteria === 'lotofacil') btnSelecionado = btnLotofacil;
    else if (loteria === 'quina') btnSelecionado = btnQuina;
    
    if (btnSelecionado) {
        btnSelecionado.classList.add('active');
        btnSelecionado.style.transform = 'scale(0.98)';
        btnSelecionado.style.filter = 'brightness(0.9)';
        btnSelecionado.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
    }
    
    const cardLote = document.getElementById('cardLote');
    if (cardLote) {
        if (loteria === 'lotofacil') {
            cardLote.style.display = 'block';
            cardLote.style.opacity = '1';
        } else {
            cardLote.style.display = 'none';
            cardLote.style.opacity = '0.5';
        }
    }
    
    const labelIndividual = document.getElementById('labelNumerosIndividual');
    const dicaIndividual = document.getElementById('dicaNumerosIndividual');
    const inputIndividual = document.getElementById('numerosIndividual');
    
    if (labelIndividual) {
        if (loteria === 'mega') {
            labelIndividual.innerHTML = '🔢 Números (6 a 20 números separados por espaço)';
            if (dicaIndividual) dicaIndividual.innerHTML = '💡 MEGA: 6 a 20 números (1-60)';
            if (inputIndividual) inputIndividual.placeholder = 'Ex: 12 15 23 34 45 56 (6 a 20)';
        } else if (loteria === 'lotofacil') {
            labelIndividual.innerHTML = '🔢 Números (15 a 20 números separados por espaço)';
            if (dicaIndividual) dicaIndividual.innerHTML = '💡 LOTOFÁCIL: 15 a 20 números (1-25)';
            if (inputIndividual) inputIndividual.placeholder = 'Ex: 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 (15 a 20)';
        } else if (loteria === 'quina') {
            labelIndividual.innerHTML = '🔢 Números (5 a 15 números separados por espaço)';
            if (dicaIndividual) dicaIndividual.innerHTML = '💡 QUINA: 5 a 15 números (1-80)';
            if (inputIndividual) inputIndividual.placeholder = 'Ex: 12 15 23 34 45 (5 a 15)';
        }
    }
    
    inicializarGradeSelecaoIndividual();
    
    todosCartoesSelecao = [];
    cartaoAtualSelecao = 0;
    numerosSelecionados = [];
    atualizarTotalCartoesSelecao();
    atualizarContadorSelecao();
    atualizarPreviaSelecao();
    atualizarGradeSelecaoVisual();
    
    carregarDadosAdmin();
    showToast(`🔄 Mudou para ${loteria.toUpperCase()}`, 'info');
}

// ============================================
// SALVAR CONFIG BOLÕES
// ============================================
async function salvarConfigBoloes() {
    const checkboxes = document.querySelectorAll('.checkbox-bolao:checked');
    const idsSelecionados = Array.from(checkboxes).map(cb => cb.dataset.id);
    
    const statusMap = {};
    document.querySelectorAll('.status-select').forEach(select => {
        statusMap[select.dataset.id] = select.value;
    });
    
    const dataLimiteMap = {};
    document.querySelectorAll('.data-limite-input').forEach(input => {
        dataLimiteMap[input.dataset.id] = input.value;
    });
    
    const destaqueMap = {};
    document.querySelectorAll('.checkbox-destaque:checked').forEach(cb => {
        destaqueMap[cb.dataset.id] = true;
    });
    
    const estrategiaMap = {};
    document.querySelectorAll('.estrategia-textarea').forEach(textarea => {
        const valor = textarea.value.trim();
        if (valor) {
            estrategiaMap[textarea.dataset.id] = valor;
        }
    });
    
    try {
        await db.collection('config_boloes').doc('ativos').set({ 
            ids: idsSelecionados,
            status: statusMap,
            dataLimite: dataLimiteMap,
            destaque: destaqueMap,
            estrategia: estrategiaMap
        }, { merge: true });
        showToast('✅ Configurações salvas!', 'success');
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showToast('❌ Erro ao salvar', 'error');
    }
}

// ============================================
// EXCLUIR BOLÃO
// ============================================
async function excluirBolao(bolaoId, bolaoTitulo) {
    if (!confirm(`⚠️ ATENÇÃO!\n\nDeseja excluir o bolão "${bolaoTitulo}"?\n\nEsta ação NÃO pode ser desfeita!`)) {
        return;
    }
    
    try {
        await db.collection('participantes').doc(bolaoId).delete();
        
        const configRef = db.collection('config_boloes').doc('ativos');
        const configDoc = await configRef.get();
        
        if (configDoc.exists) {
            const dados = configDoc.data();
            const statusMap = dados.status || {};
            const dataLimiteMap = dados.dataLimite || {};
            const destaqueMap = dados.destaque || {};
            const estrategiaMap = dados.estrategia || {};
            
            delete statusMap[bolaoId];
            delete dataLimiteMap[bolaoId];
            delete destaqueMap[bolaoId];
            delete estrategiaMap[bolaoId];
            
            let ids = dados.ids || [];
            ids = ids.filter(id => id !== bolaoId);
            
            await configRef.update({
                ids: ids,
                status: statusMap,
                dataLimite: dataLimiteMap,
                destaque: destaqueMap,
                estrategia: estrategiaMap,
                admin: true
            });
        }
        
        showToast(`✅ Bolão "${bolaoTitulo}" excluído com sucesso!`, 'success');
        carregarDadosAdmin();
        carregarBoloesParaGerenciar();
        
    } catch (error) {
        console.error('Erro ao excluir bolão:', error);
        showToast('❌ Erro ao excluir bolão', 'error');
    }
}

// ============================================
// CARREGAR BOLÕES PARA GERENCIAR
// ============================================
async function carregarBoloesParaGerenciar() {
    const container = document.getElementById('listaBoloes');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('participantes').get();
        const boloes = [];
        snapshot.forEach(doc => {
            boloes.push({ id: doc.id, ...doc.data() });
        });
        
        if (boloes.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum bolão encontrado.</div>';
            return;
        }
        
        let selecionados = [];
        let statusMap = {};
        let dataLimiteMap = {};
        let destaqueMap = {};
        let estrategiaMap = {};

        try {
            const configDoc = await db.collection('config_boloes').doc('ativos').get();
            if (configDoc.exists) {
                selecionados = configDoc.data().ids || [];
                statusMap = configDoc.data().status || {};
                dataLimiteMap = configDoc.data().dataLimite || {};
                destaqueMap = configDoc.data().destaque || {};
                estrategiaMap = configDoc.data().estrategia || {};
            }
        } catch (e) {
            console.log('Erro ao carregar seleção:', e);
        }
        
        const ordemStatus = { 'aberto': 0, 'andamento': 1, 'encerrado': 2 };
        
        boloes.sort((a, b) => {
            const statusA = statusMap[a.id] || 'andamento';
            const statusB = statusMap[b.id] || 'andamento';
            if (statusA !== statusB) {
                return (ordemStatus[statusA] || 1) - (ordemStatus[statusB] || 1);
            }
            const tituloA = (a.titulo || '').toLowerCase();
            const tituloB = (b.titulo || '').toLowerCase();
            return tituloA.localeCompare(tituloB);
        });
        
        let html = '';
        for (const bolao of boloes) {
            const checked = selecionados.includes(bolao.id) ? 'checked' : '';
            const status = statusMap[bolao.id] || 'andamento';
            const isDestaque = destaqueMap[bolao.id] === true;
            
            let statusIcon = '';
            let statusColor = '';
            let statusBg = '';
            if (status === 'aberto') {
                statusIcon = '🟢';
                statusColor = '#065f46';
                statusBg = '#d1fae5';
            } else if (status === 'andamento') {
                statusIcon = '🟡';
                statusColor = '#92400e';
                statusBg = '#fef3c7';
            } else if (status === 'encerrado') {
                statusIcon = '🔴';
                statusColor = '#991b1b';
                statusBg = '#fee2e2';
            }
            
            html += `
                <div style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; background: ${isDestaque ? '#fef3c7' : 'white'}; border-radius: 10px; border-left: 4px solid ${status === 'aberto' ? '#10b981' : status === 'andamento' ? '#f59e0b' : '#ef4444'};">
                    
                    <!-- LINHA 1: Checkbox + Título + Status + Destaque Badge -->
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <input type="checkbox" class="checkbox-bolao" data-id="${bolao.id}" ${checked} style="width: 20px; height: 20px; cursor: pointer; accent-color: #0071e3; flex-shrink: 0;">
                        <strong style="font-size: 14px; color: #1e293b;">${bolao.titulo || 'Sem título'}</strong>
                        <span style="font-size: 11px; background: ${statusBg}; color: ${statusColor}; padding: 2px 10px; border-radius: 30px; font-weight: 600;">${statusIcon} ${status.toUpperCase()}</span>
                        <span style="font-size: 11px; color: #64748b;">👥 ${bolao.participantes?.length || 0}</span>
                        ${isDestaque ? '<span style="font-size: 10px; background: #f59e0b; color: white; padding: 2px 8px; border-radius: 30px; font-weight: 700;">⭐</span>' : ''}
                    </div>
                    
                    <!-- LINHA 2: Configurações em GRID -->
                    <div style="margin-top: 8px; display: grid; grid-template-columns: auto 1fr auto 1fr auto; gap: 6px 10px; align-items: center; padding-left: 30px;">
                        
                        <!-- DESTAQUE - SWITCH -->
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b;">⭐</span>
                        <label class="switch-destaque" style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;">
                            <input type="checkbox" class="checkbox-destaque" data-id="${bolao.id}" ${isDestaque ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="slider-destaque" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: ${isDestaque ? '#f59e0b' : '#cbd5e1'}; transition: 0.3s; border-radius: 30px;">
                                <span class="thumb" style="position: absolute; height: 18px; width: 18px; left: ${isDestaque ? '23px' : '3px'}; bottom: 3px; background: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; font-size: 10px;">
                                    ${isDestaque ? '⭐' : ''}
                                </span>
                            </span>
                        </label>
                        <span id="destaque-label-${bolao.id}" style="font-size: 11px; font-weight: 600; color: ${isDestaque ? '#f59e0b' : '#94a3b8'}; min-width: 35px;">${isDestaque ? 'ON' : 'OFF'}</span>
                        
                        <!-- STATUS -->
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b;">Status</span>
                        <select class="status-select" data-id="${bolao.id}" style="padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;">
                            <option value="aberto" ${status === 'aberto' ? 'selected' : ''}>🟢 ABERTO</option>
                            <option value="andamento" ${status === 'andamento' ? 'selected' : ''}>🟡 ANDAMENTO</option>
                            <option value="encerrado" ${status === 'encerrado' ? 'selected' : ''}>🔴 ENCERRADO</option>
                        </select>
                    </div>
                    
                    <!-- LINHA 3: Data + Estratégia -->
                    <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-left: 30px;">
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b;">📅</span>
                        <input type="date" class="data-limite-input" data-id="${bolao.id}" value="${dataLimiteMap[bolao.id] || ''}" style="padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; max-width: 140px;">
                        
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b; margin-left: 4px;">📝</span>
                        <input type="text" class="estrategia-textarea" data-id="${bolao.id}" value="${estrategiaMap[bolao.id] || ''}" style="flex: 1; min-width: 120px; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;" placeholder="Estratégia...">
                    </div>
                    
                    <!-- LINHA 4: Botões (Final do card) -->
                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                        <button class="btn-link-participantes" data-id="${bolao.id}" data-titulo="${escapeHtml(bolao.titulo)}" style="background: #0071e3; color: white; border: none; padding: 4px 14px; border-radius: 20px; cursor: pointer; font-size: 11px; font-weight: 600;">📋 LINK</button>
                        <button class="btn-excluir-bolao" data-id="${bolao.id}" data-titulo="${escapeHtml(bolao.titulo)}" style="background: #ef4444; color: white; border: none; padding: 4px 14px; border-radius: 20px; cursor: pointer; font-size: 11px; font-weight: 600;">🗑️ EXCLUIR</button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // EVENTOS
        document.querySelectorAll('.checkbox-destaque').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const id = this.dataset.id;
                const isChecked = this.checked;
                
                const switchContainer = this.closest('.switch-destaque');
                if (switchContainer) {
                    const slider = switchContainer.querySelector('.slider-destaque');
                    const thumb = slider ? slider.querySelector('.thumb') : null;
                    const label = document.getElementById(`destaque-label-${id}`);
                    const card = this.closest('div[style*="border-left"]');
                    
                    if (isChecked) {
                        if (slider) slider.style.background = '#f59e0b';
                        if (thumb) {
                            thumb.style.left = '23px';
                            thumb.textContent = '⭐';
                        }
                        if (label) {
                            label.textContent = 'ON';
                            label.style.color = '#f59e0b';
                        }
                        if (card) {
                            card.style.background = '#fef3c7';
                            const titleDiv = card.querySelector('div:first-child');
                            const oldBadge = card.querySelector('.badge-destaque');
                            if (oldBadge) oldBadge.remove();
                            if (titleDiv) {
                                const badge = document.createElement('span');
                                badge.className = 'badge-destaque';
                                badge.style.cssText = 'font-size: 10px; background: #f59e0b; color: white; padding: 2px 8px; border-radius: 30px; font-weight: 700; margin-left: 4px;';
                                badge.textContent = '⭐';
                                titleDiv.appendChild(badge);
                            }
                        }
                        const checkboxSelecao = document.querySelector(`.checkbox-bolao[data-id="${id}"]`);
                        if (checkboxSelecao && !checkboxSelecao.checked) {
                            checkboxSelecao.checked = true;
                        }
                    } else {
                        if (slider) slider.style.background = '#cbd5e1';
                        if (thumb) {
                            thumb.style.left = '3px';
                            thumb.textContent = '';
                        }
                        if (label) {
                            label.textContent = 'OFF';
                            label.style.color = '#94a3b8';
                        }
                        if (card) {
                            card.style.background = 'white';
                            const badge = card.querySelector('.badge-destaque');
                            if (badge) badge.remove();
                        }
                    }
                }
                setTimeout(() => salvarConfigBoloes(), 100);
            });
        });
        
        document.querySelectorAll('.checkbox-bolao').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const id = this.dataset.id;
                const isChecked = this.checked;
                const destaqueCheck = document.querySelector(`.checkbox-destaque[data-id="${id}"]`);
                if (!isChecked && destaqueCheck && destaqueCheck.checked) {
                    destaqueCheck.checked = false;
                    destaqueCheck.dispatchEvent(new Event('change'));
                }
                setTimeout(() => salvarConfigBoloes(), 100);
            });
        });
        
        document.querySelectorAll('.status-select, .data-limite-input, .estrategia-textarea').forEach(el => {
            el.addEventListener('change', () => {
                setTimeout(() => salvarConfigBoloes(), 100);
            });
        });
        
        document.querySelectorAll('.btn-excluir-bolao').forEach(btn => {
            btn.onclick = () => {
                const bolaoId = btn.dataset.id;
                const bolaoTitulo = btn.dataset.titulo;
                excluirBolao(bolaoId, bolaoTitulo);
            };
        });
        
        console.log(`✅ ${boloes.length} bolões carregados`);
        adicionarBotaoLinkParticipantes();

    } catch (error) {
        console.error('Erro ao carregar bolões:', error);
        container.innerHTML = '<div class="empty-state">Erro ao carregar bolões.</div>';
    }
}

// ============================================
// VERIFICAR DUPLICADOS
// ============================================
async function verificarDuplicados() {
    const concurso = document.getElementById('filtroConcursoLista').value;
    const container = document.getElementById('duplicadosResultado');
    
    if (!concurso || concurso === 'todos') {
        showToast('⚠️ Selecione um concurso específico!', 'warning');
        return;
    }
    
    showLoading('Verificando cartões do concurso ' + concurso + '...');
    
    try {
        const snapshot = await db.collection('cartoes').where('concurso', '==', concurso).get();
        
        if (snapshot.size === 0) {
            hideLoading();
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#10b981;"><div style="font-size:32px;">✅</div><div style="font-weight:600;margin-top:8px;">Nenhum cartão encontrado para o concurso ' + concurso + '</div></div>';
            container.style.display = 'block';
            return;
        }
        
        const numerosMap = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const numerosStr = data.numeros.slice().sort((a,b) => a-b).join('|');
            const numerosDisplay = data.numeros.slice().sort((a,b) => a-b).join(', ');
            if (!numerosMap[numerosStr]) numerosMap[numerosStr] = [];
            numerosMap[numerosStr].push({
                id: doc.id,
                bolao: data.bolao || 'Sem Bolão',
                numeros: data.numeros,
                numerosDisplay: numerosDisplay,
                tipoParticipacao: data.tipoParticipacao || 'exclusivo',
                dataCadastro: data.dataCadastro || new Date(0).toISOString()
            });
        });
        
        const duplicados = {};
        let totalDuplicados = 0;
        Object.keys(numerosMap).forEach(key => {
            if (numerosMap[key].length > 1) {
                duplicados[key] = numerosMap[key];
                totalDuplicados += numerosMap[key].length;
            }
        });
        
        const gruposDuplicados = Object.keys(duplicados).length;
        
        if (gruposDuplicados === 0) {
            hideLoading();
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#10b981;"><div style="font-size:32px;">✅</div><div style="font-weight:600;margin-top:8px;">Nenhum cartão duplicado encontrado!</div></div>';
            container.style.display = 'block';
            return;
        }
        
        cartoesDuplicadosSelecionados = {};
        
        let html = `
            <div style="background:#fef3c7;padding:15px 20px;border-radius:12px;margin-bottom:16px;border-left:4px solid #f59e0b;">
                <div style="font-weight:700;color:#92400e;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:15px;">
                    <span>⚠️ ${gruposDuplicados} grupo(s) de cartões duplicados</span>
                    <span>📊 ${snapshot.size} cartões | 🔁 ${totalDuplicados} duplicados</span>
                </div>
                <div style="font-size:13px;color:#78350f;margin-top:6px;">
                    💡 <strong>Clique no cartão</strong> que deseja manter. O selecionado fica <strong style="color:#0071e3;">AZUL</strong>.
                </div>
            </div>
            <div style="max-height:450px;overflow-y:auto;margin-bottom:16px;">
        `;
        
        let grupoIndex = 0;
        for (const [numerosStr, cartoes] of Object.entries(duplicados)) {
            grupoIndex++;
            const grupoId = 'grupo-' + grupoIndex;
            
            html += `
                <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:14px;border:2px solid #e2e8f0;">
                    <div style="font-weight:700;color:#1e293b;margin-bottom:12px;font-size:14px;">
                        🎯 Grupo ${grupoIndex} - Números: 
                        <span style="font-family:monospace;background:#e2e8f0;padding:3px 12px;border-radius:6px;font-size:14px;">
                            ${cartoes[0].numerosDisplay}
                        </span>
                        <span style="font-size:12px;color:#64748b;font-weight:normal;margin-left:8px;">
                            (${cartoes.length} cartões)
                        </span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            `;
            
            cartoes.forEach((cartao, idx) => {
                const isFirst = idx === 0;
                const dataCadastro = cartao.dataCadastro ? new Date(cartao.dataCadastro).toLocaleDateString('pt-BR') : '---';
                const tipoLabel = cartao.tipoParticipacao === 'cota' ? '🎟️ Cota' : '👥 Exclusivo';
                const cartaoId = cartao.id;
                
                html += `
                    <div class="duplicado-item" 
                         data-grupo="${grupoId}" 
                         data-id="${cartaoId}"
                         style="
                             background: ${isFirst ? '#0071e3' : '#ffffff'};
                             border: 3px solid ${isFirst ? '#1d4ed8' : '#e2e8f0'};
                             border-radius: 10px;
                             padding: 14px 16px;
                             cursor: pointer;
                             transition: all 0.2s;
                             box-shadow: ${isFirst ? '0 4px 12px rgba(0,113,227,0.3)' : 'none'};
                         "
                         onclick="selecionarDuplicado('${grupoId}', '${cartaoId}')"
                         onmouseover="this.style.transform='scale(1.02)'"
                         onmouseout="this.style.transform='scale(1)'"
                    >
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                            <span style="font-weight:700;color:${isFirst ? '#ffffff' : '#1e293b'};font-size:15px;">
                                #${idx + 1}
                            </span>
                            ${isFirst ? '<span style="background:#ffffff;color:#1d4ed8;padding:2px 14px;border-radius:30px;font-size:12px;font-weight:700;">✅ SELECIONADO</span>' : ''}
                            <span style="font-size:11px;color:${isFirst ? '#bfdbfe' : '#64748b'};margin-left:auto;">
                                ID: ${cartaoId.slice(0,8)}
                            </span>
                        </div>
                        <div style="font-size:12px;color:${isFirst ? '#bfdbfe' : '#475569'};padding-left:4px;">
                            📌 ${cartao.bolao} | ${tipoLabel} | 📅 ${dataCadastro}
                        </div>
                        ${isFirst ? '<div style="font-size:11px;color:#93c5fd;margin-top:4px;padding-left:4px;">🔹 Este cartão será mantido</div>' : '<div style="font-size:11px;color:#94a3b8;margin-top:4px;padding-left:4px;">🔸 Clique para manter este</div>'}
                    </div>
                `;
                
                if (isFirst) {
                    cartoesDuplicadosSelecionados[grupoId] = cartaoId;
                }
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Calcular total para excluir
        let totalParaExcluir = 0;
        for (const [key, cartoes] of Object.entries(duplicados)) {
            totalParaExcluir += cartoes.length - 1;
        }
        
        html += `
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;padding-top:12px;border-top:2px solid #e2e8f0;">
                <button id="btnExcluirDuplicados" class="btn btn-danger" style="flex:1;min-width:180px;padding:14px;font-size:16px;font-weight:700;">
                    🗑️ EXCLUIR DUPLICADOS (${totalParaExcluir} cartões)
                </button>
                <button id="btnFecharDuplicados" class="btn btn-secondary" style="flex:1;min-width:120px;padding:14px;font-size:14px;">
                    FECHAR
                </button>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
        hideLoading();
        
        // Evento: Excluir duplicados
        document.getElementById('btnExcluirDuplicados').addEventListener('click', function() {
            const idsManter = Object.values(cartoesDuplicadosSelecionados);
            const idsParaExcluir = [];
            
            const todosIds = [];
            for (const [numerosStr, cartoes] of Object.entries(duplicados)) {
                cartoes.forEach(c => todosIds.push(c.id));
            }
            
            idsParaExcluir.push(...todosIds.filter(id => !idsManter.includes(id)));
            
            if (idsParaExcluir.length === 0) {
                showToast('⚠️ Nenhum cartão para excluir', 'warning');
                return;
            }
            
            if (!confirm(
                '⚠️ ATENÇÃO!\n\n' +
                'Você está prestes a excluir ' + idsParaExcluir.length + ' cartões duplicados.\n\n' +
                idsManter.length + ' cartões serão mantidos.\n\n' +
                'Esta ação NÃO pode ser desfeita!\n\n' +
                'Deseja continuar?'
            )) {
                return;
            }
            
            showLoading('Excluindo ' + idsParaExcluir.length + ' cartões...');
            
            let excluidos = 0;
            let erros = 0;
            
            idsParaExcluir.forEach(id => {
                db.collection('cartoes').doc(id).delete()
                    .then(() => {
                        excluidos++;
                        console.log('✅ ' + id + ' excluído');
                        if (excluidos + erros === idsParaExcluir.length) {
                            hideLoading();
                            showToast('✅ ' + excluidos + ' cartões duplicados excluídos com sucesso!', 'success');
                            container.style.display = 'none';
                            carregarDadosAdmin();
                        }
                    })
                    .catch(err => {
                        erros++;
                        console.error('❌ Erro ao excluir ' + id + ':', err);
                        if (excluidos + erros === idsParaExcluir.length) {
                            hideLoading();
                            showToast('✅ ' + excluidos + ' excluídos, ⚠️ ' + erros + ' erros', 'warning');
                        }
                    });
            });
        });
        
        // Evento: Fechar
        document.getElementById('btnFecharDuplicados').addEventListener('click', function() {
            container.style.display = 'none';
        });
        
    } catch (error) {
        console.error('Erro:', error);
        hideLoading();
        showToast('❌ Erro ao verificar duplicados: ' + error.message, 'error');
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444;"><div style="font-size:32px;">❌</div><div style="font-weight:600;margin-top:8px;">Erro ao verificar duplicados</div><div style="font-size:13px;color:#64748b;margin-top:4px;">' + error.message + '</div></div>';
        container.style.display = 'block';
    }
}

// ============================================
// FUNÇÃO PARA SELECIONAR DUPLICADO (GLOBAL)
// ============================================
function selecionarDuplicado(grupoId, cartaoId) {
    cartoesDuplicadosSelecionados[grupoId] = cartaoId;
    
    const items = document.querySelectorAll(`.duplicado-item[data-grupo="${grupoId}"]`);
    items.forEach(item => {
        const id = item.dataset.id;
        const isSelected = id === cartaoId;
        
        item.style.background = isSelected ? '#0071e3' : '#ffffff';
        item.style.borderColor = isSelected ? '#1d4ed8' : '#e2e8f0';
        item.style.boxShadow = isSelected ? '0 4px 12px rgba(0,113,227,0.3)' : 'none';
        
        const textSpans = item.querySelectorAll('span');
        textSpans.forEach(span => {
            if (span.style.color !== '') {
                span.style.color = isSelected ? '#ffffff' : '#1e293b';
            }
        });
        
        const allBadges = item.querySelectorAll('span[style*="background:#ffffff"]');
        allBadges.forEach(b => {
            if (b.textContent.includes('SELECIONADO')) b.remove();
        });
        
        if (isSelected) {
            if (!item.querySelector('span:contains("SELECIONADO")')) {
                const firstDiv = item.querySelector('div:first-child');
                if (firstDiv) {
                    const newBadge = document.createElement('span');
                    newBadge.style.cssText = 'background:#ffffff;color:#1d4ed8;padding:2px 14px;border-radius:30px;font-size:12px;font-weight:700;';
                    newBadge.textContent = '✅ SELECIONADO';
                    firstDiv.appendChild(newBadge);
                }
            }
            const infoDivs = item.querySelectorAll('div[style*="font-size:11px"]');
            infoDivs.forEach(div => {
                if (div.textContent.includes('mantido') || div.textContent.includes('Clique para manter')) {
                    div.textContent = '🔹 Este cartão será MANTIDO';
                    div.style.color = '#93c5fd';
                }
            });
        } else {
            const badgeToRemove = item.querySelector('span:contains("SELECIONADO")');
            if (badgeToRemove) badgeToRemove.remove();
            
            const infoDivs = item.querySelectorAll('div[style*="font-size:11px"]');
            infoDivs.forEach(div => {
                if (div.textContent.includes('mantido') || div.textContent.includes('Clique para manter')) {
                    div.textContent = '🔸 Clique para manter este';
                    div.style.color = '#94a3b8';
                }
            });
        }
    });
    
    const btnExcluir = document.getElementById('btnExcluirDuplicados');
    if (btnExcluir) {
        const todosItems = document.querySelectorAll('.duplicado-item');
        const idsManter = Object.values(cartoesDuplicadosSelecionados);
        const idsTodos = Array.from(todosItems).map(el => el.dataset.id);
        const idsParaExcluir = idsTodos.filter(id => !idsManter.includes(id));
        btnExcluir.textContent = '🗑️ EXCLUIR DUPLICADOS (' + idsParaExcluir.length + ' cartões)';
    }
}

// ============================================
// ADICIONAR CARTÕES (CADASTRO TRADICIONAL)
// ============================================
// ============================================
// EDIÇÃO CARTÃO
// ============================================
async function editarCartao(id) {
    console.log('📝 Abrindo edição do cartão:', id);
    
    try {
        const doc = await db.collection('cartoes').doc(id).get();
        if (!doc.exists) {
            showToast('❌ Cartão não encontrado', 'error');
            return;
        }
        
        const cartao = doc.data();
        const loteria = cartao.tipo || 'mega';
        
        const regras = {
            mega: { min: 6, max: 60, label: 'MEGA-SENA' },
            lotofacil: { min: 15, max: 25, label: 'LOTOFÁCIL' },
            quina: { min: 5, max: 80, label: 'QUINA' }
        };
        
        const regra = regras[loteria] || regras.mega;
        
        let modal = document.getElementById('modalEditarCartao');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'modalEditarCartao';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
            padding: 20px;
        `;
        
        const numerosAtuais = (cartao.numeros || []).join(' ');
        const concursoAtual = cartao.concurso || '';
        const bolaoAtual = cartao.bolao || '';
        const tipoAtual = cartao.tipoParticipacao || 'exclusivo';
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; max-width: 500px; width: 100%; padding: 25px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 18px;">✏️ EDITAR CARTÃO</h3>
                    <button id="fecharModalEditar" style="background: none; border: none; font-size: 24px; cursor: pointer; padding: 0 10px;">✕</button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: #1e293b;">🎯 LOTERIA</label>
                    <select id="editarLoteria" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc;">
                        <option value="mega" ${loteria === 'mega' ? 'selected' : ''}>MEGA-SENA</option>
                        <option value="lotofacil" ${loteria === 'lotofacil' ? 'selected' : ''}>LOTOFÁCIL</option>
                        <option value="quina" ${loteria === 'quina' ? 'selected' : ''}>QUINA</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: #1e293b;">📌 CONCURSO</label>
                    <input type="number" id="editarConcurso" value="${concursoAtual}" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 14px;" placeholder="Ex: 2700">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: #1e293b;">👥 BOLÃO</label>
                    <input type="text" id="editarBolao" value="${bolaoAtual}" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 14px;" placeholder="Ex: Quina de São João 2026">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: #1e293b;">🔢 NÚMEROS</label>
                    <input type="text" id="editarNumeros" value="${numerosAtuais}" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 14px;" placeholder="Ex: 12 15 23 34 45 56">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: #1e293b;">🎟️ TIPO DE PARTICIPAÇÃO</label>
                    <select id="editarTipoParticipacao" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc;">
                        <option value="exclusivo" ${tipoAtual === 'exclusivo' ? 'selected' : ''}>👥 Grupo Exclusivo</option>
                        <option value="cota" ${tipoAtual === 'cota' ? 'selected' : ''}>🎟️ Cota de Bolão</option>
                    </select>
                </div>
                
                <button id="salvarEdicao" style="width: 100%; padding: 14px; background: #0071e3; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer;">
                    💾 SALVAR ALTERAÇÕES
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('fecharModalEditar').addEventListener('click', function() {
            modal.remove();
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.getElementById('editarLoteria').addEventListener('change', function() {
            const loteriaSelecionada = this.value;
            const regraAtual = regras[loteriaSelecionada] || regras.mega;
            const dica = document.querySelector('#modalEditarCartao .form-group small');
            if (dica) {
                dica.textContent = `💡 ${regraAtual.label}: mínimo ${regraAtual.min} números (1-${regraAtual.max})`;
            }
        });
        
        document.getElementById('salvarEdicao').addEventListener('click', async function() {
            const novaLoteria = document.getElementById('editarLoteria').value;
            const novoConcurso = document.getElementById('editarConcurso').value.trim();
            const novoBolao = document.getElementById('editarBolao').value.trim() || 'Sem Bolão';
            const numerosTexto = document.getElementById('editarNumeros').value.trim();
            const novoTipo = document.getElementById('editarTipoParticipacao').value;
            
            if (!novoConcurso) {
                showToast('⚠️ Informe o concurso!', 'warning');
                return;
            }
            
            if (!numerosTexto) {
                showToast('⚠️ Informe os números!', 'warning');
                return;
            }
            
            const numeros = numerosTexto.match(/\d+/g).map(Number);
            const regraAtual = regras[novaLoteria] || regras.mega;
            
            if (numeros.length < regraAtual.min) {
                showToast(`❌ ${regraAtual.label}: mínimo ${regraAtual.min} números!`, 'error');
                return;
            }
            
            if (numeros.some(n => n < 1 || n > regraAtual.max)) {
                showToast(`❌ Números devem estar entre 1 e ${regraAtual.max}!`, 'error');
                return;
            }
            
            const numerosUnicos = [...new Set(numeros)];
            if (numerosUnicos.length !== numeros.length) {
                showToast('❌ Números duplicados! Remova repetidos.', 'error');
                return;
            }
            
            numeros.sort((a, b) => a - b);
            
            try {
                await db.collection('cartoes').doc(id).update({
                    tipo: novaLoteria,
                    concurso: novoConcurso,
                    bolao: novoBolao,
                    numeros: numeros,
                    totalNumeros: numeros.length,
                    tipoParticipacao: novoTipo,
                    admin: true,
                    dataAtualizacao: new Date().toISOString()
                });
                
                showToast('✅ Cartão atualizado com sucesso!', 'success');
                modal.remove();
                carregarDadosAdmin();
                
            } catch (error) {
                console.error('Erro ao atualizar:', error);
                showToast('❌ Erro ao atualizar cartão: ' + error.message, 'error');
            }
        });
        
    } catch (error) {
        console.error('Erro ao abrir edição:', error);
        showToast('❌ Erro ao carregar cartão para edição', 'error');
    }
}

// ============================================
// EXCLUIR CARTÕES SELECIONADOS
// ============================================
async function excluirSelecionados() {
    const selecionados = document.querySelectorAll('.checkbox-cartao:checked');
    
    if (selecionados.length === 0) {
        showToast('⚠️ Selecione pelo menos um cartão para excluir', 'warning');
        return;
    }
    
    const mensagemConfirmacao = 
        `⚠️ ATENÇÃO! ⚠️\n\n` +
        `Você está prestes a excluir ${selecionados.length} cartão(ões).\n\n` +
        `Esta ação NÃO pode ser desfeita!\n\n` +
        `Deseja continuar?`;
    
    if (!confirm(mensagemConfirmacao)) {
        showToast('❌ Exclusão cancelada', 'info');
        return;
    }
    
    showLoading(`Excluindo ${selecionados.length} cartão(ões)...`);
    
    let excluidos = 0;
    let erros = 0;
    const idsExcluidos = [];
    
    for (const cb of selecionados) {
        const id = cb.dataset.id;
        try {
            await db.collection('cartoes').doc(id).delete();
            excluidos++;
            idsExcluidos.push(id);
        } catch (error) {
            erros++;
        }
    }
    
    hideLoading();
    
    if (excluidos > 0) {
        showToast(`✅ ${excluidos} cartão(ões) excluído(s)! ${erros > 0 ? `⚠️ ${erros} erro(s)` : ''}`, 'success');
        cartoes = cartoes.filter(c => !idsExcluidos.includes(c.id));
        await carregarDadosAdmin();
        const totalDiv = document.getElementById('totalCartoes');
        if (totalDiv) {
            const total = cartoes.filter(c => c.tipo === loteriaAdmin).length;
            totalDiv.innerHTML = total + ' cartões';
        }
        atualizarContadorSelecionados();
    } else {
        showToast('❌ Nenhum cartão foi excluído', 'error');
    }
}

function atualizarContadorSelecionados() {
    const qtd = document.querySelectorAll('.checkbox-cartao:checked').length;
    const btnExcluir = document.getElementById('btnExcluirSelecionados');
    if (btnExcluir) {
        btnExcluir.innerHTML = qtd > 0 ? `🗑️ EXCLUIR (${qtd})` : '🗑️ EXCLUIR';
        btnExcluir.style.background = qtd > 0 ? '#ef4444' : '#64748b';
    }
    const btnAlterar = document.getElementById('btnAlterarTipo');
    if (btnAlterar) {
        btnAlterar.innerHTML = qtd > 0 ? `🔄 ALTERAR TIPO (${qtd})` : '🔄 ALTERAR TIPO';
    }
}

// ============================================
// ALTERAR TIPO DE PARTICIPAÇÃO EM LOTE
// ============================================
function abrirModalAlterarTipo() {
    const selecionados = document.querySelectorAll('.checkbox-cartao:checked');
    if (selecionados.length === 0) {
        showToast('⚠️ Selecione pelo menos um cartão para alterar', 'warning');
        return;
    }

    let modal = document.getElementById('modalAlterarTipo');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'modalAlterarTipo';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; max-width: 380px; width: 100%; padding: 25px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">🔄</div>
            <div style="font-weight: bold; font-size: 18px; margin-bottom: 4px;">ALTERAR TIPO</div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 20px;">${selecionados.length} cartão(ões) selecionado(s) — escolha o novo tipo:</div>
            <button id="btnTipoExclusivo" style="width:100%; padding: 14px; background: #0071e3; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 15px; cursor: pointer; margin-bottom: 10px;">👥 GRUPO EXCLUSIVO</button>
            <button id="btnTipoCota" style="width:100%; padding: 14px; background: #8b5cf6; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 15px; cursor: pointer; margin-bottom: 10px;">🎟️ COTA DE BOLÃO</button>
            <button id="btnCancelarAlterarTipo" style="width:100%; padding: 10px; background: transparent; color: #64748b; border: none; font-size: 13px; cursor: pointer;">Cancelar</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btnTipoExclusivo').onclick = () => aplicarAlteracaoTipo('exclusivo');
    document.getElementById('btnTipoCota').onclick = () => aplicarAlteracaoTipo('cota');
    document.getElementById('btnCancelarAlterarTipo').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function aplicarAlteracaoTipo(novoTipo) {
    const modal = document.getElementById('modalAlterarTipo');
    if (modal) modal.remove();

    const selecionados = document.querySelectorAll('.checkbox-cartao:checked');
    if (selecionados.length === 0) return;

    showLoading(`Alterando ${selecionados.length} cartão(ões)...`);

    let atualizados = 0;
    let erros = 0;
    for (const cb of selecionados) {
        const id = cb.dataset.id;
        try {
            await db.collection('cartoes').doc(id).update({
                tipoParticipacao: novoTipo,
                admin: true,
                dataAtualizacao: new Date().toISOString()
            });
            atualizados++;
        } catch (error) {
            erros++;
        }
    }

    hideLoading();

    if (atualizados > 0) {
        const label = novoTipo === 'cota' ? 'Cota de Bolão' : 'Grupo Exclusivo';
        showToast(`✅ ${atualizados} cartão(ões) alterado(s) para ${label}!${erros > 0 ? ` ⚠️ ${erros} erro(s)` : ''}`, 'success');
        await carregarDadosAdmin();
    } else {
        showToast('❌ Nenhum cartão foi alterado', 'error');
    }
}

// ============================================
// EXPORTAR CARTÕES
// ============================================
async function exportarCartoes() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    if (cartoesFiltrados.length === 0) { showToast('⚠️ Nenhum cartão', 'warning'); return; }
    const dados = [['ID', 'Concurso', 'Bolão', 'Números', 'Quantidade', 'Data']];
    for (const cartao of cartoesFiltrados) {
        dados.push([
            cartao.id.slice(-6), 
            cartao.concurso, 
            cartao.bolao || 'Sem Bolão', 
            (cartao.numeros || []).join(' - '), 
            (cartao.numeros || []).length, 
            cartao.dataCadastro ? new Date(cartao.dataCadastro).toLocaleDateString('pt-BR') : ''
        ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Cartoes_${loteriaAdmin === 'mega' ? 'Mega' : loteriaAdmin === 'lotofacil' ? 'Lotofacil' : 'Quina'}`);
    XLSX.writeFile(wb, `boloes_aleatorios_${loteriaAdmin}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`);
    showToast(`📊 ${cartoesFiltrados.length} cartões exportados!`, 'success');
}

// ============================================
// IMPORTAR EXCEL
// ============================================
// ============================================
// GERAR LINKS DOS PARTICIPANTES
// ============================================
function gerarLinkParticipantes(bolaoId) {
    const baseUrl = window.location.origin + '/mega-sena-sistema/participantes.html';
    return `${baseUrl}?bolao=${bolaoId}`;
}

function mostrarModalLink(bolaoId, bolaoTitulo) {
    const link = gerarLinkParticipantes(bolaoId);
    
    let modal = document.getElementById('modalLinkParticipantes');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'modalLinkParticipantes';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; max-width: 450px; width: 100%; padding: 25px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 10px;">📋</div>
            <div style="font-weight: bold; font-size: 18px; margin-bottom: 4px;">LINK DO BOLÃO</div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 15px;">${bolaoTitulo}</div>
            <div style="background: #f1f5f9; padding: 12px; border-radius: 10px; margin-bottom: 16px; word-break: break-all;">
                <code style="font-size: 12px; color: #1e293b;">${link}</code>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btnCopiarLink" style="flex: 1; padding: 12px; background: #0071e3; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;">📋 COPIAR LINK</button>
                <button id="btnFecharModalLink" style="flex: 1; padding: 12px; background: #64748b; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;">FECHAR</button>
            </div>
            <div id="feedbackCopiar" style="display: none; margin-top: 10px; padding: 8px; background: #d1fae5; border-radius: 8px; color: #065f46; font-size: 13px;">✅ Link copiado com sucesso!</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btnCopiarLink').onclick = async function() {
        try {
            await navigator.clipboard.writeText(link);
            const feedback = document.getElementById('feedbackCopiar');
            feedback.style.display = 'block';
            feedback.textContent = '✅ Link copiado com sucesso!';
            this.style.background = '#10b981';
            this.textContent = '✅ COPIADO!';
            setTimeout(() => {
                this.style.background = '#0071e3';
                this.textContent = '📋 COPIAR LINK';
                feedback.style.display = 'none';
            }, 3000);
            showToast('📋 Link copiado! Compartilhe no WhatsApp', 'success');
        } catch (error) {
            const codeElement = document.querySelector('#modalLinkParticipantes code');
            if (codeElement) {
                const range = document.createRange();
                range.selectNode(codeElement);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                try {
                    document.execCommand('copy');
                    showToast('📋 Link copiado!', 'success');
                } catch (e) {
                    showToast('❌ Não foi possível copiar. Copie manualmente.', 'error');
                }
            }
        }
    };
    
    document.getElementById('btnFecharModalLink').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function adicionarBotaoLinkParticipantes() {
    document.querySelectorAll('.btn-link-participantes').forEach(btn => {
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);
        novoBtn.addEventListener('click', function() {
            const bolaoId = this.dataset.id;
            const bolaoTitulo = this.dataset.titulo || 'Bolão';
            mostrarModalLink(bolaoId, bolaoTitulo);
        });
    });
}

// ============================================
// FUNÇÕES DO CADASTRO EM LOTE
// ============================================
function inicializarGradeNumeros() {
    const grade = document.getElementById('gradeNumeros');
    if (!grade) return;
    
    grade.innerHTML = '';
    for (let i = 1; i <= TOTAL_NUMEROS; i++) {
        const btn = document.createElement('button');
        btn.className = 'numero-btn';
        btn.dataset.numero = i;
        btn.textContent = i.toString().padStart(2, '0');
        btn.onclick = () => toggleNumero(i);
        grade.appendChild(btn);
    }
}

function toggleNumero(numero) {
    const cartao = cartoesLote[cartaoAtualIndex];
    if (!cartao) return;
    
    const index = cartao.indexOf(numero);
    if (index > -1) {
        cartao.splice(index, 1);
    } else {
        if (cartao.length >= MAX_NUMEROS_LOTOFACIL) {
            showToast(`⚠️ Máximo de ${MAX_NUMEROS_LOTOFACIL} números!`, 'warning');
            return;
        }
        cartao.push(numero);
        cartao.sort((a, b) => a - b);
    }
    
    atualizarGradeVisual();
    atualizarContador();
    atualizarPrevia();
    atualizarResumo();
}

function atualizarGradeVisual() {
    const cartao = cartoesLote[cartaoAtualIndex] || [];
    // Escopado a #gradeNumeros — antes pegava TODO .numero-btn da página,
    // incluindo a grade do "Modo Seleção" (outro fluxo, outro estado),
    // repintando os botões dela por engano quando os dois cards estavam
    // na tela ao mesmo tempo.
    const botoes = document.querySelectorAll('#gradeNumeros .numero-btn');
    botoes.forEach(btn => {
        const num = parseInt(btn.dataset.numero);
        if (cartao.includes(num)) {
            btn.classList.add('selecionado');
            btn.style.background = '#0071e3';
            btn.style.color = 'white';
            btn.style.borderColor = '#0071e3';
            btn.style.transform = 'scale(1.05)';
        } else {
            btn.classList.remove('selecionado');
            btn.style.background = '#f8fafc';
            btn.style.color = '#1e293b';
            btn.style.borderColor = '#e2e8f0';
            btn.style.transform = 'scale(1)';
        }
    });
}

function atualizarContador() {
    const cartao = cartoesLote[cartaoAtualIndex] || [];
    const contador = document.getElementById('contadorNumeros');
    if (contador) {
        contador.textContent = `${cartao.length}/${MAX_NUMEROS_LOTOFACIL} números selecionados`;
        contador.style.color = cartao.length === MAX_NUMEROS_LOTOFACIL ? '#10b981' : '#0071e3';
    }
}

function atualizarPrevia() {
    const container = document.getElementById('previaCartoes');
    if (!container) return;
    
    if (cartoesLote.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8;">Nenhum cartão cadastrado ainda</div>';
        return;
    }
    
    // Antes era uma string crua "01 02 03..." em texto colorido — difícil
    // de bater o olho e ver se os números fazem sentido. Vira a mesma
    // bolinha (.numero-cartao-badge) da lista principal de cartões, só
    // que na variante compacta (-sm), porque aqui são várias linhas de
    // uma vez (até 20 cartões na prévia).
    let html = '';
    const maxExibir = Math.min(cartoesLote.length, 20);
    for (let i = 0; i < maxExibir; i++) {
        const numeros = cartoesLote[i] || [];
        const preenchido = numeros.length === MAX_NUMEROS_LOTOFACIL;
        const status = preenchido ? '✅' : '❌';
        const badgesHtml = numeros
            .map(n => `<span class="numero-cartao-badge numero-cartao-badge-sm">${n.toString().padStart(2, '0')}</span>`)
            .join('');
        html += `
            <div class="cartao-preview-lote">
                <span class="cartao-preview-lote-label">#${i + 1}</span>
                <span class="numeros-cartao-lista">${badgesHtml || '<em style="color:#94a3b8; font-size:12px;">(vazio)</em>'}</span>
                <span class="cartao-preview-lote-status">${status}</span>
            </div>`;
    }
    if (cartoesLote.length > maxExibir) {
        html += `<div style="color: #94a3b8;">... e mais ${cartoesLote.length - maxExibir} cartões</div>`;
    }
    container.innerHTML = html;
}

// ============================================
// PREENCHER O CARTÃO ATUAL DO LOTE POR TEXTO
// ============================================
function preencherCartaoLotePorTexto() {
    const input = document.getElementById('numerosTextoLote');
    if (!input) return;

    const { numeros, erro } = parseNumerosTexto(input.value, {
        minNumeros: MAX_NUMEROS_LOTOFACIL, maxNumeros: MAX_NUMEROS_LOTOFACIL,
        maxValor: TOTAL_NUMEROS, label: 'LOTOFÁCIL'
    });
    if (erro) { showToast('❌ ' + erro, 'error'); return; }

    cartoesLote[cartaoAtualIndex] = numeros;
    atualizarGradeVisual();
    atualizarContador();
    atualizarPrevia();
    atualizarResumo();
    input.value = '';
    showToast(`✅ Cartão #${cartaoAtualIndex + 1} preenchido`, 'success');
}

// ============================================
// COLAR VÁRIOS CARTÕES DE UMA VEZ (um por linha) — o maior ganho de tempo:
// substitui clicar cartão por cartão por colar tudo junto (ex.: já
// transcrito de várias imagens do app da Caixa) e revisar na prévia antes
// de gerar. Ajusta "Quantos cartões?" pra bater com quantas linhas vieram.
// ============================================
function preencherLotePorTextoEmMassa() {
    const textarea = document.getElementById('numerosTextoLoteMassa');
    if (!textarea) return;

    const linhas = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);
    if (linhas.length === 0) { showToast('⚠️ Cole pelo menos uma linha de números!', 'warning'); return; }

    const regras = { minNumeros: MAX_NUMEROS_LOTOFACIL, maxNumeros: MAX_NUMEROS_LOTOFACIL, maxValor: TOTAL_NUMEROS, label: 'LOTOFÁCIL' };
    const novosCartoes = [];
    const erros = [];
    linhas.forEach((linha, i) => {
        const { numeros, erro } = parseNumerosTexto(linha, regras);
        if (erro) erros.push(`Linha ${i + 1}: ${erro}`);
        else novosCartoes.push(numeros);
    });

    if (erros.length > 0) {
        showToast(`❌ ${erros.length} linha(s) com erro. Ex.: ${erros[0]}`, 'error');
        return;
    }

    cartoesLote = novosCartoes;
    cartaoAtualIndex = 0;
    const inputQtd = document.getElementById('qtdCartoes');
    if (inputQtd) inputQtd.value = novosCartoes.length;

    atualizarGradeVisual();
    atualizarContador();
    atualizarPrevia();
    atualizarResumo();
    textarea.value = '';
    showToast(`✅ ${novosCartoes.length} cartões preenchidos! Revise a prévia antes de gerar.`, 'success');
}

function atualizarResumo() {
    const qtdCartoes = parseInt(document.getElementById('qtdCartoes').value) || 0;
    const qtdConcursos = parseInt(document.getElementById('qtdConcursos').value) || 0;
    const concursoInicial = parseInt(document.getElementById('concursoInicial').value) || 0;
    
    const preenchidos = cartoesLote.filter(c => c.length === MAX_NUMEROS_LOTOFACIL).length;
    const total = qtdCartoes * qtdConcursos;
    const concursoFinal = concursoInicial + qtdConcursos - 1;
    
    document.getElementById('resumoCartoes').textContent = qtdCartoes;
    document.getElementById('resumoConcursos').textContent = qtdConcursos;
    document.getElementById('resumoTotal').textContent = total.toLocaleString();
    document.getElementById('resumoConcursosRange').textContent = `${concursoInicial} → ${concursoFinal}`;
    document.getElementById('resumoPreenchidos').textContent = `${preenchidos}/${qtdCartoes}`;
    document.getElementById('totalCartoesNumero').textContent = qtdCartoes || 1;
    document.getElementById('totalCartoesNav').textContent = qtdCartoes || 1;
}

function navegarCartao(direcao) {
    const total = parseInt(document.getElementById('qtdCartoes').value) || 1;
    cartaoAtualIndex += direcao;
    if (cartaoAtualIndex < 0) cartaoAtualIndex = total - 1;
    if (cartaoAtualIndex >= total) cartaoAtualIndex = 0;
    
    while (cartoesLote.length < total) {
        cartoesLote.push([]);
    }
    
    document.getElementById('cartaoAtualNumero').textContent = cartaoAtualIndex + 1;
    document.getElementById('cartaoAtualNav').textContent = cartaoAtualIndex + 1;
    
    atualizarGradeVisual();
    atualizarContador();
    atualizarPrevia();
    atualizarResumo();
}

function duplicarCartaoLote() {
    const cartaoAtual = cartoesLote[cartaoAtualIndex] || [];
    if (cartaoAtual.length !== MAX_NUMEROS_LOTOFACIL) {
        showToast('⚠️ Preencha os 15 números antes de duplicar!', 'warning');
        return;
    }
    
    const novaPosicao = cartaoAtualIndex + 1;
    cartoesLote.splice(novaPosicao, 0, [...cartaoAtual]);
    const total = cartoesLote.length;
    document.getElementById('qtdCartoes').value = total;
    cartaoAtualIndex = novaPosicao;
    navegarCartao(0);
    showToast(`✅ Cartão duplicado! Total: ${total} cartões`, 'success');
}

function limparCartaoLote() {
    if (!confirm('Limpar os números deste cartão?')) return;
    cartoesLote[cartaoAtualIndex] = [];
    navegarCartao(0);
    showToast('🧹 Cartão limpo', 'info');
}

async function gerarLote() {
    const bolaoNome = document.getElementById('bolaoNomeLote').value.trim() || 'Bolão em Lote';
    const concursoInicial = parseInt(document.getElementById('concursoInicial').value);
    const qtdConcursos = parseInt(document.getElementById('qtdConcursos').value);
    const qtdCartoes = parseInt(document.getElementById('qtdCartoes').value);
    const tipoParticipacao = document.getElementById('tipoCartaoLote').value;
    
    if (!concursoInicial || concursoInicial < 1) {
        showToast('⚠️ Informe um concurso inicial válido!', 'warning');
        return;
    }
    if (!qtdConcursos || qtdConcursos < 1) {
        showToast('⚠️ Informe a quantidade de concursos!', 'warning');
        return;
    }
    if (!qtdCartoes || qtdCartoes < 1) {
        showToast('⚠️ Informe a quantidade de cartões!', 'warning');
        return;
    }
    
    const vazios = cartoesLote.some(c => c.length !== MAX_NUMEROS_LOTOFACIL);
    if (vazios) {
        showToast(`⚠️ Todos os ${qtdCartoes} cartões devem ter ${MAX_NUMEROS_LOTOFACIL} números!`, 'warning');
        return;
    }
    
    if (cartoesLote.length !== qtdCartoes) {
        showToast(`⚠️ Você tem ${cartoesLote.length} cartões, mas configurou ${qtdCartoes}.`, 'warning');
        return;
    }
    
    const total = qtdCartoes * qtdConcursos;
    const confirmar = confirm(
        `⚠️ CONFIRMAR GERAÇÃO EM LOTE\n\n` +
        `📌 Bolão: ${bolaoNome}\n` +
        `🎯 ${qtdCartoes} cartões × ${qtdConcursos} concursos\n` +
        `📊 Total: ${total.toLocaleString()} cartões\n` +
        `📅 Concurso ${concursoInicial} → ${concursoInicial + qtdConcursos - 1}\n\n` +
        `Esta ação NÃO pode ser desfeita!`
    );
    if (!confirmar) return;
    
    showLoading(`Gerando ${total.toLocaleString()} cartões...`);
    
    let adicionados = 0;
    let erros = 0;
    
    try {
        for (let i = 0; i < qtdCartoes; i++) {
            const numeros = cartoesLote[i];
            for (let c = 0; c < qtdConcursos; c++) {
                const concurso = concursoInicial + c;
                try {
                    await db.collection('cartoes').add({
                        concurso: concurso.toString(),
                        bolao: bolaoNome,
                        numeros: numeros,
                        tipo: 'lotofacil',
                        tipoParticipacao: tipoParticipacao,
                        admin: true,
                        dataCadastro: new Date().toISOString(),
                        totalNumeros: numeros.length
                    });
                    adicionados++;
                } catch (error) {
                    erros++;
                }
            }
        }
        
        if (adicionados > 0) {
            showToast(`✅ ${adicionados.toLocaleString()} cartões gerados! ${erros > 0 ? `⚠️ ${erros} erros` : ''}`, 'success');
            cartoesLote = [];
            cartaoAtualIndex = 0;
            document.getElementById('qtdCartoes').value = 20;
            navegarCartao(0);
            carregarDadosAdmin();
        } else {
            showToast('❌ Nenhum cartão foi gerado', 'error');
        }
    } catch (error) {
        showToast('❌ Erro ao gerar lote: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function limparLote() {
    if (!confirm('⚠️ LIMPAR TODOS OS CARTÕES DO LOTE?\n\nEsta ação NÃO pode ser desfeita!')) return;
    cartoesLote = [];
    cartaoAtualIndex = 0;
    document.getElementById('qtdCartoes').value = 20;
    navegarCartao(0);
    showToast('🧹 Lote limpo!', 'info');
}

// ============================================
// CADASTRO INDIVIDUAL
// ============================================
async function adicionarCartaoIndividual() {
    if (modoSelecaoAtivo) {
        document.getElementById('concursoIndividualSelecao').value = document.getElementById('concursoIndividual').value;
        document.getElementById('bolaoIndividualSelecao').value = document.getElementById('bolaoIndividual').value;
        document.getElementById('tipoCartaoIndividualSelecao').value = document.getElementById('tipoCartaoIndividual').value;
        await adicionarCartaoIndividualSelecao();
        return;
    }
    
    const concurso = document.getElementById('concursoIndividual').value;
    const bolao = document.getElementById('bolaoIndividual').value || 'Sem Bolão';
    const tipoParticipacao = document.getElementById('tipoCartaoIndividual').value;
    const texto = document.getElementById('numerosIndividual').value;
    
    if (!concurso) {
        showToast('⚠️ Informe o concurso!', 'warning');
        return;
    }
    if (!texto.trim()) {
        showToast('⚠️ Informe os números!', 'warning');
        return;
    }
    
    const numeros = texto.match(/\d+/g).map(Number);
    
    let minNumeros, maxNumeros, maxValor, label;
    if (loteriaAdmin === 'mega') {
        minNumeros = 6;
        maxNumeros = 20;
        maxValor = 60;
        label = 'MEGA-SENA';
    } else if (loteriaAdmin === 'lotofacil') {
        minNumeros = 15;
        maxNumeros = 20;
        maxValor = 25;
        label = 'LOTOFÁCIL';
    } else if (loteriaAdmin === 'quina') {
        minNumeros = 5;
        maxNumeros = 15;
        maxValor = 80;
        label = 'QUINA';
    } else {
        showToast('⚠️ Loteria não reconhecida!', 'error');
        return;
    }
    
    if (numeros.length < minNumeros) {
        showToast(`❌ ${label}: mínimo ${minNumeros} números!`, 'error');
        return;
    }
    
    if (numeros.length > maxNumeros) {
        showToast(`❌ ${label}: máximo ${maxNumeros} números!`, 'error');
        return;
    }
    
    const numerosUnicos = [...new Set(numeros)];
    if (numerosUnicos.length !== numeros.length) {
        showToast('❌ Números duplicados!', 'error');
        return;
    }
    
    if (numeros.some(n => n < 1 || n > maxValor)) {
        showToast(`❌ Números devem estar entre 1 e ${maxValor}!`, 'error');
        return;
    }
    
    numeros.sort((a, b) => a - b);
    
    try {
        await db.collection('cartoes').add({
            concurso: concurso,
            bolao: bolao,
            numeros: numeros,
            tipo: loteriaAdmin,
            tipoParticipacao: tipoParticipacao,
            admin: true,
            dataCadastro: new Date().toISOString(),
            totalNumeros: numeros.length
        });
        showToast(`✅ Cartão adicionado à ${label}!`, 'success');
        document.getElementById('numerosIndividual').value = '';
        carregarDadosAdmin();
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao adicionar', 'error');
    }
}

async function adicionarCartaoIndividualSelecao() {
    const concurso = document.getElementById('concursoIndividualSelecao').value;
    const bolao = document.getElementById('bolaoIndividualSelecao').value || 'Bolão Seleção';
    const tipoParticipacao = document.getElementById('tipoCartaoIndividualSelecao').value;
    
    if (!concurso) {
        showToast('⚠️ Informe o concurso!', 'warning');
        return;
    }
    
    if (numerosSelecionados.length === 0) {
        showToast('⚠️ Selecione pelo menos um número!', 'warning');
        return;
    }
    
    let minNumeros, maxNumeros, maxValor, label;
    if (loteriaAdmin === 'mega') {
        minNumeros = 6;
        maxNumeros = 20;
        maxValor = 60;
        label = 'MEGA-SENA';
    } else if (loteriaAdmin === 'lotofacil') {
        minNumeros = 15;
        maxNumeros = 20;
        maxValor = 25;
        label = 'LOTOFÁCIL';
    } else if (loteriaAdmin === 'quina') {
        minNumeros = 5;
        maxNumeros = 15;
        maxValor = 80;
        label = 'QUINA';
    } else {
        showToast('⚠️ Loteria não reconhecida!', 'error');
        return;
    }
    
    if (numerosSelecionados.length < minNumeros) {
        showToast(`❌ ${label}: mínimo ${minNumeros} números!`, 'error');
        return;
    }
    
    if (numerosSelecionados.length > maxNumeros) {
        showToast(`❌ ${label}: máximo ${maxNumeros} números!`, 'error');
        return;
    }
    
    const numeros = [...numerosSelecionados].sort((a, b) => a - b);
    
    try {
        await db.collection('cartoes').add({
            concurso: concurso,
            bolao: bolao,
            numeros: numeros,
            tipo: loteriaAdmin,
            tipoParticipacao: tipoParticipacao,
            admin: true,
            dataCadastro: new Date().toISOString(),
            totalNumeros: numeros.length
        });
        showToast(`✅ Cartão adicionado à ${label}!`, 'success');
        numerosSelecionados = [];
        atualizarGradeSelecaoVisual();
        atualizarContadorSelecao();
        atualizarPreviaSelecao();
        carregarDadosAdmin();
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao adicionar', 'error');
    }
}

// ============================================
// TOKENS DE ACESSO
// ============================================
function gerarTokenUnico() {
    // crypto.getRandomValues (não Math.random) — esse token é a única
    // credencial que protege os dados pessoais/financeiros do participante
    // em consulta.html?token=..., e o PRNG do Math.random não é seguro:
    // dá pra prever as próximas saídas a partir de algumas amostras.
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function salvarToken(participanteId, nome, telefone) {
    const token = gerarTokenUnico();
    const link = `${window.location.origin}/mega-sena-sistema/consulta.html?token=${token}`;
    const telefoneNumeros = telefone.replace(/\D/g, '');
    
    await db.collection('participantes_tokens').doc(token).set({
        participanteId: participanteId,
        nome: nome,
        telefone: telefoneNumeros,
        token: token,
        ativo: true,
        dataCriacao: new Date().toISOString(),
        admin: true
    });
    
    showToast(`✅ Token gerado para ${nome}!`, 'success');
    carregarTokens();
}

async function carregarTokens() {
    try {
        const snapshot = await db.collection('participantes_tokens').where('ativo', '==', true).get();
        const tokens = [];
        snapshot.forEach(doc => {
            tokens.push({ id: doc.id, ...doc.data() });
        });
        
        const container = document.getElementById('listaTokens');
        if (!container) return;
        
        if (tokens.length === 0) {
            container.innerHTML = '<div class="empty-state">🔑 Nenhum token ativo. Gere o primeiro acima.</div>';
            return;
        }
        
        let html = '<div class="tokens-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px;">';
        
        for (const token of tokens) {
            const link = `${window.location.origin}/mega-sena-sistema/consulta.html?token=${token.token}`;
            const dataCriacao = token.dataCriacao ? new Date(token.dataCriacao).toLocaleDateString('pt-BR') : '---';
            
            html += `
                <div class="token-card" style="background: #ffffff; border-radius: 16px; padding: 14px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="font-size: 15px;">👤 ${escapeHtml(token.nome)}</strong>
                        <span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 30px; font-size: 10px;">✅ ATIVO</span>
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">📞 ${formatarTelefone(token.telefone)}</div>
                    <div style="font-size: 10px; color: #64748b; margin-bottom: 10px;">📅 Criado em: ${dataCriacao}</div>
                    <div style="background: #f8fafc; padding: 8px; border-radius: 8px; margin-bottom: 10px;">
                        <code style="font-size: 12px; word-break: break-all;">${link}</code>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-copiar-link btn-sm" data-link="${link}" style="background: #0071e3; border: none; padding: 6px 12px; border-radius: 20px; color: white; cursor: pointer; font-size: 11px;">📋 COPIAR LINK</button>
                        <button class="btn-revogar-token btn-sm" data-token="${token.token}" style="background: #ef4444; border: none; padding: 6px 12px; border-radius: 20px; color: white; cursor: pointer; font-size: 11px;">❌ REVOGAR</button>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-copiar-link').forEach(btn => {
            btn.onclick = () => {
                navigator.clipboard.writeText(btn.dataset.link);
                showToast('📋 Link copiado!', 'success');
            };
        });
        
        document.querySelectorAll('.btn-revogar-token').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('REVOGAR este token? O participante perderá o acesso imediatamente.')) {
                    await db.collection('participantes_tokens').doc(btn.dataset.token).update({ 
                        ativo: false,
                        admin: true
                    });
                    showToast('❌ Token revogado!', 'info');
                    carregarTokens();
                }
            };
        });
        
    } catch (error) {
        console.error('Erro ao carregar tokens:', error);
        const container = document.getElementById('listaTokens');
        if (container) container.innerHTML = '<div class="empty-state">❌ Erro ao carregar tokens</div>';
    }
}

function formatarTelefone(telefone) {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
    } else if (numeros.length === 10) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
    }
    return numeros;
}

// ============================================
// PARTICIPANTES POR BOLÃO
// ============================================
async function carregarBoloesSelectParticipantes() {
    const select = document.getElementById('bolaoSelectParticipantes');
    if (!select) return;
    
    try {
        const snapshot = await db.collection('participantes').get();
        const boloes = [];
        snapshot.forEach(doc => {
            boloes.push({ id: doc.id, ...doc.data() });
        });
        
        select.innerHTML = '<option value="">Selecione um bolão</option>';
        for (const bolao of boloes) {
            const option = document.createElement('option');
            option.value = bolao.id;
            option.textContent = `${bolao.titulo} (${bolao.loteria || '?'}) - ${bolao.participantes?.length || 0} participantes`;
            select.appendChild(option);
        }
        
        select.removeEventListener('change', handleSelectChange);
        select.addEventListener('change', handleSelectChange);
        
        console.log(`✅ ${boloes.length} bolões carregados no select`);
        
    } catch (error) {
        console.error('Erro ao carregar bolões:', error);
    }
}

function handleSelectChange(event) {
    const id = event.target.value;
    console.log('📌 Bolão selecionado:', id);
    if (id) {
        carregarParticipantesAdmin(id);
    } else {
        document.getElementById('listaParticipantesAdmin').innerHTML = '<div class="empty-state">Selecione um bolão para ver os participantes</div>';
    }
}

async function carregarParticipantesAdmin(bolaoId) {
    const container = document.getElementById('listaParticipantesAdmin');
    if (!container) return;
    
    if (!bolaoId) {
        container.innerHTML = '<div class="empty-state">Selecione um bolão para ver os participantes</div>';
        return;
    }
    
    container.innerHTML = '<div class="loading">🔍 Carregando participantes...</div>';
    
    try {
        const doc = await db.collection('participantes').doc(bolaoId).get();
        if (!doc.exists) {
            container.innerHTML = '<div class="empty-state">Bolão não encontrado</div>';
            return;
        }
        
        const bolao = doc.data();
        const participantes = bolao.participantes || [];
        const valorPorCota = bolao.valorPorCota || 0;
        
        if (participantes.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum participante neste bolão</div>';
            return;
        }
        
        const participantesFormatados = participantes.map(p => {
            let statusClass = 'pago';
            let statusText = 'PAGO';
            let quantidadeCotas = p.quantidadeCotas || 1;
            let valorPago = p.valorPago || 0;
            
            if (p.situacao !== 'quitado' && p.situacao !== 'pago') {
                statusClass = 'pendente';
                statusText = 'EM ANDAMENTO';
            }
            
            return {
                nome: p.nome,
                telefone: p.telefone || '---',
                statusClass: statusClass,
                statusText: statusText,
                quantidadeCotas: quantidadeCotas,
                valorPago: valorPago,
                valorPorCota: valorPorCota
            };
        });
        
        participantesFormatados.sort((a, b) => {
            if (a.statusClass === 'pago' && b.statusClass !== 'pago') return -1;
            if (a.statusClass !== 'pago' && b.statusClass === 'pago') return 1;
            return 0;
        });
        
        let html = `<div style="margin-bottom: 15px; padding: 10px; background: #f1f5f9; border-radius: 12px; display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <span><strong>📊 TOTAL:</strong> ${participantes.length} participantes</span>
                        <span><strong>💰 VALOR POR COTA:</strong> R$ ${valorPorCota.toFixed(2)}</span>
                    </div>`;
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
        
        participantesFormatados.forEach(p => {
            const totalEsperado = p.valorPorCota * p.quantidadeCotas;
            html += `
                <div style="background: #ffffff; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;">
                        <strong style="font-size: 14px;">${escapeHtml(p.nome)}</strong>
                        <span style="background: ${p.statusClass === 'pago' ? '#10b981' : '#f59e0b'}; color: white; font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 30px;">${p.statusText}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
                        <span>📞 ${p.telefone}</span>
                        <span>🎟️ ${p.quantidadeCotas} cota${p.quantidadeCotas > 1 ? 's' : ''}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-top: 6px;">
                        <span>💵 Pago: <strong style="color: #10b981;">R$ ${p.valorPago.toFixed(2)}</strong></span>
                        <span>Total: R$ ${totalEsperado.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao carregar participantes:', error);
        container.innerHTML = '<div class="empty-state">❌ Erro ao carregar participantes</div>';
    }
}

// ============================================
// RESERVAS
// ============================================
async function carregarReservas() {
    try {
        const snapshot = await db.collection('reservas_participantes').get();
        const reservas = [];
        let totalSaldo = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            reservas.push({ id: doc.id, ...data });
            totalSaldo += data.saldoReserva || 0;
        });
        
        reservas.sort((a, b) => (b.saldoReserva || 0) - (a.saldoReserva || 0));
        reservasCarregadas = reservas;

        document.getElementById('totalReservas').innerHTML = `R$ ${totalSaldo.toFixed(2)}`;
        
        const container = document.getElementById('listaReservas');
        
        if (reservas.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Nenhuma reserva encontrada</div>';
            return;
        }
        
        let html = '<div class="reservas-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">';
        for (const reserva of reservas) {
            const dataAtualizacao = reserva.dataAtualizacao ? new Date(reserva.dataAtualizacao).toLocaleString('pt-BR') : '---';
            const saldo = (reserva.saldoReserva || 0).toFixed(2);
            
            html += `
                <div class="reserva-card" style="background: #f8fafc; border-radius: 12px; padding: 14px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <div style="font-weight: bold; font-size: 15px; color: #1e293b;">👤 ${escapeHtml(reserva.nome)}</div>
                        <div style="font-weight: bold; font-size: 16px; color: ${reserva.saldoReserva > 0 ? '#10b981' : reserva.saldoReserva < 0 ? '#ef4444' : '#64748b'};">R$ ${saldo}</div>
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
                        🆔 ${reserva.participanteId || reserva.id.substring(0, 8)} • 📅 ${dataAtualizacao}
                    </div>
                    <button class="btn-ver-historico" data-id="${reserva.id}" data-nome="${escapeHtml(reserva.nome)}" style="background: #0071e3; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; width: 100%; touch-action: manipulation;">
                        📜 VER HISTÓRICO
                    </button>
                    <div id="historico-${reserva.id}" style="display: none; margin-top: 12px; background: white; border-radius: 8px; padding: 12px; font-size: 13px; max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0;"></div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-ver-historico').forEach(btn => {
            btn.removeEventListener('click', handlerHistorico);
            btn.addEventListener('click', handlerHistorico);
        });
        
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        document.getElementById('listaReservas').innerHTML = '<div class="empty-state">❌ Erro ao carregar reservas</div>';
        showToast('❌ Erro ao carregar reservas', 'error');
    }
}

function handlerHistorico(event) {
    const btn = event.currentTarget;
    const id = btn.dataset.id;
    const nome = btn.dataset.nome;
    mostrarHistorico(id, nome);
}

async function mostrarHistorico(id, nome) {
    const div = document.getElementById(`historico-${id}`);
    const btn = document.querySelector(`.btn-ver-historico[data-id="${id}"]`);
    
    if (!div) {
        console.error('Div do histórico não encontrada para ID:', id);
        return;
    }
    
    if (div.style.display === 'block') {
        div.style.display = 'none';
        if (btn) btn.textContent = '📜 VER HISTÓRICO';
        return;
    }
    
    div.style.display = 'block';
    div.innerHTML = '<div style="text-align: center; color: #94a3b8;">🔄 Carregando histórico...</div>';
    if (btn) btn.textContent = '⏳ CARREGANDO...';
    
    try {
        const doc = await db.collection('reservas_participantes').doc(id).get();
        
        if (!doc.exists) {
            div.innerHTML = '<div style="color: #ef4444;">❌ Reserva não encontrada</div>';
            if (btn) btn.textContent = '📜 VER HISTÓRICO';
            return;
        }
        
        const data = doc.data();
        const historico = data.historico || [];
        const saldoAtual = data.saldoReserva || 0;
        
        if (historico.length === 0) {
            div.innerHTML = `
                <div style="text-align: center; color: #64748b;">📭 Nenhuma movimentação registrada</div>
                <button class="btn-copiar-historico" data-id="${id}" data-nome="${nome}" style="margin-top: 12px; background: #25D366; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; width: 100%; touch-action: manipulation;">
                    📤 COPIAR HISTÓRICO
                </button>
            `;
            if (btn) btn.textContent = '📜 VER HISTÓRICO';
            document.querySelector(`.btn-copiar-historico[data-id="${id}"]`)?.addEventListener('click', function() {
                copiarHistoricoWhatsApp(id, nome);
            });
            return;
        }
        
        const historicoOrdenado = [...historico].reverse();
        
        let html = '<div style="font-weight: bold; margin-bottom: 8px; color: #1e293b;">📋 MOVIMENTAÇÕES</div>';
        html += `<div style="font-size: 13px; color: #475569; margin-bottom: 10px;">💰 Saldo atual: <strong style="color: ${saldoAtual >= 0 ? '#10b981' : '#ef4444'};">R$ ${saldoAtual.toFixed(2)}</strong></div>`;
        html += '<div style="max-height: 180px; overflow-y: auto;">';
        
        for (const item of historicoOrdenado) {
            const dataItem = item.data ? new Date(item.data).toLocaleString('pt-BR') : 'Data não disponível';
            const tipoIcon = item.tipo === 'deposito' ? '💰 DEPÓSITO' : (item.tipo === 'saque' ? '💸 SAQUE' : '🎯 USO');
            const valorClass = item.tipo === 'deposito' ? 'color: #10b981;' : 'color: #ef4444;';
            const valorSinal = item.tipo === 'deposito' ? '+' : '-';
            
            html += `
                <div style="border-bottom: 1px solid #e2e8f0; padding: 8px 0; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600;">${tipoIcon}</span>
                        <span style="font-weight: bold; ${valorClass}">${valorSinal} R$ ${(item.valor || 0).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 11px;">
                        <span>${dataItem}</span>
                        <span>Saldo: R$ ${(item.saldoNovo || 0).toFixed(2)}</span>
                    </div>
                    ${item.descricao ? `<div style="color: #475569; font-size: 11px; margin-top: 2px;">📝 ${item.descricao}</div>` : ''}
                </div>
            `;
        }
        html += '</div>';
        
        html += `
            <button class="btn-copiar-historico" data-id="${id}" data-nome="${nome}" style="margin-top: 12px; background: #25D366; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; width: 100%; touch-action: manipulation; font-weight: 600;">
                📤 COPIAR HISTÓRICO PARA WHATSAPP
            </button>
        `;
        
        div.innerHTML = html;
        if (btn) btn.textContent = '🙈 OCULTAR HISTÓRICO';
        document.querySelector(`.btn-copiar-historico[data-id="${id}"]`)?.addEventListener('click', function() {
            copiarHistoricoWhatsApp(id, nome);
        });
        
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        div.innerHTML = `<div style="color: #ef4444;">❌ Erro ao carregar histórico: ${error.message}</div>`;
        if (btn) btn.textContent = '📜 VER HISTÓRICO';
        showToast('❌ Erro ao carregar histórico', 'error');
    }
}

// Registra um depósito/saque de reserva pelo site — não altera o saldo na
// hora. Fica na fila reservas_movimentos_pendentes até o app desktop abrir
// e importar (o desktop é quem mantém o histórico completo; o site só
// empilha até ser importado). Sem isso, a sincronização só ia desktop→site,
// nunca o contrário.
function abrirModalRegistrarMovimento() {
    let modal = document.getElementById('modalRegistrarMovimento');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'modalRegistrarMovimento';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        padding: 20px; overflow-y: auto;
    `;

    const opcoesPessoas = reservasCarregadas.map(r =>
        `<option value="${r.id}">${escapeHtml(r.nome)}${r.telefone ? ' — ' + escapeHtml(r.telefone) : ''}</option>`
    ).join('');

    const hoje = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; max-width: 420px; width: 100%; padding: 25px; max-height: 90vh; overflow-y: auto;">
            <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">💰</div>
            <div style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 4px;">REGISTRAR MOVIMENTO DE RESERVA</div>
            <div style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 20px;">
                Fica pendente até o app desktop abrir e importar — o saldo não muda aqui na hora.
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                <button id="btnMovPessoaExistente" type="button" style="flex:1; padding: 10px; border-radius: 10px; border: 2px solid #0071e3; background: #0071e3; color: white; font-weight: 600; cursor: pointer;">Pessoa existente</button>
                <button id="btnMovPessoaNova" type="button" style="flex:1; padding: 10px; border-radius: 10px; border: 2px solid #e2e8f0; background: white; color: #64748b; font-weight: 600; cursor: pointer;">Pessoa nova</button>
            </div>

            <div id="movCamposExistente">
                <label style="font-size: 12px; font-weight: 600; color: #475569;">Pessoa</label>
                <select id="movPessoaSelect" class="form-control" style="margin-bottom: 12px;">
                    <option value="">Selecione...</option>
                    ${opcoesPessoas}
                </select>
            </div>

            <div id="movCamposNovo" style="display: none;">
                <label style="font-size: 12px; font-weight: 600; color: #475569;">Nome</label>
                <input type="text" id="movNomeNovo" class="form-control" placeholder="Nome completo" style="margin-bottom: 10px;">
                <label style="font-size: 12px; font-weight: 600; color: #475569;">Telefone</label>
                <input type="text" id="movTelefoneNovo" class="form-control" placeholder="(61) 99999-9999" style="margin-bottom: 10px;">
                <label style="font-size: 12px; font-weight: 600; color: #475569;">Chave PIX (opcional)</label>
                <input type="text" id="movPixNovo" class="form-control" placeholder="Chave PIX" style="margin-bottom: 12px;">
            </div>

            <label style="font-size: 12px; font-weight: 600; color: #475569;">Tipo</label>
            <select id="movTipo" class="form-control" style="margin-bottom: 12px;">
                <option value="deposito">💰 Depósito</option>
                <option value="saque">💸 Saque / Uso</option>
            </select>

            <label style="font-size: 12px; font-weight: 600; color: #475569;">Valor (R$)</label>
            <input type="number" id="movValor" class="form-control" step="0.01" min="0.01" placeholder="0,00" style="margin-bottom: 12px;">

            <label style="font-size: 12px; font-weight: 600; color: #475569;">Data</label>
            <input type="date" id="movData" class="form-control" value="${hoje}" style="margin-bottom: 12px;">

            <label style="font-size: 12px; font-weight: 600; color: #475569;">Descrição (opcional)</label>
            <input type="text" id="movDescricao" class="form-control" placeholder="Ex: depósito via PIX" style="margin-bottom: 18px;">

            <button id="btnConfirmarMovimento" style="width:100%; padding: 14px; background: #10b981; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 15px; cursor: pointer; margin-bottom: 10px;">✅ REGISTRAR</button>
            <button id="btnCancelarMovimento" style="width:100%; padding: 10px; background: transparent; color: #64748b; border: none; font-size: 13px; cursor: pointer;">Cancelar</button>
        </div>
    `;

    document.body.appendChild(modal);

    let pessoaExistente = true;
    const btnExistente = document.getElementById('btnMovPessoaExistente');
    const btnNova = document.getElementById('btnMovPessoaNova');
    const camposExistente = document.getElementById('movCamposExistente');
    const camposNovo = document.getElementById('movCamposNovo');

    function atualizarToggle() {
        if (pessoaExistente) {
            btnExistente.style.background = '#0071e3'; btnExistente.style.color = 'white'; btnExistente.style.borderColor = '#0071e3';
            btnNova.style.background = 'white'; btnNova.style.color = '#64748b'; btnNova.style.borderColor = '#e2e8f0';
            camposExistente.style.display = ''; camposNovo.style.display = 'none';
        } else {
            btnNova.style.background = '#0071e3'; btnNova.style.color = 'white'; btnNova.style.borderColor = '#0071e3';
            btnExistente.style.background = 'white'; btnExistente.style.color = '#64748b'; btnExistente.style.borderColor = '#e2e8f0';
            camposNovo.style.display = ''; camposExistente.style.display = 'none';
        }
    }
    btnExistente.onclick = () => { pessoaExistente = true; atualizarToggle(); };
    btnNova.onclick = () => { pessoaExistente = false; atualizarToggle(); };

    document.getElementById('btnCancelarMovimento').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    document.getElementById('btnConfirmarMovimento').onclick = async () => {
        const tipo = document.getElementById('movTipo').value;
        const valor = parseFloat(document.getElementById('movValor').value);
        const data = document.getElementById('movData').value;
        const descricao = document.getElementById('movDescricao').value.trim();

        if (!valor || valor <= 0) { showToast('⚠️ Informe um valor válido', 'warning'); return; }
        if (!data) { showToast('⚠️ Informe a data', 'warning'); return; }

        const doc = {
            pessoaExistente, tipo, valor, data, descricao,
            sincronizado: false,
            criadoEm: new Date().toISOString()
        };

        if (pessoaExistente) {
            const select = document.getElementById('movPessoaSelect');
            const reservaId = select.value;
            if (!reservaId) { showToast('⚠️ Selecione a pessoa', 'warning'); return; }
            const reserva = reservasCarregadas.find(r => r.id === reservaId);
            doc.participanteId = reservaId;
            doc.nome = reserva ? reserva.nome : '';
            doc.telefone = reserva ? (reserva.telefone || '') : '';
            doc.chavePix = '';
        } else {
            const nome = document.getElementById('movNomeNovo').value.trim();
            const telefone = document.getElementById('movTelefoneNovo').value.trim();
            const pix = document.getElementById('movPixNovo').value.trim();
            if (!nome) { showToast('⚠️ Informe o nome', 'warning'); return; }
            if (!telefone) { showToast('⚠️ Informe o telefone', 'warning'); return; }
            doc.participanteId = null;
            doc.nome = nome;
            doc.telefone = telefone.replace(/\D/g, '');
            doc.chavePix = pix;
        }

        try {
            await db.collection('reservas_movimentos_pendentes').add(doc);
            showToast('✅ Registrado! Vai aparecer no saldo quando o desktop abrir e sincronizar.', 'success');
            modal.remove();
        } catch (error) {
            console.error('Erro ao registrar movimento:', error);
            showToast('❌ Erro ao registrar movimento', 'error');
        }
    };

    atualizarToggle();
}

// Lançamento em lote: marca vários nomes de uma vez, um valor só, registra
// tudo junto — pedido explícito do usuário porque registrar um por um no
// modal acima (abrirModalRegistrarMovimento) era lento demais quando o
// mesmo valor vale pra várias pessoas (ex.: "uso da reserva" de um cartão
// comprado por 15 pessoas). Cada pessoa marcada vira um documento próprio
// em reservas_movimentos_pendentes (mesma fila/formato do modal simples —
// o desktop importa cada um igual), gravados juntos num batch do
// Firestore. O modal fica aberto depois de registrar: some as caixinhas
// marcadas e limpa o valor, pra já poder marcar outro grupo com outro
// valor sem reabrir nada — exatamente o fluxo descrito pelo usuário.
function abrirModalLancamentoLote() {
    let modal = document.getElementById('modalLancamentoLote');
    if (modal) modal.remove();

    if (!reservasCarregadas || reservasCarregadas.length === 0) {
        showToast('⚠️ Nenhuma reserva carregada ainda — clique em Atualizar primeiro', 'warning');
        return;
    }

    modal = document.createElement('div');
    modal.id = 'modalLancamentoLote';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        padding: 20px; overflow-y: auto;
    `;

    const hoje = new Date().toISOString().split('T')[0];
    const linhasPessoas = reservasCarregadas.map(r => {
        const saldo = (r.saldoReserva || 0).toFixed(2);
        return `
            <label class="lote-linha-pessoa" data-nome-busca="${escapeHtml(r.nome).toLowerCase()}"
                   style="display:flex; align-items:center; gap:10px; padding:9px 6px; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                <input type="checkbox" class="lote-checkbox" value="${r.id}" style="width:18px; height:18px; flex-shrink:0;">
                <span style="flex:1; font-size:14px; color:#1e293b;">${escapeHtml(r.nome)}</span>
                <span style="font-size:12px; color:${r.saldoReserva > 0 ? '#10b981' : r.saldoReserva < 0 ? '#ef4444' : '#94a3b8'};">R$ ${saldo}</span>
            </label>`;
    }).join('');

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; max-width: 460px; width: 100%; padding: 25px; max-height: 92vh; overflow-y: auto; display: flex; flex-direction: column;">
            <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">📦</div>
            <div style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 4px;">LANÇAMENTO EM LOTE DE RESERVA</div>
            <div style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 18px;">
                Marque quem vai usar o mesmo valor, registre. Pra outro valor, marque outro grupo e registre de novo — o modal continua aberto.
            </div>

            <label style="font-size: 12px; font-weight: 600; color: #475569;">Tipo</label>
            <select id="loteTipo" class="form-control" style="margin-bottom: 12px;">
                <option value="saque" selected>💸 Saque / Uso</option>
                <option value="deposito">💰 Depósito</option>
            </select>

            <div style="display:flex; gap:10px;">
                <div style="flex:1;">
                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Valor (R$) por pessoa</label>
                    <input type="number" id="loteValor" class="form-control" step="0.01" min="0.01" placeholder="0,00" style="margin-bottom: 12px;">
                </div>
                <div style="flex:1;">
                    <label style="font-size: 12px; font-weight: 600; color: #475569;">Data</label>
                    <input type="date" id="loteData" class="form-control" value="${hoje}" style="margin-bottom: 12px;">
                </div>
            </div>

            <label style="font-size: 12px; font-weight: 600; color: #475569;">Descrição (opcional)</label>
            <input type="text" id="loteDescricao" class="form-control" placeholder="Ex: cartão da Mega 2026" style="margin-bottom: 14px;">

            <input type="text" id="loteBusca" class="form-control" placeholder="🔍 Filtrar nomes..." style="margin-bottom: 8px;">

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <div style="display:flex; gap:8px;">
                    <button id="btnLoteMarcarTodos" type="button" style="font-size:12px; padding:5px 10px; border-radius:8px; border:1px solid #cbd5e1; background:white; color:#475569; cursor:pointer;">Marcar visíveis</button>
                    <button id="btnLoteDesmarcarTodos" type="button" style="font-size:12px; padding:5px 10px; border-radius:8px; border:1px solid #cbd5e1; background:white; color:#475569; cursor:pointer;">Desmarcar todos</button>
                </div>
                <div id="loteContadorSelecao" style="font-size:12px; font-weight:600; color:#8b5cf6;">0 selecionado(s)</div>
            </div>

            <div id="loteListaPessoas" style="border:1px solid #e2e8f0; border-radius:10px; max-height:260px; overflow-y:auto; margin-bottom: 14px;">
                ${linhasPessoas}
            </div>

            <div id="loteResumoSessao" style="font-size:12px; color:#64748b; text-align:center; margin-bottom:10px; display:none;"></div>

            <button id="btnConfirmarLote" style="width:100%; padding: 14px; background: #8b5cf6; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 15px; cursor: pointer; margin-bottom: 10px;">✅ REGISTRAR SELECIONADOS</button>
            <button id="btnFecharLote" style="width:100%; padding: 10px; background: transparent; color: #64748b; border: none; font-size: 13px; cursor: pointer;">Concluir e fechar</button>
        </div>
    `;

    document.body.appendChild(modal);

    const listaEl = document.getElementById('loteListaPessoas');
    const contadorEl = document.getElementById('loteContadorSelecao');
    const resumoEl = document.getElementById('loteResumoSessao');
    let totalRegistradoSessao = 0;

    function checkboxesVisiveis() {
        return Array.from(listaEl.querySelectorAll('.lote-linha-pessoa'))
            .filter(linha => linha.style.display !== 'none')
            .map(linha => linha.querySelector('.lote-checkbox'));
    }

    function atualizarContador() {
        const marcados = listaEl.querySelectorAll('.lote-checkbox:checked').length;
        contadorEl.textContent = `${marcados} selecionado(s)`;
    }
    listaEl.addEventListener('change', (e) => {
        if (e.target.classList.contains('lote-checkbox')) atualizarContador();
    });

    document.getElementById('loteBusca').addEventListener('input', (e) => {
        const termo = e.target.value.trim().toLowerCase();
        listaEl.querySelectorAll('.lote-linha-pessoa').forEach(linha => {
            const bate = !termo || linha.dataset.nomeBusca.includes(termo);
            linha.style.display = bate ? '' : 'none';
        });
    });

    document.getElementById('btnLoteMarcarTodos').onclick = () => {
        checkboxesVisiveis().forEach(cb => { cb.checked = true; });
        atualizarContador();
    };
    document.getElementById('btnLoteDesmarcarTodos').onclick = () => {
        listaEl.querySelectorAll('.lote-checkbox').forEach(cb => { cb.checked = false; });
        atualizarContador();
    };

    document.getElementById('btnFecharLote').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    document.getElementById('btnConfirmarLote').onclick = async () => {
        const tipo = document.getElementById('loteTipo').value;
        const valor = parseFloat(document.getElementById('loteValor').value);
        const data = document.getElementById('loteData').value;
        const descricao = document.getElementById('loteDescricao').value.trim();
        const selecionados = Array.from(listaEl.querySelectorAll('.lote-checkbox:checked'));

        if (!valor || valor <= 0) { showToast('⚠️ Informe um valor válido', 'warning'); return; }
        if (!data) { showToast('⚠️ Informe a data', 'warning'); return; }
        if (selecionados.length === 0) { showToast('⚠️ Marque pelo menos uma pessoa', 'warning'); return; }

        const btnConfirmar = document.getElementById('btnConfirmarLote');
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = '⏳ Registrando...';

        try {
            const batch = db.batch();
            const criadoEm = new Date().toISOString();
            for (const cb of selecionados) {
                const reserva = reservasCarregadas.find(r => r.id === cb.value);
                const ref = db.collection('reservas_movimentos_pendentes').doc();
                batch.set(ref, {
                    pessoaExistente: true,
                    participanteId: cb.value,
                    nome: reserva ? reserva.nome : '',
                    telefone: reserva ? (reserva.telefone || '') : '',
                    chavePix: '',
                    tipo, valor, data, descricao,
                    sincronizado: false,
                    criadoEm
                });
            }
            await batch.commit();

            totalRegistradoSessao += selecionados.length;
            resumoEl.style.display = '';
            resumoEl.textContent = `✅ ${totalRegistradoSessao} movimento(s) registrado(s) nesta sessão`;
            showToast(`✅ ${selecionados.length} movimento(s) registrado(s)! Continue marcando outro grupo ou feche.`, 'success');

            // Limpa pra próxima rodada com outro valor, mas mantém tipo/data
            // (o mais comum é continuar no mesmo dia/tipo, só trocando quem
            // e quanto).
            listaEl.querySelectorAll('.lote-checkbox').forEach(cb => { cb.checked = false; });
            document.getElementById('loteValor').value = '';
            document.getElementById('loteDescricao').value = '';
            atualizarContador();
            document.getElementById('loteValor').focus();
        } catch (error) {
            console.error('Erro ao registrar lote:', error);
            showToast('❌ Erro ao registrar o lote', 'error');
        } finally {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = '✅ REGISTRAR SELECIONADOS';
        }
    };
}

async function copiarHistoricoWhatsApp(id, nome) {
    try {
        showToast('📋 Gerando mensagem...', 'info');
        
        const doc = await db.collection('reservas_participantes').doc(id).get();
        
        if (!doc.exists) {
            showToast('❌ Reserva não encontrada', 'error');
            return;
        }
        
        const data = doc.data();
        const historico = data.historico || [];
        const saldoAtual = data.saldoReserva || 0;
        
        if (historico.length === 0) {
            showToast('📭 Nenhuma movimentação para copiar', 'warning');
            return;
        }
        
        const historicoOrdenado = [...historico].reverse();
        let ultimoDepositoIndex = -1;
        
        for (let i = 0; i < historicoOrdenado.length; i++) {
            if (historicoOrdenado[i].tipo === 'deposito') {
                ultimoDepositoIndex = i;
                break;
            }
        }
        
        let historicoFiltrado;
        if (ultimoDepositoIndex === -1) {
            historicoFiltrado = [...historico];
        } else {
            const historicoApartirDeposito = historicoOrdenado.slice(0, ultimoDepositoIndex + 1);
            historicoFiltrado = historicoApartirDeposito.reverse();
        }
        
        const linha = '──────────────────';
        const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        let mensagem = `📊 *EXTRATO DE RESERVAS*\n`;
        mensagem += `👤 *Participante:* ${nome}\n`;
        mensagem += `📅 *Data:* ${dataAtual} às ${horaAtual}\n`;
        if (ultimoDepositoIndex !== -1) {
            mensagem += `📌 *Mostrando movimentações a partir do último depósito*\n`;
        }
        mensagem += `${linha}\n\n`;
        
        let totalDepositos = 0;
        let totalSaques = 0;
        let totalUso = 0;
        
        for (const item of historicoFiltrado) {
            if (item.tipo === 'deposito') totalDepositos += item.valor || 0;
            else if (item.tipo === 'saque') totalSaques += item.valor || 0;
            else if (item.tipo === 'uso') totalUso += item.valor || 0;
        }
        
        mensagem += `📋 *MOVIMENTAÇÕES:*\n\n`;
        
        for (const item of historicoFiltrado) {
            const dataItem = item.data ? new Date(item.data).toLocaleString('pt-BR') : 'Data não disponível';
            const tipoIcon = item.tipo === 'deposito' ? '💰' : (item.tipo === 'saque' ? '💸' : '🎯');
            const tipoNome = item.tipo === 'deposito' ? 'DEPÓSITO' : (item.tipo === 'saque' ? 'SAQUE' : 'USO');
            const valorSinal = item.tipo === 'deposito' ? '+' : '-';
            const valorFormatado = (item.valor || 0).toFixed(2);
            const saldoFormatado = (item.saldoNovo || 0).toFixed(2);
            
            mensagem += `${tipoIcon} *${tipoNome}*\n`;
            mensagem += `   📅 ${dataItem}\n`;
            mensagem += `   💰 ${valorSinal} R$ ${valorFormatado}\n`;
            mensagem += `   💵 Saldo: R$ ${saldoFormatado}\n`;
            if (item.descricao) {
                mensagem += `   📝 ${item.descricao}\n`;
            }
            mensagem += `\n`;
        }
        
        mensagem += `${linha}\n`;
        mensagem += `📊 *RESUMO (a partir do último depósito):*\n`;
        mensagem += `   💰 Total de depósitos: R$ ${totalDepositos.toFixed(2)}\n`;
        mensagem += `   💸 Total de saques: R$ ${totalSaques.toFixed(2)}\n`;
        mensagem += `   🎯 Total de uso: R$ ${totalUso.toFixed(2)}\n`;
        mensagem += `   ──────────────────\n`;
        mensagem += `   💵 *Saldo atual: R$ ${saldoAtual.toFixed(2)}*\n`;
        mensagem += `   ──────────────────\n`;
        mensagem += `   📊 *${historicoFiltrado.length} movimentações* (a partir do último depósito)\n\n`;
        mensagem += `${linha}\n`;
        mensagem += `🔗 *Bolões Aleatórios*\n`;
        mensagem += `https://rebrand.ly/boloesaleatorios`;
        
        try {
            await navigator.clipboard.writeText(mensagem);
            showToast('✅ Mensagem copiada! Cole no WhatsApp', 'success');
        } catch (error) {
            console.error('Erro ao copiar:', error);
            prompt('Copie a mensagem abaixo:', mensagem);
            showToast('📋 Mensagem pronta para copiar!', 'info');
        }
        
    } catch (error) {
        console.error('Erro ao gerar mensagem:', error);
        showToast('❌ Erro ao gerar mensagem', 'error');
    }
}

// ============================================
// ESTATÍSTICAS AVANÇADAS DO DASHBOARD
// ============================================

// ============================================
// ESTATÍSTICAS AVANÇADAS DO DASHBOARD
// ============================================
async function carregarEstatisticasDashboard() {
    console.log('📊 Carregando estatísticas avançadas...');
    
    try {
        // Buscar todos os cartões
        const snapshot = await db.collection('cartoes').get();
        const todosCartoes = [];
        snapshot.forEach(doc => {
            todosCartoes.push({ id: doc.id, ...doc.data() });
        });
        
        if (todosCartoes.length === 0) {
            console.log('⚠️ Nenhum cartão encontrado');
            atualizarDashboardEstatisticasVazio();
            return;
        }
        
        // Buscar resultados dos Firestore (já salvos anteriormente)
        const resultados = await buscarResultadosFirestore();
        
        // Calcular estatísticas
        const stats = calcularEstatisticas(todosCartoes, resultados);
        
        // Atualizar dashboard
        atualizarDashboardEstatisticas(stats);
        
    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas:', error);
        atualizarDashboardEstatisticasVazio();
    }
}

// Busca TODOS os resultados já conferidos (não só o mais recente), indexados
// por concurso, para permitir achados históricos (ex.: "melhor resultado de
// todos os tempos" de um bolão, mesmo que tenha sido em concurso antigo).
async function buscarResultadosFirestore() {
    const loterias = ['mega', 'lotofacil', 'quina'];
    const resultados = {};

    for (const loteria of loterias) {
        resultados[loteria] = {};
        try {
            const snapshot = await db.collection('resultados_conferidos')
                .where('loteria', '==', loteria)
                .get();

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.numeros && data.numeros.length > 0 && data.concurso) {
                    resultados[loteria][data.concurso] = data.numeros;
                }
            });

            console.log(`✅ ${Object.keys(resultados[loteria]).length} concurso(s) conferido(s) carregado(s) para ${loteria}`);
        } catch (error) {
            console.error(`❌ Erro ao buscar resultados conferidos de ${loteria}:`, error);
        }
    }

    return resultados;
}

function calcularEstatisticas(cartoes, resultados) {
    // 1. Estatísticas por BOLÃO + LOTERIA + CONCURSO (combinação única)
    const boloesPorLoteria = {};

    // 2. Melhor resultado por CONCURSO (para o ranking top-3 por loteria)
    const porConcursoPorLoteria = { mega: {}, lotofacil: {}, quina: {} };

    for (const cartao of cartoes) {
        const tipo = cartao.tipo || 'mega';
        const concurso = cartao.concurso ? parseInt(cartao.concurso) : null;

        // Buscar o resultado específico para este concurso
        let dezenasSorteadas = [];
        if (concurso && resultados[tipo] && resultados[tipo][concurso]) {
            dezenasSorteadas = resultados[tipo][concurso] || [];
        }

        const acertos = dezenasSorteadas.length > 0 ?
            cartao.numeros.filter(n => dezenasSorteadas.includes(n)).length : 0;

        // Agrupar por BOLÃO + LOTERIA + CONCURSO: cada concurso cadastrado é
        // um bolão à parte, mesmo que reaproveite o mesmo nome de outro
        // concurso (ex.: "Lotofácil 24 Concursos" cadastrado em lote gera
        // 24 bolões distintos, um por concurso, não um único bolão gigante)
        const bolaoNome = cartao.bolao || 'Sem Bolão';
        const chave = `${bolaoNome}|${tipo}|${concurso}`;

        if (!boloesPorLoteria[chave]) {
            boloesPorLoteria[chave] = {
                nome: bolaoNome,
                loteria: tipo,
                concurso: concurso,
                totalAcertos: 0,
                totalCartoes: 0,
                maxAcertos: 0,
                quadras: 0,
                ternos: 0,
                duques: 0
            };
        }

        boloesPorLoteria[chave].totalAcertos += acertos;
        boloesPorLoteria[chave].totalCartoes++;

        if (acertos > boloesPorLoteria[chave].maxAcertos) {
            boloesPorLoteria[chave].maxAcertos = acertos;
        }
        if (acertos >= 4) boloesPorLoteria[chave].quadras++;
        if (acertos >= 3) boloesPorLoteria[chave].ternos++;
        if (acertos >= 2) boloesPorLoteria[chave].duques++;

        // Melhor resultado do concurso (para o ranking top-3)
        if (concurso !== null && porConcursoPorLoteria[tipo]) {
            const pc = porConcursoPorLoteria[tipo];
            if (!pc[concurso]) pc[concurso] = { maxAcertos: 0, quantidade: 0 };
            if (acertos > pc[concurso].maxAcertos) {
                pc[concurso] = { maxAcertos: acertos, quantidade: 1 };
            } else if (acertos > 0 && acertos === pc[concurso].maxAcertos) {
                pc[concurso].quantidade++;
            }
        }
    }

    // Top 3 concursos por loteria (só concursos com resultado conferido e
    // que bateram um nível que realmente conta como prêmio — 1 acerto
    // solto não é uma conquista, é ruído)
    const limiarPremio = { mega: 2, lotofacil: 11, quina: 2 };
    const top3PorLoteria = { mega: [], lotofacil: [], quina: [] };
    for (const tipo of ['mega', 'lotofacil', 'quina']) {
        top3PorLoteria[tipo] = Object.keys(porConcursoPorLoteria[tipo])
            .map(concurso => ({ concurso, ...porConcursoPorLoteria[tipo][concurso] }))
            .filter(item => item.maxAcertos >= limiarPremio[tipo])
            // desempate por quantidade de cartões que bateram o nível, não só
            // pelo número do concurso: 2 ternos no mesmo concurso é mais
            // notável que 1 terno em outro
            .sort((a, b) => b.maxAcertos - a.maxAcertos || b.quantidade - a.quantidade || Number(a.concurso) - Number(b.concurso))
            .slice(0, 3);
    }

    // 5. Bilhetes jogados por loteria: um cartão com mais números que o
    // mínimo (ex.: 8 na Mega em vez de 6) equivale a vários bilhetes
    // simples. Mesma matemática combinatória do "POTENCIAL DO BOLÃO" do
    // site público, só que somada por loteria em vez de por bolão.
    const minPicks = { mega: 6, lotofacil: 15, quina: 5 };
    const bilhetesPorLoteria = { mega: 0, lotofacil: 0, quina: 0 };
    for (const cartao of cartoes) {
        const tipo = cartao.tipo || 'mega';
        const qtd = (cartao.numeros || []).length;
        if (qtd > 0 && minPicks[tipo] && bilhetesPorLoteria[tipo] !== undefined) {
            bilhetesPorLoteria[tipo] += combinacaoAdmin(qtd, minPicks[tipo]);
        }
    }

    // 6. Total de bolões = total de instâncias (nome+loteria+concurso)
    // distintas encontradas nos cartões. Um mesmo nome de bolão usado em
    // vários concursos (ex.: cadastro em lote) conta um bolão por concurso.
    const totalBoloesDistintos = Object.keys(boloesPorLoteria).length;

    // 7. Maior bolão (mais cartões = maior cobertura/probabilidade de acerto)
    let maiorBolao = { nome: 'Nenhum', totalCartoes: 0, loteria: '', concurso: null };
    for (const chave in boloesPorLoteria) {
        const dados = boloesPorLoteria[chave];
        if (dados.totalCartoes > maiorBolao.totalCartoes) {
            maiorBolao = { nome: dados.nome, totalCartoes: dados.totalCartoes, loteria: dados.loteria, concurso: dados.concurso };
        }
    }

    return {
        top3PorLoteria,
        maiorBolao,
        bilhetesPorLoteria,
        totalCartoes: cartoes.length,
        totalBoloes: totalBoloesDistintos
    };
}

// Combinação (n escolhe k) - quantos bilhetes simples um cartão de n
// números equivale, para uma loteria que sorteia k números
// Duplicada em script.js como combinacao() (sem build step pra
// compartilhar módulo entre as páginas) — mantenha as duas sincronizadas.
function combinacaoAdmin(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    let resultado = 1;
    for (let i = 1; i <= k; i++) {
        resultado *= (n - k + i) / i;
    }
    return Math.round(resultado);
}

// Formata "2 ternos" / "1 quadra" / "3 pontos" para o ranking top-3
function formatarTierAcerto(loteria, acertos, quantidade) {
    let nome;
    if (loteria === 'lotofacil') {
        nome = `${acertos} pontos`;
    } else {
        const nomes = { 6: 'sena', 5: 'quina', 4: 'quadra', 3: 'terno', 2: 'duque' };
        nome = nomes[acertos];
        if (!nome) return `${quantidade} cartão(ões) com ${acertos} acertos`;
        if (quantidade > 1) nome += 's';
    }
    return `${quantidade} ${nome}`;
}

function atualizarDashboardEstatisticas(stats) {
    console.log('📊 Atualizando dashboard com estatísticas...');
    
    // ============================================
    // 1. TOP 3 CONCURSOS POR LOTERIA
    // ============================================
    const medalhas = ['🥇', '🥈', '🥉'];
    const detalhesIdPorLoteria = {
        mega: 'dashboardMelhorMegaDetalhes',
        lotofacil: 'dashboardMelhorLotofacilDetalhes',
        quina: 'dashboardMelhorQuinaDetalhes'
    };

    for (const [loteria, detId] of Object.entries(detalhesIdPorLoteria)) {
        const elDet = document.getElementById(detId);
        if (!elDet) continue;

        const top3 = stats.top3PorLoteria?.[loteria] || [];
        if (top3.length === 0) {
            elDet.textContent = 'Nenhum resultado conferido ainda';
            continue;
        }

        elDet.innerHTML = top3.map((item, i) => {
            const texto = formatarTierAcerto(loteria, item.maxAcertos, item.quantidade);
            return `${medalhas[i] || '•'} Concurso ${item.concurso} — ${texto}`;
        }).join('<br>');
    }


    // ============================================
    // 3. BILHETES JOGADOS (equivalente em apostas simples)
    // ============================================
    const bp = stats.bilhetesPorLoteria || { mega: 0, lotofacil: 0, quina: 0 };
    const totalBilhetes = bp.mega + bp.lotofacil + bp.quina;
    const elBilhetes = document.getElementById('dashboardBilhetes');
    const elBilhetesDet = document.getElementById('dashboardBilhetesDetalhes');
    if (elBilhetes) elBilhetes.textContent = totalBilhetes.toLocaleString('pt-BR');
    if (elBilhetesDet) {
        elBilhetesDet.textContent = `Mega: ${bp.mega.toLocaleString('pt-BR')} · Lotofácil: ${bp.lotofacil.toLocaleString('pt-BR')} · Quina: ${bp.quina.toLocaleString('pt-BR')}`;
    }

    // ============================================
    // 3b. MAIOR BOLÃO (mais cartões) — vira o detalhe do card "Total de
    // Bolões" (nome + tamanho num só lugar, em vez de um card à parte)
    // ============================================
    const elMaiorBolaoDet = document.getElementById('dashboardMaiorBolaoDetalhes');
    if (elMaiorBolaoDet) {
        if (stats.maiorBolao?.totalCartoes > 0) {
            const loteriaNome = stats.maiorBolao.loteria === 'mega' ? 'MEGA' : stats.maiorBolao.loteria === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA';
            elMaiorBolaoDet.textContent = `Maior: ${stats.maiorBolao.nome} — ${stats.maiorBolao.totalCartoes} cartões · Concurso ${stats.maiorBolao.concurso} (${loteriaNome})`;
            elMaiorBolaoDet.style.color = '#7c3aed';
        } else {
            elMaiorBolaoDet.textContent = 'Nenhum bolão cadastrado';
            elMaiorBolaoDet.style.color = '#9ca3af';
        }
    }

    // ============================================
    // 4. TOTAIS GERAIS
    // ============================================
    const totalCartoesEl = document.getElementById('dashboardTotalCartoes');
    if (totalCartoesEl) totalCartoesEl.textContent = stats.totalCartoes;
    
    const totalBoloesEl = document.getElementById('dashboardTotalBoloes');
    if (totalBoloesEl) totalBoloesEl.textContent = stats.totalBoloes;

    // Detalhamento por loteria — vira a linha de baixo do card "Total de
    // Cartões" (o total geral já é o próprio dashboardTotalCartoes acima,
    // sem repetir o mesmo número num card à parte)
    const megaCount = cartoes.filter(c => c.tipo === 'mega').length;
    const lotoCount = cartoes.filter(c => c.tipo === 'lotofacil').length;
    const quinaCount = cartoes.filter(c => c.tipo === 'quina').length;

    const cartoesLoteriaDetEl = document.getElementById('dashboardCartoesLoteriaDetalhes');
    if (cartoesLoteriaDetEl) {
        cartoesLoteriaDetEl.textContent = `Mega: ${megaCount} · Lotofácil: ${lotoCount} · Quina: ${quinaCount}`;
    }

    // ============================================
    // 5. ATUALIZAR TIMESTAMP
    // ============================================
    const ultimaAtualizacao = document.getElementById('ultimaAtualizacao');
    if (ultimaAtualizacao) {
        ultimaAtualizacao.textContent = new Date().toLocaleString('pt-BR');
    }
    
    console.log('✅ Dashboard atualizado!');
}

function atualizarDashboardEstatisticasVazio() {
    const valores = {
        'dashboardMelhorMegaDetalhes': 'Nenhum resultado conferido ainda',
        'dashboardMelhorLotofacilDetalhes': 'Nenhum resultado conferido ainda',
        'dashboardMelhorQuinaDetalhes': 'Nenhum resultado conferido ainda',
        'dashboardMaiorBolaoDetalhes': 'Nenhum bolão cadastrado',
        'dashboardBilhetes': '0',
        'dashboardBilhetesDetalhes': 'Mega: 0 · Lotofácil: 0 · Quina: 0',
        'dashboardCartoesLoteriaDetalhes': 'Mega: 0 · Lotofácil: 0 · Quina: 0',
        'dashboardTotalCartoes': '0',
        'dashboardTotalBoloes': '0'
    };

    for (const id in valores) {
        const el = document.getElementById(id);
        if (el) el.textContent = valores[id];
    }
}

// ============================================
// INICIALIZAÇÃO (DOMContentLoaded)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Admin inicializado');
    verificarAutenticacao();
    
    const btnEntrarSenha = document.getElementById('btnEntrarSenha');
    const senhaAdminInput = document.getElementById('senhaAdmin');
    const btnSair = document.getElementById('btnSair');
    const btnExcluirSelecionados = document.getElementById('btnExcluirSelecionados');
    const btnAlterarTipo = document.getElementById('btnAlterarTipo');
    const btnSalvarPix = document.getElementById('btnSalvarPix');
    const btnSalvarSelecao = document.getElementById('btnSalvarSelecao');
    const btnExportar = document.getElementById('btnExportarExcel');
    const filtroConcurso = document.getElementById('filtroConcursoLista');
    const ordenarPor = document.getElementById('ordenarPorLista');
    const btnGerarToken = document.getElementById('btnGerarToken');
    const btnAtualizarReservas = document.getElementById('btnAtualizarReservas');
    
    const adminBtnMega = document.getElementById('adminBtnMega');
    const adminBtnLotofacil = document.getElementById('adminBtnLotofacil');
    const adminBtnQuina = document.getElementById('adminBtnQuina');
    const btnVerificarDuplicados = document.getElementById('btnVerificarDuplicados');
    
    if (btnVerificarDuplicados) {
        btnVerificarDuplicados.addEventListener('click', verificarDuplicados);
    }
    
    if (btnEntrarSenha) btnEntrarSenha.onclick = entrarComSenha;
    if (senhaAdminInput) senhaAdminInput.onkeypress = (e) => { if (e.key === 'Enter') entrarComSenha(); };
    if (btnSair) btnSair.onclick = sair;
    if (adminBtnMega) adminBtnMega.onclick = () => setLoteriaAdmin('mega');
    if (adminBtnLotofacil) adminBtnLotofacil.onclick = () => setLoteriaAdmin('lotofacil');
    if (adminBtnQuina) adminBtnQuina.onclick = () => setLoteriaAdmin('quina');
    const btnRecarregarLista = document.getElementById('btnRecarregarLista');
    if (btnRecarregarLista) btnRecarregarLista.onclick = carregarDadosAdmin;
    if (btnExcluirSelecionados) btnExcluirSelecionados.onclick = excluirSelecionados;
    if (btnAlterarTipo) btnAlterarTipo.onclick = abrirModalAlterarTipo;
    if (btnSalvarPix) btnSalvarPix.onclick = salvarPixConfig;
    if (btnSalvarSelecao) btnSalvarSelecao.addEventListener('click', salvarConfigBoloes);
    if (btnExportar) btnExportar.onclick = exportarCartoes;
    if (filtroConcurso) filtroConcurso.onchange = exibirCartoesAdmin;
    if (ordenarPor) ordenarPor.onchange = exibirCartoesAdmin;

    if (btnGerarToken) {
        btnGerarToken.addEventListener('click', async () => {
            const nome = document.getElementById('tokenNome').value.trim();
            const telefone = document.getElementById('tokenTelefone').value.trim();
            if (!nome || !telefone) {
                showToast('⚠️ Preencha nome e telefone', 'warning');
                return;
            }
            const participanteId = `${nome.replace(/\s/g, '_')}_${telefone}`;
            await salvarToken(participanteId, nome, telefone);
            document.getElementById('tokenNome').value = '';
            document.getElementById('tokenTelefone').value = '';
        });
    }
    
    if (btnAtualizarReservas) btnAtualizarReservas.onclick = () => carregarReservas();
    const btnRegistrarMovimentoReserva = document.getElementById('btnRegistrarMovimentoReserva');
    if (btnRegistrarMovimentoReserva) btnRegistrarMovimentoReserva.onclick = abrirModalRegistrarMovimento;
    const btnLancamentoLoteReserva = document.getElementById('btnLancamentoLoteReserva');
    if (btnLancamentoLoteReserva) btnLancamentoLoteReserva.onclick = abrirModalLancamentoLote;

    setTimeout(() => {
        console.log('🔄 Carregando dados das abas...');
        carregarBoloesParaGerenciar();
        carregarBoloesSelectParticipantes();
        carregarTokens();
        carregarReservas();
        exibirCartoesAdmin();
        console.log('✅ Dados das abas carregados!');
    }, 300);
    
    inicializarGradeNumeros();
    
    function atualizarVisibilidadeLote() {
        const cardLote = document.getElementById('cardLote');
        if (cardLote) {
            if (loteriaAdmin === 'lotofacil') {
                cardLote.style.display = 'block';
                cardLote.style.opacity = '1';
            } else {
                cardLote.style.display = 'none';
                cardLote.style.opacity = '0.5';
            }
        }
    }
    
    setTimeout(atualizarVisibilidadeLote, 200);
    
    if (adminBtnMega) adminBtnMega.addEventListener('click', () => {
        setTimeout(atualizarVisibilidadeLote, 200);
    });
    if (adminBtnLotofacil) adminBtnLotofacil.addEventListener('click', () => {
        setTimeout(atualizarVisibilidadeLote, 200);
    });
    if (adminBtnQuina) adminBtnQuina.addEventListener('click', () => {
        setTimeout(atualizarVisibilidadeLote, 200);
    });
    
    const qtdCartoes = document.getElementById('qtdCartoes');
    if (qtdCartoes) {
        qtdCartoes.addEventListener('change', () => {
            const total = parseInt(qtdCartoes.value) || 1;
            while (cartoesLote.length < total) {
                cartoesLote.push([]);
            }
            while (cartoesLote.length > total) {
                cartoesLote.pop();
            }
            if (cartaoAtualIndex >= total) cartaoAtualIndex = total - 1;
            navegarCartao(0);
        });
    }

    setTimeout(() => {
    carregarEstatisticasDashboard();
}, 1500);
    
    const qtdConcursos = document.getElementById('qtdConcursos');
    if (qtdConcursos) qtdConcursos.addEventListener('change', atualizarResumo);
    const concursoInicial = document.getElementById('concursoInicial');
    if (concursoInicial) concursoInicial.addEventListener('change', atualizarResumo);
    
    const btnCartaoAnterior = document.getElementById('btnCartaoAnterior');
    if (btnCartaoAnterior) btnCartaoAnterior.addEventListener('click', () => navegarCartao(-1));
    const btnCartaoProximo = document.getElementById('btnCartaoProximo');
    if (btnCartaoProximo) btnCartaoProximo.addEventListener('click', () => navegarCartao(1));
    
    const btnDuplicarCartao = document.getElementById('btnDuplicarCartao');
    if (btnDuplicarCartao) btnDuplicarCartao.addEventListener('click', duplicarCartaoLote);
    const btnLimparCartao = document.getElementById('btnLimparCartao');
    if (btnLimparCartao) btnLimparCartao.addEventListener('click', limparCartaoLote);
    const btnGerarLote = document.getElementById('btnGerarLote');
    if (btnGerarLote) btnGerarLote.addEventListener('click', gerarLote);
    const btnLimparLote = document.getElementById('btnLimparLote');
    if (btnLimparLote) btnLimparLote.addEventListener('click', limparLote);
    document.getElementById('btnPreencherLoteTexto')?.addEventListener('click', preencherCartaoLotePorTexto);
    document.getElementById('numerosTextoLote')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); preencherCartaoLotePorTexto(); }
    });
    document.getElementById('btnPreencherLoteMassa')?.addEventListener('click', preencherLotePorTextoEmMassa);
    const btnAdicionarIndividual = document.getElementById('btnAdicionarIndividual');
    if (btnAdicionarIndividual) btnAdicionarIndividual.addEventListener('click', adicionarCartaoIndividual);
    
    navegarCartao(0);
    
    const toggleModo = document.getElementById('toggleModoSelecao');
    const modoDigitacao = document.getElementById('modoDigitacao');
    const modoSelecao = document.getElementById('modoSelecao');
    const statusModo = document.getElementById('statusModoSelecao');
    
    if (toggleModo) {
        toggleModo.addEventListener('change', function() {
            modoSelecaoAtivo = this.checked;
            if (this.checked) {
                modoDigitacao.style.display = 'none';
                modoSelecao.style.display = 'block';
                statusModo.textContent = '(Seleção ativa)';
                statusModo.style.color = '#10b981';
                inicializarGradeSelecaoIndividual();
                const concurso = document.getElementById('concursoIndividual').value;
                const bolao = document.getElementById('bolaoIndividual').value;
                const tipo = document.getElementById('tipoCartaoIndividual').value;
                if (concurso) document.getElementById('concursoIndividualSelecao').value = concurso;
                if (bolao) document.getElementById('bolaoIndividualSelecao').value = bolao;
                document.getElementById('tipoCartaoIndividualSelecao').value = tipo;
            } else {
                modoDigitacao.style.display = 'block';
                modoSelecao.style.display = 'none';
                statusModo.textContent = '(Digitação manual)';
                statusModo.style.color = '#64748b';
                const concurso = document.getElementById('concursoIndividualSelecao').value;
                const bolao = document.getElementById('bolaoIndividualSelecao').value;
                const tipo = document.getElementById('tipoCartaoIndividualSelecao').value;
                if (concurso) document.getElementById('concursoIndividual').value = concurso;
                if (bolao) document.getElementById('bolaoIndividual').value = bolao;
                document.getElementById('tipoCartaoIndividual').value = tipo;
                numerosSelecionados = [];
                atualizarGradeSelecaoVisual();
                atualizarContadorSelecao();
                atualizarPreviaSelecao();
            }
        });
    }
    
    document.getElementById('btnSelecaoAnterior')?.addEventListener('click', () => navegarSelecao(-1));
    document.getElementById('btnSelecaoProximo')?.addEventListener('click', () => navegarSelecao(1));
    document.getElementById('btnAdicionarSelecao')?.addEventListener('click', adicionarCartaoSelecaoAtual);
    document.getElementById('btnPreencherSelecaoTexto')?.addEventListener('click', preencherSelecaoPorTexto);
    document.getElementById('numerosTextoSelecao')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); preencherSelecaoPorTexto(); }
    });
    
    document.getElementById('btnLimparSelecao')?.addEventListener('click', function() {
        // Fechar o diálogo (Esc/X) o navegador trata como "Cancelar" — por
        // isso a ação destrutiva ("limpar todos") só roda com OK explícito;
        // Cancelar/Esc cai no caminho seguro (limpar só a seleção atual).
        if (todosCartoesSelecao.length > 0) {
            if (confirm('Limpar TODOS os cartões da seleção (não só o atual)?\n\n"OK" = limpar todos\n"Cancelar" = limpar só a seleção atual')) {
                limparTodosCartoesSelecao();
                return;
            }
        }
        numerosSelecionados = [];
        atualizarGradeSelecaoVisual();
        atualizarContadorSelecao();
        atualizarPreviaSelecao();
        showToast('🧹 Seleção limpa!', 'info');
    });
    
    inicializarGradeSelecaoIndividual();
    atualizarTotalCartoesSelecao();

    // Carregar estatísticas avançadas
setTimeout(() => {
    carregarEstatisticasDashboard();
}, 1000);
});