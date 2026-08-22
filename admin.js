// ============================================
// SEGURANÇA - SENHA COM HASH MD5
// ============================================
const SENHA_HASH = '47cf2362b07097105d643ee5b1612df7';

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
// VARIÁVEIS DO CADASTRO POR IMAGEM (OCR)
// ============================================
let numerosExtraidos = [];
let imagemProcessada = false;

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
// INICIALIZAR GRADE DE SELEÇÃO INDIVIDUAL (6x10)
// ============================================
function inicializarGradeSelecaoIndividual() {
    const grade = document.getElementById('gradeSelecaoIndividual');
    if (!grade) return;
    
    let totalNumeros = 60;
    if (loteriaAdmin === 'lotofacil') totalNumeros = 25;
    else if (loteriaAdmin === 'quina') totalNumeros = 80;
    else totalNumeros = 60;
    
    grade.style.gridTemplateColumns = 'repeat(10, 1fr)';
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
            btn.style.background = '#3b82f6';
            btn.style.color = 'white';
            btn.style.borderColor = '#3b82f6';
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
        const cor = numerosSelecionados.length >= minNumeros ? '#10b981' : '#3b82f6';
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
        html += `<span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 13px;">${n.toString().padStart(2, '0')}</span>`;
    }
    previa.innerHTML = html;
}

// ============================================
// ATUALIZAR TOTAL DE CARTÕES DA SELEÇÃO
// ============================================
function atualizarTotalCartoesSelecao() {
    document.getElementById('totalCartoesSelecao').textContent = todosCartoesSelecao.length || 1;
}

// ============================================
// NAVEGAÇÃO ENTRE CARTÕES DA SELEÇÃO
// ============================================
function navegarSelecao(direcao) {
    const total = todosCartoesSelecao.length || 1;
    cartaoAtualSelecao += direcao;
    if (cartaoAtualSelecao < 0) cartaoAtualSelecao = total - 1;
    if (cartaoAtualSelecao >= total) cartaoAtualSelecao = 0;
    
    document.getElementById('cartaoSelecaoAtual').textContent = cartaoAtualSelecao + 1;
    document.getElementById('totalCartoesSelecao').textContent = total;
    
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
// FUNÇÃO MD5
// ============================================
function md5(string) {
    // Função MD5 completa... (mantenha a que você já tem)
    // Por questões de espaço, mantive a sua função existente
    // Certifique-se de que ela está completa no seu arquivo
}

// ============================================
// AUTENTICAÇÃO
// ============================================
function verificarAutenticacao() {
    const autenticado = localStorage.getItem('admin_autenticado');
    const modal = document.getElementById('authModal');
    const senhaInput = document.getElementById('senhaAdmin');
    
    console.log('🔐 Verificando autenticação...');
    console.log('📌 localStorage.admin_autenticado =', autenticado);
    console.log('📌 Modal encontrado?', modal ? 'SIM' : 'NÃO');
    
    if (!modal) {
        console.error('❌ Modal de autenticação não encontrado!');
        return;
    }
    
    if (!autenticado) {
        console.log('🔐 Usuário NÃO autenticado. Exibindo modal...');
        modal.classList.add('show');
        modal.style.display = 'flex';
        if (senhaInput) {
            senhaInput.value = '';
            setTimeout(() => {
                senhaInput.focus();
                if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
                    senhaInput.click();
                }
            }, 300);
        }
    } else {
        console.log('✅ Usuário já autenticado. Ocultando modal...');
        modal.classList.remove('show');
        modal.style.display = 'none';
        carregarPixConfig();
        carregarDadosAdmin();
    }
}

function autenticar() {
    const senha = document.getElementById('senhaAdmin').value;
    console.log('🔑 Tentando autenticar...');
    
    const hashDigitado = md5(senha);
    console.log('📌 Hash digitado:', hashDigitado);
    console.log('📌 Hash esperado:', SENHA_HASH);
    
    if (hashDigitado === SENHA_HASH) {
        localStorage.setItem('admin_autenticado', 'true');
        console.log('✅ Login realizado com sucesso!');
        showToast('✅ Login realizado!', 'success');
        verificarAutenticacao();
    } else {
        console.log('❌ Senha incorreta!');
        showToast('❌ Senha incorreta!', 'error');
        document.getElementById('senhaAdmin').value = '';
        document.getElementById('senhaAdmin').focus();
    }
}

function sair() {
    localStorage.removeItem('admin_autenticado');
    showToast('🔒 Saiu do sistema', 'info');
    verificarAutenticacao();
}

