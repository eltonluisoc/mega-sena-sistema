const SENHA_ADMIN = '172163';
let cartoes = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let resultadosQuina = {};
let loteriaAdmin = 'mega';
let cartoesFiltrados = [];

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

function verificarAutenticacao() {
    const autenticado = localStorage.getItem('admin_autenticado');
    if (!autenticado) {
        document.getElementById('authModal').classList.add('show');
    } else {
        document.getElementById('authModal').classList.remove('show');
        carregarPixConfig();
        carregarDadosAdmin();
    }
}

function autenticar() {
    const senha = document.getElementById('senhaAdmin').value;
    if (senha === SENHA_ADMIN) {
        localStorage.setItem('admin_autenticado', 'true');
        showToast('✅ Login realizado!', 'success');
        verificarAutenticacao();
    } else {
        showToast('❌ Senha incorreta!', 'error');
    }
}

function sair() {
    localStorage.removeItem('admin_autenticado');
    showToast('🔒 Saiu do sistema', 'info');
    verificarAutenticacao();
}

function setLoteriaAdmin(loteria) {
    loteriaAdmin = loteria;
    document.getElementById('adminBtnMega').classList.remove('active');
    document.getElementById('adminBtnLotofacil').classList.remove('active');
    document.getElementById('adminBtnQuina').classList.remove('active');
    
    if (loteria === 'mega') {
        document.getElementById('adminBtnMega').classList.add('active');
        document.getElementById('cadastroHeader').innerHTML = '📝 CADASTRAR CARTÕES - MEGA';
    } else if (loteria === 'lotofacil') {
        document.getElementById('adminBtnLotofacil').classList.add('active');
        document.getElementById('cadastroHeader').innerHTML = '📝 CADASTRAR CARTÕES - LOTOFÁCIL';
    } else if (loteria === 'quina') {
        document.getElementById('adminBtnQuina').classList.add('active');
        document.getElementById('cadastroHeader').innerHTML = '📝 CADASTRAR CARTÕES - QUINA';
    }
    
    const labelNumeros = document.getElementById('labelNumeros');
    const dicaNumeros = document.getElementById('dicaNumeros');
    
    if (labelNumeros) {
        if (loteria === 'mega') labelNumeros.innerHTML = '🔢 Números (um por linha - MEGA: 6 números):';
        else if (loteria === 'lotofacil') labelNumeros.innerHTML = '🔢 Números (um por linha - LOTOFÁCIL: 15 números):';
        else if (loteria === 'quina') labelNumeros.innerHTML = '🔢 Números (um por linha - QUINA: mínimo 5 números):';
    }
    
    if (dicaNumeros) {
        if (loteria === 'mega') dicaNumeros.innerHTML = '💡 MEGA: mínimo 6 números.';
        else if (loteria === 'lotofacil') dicaNumeros.innerHTML = '💡 LOTOFÁCIL: mínimo 15 números.';
        else if (loteria === 'quina') dicaNumeros.innerHTML = '💡 QUINA: mínimo 5 números.';
    }
    
    carregarDadosAdmin();
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
        
        // Carregar resultados Mega
        try {
            const resMega = await db.collection('resultados_mega').get();
            resultadosMega = {};
            resMega.forEach(doc => {
                resultadosMega[doc.id] = doc.data();
            });
            console.log(`✅ ${Object.keys(resultadosMega).length} resultados Mega carregados`);
        } catch (e) {
            console.log('⚠️ Nenhum resultado Mega encontrado');
            resultadosMega = {};
        }
        
        // Carregar resultados Lotofácil
        try {
            const resLoto = await db.collection('resultados_lotofacil').get();
            resultadosLotofacil = {};
            resLoto.forEach(doc => {
                resultadosLotofacil[doc.id] = doc.data();
            });
            console.log(`✅ ${Object.keys(resultadosLotofacil).length} resultados Lotofácil carregados`);
        } catch (e) {
            console.log('⚠️ Nenhum resultado Lotofácil encontrado');
            resultadosLotofacil = {};
        }
        
        // Carregar resultados Quina
        try {
            const resQuina = await db.collection('resultados_quina').get();
            resultadosQuina = {};
            resQuina.forEach(doc => {
                resultadosQuina[doc.id] = doc.data();
            });
            console.log(`✅ ${Object.keys(resultadosQuina).length} resultados Quina carregados`);
        } catch (e) {
            console.log('⚠️ Nenhum resultado Quina encontrado');
            resultadosQuina = {};
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

// Carregar todas as reservas
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
        
        // Ordenar por saldo (maior primeiro)
        reservas.sort((a, b) => (b.saldoReserva || 0) - (a.saldoReserva || 0));
        
        // Atualizar total
        document.getElementById('totalReservas').innerHTML = `R$ ${totalSaldo.toFixed(2)}`;
        
        // Exibir lista
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
        
        // Eventos para botões de histórico
        document.querySelectorAll('.btn-ver-historico').forEach(btn => {
            btn.onclick = () => mostrarHistorico(btn.dataset.id, btn.dataset.nome);
        });
        
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        document.getElementById('listaReservas').innerHTML = '<div class="empty-state">❌ Erro ao carregar reservas</div>';
    }
}

