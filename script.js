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
let timerInterval;

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
        mensagem = '📲 No iPhone/iPad:\n\n1. Toque no botão "Compartilhar" 📤 (ícone de quadrado com seta)\n2. Role a tela para baixo\n3. Toque em "Adicionar à Tela de Início"\n4. Confirme o nome e toque em "Adicionar"\n\nO app aparecerá na tela inicial como um aplicativo normal!';
    } else if (isAndroid) {
        mensagem = '📲 No Android (Chrome):\n\n1. Toque nos 3 pontinhos ⋮ no canto superior direito\n2. Toque em "Instalar aplicativo"\n3. Confirme a instalação\n\nO app aparecerá na tela inicial!';
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
        <div style="font-size: 48px; margin-bottom: 10px;">📱</div>
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">${titulo}</div>
        <div style="white-space: pre-line; text-align: left; font-size: 14px; line-height: 1.6; margin: 15px 0;">${mensagem}</div>
        <button id="fecharModalInstalar" style="background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 30px; font-size: 14px; cursor: pointer; width: 100%; font-weight: bold;">Fechar</button>
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

// ============ TIMER DO PRÓXIMO SORTEIO ============
function getProximoSorteio(loteria) {
    const agora = new Date();
    const dia = agora.getDay();
    const hora = agora.getHours();
    
    if (loteria === 'mega') {
        if (dia === 3 && hora < 20) return { dias: 0, nomeDia: 'hoje' };
        if (dia === 6 && hora < 20) return { dias: 0, nomeDia: 'hoje' };
        if (dia < 3) return { dias: 3 - dia, nomeDia: (3 - dia === 1 ? 'amanhã' : `em ${3 - dia} dias`) };
        if (dia < 6) return { dias: 6 - dia, nomeDia: (6 - dia === 1 ? 'amanhã' : `em ${6 - dia} dias`) };
        return { dias: (3 + 7) - dia, nomeDia: `em ${(3 + 7) - dia} dias` };
    } else {
        if (dia >= 1 && dia <= 6 && hora < 20) return { dias: 0, nomeDia: 'hoje' };
        if (dia === 0) return { dias: 1, nomeDia: 'amanhã' };
        if (dia === 6 && hora >= 20) return { dias: 1, nomeDia: 'amanhã' };
        return { dias: 1, nomeDia: 'amanhã' };
    }
}

function atualizarTimer() {
    const { dias, nomeDia } = getProximoSorteio(loteriaAtual);
    const agora = new Date();
    const hora = agora.getHours();
    const minutos = agora.getMinutes();
    const segundos = agora.getSeconds();
    
    let horasRestantes = 0;
    if (dias === 0) {
        horasRestantes = hora < 20 ? 19 - hora : 24 - hora + 19;
    } else {
        horasRestantes = (dias * 24) + (19 - hora);
    }
    const minutosRestantes = 59 - minutos;
    const segundosRestantes = 59 - segundos;
    
    let timerText = '';
    if (horasRestantes > 0) timerText += `${horasRestantes}h `;
    if (minutosRestantes > 0 || horasRestantes > 0) timerText += `${minutosRestantes}m `;
    timerText += `${segundosRestantes}s`;
    
    let loteriaNome = loteriaAtual === 'mega' ? 'MEGA-SENA' : (loteriaAtual === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA');
    document.getElementById('timerDisplay').innerHTML = `⏰ ${timerText}`;
    document.getElementById('proximoDia').innerHTML = `${loteriaNome} - Próximo sorteio ${nomeDia} às 20h`;
}

function iniciarTimer() {
    if (timerInterval) clearInterval(timerInterval);
    atualizarTimer();
    timerInterval = setInterval(atualizarTimer, 1000);
}

// ============ CARREGAR BOLÃO ATIVO (ENVIADO PELO DESKTOP) ============
async function carregarBolaoAtivo() {
    const card = document.getElementById('cardBolaoAtivo');
    const container = document.getElementById('bolaoContainer');
    
    if (!card || !container) return;
    
    try {
        const configDoc = await db.collection('config_boloes').doc('ativos').get();
        const idsSelecionados = configDoc.exists ? configDoc.data().ids || [] : [];
        
        if (idsSelecionados.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        const boloes = [];
        for (const id of idsSelecionados) {
            try {
                const doc = await db.collection('participantes').doc(id).get();
                if (doc.exists) {
                    boloes.push({ id: doc.id, ...doc.data() });
                }
            } catch (e) {}
        }
        
        if (boloes.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        card.style.display = 'block';
        
        let html = '';
        for (const dados of boloes) {
            const participantes = dados.participantes || [];
            const totalQuitados = participantes.filter(p => p.situacao === 'quitado').length;
            const totalAndamento = participantes.filter(p => p.situacao === 'pendente').length;
            
            // Determinar status e cor
            const statusBolao = dados.status || 'andamento';
            const statusText = statusBolao === 'aberto' ? '🟢 INSCRIÇÕES ABERTAS' : '⚫ INSCRIÇÕES ENCERRADAS';
            const statusCor = statusBolao === 'aberto' ? '#10b981' : '#64748b';
            
            html += `
                <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <strong style="font-size: 16px;">🎯 ${dados.titulo || 'Bolão Especial'}</strong>
                        <span style="background: ${statusCor}; color: white; padding: 2px 10px; border-radius: 20px; font-size: 10px;">${statusText}</span>
                    </div>
                    <div style="font-size: 12px; margin-top: 5px;">
                        💰 Valor da cota: R$ ${dados.valorPorCota || 0},00
                        ${dados.dataLimite ? `<br>📅 Data limite: ${new Date(dados.dataLimite).toLocaleDateString('pt-BR')}` : ''}
                    </div>
                    <div style="font-size: 12px; margin-top: 8px;">
                        <span style="color: #10b981;">✅ Quitados: ${totalQuitados}</span>
                        <span style="color: #f59e0b;">🔄 Em andamento: ${totalAndamento}</span>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Erro ao carregar bolões:', error);
        card.style.display = 'none';
    }
}
// ============ SETAR LOTERIA ============
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
        document.getElementById('cardHeaderConferencia').innerHTML = '🔍 CONFERIR RESULTADOS - MEGA';
        document.getElementById('cardHeaderCartoes').innerHTML = '📋 CARTÕES DO CONCURSO - MEGA';
    } else if (loteria === 'lotofacil') {
        if (btnLoto) btnLoto.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🔍 CONFERIR RESULTADOS - LOTOFÁCIL';
        document.getElementById('cardHeaderCartoes').innerHTML = '📋 CARTÕES DO CONCURSO - LOTOFÁCIL';
    } else if (loteria === 'quina') {
        if (btnQuina) btnQuina.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🔍 CONFERIR RESULTADOS - QUINA';
        document.getElementById('cardHeaderCartoes').innerHTML = '📋 CARTÕES DO CONCURSO - QUINA';
    }
    
    atualizarSelectConcursos();
    const sel = document.getElementById('concursoSelect');
    if (sel && sel.value) mostrarCartoesDoConcurso();
    atualizarTimer();
    //showToast(`🔄 Mudou para ${loteria === 'mega' ? 'MEGA-SENA' : loteria === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA'}`, 'info');
}

// ============ CARREGAR DADOS ============
async function carregarDados() {
    //console.log('🔄 Carregando dados...');
    
    // Mostrar loading
    const loadingDiv = document.getElementById('loadingIndicator');
    if (loadingDiv) loadingDiv.style.display = 'block';
    
    try {
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
        //console.log(`📊 Total: ${cartoes.length} | Mega: ${cartoes.filter(c => c.tipo === 'mega').length} | Loto: ${cartoes.filter(c => c.tipo === 'lotofacil').length} | Quina: ${cartoes.filter(c => c.tipo === 'quina').length}`);
        
        const resMega = await db.collection('resultados').where('tipo', '==', 'mega').get();
        resultadosMega = {};
        resMega.forEach(doc => { resultadosMega[doc.id] = doc.data().numeros; });
        
        const resLoto = await db.collection('resultados').where('tipo', '==', 'lotofacil').get();
        resultadosLotofacil = {};
        resLoto.forEach(doc => { resultadosLotofacil[doc.id] = doc.data().numeros; });
        
        const resQuina = await db.collection('resultados').where('tipo', '==', 'quina').get();
        resultadosQuina = {};
        resQuina.forEach(doc => { resultadosQuina[doc.id] = doc.data().numeros; });
        
        if (Object.keys(ultimoEstadoMega).length === 0) {
            ultimoEstadoMega = JSON.parse(JSON.stringify(resultadosMega));
            ultimoEstadoLotofacil = JSON.parse(JSON.stringify(resultadosLotofacil));
            ultimoEstadoQuina = JSON.parse(JSON.stringify(resultadosQuina));
        }
        
        atualizarSelectConcursos();
        atualizarStats();
        selecionarUltimoConcurso();
        // showToast(`✅ ${cartoes.length} cartões carregados`, 'success'); // REMOVIDO
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao carregar dados', 'error');
        const cont = document.getElementById('cartoesConcurso');
        if (cont) cont.innerHTML = '<div class="empty-state">❌ Erro ao conectar.</div>';
    } finally {
        // Esconder loading
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

function atualizarStats() {
    const filtrados = cartoes.filter(c => c.tipo === loteriaAtual);
    const concursos = [...new Set(filtrados.map(c => c.concurso))];
    const statsConcursos = document.getElementById('statsConcursos');
    const statsCartoes = document.getElementById('statsCartoes');
    
    if (statsConcursos) statsConcursos.innerHTML = `🎯 ${concursos.length} concursos`;
    if (statsCartoes) statsCartoes.innerHTML = `📊 ${filtrados.length} cartões`;
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
    if (concursos.length > 0) select.value = concursos[0];
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
    
    const resultadoSalvo = []; // Não destaca números
    const porBolao = {};
    filtrados.forEach(c => { const b = c.bolao || 'Sem Bolão'; if (!porBolao[b]) porBolao[b] = []; porBolao[b].push(c); });
    let html = '';
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="margin-bottom:20px"><div style="background:#3b82f6;color:white;padding:6px 10px;border-radius:6px;margin-bottom:8px;font-size:13px;">🎯 ${bolao}</div><div style="display:flex;flex-wrap:wrap;gap:8px;">`;
        lista.forEach(cartao => {
            const numsHtml = cartao.numeros.map(n => `<span style="background:#e2e8f0;color:#333;padding:3px 7px;border-radius:5px;font-family:monospace;font-size:11px;">${n.toString().padStart(2,'0')}</span>`).join('');
            html += `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;min-width:180px;">
                        <div style="font-size:10px;color:#64748b;margin-bottom:4px;">Cartão - Concurso ${concurso}</div>
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
    const linha = '────────────────';
    let loteriaNome = loteriaAtual === 'mega' ? 'MEGA-SENA' : (loteriaAtual === 'lotofacil' ? 'LOTOFÁCIL' : 'QUINA');
    
    let msg = `*🏆 RESULTADO - ${loteriaNome}* 🎲\n`;
    msg += `${linha}\n`;
    msg += `📌 Concurso: ${ultimoResultadoConcurso}\n`;
    msg += `🎯 Números Sorteados:\n`;
    msg += `   ${numeros.join(' - ')}\n`;
    if (dataSorteio) msg += `📅 Sorteio: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}\n`;
    msg += `${linha}\n`;
    msg += `📊 DESEMPENHO DO GRUPO:\n`;
    
    if (loteriaAtual === 'mega') {
        msg += `   ✨ Sena: ${premios.sena}\n`;
        msg += `   ✨ Quina: ${premios.quina}\n`;
        msg += `   ✨ Quadra: ${premios.quadra}\n`;
        msg += `   ✅ Terno: ${premios.terno}\n`;
        msg += `   ✅ Duque: ${premios.duque}\n\n`;
        
        if (premios.terno > 0 || premios.duque > 0) {
            msg += `⚠️ Terno e Duque mostram que estamos chegando perto!\n`;
        } else if (premios.quadra > 0) {
            msg += `⚠️ Quadra! Estamos no caminho certo!\n`;
        } else if (premios.quina > 0) {
            msg += `⭐ Quina! Quase lá!\n`;
        } else if (premios.sena > 0) {
            msg += `🎉🎉🎉 SENA! PARABÉNS! 🎉🎉🎉\n`;
        } else {
            msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
        }
    } else if (loteriaAtual === 'lotofacil') {
        msg += `   ✨ 15 Pontos: ${premios.pontos15}\n`;
        msg += `   ✨ 14 Pontos: ${premios.pontos14}\n`;
        msg += `   ✨ 13 Pontos: ${premios.pontos13}\n`;
        msg += `   ✅ 12 Pontos: ${premios.pontos12}\n`;
        msg += `   ✅ 11 Pontos: ${premios.pontos11}\n\n`;
        
        if (premios.pontos12 > 0 || premios.pontos11 > 0) {
            msg += `⚠️ Estamos chegando perto!\n`;
        } else if (premios.pontos13 > 0) {
            msg += `⚠️ 13 pontos! Quase lá!\n`;
        } else if (premios.pontos14 > 0) {
            msg += `⭐ 14 pontos! Muito perto!\n`;
        } else if (premios.pontos15 > 0) {
            msg += `🎉🎉🎉 15 PONTOS! PARABÉNS! 🎉🎉🎉\n`;
        } else {
            msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
        }
    } else if (loteriaAtual === 'quina') {
        msg += `   ✨ Quina: ${premios.quina}\n`;
        msg += `   ✨ Quadra: ${premios.quadra}\n`;
        msg += `   ✅ Terno: ${premios.terno}\n`;
        msg += `   ✅ Duque: ${premios.duque}\n\n`;
        
        if (premios.terno > 0 || premios.duque > 0) {
            msg += `⚠️ Estamos chegando perto!\n`;
        } else if (premios.quadra > 0) {
            msg += `⚠️ Quadra! Quase lá!\n`;
        } else if (premios.quina > 0) {
            msg += `🎉🎉🎉 QUINA! PARABÉNS! 🎉🎉🎉\n`;
        } else {
            msg += `💪 Vamos tentar novamente no próximo concurso.\n`;
        }
    }
    
    msg += `${linha}\n`;
    msg += `🔗 Acesse o resultado completo:\n`;
    msg += `${window.location.href}`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile ? `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
    //showToast('📱 Abrindo WhatsApp...', 'info');
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
            firebase.analytics().logEvent('conferir_resultados', { loteria: loteriaAtual, concurso: concurso, quantidade_cartoes: cartoesConc.length });
        } catch(e) {}
    }
    
    let numeros = null, dataSorteio = null;
    if (resultados[concurso]) {
        numeros = resultados[concurso];
        //showToast('📋 Usando resultado salvo', 'info');
    } else {
        showToast('🔍 Buscando online...', 'info');
        const busca = await buscarResultadoInterno(concurso, loteriaAtual);
        if (busca) {
            numeros = busca.numeros;
            dataSorteio = busca.dataSorteio;
            //showToast('✅ Resultado encontrado!', 'success');
        } else {
            area.innerHTML = `<div class="empty-state">❌ Resultado não encontrado. Digite manualmente no Admin.</div>`;
            showToast('❌ Resultado não encontrado', 'error');
            return;
        }
    }
    
    const calc = cartoesConc.map(c => ({ ...c, acertos: c.numeros.filter(n => numeros.includes(n)).length })).sort((a,b) => b.acertos - a.acertos);
    let premios = {};
    if (loteriaAtual === 'mega') {
        premios = {
            sena: calc.filter(r => r.acertos >= 6).length,
            quina: calc.filter(r => r.acertos === 5).length,
            quadra: calc.filter(r => r.acertos === 4).length,
            terno: calc.filter(r => r.acertos === 3).length,
            duque: calc.filter(r => r.acertos === 2).length
        };
    } else if (loteriaAtual === 'lotofacil') {
        premios = {
            pontos15: calc.filter(r => r.acertos >= 15).length,
            pontos14: calc.filter(r => r.acertos === 14).length,
            pontos13: calc.filter(r => r.acertos === 13).length,
            pontos12: calc.filter(r => r.acertos === 12).length,
            pontos11: calc.filter(r => r.acertos === 11).length
        };
    } else {
        premios = {
            quina: calc.filter(r => r.acertos >= 5).length,
            quadra: calc.filter(r => r.acertos === 4).length,
            terno: calc.filter(r => r.acertos === 3).length,
            duque: calc.filter(r => r.acertos === 2).length
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
        html += `<div><span style="font-size:20px;font-weight:bold;color:#f59e0b">${premios.quina}</span><br>QUINA</div><div><span style="font-size:20px;font-weight:bold;color:#eab308">${premios.quadra}</span><br>QUADRA</div><div><span style="font-size:20px;font-weight:bold;color:#a855f7">${premios.terno}</span><br>TERNO</div><div><span style="font-size:20px;font-weight;bold;color:#3b82f6">${premios.duque}</span><br>DUQUE</div>`;
    }
    html += `<div><span style="font-size:20px;font-weight:bold">${calc.length}</span><br>CARTÕES</div></div><div style="background:#d1fae5;padding:8px;border-radius:6px;font-size:12px;">🎲 Sorteados: ${numeros.join(' - ')}${dataSorteio?`<br>📅 Data: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}`:''}</div><button id="btnWhatsApp" class="btn-whatsapp" style="margin-top:12px;background:#25D366;width:100%;padding:10px;">📱 COMPARTILHAR NO WHATSAPP</button></div>`;
    
    const porBolao = {};
    calc.forEach(r => { const b = r.bolao || 'Sem Bolão'; if (!porBolao[b]) porBolao[b] = []; porBolao[b].push(r); });
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
    //showToast('🏆 Conferência concluída!', 'success');
}

async function verificarNovosResultados() {
    try {
        const resMega = await db.collection('resultados').where('tipo', '==', 'mega').get();
        const novosMega = {};
        resMega.forEach(doc => { novosMega[doc.id] = doc.data().numeros; });
        const novosMegaEncontrados = Object.keys(novosMega).filter(k => !Object.keys(ultimoEstadoMega).includes(k));
        if (novosMegaEncontrados.length > 0 && loteriaAtual === 'mega') {
            const atual = document.getElementById('concursoSelect')?.value;
            if (atual && novosMegaEncontrados.includes(atual)) {
                showToast(`📢 NOVO RESULTADO! Concurso ${atual} atualizado!`, 'success');
                const btn = document.getElementById('btnConferir');
                if (btn) { btn.style.animation = 'pulse 0.5s ease-in-out 3'; setTimeout(() => { if (btn) btn.style.animation = ''; }, 1500); }
            }
        }
        ultimoEstadoMega = novosMega;
        
        const resLoto = await db.collection('resultados').where('tipo', '==', 'lotofacil').get();
        const novosLoto = {};
        resLoto.forEach(doc => { novosLoto[doc.id] = doc.data().numeros; });
        const novosLotoEncontrados = Object.keys(novosLoto).filter(k => !Object.keys(ultimoEstadoLotofacil).includes(k));
        if (novosLotoEncontrados.length > 0 && loteriaAtual === 'lotofacil') {
            const atual = document.getElementById('concursoSelect')?.value;
            if (atual && novosLotoEncontrados.includes(atual)) {
                showToast(`📢 NOVO RESULTADO! Concurso ${atual} atualizado!`, 'success');
                const btn = document.getElementById('btnConferir');
                if (btn) { btn.style.animation = 'pulse 0.5s ease-in-out 3'; setTimeout(() => { if (btn) btn.style.animation = ''; }, 1500); }
            }
        }
        ultimoEstadoLotofacil = novosLoto;
        
        const resQuina = await db.collection('resultados').where('tipo', '==', 'quina').get();
        const novosQuina = {};
        resQuina.forEach(doc => { novosQuina[doc.id] = doc.data().numeros; });
        const novosQuinaEncontrados = Object.keys(novosQuina).filter(k => !Object.keys(ultimoEstadoQuina).includes(k));
        if (novosQuinaEncontrados.length > 0 && loteriaAtual === 'quina') {
            const atual = document.getElementById('concursoSelect')?.value;
            if (atual && novosQuinaEncontrados.includes(atual)) {
                showToast(`📢 NOVO RESULTADO! Concurso ${atual} atualizado!`, 'success');
                const btn = document.getElementById('btnConferir');
                if (btn) { btn.style.animation = 'pulse 0.5s ease-in-out 3'; setTimeout(() => { if (btn) btn.style.animation = ''; }, 1500); }
            }
        }
        ultimoEstadoQuina = novosQuina;
        atualizarStats();
    } catch(e) { console.log('Erro:', e); }
}

let intervalo, intervaloNotif;
function iniciarAutoAtualizacao() { if (intervalo) clearInterval(intervalo); intervalo = setInterval(() => carregarDados(), 60000); }
function iniciarMonitoramento() { if (intervaloNotif) clearInterval(intervaloNotif); intervaloNotif = setInterval(() => verificarNovosResultados(), 30000); }

// ============ COMPARTILHAR SITE ============
function compartilharSite() {
    const url = 'https://rebrand.ly/boloesaleatorios';  // Link encurtado
    const mensagem = `🎲 *BOLÕES ALEATÓRIOS* 🎲\n\nVenha participar e conferir os resultados dos nossos bolões!!!\n\n🔗 ${url}`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile 
        ? `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`
        : `https://web.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
    //showToast('📱 Abrindo WhatsApp para compartilhar...', 'info');
}

// ============ ENVIAR SUGESTÃO ============
function enviarSugestao() {
    // Substitua o número abaixo pelo seu WhatsApp (com DDD, sem espaços)
    const numeroAdmin = '5561998507770';  // <--- COLOQUE SEU NÚMERO AQUI!
    const mensagem = `💡 *SUGESTÃO PARA O SITE* 💡\n\nOlá! Gostaria de sugerir: `;
    const url = `https://wa.me/${numeroAdmin}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    //showToast('📱 Abrindo WhatsApp para enviar sugestão...', 'info');
}

document.addEventListener('DOMContentLoaded', async () => {
    //console.log('📄 Inicializando...');
    await new Promise(r => setTimeout(r, 500));
    await carregarDados();
    await carregarBolaoAtivo();
    iniciarAutoAtualizacao();
    iniciarMonitoramento();
    //iniciarTimer();
    //iniciarInfoSorteio();
    
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
    //showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
});
async function carregarBoloesSelecionados() {
    const card = document.getElementById('cardBolaoAtivo');
    const container = document.getElementById('bolaoContainer');
    
    try {
        // Buscar IDs selecionados
        const configDoc = await db.collection('config_boloes').doc('ativos').get();
        const idsSelecionados = configDoc.exists ? configDoc.data().ids || [] : [];
        
        if (idsSelecionados.length === 0) {
            if (card) card.style.display = 'none';
            return;
        }
        
        // Buscar cada bolão pelo ID
        const boloes = [];
        for (const id of idsSelecionados) {
            const doc = await db.collection('participantes').doc(id).get();
            if (doc.exists) {
                boloes.push({ id: doc.id, ...doc.data() });
            }
        }
        
        if (boloes.length === 0) {
            if (card) card.style.display = 'none';
            return;
        }
        
        if (card) card.style.display = 'block';
        
        let html = '';
        
        for (const dados of boloes) {
            const participantes = dados.participantes || [];
            const totalQuitados = participantes.filter(p => p.situacao === 'quitado' || p.situacao === 'pago').length;
            const totalAndamento = participantes.filter(p => p.situacao === 'pendente' || p.situacao === 'andamento').length;
            
            let expandido = false;
            
            function renderizarBolao(containerId, dados, participantes, totalQuitados, totalAndamento) {
                const container = document.getElementById(containerId);
                if (!container) return;
                
                let innerHtml = `
                    <div style="margin-bottom: 15px; text-align: center; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong style="font-size: 16px;">🎯 ${dados.titulo || 'Bolão Especial'}</strong>
                        <div style="font-size: 12px; margin-top: 5px;">
                            💰 Valor da cota: R$ ${dados.valorPorCota || 0},00
                            ${dados.dataLimite ? `<br>📅 Data limite: ${new Date(dados.dataLimite).toLocaleDateString('pt-BR')}` : ''}
                        </div>
                        <div style="font-size: 12px; margin-top: 8px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                            <span style="color: #10b981;">✅ Quitados: ${totalQuitados}</span>
                            <span style="color: #f59e0b;">🔄 Em andamento: ${totalAndamento}</span>
                        </div>
                    </div>
                `;
                
                if (expandido) {
                    participantes.forEach(p => {
                        const statusClass = p.situacao === 'quitado' ? 'status-quitado' : 'status-pendente';
                        const statusText = p.situacao === 'quitado' ? '✅ QUITADO' : '🔄 EM ANDAMENTO';
                        innerHtml += `
                            <div class="participante-item">
                                <span class="participante-nome">${p.nome}</span>
                                <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                                    <span class="participante-status ${statusClass}">${statusText}</span>
                                    
                                </div>
                            </div>
                        `;
                    });
                    innerHtml += `<div style="margin-top: 15px; text-align: center;"><button class="btn-ocultar" data-id="${dados.id}" style="background: #64748b; width: auto; padding: 8px 20px;">🙈 OCULTAR LISTA</button></div>`;
                } else {
                    innerHtml += `<div style="margin-top: 10px; text-align: center;"><button class="btn-ver" data-id="${dados.id}" style="background: #3b82f6; width: auto; padding: 8px 20px;">👁 VER LISTA COMPLETA</button></div>`;
                }
                
                container.innerHTML = innerHtml;
                
                // Eventos
                document.querySelector(`.btn-ver[data-id="${dados.id}"]`)?.addEventListener('click', () => {
                    expandido = true;
                    renderizarBolao(containerId, dados, participantes, totalQuitados, totalAndamento);
                });
                document.querySelector(`.btn-ocultar[data-id="${dados.id}"]`)?.addEventListener('click', () => {
                    expandido = false;
                    renderizarBolao(containerId, dados, participantes, totalQuitados, totalAndamento);
                });
            }
            
            const containerId = `bolao_${dados.id}`;
            html += `<div id="${containerId}" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;"></div>`;
            
            // Temporariamente adicionar ao DOM para renderizar
            container.innerHTML = html;
            renderizarBolao(containerId, dados, participantes, totalQuitados, totalAndamento);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        if (card) card.style.display = 'none';
    }
}
function mostrarModalParticipacao(chavePix, titulo, valor) {
    let modal = document.getElementById('modalParticipacao');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'modalParticipacao';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 20px; max-width: 400px; width: 90%; padding: 25px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3);';
    modalContent.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">📝</div>
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px;">COMO PARTICIPAR</div>
        <div style="text-align: left; margin-bottom: 20px;">
            <p><strong>🎯 ${titulo}</strong></p>
            <p>💰 Valor da cota: R$ ${valor || 0},00</p>
            <p>💳 Pague via PIX:</p>
            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin: 10px 0;">
                <code style="font-size: 14px;">${chavePix}</code>
                <button id="copiarPix" style="background: #3b82f6; color: white; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; width: auto;">📋 COPIAR</button>
            </div>
            <p>📲 Após o pagamento, envie o comprovante para:</p>
        </div>
        <button id="falarWhatsApp" style="background: #25D366; color: white; border: none; padding: 12px 20px; border-radius: 30px; font-size: 16px; cursor: pointer; width: 100%; margin-bottom: 10px;">📲 FALAR COM ADMIN</button>
        <button id="fecharModal" style="background: #64748b; color: white; border: none; padding: 10px 20px; border-radius: 30px; font-size: 14px; cursor: pointer; width: 100%;">Fechar</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    document.getElementById('fecharModal').onclick = () => modal.remove();
    document.getElementById('copiarPix').onclick = () => {
        navigator.clipboard.writeText(chavePix);
        showToast('✅ PIX copiado!', 'success');
    };
    document.getElementById('falarWhatsApp').onclick = () => {
        window.open('https://wa.me/5561998507770', '_blank');
    };
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}