function forcarLogin() {
    localStorage.removeItem('admin_autenticado');
    showToast('🔐 Forçando login...', 'info');
    verificarAutenticacao();
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
// ADICIONAR CARTÃO VIA SELEÇÃO
// ============================================
async function adicionarCartaoIndividualSelecao() {
    const concurso = document.getElementById('concursoIndividualSelecao').value;
    const bolao = document.getElementById('bolaoIndividualSelecao').value || 'Sem Bolão';
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
        document.getElementById('concursoIndividualSelecao').value = '';
        document.getElementById('bolaoIndividualSelecao').value = '';
        carregarDadosAdmin();
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao adicionar', 'error');
    }
}

// ============================================
// FUNÇÕES DO CADASTRO POR IMAGEM (OCR)
// ============================================
function mostrarPreviaImagem(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('imgPreviewSrc');
        img.src = e.target.result;
        document.getElementById('imgPreview').style.display = 'block';
        document.getElementById('imgResultado').style.display = 'none';
        document.getElementById('imgLoading').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

async function processarImagem(file) {
    const loading = document.getElementById('imgLoading');
    const resultado = document.getElementById('imgResultado');
    const status = document.getElementById('imgStatus');
    const container = document.getElementById('imgNumerosExtracao');
    
    loading.style.display = 'block';
    resultado.style.display = 'none';
    status.textContent = '🔄 Processando...';
    
    try {
        const imageUrl = URL.createObjectURL(file);
        const result = await Tesseract.recognize(imageUrl, 'por', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    status.textContent = `🔄 ${Math.round(m.progress * 100)}% concluído...`;
                }
            }
        });
        
        URL.revokeObjectURL(imageUrl);
        
        const texto = result.data.text;
        console.log('📝 Texto extraído:', texto);
        
        const numeros = extrairNumerosDoTexto(texto);
        
        if (numeros.length === 0) {
            status.textContent = '❌ Nenhum número encontrado! Tente outra imagem.';
            container.innerHTML = '<div style="color: #ef4444;">Nenhum número foi identificado. Verifique a qualidade da imagem.</div>';
            loading.style.display = 'none';
            return;
        }
        
        numerosExtraidos = numeros;
        imagemProcessada = true;
        
        let html = '';
        const linhas = agruparNumerosEmLinhas(numeros);
        
        html += `<div style="margin-bottom: 10px; color: #10b981; font-weight: 600;">✅ ${linhas.length} cartões identificados</div>`;
        html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">`;
        
        linhas.forEach((linha, index) => {
            const numsStr = linha.map(n => n.toString().padStart(2, '0')).join(' ');
            html += `
                <div style="background: white; border-radius: 8px; padding: 6px 10px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 600; color: #64748b; font-size: 11px;">#${index+1}</span>
                    <input type="text" class="img-cartao-edit" data-index="${index}" value="${numsStr}" style="flex: 1; border: none; background: transparent; font-family: monospace; font-size: 12px; outline: none; padding: 4px;">
                </div>
            `;
        });
        html += `</div>`;
        html += `<div style="margin-top: 12px; font-size: 11px; color: #64748b;">💡 Clique nos números para editar se necessário.</div>`;
        
        container.innerHTML = html;
        status.textContent = `✅ ${linhas.length} cartões extraídos`;
        resultado.style.display = 'block';
        loading.style.display = 'none';
        
        showToast(`✅ ${linhas.length} cartões identificados!`, 'success');
        
    } catch (error) {
        console.error('Erro no OCR:', error);
        status.textContent = '❌ Erro ao processar imagem';
        container.innerHTML = `<div style="color: #ef4444;">Erro: ${error.message}</div>`;
        loading.style.display = 'none';
        showToast('❌ Erro ao processar imagem', 'error');
    }
}

function extrairNumerosDoTexto(texto) {
    const numeros = [];
    const matches = texto.match(/\b\d{1,2}\b/g);
    if (matches) {
        for (const m of matches) {
            const num = parseInt(m);
            if (num >= 1 && num <= 99) {
                numeros.push(num);
            }
        }
    }
    return numeros;
}

function agruparNumerosEmLinhas(numeros) {
    const loteria = document.getElementById('imgLoteria').value;
    let porLinha = 15;
    if (loteria === 'mega') porLinha = 6;
    else if (loteria === 'quina') porLinha = 5;
    
    const linhas = [];
    for (let i = 0; i < numeros.length; i += porLinha) {
        const linha = numeros.slice(i, i + porLinha);
        if (linha.length >= porLinha) {
            linhas.push(linha);
        } else {
            if (linhas.length > 0 && linhas[linhas.length - 1].length < porLinha * 2) {
                const ultima = linhas[linhas.length - 1];
                const faltam = porLinha - ultima.length;
                for (let j = 0; j < Math.min(faltam, linha.length); j++) {
                    ultima.push(linha[j]);
                }
            } else if (linha.length > 0) {
                linhas.push(linha);
            }
        }
    }
    return linhas;
}