// Mostrar histórico de um participante
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

// Chamar no carregamento do admin
// Adicionar no DOMContentLoaded do admin.js:
// carregarReservas();
// document.getElementById('btnAtualizarReservas').onclick = () => carregarReservas();

function atualizarDashboardAdmin() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    const resultados = loteriaAdmin === 'mega' ? resultadosMega : loteriaAdmin === 'lotofacil' ? resultadosLotofacil : resultadosQuina;
    const concursos = [...new Set(cartoesFiltrados.map(c => c.concurso))];
    const boloes = [...new Set(cartoesFiltrados.map(c => c.bolao || 'Sem Bolão'))];
    
    const totalCartoes = document.getElementById('dashboardTotalCartoes');
    const totalConcursos = document.getElementById('dashboardTotalConcursos');
    const totalBoloes = document.getElementById('dashboardTotalBoloes');
    const totalResultados = document.getElementById('dashboardResultados');
    
    if (totalCartoes) totalCartoes.innerHTML = cartoesFiltrados.length;
    if (totalConcursos) totalConcursos.innerHTML = concursos.length;
    if (totalBoloes) totalBoloes.innerHTML = boloes.length;
    if (totalResultados) totalResultados.innerHTML = Object.keys(resultados).length;
}

function exibirCartoesAdmin() {
    let cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    const filtro = document.getElementById('filtroConcurso').value;
    if (filtro !== 'todos') cartoesFiltrados = cartoesFiltrados.filter(c => c.concurso == filtro);
    
    const ordenarPor = document.getElementById('ordenarPor').value;
    switch(ordenarPor) {
        case 'concurso_desc': cartoesFiltrados.sort((a,b) => (b.concurso||0) - (a.concurso||0)); break;
        case 'concurso_asc': cartoesFiltrados.sort((a,b) => (a.concurso||0) - (b.concurso||0)); break;
        case 'bolao': cartoesFiltrados.sort((a,b) => (a.bolao||'Sem Bolão').localeCompare(b.bolao||'Sem Bolão')); break;
        case 'data': cartoesFiltrados.sort((a,b) => new Date(b.dataCadastro||0) - new Date(a.dataCadastro||0)); break;
        default: cartoesFiltrados.sort((a,b) => (b.concurso||0) - (a.concurso||0));
    }
    
    const container = document.getElementById('cartoesLista');
    if (cartoesFiltrados.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum cartão cadastrado</div>';
        return;
    }
    
    let html = '';
    for (const cartao of cartoesFiltrados) {
        const dataFormatada = cartao.dataCadastro ? new Date(cartao.dataCadastro).toLocaleDateString('pt-BR') : 'Data não disponível';
        const fontSize = loteriaAdmin === 'mega' ? '12px' : (loteriaAdmin === 'lotofacil' ? '10px' : '11px');
        html += `
            <div class="cartao-item" style="border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:10px; background:#f8fafc;">
                <div style="display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap;">
                    <div><input type="checkbox" class="checkbox-cartao" data-id="${cartao.id}" style="width:22px; height:22px;"></div>
                    <div style="flex:1; min-width:150px;">
                        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                            <strong>Cartão #${cartao.id ? cartao.id.slice(-6) : '???'}</strong>
                            <div style="display:flex; gap:6px;">
                                <button class="btn-editar" data-id="${cartao.id}" style="background:#3b82f6; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; display:inline-block; min-width:80px;">✏️ Editar</button>
                                <button class="btn-duplicar" data-id="${cartao.id}" style="background:#8b5cf6; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; display:inline-block; min-width:80px;">📋 Duplicar</button>
                            </div>
                        </div>
                        <div style="font-size:12px; color:#666; margin:5px 0;">Concurso ${cartao.concurso} | Bolão: ${cartao.bolao || 'Sem Bolão'} | 📅 ${dataFormatada}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                            ${cartao.numeros.map(n => `<span style="background:#e2e8f0; padding:5px 10px; border-radius:6px; font-family:monospace; font-size:${fontSize};">${n.toString().padStart(2,'0')}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
    
    document.querySelectorAll('.btn-editar').forEach(btn => btn.onclick = () => editarCartao(btn.dataset.id));
    document.querySelectorAll('.btn-duplicar').forEach(btn => btn.onclick = () => duplicarCartao(btn.dataset.id));
    
    function atualizarContador() {
        const qtd = document.querySelectorAll('.checkbox-cartao:checked').length;
        const btnExcluir = document.getElementById('btnExcluirSelecionados');
        if (btnExcluir) btnExcluir.innerHTML = qtd > 0 ? `🗑️ EXCLUIR (${qtd})` : '🗑️ EXCLUIR';
    }
    document.querySelectorAll('.checkbox-cartao').forEach(cb => cb.onchange = atualizarContador);
    atualizarContador();
}

async function editarCartao(id) {
    const doc = await db.collection('cartoes').doc(id).get();
    const cartao = doc.data();
    const maxNumeros = loteriaAdmin === 'mega' ? 6 : (loteriaAdmin === 'lotofacil' ? 15 : 5);
    const maxValor = loteriaAdmin === 'mega' ? 60 : (loteriaAdmin === 'lotofacil' ? 25 : 80);
    
    const novosNumeros = prompt(`Editar números (separados por espaço):\nAtuais: ${cartao.numeros.join(', ')}\n${loteriaAdmin === 'mega' ? 'MEGA: 6 números (1-60)' : loteriaAdmin === 'lotofacil' ? 'LOTOFÁCIL: 15 números (1-25)' : 'QUINA: mínimo 5 números (1-80)'}`, cartao.numeros.join(' '));
    if (!novosNumeros) return;
    
    const numeros = novosNumeros.match(/\d+/g).map(Number);
    if (numeros.length < maxNumeros) { showToast(`❌ Mínimo ${maxNumeros} números!`, 'error'); return; }
    if (numeros.some(n => n < 1 || n > maxValor)) { showToast(`❌ Números devem estar entre 1 e ${maxValor}!`, 'error'); return; }
    numeros.sort((a,b) => a-b);
    
    const tipoAtual = cartao.tipoParticipacao || 'exclusivo';
    const novoTipo = prompt(`Editar tipo de participação:\nAtual: ${tipoAtual === 'cota' ? '🎟️ Cota de Bolão' : '👥 Grupo Exclusivo'}\n\nDigite 1 para Grupo Exclusivo\nDigite 2 para Cota de Bolão`, tipoAtual === 'cota' ? '2' : '1');
    
    let tipoParticipacao = 'exclusivo';
    if (novoTipo === '2') {
        tipoParticipacao = 'cota';
    } else if (novoTipo === '1') {
        tipoParticipacao = 'exclusivo';
    } else {
        tipoParticipacao = tipoAtual;
    }
    
    await db.collection('cartoes').doc(id).update({ 
        numeros, 
        totalNumeros: numeros.length, 
        tipoParticipacao: tipoParticipacao,
        admin: true, 
        dataAtualizacao: new Date().toISOString() 
    });
    showToast('✅ Cartão atualizado!', 'success');
    carregarDadosAdmin();
}

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

async function excluirSelecionados() {
    const selecionados = document.querySelectorAll('.checkbox-cartao:checked');
    if (selecionados.length === 0) { 
        showToast('⚠️ Selecione cartões para excluir', 'warning'); 
        return; 
    }
    
    // Modal de confirmação personalizado
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

                // Validar números únicos
                const numerosUnicos = [...new Set(numeros)];
                if (numerosUnicos.length !== numeros.length) continue;

                // Validar range
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

function carregarConcursosAdmin() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    const concursos = [...new Set(cartoesFiltrados.map(c => c.concurso))];
    concursos.sort((a,b) => b - a);
    const select = document.getElementById('concursoResultado');
    const filtro = document.getElementById('filtroConcurso');
    
    if (select) {
        select.innerHTML = '<option value="">Selecione</option>';
        concursos.forEach(c => select.innerHTML += `<option value="${c}">Concurso ${c}</option>`);
    }
    if (filtro) {
        filtro.innerHTML = '<option value="todos">Todos</option>';
        concursos.forEach(c => filtro.innerHTML += `<option value="${c}">Concurso ${c}</option>`);
    }
}

async function salvarResultado() {
    const concurso = document.getElementById('concursoResultado').value;
    const texto = document.getElementById('numerosSorteadosInput').value;
    if (!concurso || !texto) { showToast('⚠️ Preencha os campos', 'warning'); return; }
    
    const numeros = texto.match(/\d+/g).map(Number);
    const totalNumeros = loteriaAdmin === 'mega' ? 6 : (loteriaAdmin === 'lotofacil' ? 15 : 5);
    if (numeros.length < totalNumeros) { showToast(`❌ Mínimo ${totalNumeros} números`, 'error'); return; }
    numeros.sort((a,b) => a-b);
    
    await db.collection('resultados').doc(concurso).set({ 
        concurso, 
        numeros, 
        tipo: loteriaAdmin, 
        admin: true,
        dataAtualizacao: new Date().toISOString() 
    });
    showToast('✅ Resultado salvo!', 'success');
    carregarDadosAdmin();
}

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
    
    // Extrair números
    const numeros = linha.match(/\d+/g).map(Number);
    
    // Validar quantidade mínima
        if (numeros.length < minNumeros) { 
            console.warn(`❌ Linha ignorada: apenas ${numeros.length} números (mínimo ${minNumeros})`);
            erros++; 
            continue; 
        }
        
        // Validar números únicos (sem duplicados)
        const numerosUnicos = [...new Set(numeros)];
        if (numerosUnicos.length !== numeros.length) { 
            console.warn(`❌ Linha ignorada: contém números duplicados`);
            erros++; 
            continue; 
        }
        
        // Validar range (1 até maxValor)
        if (numeros.some(n => n < 1 || n > maxValor)) { 
            console.warn(`❌ Linha ignorada: números fora do range (1-${maxValor})`);
            erros++; 
            continue; 
        }
        
        // Ordenar números
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
            container.innerHTML = '<div class="empty-state">Nenhum bolão encontrado. Envie pelo desktop.</div>';
            return;
        }
        
        let selecionados = [];
        let statusMap = {};
        let dataLimiteMap = {};
        let destaqueMap = {};
        let estrategiaMap = {};  // ← DECLARADO

        try {
            const configDoc = await db.collection('config_boloes').doc('ativos').get();
            if (configDoc.exists) {
                selecionados = configDoc.data().ids || [];
                statusMap = configDoc.data().status || {};
                dataLimiteMap = configDoc.data().dataLimite || {};
                destaqueMap = configDoc.data().destaque || {};
                estrategiaMap = configDoc.data().estrategia || {};  // ← CARREGADO
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
            <textarea class="estrategia-textarea" data-id="${bolao.id}" rows="2" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; margin-top: 4px;" placeholder="Ex: 60 números distribuídos em 10 cartões, cobrindo 30% das combinações possíveis...">${estrategiaMap[bolao.id] || ''}</textarea>
        </div>
    </div>
`;
        }
        
        container.innerHTML = html;
        
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
        
    } catch (error) {
        console.error('Erro ao carregar bolões:', error);
        container.innerHTML = '<div class="empty-state">Erro ao carregar bolões.</div>';
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
    
    // NOVO: coletar estratégias
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
            estrategia: estrategiaMap  // ← NOVO
        });
        showToast(`✅ ${idsSelecionados.length} bolão(ões) selecionado(s)`, 'success');
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showToast('❌ Erro ao salvar seleção', 'error');
    }
}

// ============ PARTICIPANTE RÁPIDO ============
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

// ============ COLLAPSE CONFIGURAÇÃO GERAL ============
const btnConfig = document.getElementById('btnConfigGeral');
const collapseContent = document.querySelector('.collapse-content');

if (btnConfig && collapseContent) {
    btnConfig.addEventListener('click', () => {
        btnConfig.classList.toggle('active-collapse');
        if (collapseContent.style.display === 'block') {
            collapseContent.style.display = 'none';
        } else {
            collapseContent.style.display = 'block';
        }
    });
}

// ============================================
// FUNÇÕES PARA GERENCIAR TOKENS DE ACESSO
// ============================================

// Gerar token aleatório
function gerarTokenUnico() {
    return Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 8);
}

// Salvar token no Firebase
async function salvarToken(participanteId, nome, telefone) {
    const token = gerarTokenUnico();
    const link = `${window.location.origin}/mega-sena-sistema/consulta.html?token=${token}`;
    
    await db.collection('participantes_tokens').doc(token).set({
        participanteId: participanteId,
        nome: nome,
        telefone: telefone,
        token: token,
        ativo: true,
        dataCriacao: new Date().toISOString(),
        admin: true
    });
    
    showToast(`✅ Token gerado!`, 'success');
    
    // Mostrar link para copiar
    const resultado = confirm(`Link gerado:\n\n${link}\n\nClique em OK para copiar o link`);
    if (resultado) {
        navigator.clipboard.writeText(link);
        showToast('📋 Link copiado para a área de transferência!', 'success');
    }
    
    carregarTokens();
}

// Carregar todos os tokens ativos
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
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">📞 ${token.telefone}</div>
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
        
        // Eventos dos botões
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

// Evento do botão gerar token
const btnGerarToken = document.getElementById('btnGerarToken');
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

// Chamar carregarTokens quando o admin iniciar
// Adicione esta linha dentro do DOMContentLoaded do admin.js:
// carregarTokens();

// ============ INICIALIZAÇÃO ============
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    
    const btnAutenticar = document.getElementById('btnAutenticar');
    const btnSair = document.getElementById('btnSair');
    const adminBtnMega = document.getElementById('adminBtnMega');
    const adminBtnLotofacil = document.getElementById('adminBtnLotofacil');
    const adminBtnQuina = document.getElementById('adminBtnQuina');
    const btnAdicionar = document.getElementById('btnAdicionar');
    const btnLimpar = document.getElementById('btnLimpar');
    const btnSalvarResultado = document.getElementById('btnSalvarResultado');
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
    
    if (btnAutenticar) btnAutenticar.onclick = autenticar;
    if (btnSair) btnSair.onclick = sair;
    if (adminBtnMega) adminBtnMega.onclick = () => setLoteriaAdmin('mega');
    if (adminBtnLotofacil) adminBtnLotofacil.onclick = () => setLoteriaAdmin('lotofacil');
    if (adminBtnQuina) adminBtnQuina.onclick = () => setLoteriaAdmin('quina');
    if (btnAdicionar) btnAdicionar.onclick = adicionarCartoes;
    if (btnLimpar) btnLimpar.onclick = limparFormulario;
    if (btnSalvarResultado) btnSalvarResultado.onclick = salvarResultado;
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
    
    carregarBoloesParaGerenciar();
    carregarBoloesNoSelectRapido();
});
