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
        document.getElementById('resultadosHeader').innerHTML = '🔍 RESULTADOS OFICIAIS - MEGA';
        document.getElementById('listaHeader').innerHTML = '📋 CARTÕES CADASTRADOS - MEGA';
        document.getElementById('labelNumeros').innerHTML = '🔢 Números (um por linha - MEGA: 6 números):';
        document.getElementById('dicaNumeros').innerHTML = '💡 MEGA: mínimo 6 números.';
    } else if (loteria === 'lotofacil') {
        document.getElementById('adminBtnLotofacil').classList.add('active');
        document.getElementById('cadastroHeader').innerHTML = '📝 CADASTRAR CARTÕES - LOTOFÁCIL';
        document.getElementById('resultadosHeader').innerHTML = '🔍 RESULTADOS OFICIAIS - LOTOFÁCIL';
        document.getElementById('listaHeader').innerHTML = '📋 CARTÕES CADASTRADOS - LOTOFÁCIL';
        document.getElementById('labelNumeros').innerHTML = '🔢 Números (um por linha - LOTOFÁCIL: 15 números):';
        document.getElementById('dicaNumeros').innerHTML = '💡 LOTOFÁCIL: mínimo 15 números.';
    } else if (loteria === 'quina') {
        document.getElementById('adminBtnQuina').classList.add('active');
        document.getElementById('cadastroHeader').innerHTML = '📝 CADASTRAR CARTÕES - QUINA';
        document.getElementById('resultadosHeader').innerHTML = '🔍 RESULTADOS OFICIAIS - QUINA';
        document.getElementById('listaHeader').innerHTML = '📋 CARTÕES CADASTRADOS - QUINA';
        document.getElementById('labelNumeros').innerHTML = '🔢 Números (um por linha - QUINA: minimum 5 números):';
        document.getElementById('dicaNumeros').innerHTML = '💡 QUINA: mínimo 5 números (máximo 15).';
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
        snapshot.forEach(doc => { cartoes.push({ id: doc.id, ...doc.data() }); });
        
        const resMega = await db.collection('resultados').where('tipo', '==', 'mega').get();
        resultadosMega = {};
        resMega.forEach(doc => { resultadosMega[doc.id] = doc.data(); });
        
        const resLoto = await db.collection('resultados').where('tipo', '==', 'lotofacil').get();
        resultadosLotofacil = {};
        resLoto.forEach(doc => { resultadosLotofacil[doc.id] = doc.data(); });
        
        const resQuina = await db.collection('resultados').where('tipo', '==', 'quina').get();
        resultadosQuina = {};
        resQuina.forEach(doc => { resultadosQuina[doc.id] = doc.data(); });
        
        exibirCartoesAdmin();
        carregarConcursosAdmin();
        atualizarDashboardAdmin();
        
        const total = cartoes.filter(c => c.tipo === loteriaAdmin).length;
        document.getElementById('totalCartoes').innerHTML = total + ' cartões';
        showToast('✅ Dados carregados!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao carregar: ' + error.message, 'error');
    }
}

function atualizarDashboardAdmin() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    const resultados = loteriaAdmin === 'mega' ? resultadosMega : loteriaAdmin === 'lotofacil' ? resultadosLotofacil : resultadosQuina;
    const concursos = [...new Set(cartoesFiltrados.map(c => c.concurso))];
    const boloes = [...new Set(cartoesFiltrados.map(c => c.bolao || 'Sem Bolão'))];
    document.getElementById('dashboardTotalCartoes').innerHTML = cartoesFiltrados.length;
    document.getElementById('dashboardTotalConcursos').innerHTML = concursos.length;
    document.getElementById('dashboardTotalBoloes').innerHTML = boloes.length;
    document.getElementById('dashboardResultados').innerHTML = Object.keys(resultados).length;
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
                                <button class="btn-editar" data-id="${cartao.id}" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">✏️ Editar</button>
                                <button class="btn-duplicar" data-id="${cartao.id}" style="background:#8b5cf6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">📋 Duplicar</button>
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
    
    const novos = prompt(`Editar números (separados por espaço):\nAtuais: ${cartao.numeros.join(', ')}\n${loteriaAdmin === 'mega' ? 'MEGA: 6 números (1-60)' : loteriaAdmin === 'lotofacil' ? 'LOTOFÁCIL: 15 números (1-25)' : 'QUINA: mínimo 5 números (1-80)'}`, cartao.numeros.join(' '));
    if (!novos) return;
    
    const numeros = novos.match(/\d+/g).map(Number);
    if (numeros.length < maxNumeros) { showToast(`❌ Mínimo ${maxNumeros} números!`, 'error'); return; }
    if (numeros.some(n => n < 1 || n > maxValor)) { showToast(`❌ Números devem estar entre 1 e ${maxValor}!`, 'error'); return; }
    numeros.sort((a,b) => a-b);
    
    await db.collection('cartoes').doc(id).update({ numeros, totalNumeros: numeros.length, admin: true, dataAtualizacao: new Date().toISOString() });
    showToast('✅ Cartão atualizado!', 'success');
    carregarDadosAdmin();
}

async function duplicarCartao(id) {
    const doc = await db.collection('cartoes').doc(id).get();
    const original = doc.data();
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
        admin: true,
        dataCadastro: new Date().toISOString(), 
        totalNumeros: original.numeros.length 
    });
    showToast('✅ Cartão duplicado!', 'success');
    carregarDadosAdmin();
}

