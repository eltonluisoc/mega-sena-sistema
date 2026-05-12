let cartoes = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let resultadosQuina = {};
let loteriaAtual = 'mega';
let ultimoResultadoConcurso = null;
let ultimoResultadoDados = null;
let pixGeral = '';
let cacheResultadosBuscados = {};
let dadosCarregados = false;

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

function entrarGrupoWhatsApp() {
    const linkGrupo = 'https://chat.whatsapp.com/HpJzQTlhN7hJJmlvIEspbK';
    window.open(linkGrupo, '_blank');
    showToast('📱 Abrindo grupo oficial do WhatsApp...', 'info');
}
function setLoteria(loteria) {
    if (loteriaAtual === loteria) return;
    
    console.log(`🔄 Trocando loteria de ${loteriaAtual} para ${loteria}`);
    loteriaAtual = loteria;
    
    // Atualizar UI dos botões
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    const btnQuina = document.getElementById('btnQuina');
    
    if (btnMega) btnMega.classList.remove('active');
    if (btnLoto) btnLoto.classList.remove('active');
    if (btnQuina) btnQuina.classList.remove('active');
    
    if (loteria === 'mega') {
        if (btnMega) btnMega.classList.add('active');
        const header = document.getElementById('cardHeaderConferencia');
        if (header) header.innerHTML = '🎯 CONFERIR RESULTADOS - MEGA';
    } else if (loteria === 'lotofacil') {
        if (btnLoto) btnLoto.classList.add('active');
        const header = document.getElementById('cardHeaderConferencia');
        if (header) header.innerHTML = '🎯 CONFERIR RESULTADOS - LOTOFÁCIL';
    } else if (loteria === 'quina') {
        if (btnQuina) btnQuina.classList.add('active');
        const header = document.getElementById('cardHeaderConferencia');
        if (header) header.innerHTML = '🎯 CONFERIR RESULTADOS - QUINA';
    }
    
    // Limpar resultados anteriores
    const areaUnificada = document.getElementById('resultadosAreaUnificada');
    if (areaUnificada) {
        areaUnificada.innerHTML = '<div class="empty-state">🔍 Selecione um concurso e clique em "Conferir Resultados"</div>';
    }
    
    const statusDiv = document.getElementById('statusBusca');
    if (statusDiv) statusDiv.innerHTML = '';
    
    // Recarregar dados da loteria
    atualizarSelectConcursos();
    
    const selectConcurso = document.getElementById('concursoSelect');
    if (selectConcurso && selectConcurso.options.length > 1) {
        selectConcurso.selectedIndex = 1;
        mostrarCartoesDoConcurso();
    }
    
    showToast(`🔄 Mudou para ${loteria === 'mega' ? 'MEGA' : loteria === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA'}`, 'info');
}

