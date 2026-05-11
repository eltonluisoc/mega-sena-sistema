let cartoes = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let resultadosQuina = {};
let loteriaAtual = 'mega';
let ultimoResultadoConcurso = null;
let ultimoResultadoDados = null;
let ultimoEstadoMega = {};
let ultimoEstadoLotofacil = {};
let ultimoEstadoQuina = {};
let pixGeral = '';
let cacheResultadosBuscados = {};
let dadosCarregados = false;  // NOVO: flag para evitar buscas prematuras

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

function mostrarPopupInstalar() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    let titulo = '📱 SALVAR COMO APP';
    let mensagem = '';
    
    if (isIOS) {
        mensagem = '📲 No iPhone/iPad:\n\n1. Toque no botão "Compartilhar" 📤\n2. Role a tela para baixo\n3. Toque em "Adicionar à Tela de Início"\n4. Confirme o nome\n\nO app aparecerá na tela inicial!';
    } else if (isAndroid) {
        mensagem = '📲 No Android (Chrome):\n\n1. Toque nos 3 pontinhos ⋮ no canto superior direito\n2. Toque em "Instalar aplicativo"\n3. Confirme a instalação\n\nO app aparecerá na tela inicial!';
    } else {
        mensagem = '💻 No computador, acesso normal.\nNo celular siga as instruções acima.';
    }
    
    let modal = document.getElementById('modalInstalar');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'modalInstalar';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 20px; max-width: 350px; width: 90%; padding: 25px; text-align: center;';
    modalContent.innerHTML = `
        <div style="font-size: 48px;">📱</div>
        <div style="font-size: 20px; font-weight: bold; margin: 10px 0;">${titulo}</div>
        <div style="white-space: pre-line; text-align: left; font-size: 14px; margin: 15px 0;">${mensagem}</div>
        <button id="fecharModalInstalar" style="background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 30px; width: 100%;">Fechar</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    document.getElementById('fecharModalInstalar').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function adicionarBotaoInstalar() {
    const btn = document.getElementById('btnInstalarApp');
    if (btn) btn.onclick = mostrarPopupInstalar;
}

async function carregarPixGeral() {
    try {
        const doc = await db.collection('config_geral').doc('pix').get();
        pixGeral = doc.exists ? doc.data().chave : '';
    } catch(e) { console.log('Erro ao carregar PIX:', e); }
}

async function carregarConfiguracoes() {
    await carregarPixGeral();
}

function compartilharSite() {
    const url = 'https://rebrand.ly/boloesaleatorios';
    const mensagem = `🎲 *BOLÕES ALEATÓRIOS* 🎲\n\n🏆 Rumo ao Grande Prêmio!\n\nVenha participar e conferir os resultados dos nossos bolões!!!\n\n🔗 ${url}`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile ? `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
    showToast('📱 Abrindo WhatsApp...', 'info');
}