function getCartoesEditados() {
    const inputs = document.querySelectorAll('.img-cartao-edit');
    const cartoes = [];
    inputs.forEach(input => {
        const numeros = input.value.trim().split(/\s+/).map(Number).filter(n => n > 0);
        if (numeros.length > 0) {
            cartoes.push(numeros);
        }
    });
    return cartoes;
}

async function cadastrarCartoesImagem() {
    const loteria = document.getElementById('imgLoteria').value;
    const concurso = document.getElementById('imgConcurso').value.trim();
    const bolao = document.getElementById('imgBolao').value.trim() || 'Bolão por Imagem';
    const tipo = document.getElementById('imgTipo').value;
    
    if (!concurso) {
        showToast('⚠️ Informe o concurso!', 'warning');
        return;
    }
    
    const cartoes = getCartoesEditados();
    if (cartoes.length === 0) {
        showToast('⚠️ Nenhum cartão válido para cadastrar', 'warning');
        return;
    }
    
    let minNumeros, maxNumeros, maxValor;
    if (loteria === 'mega') {
        minNumeros = 6; maxNumeros = 20; maxValor = 60;
    } else if (loteria === 'lotofacil') {
        minNumeros = 15; maxNumeros = 20; maxValor = 25;
    } else {
        minNumeros = 5; maxNumeros = 15; maxValor = 80;
    }
    
    let validos = 0;
    let erros = 0;
    let mensagemErro = '';
    
    for (const cartao of cartoes) {
        if (cartao.length < minNumeros) {
            erros++;
            mensagemErro += `Cartão com ${cartao.length} números (mínimo ${minNumeros})\n`;
            continue;
        }
        if (cartao.length > maxNumeros) {
            erros++;
            mensagemErro += `Cartão com ${cartao.length} números (máximo ${maxNumeros})\n`;
            continue;
        }
        if (cartao.some(n => n < 1 || n > maxValor)) {
            erros++;
            mensagemErro += `Cartão com número fora do range (1-${maxValor})\n`;
            continue;
        }
        const unicos = new Set(cartao);
        if (unicos.size !== cartao.length) {
            erros++;
            mensagemErro += `Cartão com números duplicados\n`;
            continue;
        }
        validos++;
    }
    
    if (erros > 0) {
        showToast(`⚠️ ${erros} cartão(ões) inválidos!`, 'warning');
        return;
    }
    
    const confirmar = confirm(
        `📌 CONFIRMAR CADASTRO\n\n` +
        `🎯 ${cartoes.length} cartões\n` +
        `📌 Concurso: ${concurso}\n` +
        `👥 Bolão: ${bolao}\n` +
        `🎲 ${loteria.toUpperCase()}\n\n` +
        `Confirmar?`
    );
    if (!confirmar) return;
    
    showLoading('Cadastrando cartões...');
    
    let adicionados = 0;
    let errosCadastro = 0;
    
    for (const cartao of cartoes) {
        const numeros = [...cartao].sort((a,b) => a-b);
        try {
            await db.collection('cartoes').add({
                concurso: concurso,
                bolao: bolao,
                numeros: numeros,
                tipo: loteria,
                tipoParticipacao: tipo,
                admin: true,
                dataCadastro: new Date().toISOString(),
                totalNumeros: numeros.length
            });
            adicionados++;
        } catch (error) {
            errosCadastro++;
        }
    }
    
    hideLoading();
    
    if (adicionados > 0) {
        showToast(`✅ ${adicionados} cartões cadastrados! ${errosCadastro > 0 ? `⚠️ ${errosCadastro} erros` : ''}`, 'success');
        document.getElementById('imgConcurso').value = '';
        document.getElementById('imgResultado').style.display = 'none';
        document.getElementById('imgPreview').style.display = 'none';
        document.getElementById('imgUpload').value = '';
        document.getElementById('imgUploadCamera').value = '';
        numerosExtraidos = [];
        imagemProcessada = false;
        carregarDadosAdmin();
    } else {
        showToast('❌ Nenhum cartão foi cadastrado', 'error');
    }
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
        
        // ============================================
        // APÓS CARREGAR OS DADOS, ATUALIZAR AS ABAS SE ESTIVEREM VISÍVEIS
        // ============================================
        const tabBoloes = document.getElementById('tab-boloes');
        if (tabBoloes && tabBoloes.style.display === 'block') {
            carregarBoloesParaGerenciar();
        }
        const tabTokens = document.getElementById('tab-tokens');
        if (tabTokens && tabTokens.style.display === 'block') {
            carregarTokens();
        }
        const tabReservas = document.getElementById('tab-reservas');
        if (tabReservas && tabReservas.style.display === 'block') {
            carregarReservas();
        }
        const tabCartoes = document.getElementById('tab-cartoes');
        if (tabCartoes && tabCartoes.style.display === 'block') {
            exibirCartoesAdmin();
        }
        
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
    
    const ordenarPor = document.getElementById('ordenarPorLista')?.value || 'concurso_desc';
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
    const fontSize = loteriaAdmin === 'mega' ? '12px' : (loteriaAdmin === 'lotofacil' ? '10px' : '11px');
    
    for (const cartao of cartoesFiltrados) {
        const dataFormatada = cartao.dataCadastro ? new Date(cartao.dataCadastro).toLocaleDateString('pt-BR') : 'Data não disponível';
        const tipoParticipacao = cartao.tipoParticipacao === 'cota' ? '🎟️ Cota' : '👥 Exclusivo';
        
        html += `
            <div class="cartao-item" style="border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:10px; background:#f8fafc;">
                <div style="display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap;">
                    <div><input type="checkbox" class="checkbox-cartao" data-id="${cartao.id}" style="width:22px; height:22px;"></div>
                    <div style="flex:1; min-width:150px;">
                        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                            <div>
                                <strong>Cartão #${cartao.id ? cartao.id.slice(-6) : '???'}</strong>
                                <span style="font-size:11px; color:#64748b; margin-left:8px;">${tipoParticipacao}</span>
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button class="btn-editar" data-id="${cartao.id}" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;">✏️ Editar</button>
                                <button class="btn-duplicar" data-id="${cartao.id}" style="background:#8b5cf6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;">📋 Duplicar</button>
                            </div>
                        </div>
                        <div style="font-size:12px; color:#666; margin:5px 0;">
                            Concurso ${cartao.concurso} | Bolão: ${cartao.bolao || 'Sem Bolão'} | 📅 ${dataFormatada}
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                            ${cartao.numeros.map(n => `<span style="background:#e2e8f0; padding:5px 10px; border-radius:6px; font-family:monospace; font-size:${fontSize};">${n.toString().padStart(2,'0')}</span>`).join('')}
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
    
    document.querySelectorAll('.btn-duplicar').forEach(btn => {
        btn.addEventListener('click', function() {
            duplicarCartao(this.dataset.id);
        });
    });
    
    function atualizarContador() {
        const qtd = document.querySelectorAll('.checkbox-cartao:checked').length;
        const btnExcluir = document.getElementById('btnExcluirSelecionados');
        if (btnExcluir) btnExcluir.innerHTML = qtd > 0 ? `🗑️ EXCLUIR (${qtd})` : '🗑️ EXCLUIR';
    }
    document.querySelectorAll('.checkbox-cartao').forEach(cb => cb.onchange = atualizarContador);
    atualizarContador();
    
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
// ATUALIZAR DASHBOARD
// ============================================
function atualizarDashboardAdmin() {
    let abertos = 0;
    let andamento = 0;
    let encerrados = 0;
    
    db.collection('config_boloes').doc('ativos').get().then(configDoc => {
        if (configDoc.exists) {
            const dados = configDoc.data();
            const statusMap = dados.status || {};
            for (const id in statusMap) {
                const status = statusMap[id];
                if (status === 'aberto') abertos++;
                else if (status === 'andamento') andamento++;
                else if (status === 'encerrado') encerrados++;
            }
        }
        
        const abertosEl = document.getElementById('dashboardAbertos');
        const andamentoEl = document.getElementById('dashboardAndamento');
        const encerradosEl = document.getElementById('dashboardEncerrados');
        
        if (abertosEl) abertosEl.innerHTML = abertos;
        if (andamentoEl) andamentoEl.innerHTML = andamento;
        if (encerradosEl) encerradosEl.innerHTML = encerrados;
    }).catch(error => {
        console.error('Erro ao carregar status dos bolões:', error);
    });
}

// ============================================
// ADICIONAR CARTÕES (CADASTRO TRADICIONAL)
// ============================================
async function adicionarCartoes() {
    const concurso = document.getElementById('concurso').value;
    const bolao = document.getElementById('bolao').value || 'Sem Bolão';
    const tipoParticipacao = document.getElementById('tipoCartao').value;
    const texto = document.getElementById('numerosCartoes').value;
    
    if (!concurso) { showToast('⚠️ Informe o concurso!', 'warning'); return; }
    if (!texto.trim()) { showToast('⚠️ Informe os números!', 'warning'); return; }
    
    const linhas = texto.split('\n');
    let adicionados = 0;
    let erros = 0;
    
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
    
    for (const linha of linhas) {
        if (!linha.trim()) continue;
        
        const numeros = linha.match(/\d+/g).map(Number);
        
        if (numeros.length < minNumeros) { 
            erros++; 
            continue; 
        }
        
        if (numeros.length > maxNumeros) {
            erros++;
            continue;
        }
        
        const numerosUnicos = [...new Set(numeros)];
        if (numerosUnicos.length !== numeros.length) { 
            erros++; 
            continue; 
        }
        
        if (numeros.some(n => n < 1 || n > maxValor)) { 
            erros++; 
            continue; 
        }
        
        numeros.sort((a,b) => a-b);
        
        try {
            await db.collection('cartoes').add({ 
                concurso, 
                bolao, 
                numeros, 
                tipo: loteriaAdmin, 
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
    
    if (adicionados > 0) {
        showToast(`✅ ${adicionados} cartões adicionados à ${label}!`, 'success');
        document.getElementById('numerosCartoes').value = '';
        carregarDadosAdmin();
    } else {
        let msg = `❌ Nenhum cartão adicionado. `;
        if (loteriaAdmin === 'mega') msg += `MEGA: 6 a 20 números (1-60).`;
        else if (loteriaAdmin === 'lotofacil') msg += `LOTOFÁCIL: 15 a 20 números (1-25).`;
        else msg += `QUINA: 5 a 15 números (1-80).`;
        showToast(msg, 'error');
    }
}

function limparFormulario() { 
    document.getElementById('numerosCartoes').value = ''; 
    showToast('🧹 Formulário limpo', 'info'); 
}

function recarregarLista() { 
    carregarDadosAdmin(); 
    showToast('🔄 Dados recarregados', 'info'); 
}

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
                
                <button id="salvarEdicao" style="width: 100%; padding: 14px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer;">
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
// DUPLICAR CARTÃO
// ============================================
async function duplicarCartao(id) {
    const doc = await db.collection('cartoes').doc(id).get();
    const original = doc.data();
    const tipoParticipacao = document.getElementById('tipoCartao').value;
    
    const novoConcurso = prompt('Novo Concurso:', original.concurso);
    if (!novoConcurso) return;
    const novoBolao = prompt('Novo Bolão:', original.bolao || 'Sem Bolão');
    if (!novoBolao) return;
    
    if (!confirm(`Confirmar duplicação?\nConcurso: ${novoConcurso}\nBolão: ${novoBolao}\nNúmeros: ${original.numeros.join(', ')}`)) return;
    
    await db.collection('cartoes').add({ 
        concurso: novoConcurso, 
        bolao: novoBolao, 
        numeros: original.numeros, 
        tipo: loteriaAdmin, 
        tipoParticipacao: tipoParticipacao,
        admin: true,
        dataCadastro: new Date().toISOString(), 
        totalNumeros: original.numeros.length 
    });
    showToast('✅ Cartão duplicado!', 'success');
    carregarDadosAdmin();
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
    
    const nomesBoloes = [];
    const concursos = [];
    selecionados.forEach(cb => {
        const cartaoId = cb.dataset.id;
        const cartao = cartoes.find(c => c.id === cartaoId);
        if (cartao) {
            if (!nomesBoloes.includes(cartao.bolao)) nomesBoloes.push(cartao.bolao);
            if (!concursos.includes(cartao.concurso)) concursos.push(cartao.concurso);
        }
    });
    
    const mensagemConfirmacao = 
        `⚠️ ATENÇÃO! ⚠️\n\n` +
        `Você está prestes a excluir ${selecionados.length} cartão(ões).\n\n` +
        `📌 Bolões afetados: ${nomesBoloes.join(', ') || 'Não identificado'}\n` +
        `📌 Concursos: ${concursos.join(', ') || 'Não identificado'}\n\n` +
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
        console.log(`🗑️ Tentando excluir cartão: ${id}`);
        
        try {
            await db.collection('cartoes').doc(id).delete();
            console.log(`✅ Cartão ${id} excluído do Firebase`);
            excluidos++;
            idsExcluidos.push(id);
        } catch (error) {
            console.error(`❌ Erro ao excluir ${id}:`, error);
            erros++;
        }
    }
    
    hideLoading();
    
    if (excluidos > 0) {
        showToast(`✅ ${excluidos} cartão(ões) excluído(s) com sucesso! ${erros > 0 ? `⚠️ ${erros} erro(s)` : ''}`, 'success');
        cartoes = cartoes.filter(c => !idsExcluidos.includes(c.id));
        await carregarDadosAdmin();
        const totalDiv = document.getElementById('totalCartoes');
        if (totalDiv) {
            const total = cartoes.filter(c => c.tipo === loteriaAdmin).length;
            totalDiv.innerHTML = total + ' cartões';
        }
        atualizarContadorSelecionados();
        showToast(`✅ ${excluidos} cartões removidos permanentemente!`, 'success');
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
function importarExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.csv';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const concurso = prompt('Concurso:'); if (!concurso) return;
        const bolao = prompt('Bolão:'); if (!bolao) return;
        
        const reader = new FileReader();
        reader.onload = async function(event) {
            const linhas = event.target.result.split(/\r?\n/);
            let adicionados = 0;
            const minNumeros = loteriaAdmin === 'mega' ? 6 : (loteriaAdmin === 'lotofacil' ? 15 : 5);
            
            for (const linha of linhas) {
                if (!linha.trim()) continue;
                const numeros = linha.match(/\d+/g).map(Number);
                if (numeros.length < minNumeros) continue;

                const numerosUnicos = [...new Set(numeros)];
                if (numerosUnicos.length !== numeros.length) continue;

                const maxValor = loteriaAdmin === 'mega' ? 60 : (loteriaAdmin === 'lotofacil' ? 25 : 80);
                if (numeros.some(n => n < 1 || n > maxValor)) continue;

                numeros.sort((a,b) => a-b);
                await db.collection('cartoes').add({ 
                    concurso, 
                    bolao, 
                    numeros, 
                    tipo: loteriaAdmin, 
                    admin: true,
                    dataCadastro: new Date().toISOString(), 
                    totalNumeros: numeros.length 
                });
                adicionados++;
            }
            showToast(`📥 ${adicionados} cartões importados!`, 'success');
            carregarDadosAdmin();
        };
        reader.readAsText(file);
    };
    input.click();
}

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
                <button id="btnCopiarLink" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;">📋 COPIAR LINK</button>
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
                this.style.background = '#3b82f6';
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
    const botoes = document.querySelectorAll('.numero-btn');
    botoes.forEach(btn => {
        const num = parseInt(btn.dataset.numero);
        if (cartao.includes(num)) {
            btn.classList.add('selecionado');
            btn.style.background = '#3b82f6';
            btn.style.color = 'white';
            btn.style.borderColor = '#3b82f6';
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
        contador.style.color = cartao.length === MAX_NUMEROS_LOTOFACIL ? '#10b981' : '#3b82f6';
    }
}

function atualizarPrevia() {
    const container = document.getElementById('previaCartoes');
    if (!container) return;
    
    if (cartoesLote.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8;">Nenhum cartão cadastrado ainda</div>';
        return;
    }
    
    let html = '';
    const maxExibir = Math.min(cartoesLote.length, 20);
    for (let i = 0; i < maxExibir; i++) {
        const numeros = cartoesLote[i] || [];
        const preenchido = numeros.length === MAX_NUMEROS_LOTOFACIL;
        const status = preenchido ? '✅' : '❌';
        const cor = preenchido ? '#10b981' : '#ef4444';
        const numsStr = numeros.map(n => n.toString().padStart(2, '0')).join(' ');
        html += `<div style="color: ${cor};">
            #${i+1}: ${numsStr || '(vazio)'} ${status}
        </div>`;
    }
    if (cartoesLote.length > maxExibir) {
        html += `<div style="color: #94a3b8;">... e mais ${cartoesLote.length - maxExibir} cartões</div>`;
    }
    container.innerHTML = html;
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

// ============================================
// CARREGAR BOLÕES PARA GERENCIAR (CORRIGIDO)
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
                        <input type="checkbox" class="checkbox-bolao" data-id="${bolao.id}" ${checked} style="width: 20px; height: 20px; cursor: pointer; accent-color: #3b82f6; flex-shrink: 0;">
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
                        <button class="btn-link-participantes" data-id="${bolao.id}" data-titulo="${bolao.titulo}" style="background: #3b82f6; color: white; border: none; padding: 4px 14px; border-radius: 20px; cursor: pointer; font-size: 11px; font-weight: 600;">📋 LINK</button>
                        <button class="btn-excluir-bolao" data-id="${bolao.id}" data-titulo="${bolao.titulo}" style="background: #ef4444; color: white; border: none; padding: 4px 14px; border-radius: 20px; cursor: pointer; font-size: 11px; font-weight: 600;">🗑️ EXCLUIR</button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // ============================================
        // EVENTOS
        // ============================================
        
        // 1. Switch de Destaque
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
        
        // 2. Checkbox de seleção
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
        
        // 3. Status, Data e Estratégia
        document.querySelectorAll('.status-select, .data-limite-input, .estrategia-textarea').forEach(el => {
            el.addEventListener('change', () => {
                setTimeout(() => salvarConfigBoloes(), 100);
            });
        });
        
        // 4. Botões de excluir
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
// DEMAS FUNÇÕES (excluirBolao, salvarConfigBoloes, etc.)
// ============================================
// [Mantenha todas as funções que já existem no seu arquivo]
// Incluindo: excluirBolao, salvarConfigBoloes, carregarBoloesNoSelectRapido, 
// adicionarParticipanteRapido, gerarListaWhatsApp, carregarTokens, salvarToken,
// formatarTelefone, carregarBoloesSelectParticipantes, handleSelectChange,
// carregarParticipantesAdmin, carregarReservas, handlerHistorico,
// mostrarHistorico, copiarHistoricoWhatsApp

// ============================================
// INICIALIZAÇÃO (DOMContentLoaded)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Admin inicializado');
    verificarAutenticacao();
    
    const btnAutenticar = document.getElementById('btnAutenticar');
    const btnSair = document.getElementById('btnSair');
    const btnAdicionar = document.getElementById('btnAdicionar');
    const btnLimpar = document.getElementById('btnLimpar');
    const btnRecarregar = document.getElementById('btnRecarregar');
    const btnExcluirSelecionados = document.getElementById('btnExcluirSelecionados');
    const btnImportarExcel = document.getElementById('btnImportarExcel');
    const btnSalvarPix = document.getElementById('btnSalvarPix');
    const btnAdicionarRapido = document.getElementById('btnAdicionarRapido');
    const btnGerarWhatsApp = document.getElementById('btnGerarWhatsApp');
    const btnSalvarSelecao = document.getElementById('btnSalvarSelecao');
    const btnExportar = document.getElementById('btnExportarExcel');
    const filtroConcurso = document.getElementById('filtroConcursoLista');
    const ordenarPor = document.getElementById('ordenarPorLista');
    const senhaAdmin = document.getElementById('senhaAdmin');
    const btnGerarToken = document.getElementById('btnGerarToken');
    const btnAtualizarReservas = document.getElementById('btnAtualizarReservas');
    
    const adminBtnMega = document.getElementById('adminBtnMega');
    const adminBtnLotofacil = document.getElementById('adminBtnLotofacil');
    const adminBtnQuina = document.getElementById('adminBtnQuina');
    
    const btnForcarRecarregar = document.getElementById('btnForcarRecarregar');
    
    if (btnAutenticar) btnAutenticar.onclick = autenticar;
    if (btnSair) btnSair.onclick = sair;
    if (adminBtnMega) adminBtnMega.onclick = () => setLoteriaAdmin('mega');
    if (adminBtnLotofacil) adminBtnLotofacil.onclick = () => setLoteriaAdmin('lotofacil');
    if (adminBtnQuina) adminBtnQuina.onclick = () => setLoteriaAdmin('quina');
    if (btnAdicionar) btnAdicionar.onclick = adicionarCartoes;
    if (btnLimpar) btnLimpar.onclick = limparFormulario;
    if (btnRecarregar) btnRecarregar.onclick = recarregarLista;
    if (btnExcluirSelecionados) btnExcluirSelecionados.onclick = excluirSelecionados;
    if (btnImportarExcel) btnImportarExcel.onclick = importarExcel;
    if (btnSalvarPix) btnSalvarPix.onclick = salvarPixConfig;
    if (btnAdicionarRapido) btnAdicionarRapido.onclick = adicionarParticipanteRapido;
    if (btnGerarWhatsApp) btnGerarWhatsApp.onclick = gerarListaWhatsApp;
    if (btnSalvarSelecao) btnSalvarSelecao.addEventListener('click', salvarConfigBoloes);
    if (btnExportar) btnExportar.onclick = exportarCartoes;
    if (filtroConcurso) filtroConcurso.onchange = exibirCartoesAdmin;
    if (ordenarPor) ordenarPor.onchange = exibirCartoesAdmin;
    if (senhaAdmin) senhaAdmin.onkeypress = (e) => { if (e.key === 'Enter') autenticar(); };
    
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
    
    if (btnForcarRecarregar) {
        btnForcarRecarregar.addEventListener('click', function() {
            showToast('🔄 Forçando recarregamento da lista...', 'info');
            carregarDadosAdmin();
        });
    }
    
    setTimeout(() => {
        console.log('🔄 Carregando dados das abas...');
        carregarBoloesParaGerenciar();
        carregarBoloesNoSelectRapido();
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
    
    adminBtnMega.addEventListener('click', () => {
        setTimeout(atualizarVisibilidadeLote, 200);
    });
    adminBtnLotofacil.addEventListener('click', () => {
        setTimeout(atualizarVisibilidadeLote, 200);
    });
    adminBtnQuina.addEventListener('click', () => {
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
    
    document.getElementById('btnLimparSelecao')?.addEventListener('click', function() {
        if (todosCartoesSelecao.length > 0) {
            if (!confirm('Limpar apenas a seleção atual ou todos os cartões?\n\n"OK" = Limpar seleção atual\n"Cancelar" = Limpar todos os cartões')) {
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
    
    const imgUpload = document.getElementById('imgUpload');
    const imgUploadCamera = document.getElementById('imgUploadCamera');
    
    if (imgUpload) {
        imgUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 10 * 1024 * 1024) {
                    showToast('⚠️ Imagem muito grande! Máx: 10MB', 'warning');
                    this.value = '';
                    return;
                }
                mostrarPreviaImagem(file);
            }
        });
    }
    
    if (imgUploadCamera) {
        imgUploadCamera.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 10 * 1024 * 1024) {
                    showToast('⚠️ Imagem muito grande! Máx: 10MB', 'warning');
                    this.value = '';
                    return;
                }
                mostrarPreviaImagem(file);
            }
        });
    }
    
    document.getElementById('btnProcessarImagem')?.addEventListener('click', function() {
        let file = document.getElementById('imgUpload').files[0];
        if (!file) {
            file = document.getElementById('imgUploadCamera').files[0];
        }
        if (!file) {
            showToast('⚠️ Selecione uma imagem primeiro!', 'warning');
            return;
        }
        processarImagem(file);
    });
    
    document.getElementById('btnCadastrarImagem')?.addEventListener('click', cadastrarCartoesImagem);
    
    document.getElementById('btnLimparImagem')?.addEventListener('click', function() {
        document.getElementById('imgResultado').style.display = 'none';
        document.getElementById('imgPreview').style.display = 'none';
        document.getElementById('imgUpload').value = '';
        document.getElementById('imgUploadCamera').value = '';
        numerosExtraidos = [];
        imagemProcessada = false;
        document.getElementById('imgStatus').textContent = 'Aguardando processamento';
        showToast('🧹 Limpo!', 'info');
    });
    
    const csvUpload = document.getElementById('csvUpload');
    if (csvUpload) {
        csvUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (!file.name.endsWith('.csv')) {
                    showToast('⚠️ Selecione um arquivo CSV!', 'warning');
                    this.value = '';
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    showToast('⚠️ Arquivo muito grande! Máx: 5MB', 'warning');
                    this.value = '';
                    return;
                }
                lerCSV(file);
            }
        });
    }
    
    document.getElementById('btnImportarCSV')?.addEventListener('click', importarCSV);
    document.getElementById('btnLimparCSV')?.addEventListener('click', function() {
        document.getElementById('csvPreview').style.display = 'none';
        document.getElementById('csvUpload').value = '';
        dadosCSV = [];
        document.getElementById('csvStatus').textContent = 'Aguardando arquivo';
        showToast('🧹 Limpo!', 'info');
    });
    
    setTimeout(() => {
        console.log('🔄 Fallback: forçando exibição das abas...');
        const tabCadastro = document.getElementById('tab-cadastro');
        if (tabCadastro) {
            tabCadastro.style.display = 'block';
            tabCadastro.classList.add('active');
            console.log('✅ Aba CADASTRO forçada pelo fallback');
        }
        const primeiraAba = document.querySelector('.tab-btn.active');
        if (!primeiraAba) {
            const btn = document.querySelector('.tab-btn');
            if (btn) {
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                const tabContent = document.getElementById(tabId);
                if (tabContent) {
                    tabContent.style.display = 'block';
                    tabContent.classList.add('active');
                }
            }
        }
        carregarBoloesParaGerenciar();
        carregarTokens();
        carregarReservas();
        exibirCartoesAdmin();
    }, 500);
    
    setTimeout(() => {
        const modal = document.getElementById('authModal');
        if (modal && !modal.classList.contains('show') && !localStorage.getItem('admin_autenticado')) {
            console.log('⚠️ Forçando exibição do modal de autenticação...');
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
    }, 500);
});