async function carregarDados() {
    console.log('🔄 Carregando dados...');
    dadosCarregados = false;
    const loadingDiv = document.getElementById('loadingIndicator');
    const loadingPercent = document.getElementById('loadingPercent');
    if (loadingDiv) loadingDiv.style.display = 'block';
    
    const atualizarPercentual = (percent, mensagem) => {
        if (loadingPercent) loadingPercent.innerText = `${percent}% - ${mensagem}`;
        console.log(`📊 ${percent}% - ${mensagem}`);
    };
    
    try {
        atualizarPercentual(5, 'Iniciando...');
        
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
                    tipo: d.tipo || 'mega',
                    tipoParticipacao: d.tipoParticipacao || 'exclusivo'
                });
            }
        });
        
        atualizarPercentual(30, 'Carregando resultados Mega-Sena...');
        try {
            const resMega = await db.collection('resultados_mega').get();
            resultadosMega = {};
            resMega.forEach(doc => { resultadosMega[doc.id] = doc.data().numeros; });
        } catch (e) {
            console.warn('Erro ao carregar resultados Mega:', e);
            resultadosMega = {};
        }
        
        atualizarPercentual(50, 'Carregando resultados Lotofácil...');
        try {
            const resLoto = await db.collection('resultados_lotofacil').get();
            resultadosLotofacil = {};
            resLoto.forEach(doc => { resultadosLotofacil[doc.id] = doc.data().numeros; });
        } catch (e) {
            console.warn('Erro ao carregar resultados Lotofácil:', e);
            resultadosLotofacil = {};
        }
        
        atualizarPercentual(70, 'Carregando resultados Quina...');
        try {
            const resQuina = await db.collection('resultados_quina').get();
            resultadosQuina = {};
            resQuina.forEach(doc => { resultadosQuina[doc.id] = doc.data().numeros; });
        } catch (e) {
            console.warn('Erro ao carregar resultados Quina:', e);
            resultadosQuina = {};
        }
        
        atualizarPercentual(85, 'Carregando bolões...');
        try {
            await carregarBolaoAtivo();
            await carregarBolaoAberto();
        } catch (e) {
            console.warn('Erro ao carregar bolões:', e);
        }
        
        atualizarPercentual(100, 'Concluído!');
        
        setTimeout(() => {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }, 500);
        
        atualizarSelectConcursos();
        selecionarUltimoConcurso();
        
        dadosCarregados = true;
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('❌ Erro ao carregar dados. Recarregue a página.', 'error');
        if (loadingDiv) loadingDiv.style.display = 'none';
        dadosCarregados = true;
    }
}
function atualizarSelectConcursos() {
    const filtrados = cartoes.filter(c => c.tipo === loteriaAtual);
    const concursos = [...new Set(filtrados.map(c => c.concurso))];
    concursos.sort((a, b) => b - a);
    
    console.log(`📋 ${loteriaAtual}: ${filtrados.length} cartões, ${concursos.length} concursos`);
    
    const select = document.getElementById('concursoSelect');
    if (!select) return;
    
    let html = '<option value="">Selecione um concurso</option>';
    
    if (concursos.length === 0) {
        html = '<option value="">Nenhum concurso disponível</option>';
    } else {
        concursos.forEach(con => {
            const total = filtrados.filter(c => c.concurso == con).length;
            html += `<option value="${con}">Concurso ${con} (${total} cartões)</option>`;
        });
    }
    
    select.innerHTML = html;
    
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
    if (!concurso) return;
    
    // Apenas registrar que os cartões estão disponíveis
    // A exibição real é feita na conferência
    console.log(`📋 Cartões disponíveis para ${loteriaAtual} concurso ${concurso}`);
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
async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    const area = document.getElementById('resultadosAreaUnificada');
    
    if (!concurso) {
        showToast('⚠️ Selecione um concurso', 'warning');
        return;
    }
    
    area.innerHTML = '<div class="loading">🔍 Processando...</div>';
    
    // Filtrar cartões da loteria atual E do concurso selecionado
    const cartoesConcurso = cartoes.filter(c => c.tipo === loteriaAtual && c.concurso == concurso);
    
    if (cartoesConcurso.length === 0) {
        area.innerHTML = `<div class="empty-state">⚠️ Nenhum cartão da ${loteriaAtual.toUpperCase()} para o concurso ${concurso}</div>`;
        showToast(`⚠️ Nenhum cartão da ${loteriaAtual.toUpperCase()} para o concurso ${concurso}`, 'warning');
        return;
    }
    
    // Buscar resultados da loteria atual
    const resultados = loteriaAtual === 'mega' ? resultadosMega : 
                       loteriaAtual === 'lotofacil' ? resultadosLotofacil : 
                       resultadosQuina;
    
    let numerosSorteados = null;
    let dataSorteio = null;
    
    if (resultados[concurso]) {
        numerosSorteados = resultados[concurso];
    } else {
        const busca = await buscarResultadoInterno(concurso, loteriaAtual);
        if (busca) {
            numerosSorteados = busca.numeros;
            dataSorteio = busca.dataSorteio;
            // Salvar no cache local
            if (loteriaAtual === 'mega') resultadosMega[concurso] = numerosSorteados;
            else if (loteriaAtual === 'lotofacil') resultadosLotofacil[concurso] = numerosSorteados;
            else resultadosQuina[concurso] = numerosSorteados;
        } else {
            area.innerHTML = `<div class="empty-state">❌ Resultado não encontrado para ${loteriaAtual.toUpperCase()} concurso ${concurso}.<br>Digite manualmente no Admin ou aguarde.</div>`;
            showToast('❌ Resultado não encontrado', 'error');
            return;
        }
    }
    
    // Calcular acertos por cartão
    const cartoesComAcertos = cartoesConcurso.map(cartao => {
        const acertos = cartao.numeros.filter(n => numerosSorteados.includes(n)).length;
        return { ...cartao, acertos };
    }).sort((a, b) => b.acertos - a.acertos);
    
    // Calcular premiações
    let premios = {};
    if (loteriaAtual === 'mega') {
        premios = {
            sena: cartoesComAcertos.filter(r => r.acertos >= 6).length,
            quina: cartoesComAcertos.filter(r => r.acertos === 5).length,
            quadra: cartoesComAcertos.filter(r => r.acertos === 4).length,
            terno: cartoesComAcertos.filter(r => r.acertos === 3).length,
            duque: cartoesComAcertos.filter(r => r.acertos === 2).length
        };
    } else if (loteriaAtual === 'lotofacil') {
        premios = {
            pontos15: cartoesComAcertos.filter(r => r.acertos >= 15).length,
            pontos14: cartoesComAcertos.filter(r => r.acertos === 14).length,
            pontos13: cartoesComAcertos.filter(r => r.acertos === 13).length,
            pontos12: cartoesComAcertos.filter(r => r.acertos === 12).length,
            pontos11: cartoesComAcertos.filter(r => r.acertos === 11).length
        };
    } else {
        premios = {
            quina: cartoesComAcertos.filter(r => r.acertos >= 5).length,
            quadra: cartoesComAcertos.filter(r => r.acertos === 4).length,
            terno: cartoesComAcertos.filter(r => r.acertos === 3).length,
            duque: cartoesComAcertos.filter(r => r.acertos === 2).length
        };
    }
    
    ultimoResultadoConcurso = concurso;
    ultimoResultadoDados = { numeros: numerosSorteados, dataSorteio, premios };
    
    // Montar HTML unificado
    let html = '';
    
    // Resumo das premiações
    html += `<div class="resultado-resumo">`;
    if (loteriaAtual === 'mega') {
        html += `
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#f59e0b">${premios.sena}</div><div class="resultado-resumo-label">SENA</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#eab308">${premios.quina}</div><div class="resultado-resumo-label">QUINA</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#a855f7">${premios.quadra}</div><div class="resultado-resumo-label">QUADRA</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#3b82f6">${premios.terno}</div><div class="resultado-resumo-label">TERNO</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#64748b">${premios.duque}</div><div class="resultado-resumo-label">DUQUE</div></div>`;
    } else if (loteriaAtual === 'lotofacil') {
        html += `
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#f59e0b">${premios.pontos15}</div><div class="resultado-resumo-label">15 PTS</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#eab308">${premios.pontos14}</div><div class="resultado-resumo-label">14 PTS</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#a855f7">${premios.pontos13}</div><div class="resultado-resumo-label">13 PTS</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#3b82f6">${premios.pontos12}</div><div class="resultado-resumo-label">12 PTS</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#64748b">${premios.pontos11}</div><div class="resultado-resumo-label">11 PTS</div></div>`;
    } else {
        html += `
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#f59e0b">${premios.quina}</div><div class="resultado-resumo-label">QUINA</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#eab308">${premios.quadra}</div><div class="resultado-resumo-label">QUADRA</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#a855f7">${premios.terno}</div><div class="resultado-resumo-label">TERNO</div></div>
            <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#3b82f6">${premios.duque}</div><div class="resultado-resumo-label">DUQUE</div></div>`;
    }
    html += `<div class="resultado-resumo-item"><div class="resultado-resumo-numero">${cartoesComAcertos.length}</div><div class="resultado-resumo-label">CARTÕES</div></div>`;
    html += `</div>`;
    
    // Números sorteados
    html += `<div class="numeros-sorteados">${numerosSorteados.map(n => `<div class="numero-sorteado-card">${n.toString().padStart(2,'0')}</div>`).join('')}</div>`;
    if (dataSorteio) {
        html += `<div style="text-align:center; margin-bottom:15px; font-size:12px;">📅 Data do sorteio: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}</div>`;
    }
    
    // Botão compartilhar
    html += `<button id="btnWhatsAppResultado" style="background:#25D366; width:100%; padding:12px; border-radius:30px; margin-bottom:20px; font-weight:bold;">📱 COMPARTILHAR RESULTADO NO WHATSAPP</button>`;
    
    // Lista de cartões por bolão
    const porBolao = {};
    cartoesComAcertos.forEach(c => {
        const b = c.bolao || 'Sem Bolão';
        if (!porBolao[b]) porBolao[b] = [];
        porBolao[b].push(c);
    });
    
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="margin-top: 20px;"><div style="background:#3b82f6;color:white;padding:8px 12px;border-radius:8px;margin-bottom:12px;">🎯 ${bolao}</div>`;
        
        for (const cartao of lista) {
            // Definir cor dos acertos
            let corAcertos;
            if (loteriaAtual === 'mega') {
                if (cartao.acertos >= 6) corAcertos = '#f59e0b';
                else if (cartao.acertos === 5) corAcertos = '#eab308';
                else if (cartao.acertos === 4) corAcertos = '#a855f7';
                else if (cartao.acertos === 3) corAcertos = '#3b82f6';
                else corAcertos = '#cbd5e1';
            } else if (loteriaAtual === 'lotofacil') {
                if (cartao.acertos >= 15) corAcertos = '#f59e0b';
                else if (cartao.acertos === 14) corAcertos = '#eab308';
                else if (cartao.acertos === 13) corAcertos = '#a855f7';
                else if (cartao.acertos === 12) corAcertos = '#3b82f6';
                else corAcertos = '#cbd5e1';
            } else {
                if (cartao.acertos >= 5) corAcertos = '#f59e0b';
                else if (cartao.acertos === 4) corAcertos = '#eab308';
                else if (cartao.acertos === 3) corAcertos = '#a855f7';
                else corAcertos = '#cbd5e1';
            }
            
            const tipoParticipacao = cartao.tipoParticipacao === 'cota' ? '🎟️ Cota' : '👥 Exclusivo';
            
            html += `<div class="cartao-item-unificado">
                        <div class="cartao-header">
                            <span class="cartao-bolao">Cartão ${tipoParticipacao}</span>
                            <span class="cartao-acertos" style="background:${corAcertos}; color:white;">${cartao.acertos} acertos</span>
                        </div>
                        <div class="cartao-numeros">
                            ${cartao.numeros.map(n => {
                                const acertou = numerosSorteados.includes(n);
                                return `<span class="${acertou ? 'numero-acertado' : 'numero-normal'}">${n.toString().padStart(2,'0')}</span>`;
                            }).join('')}
                        </div>
                    </div>`;
        }
        html += `</div>`;
    }
    
    area.innerHTML = html;
    
    const btnWhats = document.getElementById('btnWhatsAppResultado');
    if (btnWhats) btnWhats.addEventListener('click', compartilharWhatsApp);
    
    showToast('🏆 Conferência concluída!', 'success');
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
        if (premios.sena > 0) msg += `🎉🎉🎉 SENA! PARABÉNS! 🎉🎉🎉\n`;
        else if (premios.quina > 0) msg += `⭐ Quina! Quase lá!\n`;
        else if (premios.quadra > 0) msg += `⚠️ Quadra! Estamos no caminho certo!\n`;
        else msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
    } else if (loteriaAtual === 'lotofacil') {
        msg += `   ✨ 15 Pontos: ${premios.pontos15}\n   ✨ 14 Pontos: ${premios.pontos14}\n   ✨ 13 Pontos: ${premios.pontos13}\n   ✅ 12 Pontos: ${premios.pontos12}\n   ✅ 11 Pontos: ${premios.pontos11}\n\n`;
        if (premios.pontos15 > 0) msg += `🎉🎉🎉 15 PONTOS! PARABÉNS! 🎉🎉🎉\n`;
        else if (premios.pontos14 > 0) msg += `⭐ 14 pontos! Muito perto!\n`;
        else if (premios.pontos13 > 0) msg += `⚠️ 13 pontos! Quase lá!\n`;
        else msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
    } else {
        msg += `   ✨ Quina: ${premios.quina}\n   ✨ Quadra: ${premios.quadra}\n   ✅ Terno: ${premios.terno}\n   ✅ Duque: ${premios.duque}\n\n`;
        if (premios.quina > 0) msg += `🎉🎉🎉 QUINA! PARABÉNS! 🎉🎉🎉\n`;
        else if (premios.quadra > 0) msg += `⚠️ Quadra! Quase lá!\n`;
        else msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
    }
    
    msg += `${linha}\n🔗 Acesse o resultado completo:\nhttps://rebrand.ly/boloesaleatorios`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile ? `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
    showToast('📱 Abrindo WhatsApp...', 'info');
}
async function carregarBolaoAtivo() {
    console.log('📋 Carregando bolões especiais...');
    const card = document.getElementById('cardBolaoAtivo');
    const container = document.getElementById('bolaoContainer');
    if (!card || !container) return;
    
    try {
        const configDoc = await db.collection('config_boloes').doc('ativos').get();
        if (!configDoc.exists) {
            card.style.display = 'none';
            return;
        }
        
        const dados = configDoc.data();
        let idsSelecionados = dados.ids || [];
        const statusMap = dados.status || {};
        const dataLimiteMap = dados.dataLimite || {};
        
        if (idsSelecionados.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        const promessas = idsSelecionados.map(id => db.collection('participantes').doc(id).get());
        const resultados = await Promise.all(promessas);
        const boloes = [];
        resultados.forEach(doc => {
            if (doc.exists) boloes.push({ id: doc.id, ...doc.data() });
        });
        
        if (boloes.length === 0) {
            card.style.display = 'none';
            return;
        }
        
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
                dataTexto = `<br>📅 Até ${formatarDataLocal(dataLimiteAdmin)}`;
            } else if (statusMap[bolao.id] !== 'aberto') {
                dataTexto = `<br>📅 Inscrições encerradas`;
            }
            
            html += `
                <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                    <div><strong>🎯 ${bolao.titulo} <span style="color:${statusColor};">${statusText}</span></strong></div>
                    <div style="font-size: 12px;">💰 R$ ${bolao.valorPorCota || 0},00${dataTexto}</div>
                    <div style="display: flex; gap: 15px; font-size: 12px; margin: 8px 0;">
                        <span>✅ Quitados: ${totalQuitados}</span>
                        <span>🔄 Em andamento: ${totalAndamento}</span>
                    </div>
                    <button class="btn-ver-participantes" data-id="${bolao.id}" style="background:#3b82f6; width:auto; padding:4px 12px;">👁 VER</button>
                    <div id="participantes-${bolao.id}" style="display:none; margin-top:10px;"></div>
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
                    let listaHtml = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">';
                    participantes.forEach(p => {
                        const statusText = p.situacao === 'quitado' || p.situacao === 'pago' ? '✅ QUITADO' : '🔄 EM ANDAMENTO';
                        listaHtml += `<div style="display:flex; justify-content:space-between; padding:4px; background:#f8fafc; border-radius:6px;">
                                        <span>${p.nome}</span>
                                        <span>${statusText}</span>
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
        
    } catch (error) {
        console.error('Erro ao carregar bolões:', error);
        card.style.display = 'none';
    }
}