function enviarSugestao() {
    const numeroAdmin = '5561998507770';
    const mensagem = `💡 *SUGESTÃO PARA O SITE* 💡\n\nOlá! Gostaria de sugerir: `;
    const url = `https://wa.me/${numeroAdmin}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    showToast('📱 Abrindo WhatsApp...', 'info');
}

function setLoteria(loteria) {
    loteriaAtual = loteria;
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    const btnQuina = document.getElementById('btnQuina');
    if (btnMega) btnMega.classList.remove('active');
    if (btnLoto) btnLoto.classList.remove('active');
    if (btnQuina) btnQuina.classList.remove('active');
    
    if (loteria === 'mega') {
        if (btnMega) btnMega.classList.add('active');
        const headerConferencia = document.getElementById('cardHeaderConferencia');
        if (headerConferencia) headerConferencia.innerHTML = '🔍 CONFERIR RESULTADOS - MEGA';
    } else if (loteria === 'lotofacil') {
        if (btnLoto) btnLoto.classList.add('active');
        const headerConferencia = document.getElementById('cardHeaderConferencia');
        if (headerConferencia) headerConferencia.innerHTML = '🔍 CONFERIR RESULTADOS - LOTOFÁCIL';
    } else if (loteria === 'quina') {
        if (btnQuina) btnQuina.classList.add('active');
        const headerConferencia = document.getElementById('cardHeaderConferencia');
        if (headerConferencia) headerConferencia.innerHTML = '🔍 CONFERIR RESULTADOS - QUINA';
    }
    
    atualizarSelectConcursos();
    
    const selectConcurso = document.getElementById('concursoSelect');
    if (selectConcurso && selectConcurso.options.length > 1) {
        selectConcurso.selectedIndex = 1;
        mostrarCartoesDoConcurso();
    } else if (selectConcurso && selectConcurso.value) {
        mostrarCartoesDoConcurso();
    } else {
        const container = document.getElementById('cartoesConcurso');
        if (container) container.innerHTML = '<div class="empty-state">Selecione um concurso para ver os cartões</div>';
    }

    // Só busca se tiver dados carregados e concurso válido
    if (dadosCarregados) {
        const concursoAtual = document.getElementById('concursoSelect').value;
        if (concursoAtual && concursoAtual !== '1' && concursoAtual !== '') {
            setTimeout(() => buscarResultadoAutomatico(), 100);
        }
    }
    
    showToast(`🔄 Mudou para ${loteria === 'mega' ? 'MEGA' : loteria === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA'}`, 'info');
}

async function carregarDados() {
    console.log('🔄 Carregando dados...');
    dadosCarregados = false;
    const loadingDiv = document.getElementById('loadingIndicator');
    const loadingPercent = document.getElementById('loadingPercent');
    if (loadingDiv) loadingDiv.style.display = 'block';
    
    // Função auxiliar para atualizar percentual
    const atualizarPercentual = (percent, mensagem) => {
        if (loadingPercent) loadingPercent.innerText = `${percent}% - ${mensagem}`;
        console.log(`📊 ${percent}% - ${mensagem}`);
    };
    
    try {
        atualizarPercentual(5, 'Iniciando...');
        
        // 1. Buscar cartões
        atualizarPercentual(10, 'Buscando cartões...');
        const snap = await db.collection('cartoes').get();
        cartoes = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (d && d.numeros) {
                cartoes.push({
                    id: doc.id,
                    concurso: d.concurso || '0',
                    bolao: d.bolao || 'Sem Bolão',
                    numeros: d.numeros,
                    totalNumeros: d.totalNumeros || d.numeros.length,
                    tipo: d.tipo || 'mega'
                });
            }
        });
        
        // 2. Buscar resultados Mega
        atualizarPercentual(30, 'Carregando resultados Mega-Sena...');
        try {
            const resMega = await db.collection('resultados_mega').get();
            resultadosMega = {};
            resMega.forEach(doc => { resultadosMega[doc.id] = doc.data().numeros; });
        } catch (e) {
            console.warn('Erro ao carregar resultados Mega:', e);
            resultadosMega = {};
        }
        
        // 3. Buscar resultados Lotofácil
        atualizarPercentual(50, 'Carregando resultados Lotofácil...');
        try {
            const resLoto = await db.collection('resultados_lotofacil').get();
            resultadosLotofacil = {};
            resLoto.forEach(doc => { resultadosLotofacil[doc.id] = doc.data().numeros; });
        } catch (e) {
            console.warn('Erro ao carregar resultados Lotofácil:', e);
            resultadosLotofacil = {};
        }
        
        // 4. Buscar resultados Quina
        atualizarPercentual(70, 'Carregando resultados Quina...');
        try {
            const resQuina = await db.collection('resultados_quina').get();
            resultadosQuina = {};
            resQuina.forEach(doc => { resultadosQuina[doc.id] = doc.data().numeros; });
        } catch (e) {
            console.warn('Erro ao carregar resultados Quina:', e);
            resultadosQuina = {};
        }
        
        // 5. Carregar bolões
        atualizarPercentual(85, 'Carregando bolões...');
        try {
            await carregarBolaoAtivo();
            await carregarBolaoAberto();
        } catch (e) {
            console.warn('Erro ao carregar bolões:', e);
        }
        
        // 6. Finalizar
        atualizarPercentual(100, 'Concluído!');
        
        // Pequeno delay para o usuário ver 100%
        setTimeout(() => {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }, 300);
        
        atualizarSelectConcursos();
        atualizarStats();
        selecionarUltimoConcurso();
        
        dadosCarregados = true;
        
        // Buscar resultado automaticamente APENAS se tiver concurso selecionado
        const concursoSelect = document.getElementById('concursoSelect');
        if (concursoSelect && concursoSelect.value && concursoSelect.value !== '1') {
            setTimeout(() => buscarResultadoAutomatico(), 300);
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('❌ Erro ao carregar dados. Recarregue a página.', 'error');
        if (loadingDiv) loadingDiv.style.display = 'none';
        dadosCarregados = true;
    }
}

function atualizarStats() {
    const filtrados = cartoes.filter(c => c.tipo === loteriaAtual);
    const concursos = [...new Set(filtrados.map(c => c.concurso))];
    const statsDiv = document.getElementById('totalCartoes');
    if (statsDiv) statsDiv.innerHTML = `📊 ${filtrados.length} cartões | 🎯 ${concursos.length} concursos`;
}

