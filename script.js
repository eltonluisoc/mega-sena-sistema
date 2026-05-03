let cartoes = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let loteriaAtual = 'mega';
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
            if (toast.parentNode) toast.remove();
            if (container.children.length === 0 && container.parentNode) container.remove();
        }, 300);
    }, 3000);
}

// ============ POP-UP PARA INSTALAR APP ============
function mostrarPopupInstalar() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let titulo = '📱 SALVAR COMO APP NO CELULAR';
    let mensagem = '';
    
    if (isIOS) {
        mensagem = '📲 No iPhone/iPad:\n\n1. Toque no botão "Compartilhar" 📤\n2. Role a tela para baixo\n3. Toque em "Adicionar à Tela de Início"\n4. Confirme o nome e toque em "Adicionar"\n\nO app aparecerá na tela inicial como um aplicativo normal!';
    } else if (isAndroid) {
        mensagem = '📲 No Android (Chrome):\n\n1. Toque nos 3 pontinhos ⋮\n2. Toque em "Instalar aplicativo"\n3. Confirme a instalação\n\nO app aparecerá na tela inicial!';
    } else {
        mensagem = '💻 No computador, você pode:\n\n1. Acessar o site normalmente\n2. Ou usar o PWA no celular escaneando o QR Code\n\nNo celular, os passos são:\n• iPhone: Compartilhar → Adicionar à Tela de Início\n• Android: ⋮ → Instalar aplicativo';
    }
    
    let modal = document.getElementById('modalInstalar');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'modalInstalar';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 20px; max-width: 350px; width: 90%; padding: 25px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3);';
    modalContent.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">📱</div>
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px;">${titulo}</div>
        <div style="white-space: pre-line; text-align: left; font-size: 14px; line-height: 1.6; margin: 15px 0;">${mensagem}</div>
        <button id="fecharModalInstalar" style="background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 30px; font-size: 14px; cursor: pointer; width: 100%; font-weight: bold;">Fechar</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    document.getElementById('fecharModalInstalar').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function adicionarBotaoInstalar() {
    const btnInstalar = document.getElementById('btnInstalarApp');
    if (btnInstalar) btnInstalar.onclick = mostrarPopupInstalar;
}

// ============ TROCAR LOTERIA ============
function setLoteria(loteria) {
    loteriaAtual = loteria;
    
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    
    if (btnMega) btnMega.classList.remove('active');
    if (btnLoto) btnLoto.classList.remove('active');
    
    if (loteria === 'mega') {
        if (btnMega) btnMega.classList.add('active');
        const header = document.getElementById('cardHeaderConferencia');
        if (header) header.innerHTML = '🔍 CONFERIR RESULTADOS - MEGA-SENA';
        const headerCartoes = document.getElementById('cardHeaderCartoes');
        if (headerCartoes) headerCartoes.innerHTML = '📋 CARTÕES DO CONCURSO - MEGA-SENA';
        const labelNumeros = document.getElementById('labelNumeros');
        if (labelNumeros) labelNumeros.innerHTML = '🎲 NÚMEROS SORTEADOS (6 números):';
        const inputNumeros = document.getElementById('numerosSorteados');
        if (inputNumeros) inputNumeros.placeholder = 'Ex: 12 15 23 34 45 56';
    } else {
        if (btnLoto) btnLoto.classList.add('active');
        const header = document.getElementById('cardHeaderConferencia');
        if (header) header.innerHTML = '🔍 CONFERIR RESULTADOS - LOTOFÁCIL';
        const headerCartoes = document.getElementById('cardHeaderCartoes');
        if (headerCartoes) headerCartoes.innerHTML = '📋 CARTÕES DO CONCURSO - LOTOFÁCIL';
        const labelNumeros = document.getElementById('labelNumeros');
        if (labelNumeros) labelNumeros.innerHTML = '🎲 NÚMEROS SORTEADOS (15 números):';
        const inputNumeros = document.getElementById('numerosSorteados');
        if (inputNumeros) inputNumeros.placeholder = 'Ex: 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15';
    }
    
    atualizarSelectConcursos();
    const selectConcurso = document.getElementById('concursoSelect');
    if (selectConcurso && selectConcurso.value) {
        mostrarCartoesDoConcurso();
    }
    showToast(`🔄 Mudou para ${loteria === 'mega' ? 'MEGA-SENA' : 'LOTOFÁCIL'}`, 'info');
}