function formatarDataLocal(dataISO) {
    if (!dataISO) return '';
    if (typeof dataISO === 'string' && dataISO.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    try {
        const data = new Date(dataISO);
        return data.toLocaleDateString('pt-BR');
    } catch(e) {
        return dataISO;
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
        const destaqueMap = dados.destaque || {};
        const estrategiaMap = dados.estrategia || {};
        
        let boloesAbertos = [];
        for (const id of idsSelecionados) {
            if (statusMap[id] === 'aberto') {
                const doc = await db.collection('participantes').doc(id).get();
                if (doc.exists) boloesAbertos.push({ id: id, data: doc.data() });
            }
        }
        
        if (boloesAbertos.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        let primeiroBolao = boloesAbertos.find(b => destaqueMap[b.id]) || boloesAbertos[0];
        const bolaoAberto = primeiroBolao.data;
        const bolaoId = primeiroBolao.id;
        const estrategia = estrategiaMap[bolaoId] || '';
        
        card.style.display = 'block';
        
        const vagasDisponiveis = bolaoAberto.vagasDisponiveis || 0;
        const vagasTotais = bolaoAberto.vagasTotais || 0;
        let vagasTexto = '';
        if (vagasTotais > 0 && vagasDisponiveis <= 5 && vagasDisponiveis > 0) vagasTexto = `🔴 ÚLTIMAS ${vagasDisponiveis} VAGAS!`;
        else if (vagasDisponiveis > 0) vagasTexto = `${vagasDisponiveis} vagas disponíveis${vagasTotais > 0 ? ` de ${vagasTotais}` : ''}`;
        else if (vagasDisponiveis === 0 && vagasTotais > 0) vagasTexto = `🔴 LOTADO - Inscrições encerradas`;
        
        const dataLimite = dataLimiteMap[bolaoId] || '';
        const dataTexto = dataLimite ? ` | 📅 Até ${formatarDataLocal(dataLimite)}` : '';
        
        const outrosBoloes = boloesAbertos.length - 1;
        let outrosTexto = '';
        if (outrosBoloes > 0) {
            outrosTexto = `<div style="margin-top:8px;"><a href="#" id="linkVerTodos" style="color:#3b82f6;">⭐ +${outrosBoloes} outro bolão aberto ➡️</a></div>`;
        }
        
        let html = `
            <div style="text-align:center;">
                <strong>🎯 ${bolaoAberto.titulo} 🟢 ABERTO</strong>
                <div>${bolaoAberto.loteria === 'mega' ? 'MEGA-SENA' : bolaoAberto.loteria === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA'} ${bolaoAberto.concurso ? `- Concurso ${bolaoAberto.concurso}` : ''}</div>
                <div>💰 R$ ${bolaoAberto.valorPorCota || 0},00 por cota${dataTexto}</div>
                ${vagasTexto ? `<div style="color:${vagasTexto.includes('LOTADO') ? '#ef4444' : '#059669'};">${vagasTexto}</div>` : ''}
        `;
        
        if (estrategia) {
            html += `
                <div style="margin-top:10px;"><button id="btnVerEstrategia" style="background:transparent; border:1px solid #cbd5e1; border-radius:30px; padding:6px 16px; color:#3b82f6;">💡 VER ESTRATÉGIA</button></div>
                <div id="modalEstrategia" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10001; justify-content:center; align-items:center;">
                    <div style="background:white; border-radius:20px; max-width:350px; width:90%; padding:25px; text-align:center;">
                        <div style="font-size:24px;">💡</div>
                        <div style="font-weight:bold;">ESTRATÉGIA DO BOLÃO</div>
                        <div style="font-size:14px; text-align:left; margin:15px 0;">${estrategia.replace(/\n/g, '<br>')}</div>
                        <button id="fecharModalEstrategia" style="background:#3b82f6; width:100%; padding:10px; border-radius:30px;">FECHAR</button>
                    </div>
                </div>
            `;
        }
        
        html += `<button id="btnParticiparAberto" style="background:#10b981; margin-top:12px; width:auto; padding:8px 25px;">📝 QUERO PARTICIPAR</button>${outrosTexto}</div>`;
        
        container.innerHTML = html;
        
        const btnEstrategia = document.getElementById('btnVerEstrategia');
        if (btnEstrategia) btnEstrategia.onclick = () => document.getElementById('modalEstrategia').style.display = 'flex';
        const fecharModal = document.getElementById('fecharModalEstrategia');
        if (fecharModal) fecharModal.onclick = () => document.getElementById('modalEstrategia').style.display = 'none';
        
        document.getElementById('btnParticiparAberto').onclick = () => mostrarModalParticipacao(bolaoAberto);
        
        const linkVerTodos = document.getElementById('linkVerTodos');
        if (linkVerTodos) linkVerTodos.onclick = () => document.getElementById('cardBolaoAtivo').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Erro:', error);
        card.style.display = 'none';
    }
}

function mostrarModalParticipacao(bolao) {
    let modal = document.getElementById('modalParticipacao');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'modalParticipacao';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center;';
    
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'background:white; border-radius:20px; max-width:400px; width:90%; padding:25px; text-align:center;';
    loadingDiv.innerHTML = '<div>🔄 Carregando PIX...</div>';
    modal.appendChild(loadingDiv);
    document.body.appendChild(modal);
    
    (async () => {
        try {
            const doc = await db.collection('config_geral').doc('pix').get();
            let pixChave = doc.exists && doc.data().chave ? doc.data().chave : 'Chave PIX não cadastrada';
            if (doc.exists && doc.data().chave) pixGeral = doc.data().chave;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = 'background:white; border-radius:20px; max-width:400px; width:90%; padding:25px; text-align:center;';
            modalContent.innerHTML = `
                <div style="font-size:28px;">📝</div>
                <div style="font-weight:bold; font-size:20px;">COMO PARTICIPAR</div>
                <div style="text-align:left; margin-top:15px;">
                    <p><strong>🎯 ${bolao.titulo || 'Bolão'}</strong></p>
                    <p>💰 Valor da cota: R$ ${bolao.valorPorCota || 0},00</p>
                    <p>💳 Pague via PIX:</p>
                    <div style="background:#f1f5f9; padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                        <code style="font-size:14px;">${pixChave}</code>
                        <button id="copiarPix" style="background:#3b82f6; border:none; padding:8px 15px; border-radius:8px; color:white;">📋 COPIAR</button>
                    </div>
                    <p>Após o pagamento, envie o comprovante para:</p>
                    <button id="falarAdmin" style="background:#25D366; width:100%; padding:10px; border-radius:10px; margin-top:5px;">📲 FALAR COM ADMIN</button>
                </div>
                <button id="fecharModalParticipacao" style="background:#64748b; width:100%; padding:10px; border-radius:30px; margin-top:15px;">Fechar</button>
            `;
            
            modal.innerHTML = '';
            modal.appendChild(modalContent);
            
            document.getElementById('fecharModalParticipacao').onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
            document.getElementById('copiarPix').onclick = () => { navigator.clipboard.writeText(pixChave); showToast('✅ PIX copiado!', 'success'); };
            document.getElementById('falarAdmin').onclick = () => window.open(`https://wa.me/5561998507770?text=${encodeURIComponent(`Olá! Gostaria de participar do bolão "${bolao.titulo}"`)}`, '_blank');
            
        } catch (error) {
            modal.innerHTML = `<div style="background:white; border-radius:20px; max-width:400px; width:90%; padding:25px;"><div>⚠️ Erro ao carregar PIX. Contate o admin.</div><button id="fecharErro" style="margin-top:10px;">Fechar</button></div>`;
            document.getElementById('fecharErro').onclick = () => modal.remove();
        }
    })();
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Inicializando sistema...');
    
    await carregarConfiguracoes();
    await carregarDados();
    
    document.getElementById('btnMegaSena')?.addEventListener('click', () => setLoteria('mega'));
    document.getElementById('btnLotofacil')?.addEventListener('click', () => setLoteria('lotofacil'));
    document.getElementById('btnQuina')?.addEventListener('click', () => setLoteria('quina'));
    document.getElementById('concursoSelect')?.addEventListener('change', () => {});
    document.getElementById('btnConferir')?.addEventListener('click', conferirResultados);
    document.getElementById('btnCompartilhar')?.addEventListener('click', compartilharSite);
    document.getElementById('btnWhatsappGrupo')?.addEventListener('click', entrarGrupoWhatsApp);
    document.getElementById('btnSugestao')?.addEventListener('click', enviarSugestao);
    
    adicionarBotaoInstalar();
    
    console.log('✅ Sistema carregado');
    showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
});