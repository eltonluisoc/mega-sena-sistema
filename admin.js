const SENHA_HASH = '47cf2362b07097105d643ee5b1612df7'; 
let cartoes = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let resultadosQuina = {};
let loteriaAdmin = 'mega';
let cartoesFiltrados = [];
let boloes = [];

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
// FUNÇÃO MD5 PARA HASH DA SENHA
// ============================================
function md5(string) {
    function rotateLeft(value, bits) {
        return (value << bits) | (value >>> (32 - bits));
    }

    function addUnsigned(x, y) {
        var x4 = x & 0x40000000;
        var y4 = y & 0x40000000;
        var x8 = x & 0x80000000;
        var y8 = y & 0x80000000;
        var result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
        if (x4 & y4) return (result ^ 0x80000000 ^ x8 ^ y8);
        if (x4 | y4) {
            if (result & 0x40000000) return (result ^ 0xC0000000 ^ x8 ^ y8);
            else return (result ^ 0x40000000 ^ x8 ^ y8);
        } else {
            return (result ^ x8 ^ y8);
        }
    }

    function md5Cycle(x, y, z, w, a, b, c, d, s, t) {
        a = addUnsigned(a, addUnsigned(addUnsigned(y, z), addUnsigned(x, t)));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function md5Hex(byteArray) {
        var hex = '';
        for (var i = 0; i < byteArray.length; i++) {
            var b = byteArray[i];
            if (b < 0) b += 256;
            hex += ('0' + b.toString(16)).slice(-2);
        }
        return hex;
    }

    function md5Binary(string) {
        var stringBytes = [];
        for (var i = 0; i < string.length; i++) {
            stringBytes.push(string.charCodeAt(i));
        }
        return md5BinaryFromBytes(stringBytes);
    }

    function md5BinaryFromBytes(bytes) {
        var msg = bytes.slice();
        var originalLength = msg.length * 8;
        msg.push(0x80);
        while ((msg.length * 8) % 512 !== 448) {
            msg.push(0x00);
        }
        for (var i = 0; i < 8; i++) {
            var byte = (originalLength >>> (i * 8)) & 0xFF;
            msg.push(byte);
        }
        var state = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
        for (var blockStart = 0; blockStart < msg.length; blockStart += 64) {
            var X = [];
            for (var i = 0; i < 16; i++) {
                var offset = blockStart + i * 4;
                X[i] = (msg[offset] | (msg[offset + 1] << 8) | (msg[offset + 2] << 16) | (msg[offset + 3] << 24)) >>> 0;
            }
            var A = state[0],
                B = state[1],
                C = state[2],
                D = state[3];
            var S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
                5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
                4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
                6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
            var T = [];
            for (var i = 1; i <= 64; i++) {
                var t = Math.abs(Math.sin(i)) * 0x100000000;
                T[i] = Math.floor(t) & 0xFFFFFFFF;
            }
            var F = [
                function(x, y, z) { return (x & y) | (~x & z); },
                function(x, y, z) { return (x & z) | (y & ~z); },
                function(x, y, z) { return x ^ y ^ z; },
                function(x, y, z) { return y ^ (x | ~z); }
            ];
            var g = [
                function(i) { return i; },
                function(i) { return (5 * i + 1) % 16; },
                function(i) { return (3 * i + 5) % 16; },
                function(i) { return (7 * i) % 16; }
            ];
            for (var round = 0; round < 4; round++) {
                for (var i = 0; i < 16; i++) {
                    var idx = round * 16 + i;
                    var gIdx = g[round](i);
                    var a = [A, B, C, D];
                    var aIdx = [0, 1, 2, 3];
                    var result = md5Cycle(X[gIdx], F[round](B, C, D), a[0], a[1], a[2], a[3], aIdx[round % 4] === 0 ? a[0] : a[1], S[idx], T[idx + 1]);
                    if (round % 4 === 0) {
                        A = result;
                    } else if (round % 4 === 1) {
                        B = result;
                    } else if (round % 4 === 2) {
                        C = result;
                    } else if (round % 4 === 3) {
                        D = result;
                    }
                }
            }
            state[0] = (state[0] + A) >>> 0;
            state[1] = (state[1] + B) >>> 0;
            state[2] = (state[2] + C) >>> 0;
            state[3] = (state[3] + D) >>> 0;
        }
        var result = [];
        for (var i = 0; i < 4; i++) {
            result.push((state[i] >>> 0) & 0xFF);
            result.push((state[i] >>> 8) & 0xFF);
            result.push((state[i] >>> 16) & 0xFF);
            result.push((state[i] >>> 24) & 0xFF);
        }
        return result;
    }

    var bytes = md5Binary(string);
    return md5Hex(bytes);
}

function verificarAutenticacao() {
    const autenticado = localStorage.getItem('admin_autenticado');
    const modal = document.getElementById('authModal');
    
    console.log('🔐 Verificando autenticação...');
    console.log('📌 localStorage.admin_autenticado =', autenticado);
    console.log('📌 Modal encontrado?', modal ? 'SIM' : 'NÃO');
    
    if (!modal) {
        console.error('❌ Modal de autenticação não encontrado! Verifique se o elemento com id "authModal" existe no HTML.');
        return;
    }
    
    if (!autenticado) {
        console.log('🔐 Usuário NÃO autenticado. Exibindo modal...');
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.getElementById('senhaAdmin').value = '';
        document.getElementById('senhaAdmin').focus();
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
    
    // Gerar hash da senha digitada
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

function setLoteriaAdmin(loteria) {
    console.log(`🔄 Mudando loteria admin para: ${loteria}`);
    loteriaAdmin = loteria;
    
    document.getElementById('adminBtnMega').classList.remove('active');
    document.getElementById('adminBtnLotofacil').classList.remove('active');
    document.getElementById('adminBtnQuina').classList.remove('active');
    
    document.querySelectorAll('.loteria-btn-admin').forEach(btn => {
        btn.classList.remove('active');
        btn.style.transform = 'scale(1)';
        btn.style.filter = 'brightness(1)';
        btn.style.boxShadow = 'none';
    });
    
    const btnSelecionado = document.getElementById(`adminBtn${loteria.charAt(0).toUpperCase() + loteria.slice(1)}`);
    if (btnSelecionado) {
        btnSelecionado.classList.add('active');
        btnSelecionado.style.transform = 'scale(0.98)';
        btnSelecionado.style.filter = 'brightness(0.9)';
        btnSelecionado.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
    }
    
    const labelNumeros = document.getElementById('labelNumeros');
    const dica = document.querySelector('.dica');
    
    if (labelNumeros) {
        if (loteria === 'mega') labelNumeros.innerHTML = '🔢 Números (um por linha - MEGA: 6 números):';
        else if (loteria === 'lotofacil') labelNumeros.innerHTML = '🔢 Números (um por linha - LOTOFÁCIL: 15 números):';
        else if (loteria === 'quina') labelNumeros.innerHTML = '🔢 Números (um por linha - QUINA: mínimo 5 números):';
    }
    
    if (dica) {
        if (loteria === 'mega') dica.innerHTML = '💡 MEGA: mínimo 6 números (1-60)';
        else if (loteria === 'lotofacil') dica.innerHTML = '💡 LOTOFÁCIL: mínimo 15 números (1-25)';
        else if (loteria === 'quina') dica.innerHTML = '💡 QUINA: mínimo 5 números (1-80)';
    }
    
    carregarDadosAdmin();
    showToast(`🔄 Mudou para ${loteria.toUpperCase()}`, 'info');
}

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

function exibirCartoesAdmin() {
    console.log(`📋 Exibindo cartões da loteria: ${loteriaAdmin}`);
    
    let cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    
    const filtro = document.getElementById('filtroConcurso').value;
    if (filtro !== 'todos') {
        cartoesFiltrados = cartoesFiltrados.filter(c => c.concurso == filtro);
    }
    
    const ordenarPor = document.getElementById('ordenarPor').value;
    switch(ordenarPor) {
        case 'concurso_desc': cartoesFiltrados.sort((a,b) => (b.concurso||0) - (a.concurso||0)); break;
        case 'concurso_asc': cartoesFiltrados.sort((a,b) => (a.concurso||0) - (b.concurso||0)); break;
        case 'bolao': cartoesFiltrados.sort((a,b) => (a.bolao||'Sem Bolão').localeCompare(b.bolao||'Sem Bolão')); break;
        case 'data': cartoesFiltrados.sort((a,b) => new Date(b.dataCadastro||0) - new Date(a.dataCadastro||0)); break;
        default: cartoesFiltrados.sort((a,b) => (b.concurso||0) - (a.concurso||0));
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
// FUNÇÃO DE EDIÇÃO COMPLETA
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
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">💡 Nome do bolão para identificar no índice</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: #1e293b;">🔢 NÚMEROS (separados por espaço)</label>
                    <input type="text" id="editarNumeros" value="${numerosAtuais}" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 14px;" placeholder="Ex: 12 15 23 34 45 56">
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                        💡 ${regra.label}: mínimo ${regra.min} números (1-${regra.max})
                    </div>
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
// EXCLUIR SELECIONADOS
// ============================================
async function excluirSelecionados() {
    const selecionados = document.querySelectorAll('.checkbox-cartao:checked');
    if (selecionados.length === 0) { 
        showToast('⚠️ Selecione cartões para excluir', 'warning'); 
        return; 
    }
    
    const confirmar = confirm(`⚠️ ATENÇÃO!\n\nDeseja excluir ${selecionados.length} cartão(ões)?\n\nEsta ação NÃO pode ser desfeita!`);
    
    if (!confirmar) {
        showToast('❌ Exclusão cancelada', 'info');
        return;
    }
    
    showToast(`🗑️ Excluindo ${selecionados.length} cartão(ões)...`, 'info');
    
    let excluidos = 0;
    let erros = 0;
    
    for (const cb of selecionados) {
        try {
            await db.collection('cartoes').doc(cb.dataset.id).delete();
            excluidos++;
        } catch (error) {
            console.error('Erro ao excluir:', error);
            erros++;
        }
    }
    
    if (excluidos > 0) {
        showToast(`✅ ${excluidos} cartão(ões) excluído(s)! ${erros > 0 ? `⚠️ ${erros} erro(s)` : ''}`, 'success');
    } else {
        showToast(`❌ Nenhum cartão foi excluído`, 'error');
    }
    
    carregarDadosAdmin();
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
// CARREGAR CONCURSOS
// ============================================
function carregarConcursosAdmin() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    const concursos = [...new Set(cartoesFiltrados.map(c => c.concurso))];
    concursos.sort((a,b) => b - a);
    const filtro = document.getElementById('filtroConcurso');
    
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
        
        if (abertos === 0 && andamento === 0 && encerrados === 0) {
            if (boloes && boloes.length > 0) {
                for (const bolao of boloes) {
                    const status = bolao.status || 'andamento';
                    if (status === 'aberto') abertos++;
                    else if (status === 'andamento') andamento++;
                    else if (status === 'encerrado') encerrados++;
                }
            }
        }
        
        const abertosEl = document.getElementById('dashboardAbertos');
        const andamentoEl = document.getElementById('dashboardAndamento');
        const encerradosEl = document.getElementById('dashboardEncerrados');
        
        if (abertosEl) abertosEl.innerHTML = abertos;
        if (andamentoEl) andamentoEl.innerHTML = andamento;
        if (encerradosEl) encerradosEl.innerHTML = encerrados;
        
        console.log(`📊 Dashboard: Abertos=${abertos}, Andamento=${andamento}, Encerrados=${encerrados}`);
    }).catch(error => {
        console.error('Erro ao carregar status dos bolões:', error);
    });
}

// ============================================
// ADICIONAR CARTÕES
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
    const minNumeros = loteriaAdmin === 'mega' ? 6 : (loteriaAdmin === 'lotofacil' ? 15 : 5);
    const maxValor = loteriaAdmin === 'mega' ? 60 : (loteriaAdmin === 'lotofacil' ? 25 : 80);
    
    for (const linha of linhas) {
        if (!linha.trim()) continue;
        
        const numeros = linha.match(/\d+/g).map(Number);
        
        if (numeros.length < minNumeros) { 
            console.warn(`❌ Linha ignorada: apenas ${numeros.length} números (mínimo ${minNumeros})`);
            erros++; 
            continue; 
        }
        
        const numerosUnicos = [...new Set(numeros)];
        if (numerosUnicos.length !== numeros.length) { 
            console.warn(`❌ Linha ignorada: contém números duplicados`);
            erros++; 
            continue; 
        }
        
        if (numeros.some(n => n < 1 || n > maxValor)) { 
            console.warn(`❌ Linha ignorada: números fora do range (1-${maxValor})`);
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
            console.error('Erro ao adicionar cartão:', error);
            erros++; 
        }
    }
    
    if (adicionados > 0) {
        showToast(`✅ ${adicionados} cartões adicionados!`, 'success');
        document.getElementById('numerosCartoes').value = '';
        carregarDadosAdmin();
    } else {
        let msg = `❌ Nenhum cartão adicionado. `;
        if (loteriaAdmin === 'mega') msg += `MEGA: mínimo 6 números entre 1 e 60.`;
        else if (loteriaAdmin === 'lotofacil') msg += `LOTOFÁCIL: mínimo 15 números entre 1 e 25.`;
        else msg += `QUINA: mínimo 5 números entre 1 e 80.`;
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
// GERAR LINKS DOS PARTICIPANTES
// ============================================
function gerarLinkParticipantes(bolaoId) {
    const baseUrl = window.location.origin + '/mega-sena-sistema/participantes.html';
    return `${baseUrl}?bolao=${bolaoId}`;
}

// ============================================
// MOSTRAR MODAL COM LINK PARA COPIAR
// ============================================
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
                <button id="btnCopiarLink" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;">
                    📋 COPIAR LINK
                </button>
                <button id="btnFecharModalLink" style="flex: 1; padding: 12px; background: #64748b; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;">
                    FECHAR
                </button>
            </div>
            
            <div id="feedbackCopiar" style="display: none; margin-top: 10px; padding: 8px; background: #d1fae5; border-radius: 8px; color: #065f46; font-size: 13px;">
                ✅ Link copiado com sucesso!
            </div>
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
            console.error('Erro ao copiar:', error);
            
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

// ============================================
// ADICIONAR BOTÕES DE LINK
// ============================================
function adicionarBotaoLinkParticipantes() {
    document.querySelectorAll('.btn-link-participantes').forEach(btn => {
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);
        
        novoBtn.addEventListener('click', function() {
            const bolaoId = this.dataset.id;
            const bolaoTitulo = this.dataset.titulo || 'Bolão';
            console.log('📋 Link clicado para:', bolaoTitulo, 'ID:', bolaoId);
            mostrarModalLink(bolaoId, bolaoTitulo);
        });
    });
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
        
        boloes.sort((a, b) => a.titulo.localeCompare(b.titulo));
        
        if (boloes.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum bolão encontrado. Envie pelo desktop.</div>';
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
        
        let html = '';
        for (const bolao of boloes) {
            const checked = selecionados.includes(bolao.id) ? 'checked' : '';
            const status = statusMap[bolao.id] || 'andamento';
            
            html += `
                <div style="padding: 12px; border-bottom: 1px solid #eee; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <input type="checkbox" class="checkbox-bolao" data-id="${bolao.id}" ${checked} style="width: 20px; height: 20px;">
                        <strong>${bolao.titulo || 'Sem título'}</strong>
                        <span style="font-size: 11px; color: #666;">${bolao.participantes?.length || 0} participantes | ${bolao.loteria || '?'}</span>
                        <label style="font-size: 11px; margin-left: auto;">⭐ DESTAQUE:</label>
                        <input type="checkbox" class="checkbox-destaque" data-id="${bolao.id}" ${destaqueMap[bolao.id] ? 'checked' : ''} style="width: 18px; height: 18px;">
                        <button class="btn-excluir-bolao" data-id="${bolao.id}" data-titulo="${bolao.titulo}" style="background: #ef4444; color: white; border: none; padding: 4px 12px; border-radius: 20px; cursor: pointer; font-size: 11px;">🗑️ EXCLUIR</button>
                        <button class="btn-link-participantes" data-id="${bolao.id}" data-titulo="${bolao.titulo}" style="background: #3b82f6; color: white; border: none; padding: 4px 12px; border-radius: 20px; cursor: pointer; font-size: 11px;">📋 LINK</button>
                    </div>
                    <div style="margin-left: 35px; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                        <label style="font-size: 12px;">Status:</label>
                        <select class="status-select" data-id="${bolao.id}" style="padding: 4px 8px; border-radius: 6px;">
                            <option value="aberto" ${status === 'aberto' ? 'selected' : ''}>🟢 ABERTO</option>
                            <option value="andamento" ${status === 'andamento' ? 'selected' : ''}>🟡 EM ANDAMENTO</option>
                            <option value="encerrado" ${status === 'encerrado' ? 'selected' : ''}>🔴 ENCERRADO</option>
                        </select>
                        <label style="font-size: 12px;">Data limite:</label>
                        <input type="date" class="data-limite-input" data-id="${bolao.id}" value="${dataLimiteMap[bolao.id] || ''}" style="padding: 4px 8px; border-radius: 6px;">
                    </div>
                    <div style="margin-left: 35px; margin-top: 8px;">
                        <label style="font-size: 12px;">📝 Estratégia do Bolão (opcional):</label>
                        <textarea class="estrategia-textarea" data-id="${bolao.id}" rows="2" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; margin-top: 4px;" placeholder="Ex: 60 números distribuídos em 10 cartões...">${estrategiaMap[bolao.id] || ''}</textarea>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-excluir-bolao').forEach(btn => {
            btn.onclick = () => {
                const bolaoId = btn.dataset.id;
                const bolaoTitulo = btn.dataset.titulo;
                excluirBolao(bolaoId, bolaoTitulo);
            };
        });
        
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', () => salvarConfigBoloes());
        });
        document.querySelectorAll('.data-limite-input').forEach(input => {
            input.addEventListener('change', () => salvarConfigBoloes());
        });
        document.querySelectorAll('.estrategia-textarea').forEach(textarea => {
            textarea.addEventListener('change', () => salvarConfigBoloes());
        });
        
        console.log(`✅ ${boloes.length} bolões carregados`);
        adicionarBotaoLinkParticipantes();

    } catch (error) {
        console.error('Erro ao carregar bolões:', error);
        container.innerHTML = '<div class="empty-state">Erro ao carregar bolões.</div>';
    }
}

async function excluirBolao(bolaoId, bolaoTitulo) {
    if (!confirm(`⚠️ ATENÇÃO!\n\nDeseja excluir o bolão "${bolaoTitulo}"?\n\nEsta ação NÃO pode ser desfeita e irá remover:\n- Todos os participantes\n- Todas as configurações\n\nConfirmar exclusão?`)) {
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
        });
        showToast(`✅ ${idsSelecionados.length} bolão(ões) selecionado(s)`, 'success');
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showToast('❌ Erro ao salvar seleção', 'error');
    }
}

// ============================================
// PARTICIPANTE RÁPIDO
// ============================================
async function carregarBoloesNoSelectRapido() {
    const select = document.getElementById('rapidoBolaoSelect');
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
            option.textContent = `${bolao.titulo} (${bolao.loteria || '?'})`;
            select.appendChild(option);
        }
    } catch (error) {
        console.error('Erro ao carregar bolões:', error);
    }
}

async function adicionarParticipanteRapido() {
    const nome = document.getElementById('rapidoNome').value.trim();
    const bolaoId = document.getElementById('rapidoBolaoSelect').value;
    const valorPago = parseInt(document.getElementById('rapidoValor').value);
    const loteria = document.getElementById('rapidoLoteria').value;
    
    if (!nome) { showToast('⚠️ Digite o nome do participante', 'warning'); return; }
    if (!bolaoId) { showToast('⚠️ Selecione um bolão', 'warning'); return; }
    if (!valorPago || valorPago <= 0) { showToast('⚠️ Digite um valor válido', 'warning'); return; }
    
    const bolaoDoc = await db.collection('participantes').doc(bolaoId).get();
    const bolaoTitulo = bolaoDoc.exists ? bolaoDoc.data().titulo : 'Bolão';
    
    await db.collection('participantes_pendentes').add({
        nome: nome,
        bolaoId: bolaoId,
        bolaoTitulo: bolaoTitulo,
        valorPago: valorPago,
        loteria: loteria,
        data: new Date().toISOString(),
        sincronizado: false,
        status: 'pendente_validacao',
        admin: true
    });
    
    showToast(`✅ ${nome} adicionado para sincronização!`, 'success');
    
    document.getElementById('rapidoNome').value = '';
    document.getElementById('rapidoValor').value = '';
}

async function gerarListaWhatsApp() {
    const bolaoId = document.getElementById('rapidoBolaoSelect').value;
    if (!bolaoId) { showToast('⚠️ Selecione um bolão', 'warning'); return; }
    
    const bolaoDoc = await db.collection('participantes').doc(bolaoId).get();
    if (!bolaoDoc.exists) { showToast('❌ Bolão não encontrado', 'error'); return; }
    
    const bolao = bolaoDoc.data();
    const participantes = bolao.participantes || [];
    const confirmados = participantes.filter(p => p.situacao === 'quitado' || p.situacao === 'pago');
    const confirmadosLista = confirmados.map(p => `✅ ${p.nome} - R$ ${p.valorPago},00`).join('\n');
    
    const mensagem = `*${bolao.titulo}*\n\n` +
        `💰 *Valor da Cota:* R$ ${bolao.valorPorCota || 0},00\n` +
        `💳 *PIX:* 61998507770\n\n` +
        `*✅ CONFIRMADOS:*\n${confirmadosLista || 'Nenhum participante confirmado ainda'}\n\n` +
        `🔹 *Não precisa enviar comprovante, confirmação feita no extrato.*`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
    showToast('📱 Abrindo WhatsApp...', 'info');
}

// ============================================
// TOKENS DE ACESSO
// ============================================
function gerarTokenUnico() {
    return Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 8);
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
                        <strong style="font-size: 15px;">👤 ${token.nome}</strong>
                        <span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 30px; font-size: 10px;">✅ ATIVO</span>
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">📞 ${formatarTelefone(token.telefone)}</div>
                    <div style="font-size: 10px; color: #64748b; margin-bottom: 10px;">📅 Criado em: ${dataCriacao}</div>
                    <div style="background: #f8fafc; padding: 8px; border-radius: 8px; margin-bottom: 10px;">
                        <code style="font-size: 9px; word-break: break-all;">${link}</code>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-copiar-link btn-sm" data-link="${link}" style="background: #3b82f6; border: none; padding: 6px 12px; border-radius: 20px; color: white; cursor: pointer; font-size: 11px;">📋 COPIAR LINK</button>
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
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
        return `${numeros.substring(0, 2)}-${numeros.substring(2)}`;
    } else if (numeros.length === 10) {
        return `${numeros.substring(0, 2)}-${numeros.substring(2)}`;
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
                        <strong style="font-size: 14px;">${p.nome}</strong>
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
        
        document.getElementById('totalReservas').innerHTML = `R$ ${totalSaldo.toFixed(2)}`;
        
        const container = document.getElementById('listaReservas');
        
        if (reservas.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Nenhuma reserva encontrada</div>';
            return;
        }
        
        let html = '<div class="reservas-grid">';
        for (const reserva of reservas) {
            const dataAtualizacao = reserva.dataAtualizacao ? new Date(reserva.dataAtualizacao).toLocaleString('pt-BR') : '---';
            const saldo = (reserva.saldoReserva || 0).toFixed(2);
            const saldoClass = reserva.saldoReserva > 0 ? 'positivo' : (reserva.saldoReserva < 0 ? 'negativo' : 'zero');
            
            html += `
                <div class="reserva-card">
                    <div class="reserva-header">
                        <div class="reserva-nome">👤 ${reserva.nome}</div>
                        <div class="reserva-saldo ${saldoClass}">R$ ${saldo}</div>
                    </div>
                    <div class="reserva-info">
                        <div>🆔 ID: ${reserva.participanteId || reserva.id.substring(0, 8)}</div>
                        <div>📅 Atualizado: ${dataAtualizacao}</div>
                    </div>
                    <button class="btn-ver-historico" data-id="${reserva.id}" data-nome="${reserva.nome}" style="background: #64748b; width: auto; padding: 5px 12px; margin-top: 8px;">📜 VER HISTÓRICO</button>
                    <div id="historico-${reserva.id}" style="display: none; margin-top: 10px; background: #f8fafc; border-radius: 8px; padding: 10px; font-size: 11px;"></div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-ver-historico').forEach(btn => {
            btn.onclick = () => mostrarHistorico(btn.dataset.id, btn.dataset.nome);
        });
        
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        document.getElementById('listaReservas').innerHTML = '<div class="empty-state">❌ Erro ao carregar reservas</div>';
    }
}

async function mostrarHistorico(id, nome) {
    const div = document.getElementById(`historico-${id}`);
    
    if (div.style.display === 'none') {
        try {
            const doc = await db.collection('reservas_participantes').doc(id).get();
            const data = doc.data();
            const historico = data.historico || [];
            
            if (historico.length === 0) {
                div.innerHTML = '<div style="text-align: center; color: #666;">Nenhuma movimentação registrada</div>';
            } else {
                let html = '<div style="font-weight: bold; margin-bottom: 8px;">📋 MOVIMENTAÇÕES</div>';
                html = '<div style="max-height: 200px; overflow-y: auto;">';
                for (const item of historico.reverse()) {
                    const data = new Date(item.data).toLocaleString('pt-BR');
                    const tipoIcon = item.tipo === 'deposito' ? '💰 DEPÓSITO' : (item.tipo === 'saque' ? '💸 SAQUE' : '🎯 USO');
                    const valorClass = item.tipo === 'deposito' ? 'text-success' : 'text-danger';
                    html += `
                        <div style="border-bottom: 1px solid #e2e8f0; padding: 6px 0; font-size: 11px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>${tipoIcon}</span>
                                <span class="${valorClass}">R$ ${item.valor.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; color: #666;">
                                <span>${data}</span>
                                <span>Saldo: R$ ${item.saldoNovo.toFixed(2)}</span>
                            </div>
                            ${item.descricao ? `<div style="color: #666; font-size: 10px;">${item.descricao}</div>` : ''}
                        </div>
                    `;
                }
                html += '</div>';
                div.innerHTML = html;
            }
            div.style.display = 'block';
            btn.textContent = '🙈 OCULTAR HISTÓRICO';
        } catch (error) {
            div.innerHTML = '<div style="color: red;">Erro ao carregar histórico</div>';
            div.style.display = 'block';
        }
    } else {
        div.style.display = 'none';
    }
}

// ============================================
// INICIALIZAÇÃO
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
    const filtroConcurso = document.getElementById('filtroConcurso');
    const ordenarPor = document.getElementById('ordenarPor');
    const senhaAdmin = document.getElementById('senhaAdmin');
    const btnGerarToken = document.getElementById('btnGerarToken');
    const btnAtualizarReservas = document.getElementById('btnAtualizarReservas');
    
    const adminBtnMega = document.getElementById('adminBtnMega');
    const adminBtnLotofacil = document.getElementById('adminBtnLotofacil');
    const adminBtnQuina = document.getElementById('adminBtnQuina');
    
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
    
    carregarBoloesParaGerenciar();
    carregarBoloesNoSelectRapido();
    carregarBoloesSelectParticipantes();
    carregarTokens();
    carregarReservas();
    
    // Forçar login se a autenticação falhar
    setTimeout(() => {
        const modal = document.getElementById('authModal');
        if (modal && !modal.classList.contains('show') && !localStorage.getItem('admin_autenticado')) {
            console.log('⚠️ Forçando exibição do modal de autenticação...');
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
    }, 500);
});