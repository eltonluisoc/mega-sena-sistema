// ============ VARIÁVEIS GLOBAIS ============
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
            const data = doc.data();
            cartoes.push({
                id: doc.id,
                concurso: data.concurso,
                bolao: data.bolao || 'Sem Bolão',
                numeros: data.numeros,
                totalNumeros: data.totalNumeros
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
        console.log(`📋 Concursos: ${[...new Set(cartoes.map(c => c.concurso))].join(', ')}`);
        
        // Atualizar interfaces
        atualizarSelectConcursos();
        atualizarStats();
        selecionarUltimoConcurso();
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// ============ ATUALIZAR SELECT ============
function atualizarSelectConcursos() {
    const concursos = [...new Set(cartoes.map(c => c.concurso))];
    concursos.sort((a, b) => b - a);
    
    const select = document.getElementById('concursoSelect');
    select.innerHTML = '<option value="">Selecione um concurso</option>';
    
    concursos.forEach(concurso => {
        const total = cartoes.filter(c => c.concurso == concurso).length;
        const option = document.createElement('option');
        option.value = concurso;
        option.textContent = `Concurso ${concurso} (${total} cartões)`;
        select.appendChild(option);
    });
    
    console.log(`✅ ${concursos.length} concursos no select`);
}

// ============ SELECIONAR ÚLTIMO ============
function selecionarUltimoConcurso() {
    const select = document.getElementById('concursoSelect');
    if (select.options.length > 1) {
        select.selectedIndex = 1;
        mostrarCartoesDoConcurso();
        console.log(`📌 Último concurso: ${select.value}`);
    }
}

// ============ MOSTRAR CARTÕES ============
function mostrarCartoesDoConcurso() {
    const concurso = document.getElementById('concursoSelect').value;
    const container = document.getElementById('cartoesConcurso');
    
    if (!concurso) {
        container.innerHTML = '<div class="empty-state">Selecione um concurso</div>';
        return;
    }
    
    const cartoesConcurso = cartoes.filter(c => c.concurso == concurso);
    
    if (cartoesConcurso.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso}</div>`;
        return;
    }
    
    // Agrupar por bolão
    const porBolao = {};
    cartoesConcurso.forEach(c => {
        const bolao = c.bolao || 'Sem Bolão';
        if (!porBolao[bolao]) porBolao[bolao] = [];
        porBolao[bolao].push(c);
    });
    
    let html = '';
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="margin-bottom: 20px;"><div style="background: #3b82f6; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 10px;">🎯 ${bolao}</div><div style="display: flex; flex-wrap: wrap; gap: 10px;">`;
        
        lista.forEach(cartao => {
            html += `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; min-width: 200px;">
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 5px;">Cartão</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                        ${cartao.numeros.map(n => `<span style="background: #e2e8f0; padding: 4px 8px; border-radius: 5px; font-family: monospace;">${n.toString().padStart(2, '0')}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }
    
    container.innerHTML = html;
    console.log(`📋 ${cartoesConcurso.length} cartões exibidos`);
}

// ============ ESTATÍSTICAS ============
function atualizarStats() {
    const total = cartoes.length;
    const concursos = [...new Set(cartoes.map(c => c.concurso))].length;
    const resultadosCount = Object.keys(resultados).length;
    document.getElementById('totalCartoes').innerHTML = `📊 ${total} cartões | 🎯 ${concursos} concursos | ✅ ${resultadosCount} resultados`;
}

// ============ BUSCAR RESULTADO ONLINE ============
async function buscarResultadoOnline() {
    const concurso = document.getElementById('concursoSelect').value;
    
    if (!concurso) {
        alert('⚠️ Selecione um concurso primeiro!');
        return;
    }
    
    const btnBuscar = document.getElementById('btnBuscar');
    btnBuscar.disabled = true;
    btnBuscar.textContent = '⏳ BUSCANDO...';
    
    document.getElementById('statusBusca').innerHTML = `<div class="status-info">🔍 Buscando resultado do concurso ${concurso}...</div>`;
    
    let numeros = null;
    let apiUsada = '';
    
    // API 1: Brasil API (com hífen)
    try {
        const url = `https://brasilapi.com.br/api/loterias/mega-sena/${concurso}`;
        console.log('🌐 Tentando Brasil API:', url);
        const response = await fetch(url);
        if (response.ok) {
            const dados = await response.json();
            if (dados.dezenas && dados.dezenas.length >= 6) {
                numeros = dados.dezenas.map(n => parseInt(n));
                apiUsada = 'Brasil API';
                console.log('✅ Brasil API funcionou!');
            }
        }
    } catch (error) {
        console.log('❌ Brasil API falhou:', error);
    }
    
    // API 2: Loteria API (sem hífen - megasena junto)
    if (!numeros) {
        try {
            const url = `https://loteriascaixa-api.herokuapp.com/api/megasena/${concurso}`;
            console.log('🌐 Tentando Loteria API:', url);
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.dezenas && dados.dezenas.length >= 6) {
                    numeros = dados.dezenas.map(n => parseInt(n));
                    apiUsada = 'Loteria API';
                    console.log('✅ Loteria API funcionou!');
                }
            }
        } catch (error) {
            console.log('❌ Loteria API falhou:', error);
        }
    }
    
    if (numeros && numeros.length >= 6) {
        numeros.sort((a, b) => a - b);
        document.getElementById('numerosSorteados').value = numeros.join(' ');
        document.getElementById('statusBusca').innerHTML = `<div class="status-success">✅ Resultado encontrado! (${apiUsada})<br>Números: ${numeros.join(' - ')}</div>`;
    } else {
        document.getElementById('statusBusca').innerHTML = `<div class="status-error">❌ Concurso ${concurso} não encontrado ou ainda não foi sorteado.<br>Digite os números manualmente quando sair o resultado.</div>`;
    }
    
    btnBuscar.disabled = false;
    btnBuscar.textContent = '🌐 BUSCAR ONLINE';
}

// ============ CONFERIR ============
async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    const texto = document.getElementById('numerosSorteados').value;
    
    if (!concurso) { alert('Selecione um concurso!'); return; }
    if (!texto.trim()) { alert('Digite os números sorteados!'); return; }
    
    const sorteados = texto.match(/\d+/g).map(Number);
    if (sorteados.length < 6) { alert('Digite pelo menos 6 números!'); return; }
    
    const resultadosArea = document.getElementById('resultadosArea');
    resultadosArea.innerHTML = '<div class="loading">🔍 Processando...</div>';
    
    const cartoesConcurso = cartoes.filter(c => c.concurso == concurso);
    if (cartoesConcurso.length === 0) {
        resultadosArea.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso}</div>`;
        return;
    }
    
    const resultadosCalc = cartoesConcurso.map(c => ({
        ...c,
        acertos: c.numeros.filter(n => sorteados.includes(n)).length
    })).sort((a,b) => b.acertos - a.acertos);
    
    const senas = resultadosCalc.filter(r => r.acertos >= 6).length;
    const quinas = resultadosCalc.filter(r => r.acertos === 5).length;
    const quadras = resultadosCalc.filter(r => r.acertos === 4).length;
    
    let html = `
        <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <h3>🏆 RESULTADO</h3>
            <div style="display: flex; justify-content: center; gap: 30px; margin: 15px 0;">
                <div><span style="font-size: 24px; font-weight: bold; color: #f59e0b;">${senas}</span><br>SENA(S)</div>
                <div><span style="font-size: 24px; font-weight: bold; color: #eab308;">${quinas}</span><br>QUINA(S)</div>
                <div><span style="font-size: 24px; font-weight: bold; color: #a855f7;">${quadras}</span><br>QUADRA(S)</div>
                <div><span style="font-size: 24px; font-weight: bold;">${resultadosCalc.length}</span><br>CARTÕES</div>
            </div>
            <div style="background: #d1fae5; padding: 10px; border-radius: 8px;">🎲 Sorteados: ${sorteados.join(' - ')}</div>
        </div>
    `;
    
    const porBolao = {};
    resultadosCalc.forEach(r => {
        const bolao = r.bolao || 'Sem Bolão';
        if (!porBolao[bolao]) porBolao[bolao] = [];
        porBolao[bolao].push(r);
    });
    
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;"><h4 style="color: #3b82f6;">🎯 ${bolao}</h4>`;
        lista.forEach(c => {
            const cor = c.acertos >= 6 ? '#f59e0b' : c.acertos >= 5 ? '#eab308' : c.acertos >= 4 ? '#a855f7' : '#cbd5e1';
            html += `
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Cartão</span>
                        <span style="background: ${cor}; color: white; padding: 2px 10px; border-radius: 20px;">${c.acertos} acertos</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${c.numeros.map(n => `<span style="background: ${sorteados.includes(n) ? '#10b981' : '#e2e8f0'}; color: ${sorteados.includes(n) ? 'white' : '#333'}; padding: 4px 8px; border-radius: 5px; font-family: monospace;">${n.toString().padStart(2, '0')}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    resultadosArea.innerHTML = html;
}

// ============ AUTO-ATUALIZAÇÃO ============
let intervalo;
function iniciarAutoAtualizacao() {
    if (intervalo) clearInterval(intervalo);
    intervalo = setInterval(() => {
        console.log('🔄 Auto-atualizando...');
        carregarDados();
    }, 60000);
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Página carregada');
    await carregarDados();
    iniciarAutoAtualizacao();
    
    document.getElementById('concursoSelect').addEventListener('change', mostrarCartoesDoConcurso);
    document.getElementById('btnBuscar').addEventListener('click', buscarResultadoOnline);
    document.getElementById('btnConferir').addEventListener('click', conferirResultados);
});