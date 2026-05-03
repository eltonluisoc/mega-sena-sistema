// ============ VARIÁVEIS GLOBAIS ============
let cartoesMega = [];
let cartoesLotofacil = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let loteriaAtual = 'mega'; // 'mega' ou 'lotofacil'
let ultimoResultadoConcurso = null;
let ultimoResultadoDados = null;
let ultimoEstadoMega = {};
let ultimoEstadoLotofacil = {};

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

// ============ TROCAR LOTERIA ============
function setLoteria(loteria) {
    loteriaAtual = loteria;
    
    // Atualizar botões
    document.getElementById('btnMegaSena').classList.remove('active');
    document.getElementById('btnLotofacil').classList.remove('active');
    if (loteria === 'mega') {
        document.getElementById('btnMegaSena').classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🔍 CONFERIR RESULTADOS - MEGA-SENA';
        document.getElementById('cardHeaderCartoes').innerHTML = '📋 CARTÕES DO CONCURSO - MEGA-SENA';
        document.getElementById('labelNumeros').innerHTML = '🎲 NÚMEROS SORTEADOS (6 números):';
        document.getElementById('numerosSorteados').placeholder = 'Ex: 12 15 23 34 45 56';
    } else {
        document.getElementById('btnLotofacil').classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🔍 CONFERIR RESULTADOS - LOTOFÁCIL';
        document.getElementById('cardHeaderCartoes').innerHTML = '📋 CARTÕES DO CONCURSO - LOTOFÁCIL';
        document.getElementById('labelNumeros').innerHTML = '🎲 NÚMEROS SORTEADOS (15 números):';
        document.getElementById('numerosSorteados').placeholder = 'Ex: 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15';
    }
    
    atualizarSelectConcursos();
    if (document.getElementById('concursoSelect').value) {
        mostrarCartoesDoConcurso();
    }
    showToast(`🔄 Mudou para ${loteria === 'mega' ? 'MEGA-SENA' : 'LOTOFÁCIL'}`, 'info');
}

// ============ CARREGAR DADOS ============
async function carregarDados() {
    try {
        // Carregar Mega-Sena
        const snapshotMega = await db.collection('cartoes_mega').get();
        cartoesMega = [];
        snapshotMega.forEach(doc => {
            const data = doc.data();
            cartoesMega.push({
                id: doc.id,
                concurso: data.concurso,
                bolao: data.bolao || 'Sem Bolão',
                numeros: data.numeros,
                totalNumeros: data.totalNumeros
            });
        });
        
        const resMega = await db.collection('resultados_mega').get();
        resultadosMega = {};
        resMega.forEach(doc => {
            resultadosMega[doc.id] = doc.data().numeros;
        });
        
        // Carregar Lotofácil
        const snapshotLoto = await db.collection('cartoes_lotofacil').get();
        cartoesLotofacil = [];
        snapshotLoto.forEach(doc => {
            const data = doc.data();
            cartoesLotofacil.push({
                id: doc.id,
                concurso: data.concurso,
                bolao: data.bolao || 'Sem Bolão',
                numeros: data.numeros,
                totalNumeros: data.totalNumeros
            });
        });
        
        const resLoto = await db.collection('resultados_lotofacil').get();
        resultadosLotofacil = {};
        resLoto.forEach(doc => {
            resultadosLotofacil[doc.id] = doc.data().numeros;
        });
        
        if (Object.keys(ultimoEstadoMega).length === 0) {
            ultimoEstadoMega = JSON.parse(JSON.stringify(resultadosMega));
            ultimoEstadoLotofacil = JSON.parse(JSON.stringify(resultadosLotofacil));
        }
        
        atualizarSelectConcursos();
        atualizarStats();
        selecionarUltimoConcurso();
        showToast(`📊 Dados carregados`, 'info');
    } catch (error) {
        showToast('❌ Erro ao carregar dados', 'error');
    }
}

function atualizarStats() {
    const total = loteriaAtual === 'mega' ? cartoesMega.length : cartoesLotofacil.length;
    const concursos = [...new Set((loteriaAtual === 'mega' ? cartoesMega : cartoesLotofacil).map(c => c.concurso))];
    const resultadosCount = Object.keys(loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil).length;
    document.getElementById('totalCartoes').innerHTML = `📊 ${total} cartões | 🎯 ${concursos.length} concursos | ✅ ${resultadosCount} resultados`;
}

