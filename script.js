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

function combinacao(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    let resultado = 1;
    for (let i = 1; i <= k; i++) {
        resultado *= (n - k + i) / i;
    }
    return Math.round(resultado);
}

function calcularChancesBolao(cartoesBolao, loteria) {
    const totalCartoes = cartoesBolao.length;
    
    let totalCombinacoesPossiveis = 0;
    let numerosPossiveis = 0;
    
    if (loteria === 'mega') {
        totalCombinacoesPossiveis = 50063860;
        numerosPossiveis = 60;
    } else if (loteria === 'lotofacil') {
        totalCombinacoesPossiveis = 3268760;
        numerosPossiveis = 25;
    } else {
        totalCombinacoesPossiveis = 24040016;
        numerosPossiveis = 80;
    }
    
    let totalCombinacoesCobertas = 0;
    let numerosUtilizados = new Set();
    
    for (const cartao of cartoesBolao) {
        const qtdNumeros = cartao.numeros.length;
        let combinacoesDoCartao = 0;
        
        if (loteria === 'mega') {
            combinacoesDoCartao = combinacao(qtdNumeros, 6);
        } else if (loteria === 'lotofacil') {
            combinacoesDoCartao = combinacao(qtdNumeros, 15);
        } else {
            combinacoesDoCartao = combinacao(qtdNumeros, 5);
        }
        
        totalCombinacoesCobertas += combinacoesDoCartao;
        cartao.numeros.forEach(n => numerosUtilizados.add(n));
    }
    
    const numerosCobertos = numerosUtilizados.size;
    const percentualCobertura = Math.round((numerosCobertos / numerosPossiveis) * 100);
    const vezesMelhor = Math.round(totalCombinacoesCobertas);
    
    let estrelas = 0;
    let estrelasHtml = '';
    let classificacao = '';
    
    if (totalCombinacoesCobertas >= 10000) {
        estrelas = 5;
        classificacao = 'EXCELENTE';
    } else if (totalCombinacoesCobertas >= 5000) {
        estrelas = 4;
        classificacao = 'ÓTIMO';
    } else if (totalCombinacoesCobertas >= 1000) {
        estrelas = 3;
        classificacao = 'BOM';
    } else if (totalCombinacoesCobertas >= 100) {
        estrelas = 2;
        classificacao = 'REGULAR';
    } else {
        estrelas = 1;
        classificacao = 'SIMPLES';
    }
    
    for (let i = 1; i <= 5; i++) {
        if (i <= estrelas) {
            estrelasHtml += '★';
        } else {
            estrelasHtml += '☆';
        }
    }
    
    let corGradient = '';
    if (estrelas === 5) {
        corGradient = 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)';
    } else if (estrelas === 4) {
        corGradient = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
    } else if (estrelas === 3) {
        corGradient = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
    } else if (estrelas === 2) {
        corGradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else {
        corGradient = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    }
    
    return `
        <div style="background: ${corGradient}; border-radius: 16px; padding: 14px 16px; margin-bottom: 16px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 18px;">🎲</span>
                    <span style="font-size: 12px; font-weight: 600;">POTENCIAL DO BOLÃO</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="font-size: 13px; font-weight: bold; color: #fbbf24;">${estrelasHtml}</span>
                    <span style="font-size: 9px; opacity: 0.9;">(${classificacao})</span>
                </div>
            </div>
            
            <div style="text-align: center; margin-bottom: 12px;">
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 4px;">
                    🚀 ${vezesMelhor.toLocaleString()} BILHETES!
                </div>
                <div style="font-size: 11px; opacity: 0.9;">
                    Isso equivale a jogar ${vezesMelhor.toLocaleString()} bilhetes simples!
                </div>
            </div>
            
            <div style="display: flex; justify-content: center; gap: 16px; text-align: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15);">
                <div>
                    <div style="font-size: 16px; font-weight: bold;">${numerosCobertos}/${numerosPossiveis}</div>
                    <div style="font-size: 8px; opacity: 0.8;">NÚMEROS</div>
                </div>
                <div>
                    <div style="font-size: 16px; font-weight: bold;">${percentualCobertura}%</div>
                    <div style="font-size: 8px; opacity: 0.8;">DO UNIVERSO</div>
                </div>
                <div>
                    <div style="font-size: 16px; font-weight: bold;">${totalCartoes}</div>
                    <div style="font-size: 8px; opacity: 0.8;">CARTÕES</div>
                </div>
            </div>
        </div>
    `;
}

