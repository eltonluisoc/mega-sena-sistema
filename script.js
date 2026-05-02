// Variáveis globais
let concursos = [];
let cartoesStorage = {};

// Carregar concursos ao iniciar
async function carregarConcursos() {
    const select = document.getElementById('concursoSelect');
    select.innerHTML = '<option value="">Carregando concursos...</option>';
    
    try {
        const snapshot = await db.collection('concursos').get();
        concursos = [];
        
        snapshot.forEach(doc => {
            concursos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        concursos.sort((a, b) => b.numero - a.numero);
        
        if (concursos.length === 0) {
            select.innerHTML = '<option value="">Nenhum concurso cadastrado ainda</option>';
        } else {
            select.innerHTML = '<option value="">Selecione um concurso</option>';
            concursos.forEach(concurso => {
                const option = document.createElement('option');
                option.value = concurso.numero;
                option.textContent = `Concurso ${concurso.numero} (${concurso.totalCartoes} cartões)`;
                select.appendChild(option);
            });
        }
        
        atualizarStats();
    } catch (error) {
        console.error('Erro ao carregar concursos:', error);
        select.innerHTML = '<option value="">Erro ao carregar dados</option>';
    }
}

// Atualizar estatísticas
async function atualizarStats() {
    try {
        const snapshot = await db.collection('cartoes').get();
        const total = snapshot.size;
        document.getElementById('totalCartoes').textContent = `📊 ${total} cartões`;
    } catch (error) {
        console.error('Erro ao atualizar stats:', error);
    }
}

// Buscar resultado online
async function buscarResultadoOnline() {
    const concurso = document.getElementById('concursoSelect').value;
    if (!concurso) {
        mostrarStatus('⚠️ Selecione um concurso primeiro!', 'erro');
        return;
    }
    
    const btnBuscar = document.getElementById('btnBuscar');
    btnBuscar.disabled = true;
    btnBuscar.textContent = '⏳ BUSCANDO...';
    
    mostrarStatus(`🔍 Buscando resultado do concurso ${concurso}...`, 'info');
    
    // Simular busca (em produção, usar API real)
    setTimeout(() => {
        // Simular números encontrados
        const numerosExemplo = [12, 15, 23, 34, 45, 56].sort((a,b) => a-b).join(' ');
        document.getElementById('numerosSorteados').value = numerosExemplo;
        mostrarStatus(`✅ Resultado encontrado! Números: ${numerosExemplo}`, 'sucesso');
        
        btnBuscar.disabled = false;
        btnBuscar.textContent = '🌐 BUSCAR ONLINE';
    }, 2000);
}

// Mostrar status
function mostrarStatus(mensagem, tipo) {
    const statusDiv = document.getElementById('statusBusca');
    statusDiv.textContent = mensagem;
    statusDiv.className = `status-text status-${tipo}`;
    
    setTimeout(() => {
        if (statusDiv.textContent === mensagem) {
            statusDiv.textContent = '';
            statusDiv.className = 'status-text';
        }
    }, 5000);
}

// Conferir resultados
async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    const numerosText = document.getElementById('numerosSorteados').value;
    
    if (!concurso) {
        alert('⚠️ Selecione um concurso!');
        return;
    }
    
    if (!numerosText.trim()) {
        alert('⚠️ Digite os números sorteados ou clique em "Buscar Online"!');
        return;
    }
    
    // Extrair números
    const numerosSorteados = numerosText.match(/\d+/g).map(Number).sort((a,b) => a-b);
    
    if (numerosSorteados.length < 6) {
        alert('⚠️ Digite pelo menos 6 números sorteados!');
        return;
    }
    
    // Mostrar loading
    const resultadosArea = document.getElementById('resultadosArea');
    resultadosArea.innerHTML = '<div class="empty-state">🔍 PROCESSANDO... Aguarde</div>';
    
    // Buscar cartões do concurso
    try {
        const snapshot = await db.collection('cartoes')
            .where('concurso', '==', concurso)
            .get();
        
        if (snapshot.empty) {
            resultadosArea.innerHTML = '<div class="empty-state">📭 Nenhum cartão cadastrado para este concurso</div>';
            return;
        }
        
        // Processar resultados
        const cartoes = [];
        snapshot.forEach(doc => {
            cartoes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Calcular acertos
        const resultados = cartoes.map(cartao => {
            const acertos = cartao.numeros.filter(n => numerosSorteados.includes(n)).length;
            return { ...cartao, acertos };
        });
        
        // Ordenar por acertos
        resultados.sort((a, b) => b.acertos - a.acertos);
        
        // Agrupar por bolão
        const porBolao = {};
        resultados.forEach(r => {
            const bolao = r.bolao || 'Sem Bolão';
            if (!porBolao[bolao]) porBolao[bolao] = [];
            porBolao[bolao].push(r);
        });
        
        // Exibir resultados
        resultadosArea.innerHTML = '';
        
        // Estatísticas gerais
        const totalSenas = resultados.filter(r => r.acertos >= 6).length;
        const totalQuinas = resultados.filter(r => r.acertos === 5).length;
        const totalQuadras = resultados.filter(r => r.acertos === 4).length;
        
        const statsDiv = document.createElement('div');
        statsDiv.className = 'card';
        statsDiv.innerHTML = `
            <div class="card-header bg-purple">🏆 RESUMO DA CONFERÊNCIA</div>
            <div class="card-body">
                <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${totalSenas}</div>
                        <div>Sena(s)</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #eab308;">${totalQuinas}</div>
                        <div>Quina(s)</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #a855f7;">${totalQuadras}</div>
                        <div>Quadra(s)</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;">${resultados.length}</div>
                        <div>Total Cartões</div>
                    </div>
                </div>
                <div style="margin-top: 15px; text-align: center; color: #059669; font-weight: bold;">
                    🎲 Números Sorteados: ${numerosSorteados.join(' - ')}
                </div>
            </div>
        `;
        resultadosArea.appendChild(statsDiv);
        
        // Resultados por bolão
        for (const [bolao, cartoesBolao] of Object.entries(porBolao)) {
            const bolaoDiv = document.createElement('div');
            bolaoDiv.className = 'card';
            bolaoDiv.innerHTML = `
                <div class="card-header bg-blue">🎯 ${bolao}</div>
                <div class="card-body">
                    ${cartoesBolao.map(cartao => `
                        <div class="resultado-card">
                            <div class="resultado-header">
                                <span class="resultado-bolao">Cartão #${cartao.id}</span>
                                <span class="resultado-acertos acertos-${Math.min(cartao.acertos, 6)}">
                                    ${cartao.acertos} acerto${cartao.acertos !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div class="resultado-numeros">
                                ${cartao.numeros.map(num => `
                                    <span class="${numerosSorteados.includes(num) ? 'numero-sorteado' : 'numero-normal'}">
                                        ${num.toString().padStart(2, '0')}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            resultadosArea.appendChild(bolaoDiv);
        }
        
    } catch (error) {
        console.error('Erro ao conferir:', error);
        resultadosArea.innerHTML = '<div class="empty-state">❌ Erro ao conferir resultados. Tente novamente.</div>';
    }
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
    carregarConcursos();
    
    document.getElementById('btnBuscar').addEventListener('click', buscarResultadoOnline);
    document.getElementById('btnConferir').addEventListener('click', conferirResultados);
});

// Atualizar a cada 30 segundos
setInterval(carregarConcursos, 30000);