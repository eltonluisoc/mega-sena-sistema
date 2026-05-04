let cartoes = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let loteriaAtual = 'mega';
let ultimoResultadoConcurso = null;
let ultimoResultadoDados = null;
let ultimoEstadoMega = {};
let ultimoEstadoLotofacil = {};

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
    let titulo = '📱 SALVAR COMO APP NO CELULAR';
    let mensagem = '';
    if (isIOS) {
        mensagem = '📲 No iPhone/iPad:\n\n1. Toque no botão "Compartilhar" 📤\n2. Role a tela para baixo\n3. Toque em "Adicionar à Tela de Início"\n4. Confirme\n\nO app aparecerá na tela inicial!';
    } else if (isAndroid) {
        mensagem = '📲 No Android (Chrome):\n\n1. Toque nos 3 pontinhos ⋮\n2. Toque em "Instalar aplicativo"\n3. Confirme\n\nO app aparecerá na tela inicial!';
    } else {
        mensagem = '💻 No computador, acesso normal.\nNo celular: iPhone → Compartilhar → Adicionar à Tela de Início\nAndroid → ⋮ → Instalar aplicativo';
    }
    let modal = document.getElementById('modalInstalar');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'modalInstalar';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;';
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; border-radius: 20px; max-width: 350px; width: 90%; padding: 25px; text-align: center;';
    modalContent.innerHTML = `<div style="font-size:24px">📱</div><div style="font-size:20px;font-weight:bold;margin:10px 0">${titulo}</div><div style="white-space:pre-line;text-align:left;font-size:14px;margin:15px 0">${mensagem}</div><button id="fecharModalInstalar" style="background:#3b82f6;color:white;border:none;padding:12px;border-radius:30px;width:100%;font-weight:bold">Fechar</button>`;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    document.getElementById('fecharModalInstalar').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function adicionarBotaoInstalar() {
    const btn = document.getElementById('btnInstalarApp');
    if (btn) btn.onclick = mostrarPopupInstalar;
}

function setLoteria(loteria) {
    loteriaAtual = loteria;
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    if (btnMega) btnMega.classList.remove('active');
    if (btnLoto) btnLoto.classList.remove('active');
    if (loteria === 'mega') {
        if (btnMega) btnMega.classList.add('active');
        const h1 = document.getElementById('cardHeaderConferencia');
        if (h1) h1.innerHTML = '🔍 CONFERIR RESULTADOS - MEGA-SENA';
        const h2 = document.getElementById('cardHeaderCartoes');
        if (h2) h2.innerHTML = '📋 CARTÕES DO CONCURSO - MEGA-SENA';
        const lbl = document.getElementById('labelNumeros');
        if (lbl) lbl.innerHTML = '🎲 NÚMEROS SORTEADOS (6 números):';
        const inp = document.getElementById('numerosSorteados');
        if (inp) inp.placeholder = 'Ex: 12 15 23 34 45 56';
    } else {
        if (btnLoto) btnLoto.classList.add('active');
        const h1 = document.getElementById('cardHeaderConferencia');
        if (h1) h1.innerHTML = '🔍 CONFERIR RESULTADOS - LOTOFÁCIL';
        const h2 = document.getElementById('cardHeaderCartoes');
        if (h2) h2.innerHTML = '📋 CARTÕES DO CONCURSO - LOTOFÁCIL';
        const lbl = document.getElementById('labelNumeros');
        if (lbl) lbl.innerHTML = '🎲 NÚMEROS SORTEADOS (15 números):';
        const inp = document.getElementById('numerosSorteados');
        if (inp) inp.placeholder = 'Ex: 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15';
    }
    atualizarSelectConcursos();
    const sel = document.getElementById('concursoSelect');
    if (sel && sel.value) mostrarCartoesDoConcurso();
    showToast(`🔄 Mudou para ${loteria === 'mega' ? 'MEGA-SENA' : 'LOTOFÁCIL'}`, 'info');
}