async function excluirSelecionados() {
    const selecionados = document.querySelectorAll('.checkbox-cartao:checked');
    if (selecionados.length === 0) { showToast('⚠️ Selecione cartões', 'warning'); return; }
    if (!confirm(`Excluir ${selecionados.length} cartão(ões)?`)) return;
    for (const cb of selecionados) await db.collection('cartoes').doc(cb.dataset.id).delete();
    showToast(`🗑️ ${selecionados.length} excluído(s)!`, 'success');
    carregarDadosAdmin();
}

async function exportarCartoes() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAdmin);
    if (cartoesFiltrados.length === 0) { showToast('⚠️ Nenhum cartão', 'warning'); return; }
    const dados = [['ID', 'Concurso', 'Bolão', 'Números', 'Quantidade', 'Data']];
    for (const cartao of cartoesFiltrados) dados.push([cartao.id.slice(-6), cartao.concurso, cartao.bolao || 'Sem Bolão', (cartao.numeros || []).join(' - '), (cartao.numeros || []).length, cartao.dataCadastro ? new Date(cartao.dataCadastro).toLocaleDateString('pt-BR') : '']);
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
        if (numeros.length < minNumeros) { erros++; continue; }
        if (numeros.some(n => n < 1 || n > maxValor)) { erros++; continue; }
        numeros.sort((a,b) => a-b);
        try {
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
        } catch (error) { erros++; }
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

function limparFormulario() { document.getElementById('numerosCartoes').value = ''; showToast('🧹 Formulário limpo', 'info'); }
function recarregarLista() { carregarDadosAdmin(); showToast('🔄 Dados recarregados', 'info'); }

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

        try {
            const configDoc = await db.collection('config_boloes').doc('ativos').get();
            if (configDoc.exists) {
                selecionados = configDoc.data().ids || [];
                statusMap = configDoc.data().status || {};
                dataLimiteMap = configDoc.data().dataLimite || {};
            }
        } catch (e) {
            console.log('Erro ao carregar seleção:', e);
        }
        
        let html = '';
        boloes.forEach(bolao => {
            const checked = selecionados.includes(bolao.id) ? 'checked' : '';
            const status = statusMap[bolao.id] || 'andamento';
            
            html += `
                <div style="padding: 12px; border-bottom: 1px solid #eee; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <input type="checkbox" class="checkbox-bolao" data-id="${bolao.id}" ${checked} style="width: 20px; height: 20px;">
                        <strong>${bolao.titulo || 'Sem título'}</strong>
                        <span style="font-size: 11px; color: #666;">${bolao.participantes?.length || 0} participantes | ${bolao.loteria || '?'}</span>
                    </div>
                    <div style="margin-left: 35px; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                        <label style="font-size: 12px;">Status:</label>
                        <select class="status-select" data-id="${bolao.id}" style="padding: 4px 8px; border-radius: 6px;">
                            <option value="aberto" ${status === 'aberto' ? 'selected' : ''}>🟢 ABERTO</option>
                            <option value="andamento" ${status === 'andamento' ? 'selected' : ''}>🟡 EM ANDAMENTO</option>
                        </select>
                        <label style="font-size: 12px;">Data limite:</label>
                        <input type="date" class="data-limite-input" data-id="${bolao.id}" value="${dataLimiteMap[bolao.id] || ''}" style="padding: 4px 8px; border-radius: 6px;">
                    </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', () => salvarConfigBoloes());
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
    
    try {
        await db.collection('config_boloes').doc('ativos').set({ 
            ids: idsSelecionados,
            status: statusMap,
            dataLimite: dataLimiteMap
        });
        showToast(`✅ ${idsSelecionados.length} bolão(ões) selecionado(s)`, 'success');
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showToast('❌ Erro ao salvar seleção', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    document.getElementById('btnAutenticar').onclick = autenticar;
    document.getElementById('btnSair').onclick = sair;
    document.getElementById('adminBtnMega').onclick = () => setLoteriaAdmin('mega');
    document.getElementById('adminBtnLotofacil').onclick = () => setLoteriaAdmin('lotofacil');
    document.getElementById('adminBtnQuina').onclick = () => setLoteriaAdmin('quina');
    document.getElementById('btnAdicionar').onclick = adicionarCartoes;
    document.getElementById('btnLimpar').onclick = limparFormulario;
    
    // Verificar se o botão existe antes de atribuir evento
    const btnSalvarResultado = document.getElementById('btnSalvarResultado');
    if (btnSalvarResultado) btnSalvarResultado.onclick = salvarResultado;
    
    document.getElementById('btnRecarregar').onclick = recarregarLista;
    document.getElementById('btnExcluirSelecionados').onclick = excluirSelecionados;
    document.getElementById('btnImportarExcel').onclick = importarExcel;
    document.getElementById('btnSalvarPix').onclick = salvarPixConfig;
    
    const btnExportar = document.getElementById('btnExportarExcel');
    if (btnExportar) btnExportar.onclick = exportarCartoes;
    document.getElementById('filtroConcurso').onchange = exibirCartoesAdmin;
    document.getElementById('ordenarPor').onchange = exibirCartoesAdmin;
    document.getElementById('senhaAdmin').onkeypress = (e) => { if (e.key === 'Enter') autenticar(); };
    
    carregarBoloesParaGerenciar();
    const btnSalvarSelecao = document.getElementById('btnSalvarSelecao');
    if (btnSalvarSelecao) {
        btnSalvarSelecao.addEventListener('click', salvarConfigBoloes);
    }
});

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