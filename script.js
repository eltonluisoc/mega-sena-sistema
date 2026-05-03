let cartoes = [];
let resultados = {};
let ultimoResultadoConcurso = null;
let ultimoResultadoDados = null;

// ============ TOAST FUNCTION ============
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
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) container.remove();
        }, 300);
    }, 3000);
}

// ============ CARREGAR DADOS ============
async function carregarDados() {
    try {
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
        
        const resultadosSnapshot = await db.collection('resultados').get();
        resultados = {};
        resultadosSnapshot.forEach(doc => {
            resultados[doc.id] = doc.data().numeros;
        });
        
        atualizarSelectConcursos();
        atualizarStats();
        selecionarUltimoConcurso();
        showToast(`📊 ${cartoes.length} cartões carregados`, 'info');
    } catch (error) {
        showToast('❌ Erro ao carregar dados', 'error');
    }
}

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
}

function selecionarUltimoConcurso() {
    const select = document.getElementById('concursoSelect');
    if (select.options.length > 1) {
        select.selectedIndex = 1;
        mostrarCartoesDoConcurso();
    }
}

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
    
    const resultadoSalvo = resultados[concurso] || [];
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
                        ${cartao.numeros.map(n => `<span style="background: ${resultadoSalvo.includes(n) ? '#10b981' : '#e2e8f0'}; color: ${resultadoSalvo.includes(n) ? 'white' : '#333'}; padding: 4px 8px; border-radius: 5px; font-family: monospace;">${n.toString().padStart(2, '0')}</span>`).join('')}
                    </div>
                    ${resultadoSalvo.length > 0 ? `<div style="font-size: 10px; color: #10b981; margin-top: 5px;">${cartao.numeros.filter(n => resultadoSalvo.includes(n)).length} acertos</div>` : ''}
                </div>
            `;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

function atualizarStats() {
    const total = cartoes.length;
    const concursos = [...new Set(cartoes.map(c => c.concurso))].length;
    const resultadosCount = Object.keys(resultados).length;
    document.getElementById('totalCartoes').innerHTML = `📊 ${total} cartões | 🎯 ${concursos} concursos | ✅ ${resultadosCount} resultados`;
}

function extrairDataSorteio(dados) {
    if (dados.dataApuracao) return dados.dataApuracao;
    if (dados.data_sorteio) return dados.data_sorteio;
    if (dados.data) return dados.data;
    return null;
}

async function buscarResultadoOnlineInterno(concurso) {
    let numeros = null;
    let dataSorteio = null;
    
    try {
        const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concurso}`;
        const response = await fetch(url);
        if (response.ok) {
            const dados = await response.json();
            if (dados.listaDezenas && dados.listaDezenas.length >= 6) {
                numeros = dados.listaDezenas.map(n => parseInt(n));
                dataSorteio = extrairDataSorteio(dados);
            }
        }
    } catch (error) {}
    
    if (!numeros) {
        try {
            const url = `https://brasilapi.com.br/api/loterias/mega-sena/${concurso}`;
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.dezenas && dados.dezenas.length >= 6) {
                    numeros = dados.dezenas.map(n => parseInt(n));
                    dataSorteio = extrairDataSorteio(dados);
                }
            }
        } catch (error) {}
    }
    
    if (numeros && numeros.length >= 6) {
        numeros.sort((a, b) => a - b);
        return { numeros, dataSorteio };
    }
    return null;
}

function compartilharWhatsApp() {
    if (!ultimoResultadoConcurso || !ultimoResultadoDados) {
        showToast('⚠️ Nenhum resultado para compartilhar. Clique em "Conferir" primeiro.', 'warning');
        return;
    }
    
    const numeros = ultimoResultadoDados.numeros;
    const data = ultimoResultadoDados.dataSorteio ? new Date(ultimoResultadoDados.dataSorteio).toLocaleDateString('pt-BR') : '';
    const totalSenas = ultimoResultadoDados.totalSenas || 0;
    const totalQuinas = ultimoResultadoDados.totalQuinas || 0;
    const totalQuadras = ultimoResultadoDados.totalQuadras || 0;
    
    let mensagem = `🎲 *RESULTADO BOLÕES ALEATÓRIOS* 🎲\n\n`;
    mensagem += `📌 *Concurso:* ${ultimoResultadoConcurso}\n`;
    mensagem += `🎯 *Números Sorteados:* ${numeros.join(' - ')}\n`;
    if (data) mensagem += `📅 *Data:* ${data}\n`;
    mensagem += `\n🏆 *PREMIAÇÕES DO BOLÃO:*\n`;
    mensagem += `• SENA(S): ${totalSenas}\n`;
    mensagem += `• QUINA(S): ${totalQuinas}\n`;
    mensagem += `• QUADRA(S): ${totalQuadras}\n`;
    mensagem += `\n🔗 Confira no site: ${window.location.href}`;
    
    const textoCodificado = encodeURIComponent(mensagem);
    const urlWhatsApp = `https://wa.me/?text=${textoCodificado}`;
    window.open(urlWhatsApp, '_blank');
    showToast('📱 Abrindo WhatsApp...', 'info');
}