async function carregarDados() {
    console.log('🔄 Carregando dados...');
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
        console.log(`📊 Total: ${cartoes.length} | Mega: ${cartoes.filter(c => c.tipo === 'mega').length} | Lotofácil: ${cartoes.filter(c => c.tipo === 'lotofacil').length}`);
        const resMega = await db.collection('resultados').where('tipo', '==', 'mega').get();
        resultadosMega = {};
        resMega.forEach(doc => { resultadosMega[doc.id] = doc.data().numeros; });
        const resLoto = await db.collection('resultados').where('tipo', '==', 'lotofacil').get();
        resultadosLotofacil = {};
        resLoto.forEach(doc => { resultadosLotofacil[doc.id] = doc.data().numeros; });
        if (Object.keys(ultimoEstadoMega).length === 0) {
            ultimoEstadoMega = JSON.parse(JSON.stringify(resultadosMega));
            ultimoEstadoLotofacil = JSON.parse(JSON.stringify(resultadosLotofacil));
        }
        atualizarSelectConcursos();
        atualizarStats();
        selecionarUltimoConcurso();
        showToast(`✅ ${cartoes.length} cartões carregados`, 'success');
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro ao carregar dados', 'error');
        const cont = document.getElementById('cartoesConcurso');
        if (cont) cont.innerHTML = '<div class="empty-state">❌ Erro ao conectar. Verifique sua internet.</div>';
    }
}