// ============ CARREGAR DADOS ============
async function carregarDados() {
    console.log('🔄 Iniciando carregamento de dados...');
    showToast('📡 Carregando dados...', 'info');
    
    try {
        // Verificar conexão com Firebase
        if (!db) {
            throw new Error('Firebase não inicializado');
        }
        
        const snapshot = await db.collection('cartoes').get();
        cartoes = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.numeros) {
                cartoes.push({
                    id: doc.id,
                    concurso: data.concurso || '0',
                    bolao: data.bolao || 'Sem Bolão',
                    numeros: data.numeros,
                    totalNumeros: data.totalNumeros || data.numeros.length,
                    tipo: data.tipo || 'mega'
                });
            }
        });
        
        console.log(`📊 Total de cartões: ${cartoes.length}`);
        console.log(`📊 Cartões Mega: ${cartoes.filter(c => c.tipo === 'mega').length}`);
        console.log(`📊 Cartões Lotofácil: ${cartoes.filter(c => c.tipo === 'lotofacil').length}`);
        
        // Carregar resultados Mega
        const resMega = await db.collection('resultados').where('tipo', '==', 'mega').get();
        resultadosMega = {};
        resMega.forEach(doc => {
            resultadosMega[doc.id] = doc.data().numeros;
        });
        
        // Carregar resultados Lotofácil
        const resLoto = await db.collection('resultados').where('tipo', '==', 'lotofacil').get();
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
        showToast(`✅ ${cartoes.length} cartões carregados!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        showToast(`❌ Erro: ${error.message}`, 'error');
        
        // Exibir mensagem amigável no lugar dos cartões
        const container = document.getElementById('cartoesConcurso');
        if (container) {
            container.innerHTML = '<div class="empty-state">❌ Erro ao conectar com o banco de dados.<br>Verifique sua conexão com a internet.</div>';
        }
    }
}

function atualizarStats() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAtual);
    const concursos = [...new Set(cartoesFiltrados.map(c => c.concurso))];
    const resultadosCount = Object.keys(loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil).length;
    const statsDiv = document.getElementById('totalCartoes');
    if (statsDiv) {
        statsDiv.innerHTML = `📊 ${cartoesFiltrados.length} cartões | 🎯 ${concursos.length} concursos | ✅ ${resultadosCount} resultados`;
    }
}

function atualizarSelectConcursos() {
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAtual);
    const concursos = [...new Set(cartoesFiltrados.map(c => c.concurso))];
    concursos.sort((a, b) => b - a);
    
    const select = document.getElementById('concursoSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um concurso</option>';
    
    if (concursos.length === 0) {
        select.innerHTML = `<option value="">Nenhum concurso disponível</option>`;
        return;
    }
    
    concursos.forEach(concurso => {
        const total = cartoesFiltrados.filter(c => c.concurso == concurso).length;
        const option = document.createElement('option');
        option.value = concurso;
        option.textContent = `Concurso ${concurso} (${total} cartões)`;
        select.appendChild(option);
    });
}

function selecionarUltimoConcurso() {
    const select = document.getElementById('concursoSelect');
    if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        mostrarCartoesDoConcurso();
    }
}

function mostrarCartoesDoConcurso() {
    const concurso = document.getElementById('concursoSelect').value;
    const container = document.getElementById('cartoesConcurso');
    
    if (!container) return;
    
    if (!concurso) {
        container.innerHTML = '<div class="empty-state">Selecione um concurso</div>';
        return;
    }
    
    const cartoesFiltrados = cartoes.filter(c => c.tipo === loteriaAtual && c.concurso == concurso);
    
    if (cartoesFiltrados.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso} na ${loteriaAtual === 'mega' ? 'MEGA-SENA' : 'LOTOFÁCIL'}</div>`;
        return;
    }
    
    const resultados = loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil;
    const resultadoSalvo = resultados[concurso] || [];
    const porBolao = {};
    
    cartoesFiltrados.forEach(c => {
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
    
    try {
        if (loteria === 'mega') {
            const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concurso}`;
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.listaDezenas && dados.listaDezenas.length >= 6) {
                    numeros = dados.listaDezenas.map(n => parseInt(n));
                    dataSorteio = dados.dataApuracao;
                }
            }
        } else {
            const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${concurso}`;
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.listaDezenas && dados.listaDezenas.length >= 15) {
                    numeros = dados.listaDezenas.map(n => parseInt(n));
                    dataSorteio = dados.dataApuracao;
                }
            }
        }
    } catch (error) {
        console.error('Erro na busca online:', error);
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
    const linhaSep = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    let msg = `*RESULTADO: BOLÕES ALEATÓRIOS* 🎲\n${linhaSep}\n📌 Concurso: ${ultimoResultadoConcurso}\n🗓️ Dezenas Sorteadas:\n${numeros.join(' — ')}\n${linhaSep}\n🏆 DESEMPENHO DO GRUPO:\n`;
    
    if (loteriaAtual === 'mega') {
        const { sena, quina, quadra, terno, duque } = premios;
        msg += `✨ Sena: ${sena}\n✨ Quina: ${quina}\n✨ Quadra: ${quadra}\n✅ Terno: ${terno}\n✅ Duque: ${duque}\n`;
        if (terno > 0 || duque > 0) msg += `⚠️ O terno mostra que estamos chegando perto. Seguimos firmes para o próximo.\n`;
        else if (quadra > 0) msg += `⚠️ Quadra! Estamos no caminho certo!\n`;
        else if (quina > 0) msg += `⭐ Quina! Quase lá! Continuamos!\n`;
        else if (sena > 0) msg += `🎉🎉🎉 SENA! PARABÉNS! 🎉🎉🎉\n`;
        else msg += `😕 O padrão do sorteio foi bastante atípico... Vamos seguir.\n`;
    } else {
        const { pontos15, pontos14, pontos13, pontos12, pontos11 } = premios;
        msg += `✨ 15 Pontos: ${pontos15}\n✨ 14 Pontos: ${pontos14}\n✨ 13 Pontos: ${pontos13}\n✅ 12 Pontos: ${pontos12}\n✅ 11 Pontos: ${pontos11}\n`;
        if (pontos12 > 0 || pontos11 > 0) msg += `⚠️ Estamos chegando perto! Seguimos firmes para o próximo.\n`;
        else if (pontos13 > 0) msg += `⚠️ 13 pontos! Quase lá!\n`;
        else if (pontos14 > 0) msg += `⭐ 14 pontos! Muito perto!\n`;
        else if (pontos15 > 0) msg += `🎉🎉🎉 15 PONTOS! PARABÉNS! 🎉🎉🎉\n`;
        else msg += `😕 O padrão do sorteio foi bastante atípico... Vamos seguir.\n`;
    }
    
    msg += `${linhaSep}\n🔗 Confira o detalhamento completo:\n${window.location.href}`;
    
    const textoCodificado = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${textoCodificado}`, '_blank');
    showToast('📱 Abrindo WhatsApp...', 'info');
}

// ============ CONFERIR RESULTADOS ============
async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    if (!concurso) {
        showToast('⚠️ Selecione um concurso!', 'warning');
        return;
    }
    
    const resultadosArea = document.getElementById('resultadosArea');
    if (!resultadosArea) return;
    
    resultadosArea.innerHTML = '<div class="loading">🔍 Processando...</div>';
    
    const resultados = loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil;
    const cartoesConcurso = cartoes.filter(c => c.tipo === loteriaAtual && c.concurso == concurso);
    
    if (cartoesConcurso.length === 0) {
        resultadosArea.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso} na ${loteriaAtual === 'mega' ? 'MEGA-SENA' : 'LOTOFÁCIL'}</div>`;
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
            const inputNumeros = document.getElementById('numerosSorteados');
            if (inputNumeros) inputNumeros.value = numerosSorteados.join(' ');
            showToast('✅ Resultado encontrado!', 'success');
        } else {
            resultadosArea.innerHTML = `<div class="empty-state">❌ Resultado não encontrado online.<br><br>Digite os números manualmente e clique em "Conferir" novamente.</div>`;
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
    
    let html = `<div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <h3>🏆 RESULTADO DO CONCURSO ${concurso} - ${loteriaAtual === 'mega' ? 'MEGA-SENA' : 'LOTOFÁCIL'}</h3>
        <div style="display: flex; justify-content: center; gap: 15px; margin: 15px 0; flex-wrap: wrap;">`;
    
    if (loteriaAtual === 'mega') {
        html += `<div><span style="font-size: 24px; font-weight: bold; color: #f59e0b;">${premios.sena}</span><br>SENA</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #eab308;">${premios.quina}</span><br>QUINA</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #a855f7;">${premios.quadra}</span><br>QUADRA</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #3b82f6;">${premios.terno}</span><br>TERNO</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #64748b;">${premios.duque}</span><br>DUQUE</div>
            <div><span style="font-size: 24px; font-weight: bold;">${resultadosCalc.length}</span><br>CARTÕES</div>`;
    } else {
        html += `<div><span style="font-size: 24px; font-weight: bold; color: #f59e0b;">${premios.pontos15}</span><br>15 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #eab308;">${premios.pontos14}</span><br>14 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #a855f7;">${premios.pontos13}</span><br>13 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #3b82f6;">${premios.pontos12}</span><br>12 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold; color: #64748b;">${premios.pontos11}</span><br>11 PTS</div>
            <div><span style="font-size: 24px; font-weight: bold;">${resultadosCalc.length}</span><br>CARTÕES</div>`;
    }
    
    html += `</div><div style="background: #d1fae5; padding: 10px; border-radius: 8px;">🎲 Sorteados: ${numerosSorteados.join(' - ')}${dataSorteio ? `<br>📅 Data: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}` : ''}</div>
    <button id="btnWhatsApp" class="btn-whatsapp" style="margin-top: 15px;">📱 COMPARTILHAR NO WHATSAPP</button></div>`;
    
    const porBolao = {};
    resultadosCalc.forEach(r => { const bolao = r.bolao || 'Sem Bolão'; if (!porBolao[bolao]) porBolao[bolao] = []; porBolao[bolao].push(r); });
    
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;"><h4 style="color: #3b82f6;">🎯 ${bolao}</h4>`;
        lista.forEach(c => {
            let cor = loteriaAtual === 'mega' ? (c.acertos >= 6 ? '#f59e0b' : c.acertos === 5 ? '#eab308' : c.acertos === 4 ? '#a855f7' : c.acertos === 3 ? '#3b82f6' : '#cbd5e1') : (c.acertos >= 15 ? '#f59e0b' : c.acertos === 14 ? '#eab308' : c.acertos === 13 ? '#a855f7' : c.acertos === 12 ? '#3b82f6' : '#cbd5e1');
            html += `<div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;"><span>Cartão</span><span style="background: ${cor}; color: white; padding: 2px 10px; border-radius: 20px;">${c.acertos} acertos</span></div><div style="display: flex; flex-wrap: wrap; gap: 4px;">${c.numeros.map(n => `<span style="background: ${numerosSorteados.includes(n) ? '#10b981' : '#e2e8f0'}; color: ${numerosSorteados.includes(n) ? 'white' : '#333'}; padding: 4px 8px; border-radius: 5px; font-family: monospace; font-size: ${loteriaAtual === 'mega' ? '12px' : '10px'};">${n.toString().padStart(2, '0')}</span>`).join('')}</div></div>`;
        });
        html += `</div>`;
    }
    
    resultadosArea.innerHTML = html;
    mostrarCartoesDoConcurso();
    
    const btnWhatsApp = document.getElementById('btnWhatsApp');
    if (btnWhatsApp) btnWhatsApp.addEventListener('click', compartilharWhatsApp);
    
    showToast(`🏆 Conferência concluída!`, 'success');
}