async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    
    if (!concurso) {
        showToast('⚠️ Selecione um concurso!', 'warning');
        return;
    }
    
    const resultadosArea = document.getElementById('resultadosArea');
    const statusDiv = document.getElementById('statusBusca');
    
    resultadosArea.innerHTML = '<div class="loading">🔍 Processando...</div>';
    
    let numerosSorteados = null;
    let dataSorteio = null;
    let totalSenas = 0, totalQuinas = 0, totalQuadras = 0;
    
    if (resultados[concurso]) {
        numerosSorteados = resultados[concurso];
        showToast('📋 Usando resultado salvo', 'info');
    } else {
        showToast('🔍 Buscando resultado online...', 'info');
        const resultadoBusca = await buscarResultadoOnlineInterno(concurso);
        if (resultadoBusca) {
            numerosSorteados = resultadoBusca.numeros;
            dataSorteio = resultadoBusca.dataSorteio;
            document.getElementById('numerosSorteados').value = numerosSorteados.join(' ');
            showToast('✅ Resultado encontrado!', 'success');
        } else {
            resultadosArea.innerHTML = `<div class="empty-state">❌ Resultado do concurso ${concurso} não encontrado online.<br><br>Digite os números manualmente no campo acima e clique em "Conferir" novamente.</div>`;
            showToast('❌ Resultado não encontrado online', 'error');
            return;
        }
    }
    
    const cartoesConcurso = cartoes.filter(c => c.concurso == concurso);
    
    if (cartoesConcurso.length === 0) {
        resultadosArea.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso}</div>`;
        return;
    }
    
    const resultadosCalc = cartoesConcurso.map(c => ({
        ...c,
        acertos: c.numeros.filter(n => numerosSorteados.includes(n)).length
    })).sort((a, b) => b.acertos - a.acertos);
    
    totalSenas = resultadosCalc.filter(r => r.acertos >= 6).length;
    totalQuinas = resultadosCalc.filter(r => r.acertos === 5).length;
    totalQuadras = resultadosCalc.filter(r => r.acertos === 4).length;
    
    ultimoResultadoConcurso = concurso;
    ultimoResultadoDados = {
        numeros: numerosSorteados,
        dataSorteio: dataSorteio,
        totalSenas: totalSenas,
        totalQuinas: totalQuinas,
        totalQuadras: totalQuadras
    };
    
    let html = `
        <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <h3>🏆 RESULTADO DO CONCURSO ${concurso}</h3>
            <div style="display: flex; justify-content: center; gap: 30px; margin: 15px 0; flex-wrap: wrap;">
                <div><span style="font-size: 24px; font-weight: bold; color: #f59e0b;">${totalSenas}</span><br>SENA(S)</div>
                <div><span style="font-size: 24px; font-weight: bold; color: #eab308;">${totalQuinas}</span><br>QUINA(S)</div>
                <div><span style="font-size: 24px; font-weight: bold; color: #a855f7;">${totalQuadras}</span><br>QUADRA(S)</div>
                <div><span style="font-size: 24px; font-weight: bold;">${resultadosCalc.length}</span><br>CARTÕES</div>
            </div>
            <div style="background: #d1fae5; padding: 10px; border-radius: 8px;">
                🎲 Sorteados: ${numerosSorteados.join(' - ')}
                ${dataSorteio ? `<br>📅 Data do sorteio: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}` : ''}
            </div>
            <button id="btnWhatsApp" class="btn-whatsapp" style="margin-top: 15px;">📱 COMPARTILHAR NO WHATSAPP</button>
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
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                        <span>Cartão</span>
                        <span style="background: ${cor}; color: white; padding: 2px 10px; border-radius: 20px;">${c.acertos} acertos</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${c.numeros.map(n => `<span style="background: ${numerosSorteados.includes(n) ? '#10b981' : '#e2e8f0'}; color: ${numerosSorteados.includes(n) ? 'white' : '#333'}; padding: 4px 8px; border-radius: 5px; font-family: monospace; font-size: 12px;">${n.toString().padStart(2, '0')}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    resultadosArea.innerHTML = html;
    mostrarCartoesDoConcurso();
    
    document.getElementById('btnWhatsApp')?.addEventListener('click', compartilharWhatsApp);
    showToast(`🏆 Conferência concluída! ${totalSenas + totalQuinas + totalQuadras} prêmio(s)`, 'success');
}

let intervalo;
function iniciarAutoAtualizacao() {
    if (intervalo) clearInterval(intervalo);
    intervalo = setInterval(() => {
        carregarDados();
    }, 60000);
}

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    iniciarAutoAtualizacao();
    
    document.getElementById('concursoSelect').addEventListener('change', mostrarCartoesDoConcurso);
    document.getElementById('btnConferir').addEventListener('click', conferirResultados);
    document.getElementById('btnConferir').addEventListener('touchstart', conferirResultados);
    
    mostrarCartoesDoConcurso();
    showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
});