function atualizarStats() {
    const filtrados = cartoes.filter(c => c.tipo === loteriaAtual);
    const concursos = [...new Set(filtrados.map(c => c.concurso))];
    const resCount = Object.keys(loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil).length;
    const div = document.getElementById('totalCartoes');
    if (div) div.innerHTML = `📊 ${filtrados.length} cartões | 🎯 ${concursos.length} concursos | ✅ ${resCount} resultados`;
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
    const resultados = loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil;
    const salvos = resultados[concurso] || [];
    const porBolao = {};
    filtrados.forEach(c => { const b = c.bolao || 'Sem Bolão'; if (!porBolao[b]) porBolao[b] = []; porBolao[b].push(c); });
    let html = '';
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="margin-bottom:20px"><div style="background:#3b82f6;color:white;padding:8px 12px;border-radius:8px;margin-bottom:10px">🎯 ${bolao}</div><div style="display:flex;flex-wrap:wrap;gap:10px">`;
        lista.forEach(cartao => {
            const numsHtml = cartao.numeros.map(n => `<span style="background:${salvos.includes(n)?'#10b981':'#e2e8f0'};color:${salvos.includes(n)?'white':'#333'};padding:4px 8px;border-radius:5px;font-family:monospace;font-size:${loteriaAtual==='mega'?'12px':'10px'}">${n.toString().padStart(2,'0')}</span>`).join('');
            html += `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;min-width:200px;max-width:${loteriaAtual==='mega'?'250px':'350px'}"><div style="font-size:11px;color:#64748b;margin-bottom:5px">Cartão</div><div style="display:flex;flex-wrap:wrap;gap:3px">${numsHtml}</div>${salvos.length>0?`<div style="font-size:10px;color:#10b981;margin-top:5px">${cartao.numeros.filter(n=>salvos.includes(n)).length} acertos</div>`:''}</div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

async function buscarResultadoInterno(concurso, loteria) {
    let numeros = null, data = null;
    try {
        const url = loteria === 'mega' 
            ? `https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concurso}`
            : `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${concurso}`;
        const resp = await fetch(url);
        if (resp.ok) {
            const dados = await resp.json();
            const dezenas = dados.listaDezenas;
            if (dezenas && dezenas.length >= (loteria === 'mega' ? 6 : 15)) {
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
    const linha = '_______________________________________';
    let msg = `*RESULTADO: BOLÕES ALEATÓRIOS* 🎲\n${linha}\n📌 Concurso: ${ultimoResultadoConcurso}\n🗓️ Dezenas Sorteadas:\n${numeros.join(' — ')}\n${linha}\n🏆 DESEMPENHO DO GRUPO:\n`;
    
    if (loteriaAtual === 'mega') {
        msg += `✨ Sena: ${premios.sena}\n✨ Quina: ${premios.quina}\n✨ Quadra: ${premios.quadra}\n✅ Terno: ${premios.terno}\n✅ Duque: ${premios.duque}\n`;
        if (premios.terno > 0 || premios.duque > 0) {
            msg += `⚠️ O terno mostra que estamos chegando perto. Seguimos firmes!\n`;
        } else if (premios.quadra > 0) {
            msg += `⚠️ Quadra! Estamos no caminho certo!\n`;
        } else if (premios.quina > 0) {
            msg += `⭐ Quina! Quase lá!\n`;
        } else if (premios.sena > 0) {
            msg += `🎉🎉🎉 SENA! SHOW, SHOW, SHOW, GANHAMOS! 🎉🎉🎉\n`;
        } else {
            msg += `💪 Vamos tentar novamente no próximo concurso acumulado.\n`;
        }
    } else {
        msg += `✨ 15 Pontos: ${premios.pontos15}\n✨ 14 Pontos: ${premios.pontos14}\n✨ 13 Pontos: ${premios.pontos13}\n✅ 12 Pontos: ${premios.pontos12}\n✅ 11 Pontos: ${premios.pontos11}\n`;
        if (premios.pontos12 > 0 || premios.pontos11 > 0) {
            msg += `⚠️ Estamos chegando perto!\n`;
        } else if (premios.pontos13 > 0) {
            msg += `⚠️ 13 pontos! Quase lá!\n`;
        } else if (premios.pontos14 > 0) {
            msg += `⭐ 14 pontos! Muito perto!\n`;
        } else if (premios.pontos15 > 0) {
            msg += `🎉🎉🎉 15 PONTOS! GANHAMOS!!! 🎉🎉🎉\n`;
        } else {
            msg += `💪 Vamos tentar novamente no próximo concurso acumulado.\n`;
        }
    }
    
    msg += `${linha}\n🔗 Confira: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    showToast('📱 Abrindo WhatsApp...', 'info');
}
async function conferirResultados() {
    const concurso = document.getElementById('concursoSelect').value;
    if (!concurso) { showToast('⚠️ Selecione um concurso', 'warning'); return; }
    const area = document.getElementById('resultadosArea');
    if (!area) return;
    area.innerHTML = '<div class="loading">🔍 Processando...</div>';
    const resultados = loteriaAtual === 'mega' ? resultadosMega : resultadosLotofacil;
    const cartoesConc = cartoes.filter(c => c.tipo === loteriaAtual && c.concurso == concurso);
    if (cartoesConc.length === 0) {
        area.innerHTML = `<div class="empty-state">Nenhum cartão para o concurso ${concurso}</div>`;
        return;
    }
    let numeros = null, dataSorteio = null;
    if (resultados[concurso]) {
        numeros = resultados[concurso];
        showToast('📋 Usando resultado salvo', 'info');
    } else {
        showToast('🔍 Buscando online...', 'info');
        const busca = await buscarResultadoInterno(concurso, loteriaAtual);
        if (busca) {
            numeros = busca.numeros;
            dataSorteio = busca.dataSorteio;
            const inp = document.getElementById('numerosSorteados');
            if (inp) inp.value = numeros.join(' ');
            showToast('✅ Resultado encontrado!', 'success');
        } else {
            area.innerHTML = `<div class="empty-state">❌ Resultado não encontrado. Digite manualmente.</div>`;
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
    } else {
        premios = {
            pontos15: calc.filter(r => r.acertos >= 15).length,
            pontos14: calc.filter(r => r.acertos === 14).length,
            pontos13: calc.filter(r => r.acertos === 13).length,
            pontos12: calc.filter(r => r.acertos === 12).length,
            pontos11: calc.filter(r => r.acertos === 11).length
        };
    }
    ultimoResultadoConcurso = concurso;
    ultimoResultadoDados = { numeros, dataSorteio, premios };
    let html = `<div style="background:#f0fdf4;border-radius:10px;padding:20px;margin-bottom:20px;text-align:center"><h3>🏆 RESULTADO DO CONCURSO ${concurso}</h3><div style="display:flex;justify-content:center;gap:15px;margin:15px 0;flex-wrap:wrap">`;
    if (loteriaAtual === 'mega') {
        html += `<div><span style="font-size:24px;font-weight:bold;color:#f59e0b">${premios.sena}</span><br>SENA</div><div><span style="font-size:24px;font-weight:bold;color:#eab308">${premios.quina}</span><br>QUINA</div><div><span style="font-size:24px;font-weight:bold;color:#a855f7">${premios.quadra}</span><br>QUADRA</div><div><span style="font-size:24px;font-weight:bold;color:#3b82f6">${premios.terno}</span><br>TERNO</div><div><span style="font-size:24px;font-weight:bold;color:#64748b">${premios.duque}</span><br>DUQUE</div><div><span style="font-size:24px;font-weight:bold">${calc.length}</span><br>CARTÕES</div>`;
    } else {
        html += `<div><span style="font-size:24px;font-weight:bold;color:#f59e0b">${premios.pontos15}</span><br>15 PTS</div><div><span style="font-size:24px;font-weight:bold;color:#eab308">${premios.pontos14}</span><br>14 PTS</div><div><span style="font-size:24px;font-weight:bold;color:#a855f7">${premios.pontos13}</span><br>13 PTS</div><div><span style="font-size:24px;font-weight:bold;color:#3b82f6">${premios.pontos12}</span><br>12 PTS</div><div><span style="font-size:24px;font-weight:bold;color:#64748b">${premios.pontos11}</span><br>11 PTS</div><div><span style="font-size:24px;font-weight:bold">${calc.length}</span><br>CARTÕES</div>`;
    }
    html += `</div><div style="background:#d1fae5;padding:10px;border-radius:8px">🎲 Sorteados: ${numeros.join(' - ')}${dataSorteio?`<br>📅 Data: ${new Date(dataSorteio).toLocaleDateString('pt-BR')}`:''}</div><button id="btnWhatsApp" class="btn-whatsapp" style="margin-top:15px">📱 COMPARTILHAR NO WHATSAPP</button></div>`;
    const porBolao = {};
    calc.forEach(r => { const b = r.bolao || 'Sem Bolão'; if (!porBolao[b]) porBolao[b] = []; porBolao[b].push(r); });
    for (const [bolao, lista] of Object.entries(porBolao)) {
        html += `<div style="background:white;border-radius:10px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0"><h4 style="color:#3b82f6">🎯 ${bolao}</h4>`;
        lista.forEach(c => {
            const cor = loteriaAtual === 'mega' ? (c.acertos >= 6 ? '#f59e0b' : c.acertos === 5 ? '#eab308' : c.acertos === 4 ? '#a855f7' : c.acertos === 3 ? '#3b82f6' : '#cbd5e1') : (c.acertos >= 15 ? '#f59e0b' : c.acertos === 14 ? '#eab308' : c.acertos === 13 ? '#a855f7' : c.acertos === 12 ? '#3b82f6' : '#cbd5e1');
            html += `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px"><span>Cartão</span><span style="background:${cor};color:white;padding:2px 10px;border-radius:20px">${c.acertos} acertos</span></div><div style="display:flex;flex-wrap:wrap;gap:4px">${c.numeros.map(n => `<span style="background:${numeros.includes(n)?'#10b981':'#e2e8f0'};color:${numeros.includes(n)?'white':'#333'};padding:4px 8px;border-radius:5px;font-family:monospace;font-size:${loteriaAtual==='mega'?'12px':'10px'}">${n.toString().padStart(2,'0')}</span>`).join('')}</div></div>`;
        });
        html += `</div>`;
    }
    area.innerHTML = html;
    mostrarCartoesDoConcurso();
    const btn = document.getElementById('btnWhatsApp');
    if (btn) btn.addEventListener('click', compartilharWhatsApp);
    showToast('🏆 Conferência concluída!', 'success');
}

async function verificarNovosResultados() {
    try {
        const resMega = await db.collection('resultados').where('tipo', '==', 'mega').get();
        const novosMega = {};
        resMega.forEach(doc => { novosMega[doc.id] = doc.data().numeros; });
        const novos = Object.keys(novosMega).filter(k => !Object.keys(ultimoEstadoMega).includes(k));
        if (novos.length > 0 && loteriaAtual === 'mega') {
            const atual = document.getElementById('concursoSelect')?.value;
            if (atual && novos.includes(atual)) {
                showToast(`📢 NOVO RESULTADO! Concurso ${atual} atualizado!`, 'success');
                const btn = document.getElementById('btnConferir');
                if (btn) { btn.style.animation = 'pulse 0.5s ease-in-out 3'; setTimeout(() => { if (btn) btn.style.animation = ''; }, 1500); }
            }
        }
        ultimoEstadoMega = novosMega;
        const resLoto = await db.collection('resultados').where('tipo', '==', 'lotofacil').get();
        const novosLoto = {};
        resLoto.forEach(doc => { novosLoto[doc.id] = doc.data().numeros; });
        const novos2 = Object.keys(novosLoto).filter(k => !Object.keys(ultimoEstadoLotofacil).includes(k));
        if (novos2.length > 0 && loteriaAtual === 'lotofacil') {
            const atual = document.getElementById('concursoSelect')?.value;
            if (atual && novos2.includes(atual)) {
                showToast(`📢 NOVO RESULTADO! Concurso ${atual} atualizado!`, 'success');
                const btn = document.getElementById('btnConferir');
                if (btn) { btn.style.animation = 'pulse 0.5s ease-in-out 3'; setTimeout(() => { if (btn) btn.style.animation = ''; }, 1500); }
            }
        }
        ultimoEstadoLotofacil = novosLoto;
        atualizarStats();
    } catch(e) { console.log('Erro:', e); }
}

let intervalo, intervaloNotif;
function iniciarAutoAtualizacao() { if (intervalo) clearInterval(intervalo); intervalo = setInterval(() => carregarDados(), 60000); }
function iniciarMonitoramento() { if (intervaloNotif) clearInterval(intervaloNotif); intervaloNotif = setInterval(() => verificarNovosResultados(), 30000); }

const animStyle = document.createElement('style');
animStyle.textContent = `@keyframes pulse{0%{transform:scale(1);background:#3b82f6}50%{transform:scale(1.05);background:#f59e0b}100%{transform:scale(1);background:#3b82f6}}`;
document.head.appendChild(animStyle);

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Inicializando...');
    await new Promise(r => setTimeout(r, 500));
    await carregarDados();
    iniciarAutoAtualizacao();
    iniciarMonitoramento();
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    const selCon = document.getElementById('concursoSelect');
    const btnConf = document.getElementById('btnConferir');
    if (btnMega) btnMega.addEventListener('click', () => setLoteria('mega'));
    if (btnLoto) btnLoto.addEventListener('click', () => setLoteria('lotofacil'));
    if (selCon) selCon.addEventListener('change', mostrarCartoesDoConcurso);
    if (btnConf) {
        btnConf.addEventListener('click', conferirResultados);
        btnConf.addEventListener('touchstart', conferirResultados);
    }
    adicionarBotaoInstalar();
    mostrarCartoesDoConcurso();
    showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
});