function atualizarSelectConcursos() {
    const dados = loteriaAtual === 'mega' ? cartoesMega : cartoesLotofacil;
    const concursos = [...new Set(dados.map(c => c.concurso))];
    concursos.sort((a, b) => b - a);
    
    const select = document.getElementById('concursoSelect');
    select.innerHTML = '<option value="">Selecione um concurso</option>';
    
    concursos.forEach(concurso => {
        const total = dados.filter(c => c.concurso == concurso).length;
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
    
    const dados = loteriaAtual === 'mega' ? cartoesMega : cartoesLotofacil;
    const resultados = loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil;
    const cartoesConcurso = dados.filter(c => c.concurso == concurso);
    
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
            const numerosHtml = cartao.numeros.map(n => 
                `<span style="background: ${resultadoSalvo.includes(n) ? '#10b981' : '#e2e8f0'}; color: ${resultadoSalvo.includes(n) ? 'white' : '#333'}; padding: 4px 8px; border-radius: 5px; font-family: monospace; font-size: ${loteriaAtual === 'mega' ? '12px' : '10px'};">${n.toString().padStart(2, '0')}</span>`
            ).join('');
            
            html += `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; min-width: 200px; max-width: ${loteriaAtual === 'mega' ? '250px' : '350px'};">
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 5px;">Cartão</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                        ${numerosHtml}
                    </div>
                    ${resultadoSalvo.length > 0 ? `<div style="font-size: 10px; color: #10b981; margin-top: 5px;">${cartao.numeros.filter(n => resultadoSalvo.includes(n)).length} acertos</div>` : ''}
                </div>
            `;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

// ============ BUSCAR RESULTADO ONLINE ============
async function buscarResultadoInterno(concurso, loteria) {
    let numeros = null;
    let dataSorteio = null;
    
    if (loteria === 'mega') {
        try {
            const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concurso}`;
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.listaDezenas && dados.listaDezenas.length >= 6) {
                    numeros = dados.listaDezenas.map(n => parseInt(n));
                    dataSorteio = dados.dataApuracao;
                }
            }
        } catch(e) {}
        if (!numeros) {
            try {
                const url = `https://brasilapi.com.br/api/loterias/mega-sena/${concurso}`;
                const response = await fetch(url);
                if (response.ok) {
                    const dados = await response.json();
                    if (dados.dezenas && dados.dezenas.length >= 6) {
                        numeros = dados.dezenas.map(n => parseInt(n));
                        dataSorteio = dados.data_apuracao;
                    }
                }
            } catch(e) {}
        }
    } else {
        try {
            const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${concurso}`;
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.listaDezenas && dados.listaDezenas.length >= 15) {
                    numeros = dados.listaDezenas.map(n => parseInt(n));
                    dataSorteio = dados.dataApuracao;
                }
            }
        } catch(e) {}
    }
    
    if (numeros && numeros.length >= (loteria === 'mega' ? 6 : 15)) {
        numeros.sort((a, b) => a - b);
        return { numeros, dataSorteio };
    }
    return null;
}

// ============ COMPARTILHAR WHATSAPP ============
function compartilharWhatsApp() {
    if (!ultimoResultadoConcurso || !ultimoResultadoDados) {
        showToast('⚠️ Nenhum resultado para compartilhar. Clique em "Conferir" primeiro.', 'warning');
        return;
    }
    
    const numeros = ultimoResultadoDados.numeros;
    const data = ultimoResultadoDados.dataSorteio ? new Date(ultimoResultadoDados.dataSorteio).toLocaleDateString('pt-BR') : '';
    const premios = ultimoResultadoDados.premios;
    
    let tituloSecao = '🏆 PREMIAÇÕES DO BOLÃO:';
    let mensagemIncentivo = '';
    
    if (loteriaAtual === 'mega') {
        const { sena, quina, quadra, terno, duque } = premios;
        if (sena > 0) mensagemIncentivo = '🎉🎉🎉 TEVE SENA! PARABÉNS! 🎉🎉🎉';
        else if (quina > 0) mensagemIncentivo = '⭐ TEVE QUINA! Quase lá! ⭐';
        else if (quadra > 0) mensagemIncentivo = '🎉 Parabéns aos ganhadores! 🎉';
        else if (terno > 0 || duque > 0) {
            tituloSecao = '🏆 ACERTOS DO BOLÃO:';
            mensagemIncentivo = '🔍 Quase! Terno e Duque mostram que estamos no caminho certo.\n💪 Vamos continuar. A sorte está mais perto!';
        } else {
            tituloSecao = '🏆 ACERTOS DO BOLÃO:';
            mensagemIncentivo = '😕 O padrão do sorteio foi bastante atípico...\n💪 Vamos seguir.';
        }
        
        let msg = `*RESULTADO BOLÕES ALEATÓRIOS - MEGA-SENA*\n\n`;
        msg += `📌 Concurso: ${ultimoResultadoConcurso}\n`;
        msg += `🎯 Sorteados: ${numeros.join(' - ')}\n`;
        if (data) msg += `📅 Data: ${data}\n`;
        msg += `\n${tituloSecao}\n`;
        msg += `• SENA: ${sena}\n• QUINA: ${quina}\n• QUADRA: ${quadra}\n• TERNO: ${terno}\n• DUQUE: ${duque}\n\n`;
        if (mensagemIncentivo) msg += `${mensagemIncentivo}\n\n`;
        msg += `🔗 Detalhes: ${window.location.href}`;
        
        const textoCodificado = encodeURIComponent(msg);
        window.open(`https://wa.me/?text=${textoCodificado}`, '_blank');
    } else {
        const { pontos15, pontos14, pontos13, pontos12, pontos11 } = premios;
        if (pontos15 > 0) mensagemIncentivo = '🎉🎉🎉 TEVE 15 PONTOS! PARABÉNS! 🎉🎉🎉';
        else if (pontos14 > 0) mensagemIncentivo = '⭐ TEVE 14 PONTOS! Quase perfeito! ⭐';
        else if (pontos13 > 0) mensagemIncentivo = '🎉 Parabéns pelos 13 pontos! 🎉';
        else if (pontos12 > 0 || pontos11 > 0) {
            tituloSecao = '🏆 ACERTOS DO BOLÃO:';
            mensagemIncentivo = '🔍 Quase! Continue participando, a sorte está perto!';
        } else {
            tituloSecao = '🏆 ACERTOS DO BOLÃO:';
            mensagemIncentivo = '😕 O padrão do sorteio foi bastante atípico...\n💪 Vamos seguir.';
        }
        
        let msg = `*RESULTADO BOLÕES ALEATÓRIOS - LOTOFÁCIL*\n\n`;
        msg += `📌 Concurso: ${ultimoResultadoConcurso}\n`;
        msg += `🎯 Sorteados: ${numeros.join(' - ')}\n`;
        if (data) msg += `📅 Data: ${data}\n`;
        msg += `\n${tituloSecao}\n`;
        msg += `• 15 PONTOS: ${pontos15}\n• 14 PONTOS: ${pontos14}\n• 13 PONTOS: ${pontos13}\n• 12 PONTOS: ${pontos12}\n• 11 PONTOS: ${pontos11}\n\n`;
        if (mensagemIncentivo) msg += `${mensagemIncentivo}\n\n`;
        msg += `🔗 Detalhes: ${window.location.href}`;
        
        const textoCodificado = encodeURIComponent(msg);
        window.open(`https://wa.me/?text=${textoCodificado}`, '_blank');
    }
    
    showToast('📱 Abrindo WhatsApp...', 'info');
}

// ============ CONFERIR RESULTADOS ============
async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    if (!concurso) { showToast('⚠️ Selecione um concurso!', 'warning'); return; }
    
    const resultadosArea = document.getElementById('resultadosArea');
    resultadosArea.innerHTML = '<div class="loading">🔍 Processando...</div>';
    
    const resultados = loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil;
    const cartoesConcurso = (loteriaAtual === 'mega' ? cartoesMega : cartoesLotofacil).filter(c => c.concurso == concurso);
    
    if (cartoesConcurso.length === 0) {
        resultadosArea.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso}</div>`;
        return;
    }
    
    let numerosSorteados = null;
    let dataSorteio = null;
    
    if (resultados[concurso]) {
        numerosSorteados = resultados[concurso];
        showToast('📋 Usando resultado salvo', 'info');
    } else {
        showToast('🔍 Buscando resultado online...', 'info');
        const resultadoBusca = await buscarResultadoInterno(concurso, loteriaAtual);
        if (resultadoBusca) {
            numerosSorteados = resultadoBusca.numeros;
            dataSorteio = resultadoBusca.dataSorteio;
            document.getElementById('numerosSorteados').value = numerosSorteados.join(' ');
            showToast('✅ Resultado encontrado!', 'success');
        } else {
            resultadosArea.innerHTML = `<div class="empty-state">❌ Resultado não encontrado online. Digite manualmente.</div>`;
            showToast('❌ Resultado não encontrado', 'error');
            return;
        }
    }
    
    const resultadosCalc = cartoesConcurso.map(c => ({
        ...c,
        acertos: c.numeros.filter(n => numerosSorteados.includes(n)).length
    })).sort((a, b) => b.acertos - a.acertos);
    
    let premios = {};
    if (loteriaAtual === 'mega') {
        premios = {
            sena: resultadosCalc.filter(r => r.acertos >= 6).length,
            quina: resultadosCalc.filter(r => r.acertos === 5).length,
            quadra: resultadosCalc.filter(r => r.acertos === 4).length,
            terno: resultadosCalc.filter(r => r.acertos === 3).length,
            duque: resultadosCalc.filter(r => r.acertos === 2).length
        };
    } else {
        premios = {
            pontos15: resultadosCalc.filter(r => r.acertos >= 15).length,
            pontos14: resultadosCalc.filter(r => r.acertos === 14).length,
            pontos13: resultadosCalc.filter(r => r.acertos === 13).length,
            pontos12: resultadosCalc.filter(r => r.acertos === 12).length,
            pontos11: resultadosCalc.filter(r => r.acertos === 11).length
        };
    }
    
    ultimoResultadoConcurso = concurso;
    ultimoResultadoDados = { numeros: numerosSorteados, dataSorteio, premios };
    
    // Montar HTML dos resultados
    let html = `<div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <h3>🏆 RESULTADO DO CONCURSO ${concurso} - ${loteriaAtual === 'mega' ? 'MEGA-SENA' : 'LOTOFÁCIL'}</h3>
        <div style="display: flex; justify-content: center; gap: 15px; margin: 15px 0; flex-wrap: wrap;">`;
    
    if (loteriaAtual === 'mega') {
        html += `
            <div><span style="font-size: 24px; font-weight: bold; color: #f59e0b;">${premios.sena}</span><br>SENA</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #eab308;">${premios.quina}</span><br>QUINA</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #a855f7;">${premios.quadra}</span><br>QUADRA</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #3b82f6;">${premios.terno}</span><br>TERNO</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #64748b;">${premios.duque}</span><br>DUQUE</div>
            <div><span style="font-size: 24px; font-weight: bold;">${resultadosCalc.length}</span><br>CARTÕES</div>
        `;
    } else {
        html += `
            <div><span style="font-size: 24px; font-weight: bold; color: #f59e0b;">${premios.pontos15}</span><br>15 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #eab308;">${premios.pontos14}</span><br>14 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #a855f7;">${premios.pontos13}</span><br>13 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #3b82f6;">${premios.pontos12}</span><br>12 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #64748b;">${premios.pontos11}</span><br>11 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold;">${resultadosCalc.length}</span><br>CARTÕES</div>
        `;
    }
    
    html += `</div><div style="background: #d1fae5; padding: 10px; border-radius: 8px;">
        🎲 Sorteados: ${numerosSorteados.join(' - ')}
        ${dataSorteio ? `<br>📅 Data: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}` : ''}
    </div>
    <button id="btnWhatsApp" class="btn-whatsapp" style="margin-top: 15px;">📱 COMPARTILHAR NO WHATSAPP</button>
    </div>`;
    
    const porBolao = {};
    resultadosCalc.forEach(r => {
        const bolao = r.bolao || 'Sem Bolão';
        if (!porBolao[bolao]) porBolao[bolao] = [];
        porBolao[bolao].push(r);
    });
    
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;"><h4 style="color: #3b82f6;">🎯 ${bolao}</h4>`;
        lista.forEach(c => {
            let cor;
            if (loteriaAtual === 'mega') {
                if (c.acertos >= 6) cor = '#f59e0b';
                else if (c.acertos === 5) cor = '#eab308';
                else if (c.acertos === 4) cor = '#a855f7';
                else if (c.acertos === 3) cor = '#3b82f6';
                else cor = '#cbd5e1';
            } else {
                if (c.acertos >= 15) cor = '#f59e0b';
                else if (c.acertos === 14) cor = '#eab308';
                else if (c.acertos === 13) cor = '#a855f7';
                else if (c.acertos === 12) cor = '#3b82f6';
                else cor = '#cbd5e1';
            }
            
            html += `
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                        <span>Cartão</span>
                        <span style="background: ${cor}; color: white; padding: 2px 10px; border-radius: 20px;">${c.acertos} acertos</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${c.numeros.map(n => `<span style="background: ${numerosSorteados.includes(n) ? '#10b981' : '#e2e8f0'}; color: ${numerosSorteados.includes(n) ? 'white' : '#333'}; padding: 4px 8px; border-radius: 5px; font-family: monospace; font-size: ${loteriaAtual === 'mega' ? '12px' : '10px'};">${n.toString().padStart(2, '0')}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    resultadosArea.innerHTML = html;
    mostrarCartoesDoConcurso();
    document.getElementById('btnWhatsApp')?.addEventListener('click', compartilharWhatsApp);
    showToast(`🏆 Conferência concluída!`, 'success');
}

// ============ INICIALIZAÇÃO ============
let intervalo;
function iniciarAutoAtualizacao() {
    if (intervalo) clearInterval(intervalo);
    intervalo = setInterval(() => carregarDados(), 60000);
}

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    iniciarAutoAtualizacao();
    
    document.getElementById('btnMegaSena').addEventListener('click', () => setLoteria('mega'));
    document.getElementById('btnLotofacil').addEventListener('click', () => setLoteria('lotofacil'));
    document.getElementById('concursoSelect').addEventListener('change', mostrarCartoesDoConcurso);
    document.getElementById('btnConferir').addEventListener('click', conferirResultados);
    document.getElementById('btnConferir').addEventListener('touchstart', conferirResultados);
    
    mostrarCartoesDoConcurso();
    showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
});