function atualizarSelectConcursos() {
    const filtrados = cartoes.filter(c => c.tipo === loteriaAtual);
    const concursos = [...new Set(filtrados.map(c => c.concurso))];
    concursos.sort((a, b) => b - a);
    const select = document.getElementById('concursoSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione um concurso</option>';
    if (concursos.length === 0) {
        select.innerHTML = '<option value="">Nenhum concurso disponível</option>';
        return;
    }
    concursos.forEach(con => {
        const total = filtrados.filter(c => c.concurso == con).length;
        const opt = document.createElement('option');
        opt.value = con;
        opt.textContent = `Concurso ${con} (${total} cartões)`;
        select.appendChild(opt);
    });
    
    if (concursos.length > 0) {
        select.value = concursos[0];
        console.log(`📌 Concurso selecionado: ${concursos[0]}`);
    }
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
    
    const filtrados = cartoes.filter(c => c.tipo === loteriaAtual && c.concurso == concurso);
    if (filtrados.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso}</div>`;
        return;
    }
    
    const porBolao = {};
    filtrados.forEach(c => { const b = c.bolao || 'Sem Bolão'; if (!porBolao[b]) porBolao[b] = []; porBolao[b].push(c); });
    let html = '';
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="margin-bottom:20px"><div style="background:#3b82f6;color:white;padding:6px 10px;border-radius:6px;margin-bottom:8px;font-size:13px;">🎯 ${bolao}</div><div style="display:flex;flex-wrap:wrap;gap:8px;">`;
        lista.forEach(cartao => {
            const tipoParticipacao = cartao.tipoParticipacao === 'cota' ? '🎟️ Cota' : '👥 Exclusivo';
            const numsHtml = cartao.numeros.map(n => `<span style="background:#e2e8f0;color:#333;padding:3px 7px;border-radius:5px;font-family:monospace;font-size:11px;">${n.toString().padStart(2,'0')}</span>`).join('');
            html += `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;min-width:180px;">
                        <div style="font-size:10px;color:#64748b;margin-bottom:4px;">
                            Cartão - Concurso ${concurso}
                            <span style="background:#e2e8f0;padding:2px 6px;border-radius:4px;margin-left:5px;font-size:9px;">${tipoParticipacao}</span>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:3px;">${numsHtml}</div>
                    </div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

async function buscarResultadoInterno(concurso, loteria) {
    let numeros = null, data = null;
    try {
        let url;
        if (loteria === 'mega') url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concurso}`;
        else if (loteria === 'lotofacil') url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${concurso}`;
        else url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/quina/${concurso}`;
        const resp = await fetch(url);
        if (resp.ok) {
            const dados = await resp.json();
            const dezenas = dados.listaDezenas;
            let minLength = loteria === 'mega' ? 6 : loteria === 'lotofacil' ? 15 : 5;
            if (dezenas && dezenas.length >= minLength) {
                numeros = dezenas.map(n => parseInt(n));
                data = dados.dataApuracao;
            }
        }
    } catch(e) { console.log('Erro na busca:', e); }
    if (numeros) { numeros.sort((a,b)=>a-b); return { numeros, dataSorteio: data }; }
    return null;
}

function compartilharWhatsApp() {
    if (!ultimoResultadoConcurso || !ultimoResultadoDados) {
        showToast('⚠️ Nenhum resultado para compartilhar', 'warning');
        return;
    }
    const { numeros, dataSorteio, premios } = ultimoResultadoDados;
    const linha = '────────────────────';
    let loteriaNome = loteriaAtual === 'mega' ? 'MEGA-SENA' : (loteriaAtual === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA');
    
    let msg = `*🏆 RESULTADO - ${loteriaNome}* 🎲\n🏆 Rumo ao Grande Prêmio!\n${linha}\n📌 Concurso: ${ultimoResultadoConcurso}\n🎯 Números Sorteados:\n   ${numeros.join(' - ')}\n`;
    if (dataSorteio) msg += `📅 Sorteio: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}\n`;
    msg += `${linha}\n📊 DESEMPENHO DO GRUPO:\n`;
    
    if (loteriaAtual === 'mega') {
        msg += `   ✨ Sena: ${premios.sena}\n   ✨ Quina: ${premios.quina}\n   ✨ Quadra: ${premios.quadra}\n   ✅ Terno: ${premios.terno}\n   ✅ Duque: ${premios.duque}\n\n`;
        if (premios.terno > 0 || premios.duque > 0) msg += `⚠️ Terno e Duque mostram que estamos chegando perto!\n`;
        else if (premios.quadra > 0) msg += `⚠️ Quadra! Estamos no caminho certo!\n`;
        else if (premios.quina > 0) msg += `⭐ Quina! Quase lá!\n`;
        else if (premios.sena > 0) msg += `🎉🎉🎉 SENA! PARABÉNS! 🎉🎉🎉\n`;
        else msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
    } else if (loteriaAtual === 'lotofacil') {
        msg += `   ✨ 15 Pontos: ${premios.pontos15}\n   ✨ 14 Pontos: ${premios.pontos14}\n   ✨ 13 Pontos: ${premios.pontos13}\n   ✅ 12 Pontos: ${premios.pontos12}\n   ✅ 11 Pontos: ${premios.pontos11}\n\n`;
        if (premios.pontos12 > 0 || premios.pontos11 > 0) msg += `⚠️ Estamos chegando perto!\n`;
        else if (premios.pontos13 > 0) msg += `⚠️ 13 pontos! Quase lá!\n`;
        else if (premios.pontos14 > 0) msg += `⭐ 14 pontos! Muito perto!\n`;
        else if (premios.pontos15 > 0) msg += `🎉🎉🎉 15 PONTOS! PARABÉNS! 🎉🎉🎉\n`;
        else msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
    } else {
        msg += `   ✨ Quina: ${premios.quina}\n   ✨ Quadra: ${premios.quadra}\n   ✅ Terno: ${premios.terno}\n   ✅ Duque: ${premios.duque}\n\n`;
        if (premios.terno > 0 || premios.duque > 0) msg += `⚠️ Estamos chegando perto!\n`;
        else if (premios.quadra > 0) msg += `⚠️ Quadra! Quase lá!\n`;
        else if (premios.quina > 0) msg += `🎉🎉🎉 QUINA! PARABÉNS! 🎉🎉🎉\n`;
        else msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
    }
    
    msg += `${linha}\n🔗 Acesse o resultado completo:\nhttps://rebrand.ly/boloesaleatorios`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile ? `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
    showToast('📱 Abrindo WhatsApp...', 'info');
}

async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    if (!concurso) { showToast('⚠️ Selecione um concurso', 'warning'); return; }
    const area = document.getElementById('resultadosArea');
    if (!area) return;
    area.innerHTML = '<div class="loading">🔍 Processando...</div>';
    const resultados = loteriaAtual === 'mega' ? resultadosMega : loteriaAtual === 'lotofacil' ? resultadosLotofacil : resultadosQuina;
    const cartoesConc = cartoes.filter(c => c.tipo === loteriaAtual && c.concurso == concurso);
    if (cartoesConc.length === 0) {
        area.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso}</div>`;
        return;
    }
    
    if (typeof firebase !== 'undefined' && firebase.analytics) {
        try {
            firebase.analytics().logEvent('conferir_resultados', { 
                loteria: loteriaAtual, 
                concurso: concurso, 
                quantidade_cartoes: cartoesConc.length 
            });
        } catch(e) {}
    }

    let numeros = null, dataSorteio = null;
    if (resultados[concurso]) {
        numeros = resultados[concurso];
    } else {
        const busca = await buscarResultadoInterno(concurso, loteriaAtual);
        if (busca) {
            numeros = busca.numeros;
            dataSorteio = busca.dataSorteio;
        } else {
            area.innerHTML = `<div class="empty-state">❌ Resultado não encontrado. Digite manualmente no Admin.</div>`;
            showToast('❌ Resultado não encontrado', 'error');
            return;
        }
    }
    
    const resultadosCalc = cartoesConc.map(c => ({ ...c, acertos: c.numeros.filter(n => numeros.includes(n)).length })).sort((a,b) => b.acertos - a.acertos);
    let premios = {};
    if (loteriaAtual === 'mega') {
        premios = {
            sena: resultadosCalc.filter(r => r.acertos >= 6).length,
            quina: resultadosCalc.filter(r => r.acertos === 5).length,
            quadra: resultadosCalc.filter(r => r.acertos === 4).length,
            terno: resultadosCalc.filter(r => r.acertos === 3).length,
            duque: resultadosCalc.filter(r => r.acertos === 2).length
        };
    } else if (loteriaAtual === 'lotofacil') {
        premios = {
            pontos15: resultadosCalc.filter(r => r.acertos >= 15).length,
            pontos14: resultadosCalc.filter(r => r.acertos === 14).length,
            pontos13: resultadosCalc.filter(r => r.acertos === 13).length,
            pontos12: resultadosCalc.filter(r => r.acertos === 12).length,
            pontos11: resultadosCalc.filter(r => r.acertos === 11).length
        };
    } else {
        premios = {
            quina: resultadosCalc.filter(r => r.acertos >= 5).length,
            quadra: resultadosCalc.filter(r => r.acertos === 4).length,
            terno: resultadosCalc.filter(r => r.acertos === 3).length,
            duque: resultadosCalc.filter(r => r.acertos === 2).length
        };
    }
    
    ultimoResultadoConcurso = concurso;
    ultimoResultadoDados = { numeros, dataSorteio, premios };
    
    let html = `<div style="background:#f0fdf4;border-radius:10px;padding:15px;margin-bottom:15px;text-align:center"><h3 style="font-size:16px;">🏆 RESULTADO DO CONCURSO ${concurso}</h3><div style="display:flex;justify-content:center;gap:12px;margin:12px 0;flex-wrap:wrap">`;
    if (loteriaAtual === 'mega') {
        html += `<div><span style="font-size:20px;font-weight:bold;color:#f59e0b">${premios.sena}</span><br>SENA</div><div><span style="font-size:20px;font-weight:bold;color:#eab308">${premios.quina}</span><br>QUINA</div><div><span style="font-size:20px;font-weight:bold;color:#a855f7">${premios.quadra}</span><br>QUADRA</div><div><span style="font-size:20px;font-weight:bold;color:#3b82f6">${premios.terno}</span><br>TERNO</div><div><span style="font-size:20px;font-weight:bold;color:#64748b">${premios.duque}</span><br>DUQUE</div>`;
    } else if (loteriaAtual === 'lotofacil') {
        html += `<div><span style="font-size:20px;font-weight:bold;color:#f59e0b">${premios.pontos15}</span><br>15 PTS</div><div><span style="font-size:20px;font-weight:bold;color:#eab308">${premios.pontos14}</span><br>14 PTS</div><div><span style="font-size:20px;font-weight:bold;color:#a855f7">${premios.pontos13}</span><br>13 PTS</div><div><span style="font-size:20px;font-weight:bold;color:#3b82f6">${premios.pontos12}</span><br>12 PTS</div><div><span style="font-size:20px;font-weight:bold;color:#64748b">${premios.pontos11}</span><br>11 PTS</div>`;
    } else {
        html += `<div><span style="font-size:20px;font-weight:bold;color:#f59e0b">${premios.quina}</span><br>QUINA</div><div><span style="font-size:20px;font-weight:bold;color:#eab308">${premios.quadra}</span><br>QUADRA</div><div><span style="font-size:20px;font-weight:bold;color:#a855f7">${premios.terno}</span><br>TERNO</div><div><span style="font-size:20px;font-weight:bold;color:#3b82f6">${premios.duque}</span><br>DUQUE</div>`;
    }
    html += `<div><span style="font-size:20px;font-weight:bold">${resultadosCalc.length}</span><br>CARTÕES</div></div><div style="background:#d1fae5;padding:8px;border-radius:6px;font-size:12px;">🎲 Sorteados: ${numeros.join(' - ')}${dataSorteio?`<br>📅 Data: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}`:''}</div><button id="btnWhatsApp" class="btn-whatsapp" style="margin-top:12px;background:#25D366;width:100%;padding:10px;">📱 COMPARTILHAR NO WHATSAPP</button></div>`;
    
    const porBolao = {};
    resultadosCalc.forEach(r => { const b = r.bolao || 'Sem Bolão'; if (!porBolao[b]) porBolao[b] = []; porBolao[b].push(r); });
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="background:white;border-radius:10px;padding:15px;margin-bottom:15px;border:1px solid #e2e8f0"><h4 style="color:#3b82f6;font-size:14px;">🎯 ${bolao}</h4>`;
        lista.forEach(c => {
            let cor = loteriaAtual === 'mega' ? (c.acertos >= 6 ? '#f59e0b' : c.acertos === 5 ? '#eab308' : c.acertos === 4 ? '#a855f7' : c.acertos === 3 ? '#3b82f6' : '#cbd5e1') : (loteriaAtual === 'lotofacil' ? (c.acertos >= 15 ? '#f59e0b' : c.acertos === 14 ? '#eab308' : c.acertos === 13 ? '#a855f7' : c.acertos === 12 ? '#3b82f6' : '#cbd5e1') : (c.acertos >= 5 ? '#f59e0b' : c.acertos === 4 ? '#eab308' : c.acertos === 3 ? '#a855f7' : '#cbd5e1'));
            html += `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px;"><span style="font-size:12px;">Cartão - Concurso ${concurso}</span><span style="background:${cor};color:white;padding:2px 8px;border-radius:20px;font-size:11px;">${c.acertos} acertos</span></div><div style="display:flex;flex-wrap:wrap;gap:3px;">${c.numeros.map(n => `<span style="background:${numeros.includes(n)?'#10b981':'#e2e8f0'};color:${numeros.includes(n)?'white':'#333'};padding:3px 6px;border-radius:4px;font-family:monospace;font-size:10px;">${n.toString().padStart(2,'0')}</span>`).join('')}</div></div>`;
        });
        html += `</div>`;
    }
    area.innerHTML = html;
    mostrarCartoesDoConcurso();
    const btn = document.getElementById('btnWhatsApp');
    if (btn) btn.addEventListener('click', compartilharWhatsApp);
    showToast('🏆 Conferência concluída!', 'success');
}

