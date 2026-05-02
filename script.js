// Variáveis globais
let concursos = [];
let cartoes = [];
let resultados = {};

// ============ CARREGAR DADOS DO FIREBASE ============
async function carregarDados() {
    console.log('🔄 Carregando dados do Firebase...');
    
    try {
        // Carregar cartões
        const cartoesSnapshot = await db.collection('cartoes').get();
        cartoes = [];
        cartoesSnapshot.forEach(doc => {
            cartoes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Carregar resultados
        const resultadosSnapshot = await db.collection('resultados').get();
        resultados = {};
        resultadosSnapshot.forEach(doc => {
            resultados[doc.id] = doc.data().numeros;
        });
        
        console.log(`✅ ${cartoes.length} cartões carregados`);
        console.log(`✅ ${Object.keys(resultados).length} resultados carregados`);
        
        // Atualizar interface
        carregarConcursos();
        atualizarStats();
        
        // Selecionar último concurso automaticamente
        selecionarUltimoConcurso();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        mostrarStatus('Erro ao conectar com o banco de dados', 'error');
    }
}

// ============ CARREGAR CONCURSOS NO SELECT ============
function carregarConcursos() {
    const concursosLista = [...new Set(cartoes.map(c => c.concurso))];
    concursosLista.sort((a,b) => b - a);
    
    const select = document.getElementById('concursoSelect');
    select.innerHTML = '<option value="">Selecione um concurso</option>';
    
    concursosLista.forEach(concurso => {
        const total = cartoes.filter(c => c.concurso == concurso).length;
        const temResultado = resultados[concurso] ? ' ✓' : '';
        const option = document.createElement('option');
        option.value = concurso;
        option.textContent = `Concurso ${concurso} (${total} cartões)${temResultado}`;
        select.appendChild(option);
    });
    
    console.log(`✅ ${concursosLista.length} concursos carregados`);
}

// ============ SELECIONAR ÚLTIMO CONCURSO ============
function selecionarUltimoConcurso() {
    const select = document.getElementById('concursoSelect');
    if (select.options.length > 1) {
        // Último concurso é o primeiro da lista (ordenado decrescente)
        select.selectedIndex = 1;
        // Disparar evento para mostrar os cartões
        mostrarCartoesDoConcurso();
    }
}

// ============ MOSTRAR CARTÕES DO CONCURSO ============
async function mostrarCartoesDoConcurso() {
    const concurso = document.getElementById('concursoSelect').value;
    const container = document.getElementById('cartoesConcurso');
    
    if (!concurso) {
        container.innerHTML = '<div class="empty-state">📭 Selecione um concurso</div>';
        return;
    }
    
    const cartoesConcurso = cartoes.filter(c => c.concurso == concurso);
    
    if (cartoesConcurso.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Nenhum cartão cadastrado para este concurso</div>';
        return;
    }
    
    // Agrupar por bolão
    const porBolao = {};
    cartoesConcurso.forEach(cartao => {
        const bolao = cartao.bolao || 'Sem Bolão';
        if (!porBolao[bolao]) porBolao[bolao] = [];
        porBolao[bolao].push(cartao);
    });
    
    let html = '';
    
    for (const [bolao, cartoesBolao] of Object.entries(porBolao)) {
        html += `
            <div style="margin-bottom: 20px;">
                <div class="card-header bg-blue" style="margin-bottom: 10px;">🎯 ${bolao}</div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        `;
        
        cartoesBolao.forEach(cartao => {
            html += `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; width: auto; min-width: 200px;">
                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 5px;">Cartão #${cartao.id.slice(-6)}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                        ${cartao.numeros.map(n => `<span class="numero">${n.toString().padStart(2, '0')}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============ ESTATÍSTICAS RÁPIDAS ============
function atualizarStats() {
    const totalCartoes = cartoes.length;
    const totalConcursos = [...new Set(cartoes.map(c => c.concurso))].length;
    const totalResultados = Object.keys(resultados).length;
    
    document.getElementById('totalCartoes').textContent = `📊 ${totalCartoes} cartões`;
    document.getElementById('totalConcursos').textContent = `🎯 ${totalConcursos} concursos`;
    document.getElementById('totalResultados').textContent = `✅ ${totalResultados} resultados`;
}

// ============ BUSCAR RESULTADO ONLINE ============
async function buscarResultadoOnline() {
    const concurso = document.getElementById('concursoSelect').value;
    
    if (!concurso) {
        mostrarStatus('⚠️ Selecione um concurso primeiro!', 'error');
        return;
    }
    
    const btnBuscar = document.getElementById('btnBuscar');
    btnBuscar.disabled = true;
    btnBuscar.textContent = '⏳ BUSCANDO...';
    
    mostrarStatus(`🔍 Buscando resultado do concurso ${concurso}...`, 'info');
    
    let numeros = null;
    
    // Tentar Brasil API
    try {
        const url = `https://brasilapi.com.br/api/loterias/mega-sena/${concurso}`;
        const response = await fetch(url);
        if (response.ok) {
            const dados = await response.json();
            if (dados.dezenas && dados.dezenas.length >= 6) {
                numeros = dados.dezenas.map(n => parseInt(n));
            }
        }
    } catch (error) {
        console.log('Brasil API falhou');
    }
    
    // Tentar Loteria API
    if (!numeros) {
        try {
            const url = `https://loteriascaixa-api.herokuapp.com/api/mega-sena/${concurso}`;
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.dezenas && dados.dezenas.length >= 6) {
                    numeros = dados.dezenas.map(n => parseInt(n));
                }
            }
        } catch (error) {
            console.log('Loteria API falhou');
        }
    }
    
    if (numeros && numeros.length >= 6) {
        numeros.sort((a,b) => a-b);
        document.getElementById('numerosSorteados').value = numeros.join(' ');
        mostrarStatus(`✅ Resultado encontrado! Números: ${numeros.join(' - ')}`, 'success');
    } else {
        mostrarStatus(`❌ Resultado do concurso ${concurso} não encontrado online`, 'error');
    }
    
    btnBuscar.disabled = false;
    btnBuscar.textContent = '🌐 BUSCAR ONLINE';
}

// ============ CONFERIR RESULTADOS ============
async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    const numerosText = document.getElementById('numerosSorteados').value;
    
    if (!concurso) {
        mostrarStatus('⚠️ Selecione um concurso!', 'error');
        return;
    }
    
    if (!numerosText.trim()) {
        mostrarStatus('⚠️ Digite os números sorteados ou clique em "BUSCAR ONLINE"!', 'error');
        return;
    }
    
    const sorteados = numerosText.match(/\d+/g).map(Number);
    
    if (sorteados.length < 6) {
        mostrarStatus('⚠️ Digite pelo menos 6 números!', 'error');
        return;
    }
    
    // Mostrar loading
    const resultadosArea = document.getElementById('resultadosArea');
    resultadosArea.innerHTML = '<div class="loading">🔍 PROCESSANDO... Aguarde</div>';
    
    // Filtrar cartões do concurso
    const cartoesConcurso = cartoes.filter(c => c.concurso == concurso);
    
    if (cartoesConcurso.length === 0) {
        resultadosArea.innerHTML = '<div class="empty-state">📭 Nenhum cartão cadastrado para este concurso</div>';
        return;
    }
    
    // Calcular acertos
    const resultadosCalc = cartoesConcurso.map(cartao => {
        const acertos = cartao.numeros.filter(n => sorteados.includes(n)).length;
        return { ...cartao, acertos };
    });
    
    // Ordenar por mais acertos
    resultadosCalc.sort((a, b) => b.acertos - a.acertos);
    
    // Estatísticas
    const totalSenas = resultadosCalc.filter(r => r.acertos >= 6).length;
    const totalQuinas = resultadosCalc.filter(r => r.acertos === 5).length;
    const totalQuadras = resultadosCalc.filter(r => r.acertos === 4).length;
    
    // Agrupar por bolão
    const porBolao = {};
    resultadosCalc.forEach(r => {
        const bolao = r.bolao || 'Sem Bolão';
        if (!porBolao[bolao]) porBolao[bolao] = [];
        porBolao[bolao].push(r);
    });
    
    // Montar HTML
    let html = `
        <div class="card">
            <div class="card-header bg-green">🏆 RESULTADO DA CONFERÊNCIA</div>
            <div class="card-body">
                <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px;">
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${totalSenas}</div>
                        <div>SENA(S)</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #eab308;">${totalQuinas}</div>
                        <div>QUINA(S)</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #a855f7;">${totalQuadras}</div>
                        <div>QUADRA(S)</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;">${resultadosCalc.length}</div>
                        <div>CARTÕES</div>
                    </div>
                </div>
                <div style="text-align: center; color: #10b981; font-weight: bold;">
                    🎲 Números Sorteados: ${sorteados.join(' - ')}
                </div>
            </div>
        </div>
    `;
    
    // Exibir resultados por bolão
    for (const [bolao, bolaoResultados] of Object.entries(porBolao)) {
        html += `
            <div class="card">
                <div class="card-header bg-blue">🎯 ${bolao}</div>
                <div class="card-body">
                    ${bolaoResultados.map(cartao => `
                        <div class="resultado-card">
                            <div class="resultado-header">
                                <span class="resultado-bolao">Cartão #${cartao.id.slice(-6)}</span>
                                <span class="acertos acertos-${Math.min(cartao.acertos, 6)}">
                                    ${cartao.acertos} ACERTO${cartao.acertos !== 1 ? 'S' : ''}
                                </span>
                            </div>
                            <div class="numeros">
                                ${cartao.numeros.map(n => `
                                    <span class="numero ${sorteados.includes(n) ? 'numero-sorteado' : 'numero-normal'}">
                                        ${n.toString().padStart(2, '0')}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    resultadosArea.innerHTML = html;
}

// ============ AUTO-ATUALIZAÇÃO ============
let intervaloAtualizacao;

function iniciarAutoAtualizacao() {
    if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);
    
    intervaloAtualizacao = setInterval(async () => {
        console.log('🔄 Auto-atualização...');
        await carregarDados();
        
        // Se já tem resultado selecionado, atualiza a visualização
        const concursoSelecionado = document.getElementById('concursoSelect').value;
        if (concursoSelecionado && resultados[concursoSelecionado]) {
            const numeros = resultados[concursoSelecionado];
            document.getElementById('numerosSorteados').value = numeros.join(' ');
        }
    }, 60000); // 60 segundos
}

// ============ MOSTRAR STATUS ============
function mostrarStatus(mensagem, tipo) {
    const statusDiv = document.getElementById('statusBusca');
    statusDiv.textContent = mensagem;
    statusDiv.className = `status status-${tipo}`;
    
    setTimeout(() => {
        if (statusDiv.textContent === mensagem) {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }
    }, 5000);
}

// ============ EVENTOS ============
document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    iniciarAutoAtualizacao();
    
    document.getElementById('concursoSelect').addEventListener('change', mostrarCartoesDoConcurso);
    document.getElementById('btnBuscar').addEventListener('click', buscarResultadoOnline);
    document.getElementById('btnConferir').addEventListener('click', conferirResultados);
});