function mostrarCartoes(numerosSorteados = null) {
    const concurso = document.getElementById('concursoSelect').value;
    const container = document.getElementById('cartoesArea');
    
    if (!container) return;
    
    if (!concurso) {
        container.innerHTML = '<div class="empty-state">📋 Selecione um concurso para ver os cartões</div>';
        return;
    }
    
    const filtrados = cartoes.filter(c => c.tipo === loteriaAtual && c.concurso == concurso);
    
    if (filtrados.length === 0) {
        container.innerHTML = `<div class="empty-state">📋 Nenhum cartão da ${loteriaAtual.toUpperCase()} para o concurso ${concurso}</div>`;
        return;
    }
    
    const chancesHtml = calcularChancesBolao(filtrados, loteriaAtual);
    
    const porBolao = {};
    filtrados.forEach(c => {
        const b = c.bolao || 'Sem Bolão';
        if (!porBolao[b]) porBolao[b] = [];
        porBolao[b].push(c);
    });
    
    let html = chancesHtml;
    
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="margin-bottom:20px"><div style="background:#3b82f6;color:white;padding:8px 12px;border-radius:8px;margin-bottom:10px;">🎯 ${bolao}</div>`;
        html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
        
        for (const cartao of lista) {
            const tipoParticipacao = cartao.tipoParticipacao === 'cota' ? '🎟️ Cota' : '👥 Exclusivo';
            const acertosCount = numerosSorteados ? cartao.numeros.filter(n => numerosSorteados.includes(n)).length : 0;
            
            const numsHtml = cartao.numeros.map(n => {
                const acertou = numerosSorteados ? numerosSorteados.includes(n) : false;
                return `<span style="background:${acertou ? '#10b981' : '#e2e8f0'};color:${acertou ? 'white' : '#333'};padding:6px 10px;border-radius:8px;font-family:monospace;font-size:12px;font-weight:${acertou ? 'bold' : 'normal'};min-width:35px;text-align:center;">${n.toString().padStart(2,'0')}</span>`;
            }).join('');
            
            html += `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <span style="font-weight:bold;font-size:12px;">${tipoParticipacao}</span>
                            ${numerosSorteados ? `<span style="background:#cbd5e1;padding:4px 10px;border-radius:20px;font-size:11px;">${acertosCount} acertos</span>` : ''}
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">${numsHtml}</div>
                    </div>`;
        }
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

async function setLoteria(loteria) {
    if (loteriaAtual === loteria) return;
    
    console.log(`🔄 Trocando loteria de ${loteriaAtual} para ${loteria}`);
    loteriaAtual = loteria;
    
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    const btnQuina = document.getElementById('btnQuina');
    
    btnMega.classList.remove('active');
    btnLoto.classList.remove('active');
    btnQuina.classList.remove('active');
    
    if (loteria === 'mega') {
        btnMega.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🎯 CONFERIR RESULTADOS - MEGA';
    } else if (loteria === 'lotofacil') {
        btnLoto.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🎯 CONFERIR RESULTADOS - LOTOFÁCIL';
    } else {
        btnQuina.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🎯 CONFERIR RESULTADOS - QUINA';
    }
    
    const resultadosArea = document.getElementById('resultadosArea');
    if (resultadosArea) resultadosArea.innerHTML = '<div class="empty-state">🔍 Clique em "Conferir Resultados" para ver os acertos</div>';
    
    const statusDiv = document.getElementById('statusBusca');
    if (statusDiv) statusDiv.innerHTML = '';
    
    atualizarSelectConcursos();
    mostrarCartoes();
    
    showToast(`🔄 Mudou para ${loteria === 'mega' ? 'MEGA' : loteria === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA'}`, 'info');
}

async function carregarDados() {
    console.log('🔄 Carregando dados (modo rápido)...');
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
        atualizarPercentual(10, 'Buscando concursos...');
        
        const snap = await db.collection('cartoes').get();
        
        const concursosPorLoteria = {
            mega: new Set(),
            lotofacil: new Set(),
            quina: new Set()
        };
        
        snap.forEach(doc => {
            const d = doc.data();
            if (d && d.concurso && d.tipo) {
                concursosPorLoteria[d.tipo].add(d.concurso);
            }
        });
        
        const concursosDisponiveis = {
            mega: Array.from(concursosPorLoteria.mega).sort((a,b) => b - a),
            lotofacil: Array.from(concursosPorLoteria.lotofacil).sort((a,b) => b - a),
            quina: Array.from(concursosPorLoteria.quina).sort((a,b) => b - a)
        };
        
        console.log('📋 Concursos disponíveis:', concursosDisponiveis);
        
        atualizarPercentual(30, 'Carregando cartões...');
        cartoes = [];
        
        for (const loteria of ['mega', 'lotofacil', 'quina']) {
            const ultimoConcurso = concursosDisponiveis[loteria][0];
            if (ultimoConcurso) {
                const cartoesLoteria = await db.collection('cartoes')
                    .where('tipo', '==', loteria)
                    .where('concurso', '==', ultimoConcurso)
                    .get();
                
                cartoesLoteria.forEach(doc => {
                    const d = doc.data();
                    if (d && d.numeros) {
                        cartoes.push({
                            id: doc.id,
                            concurso: d.concurso || '0',
                            bolao: d.bolao || 'Sem Bolão',
                            numeros: d.numeros,
                            tipo: d.tipo || loteria,
                            tipoParticipacao: d.tipoParticipacao || 'exclusivo'
                        });
                    }
                });
                console.log(`📋 ${loteria}: ${cartoesLoteria.size} cartões do concurso ${ultimoConcurso}`);
            }
        }
        
        atualizarPercentual(50, 'Carregando resultados...');
        try {
            const resMega = await db.collection('resultados_mega').get();
            resultadosMega = {};
            resMega.forEach(doc => { resultadosMega[doc.id] = doc.data().numeros; });
        } catch (e) { resultadosMega = {}; }
        
        try {
            const resLoto = await db.collection('resultados_lotofacil').get();
            resultadosLotofacil = {};
            resLoto.forEach(doc => { resultadosLotofacil[doc.id] = doc.data().numeros; });
        } catch (e) { resultadosLotofacil = {}; }
        
        try {
            const resQuina = await db.collection('resultados_quina').get();
            resultadosQuina = {};
            resQuina.forEach(doc => { resultadosQuina[doc.id] = doc.data().numeros; });
        } catch (e) { resultadosQuina = {}; }
        
        atualizarPercentual(85, 'Carregando bolões...');
        try {
            await carregarBolaoAtivo();
            await carregarBolaoAberto();
        } catch (e) { console.warn('Erro ao carregar bolões:', e); }
        
        atualizarPercentual(100, 'Concluído!');
        
        setTimeout(() => {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }, 500);
        
        window.concursosDisponiveis = concursosDisponiveis;
        atualizarSelectConcursos();
        dadosCarregados = true;
        
        setTimeout(() => {
            mostrarCartoes();
        }, 100);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('❌ Erro ao carregar dados. Recarregue a página.', 'error');
        if (loadingDiv) loadingDiv.style.display = 'none';
        dadosCarregados = true;
    }
}