async function carregarBolaoAtivo() {
    console.log('📋 Carregando bolões especiais...');
    const card = document.getElementById('cardBolaoAtivo');
    const container = document.getElementById('bolaoContainer');
    if (!card || !container) return;
    
    try {
        const configDoc = await db.collection('config_boloes').doc('ativos').get();
        if (!configDoc.exists) {
            if (card) card.style.display = 'none';
            return;
        }
        
        const dados = configDoc.data();
        let idsSelecionados = dados.ids || [];
        const statusMap = dados.status || {};
        const dataLimiteMap = dados.dataLimite || {};
        
        if (idsSelecionados.length === 0) {
            if (card) card.style.display = 'none';
            return;
        }
        
        const promessas = idsSelecionados.map(id => db.collection('participantes').doc(id).get());
        const resultados = await Promise.all(promessas);
        const boloes = [];
        resultados.forEach(doc => {
            if (doc.exists) {
                boloes.push({ id: doc.id, ...doc.data() });
            }
        });
        
        if (boloes.length === 0) {
            if (card) card.style.display = 'none';
            return;
        }
        
        boloes.sort((a, b) => {
            const statusA = statusMap[a.id] || 'andamento';
            const statusB = statusMap[b.id] || 'andamento';
            if (statusA === 'aberto' && statusB !== 'aberto') return -1;
            if (statusA !== 'aberto' && statusB === 'aberto') return 1;
            return 0;
        });
        
        card.style.display = 'block';
        
        let html = '';
        for (const bolao of boloes) {
            const participantes = bolao.participantes || [];
            const totalQuitados = participantes.filter(p => p.situacao === 'quitado' || p.situacao === 'pago').length;
            const totalAndamento = participantes.filter(p => p.situacao !== 'quitado' && p.situacao !== 'pago').length;
            const statusText = statusMap[bolao.id] === 'aberto' ? '🟢 ABERTO' : '🟡 EM ANDAMENTO';
            const statusColor = statusMap[bolao.id] === 'aberto' ? '#10b981' : '#f59e0b';
            
            const dataLimiteAdmin = dataLimiteMap[bolao.id] || '';
            let dataTexto = '';
            if (statusMap[bolao.id] === 'aberto' && dataLimiteAdmin) {
                dataTexto = `<br>📅 Até ${new Date(dataLimiteAdmin).toLocaleDateString('pt-BR')}`;
            } else if (statusMap[bolao.id] !== 'aberto') {
                dataTexto = `<br>📅 Inscrições encerradas`;
            }
            
            html += `
                <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                        <strong style="font-size: 16px;">🎯 ${bolao.titulo} <span style="font-size: 11px; color: ${statusColor};">${statusText}</span></strong>
                    </div>
                    <div style="font-size: 12px; margin-top: 5px;">
                        💰 Valor da cota: R$ ${bolao.valorPorCota || 0},00
                        ${dataTexto}
                    </div>
                    <div style="font-size: 12px; margin-top: 8px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                        <span style="color: #10b981;">✅ Quitados: ${totalQuitados}</span>
                        <span style="color: #f59e0b;">🔄 Em andamento: ${totalAndamento}</span>
                    </div>
                    <button class="btn-ver-participantes" data-id="${bolao.id}" style="background: #3b82f6; width: auto; padding: 4px 10px; font-size: 11px; margin-top: 8px;">👁 VER</button>
                    <div id="participantes-${bolao.id}" style="display: none; margin-top: 10px;"></div>
                </div>
            `;
        }
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-ver-participantes').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const div = document.getElementById(`participantes-${id}`);
                if (div.style.display === 'none') {
                    const bolao = boloes.find(b => b.id === id);
                    const participantes = bolao.participantes || [];
                    let listaHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">';
                    participantes.forEach(p => {
                        const statusText = p.situacao === 'quitado' || p.situacao === 'pago' ? '✅ QUITADO' : '🔄 EM ANDAMENTO';
                        listaHtml += `<div class="participante-item" style="display: flex; justify-content: space-between; align-items: center; padding: 6px; background: #f8fafc; border-radius: 6px;">
                                        <span class="participante-nome" style="font-size: 12px;">${p.nome}</span>
                                        <span class="participante-status ${p.situacao === 'quitado' || p.situacao === 'pago' ? 'status-quitado' : 'status-pendente'}" style="font-size: 10px;">${statusText}</span>
                                    </div>`;
                    });
                    listaHtml += '</div>';
                    div.innerHTML = listaHtml;
                    div.style.display = 'block';
                    btn.textContent = '🙈 OCULTAR';
                } else {
                    div.style.display = 'none';
                    btn.textContent = '👁 VER';
                }
            };
        });
        
        console.log(`✅ ${boloes.length} bolão(ões) exibido(s)`);
        
    } catch (error) {
        console.error('Erro ao carregar bolões:', error);
        if (card) card.style.display = 'none';
    }
}