// ============ VERIFICAR NOVOS RESULTADOS ============
async function verificarNovosResultados() {
    try {
        const resMega = await db.collection('resultados').where('tipo', '==', 'mega').get();
        const novosMega = {};
        resMega.forEach(doc => { novosMega[doc.id] = doc.data().numeros; });
        
        const novosMegaEncontrados = Object.keys(novosMega).filter(k => !Object.keys(ultimoEstadoMega).includes(k));
        if (novosMegaEncontrados.length > 0 && loteriaAtual === 'mega') {
            const concursoAtual = document.getElementById('concursoSelect')?.value;
            if (concursoAtual && novosMegaEncontrados.includes(concursoAtual)) {
                showToast(`📢 NOVO RESULTADO! Concurso ${concursoAtual} acabou de ser atualizado!`, 'success');
                const btnConferir = document.getElementById('btnConferir');
                if (btnConferir) {
                    btnConferir.style.animation = 'pulse 0.5s ease-in-out 3';
                    setTimeout(() => { if (btnConferir) btnConferir.style.animation = ''; }, 1500);
                }
            }
        }
        ultimoEstadoMega = novosMega;
        
        const resLoto = await db.collection('resultados').where('tipo', '==', 'lotofacil').get();
        const novosLoto = {};
        resLoto.forEach(doc => { novosLoto[doc.id] = doc.data().numeros; });
        
        const novosLotoEncontrados = Object.keys(novosLoto).filter(k => !Object.keys(ultimoEstadoLotofacil).includes(k));
        if (novosLotoEncontrados.length > 0 && loteriaAtual === 'lotofacil') {
            const concursoAtual = document.getElementById('concursoSelect')?.value;
            if (concursoAtual && novosLotoEncontrados.includes(concursoAtual)) {
                showToast(`📢 NOVO RESULTADO! Concurso ${concursoAtual} acabou de ser atualizado!`, 'success');
                const btnConferir = document.getElementById('btnConferir');
                if (btnConferir) {
                    btnConferir.style.animation = 'pulse 0.5s ease-in-out 3';
                    setTimeout(() => { if (btnConferir) btnConferir.style.animation = ''; }, 1500);
                }
            }
        }
        ultimoEstadoLotofacil = novosLoto;
        
        atualizarStats();
    } catch (error) {
        console.error('Erro ao verificar resultados:', error);
    }
}