function atualizarSelectConcursos() {
    const concursosDisponiveis = window.concursosDisponiveis || {};
    const concursos = concursosDisponiveis[loteriaAtual] || [];
    
    console.log(`📋 ${loteriaAtual}: ${concursos.length} concursos disponíveis`);
    
    const select = document.getElementById('concursoSelect');
    if (!select) return;
    
    let html = '<option value="">Selecione um concurso</option>';
    
    if (concursos.length === 0) {
        html = '<option value="">Nenhum concurso disponível</option>';
    } else {
        concursos.forEach(con => {
            html += `<option value="${con}">Concurso ${con}</option>`;
        });
    }
    
    select.innerHTML = html;
    
    if (concursos.length > 0) {
        select.value = concursos[0];
        console.log(`📌 Concurso selecionado: ${concursos[0]}`);
    }
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
    const area = document.getElementById('resultadosArea');
    
    if (!concurso) {
        showToast('⚠️ Selecione um concurso', 'warning');
        return;
    }
    
    area.innerHTML = '<div class="loading">🔍 Processando...</div>';
    
    const snapshot = await db.collection('cartoes')
        .where('tipo', '==', loteriaAtual)
        .where('concurso', '==', concurso)
        .get();
    
    const cartoesConcurso = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        if (d && d.numeros) {
            cartoesConcurso.push({
                id: doc.id,
                concurso: d.concurso,
                bolao: d.bolao || 'Sem Bolão',
                numeros: d.numeros,
                tipo: d.tipo,
                tipoParticipacao: d.tipoParticipacao || 'exclusivo'
            });
        }
    });
    
    if (cartoesConcurso.length === 0) {
        area.innerHTML = `<div class="empty-state">⚠️ Nenhum cartão da ${loteriaAtual.toUpperCase()} para o concurso ${concurso}</div>`;
        showToast(`⚠️ Nenhum cartão da ${loteriaAtual.toUpperCase()}`, 'warning');
        return;
    }
    
    const novosCartoes = cartoes.filter(c => !(c.tipo === loteriaAtual && c.concurso == concurso));
    novosCartoes.push(...cartoesConcurso);
    cartoes.length = 0;
    cartoes.push(...novosCartoes);
    
    let resultados;
    if (loteriaAtual === 'mega') resultados = resultadosMega;
    else if (loteriaAtual === 'lotofacil') resultados = resultadosLotofacil;
    else resultados = resultadosQuina;
    
    let numerosSorteados = null;
    let dataSorteio = null;
    
    if (resultados[concurso]) {
        numerosSorteados = resultados[concurso];
        console.log(`📋 Resultado encontrado para ${loteriaAtual} concurso ${concurso}`);
    } else {
        const busca = await buscarResultadoInterno(concurso, loteriaAtual);
        if (busca && busca.numeros) {
            numerosSorteados = busca.numeros;
            
            if (busca.dataSorteio) {
                if (busca.dataSorteio instanceof Date && !isNaN(busca.dataSorteio)) {
                    dataSorteio = busca.dataSorteio;
                } else if (typeof busca.dataSorteio === 'string' && busca.dataSorteio.includes('/')) {
                    dataSorteio = busca.dataSorteio;
                } else if (typeof busca.dataSorteio === 'string') {
                    const dataTest = new Date(busca.dataSorteio);
                    if (!isNaN(dataTest)) {
                        dataSorteio = dataTest;
                    } else {
                        dataSorteio = busca.dataSorteio;
                    }
                } else {
                    dataSorteio = busca.dataSorteio;
                }
            }
            
            if (loteriaAtual === 'mega') resultadosMega[concurso] = numerosSorteados;
            else if (loteriaAtual === 'lotofacil') resultadosLotofacil[concurso] = numerosSorteados;
            else resultadosQuina[concurso] = numerosSorteados;
            console.log(`📋 Resultado buscado da API para ${loteriaAtual} concurso ${concurso}`);
        } else {
            area.innerHTML = `<div class="empty-state">❌ Resultado não encontrado para ${loteriaAtual.toUpperCase()} concurso ${concurso}.</div>`;
            showToast('❌ Resultado não encontrado', 'error');
            return;
        }
    }
    
    mostrarCartoes(numerosSorteados);
    
    const cartoesComAcertos = cartoesConcurso.map(cartao => {
        const acertos = cartao.numeros.filter(n => numerosSorteados.includes(n)).length;
        return { ...cartao, acertos };
    }).sort((a, b) => b.acertos - a.acertos);
    
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
    
    let html = '';
    
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
    
    html += `<div class="numeros-sorteados">${numerosSorteados.map(n => `<div class="numero-sorteado-card">${n.toString().padStart(2,'0')}</div>`).join('')}</div>`;
    if (dataSorteio) {
        let dataFormatada = '';
        try {
            if (typeof dataSorteio === 'string' && dataSorteio.includes('/')) {
                const partes = dataSorteio.split('/');
                if (partes.length === 3) {
                    dataFormatada = `${partes[0]}/${partes[1]}/${partes[2]}`;
                }
            } else {
                const data = new Date(dataSorteio);
                if (!isNaN(data.getTime())) {
                    dataFormatada = data.toLocaleDateString('pt-BR');
                } else {
                    dataFormatada = dataSorteio;
                }
            }
        } catch(e) {
            dataFormatada = dataSorteio;
        }
        html += `<div style="text-align:center; margin-bottom:15px; font-size:12px;">📅 Sorteio: ${dataFormatada}</div>`;
    }
    
    html += `<button id="btnWhatsAppResultado" style="background:#25D366; width:100%; padding:12px; border-radius:30px; margin-bottom:20px; font-weight:bold;">📱 COMPARTILHAR RESULTADO NO WHATSAPP</button>`;
    
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
    const linha = '──────────';
    let loteriaNome = loteriaAtual === 'mega' ? 'MEGA-SENA' : (loteriaAtual === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA');
    
    let msg = `*🏆 RESULTADO - ${loteriaNome}* 🎲\n🏆 Rumo ao Grande Prêmio!\n${linha}\n📌 Concurso: ${ultimoResultadoConcurso}\n🎯 Números Sorteados:\n   ${numeros.join(' - ')}\n`;
    
    if (dataSorteio) {
        let dataFormatada = '';
        try {
            if (typeof dataSorteio === 'string' && dataSorteio.includes('/')) {
                const partes = dataSorteio.split('/');
                if (partes.length === 3) {
                    dataFormatada = `${partes[0]}/${partes[1]}/${partes[2]}`;
                }
            } else if (dataSorteio instanceof Date && !isNaN(dataSorteio)) {
                dataFormatada = dataSorteio.toLocaleDateString('pt-BR');
            } else if (typeof dataSorteio === 'string' && dataSorteio.includes('-')) {
                const dataObj = new Date(dataSorteio);
                if (!isNaN(dataObj)) {
                    dataFormatada = dataObj.toLocaleDateString('pt-BR');
                } else {
                    dataFormatada = dataSorteio;
                }
            } else {
                dataFormatada = dataSorteio;
            }
        } catch(e) {
            dataFormatada = dataSorteio;
        }
        
        if (dataFormatada && dataFormatada !== 'Invalid Date') {
            msg += `📅 Sorteio: ${dataFormatada}\n`;
        }
    }
    
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
        
        // FILTRO CORRETO: apenas ABERTO e EM ANDAMENTO (ENCERRADO fica de fora)
        const boloesAtivos = [];
        for (const id of idsSelecionados) {
            if (statusMap[id] === 'aberto' || statusMap[id] === 'andamento') {
                const doc = await db.collection('participantes').doc(id).get();
                if (doc.exists) {
                    boloesAtivos.push({ id: id, data: doc.data() });
                }
            }
        }
        
        if (boloesAtivos.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        card.style.display = 'block';
        let html = '';
        
        for (const bolao of boloesAtivos) {
            const participantes = bolao.data.participantes || [];
            const totalQuitados = participantes.filter(p => p.situacao === 'quitado' || p.situacao === 'pago').length;
            const totalEmAndamento = participantes.filter(p => p.situacao !== 'quitado' && p.situacao !== 'pago').length;
            const statusText = statusMap[bolao.id] === 'aberto' ? 'ABERTO' : 'EM ANDAMENTO';
            const statusClass = statusMap[bolao.id] === 'aberto' ? 'aberto' : 'andamento';
            
            const dataLimiteAdmin = dataLimiteMap[bolao.id] || '';
            let dataTexto = '';
            if (statusMap[bolao.id] === 'aberto' && dataLimiteAdmin) {
                let dataFormatada = dataLimiteAdmin;
                if (dataLimiteAdmin.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const [ano, mes, dia] = dataLimiteAdmin.split('-');
                    dataFormatada = `${dia}/${mes}/${ano}`;
                }
                dataTexto = `<div class="bolao-data">📅 Inscrições até ${dataFormatada}</div>`;
            }
            
            html += `
                <div class="bolao-card">
                    <div class="bolao-header">
                        <div class="bolao-nome">
                            <span>🎯</span> ${bolao.data.titulo}
                        </div>
                        <div class="bolao-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="bolao-body">
                        <div class="bolao-info">
                            <div class="bolao-valor">💰 R$ ${bolao.data.valorPorCota || 0},00 <span style="font-size:12px;">/ cota</span></div>
                            ${dataTexto}
                        </div>
                        <div class="bolao-stats">
                            <div class="stat-item">
                                <div class="stat-number quitado">${totalQuitados}</div>
                                <div class="stat-label">✅ QUITADOS</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number andamento">${totalEmAndamento}</div>
                                <div class="stat-label">⏳ EM ANDAMENTO</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${participantes.length}</div>
                                <div class="stat-label">👥 TOTAL</div>
                            </div>
                        </div>
                        <button class="btn-ver-participantes" data-id="${bolao.id}">
                            👁 VER LISTA DE PARTICIPANTES
                        </button>
                        <div id="participantes-${bolao.id}" style="display: none; margin-top: 16px;"></div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-ver-participantes').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const div = document.getElementById(`participantes-${id}`);
                
                if (div.style.display === 'none') {
                    const bolaoData = boloesAtivos.find(b => b.id === id);
                    const participantes = bolaoData.data.participantes || [];
                    
                    const participantesFormatados = participantes.map(p => {
                        let statusClass = 'pendente';
                        let statusText = 'EM ANDAMENTO';
                        let quantidadeCotas = p.quantidadeCotas || 1;
                        
                        if (p.situacao === 'quitado' || p.situacao === 'pago') {
                            statusClass = 'pago';
                            statusText = 'PAGO';
                        }
                        
                        return {
                            nome: p.nome,
                            statusClass: statusClass,
                            statusText: statusText,
                            quantidadeCotas: quantidadeCotas
                        };
                    });
                    
                    participantesFormatados.sort((a, b) => {
                        if (a.statusClass === 'pago' && b.statusClass !== 'pago') return -1;
                        if (a.statusClass !== 'pago' && b.statusClass === 'pago') return 1;
                        return 0;
                    });
                    
                    let listaHtml = '<div class="participantes-grid">';
                    participantesFormatados.forEach(p => {
                        listaHtml += `
                            <div class="participante-card">
                                <div style="display: flex; flex-direction: column; gap: 2px;">
                                    <span class="participante-nome">${p.nome}</span>
                                    <span style="font-size: 9px; color: #64748b;">🎟️ ${p.quantidadeCotas} cota${p.quantidadeCotas > 1 ? 's' : ''}</span>
                                </div>
                                <span class="participante-status ${p.statusClass}">${p.statusText}</span>
                            </div>
                        `;
                    });
                    listaHtml += '</div>';
                    
                    div.innerHTML = listaHtml;
                    div.style.display = 'block';
                    btn.textContent = '🙈 OCULTAR LISTA';
                } else {
                    div.style.display = 'none';
                    btn.textContent = '👁 VER LISTA DE PARTICIPANTES';
                }
            };
        });
        
    } catch (error) {
        console.error('Erro ao carregar bolões:', error);
        card.style.display = 'none';
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
            if (statusMap[id] === 'aberto' || statusMap[id] === 'andamento') {
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
        if (vagasTotais > 0 && vagasDisponiveis <= 5 && vagasDisponiveis > 0) {
            vagasTexto = `🔴 ÚLTIMAS ${vagasDisponiveis} VAGAS!`;
        } else if (vagasDisponiveis > 0) {
            vagasTexto = `${vagasDisponiveis} vagas disponíveis${vagasTotais > 0 ? ` de ${vagasTotais}` : ''}`;
        } else if (vagasDisponiveis === 0 && vagasTotais > 0) {
            vagasTexto = `🔴 LOTADO - Inscrições encerradas`;
        }
        
        const dataLimite = dataLimiteMap[bolaoId] || '';
        let dataTexto = '';
        if (dataLimite && dataLimite.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [ano, mes, dia] = dataLimite.split('-');
            dataTexto = ` | 📅 Até ${dia}/${mes}/${ano}`;
        }
        
        let html = `<div style="text-align:center;">
            <strong>🎯 ${bolaoAberto.titulo} 🟢 ABERTO</strong>
            <div>${bolaoAberto.loteria === 'mega' ? 'MEGA-SENA' : bolaoAberto.loteria === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA'} ${bolaoAberto.concurso ? `- Concurso ${bolaoAberto.concurso}` : ''}</div>
            <div>💰 R$ ${bolaoAberto.valorPorCota || 0},00 por cota${dataTexto}</div>
            ${vagasTexto ? `<div style="color:${vagasTexto.includes('LOTADO') ? '#ef4444' : '#059669'};">${vagasTexto}</div>` : ''}`;
        
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
                </div>`;
        }
        
        html += `<button id="btnParticiparAberto" style="background:#10b981; margin-top:12px; width:auto; padding:8px 25px;">📝 QUERO PARTICIPAR</button></div>`;
        
        container.innerHTML = html;
        
        document.getElementById('btnVerEstrategia')?.addEventListener('click', () => {
            document.getElementById('modalEstrategia').style.display = 'flex';
        });
        document.getElementById('fecharModalEstrategia')?.addEventListener('click', () => {
            document.getElementById('modalEstrategia').style.display = 'none';
        });
        document.getElementById('btnParticiparAberto').onclick = () => mostrarModalParticipacao(bolaoAberto);
        
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

function mostrarResultadoExistente(concurso, numeros) {
    const statusDiv = document.getElementById('statusBusca');
    if (!statusDiv) return;
    
    if (loteriaAtual === 'mega' && resultadosMega[concurso]) {
        statusDiv.innerHTML = `
            <div class="status-success">
                ✅ RESULTADO DO CONCURSO ${concurso} (MEGA-SENA) JÁ DISPONÍVEL! 🎲<br>
                🎯 Números: ${numeros.join(' - ')}
            </div>
        `;
    } else if (loteriaAtual === 'lotofacil' && resultadosLotofacil[concurso]) {
        statusDiv.innerHTML = `
            <div class="status-success">
                ✅ RESULTADO DO CONCURSO ${concurso} (LOTOFÁCIL) JÁ DISPONÍVEL! 🎲<br>
                🎯 Números: ${numeros.join(' - ')}
            </div>
        `;
    } else if (loteriaAtual === 'quina' && resultadosQuina[concurso]) {
        statusDiv.innerHTML = `
            <div class="status-success">
                ✅ RESULTADO DO CONCURSO ${concurso} (QUINA) JÁ DISPONÍVEL! 🎲<br>
                🎯 Números: ${numeros.join(' - ')}
            </div>
        `;
    } else {
        statusDiv.innerHTML = '';
    }
}

async function buscarResultadoAutomatico() {
    const concurso = document.getElementById('concursoSelect').value;
    const statusDiv = document.getElementById('statusBusca');
    
    if (!concurso || concurso === '1' || concurso === '0' || concurso === '') {
        return;
    }
    
    let resultados;
    let nomeLoteria;
    if (loteriaAtual === 'mega') {
        resultados = resultadosMega;
        nomeLoteria = 'MEGA-SENA';
    } else if (loteriaAtual === 'lotofacil') {
        resultados = resultadosLotofacil;
        nomeLoteria = 'LOTOFÁCIL';
    } else {
        resultados = resultadosQuina;
        nomeLoteria = 'QUINA';
    }
    
    if (resultados[concurso]) {
        console.log(`📋 Resultado do ${nomeLoteria} concurso ${concurso} já está salvo`);
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status-success">✅ RESULTADO DO CONCURSO ${concurso} (${nomeLoteria}) JÁ DISPONÍVEL! Clique em CONFERIR.</div>`;
        }
        return;
    }
    
    const cacheKey = `${loteriaAtual}_${concurso}`;
    if (cacheResultadosBuscados[cacheKey]) {
        console.log(`⏳ Resultado do ${nomeLoteria} concurso ${concurso} já foi buscado`);
        return;
    }
    
    cacheResultadosBuscados[cacheKey] = true;
    
    if (statusDiv) {
        statusDiv.innerHTML = `<div class="status-info">🔍 Buscando resultado do ${nomeLoteria} concurso ${concurso}...</div>`;
    }
    
    const busca = await buscarResultadoInterno(concurso, loteriaAtual);
    
    if (busca && busca.numeros && busca.numeros.length > 0) {
        if (loteriaAtual === 'mega') resultadosMega[concurso] = busca.numeros;
        else if (loteriaAtual === 'lotofacil') resultadosLotofacil[concurso] = busca.numeros;
        else resultadosQuina[concurso] = busca.numeros;
        
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status-success">✅ RESULTADO DO CONCURSO ${concurso} (${nomeLoteria}) ENCONTRADO! Clique em CONFERIR RESULTADOS.</div>`;
        }
        showToast(`🎉 Resultado do concurso ${concurso} (${nomeLoteria}) encontrado!`, 'success');
    } else {
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status-info">📢 RESULTADO DO CONCURSO ${concurso} (${nomeLoteria}) AINDA NÃO DISPONÍVEL</div>`;
        }
    }
}