async function carregarBolaoAberto() {
    const card = document.getElementById('cardBolaoAberto');
    const container = document.getElementById('bolaoAbertoContainer');
    if (!card || !container) return;
    
    try {
        const configDoc = await db.collection('config_boloes').doc('ativos').get();
        if (!configDoc.exists) {
            card.style.display = 'none';
            return;
        }
        
        const dados = configDoc.data();
        const idsSelecionados = dados.ids || [];
        const statusMap = dados.status || {};
        const dataLimiteMap = dados.dataLimite || {};
        const destaqueMap = dados.destaque || {};  // ← NOVO: carregar o mapa de destaques
        
        let boloesAbertos = [];
        for (const id of idsSelecionados) {
            if (statusMap[id] === 'aberto') {
                const doc = await db.collection('participantes').doc(id).get();
                if (doc.exists) {
                    boloesAbertos.push({ id: id, data: doc.data() });
                }
            }
        }
        
        if (boloesAbertos.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        // NOVO: Verificar se tem um bolão marcado como destaque
        let primeiroBolao = null;
        let bolaoDestaque = null;
        
        // Primeiro, tentar encontrar o bolão marcado como destaque
        for (const b of boloesAbertos) {
            if (destaqueMap[b.id]) {
                bolaoDestaque = b;
                break;
            }
        }
        
        if (bolaoDestaque) {
            primeiroBolao = bolaoDestaque;
        } else {
            primeiroBolao = boloesAbertos[0];  // fallback: o primeiro da lista
        }
        
        const bolaoAberto = primeiroBolao.data;
        const bolaoId = primeiroBolao.id;
        
        card.style.display = 'block';
        
        const vagasDisponiveis = bolaoAberto.vagasDisponiveis || 0;
        const vagasTotais = bolaoAberto.vagasTotais || 0;
        
        let vagasTexto = '';
        if (vagasTotais > 0) {
            if (vagasDisponiveis <= 5 && vagasDisponiveis > 0) {
                vagasTexto = `🔴 ÚLTIMAS ${vagasDisponiveis} VAGAS!`;
            } else if (vagasDisponiveis > 0) {
                vagasTexto = `${vagasDisponiveis} vagas disponíveis de ${vagasTotais}`;
            } else if (vagasDisponiveis === 0 && vagasTotais > 0) {
                vagasTexto = `🔴 LOTADO - Inscrições encerradas`;
            }
        } else if (vagasDisponiveis > 0) {
            vagasTexto = `${vagasDisponiveis} vagas disponíveis`;
        }
        
        const dataLimite = dataLimiteMap[bolaoId] || '';
        const dataTexto = dataLimite ? ` | 📅 Até ${new Date(dataLimite).toLocaleDateString('pt-BR')}` : '';
        
        const outrosBoloes = boloesAbertos.length - 1;
        let outrosTexto = '';
        if (outrosBoloes > 0) {
            outrosTexto = `<div style="margin-top: 12px; font-size: 12px;">
                                ⭐ +${outrosBoloes} outro${outrosBoloes > 1 ? 's' : ''} bolão${outrosBoloes > 1 ? 'es' : ''} aberto(s). 
                                <a href="#" id="linkVerTodos" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Clique aqui para ver todos ➡️</a>
                           </div>`;
        }
        
        let html = `
            <div style="text-align: center;">
                <strong style="font-size: 18px;">🎯 ${bolaoAberto.titulo || 'Bolão Aberto'} <span style="font-size: 12px; color: #10b981;">🟢 ABERTO</span></strong>
                <div style="font-size: 13px; margin-top: 5px;">
                    ${bolaoAberto.loteria === 'mega' ? 'MEGA-SENA' : bolaoAberto.loteria === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA'}
                    ${bolaoAberto.concurso ? ` - Concurso ${bolaoAberto.concurso}` : ''}
                </div>
                <div style="font-size: 13px; margin-top: 5px;">
                    💰 R$ ${bolaoAberto.valorPorCota || 0},00 por cota${dataTexto}
                </div>
                ${vagasTexto ? `<div style="font-size: 14px; margin-top: 8px; font-weight: bold; color: ${vagasTexto.includes('LOTADO') ? '#ef4444' : (vagasDisponiveis <= 5 && vagasDisponiveis > 0) ? '#ef4444' : '#059669'};">${vagasTexto}</div>` : ''}
                <button id="btnParticiparAberto" style="background: #10b981; margin-top: 12px; width: auto; padding: 10px 25px;">📝 QUERO PARTICIPAR</button>
                ${outrosTexto}
            </div>
        `;
        
        container.innerHTML = html;
        
        const btnParticipar = document.getElementById('btnParticiparAberto');
        if (btnParticipar) {
            btnParticipar.onclick = () => mostrarModalParticipacao(bolaoAberto);
        }
        
        const linkVerTodos = document.getElementById('linkVerTodos');
        if (linkVerTodos) {
            linkVerTodos.onclick = (e) => {
                e.preventDefault();
                const boloesEspeciais = document.getElementById('cardBolaoAtivo');
                if (boloesEspeciais) {
                    boloesEspeciais.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
        }
        
    } catch (error) {
        console.error('Erro ao carregar bolão aberto:', error);
        card.style.display = 'none';
    }
}

function mostrarModalParticipacao(bolao) {
    let modal = document.getElementById('modalParticipacao');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'modalParticipacao';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;';
    
    // Buscar PIX diretamente do Firebase para garantir que está atualizado
    let pixChave = pixGeral || 'Chave PIX não cadastrada';
    
    // Tentar buscar do Firebase novamente (fallback)
    db.collection('config_geral').doc('pix').get().then(doc => {
        if (doc.exists && doc.data().chave) {
            pixChave = doc.data().chave;
        }
        atualizarModal();
    }).catch(() => {
        atualizarModal();
    });
    
    function atualizarModal() {
        const vagasDisponiveis = bolao.vagasDisponiveis || 0;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'background: white; border-radius: 20px; max-width: 400px; width: 90%; padding: 25px; text-align: center; max-height: 80vh; overflow-y: auto;';
        modalContent.innerHTML = `
            <div style="font-size: 24px;">📝</div>
            <div style="font-size: 20px; font-weight: bold; margin: 10px 0;">COMO PARTICIPAR</div>
            <div style="text-align: left;">
                <p><strong>🎯 ${bolao.titulo}</strong></p>
                <p>💰 Valor da cota: R$ ${bolao.valorPorCota || 0},00</p>
                <p>💳 Pague via PIX:</p>
                <div style="background: #f1f5f9; padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <code style="font-size: 14px; word-break: break-all; flex: 1;">${pixChave}</code>
                    <button id="copiarPix" style="background: #3b82f6; border: none; padding: 8px 15px; border-radius: 8px; color: white; cursor: pointer; font-size: 13px; white-space: nowrap;">📋 COPIAR</button>
                </div>
                <p style="margin-top: 15px;">Após o pagamento, envie o comprovante para:</p>
                <button id="falarAdmin" style="background: #25D366; margin-top: 5px; width: 100%; padding: 12px; border-radius: 10px; font-weight: bold;">📲 FALAR COM ADMIN</button>
            </div>
            <button id="fecharModalParticipacao" style="background: #64748b; margin-top: 15px; width: 100%; padding: 12px; border-radius: 30px;">Fechar</button>
        `;
        
        modal.innerHTML = '';
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        document.getElementById('fecharModalParticipacao').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        
        const copiarBtn = document.getElementById('copiarPix');
        if (copiarBtn) {
            copiarBtn.onclick = () => {
                navigator.clipboard.writeText(pixChave);
                showToast('✅ Chave PIX copiada!', 'success');
            };
        }
        
        const falarAdmin = document.getElementById('falarAdmin');
        if (falarAdmin) {
            falarAdmin.onclick = () => {
                const msg = `Olá! Gostaria de participar do bolão "${bolao.titulo}"`;
                window.open(`https://wa.me/5561998507770?text=${encodeURIComponent(msg)}`, '_blank');
            };
        }
    }
}

async function verificarNovosResultados() {
    try {
        const resMega = await db.collection('resultados').where('tipo', '==', 'mega').get();
        const novosMega = {};
        resMega.forEach(doc => { novosMega[doc.id] = doc.data().numeros; });
        ultimoEstadoMega = novosMega;
        
        const resLoto = await db.collection('resultados').where('tipo', '==', 'lotofacil').get();
        const novosLoto = {};
        resLoto.forEach(doc => { novosLoto[doc.id] = doc.data().numeros; });
        ultimoEstadoLotofacil = novosLoto;
        
        const resQuina = await db.collection('resultados').where('tipo', '==', 'quina').get();
        const novosQuina = {};
        resQuina.forEach(doc => { novosQuina[doc.id] = doc.data().numeros; });
        ultimoEstadoQuina = novosQuina;
        
        atualizarStats();
    } catch(e) { console.log('Erro:', e); }
}

let intervalo, intervaloNotif;
// FUNÇÃO DESATIVADA - Manter apenas para não quebrar referências
function iniciarAutoAtualizacao() { 
    console.log('⏸️ Auto-atualização desativada para melhor performance');
    if (intervalo) clearInterval(intervalo); 
    // intervalo = setInterval(() => carregarDados(), 180000); // REMOVIDO
}
function iniciarMonitoramento() { if (intervaloNotif) clearInterval(intervaloNotif); intervaloNotif = setInterval(() => verificarNovosResultados(), 120000); }

async function buscarResultadoAutomatico() {
    const concurso = document.getElementById('concursoSelect').value;
    
    if (!concurso || concurso === '1' || concurso === '0' || concurso === '') {
        console.log('⏳ Nenhum concurso válido selecionado');
        return;
    }
    
    // Verificar se o concurso existe na lista de cartões
    const cartoesConcurso = cartoes.filter(c => c.tipo === loteriaAtual && c.concurso == concurso);
    if (cartoesConcurso.length === 0) {
        console.log(`⏳ Nenhum cartão para o concurso ${concurso}`);
        return;
    }
    
    const resultados = loteriaAtual === 'mega' ? resultadosMega : 
                       loteriaAtual === 'lotofacil' ? resultadosLotofacil : 
                       resultadosQuina;
    
    if (resultados[concurso]) {
        console.log(`📋 Resultado do concurso ${concurso} já está salvo`);
        mostrarResultadoExistente(concurso, resultados[concurso]);
        await conferirResultados();
        return;
    }
    
    if (cacheResultadosBuscados[concurso]) {
        console.log(`⏳ Resultado do concurso ${concurso} já foi buscado e não encontrado`);
        mostrarStatusAguardando(concurso);
        return;
    }
    
    console.log(`🔍 Buscando resultado do concurso ${concurso}...`);
    cacheResultadosBuscados[concurso] = true;
    
    const busca = await buscarResultadoInterno(concurso, loteriaAtual);
    
    if (busca && busca.numeros && busca.numeros.length > 0) {
        await salvarResultadoEncontrado(concurso, busca.numeros, busca.dataSorteio);
        await conferirResultados();
        showToast(`🎉 Resultado do concurso ${concurso} encontrado!`, 'success');
    } else {
        mostrarStatusAguardando(concurso);
    }
}

function mostrarStatusAguardando(concurso) {
    const statusDiv = document.getElementById('statusBusca');
    if (statusDiv) {
        const loteriaNome = loteriaAtual === 'mega' ? 'MEGA-SENA' : 
                           (loteriaAtual === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA');
        statusDiv.innerHTML = `
            <div class="status-info">
                📢 RESULTADO DO CONCURSO ${concurso} (${loteriaNome}) AINDA NÃO DISPONÍVEL<br>
                🔍 Quando sair o resultado, clique em "BUSCAR RESULTADO" ou aguarde que o sistema buscará automaticamente.
            </div>
        `;
    }
}

function mostrarResultadoExistente(concurso, numeros) {
    const statusDiv = document.getElementById('statusBusca');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div class="status-success">
                ✅ RESULTADO DO CONCURSO ${concurso} JÁ DISPONÍVEL! 🎲<br>
                🎯 Números: ${numeros.join(' - ')}
            </div>
        `;
    }
}

async function salvarResultadoEncontrado(concurso, numeros, dataSorteio) {
    const collection = loteriaAtual === 'mega' ? 'resultados_mega' : 
                       loteriaAtual === 'lotofacil' ? 'resultados_lotofacil' : 
                       'resultados_quina';
    
    try {
        await db.collection(collection).doc(concurso).set({
            concurso: concurso,
            numeros: numeros,
            tipo: loteriaAtual,
            admin: true,
            dataAtualizacao: new Date().toISOString(),
            dataSorteio: dataSorteio || null
        });
        
        console.log(`✅ Resultado do concurso ${concurso} salvo em ${collection}`);
        
        // Atualizar cache local
        if (loteriaAtual === 'mega') resultadosMega[concurso] = numeros;
        else if (loteriaAtual === 'lotofacil') resultadosLotofacil[concurso] = numeros;
        else resultadosQuina[concurso] = numeros;
        
    } catch (error) {
        console.error('❌ Erro ao salvar resultado:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Inicializando sistema...');
    
    // 1. Carregar configurações
    await carregarConfiguracoes();
    
    // 2. Carregar dados principais (cartões, resultados)
    await carregarDados();
    
    // 3. Carregar bolões especiais e abertos (já chamado dentro de carregarDados)
    // NOTA: carregarBolaoAtivo e carregarBolaoAberto já são chamados dentro de carregarDados
    
    // 4. Configurar eventos dos botões
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    const btnQuina = document.getElementById('btnQuina');
    const selCon = document.getElementById('concursoSelect');
    const btnConf = document.getElementById('btnConferir');
    const btnCompartilhar = document.getElementById('btnCompartilhar');
    const btnSugestao = document.getElementById('btnSugestao');
    
    if (btnMega) btnMega.addEventListener('click', () => setLoteria('mega'));
    if (btnLoto) btnLoto.addEventListener('click', () => setLoteria('lotofacil'));
    if (btnQuina) btnQuina.addEventListener('click', () => setLoteria('quina'));
    if (selCon) selCon.addEventListener('change', mostrarCartoesDoConcurso);
    if (btnConf) {
        btnConf.addEventListener('click', conferirResultados);
        btnConf.addEventListener('touchstart', conferirResultados);
    }
    if (btnCompartilhar) btnCompartilhar.addEventListener('click', compartilharSite);
    if (btnSugestao) btnSugestao.addEventListener('click', enviarSugestao);
    
    adicionarBotaoInstalar();
    mostrarCartoesDoConcurso();
    
    // TIMERS REMOVIDOS PARA MELHOR PERFORMANCE
// iniciarAutoAtualizacao();  // ❌ Removido - recarregava tudo a cada 3min
// iniciarMonitoramento();     // ❌ Removido - não necessário
console.log('✅ Sistema carregado - sem timers automáticos');
    
    showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
});