// ============ INICIALIZAÇÃO ============
let intervalo, intervaloNotificacao;

function iniciarAutoAtualizacao() {
    if (intervalo) clearInterval(intervalo);
    intervalo = setInterval(() => carregarDados(), 60000);
}

function iniciarMonitoramentoResultados() {
    if (intervaloNotificacao) clearInterval(intervaloNotificacao);
    intervaloNotificacao = setInterval(() => verificarNovosResultados(), 30000);
}

// Adicionar estilo de animação
const style = document.createElement('style');
style.textContent = `@keyframes pulse { 0% { transform: scale(1); background: #3b82f6; } 50% { transform: scale(1.05); background: #f59e0b; } 100% { transform: scale(1); background: #3b82f6; } }`;
document.head.appendChild(style);

// Aguardar DOM carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM carregado, inicializando sistema...');
    
    // Aguardar um pouco para o Firebase conectar
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await carregarDados();
    iniciarAutoAtualizacao();
    iniciarMonitoramentoResultados();
    
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    const selectConcurso = document.getElementById('concursoSelect');
    const btnConferir = document.getElementById('btnConferir');
    
    if (btnMega) btnMega.addEventListener('click', () => setLoteria('mega'));
    if (btnLoto) btnLoto.addEventListener('click', () => setLoteria('lotofacil'));
    if (selectConcurso) selectConcurso.addEventListener('change', mostrarCartoesDoConcurso);
    if (btnConferir) {
        btnConferir.addEventListener('click', conferirResultados);
        btnConferir.addEventListener('touchstart', conferirResultados);
    }
    
    adicionarBotaoInstalar();
    mostrarCartoesDoConcurso();
    showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
});