function forcarAtualizacaoCache() {
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
                console.log('Cache deletado:', name);
            });
        });
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(reg => reg.unregister());
            console.log('Service Worker removido');
        });
    }
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Cache forçado limpo');
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Inicializando sistema...');
    
    forcarAtualizacaoCache();
    
    await carregarConfiguracoes();
    await carregarDados();
    
    document.getElementById('btnMegaSena').addEventListener('click', () => setLoteria('mega'));
    document.getElementById('btnLotofacil').addEventListener('click', () => setLoteria('lotofacil'));
    document.getElementById('btnQuina').addEventListener('click', () => setLoteria('quina'));
    document.getElementById('concursoSelect').addEventListener('change', () => {
        mostrarCartoes();
    });
    document.getElementById('btnConferir').addEventListener('click', conferirResultados);
    document.getElementById('btnCompartilhar').addEventListener('click', compartilharSite);
    document.getElementById('btnWhatsappGrupo').addEventListener('click', entrarGrupoWhatsApp);
    document.getElementById('btnSugestao').addEventListener('click', enviarSugestao);
    document.getElementById('btnInstalarApp').addEventListener('click', mostrarPopupInstalar);
    
    console.log('✅ Sistema carregado');
    showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
    
    setTimeout(() => {
        carregarBolaoAtivo();
        carregarBolaoAberto();
    }, 1000);
});