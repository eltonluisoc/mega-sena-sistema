let cartoes = [];
let resultadosMega = {};
let resultadosLotofacil = {};
let resultadosQuina = {};
let resultadosMaisMilionaria = {};
let loteriaAtual = 'mega';
// Config central de "k" (dezenas sorteadas) e universo de números por
// loteria — várias funções abaixo tinham essa mesma cadeia de ternários
// (mega?6 : lotofacil?15 : 5) repetida, com Quina como fallback
// silencioso pra QUALQUER tipo não reconhecido. Adicionar a +Milionária
// direto nessas tabelas evita repetir — e esquecer — um branch novo em
// cada função. numerosPossiveis é só o universo de NÚMEROS (a
// +Milionária também sorteia 2 trevos de 1-6, tratado à parte onde
// precisa — ver LOTERIA_TREVOS).
const LOTERIA_K = { mega: 6, lotofacil: 15, quina: 5, maismilionaria: 6 };
const LOTERIA_UNIVERSO = { mega: 60, lotofacil: 25, quina: 80, maismilionaria: 50 };
// Só a +Milionária tem essa segunda dimensão (trevo da sorte).
const LOTERIA_TREVOS = { maismilionaria: { k: 2, universo: 6 } };
let ultimoResultadoConcurso = null;
let ultimoResultadoDados = null;
let pixGeral = '';
let dadosCarregados = false;
let resultadoSalvo = null;
let loadingActive = false;
let deferredInstallPrompt = null;

// ========== FUNÇÕES DE LOADING ÚNICO ==========
function showLoading(mensagem = 'Carregando...') {
    if (loadingActive) return;
    loadingActive = true;
    
    let overlay = document.getElementById('globalLoading');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'globalLoading';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 9999;
            display: flex; justify-content: center; align-items: center;
            flex-direction: column; gap: 15px;
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div style="background: white; border-radius: 20px; padding: 25px; text-align: center; min-width: 200px;">
            <div style="font-size: 40px; animation: spin 1s linear infinite;">🔄</div>
            <div style="margin-top: 10px; font-weight: bold;">${mensagem}</div>
        </div>
    `;
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('globalLoading');
    if (overlay) {
        overlay.style.display = 'none';
    }
    loadingActive = false;
}

// ========== FUNÇÕES AUXILIARES ==========
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

// Escapa texto vindo do Firestore (nome de participante, título de bolão)
// antes de inserir em innerHTML — sem isso, um nome cadastrado com HTML
// (ex.: "<img src=x onerror=...>") executaria no navegador de quem vir.
function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    // textContent->innerHTML já escapa <, > e &, mas não aspas — escapa
    // também pra ser seguro tanto em texto quanto dentro de atributos.
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================
// INSTALAÇÃO DO PWA
// ============================================
function appJaInstalado() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function ehIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Botão "SALVAR COMO APP" do rodapé: dispara a instalação nativa de
// verdade quando o navegador oferece (Chrome/Edge/Android), com as
// instruções manuais como alternativa só quando não há como automatizar.
async function mostrarPopupInstalar() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        return;
    }

    const isAndroid = /Android/.test(navigator.userAgent);
    let mensagem = '';

    if (ehIOS()) {
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
        <div style="font-size: 20px; font-weight: bold; margin: 10px 0;">📱 SALVAR COMO APP</div>
        <div style="white-space: pre-line; text-align: left; font-size: 14px; margin: 15px 0;">${mensagem}</div>
        <button id="fecharModalInstalar" style="background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 30px; width: 100%;">Fechar</button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    document.getElementById('fecharModalInstalar').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// Banner proativo: aparece sozinho a partir da 2ª visita (em vez de
// depender de alguém notar o botão discreto no rodapé), com o
// comportamento certo pra cada aparelho.
function criarBannerInstalacao(conteudoHtml) {
    let banner = document.getElementById('installBanner');
    if (banner) banner.remove();
    banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.style.cssText = `
        position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 9998;
        max-width: 500px; margin: 0 auto;
        background: #1e293b; border-radius: 16px; padding: 14px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        display: flex; align-items: center; gap: 12px;
        animation: slideUp 0.3s ease-out;
        -webkit-text-size-adjust: 100%; text-size-adjust: 100%;
    `;
    banner.innerHTML = conteudoHtml;
    document.body.appendChild(banner);
    return banner;
}

function fecharBannerInstalacao(naoMostrarDeNovo) {
    const banner = document.getElementById('installBanner');
    if (banner) banner.remove();
    if (naoMostrarDeNovo) {
        localStorage.setItem('installPromptDispensado', 'true');
    }
}

function mostrarBannerInstalacaoAndroid() {
    criarBannerInstalacao(`
        <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#10b981);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🎲</div>
        <div style="flex:1;min-width:0;">
            <strong style="display:block;color:white;font-size:13px;">Instale o Bolões Aleatórios</strong>
            <span style="color:#94a3b8;font-size:11px;">Acesso rápido, sem abrir o navegador</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
            <button id="btnInstalarBanner" style="border:none;border-radius:20px;font-size:11px;font-weight:700;padding:6px 12px;cursor:pointer;background:#8b5cf6;color:white;">Instalar</button>
            <button id="btnDepoisBanner" style="border:none;border-radius:20px;font-size:11px;font-weight:700;padding:6px 12px;cursor:pointer;background:transparent;color:#94a3b8;">Agora não</button>
        </div>
    `);

    document.getElementById('btnInstalarBanner').onclick = async () => {
        if (!deferredInstallPrompt) { fecharBannerInstalacao(true); return; }
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        fecharBannerInstalacao(true);
    };
    document.getElementById('btnDepoisBanner').onclick = () => fecharBannerInstalacao(false);
}

function mostrarBannerInstalacaoIOS() {
    criarBannerInstalacao(`
        <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#10b981);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🎲</div>
        <div style="flex:1;min-width:0;">
            <strong style="display:block;color:white;font-size:13px;">Instale o Bolões Aleatórios</strong>
            <span style="color:#94a3b8;font-size:11px;">Toque em <strong style="color:white;">⬆️ Compartilhar</strong> → "Adicionar à Tela de Início"</span>
        </div>
        <button id="btnFecharBannerIOS" style="border:none;border-radius:20px;font-size:11px;font-weight:700;padding:6px 12px;cursor:pointer;background:transparent;color:#94a3b8;flex-shrink:0;">✕</button>
    `);
    document.getElementById('btnFecharBannerIOS').onclick = () => fecharBannerInstalacao(true);
}

function tentarMostrarBannerInstalacaoProativo() {
    if (appJaInstalado()) return;
    if (localStorage.getItem('installPromptDispensado') === 'true') return;

    const visitas = parseInt(localStorage.getItem('visitCount') || '0', 10);
    if (visitas < 2) return;

    if (ehIOS()) {
        mostrarBannerInstalacaoIOS();
    } else if (deferredInstallPrompt) {
        mostrarBannerInstalacaoAndroid();
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    tentarMostrarBannerInstalacaoProativo();
});

window.addEventListener('appinstalled', () => {
    fecharBannerInstalacao(true);
    deferredInstallPrompt = null;
});

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

// Duplicada em admin.js como combinacaoAdmin() (sem build step pra
// compartilhar módulo entre as páginas) — mantenha as duas sincronizadas.
function combinacao(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    let resultado = 1;
    for (let i = 1; i <= k; i++) {
        resultado *= (n - k + i) / i;
    }
    return Math.round(resultado);
}

// Formata uma probabilidade (fração 0-1) como % legível, ajustando as
// casas decimais conforme a grandeza — sem isso, valores bem pequenos
// (comuns na Quina, cujo universo é gigante) apareceriam como "0.00%".
function formatarProbabilidade(p) {
    const pct = p * 100;
    if (pct <= 0) return '0%';
    if (pct >= 1) return pct.toFixed(1) + '%';
    if (pct >= 0.01) return pct.toFixed(2) + '%';
    if (pct >= 0.0001) return pct.toFixed(4) + '%';
    return pct.toExponential(1) + '%';
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
    } else if (loteria === 'maismilionaria') {
        // C(50,6) — só a parte de NÚMEROS. O trevo (C(6,2)=15 combinações)
        // é uma dimensão separada, somada à parte na "chance" e nos
        // "bilhetes equivalentes" abaixo — ver comentários mais adiante.
        totalCombinacoesPossiveis = 15890700;
        numerosPossiveis = 50;
    } else {
        totalCombinacoesPossiveis = 24040016;
        numerosPossiveis = 80;
    }

    // Dezenas sorteadas (k) por loteria — usado tanto no cálculo do prêmio
    // máximo (bilhetes/estrelas, abaixo) quanto no de "chance real".
    const dezenasSorteadas = LOTERIA_K[loteria] || 5;

    // "Chance real" mostrava a chance do prêmio MÁXIMO (sena/15 pontos/
    // quina) — na prática, sempre uma fração minúscula (ex.: 0,007%),
    // porque ganhar o prêmio máximo É raro mesmo com um bolão grande. O
    // usuário pediu pra mostrar a chance de um prêmio mais alcançável:
    // quadra na Mega e na Quina, 13 pontos na Lotofácil — mais realista
    // de acontecer, então um número que realmente diz algo útil.
    //
    // Isso não é mais "quantos bilhetes o cartão vale" (combinação(n,k)) —
    // é a probabilidade hipergeométrica de acertar EXATAMENTE j das k
    // dezenas sorteadas, tendo n números marcados num universo de N:
    //   P(exatamente j acertos) = C(n,j) × C(N-n, k-j) / C(N,k)
    // Somado entre os cartões do bolão (valor esperado de cartões
    // premiados nessa faixa — mesma lógica de agregação já usada no
    // "bilhetes equivalentes" abaixo, só que pra essa faixa de prêmio).
    // Quina usava quadra (j=4) igual à Mega, mas isso dava sempre uma
    // fração minúscula (ex.: 0,63%) mesmo em bolões grandes — o usuário
    // pediu terno (j=3), mais alcançável e que rende um % que já diz
    // algo por si só (ver também a classificação por estrelas abaixo,
    // que na Quina passou a usar esse mesmo % em vez de "bilhetes").
    const acertosAlvoChance = loteria === 'lotofacil' ? 13 : (loteria === 'quina' ? 3 : 4);
    // +Milionária: a "chance" mostrada é só da parte NÚMEROS (4 de 6) —
    // os dois sorteios (números/trevo) são independentes, então o trevo
    // não muda essa probabilidade; ele entra separado nas faixas de
    // prêmio reais (ver calcularPremios), não neste resumo rápido.
    const rotuloChance = loteria === 'lotofacil' ? '13 PTS'
        : (loteria === 'quina' ? 'TERNO' : (loteria === 'maismilionaria' ? '4 NÚMEROS' : 'QUADRA'));

    let totalCombinacoesCobertas = 0;
    let totalCombinacoesChance = 0;
    let numerosUtilizados = new Set();
    const trevoCfg = LOTERIA_TREVOS[loteria];

    for (const cartao of cartoesBolao) {
        const qtdNumeros = cartao.numeros.length;
        let combinacoesDoCartao = combinacao(qtdNumeros, dezenasSorteadas);
        // "Bilhetes equivalentes" da +Milionária precisa multiplicar pela
        // combinatória de trevos também — um cartão com mais trevos que o
        // mínimo (2) é aposta múltipla NESSA dimensão também, igual já
        // vale pros números. Sem isso, um cartão de 6 números + 6 trevos
        // (que cobre 15 combinações de trevo) contaria como 1 bilhete só.
        if (trevoCfg && cartao.trevos && cartao.trevos.length > 0) {
            combinacoesDoCartao *= combinacao(cartao.trevos.length, trevoCfg.k);
        }
        totalCombinacoesCobertas += combinacoesDoCartao;

        totalCombinacoesChance += combinacao(qtdNumeros, acertosAlvoChance) *
            combinacao(numerosPossiveis - qtdNumeros, dezenasSorteadas - acertosAlvoChance);

        cartao.numeros.forEach(n => numerosUtilizados.add(n));
    }
    
    const numerosCobertos = numerosUtilizados.size;
    const percentualCobertura = Math.round((numerosCobertos / numerosPossiveis) * 100);
    const vezesMelhor = Math.round(totalCombinacoesCobertas);

    // A classificação por estrelas usava faixas fixas de "bilhetes
    // equivalentes" (10000/5000/1000/100) iguais pras 3 loterias — só que
    // esse número cresce em ritmos muito diferentes conforme a loteria,
    // porque o k (dezenas sorteadas) muda: k=6 na Mega, k=15 na Lotofácil,
    // k=5 na Quina.
    //
    // Uma primeira correção normalizou pela probabilidade real (bilhetes
    // cobertos / total de combinações possíveis) — matematicamente
    // consistente, mas na prática ficou generoso demais com a Lotofácil:
    // 3 cartões de 18 números (2.448 bilhetes, um bolão pequeno de
    // verdade) batiam EXCELENTE, porque o universo da Lotofácil é ~15x
    // menor que o da Mega, então qualquer fatia dele "pesa" mais em %.
    // Só que EXCELENTE tem que representar um bolão GRANDE de verdade,
    // não uma fração relativamente alta de um universo pequeno.
    //
    // A correção final: voltar a faixas de número ABSOLUTO de bilhetes
    // (mais fácil de calibrar contra bolões reais), mas com uma faixa por
    // loteria em vez de uma só — Mega fica como já estava (confirmado
    // correto), Lotofácil sobe bastante (pra não bater EXCELENTE/ÓTIMO
    // com só alguns cartões grandes).
    //
    // A Quina saiu desse esquema (ver bloco abaixo): "bilhetes cobertos"
    // não funciona bem lá porque os cartões quase sempre têm o mínimo de
    // 5 números (1 combinação cada), então praticamente nunca saía de 1
    // estrela. Só que exibir a chance de terno do bolão ao lado de uma
    // classificação vinda de outra conta totalmente diferente ficava
    // contraditório (ex.: 4★ ÓTIMO ao lado de 0,63% de chance de quadra).
    // Decisão do usuário: na Quina, a classificação passa a vir direto do
    // % de chance de terno.
    const FAIXAS_ESTRELAS = {
        mega:      { excelente: 10000, otimo: 5000,  bom: 1000, regular: 100 },
        // Referência: 3 cartões de 18 números = 2.448 bilhetes → cai em
        // BOM (não EXCELENTE/ÓTIMO, que precisam ser MUITO acima da média).
        lotofacil: { excelente: 60000, otimo: 20000, bom: 1500, regular: 300 },
        // Calibração inicial por PROPORÇÃO de universo (sem bolões reais
        // da +Milionária ainda pra calibrar contra, diferente das outras
        // 3 — ajustar aqui quando houver histórico real): universo
        // completo (números × trevo) é ~4,76× o da Mega
        // (238.360.500 / 50.063.860), então as faixas da Mega escaladas
        // pelo mesmo fator.
        maismilionaria: { excelente: 48000, otimo: 24000, bom: 4800, regular: 500 },
    };

    // "Chance real" = chance de pelo menos um cartão bater a faixa de
    // prêmio mais alcançável (ver acertosAlvoChance acima).
    const probabilidade = totalCombinacoesPossiveis > 0
        ? totalCombinacoesChance / totalCombinacoesPossiveis
        : 0;

    let estrelas = 0;
    let estrelasHtml = '';
    let classificacao = '';

    if (loteria === 'quina') {
        // Faixas de % de chance de terno (não usa "bilhetes cobertos").
        // Sem faixa REGULAR/2★ — decisão explícita do usuário.
        const pctChance = probabilidade * 100;
        if (pctChance >= 80) {
            estrelas = 5;
            classificacao = 'EXCELENTE';
        } else if (pctChance >= 50) {
            estrelas = 4;
            classificacao = 'ÓTIMO';
        } else if (pctChance >= 15) {
            estrelas = 3;
            classificacao = 'BOM';
        } else {
            estrelas = 1;
            classificacao = 'SIMPLES';
        }
    } else {
        const faixas = FAIXAS_ESTRELAS[loteria] || FAIXAS_ESTRELAS.mega;
        if (totalCombinacoesCobertas >= faixas.excelente) {
            estrelas = 5;
            classificacao = 'EXCELENTE';
        } else if (totalCombinacoesCobertas >= faixas.otimo) {
            estrelas = 4;
            classificacao = 'ÓTIMO';
        } else if (totalCombinacoesCobertas >= faixas.bom) {
            estrelas = 3;
            classificacao = 'BOM';
        } else if (totalCombinacoesCobertas >= faixas.regular) {
            estrelas = 2;
            classificacao = 'REGULAR';
        } else {
            estrelas = 1;
            classificacao = 'SIMPLES';
        }
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
                    <div style="font-size: 16px; font-weight: bold;">${formatarProbabilidade(probabilidade)}</div>
                    <div style="font-size: 8px; opacity: 0.8;">CHANCE (${rotuloChance})</div>
                </div>
                <div>
                    <div style="font-size: 16px; font-weight: bold;">${totalCartoes}</div>
                    <div style="font-size: 8px; opacity: 0.8;">CARTÕES</div>
                </div>
            </div>
        </div>
    `;
}

// trevosSorteados é opcional — só a +Milionária usa (desempate por
// acertos de trevo quando dois cartões empatam em números).
function ordenarCartoesPorAcertos(cartoesLista, numerosSorteados, trevosSorteados = null) {
    if (!numerosSorteados) {
        // Antes de conferir o resultado não existe "acertos" pra ordenar
        // por — mostra do cartão com MAIS dezenas pro com menos (o
        // rótulo "Cota · N números" de cada cartão é exatamente esse
        // critério, então a lista fica visivelmente em ordem). Em caso de
        // empate na quantidade, desempata pelas próprias dezenas
        // (crescente, posição a posição). Depois que o resultado é
        // conferido, quem chama esta função sempre passa
        // numerosSorteados — cai no ramo de baixo, que não muda em nada
        // (melhor resultado primeiro, como sempre).
        return [...cartoesLista].sort((a, b) => {
            const na = a.numeros, nb = b.numeros;
            if (nb.length !== na.length) return nb.length - na.length;
            const len = na.length;
            for (let i = 0; i < len; i++) {
                if (na[i] !== nb[i]) return na[i] - nb[i];
            }
            return 0;
        });
    }

    return [...cartoesLista].sort((a, b) => {
        const acertosA = a.numeros.filter(n => numerosSorteados.includes(n)).length;
        const acertosB = b.numeros.filter(n => numerosSorteados.includes(n)).length;
        if (acertosB !== acertosA) return acertosB - acertosA;
        if (trevosSorteados) {
            const trevosA = (a.trevos || []).filter(t => trevosSorteados.includes(t)).length;
            const trevosB = (b.trevos || []).filter(t => trevosSorteados.includes(t)).length;
            return trevosB - trevosA;
        }
        return 0;
    });
}

// ============================================
// CONTAGEM DE PRÊMIOS — aposta múltipla vale VÁRIAS apostas simples
// ============================================
// Um cartão com mais números que o mínimo da loteria (ex.: 8 números na
// Mega, em vez de 6) é uma "aposta múltipla": na prática, equivale a
// C(qtdNumeros, k) apostas simples jogadas de uma vez (k = tamanho da
// aposta simples — 6 na Mega, 5 na Quina, 15 na Lotofácil), exatamente
// como a Caixa paga de verdade. Contar "1 cartão = 1 prêmio" (como este
// código fazia antes) subestima o prêmio real: um cartão de 8 números
// da Mega com 4 acertos não vale 1 quadra, vale C(4,4)×C(4,2) = 6
// quadras — e ainda esconde 16 ternos e 6 duques no mesmo cartão, que
// antes nem apareciam. Pra um cartão do tamanho mínimo (o caso mais
// comum), a fórmula devolve exatamente 1 prêmio na faixa dos acertos,
// igual ao comportamento antigo.
function contarPremiosPorFaixa(qtdNumeros, acertos, k) {
    const porFaixa = {};
    const jMin = Math.max(0, k - (qtdNumeros - acertos));
    const jMax = Math.min(acertos, k);
    for (let j = jMin; j <= jMax; j++) {
        porFaixa[j] = combinacao(acertos, j) * combinacao(qtdNumeros - acertos, k - j);
    }
    return porFaixa;
}

// +Milionária: as 10 faixas oficiais combinam acertos de NÚMEROS (até 6)
// com acertos de TREVO (até 2) — confirmado contra fontes externas (não
// achei a tabela no site oficial da Caixa, só em reportagens, mas as 10
// faixas batem entre elas): 6+2t, 6+(1 ou 0)t, 5+2t, 5+(1 ou 0)t,
// 4+2t, 4+(1 ou 0)t, 3+2t, 3+1t, 2+2t, 2+1t. Importante: 3 ou 2 números
// com ZERO trevo não ganha nada (diferente das faixas 6/5/4, que pagam
// mesmo sem trevo) — essa assimetria é real, não erro de digitação.
function tierChaveMilionaria(acertosNum, acertosTrevo) {
    if (acertosNum === 6) return acertosTrevo === 2 ? 'n6t2' : 'n6t';
    if (acertosNum === 5) return acertosTrevo === 2 ? 'n5t2' : 'n5t';
    if (acertosNum === 4) return acertosTrevo === 2 ? 'n4t2' : 'n4t';
    if (acertosNum === 3) return acertosTrevo === 2 ? 'n3t2' : (acertosTrevo === 1 ? 'n3t1' : null);
    if (acertosNum === 2) return acertosTrevo === 2 ? 'n2t2' : (acertosTrevo === 1 ? 'n2t1' : null);
    return null;
}

function calcularPremiosMilionaria(cartoesLista, numerosSorteados, trevosSorteados) {
    const somaFaixas = { n6t2:0, n6t:0, n5t2:0, n5t:0, n4t2:0, n4t:0,
                          n3t2:0, n3t1:0, n2t2:0, n2t1:0 };
    cartoesLista.forEach(cartao => {
        const trevosCartao = cartao.trevos || [];
        const acertosNum = cartao.numeros.filter(n => numerosSorteados.includes(n)).length;
        const acertosTrevo = trevosCartao.filter(t => trevosSorteados.includes(t)).length;
        const faixasNum = contarPremiosPorFaixa(cartao.numeros.length, acertosNum, 6);
        // Mesma função genérica, aplicada aos trevos (k=2 em vez de 6) —
        // reaproveita exatamente a mesma matemática de aposta múltipla.
        const faixasTrevo = contarPremiosPorFaixa(trevosCartao.length, acertosTrevo, 2);
        for (const [jNumStr, qtdNum] of Object.entries(faixasNum)) {
            for (const [jTrevoStr, qtdTrevo] of Object.entries(faixasTrevo)) {
                const chave = tierChaveMilionaria(Number(jNumStr), Number(jTrevoStr));
                if (chave) somaFaixas[chave] += qtdNum * qtdTrevo;
            }
        }
    });
    return somaFaixas;
}

// Grade de 8 itens (não os 10 oficiais) — pedido do usuário: as 2 faixas
// de 2 números (2N+2T/2N+1T) pagam muito pouco e só poluíam o resumo;
// mostrar a partir de 3 números já cobre tudo que realmente importa
// destacar. calcularPremiosMilionaria continua calculando as 10 faixas
// certinho (nada muda nos valores) — só essas 2 somem da TELA.
function gerarResumoPremiosMilionaria(premios) {
    const itens = [
        ['n6t2', '6N+2T', '#f59e0b'], ['n6t', '6N+1T/0T', '#eab308'],
        ['n5t2', '5N+2T', '#f97316'], ['n5t', '5N+1T/0T', '#a855f7'],
        ['n4t2', '4N+2T', '#8b5cf6'], ['n4t', '4N+1T/0T', '#3b82f6'],
        ['n3t2', '3N+2T', '#06b6d4'], ['n3t1', '3N+1T', '#10b981'],
    ];
    return itens.map(([chave, rotulo, cor]) =>
        `<div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:${cor}">${premios[chave] || 0}</div><div class="resultado-resumo-label">${rotulo}</div></div>`
    ).join('');
}

// trevosSorteados só é usado (e obrigatório) pra +Milionária.
function calcularPremios(cartoesLista, numerosSorteados, loteria, trevosSorteados = null) {
    if (loteria === 'maismilionaria') {
        return calcularPremiosMilionaria(cartoesLista, numerosSorteados, trevosSorteados || []);
    }
    const k = LOTERIA_K[loteria] || 5;
    const somaFaixas = { sena:0, quina:0, quadra:0, terno:0, duque:0,
                          pontos15:0, pontos14:0, pontos13:0, pontos12:0, pontos11:0 };
    const nomesPorJ = loteria === 'lotofacil'
        ? { 15:'pontos15', 14:'pontos14', 13:'pontos13', 12:'pontos12', 11:'pontos11' }
        : { 6:'sena', 5:'quina', 4:'quadra', 3:'terno', 2:'duque' };

    cartoesLista.forEach(cartao => {
        const acertos = cartao.numeros.filter(n => numerosSorteados.includes(n)).length;
        const faixas = contarPremiosPorFaixa(cartao.numeros.length, acertos, k);
        for (const [j, qtd] of Object.entries(faixas)) {
            const nome = nomesPorJ[j];
            if (nome) somaFaixas[nome] += qtd;
        }
    });
    return somaFaixas;
}

// Nota exibida sob o resumo de prêmios só quando existe pelo menos um
// cartão com mais números que o mínimo da loteria — sem isso, os
// números de SENA/QUINA/QUADRA/etc. batem exatamente com a contagem de
// cartões (1 cartão = 1 prêmio) e a nota seria só ruído.
function notaApostaMultiplaHtml(cartoesLista, loteria) {
    const k = LOTERIA_K[loteria] || 5;
    const trevoCfg = LOTERIA_TREVOS[loteria];
    const temMultiplaNum = cartoesLista.some(c => c.numeros.length > k);
    const temMultiplaTrevo = trevoCfg && cartoesLista.some(c => (c.trevos || []).length > trevoCfg.k);
    if (!temMultiplaNum && !temMultiplaTrevo) return '';
    const extra = temMultiplaTrevo
        ? ` (e cartões com mais de ${trevoCfg.k} trevos valem várias apostas simples também, na combinação de trevo)`
        : '';
    return `<div style="font-size: 11px; color: #64748b; text-align: center; margin: -6px 0 14px;">
        💡 Cartões com mais de ${k} números valem várias apostas simples${extra} — os números acima contam <strong>prêmios</strong>, não cartões.
    </div>`;
}

// ============================================
// BANNER DE TROFÉU (melhor resultado do bolão selecionado)
// ============================================
// acertosTrevo só é usado (e só faz sentido) pra +Milionária — as faixas
// de prêmio reais combinam números com trevo, ver calcularPremiosMilionaria.
function nomeNivelAcerto(loteria, acertos, acertosTrevo = null) {
    if (loteria === 'lotofacil') return `${acertos} PONTOS`;
    if (loteria === 'maismilionaria') {
        const sufixoTrevo = acertosTrevo === null ? '' :
            (acertosTrevo >= 2 ? ' + 2 TREVOS' : (acertosTrevo === 1 ? ' + 1 TREVO' : ''));
        return `${acertos} NÚMEROS${sufixoTrevo}`;
    }
    const nomes = { 6: 'SENA', 5: 'QUINA', 4: 'QUADRA' };
    return nomes[acertos] || `${acertos} ACERTOS`;
}

// Só acende para resultados realmente notáveis (quadra+ na Mega/Quina,
// 13+ pontos na Lotofácil, 4+ números na +Milionária) — faixas menores
// são comuns demais pra virar comemoração, banalizaria o destaque.
// trevosSorteados/melhorAcertosTrevo só entram pra +Milionária.
function gerarBannerTrofeu(melhorCartao, melhorAcertos, loteria, numerosSorteados, trevosSorteados = null, melhorAcertosTrevo = 0) {
    if (!melhorCartao || !melhorAcertos) return '';
    const piso = loteria === 'lotofacil' ? 13 : 4;
    if (melhorAcertos < piso) return '';

    const nivel = nomeNivelAcerto(loteria, melhorAcertos, loteria === 'maismilionaria' ? melhorAcertosTrevo : null);
    // Número batido (⭐ + dourado) vs número do cartão que não saiu —
    // antes os 8 (ou mais) números do cartão apareciam todos iguais,
    // sem dar pra ver de cara QUAIS bateram.
    const numerosHtml = melhorCartao.numeros
        .map(n => {
            const bateu = numerosSorteados && numerosSorteados.includes(n);
            const bg = bateu ? '#f59e0b' : '#2e7d32';
            const estrela = bateu ? '⭐' : '';
            return `<span style="font-family:monospace;font-size:12px;font-weight:800;background:${bg};color:white;border-radius:8px;padding:6px 8px;min-width:26px;text-align:center;display:inline-block;box-shadow:0 2px 4px rgba(0,0,0,0.15);">${estrela}${n.toString().padStart(2, '0')}</span>`;
        })
        .join('');

    // +Milionária: chips dos trevos do melhor cartão, mesmo esquema visual
    // dos números (dourado+⭐ = trevo batido).
    const trevosHtml = (loteria === 'maismilionaria' && melhorCartao.trevos && melhorCartao.trevos.length)
        ? melhorCartao.trevos.map(t => {
            const bateu = trevosSorteados && trevosSorteados.includes(t);
            const bg = bateu ? '#f59e0b' : '#16a34a';
            const estrela = bateu ? '⭐' : '';
            return `<span style="font-family:monospace;font-size:12px;font-weight:800;background:${bg};color:white;border-radius:50%;padding:6px 9px;min-width:14px;text-align:center;display:inline-block;box-shadow:0 2px 4px rgba(0,0,0,0.15);">${estrela}🍀${t}</span>`;
        }).join('')
        : '';

    // Cartão com mais números que o mínimo da loteria (aposta múltipla)
    // vale VÁRIAS apostas simples na mesma faixa de prêmio — 4 acertos
    // num cartão de 8 números não é "1 quadra", é uma pra cada
    // combinação de 6 que cobre exatamente esses 4 acertos. Deixa isso
    // explícito aqui, no cartão que mais chamou atenção, pra não parecer
    // que o resumo abaixo (que já soma isso certo) "inventou" números.
    const k = LOTERIA_K[loteria] || 5;
    let notaMultipla = '';
    if (melhorCartao.numeros.length > k) {
        const faixas = contarPremiosPorFaixa(melhorCartao.numeros.length, melhorAcertos, k);
        const qtdNesseNivel = faixas[melhorAcertos] || 0;
        if (qtdNesseNivel > 1) {
            notaMultipla = `
                <div style="margin-top: 8px; font-size: 11px; color: #92400e; background: rgba(245,158,11,0.12); border-radius: 8px; padding: 6px 8px;">
                    💡 Cartão de ${melhorCartao.numeros.length} números (aposta múltipla) = várias apostas simples de uma vez.
                    Esses ${melhorAcertos} acertos valem <strong>${qtdNesseNivel}× ${nivel}</strong>, não só 1.
                </div>`;
        }
    }

    return `
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #ffffff 55%); border: 2px solid #f59e0b; border-radius: 16px; padding: 14px; margin-bottom: 12px;">
            <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #92400e; margin-bottom: 6px;">🎉 Melhor resultado do concurso</div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="font-size: 30px; line-height: 1;">🏆</div>
                <div>
                    <strong style="display: block; font-size: 15px; color: #78350f;">${melhorCartao.bolao || 'Bolão'} bateu ${nivel}!</strong>
                    <span style="font-size: 11px; color: #92400e;">${melhorAcertos} números certos neste cartão</span>
                </div>
            </div>
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">${numerosHtml}</div>
            ${trevosHtml ? `<div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px;">${trevosHtml}</div>` : ''}
            ${notaMultipla}
        </div>
    `;
}

function limparEstadoCompleto() {
    console.log('🧹 Limpando estado completo...');
    ultimoResultadoConcurso = null;
    ultimoResultadoDados = null;
    
    const resultadosArea = document.getElementById('resultadosArea');
    if (resultadosArea) {
        resultadosArea.innerHTML = '<div class="empty-state">⏳ Aguardando o resultado deste concurso</div>';
    }

    const cartoesArea = document.getElementById('cartoesArea');
    if (cartoesArea && !cartoesArea.innerHTML.includes('Carregando')) {
        if (!cartoesArea.innerHTML.includes('Carregando')) {
            cartoesArea.innerHTML = '<div class="empty-state">📋 Selecione um concurso para ver os cartões</div>';
        }
    }

    const potencialArea = document.getElementById('potencialArea');
    if (potencialArea) potencialArea.innerHTML = '';
}

// ========== EXIBIR RESULTADO SALVO COM FILTRO POR BOLÃO E ESTATÍSTICAS SEPARADAS ==========
async function exibirResultadoSalvo(loteria, concurso, numerosSorteados) {
    console.log('📢 exibirResultadoSalvo executando...');
    const area = document.getElementById('resultadosArea');
    if (!area) return;
    
    const bolaoSelect = document.getElementById('bolaoSelect');
    const bolaoFiltro = bolaoSelect ? bolaoSelect.value : 'todos';
    
    showLoading('Carregando resultado...');
    
    try {
        let query = db.collection('cartoes')
            .where('tipo', '==', loteria)
            .where('concurso', '==', concurso);

        const [snapshot, trevosSorteados] = await Promise.all([
            query.get(),
            buscarTrevosConferidos(loteria, concurso)
        ]);

        const cartoesFiltrados = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d && d.numeros) {
                const bolao = d.bolao || 'Sem Bolão';
                if (bolaoFiltro !== 'todos' && bolao !== bolaoFiltro) {
                    return;
                }
                cartoesFiltrados.push({
                    numeros: d.numeros,
                    trevos: d.trevos || null,
                    bolao: bolao,
                    tipoParticipacao: d.tipoParticipacao || 'exclusivo'
                });
            }
        });

        if (cartoesFiltrados.length === 0) {
            area.innerHTML = `<div class="empty-state">📋 Nenhum cartão encontrado para este bolão</div>`;
            hideLoading();
            return;
        }

        const cartoesOrdenados = ordenarCartoesPorAcertos(cartoesFiltrados, numerosSorteados, trevosSorteados);
        const chancesHtml = calcularChancesBolao(cartoesFiltrados, loteria);

        const premios = calcularPremios(cartoesOrdenados, numerosSorteados, loteria, trevosSorteados);

        const melhorCartaoSalvo = cartoesOrdenados[0];
        const melhorAcertosSalvo = melhorCartaoSalvo ? melhorCartaoSalvo.numeros.filter(n => numerosSorteados.includes(n)).length : 0;
        const melhorAcertosTrevoSalvo = (melhorCartaoSalvo && trevosSorteados)
            ? (melhorCartaoSalvo.trevos || []).filter(t => trevosSorteados.includes(t)).length : 0;

        // Os números sorteados NÃO aparecem mais aqui — pedido do usuário
        // é vê-los bem PERTO do primeiro cartão (o que mais acertou), não
        // só "no início do resumo". Como #resultadosArea (este bloco) fica
        // antes de #cartoesArea na página (ver index.html) mas ainda não é
        // adjacente ao cartão em si, o bloco de números é injetado direto
        // em #cartoesArea, logo acima do primeiro cartão da lista ordenada
        // — ver mostrarCartoes(). Aqui mostra só o resumo (troféu/potencial/
        // prêmios), sem duplicar os números.
        let html = gerarBannerTrofeu(melhorCartaoSalvo, melhorAcertosSalvo, loteria, numerosSorteados, trevosSorteados, melhorAcertosTrevoSalvo);
        html += chancesHtml;
        html += `<div class="resultado-resumo">`;

        if (loteria === 'mega') {
            html += `
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#f59e0b">${premios.sena}</div><div class="resultado-resumo-label">SENA</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#eab308">${premios.quina}</div><div class="resultado-resumo-label">QUINA</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#a855f7">${premios.quadra}</div><div class="resultado-resumo-label">QUADRA</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#3b82f6">${premios.terno}</div><div class="resultado-resumo-label">TERNO</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#64748b">${premios.duque}</div><div class="resultado-resumo-label">DUQUE</div></div>`;
        } else if (loteria === 'lotofacil') {
            html += `
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#f59e0b">${premios.pontos15}</div><div class="resultado-resumo-label">15 PTS</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#eab308">${premios.pontos14}</div><div class="resultado-resumo-label">14 PTS</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#a855f7">${premios.pontos13}</div><div class="resultado-resumo-label">13 PTS</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#3b82f6">${premios.pontos12}</div><div class="resultado-resumo-label">12 PTS</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#64748b">${premios.pontos11}</div><div class="resultado-resumo-label">11 PTS</div></div>`;
        } else if (loteria === 'maismilionaria') {
            html += gerarResumoPremiosMilionaria(premios);
        } else {
            html += `
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#f59e0b">${premios.quina}</div><div class="resultado-resumo-label">QUINA</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#a855f7">${premios.quadra}</div><div class="resultado-resumo-label">QUADRA</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#3b82f6">${premios.terno}</div><div class="resultado-resumo-label">TERNO</div></div>
                <div class="resultado-resumo-item"><div class="resultado-resumo-numero" style="color:#64748b">${premios.duque}</div><div class="resultado-resumo-label">DUQUE</div></div>`;
        }
        html += `<div class="resultado-resumo-item"><div class="resultado-resumo-numero">${cartoesOrdenados.length}</div><div class="resultado-resumo-label">CARTÕES</div></div>`;
        html += `</div>`;
        html += notaApostaMultiplaHtml(cartoesOrdenados, loteria);

        html += `<button id="btnWhatsAppResultado" style="background:#25D366; width:100%; padding:12px; border-radius:30px; margin-bottom:20px; font-weight:bold;">📱 COMPARTILHAR RESULTADO NO WHATSAPP</button>`;
        html += `<div class="aviso-conferido" style="background: #d1fae5; padding: 8px; border-radius: 12px; text-align: center; font-size: 12px; color: #065f46; margin-top: 10px;">
                    ✅ Resultado já conferido anteriormente
                </div>`;

        // Números sorteados logo aqui — bem acima do primeiro cartão da
        // lista abaixo (cartoesOrdenados[0] = o que mais acertou, ver
        // ordenarCartoesPorAcertos). Essa lista é renderizada INLINE
        // dentro deste mesmo bloco (não em #cartoesArea, que fica sem uso
        // neste fluxo de "resultado já salvo") — por isso entram aqui
        // dentro, não no topo do resumo lá em cima.
        html += `<div class="numeros-sorteados-titulo">🎱 Números Sorteados</div>`;
        html += `<div class="numeros-sorteados" id="numerosSorteadosLista">${numerosSorteados.map(n => `<div class="numero-sorteado-card" id="sorteado-${n}">${n.toString().padStart(2,'0')}</div>`).join('')}</div>`;
        if (loteria === 'maismilionaria' && trevosSorteados) {
            html += `<div class="numeros-sorteados-titulo">🍀 Trevos Sorteados</div>`;
            html += `<div class="numeros-sorteados">${trevosSorteados.map(t => `<div class="numero-sorteado-card" style="background:#16a34a;">${t}</div>`).join('')}</div>`;
        }

        let _indiceCartao = -1;
        for (const cartao of cartoesOrdenados) {
            _indiceCartao++;
            const acertos = cartao.numeros.filter(n => numerosSorteados.includes(n)).length;
            const acertosTrevo = (loteria === 'maismilionaria' && trevosSorteados)
                ? (cartao.trevos || []).filter(t => trevosSorteados.includes(t)).length : null;
            let corAcertos;
            if (loteria === 'mega' || loteria === 'maismilionaria') {
                if (acertos >= 6) corAcertos = '#f59e0b';
                else if (acertos === 5) corAcertos = '#eab308';
                else if (acertos === 4) corAcertos = '#a855f7';
                else if (acertos === 3) corAcertos = '#3b82f6';
                else corAcertos = '#cbd5e1';
            } else {
                if (acertos >= 5) corAcertos = '#f59e0b';
                else if (acertos === 4) corAcertos = '#eab308';
                else if (acertos === 3) corAcertos = '#a855f7';
                else corAcertos = '#cbd5e1';
            }

            const tipoParticipacao = (cartao.tipoParticipacao === 'cota' ? '🎟️ Cota' : '👥 Exclusivo')
                + ` · ${cartao.numeros.length} números`
                + (cartao.trevos ? ` + ${cartao.trevos.length} trevos` : '');

            const rotuloAcertos = acertosTrevo === null ? `${acertos} acertos` : `${acertos} núm + ${acertosTrevo} trevo${acertosTrevo === 1 ? '' : 's'}`;

            // id no número só do MELHOR cartão (índice 0, o primeiro da
            // lista já ordenada por acertos) — é nele que as setas de
            // "quase acertou" apontam (ver desenharSetasProximidade);
            // os outros cartões não precisam do id.
            html += `<div class="cartao-item-unificado"${_indiceCartao === 0 ? ' id="melhorCartaoContainer"' : ''}>
                        <div class="cartao-header">
                            <span class="cartao-bolao">${cartao.bolao} - ${tipoParticipacao}</span>
                            <span class="cartao-acertos" style="background:${corAcertos};">${rotuloAcertos}</span>
                        </div>
                        <div class="cartao-numeros">
                            ${cartao.numeros.map(n => {
                                const acertou = numerosSorteados.includes(n);
                                const idAttr = _indiceCartao === 0 ? ` id="cartaonum-${n}"` : '';
                                return `<span${idAttr} class="${acertou ? 'numero-acertado' : 'numero-normal'}">${n.toString().padStart(2,'0')}</span>`;
                            }).join('')}
                        </div>
                        ${cartao.trevos ? `<div class="cartao-numeros" style="margin-top:4px;">
                            ${cartao.trevos.map(t => {
                                const acertou = trevosSorteados && trevosSorteados.includes(t);
                                return `<span class="${acertou ? 'numero-acertado' : 'numero-normal'}" style="border-radius:50%;">🍀${t}</span>`;
                            }).join('')}
                        </div>` : ''}
                    </div>`;
        }

        area.innerHTML = html;

        const btnWhats = document.getElementById('btnWhatsAppResultado');
        if (btnWhats) btnWhats.addEventListener('click', compartilharWhatsApp);

        ultimoResultadoConcurso = concurso;
        ultimoResultadoDados = { numeros: numerosSorteados, trevos: trevosSorteados, premios };

        // Setas "quase acertou" — pedido do usuário, só na Mega por
        // enquanto ("na conferência da mega-sena... quando o número for
        // próximo"), focando sempre no melhor cartão (cartoesOrdenados[0]
        // — ver melhorCartaoSalvo acima). Espera o layout assentar
        // (requestAnimationFrame) antes de medir posição dos números.
        if (loteria === 'mega' && melhorCartaoSalvo) {
            requestAnimationFrame(() => desenharSetasProximidade(numerosSorteados, melhorCartaoSalvo.numeros));
        }

        console.log(`✅ Resultado exibido com ${cartoesOrdenados.length} cartões ordenados`);
    } catch (error) {
        console.error('Erro ao exibir resultado salvo:', error);
        area.innerHTML = '<div class="empty-state">❌ Erro ao carregar resultado salvo</div>';
    } finally {
        hideLoading();
    }
}

// ========== SETAS "QUASE ACERTOU" ==========
// Pedido do usuário: "na conferência da mega-sena sistema fizesse essas
// setas quando o número for próximo... focando no melhor cartão de
// todos e se o número ficar até 2 números de diferença... exemplo
// sorteou 5 e temos 7". Pra cada número sorteado que NÃO foi acerto, se
// o melhor cartão tiver um número (também sem ser acerto) a até 2 de
// distância, desenha uma seta ligando os dois — só no melhor cartão
// (cartoesOrdenados[0]), não em todos, pra não poluir a tela.
let _setasProximidadeResizeListener = null;

// Função pura (sem DOM) — fácil de testar isolada. Pra cada número
// sorteado que NÃO foi acerto, acha o número do cartão (também sem ser
// acerto) mais próximo, até 2 de distância. Casamento guloso pelo PAR
// mais próximo primeiro (não pela ordem dos números) — achado real ao
// testar: processar os sorteados em ordem crescente deixava um sorteado
// mais distante "roubar" um número do cartão de um sorteado mais
// próximo que ainda nem tinha sido considerado (ex.: sorteados [5,6] e
// cartão [7] — 5 reivindicava o 7 antes de 6 ser avaliado, mesmo o 6
// estando mais perto). Cada sorteado e cada número do cartão só entram
// em 1 par, pra não empilhar várias setas na mesma bolinha quando
// desenhado. Retorna uma lista de [sorteado, doCartao].
function calcularParesProximidade(numerosSorteados, numerosCartao) {
    const naoAcertosCartao = numerosCartao.filter(n => !numerosSorteados.includes(n));
    const naoAcertosSorteados = numerosSorteados.filter(n => !numerosCartao.includes(n));

    const candidatos = [];
    for (const sorteado of naoAcertosSorteados) {
        for (const doCartao of naoAcertosCartao) {
            const dist = Math.abs(sorteado - doCartao);
            if (dist <= 2) candidatos.push({ sorteado, doCartao, dist });
        }
    }
    // Mais próximos primeiro; desempate determinístico pelos próprios
    // números, pra não depender da ordem de iteração do objeto/array.
    candidatos.sort((a, b) => a.dist - b.dist || a.sorteado - b.sorteado || a.doCartao - b.doCartao);

    const sorteadosUsados = new Set();
    const cartaoUsados = new Set();
    const pares = [];
    for (const c of candidatos) {
        if (sorteadosUsados.has(c.sorteado) || cartaoUsados.has(c.doCartao)) continue;
        sorteadosUsados.add(c.sorteado);
        cartaoUsados.add(c.doCartao);
        pares.push([c.sorteado, c.doCartao]);
    }
    return pares;
}

function desenharSetasProximidade(numerosSorteados, numerosCartao) {
    // Remove a seta antiga (se o usuário trocar de concurso/bolão e essa
    // função rodar de novo) antes de desenhar a nova.
    const svgAntigo = document.getElementById('svgSetasProximidade');
    if (svgAntigo) svgAntigo.remove();

    const area = document.getElementById('resultadosArea');
    const container = document.getElementById('melhorCartaoContainer');
    if (!area || !container) return;

    const pares = calcularParesProximidade(numerosSorteados, numerosCartao);
    if (pares.length === 0) return;

    const areaRect = area.getBoundingClientRect();
    area.style.position = area.style.position || 'relative';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', 'svgSetasProximidade');
    svg.setAttribute('width', areaRect.width);
    svg.setAttribute('height', areaRect.height);
    svg.style.cssText = 'position:absolute; top:0; left:0; pointer-events:none; z-index:5; overflow:visible;';

    svg.innerHTML = `
        <defs>
            <marker id="setaProximidadePonta" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#991b1b"></path>
            </marker>
        </defs>`;

    let setasDesenhadas = 0;
    for (const [sorteado, doCartao] of pares) {
        const elOrigem = document.getElementById(`sorteado-${sorteado}`);
        const elDestino = document.getElementById(`cartaonum-${doCartao}`);
        if (!elOrigem || !elDestino) continue;

        const rOrigem = elOrigem.getBoundingClientRect();
        const rDestino = elDestino.getBoundingClientRect();

        const x1 = rOrigem.left + rOrigem.width / 2 - areaRect.left;
        const y1 = rOrigem.bottom - areaRect.top;
        const x2 = rDestino.left + rDestino.width / 2 - areaRect.left;
        const y2 = rDestino.top - areaRect.top;

        // Curva suave (não reta) pra ficar com a cara de "seta desenhada à
        // mão", mais próxima do exemplo que o usuário mostrou.
        const meioY = (y1 + y2) / 2;
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${meioY}, ${x2} ${meioY}, ${x2} ${y2 + 10}`);
        path.setAttribute('stroke', '#991b1b');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#setaProximidadePonta)');
        svg.appendChild(path);
        setasDesenhadas++;
    }

    if (setasDesenhadas > 0) {
        area.appendChild(svg);
    }

    // Redesenha ao redimensionar (layout responsivo pode mover os
    // números de lugar) — só 1 listener vivo por vez.
    if (_setasProximidadeResizeListener) {
        window.removeEventListener('resize', _setasProximidadeResizeListener);
    }
    _setasProximidadeResizeListener = () => desenharSetasProximidade(numerosSorteados, numerosCartao);
    window.addEventListener('resize', _setasProximidadeResizeListener);
}

// ========== MOSTRAR CARTÕES COM FILTRO POR BOLÃO ==========
// ========== MOSTRAR CARTÕES COM FILTRO POR BOLÃO E PROBABILIDADES ==========
// trevosSorteados só é relevante (e só é passado) pra +Milionária.
async function mostrarCartoes(numerosSorteados = null, trevosSorteados = null) {
    const concurso = document.getElementById('concursoSelect').value;
    const container = document.getElementById('cartoesArea');
    const potencialArea = document.getElementById('potencialArea');
    const bolaoSelect = document.getElementById('bolaoSelect');

    if (!container) return;

    if (!concurso) {
        container.innerHTML = '<div class="empty-state">📋 Selecione um concurso para ver os cartões</div>';
        if (potencialArea) potencialArea.innerHTML = '';
        return;
    }
    
    const jaConferido = await verificarResultadoConferido(loteriaAtual, concurso);
    if (jaConferido) {
        console.log('✅ Resultado já conferido, exibindo resultado salvo com marcação');
        await exibirResultadoSalvo(loteriaAtual, concurso, jaConferido);
        return;
    }
    
    const bolaoFiltro = bolaoSelect ? bolaoSelect.value : 'todos';
    
    container.innerHTML = '<div class="loading-skeleton">🔄 Carregando cartões...</div>';
    
    try {
        const snapshot = await db.collection('cartoes')
            .where('tipo', '==', loteriaAtual)
            .where('concurso', '==', concurso)
            .get();
        
        const filtrados = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d && d.numeros) {
                const bolao = d.bolao || 'Sem Bolão';
                if (bolaoFiltro !== 'todos' && bolao !== bolaoFiltro) {
                    return;
                }
                filtrados.push({
                    id: doc.id,
                    concurso: d.concurso,
                    bolao: bolao,
                    numeros: d.numeros,
                    trevos: d.trevos || null,
                    tipo: d.tipo,
                    tipoParticipacao: d.tipoParticipacao || 'exclusivo'
                });
            }
        });
        
        if (filtrados.length === 0) {
            container.innerHTML = `<div class="empty-state">📋 Nenhum cartão da ${loteriaAtual.toUpperCase()} para o concurso ${concurso} ${bolaoFiltro !== 'todos' ? 'no bolão ' + bolaoFiltro : ''}</div>`;
            if (potencialArea) potencialArea.innerHTML = '';
            return;
        }

        // --- CALCULAR PROBABILIDADES DO BOLÃO FILTRADO ---
        // Renderizado em #potencialArea, SEPARADO de #cartoesArea — pedido
        // do usuário pra o botão Conferir (entre os dois na página) aparecer
        // logo depois da probabilidade, sem precisar rolar a lista inteira
        // de cartões primeiro.
        const chancesHtml = calcularChancesBolao(filtrados, loteriaAtual);
        if (potencialArea) potencialArea.innerHTML = chancesHtml;

        // --- ORDENAR POR BOLÃO ---
        const porBolao = {};
        filtrados.forEach(c => {
            const b = c.bolao || 'Sem Bolão';
            if (!porBolao[b]) porBolao[b] = [];
            porBolao[b].push(c);
        });

        // Pedido do usuário: números sorteados bem PERTO do primeiro
        // cartão que mais acertou (ordenarCartoesPorAcertos, abaixo,
        // sempre coloca o de mais acertos primeiro) — por isso entram
        // aqui, logo antes do primeiro grupo de bolão/cartão, não lá no
        // resumo (gerarBannerTrofeu), que fica numa seção separada.
        let html = numerosSorteados ? (
            `<div class="numeros-sorteados-titulo">🎱 Números Sorteados</div>` +
            `<div class="numeros-sorteados">${numerosSorteados.map(n => `<div class="numero-sorteado-card">${n.toString().padStart(2,'0')}</div>`).join('')}</div>`
        ) : '';
        if (loteriaAtual === 'maismilionaria' && trevosSorteados) {
            html += `<div class="numeros-sorteados-titulo">🍀 Trevos Sorteados</div>` +
                `<div class="numeros-sorteados">${trevosSorteados.map(t => `<div class="numero-sorteado-card" style="background:#16a34a;">${t}</div>`).join('')}</div>`;
        }

        for (const [bolao, listaOriginal] of Object.entries(porBolao)) {
            // Cartões com mais acertos primeiro — sem isso, a ordem era a de
            // gravação no Firestore, não a de acertos.
            const lista = ordenarCartoesPorAcertos(listaOriginal, numerosSorteados, trevosSorteados);
            html += `<div style="margin-bottom:20px"><div style="background:#3b82f6;color:white;padding:8px 12px;border-radius:8px;margin-bottom:10px;">🎯 ${bolao}</div>`;
            html += `<div style="display:flex;flex-direction:column;gap:10px;">`;

            for (const cartao of lista) {
                const tipoParticipacao = (cartao.tipoParticipacao === 'cota' ? '🎟️ Cota' : '👥 Exclusivo')
                    + ` · ${cartao.numeros.length} números`
                    + (cartao.trevos ? ` + ${cartao.trevos.length} trevos` : '');
                const acertosCount = numerosSorteados ? cartao.numeros.filter(n => numerosSorteados.includes(n)).length : 0;
                const acertosTrevoCount = (trevosSorteados && cartao.trevos)
                    ? cartao.trevos.filter(t => trevosSorteados.includes(t)).length : null;
                const rotuloAcertos = acertosTrevoCount === null ? `${acertosCount} acertos`
                    : `${acertosCount} núm + ${acertosTrevoCount} trevo${acertosTrevoCount === 1 ? '' : 's'}`;

                const numsHtml = cartao.numeros.map(n => {
                    const acertou = numerosSorteados ? numerosSorteados.includes(n) : false;
                    return `<span style="background:${acertou ? '#10b981' : '#e2e8f0'};color:${acertou ? 'white' : '#333'};padding:6px 10px;border-radius:8px;font-family:monospace;font-size:12px;font-weight:${acertou ? 'bold' : 'normal'};min-width:35px;text-align:center;">${n.toString().padStart(2,'0')}</span>`;
                }).join('');
                const trevosHtmlCartao = cartao.trevos ? cartao.trevos.map(t => {
                    const acertou = trevosSorteados ? trevosSorteados.includes(t) : false;
                    return `<span style="background:${acertou ? '#10b981' : '#e2e8f0'};color:${acertou ? 'white' : '#333'};padding:6px 9px;border-radius:50%;font-family:monospace;font-size:12px;font-weight:${acertou ? 'bold' : 'normal'};min-width:14px;text-align:center;">🍀${t}</span>`;
                }).join('') : '';

                html += `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                                <span style="font-weight:bold;font-size:12px;">${tipoParticipacao}</span>
                                ${numerosSorteados ? `<span style="background:#cbd5e1;padding:4px 10px;border-radius:20px;font-size:11px;">${rotuloAcertos}</span>` : ''}
                            </div>
                            <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">${numsHtml}</div>
                            ${trevosHtmlCartao ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px;">${trevosHtmlCartao}</div>` : ''}
                        </div>`;
            }
            html += `</div></div>`;
        }
        container.innerHTML = html;

        // --- ATUALIZAR PROBABILIDADES NO TÍTULO DO CARD ---
        const cardHeader = document.getElementById('cardHeaderConferencia');
        if (cardHeader) {
            const totalCartoes = filtrados.length;
            const loteriaNome = loteriaAtual === 'mega' ? 'MEGA' : loteriaAtual === 'lotofacil' ? 'LOTOFÁCIL'
                : loteriaAtual === 'maismilionaria' ? '+MILIONÁRIA' : 'QUINA';
            cardHeader.innerHTML = `🎯 RESULTADO - ${loteriaNome} (${totalCartoes} cartões)`;
        }
        
    } catch (error) {
        console.error('Erro ao carregar cartões:', error);
        container.innerHTML = `<div class="empty-state">❌ Erro ao carregar cartões do concurso ${concurso}</div>`;
        if (potencialArea) potencialArea.innerHTML = '';
    }
}

// ========== CARREGAMENTO PRINCIPAL ==========
async function carregarDados() {
    console.log('🔄 Carregando dados otimizado...');
    dadosCarregados = false;
    
    showLoading('Carregando bolões...');
    
    try {
        const concursosSnapshot = await db.collection('cartoes').get();
        
        const ultimosConcursos = {
            mega: null,
            lotofacil: null,
            quina: null,
            maismilionaria: null
        };

        const concursosMap = { mega: [], lotofacil: [], quina: [], maismilionaria: [] };
        const boloesMap = { mega: {}, lotofacil: {}, quina: {}, maismilionaria: {} };
        
        concursosSnapshot.forEach(doc => {
            const d = doc.data();
            if (d && d.concurso && d.tipo) {
                const concursoNum = parseInt(d.concurso);
                const bolao = d.bolao || 'Sem Bolão';
                
                if (!ultimosConcursos[d.tipo] || concursoNum > ultimosConcursos[d.tipo]) {
                    ultimosConcursos[d.tipo] = concursoNum;
                }
                if (!concursosMap[d.tipo].includes(concursoNum)) {
                    concursosMap[d.tipo].push(concursoNum);
                }
                if (!boloesMap[d.tipo][concursoNum]) {
                    boloesMap[d.tipo][concursoNum] = new Set();
                }
                boloesMap[d.tipo][concursoNum].add(bolao);
            }
        });
        
        for (const loteria of ['mega', 'lotofacil', 'quina', 'maismilionaria']) {
            for (const concurso in boloesMap[loteria]) {
                boloesMap[loteria][concurso] = Array.from(boloesMap[loteria][concurso]);
            }
        }

        for (const loteria of ['mega', 'lotofacil', 'quina', 'maismilionaria']) {
            concursosMap[loteria].sort((a, b) => b - a);
        }
        
        window.ultimosConcursos = ultimosConcursos;
        window.concursosDisponiveis = concursosMap;
        window.boloesDisponiveis = boloesMap;
        
        const ultimoConcursoAtual = ultimosConcursos[loteriaAtual];
        if (ultimoConcursoAtual) {
            const cartoesSnapshot = await db.collection('cartoes')
                .where('tipo', '==', loteriaAtual)
                .where('concurso', '==', ultimoConcursoAtual.toString())
                .limit(50)
                .get();
            
            cartoes = [];
            cartoesSnapshot.forEach(doc => {
                const d = doc.data();
                if (d && d.numeros) {
                    cartoes.push({
                        id: doc.id,
                        concurso: d.concurso,
                        bolao: d.bolao || 'Sem Bolão',
                        numeros: d.numeros,
                        trevos: d.trevos || null,
                        tipo: d.tipo,
                        tipoParticipacao: d.tipoParticipacao || 'exclusivo'
                    });
                }
            });
        }
        
        try {
            const resultadosPromises = [];
            for (const [loteria, concurso] of Object.entries(ultimosConcursos)) {
                // resultados_mega/_lotofacil/_quina são coleções legado — só
                // lidas aqui, ninguém mais grava nelas. Não existe (nem faz
                // sentido criar) uma "resultados_maismilionaria": sem regra
                // no Firestore, a leitura cairia em permission-denied e
                // rejeitaria o Promise.all inteiro à toa.
                if (concurso && loteria !== 'maismilionaria') {
                    resultadosPromises.push(
                        db.collection(`resultados_${loteria}`).doc(concurso.toString()).get()
                    );
                }
            }
            const resultadosDocs = await Promise.all(resultadosPromises);
            
            resultadosMega = {};
            resultadosLotofacil = {};
            resultadosQuina = {};
            
            resultadosDocs.forEach(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    const path = doc.ref.path;
                    if (path.includes('resultados_mega')) resultadosMega[doc.id] = data.numeros;
                    else if (path.includes('resultados_lotofacil')) resultadosLotofacil[doc.id] = data.numeros;
                    else if (path.includes('resultados_quina')) resultadosQuina[doc.id] = data.numeros;
                }
            });
        } catch (e) {
            console.warn('Erro ao carregar resultados:', e);
        }
        
        const select = document.getElementById('concursoSelect');
        if (select) {
            const concursos = concursosMap[loteriaAtual] || [];
            let html = '<option value="">Selecione um concurso</option>';
            concursos.forEach(con => {
                html += `<option value="${con}">Concurso ${con}</option>`;
            });
            select.innerHTML = html;
            if (concursos.length > 0) {
                select.value = concursos[0];
            }
        }

        dadosCarregados = true;
        
        await atualizarSelectBoloesAsync();
        
        const bolaoSelect = document.getElementById('bolaoSelect');
        if (bolaoSelect && bolaoSelect.options.length > 1) {
            const ultimoIndice = bolaoSelect.options.length - 1;
            bolaoSelect.selectedIndex = ultimoIndice;
            console.log(`✅ Bolão selecionado automaticamente: ${bolaoSelect.value}`);
        }
        
        const concursoAtual = select ? select.value : null;
        
        if (concursoAtual && dadosCarregados) {
            const resultadoConferido = await verificarResultadoConferido(loteriaAtual, concursoAtual);
            if (resultadoConferido) {
                console.log('🎯 Resultado conferido encontrado! Exibindo direto...');
                await exibirResultadoSalvo(loteriaAtual, concursoAtual, resultadoConferido);
            } else {
                await mostrarCartoes();
            }
        } else {
            await mostrarCartoes();
        }
        
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                carregarBolaoAtivo().catch(e => console.warn(e));
                carregarBolaoAberto().catch(e => console.warn(e));
            });
        } else {
            setTimeout(() => {
                carregarBolaoAtivo().catch(e => console.warn(e));
                carregarBolaoAberto().catch(e => console.warn(e));
            }, 500);
        }

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('❌ Erro ao carregar dados. Recarregue a página.', 'error');
    } finally {
        setTimeout(() => hideLoading(), 500);
    }
}

// ========== ATUALIZAR SELECT DE BOLÕES (VERSÃO ASSÍNCRONA) ==========
async function atualizarSelectBoloesAsync() {
    const select = document.getElementById('bolaoSelect');
    if (!select) return;
    
    const concurso = document.getElementById('concursoSelect').value;
    if (!concurso) {
        select.innerHTML = '<option value="todos">Todos os bolões</option>';
        return;
    }
    
    try {
        const snapshot = await db.collection('cartoes')
            .where('tipo', '==', loteriaAtual)
            .where('concurso', '==', concurso)
            .get();
        
        const boloesSet = new Set();
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d && d.bolao) {
                boloesSet.add(d.bolao);
            }
        });
        
        const boloesLista = Array.from(boloesSet);
        let html = '<option value="todos">Todos os bolões</option>';
        for (const bolao of boloesLista) {
            html += `<option value="${bolao}">${bolao}</option>`;
        }
        select.innerHTML = html;
        console.log(`✅ ${boloesLista.length} bolões carregados para ${loteriaAtual} concurso ${concurso}`);
        
        if (boloesLista.length > 0) {
            select.value = boloesLista[boloesLista.length - 1];
        }
        
    } catch (error) {
        console.error('Erro ao buscar bolões:', error);
        select.innerHTML = '<option value="todos">Todos os bolões</option>';
    }
}

function atualizarSelectConcursos() {
    const concursosDisponiveis = window.concursosDisponiveis || {};
    const concursos = concursosDisponiveis[loteriaAtual] || [];
    
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
    }
}

// ========== TROCAR LOTERIA ==========
async function setLoteria(loteria) {
    if (loteriaAtual === loteria) return;
    
    console.log(`🔄 Trocando loteria de ${loteriaAtual} para ${loteria}`);
    loteriaAtual = loteria;
    
    const btnMega = document.getElementById('btnMegaSena');
    const btnLoto = document.getElementById('btnLotofacil');
    const btnQuina = document.getElementById('btnQuina');
    const btnMilionaria = document.getElementById('btnMaisMilionaria');

    btnMega.classList.remove('active');
    btnLoto.classList.remove('active');
    btnQuina.classList.remove('active');
    if (btnMilionaria) btnMilionaria.classList.remove('active');

    if (loteria === 'mega') {
        btnMega.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🎯 RESULTADO - MEGA';
    } else if (loteria === 'lotofacil') {
        btnLoto.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🎯 RESULTADO - LOTOFÁCIL';
    } else if (loteria === 'maismilionaria') {
        if (btnMilionaria) btnMilionaria.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🎯 RESULTADO - +MILIONÁRIA';
    } else {
        btnQuina.classList.add('active');
        document.getElementById('cardHeaderConferencia').innerHTML = '🎯 RESULTADO - QUINA';
    }
    
    limparEstadoCompleto();
    
    atualizarSelectConcursos();
    
    const select = document.getElementById('concursoSelect');
    const concursoAtual = select ? select.value : null;
    
    if (concursoAtual) {
        await atualizarSelectBoloesAsync();
        
        const bolaoSelect = document.getElementById('bolaoSelect');
        if (bolaoSelect && bolaoSelect.options.length > 1) {
            const ultimoIndice = bolaoSelect.options.length - 1;
            bolaoSelect.selectedIndex = ultimoIndice;
            console.log(`✅ Bolão selecionado automaticamente: ${bolaoSelect.value}`);
        }
        
        const resultadoConferido = await verificarResultadoConferido(loteriaAtual, concursoAtual);
        if (resultadoConferido) {
            await exibirResultadoSalvo(loteriaAtual, concursoAtual, resultadoConferido);
        } else {
            await mostrarCartoes();
        }
    } else {
        await mostrarCartoes();
    }
    
    const nomeToast = loteria === 'mega' ? 'MEGA' : loteria === 'lotofacil' ? 'LOTOFÁCIL'
        : loteria === 'maismilionaria' ? '+MILIONÁRIA' : 'QUINA';
    showToast(`🔄 Mudou para ${nomeToast}`, 'info');
}

// ========== APLICAR SELEÇÃO VINDA DA URL (link "Ver Cartões" da
// consulta "Meus Bolões") ==========
// Ex.: index.html?loteria=mega&concurso=2830&bolao=Mega%20da%20Virada
// Roda depois que carregarDados() já deixou tudo com os padrões
// (loteria mega, concurso mais recente, algum bolão) — aqui só
// sobrescreve pro que veio na URL, reaproveitando os mesmos selects e
// funções de carregamento que o usuário usaria clicando manualmente.
async function aplicarSelecaoDaUrl() {
    const params = new URLSearchParams(window.location.search);
    const loteriaParam = params.get('loteria');
    const concursoParam = params.get('concurso');
    const bolaoParam = params.get('bolao');
    if (!loteriaParam && !concursoParam && !bolaoParam) return;

    if (loteriaParam && ['mega', 'lotofacil', 'quina', 'maismilionaria'].includes(loteriaParam)) {
        await setLoteria(loteriaParam);
    }

    const concursoSelect = document.getElementById('concursoSelect');
    if (concursoParam && concursoSelect) {
        const existe = Array.from(concursoSelect.options).some(o => o.value === concursoParam);
        if (existe) {
            concursoSelect.value = concursoParam;
            await atualizarSelectBoloesAsync();
        } else {
            console.warn(`⚠️ Concurso ${concursoParam} (da URL) não encontrado nas opções disponíveis.`);
        }
    }

    const bolaoSelect = document.getElementById('bolaoSelect');
    if (bolaoParam && bolaoSelect) {
        const existe = Array.from(bolaoSelect.options).some(o => o.value === bolaoParam);
        if (existe) {
            bolaoSelect.value = bolaoParam;
        } else {
            console.warn(`⚠️ Bolão "${bolaoParam}" (da URL) não encontrado — mantendo seleção padrão.`);
            showToast('Não achamos esse bolão automaticamente — selecione abaixo.', 'warning');
        }
    }

    const concursoAtual = concursoSelect ? concursoSelect.value : null;
    if (concursoAtual) {
        const resultadoConferido = await verificarResultadoConferido(loteriaAtual, concursoAtual);
        if (resultadoConferido) {
            await exibirResultadoSalvo(loteriaAtual, concursoAtual, resultadoConferido);
        } else {
            await mostrarCartoes();
        }
    }

    // Veio de outra página — leva o olhar direto pro card de
    // cartões/conferência em vez de deixar no topo da hero.
    const cardConferencia = document.getElementById('cardHeaderConferencia');
    if (cardConferencia) {
        cardConferencia.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// buscarResultadoInterno()/conferirResultados() foram removidas (pedido
// do usuário: "eu que confiro no admin... então não tem que ter botão
// de conferência no index"). A busca na API da Caixa + gravação em
// resultados_conferidos agora só acontece no admin.html
// (conferirComoAdmin, admin.js) — o site público só LÊ o que já foi
// conferido (verificarResultadoConferido/exibirResultadoSalvo), nunca
// grava nada. Ver firestore.rules: resultados_conferidos (create).
function compartilharWhatsApp() {
    if (!ultimoResultadoConcurso || !ultimoResultadoDados) {
        showToast('⚠️ Nenhum resultado para compartilhar', 'warning');
        return;
    }
    const { numeros, trevos, dataSorteio, premios } = ultimoResultadoDados;
    const linha = '──────────';
    let loteriaNome = loteriaAtual === 'mega' ? 'MEGA-SENA' : (loteriaAtual === 'lotofacil' ? 'LOTOFÁCIL'
        : loteriaAtual === 'maismilionaria' ? '+MILIONÁRIA' : 'QUINA');

    let msg = `*🏆 RESULTADO - ${loteriaNome}* 🎲\n🏆 Rumo ao Grande Prêmio!\n${linha}\n📌 Concurso: ${ultimoResultadoConcurso}\n🎯 Números Sorteados:\n   ${numeros.join(' - ')}\n`;
    if (loteriaAtual === 'maismilionaria' && trevos) {
        msg += `🍀 Trevos Sorteados:\n   ${trevos.join(' - ')}\n`;
    }
    
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
    } else if (loteriaAtual === 'maismilionaria') {
        // Achado real do usuário: a mensagem só listava as 6 faixas de
        // cima (4 a 6 números) — as 4 de baixo (3 e 2 números) também são
        // faixas de prêmio REAIS da Caixa (valor fixo, R$50/R$24/R$12/R$6),
        // só que só pagam combinadas com trevo (0 trevo não premia nessas
        // 2 faixas — ver tierChaveMilionaria). Completo com as 10, igual
        // já mostra no resumo do site (gerarResumoPremiosMilionaria).
        msg += `   ✨ 6N+2Trevos: ${premios.n6t2}\n   ✨ 6N+Trevo: ${premios.n6t}\n   ✨ 5N+2Trevos: ${premios.n5t2}\n   ✅ 5N+Trevo: ${premios.n5t}\n   ✅ 4N+2Trevos: ${premios.n4t2}\n   ✅ 4N+Trevo: ${premios.n4t}\n   🍀 3N+2Trevos: ${premios.n3t2}\n   🍀 3N+1Trevo: ${premios.n3t1}\n   🍀 2N+2Trevos: ${premios.n2t2}\n   🍀 2N+1Trevo: ${premios.n2t1}\n\n`;
        if (premios.n6t2 > 0) msg += `🎉🎉🎉 6 NÚMEROS + 2 TREVOS! PARABÉNS! 🎉🎉🎉\n`;
        else if (premios.n6t > 0) msg += `🎉🎉🎉 SENA! PARABÉNS! 🎉🎉🎉\n`;
        else if (premios.n5t2 > 0 || premios.n5t > 0) msg += `⭐ Quina! Quase lá!\n`;
        else if (premios.n4t2 > 0 || premios.n4t > 0) msg += `⚠️ Quadra! Estamos no caminho certo!\n`;
        else if (premios.n3t2 > 0 || premios.n3t1 > 0 || premios.n2t2 > 0 || premios.n2t1 > 0) msg += `🍀 Prêmio garantido nas faixas de 2 ou 3 números com trevo!\n`;
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
        
        boloesAtivos.sort((a, b) => {
            const statusA = statusMap[a.id] || 'andamento';
            const statusB = statusMap[b.id] || 'andamento';
            const tituloA = (a.data.titulo || '').toLowerCase();
            const tituloB = (b.data.titulo || '').toLowerCase();
            
            if (statusA === 'aberto' && statusB !== 'aberto') return -1;
            if (statusA !== 'aberto' && statusB === 'aberto') return 1;
            if (tituloA < tituloB) return -1;
            if (tituloA > tituloB) return 1;
            return 0;
        });
        
        card.style.display = 'block';
        let html = '';
        
        for (const bolao of boloesAtivos) {
            const participantes = bolao.data.participantes || [];
            const pessoasQuitadas = participantes.filter(p => p.situacao === 'quitado' || p.situacao === 'pago');
            const totalPessoasQuitadas = pessoasQuitadas.length;
            const pessoasEmAndamento = participantes.filter(p => p.situacao !== 'quitado' && p.situacao !== 'pago');
            const totalPessoasEmAndamento = pessoasEmAndamento.length;
            const totalPessoas = participantes.length;
            
            const totalCotasQuitadas = pessoasQuitadas.reduce((acc, p) => acc + (p.quantidadeCotas || 1), 0);
            const totalCotasEmAndamento = pessoasEmAndamento.reduce((acc, p) => acc + (p.quantidadeCotas || 1), 0);
            const totalCotas = participantes.reduce((acc, p) => acc + (p.quantidadeCotas || 1), 0);
            
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
                            <span>🎯</span> ${escapeHtml(bolao.data.titulo)}
                        </div>
                        <div class="bolao-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="bolao-body">
                        <div class="bolao-info">
                            <div class="bolao-valor">💰 R$ ${(bolao.data.valorPorCota || 0).toFixed(2).replace('.', ',')} <span style="font-size:12px;">/ cota</span></div>
                            ${dataTexto}
                        </div>
                        
                        <div style="margin-top: 8px; font-size: 12px; font-weight: bold; color: #475569;">👥 PESSOAS</div>
                        <div class="bolao-stats" style="margin-top: 4px;">
                            <div class="stat-item">
                                <div class="stat-number quitado">${totalPessoasQuitadas}</div>
                                <div class="stat-label">✅ QUITADOS</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number andamento">${totalPessoasEmAndamento}</div>
                                <div class="stat-label">⏳ EM ANDAMENTO</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${totalPessoas}</div>
                                <div class="stat-label">👥 TOTAL</div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 12px; font-size: 12px; font-weight: bold; color: #475569;">🎟️ COTAS</div>
                        <div class="bolao-stats" style="margin-top: 4px;">
                            <div class="stat-item">
                                <div class="stat-number quitado" style="color: #10b981;">${totalCotasQuitadas}</div>
                                <div class="stat-label">✅ QUITADAS</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number andamento" style="color: #f59e0b;">${totalCotasEmAndamento}</div>
                                <div class="stat-label">⏳ EM ANDAMENTO</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number" style="color: #3b82f6;">${totalCotas}</div>
                                <div class="stat-label">🎟️ TOTAL</div>
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
                                    <span class="participante-nome">${escapeHtml(p.nome)}</span>
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

// salvarResultadoConferido() foi removida junto com conferirResultados()
// (ver comentário acima de compartilharWhatsApp) — só o admin.html grava
// em resultados_conferidos agora (conferirComoAdmin, admin.js).

async function verificarResultadoConferido(loteria, concurso) {
    try {
        const docId = `${loteria}_${concurso}`;
        const doc = await db.collection('resultados_conferidos').doc(docId).get();
        
        if (doc.exists && doc.data().conferido === true) {
            console.log(`📋 Resultado do ${loteria} concurso ${concurso} já foi conferido anteriormente`);
            return doc.data().numeros;
        }
        return null;
    } catch (error) {
        console.error('Erro ao verificar resultado conferido:', error);
        return null;
    }
}

// Busca só o campo 'trevos' de um resultado já conferido — função
// separada (não mexe no retorno de verificarResultadoConferido, que
// outras 9 chamadas no código tratam como array de números só) pra não
// arriscar quebrar esses call sites. Só +Milionária tem trevos; pra
// qualquer outra loteria nem tenta buscar.
async function buscarTrevosConferidos(loteria, concurso) {
    if (loteria !== 'maismilionaria') return null;
    try {
        const docId = `${loteria}_${concurso}`;
        const doc = await db.collection('resultados_conferidos').doc(docId).get();
        if (doc.exists && doc.data().conferido === true) {
            return doc.data().trevos || null;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar trevos conferidos:', error);
        return null;
    }
}

// ========== CARREGAR BOLÃO ABERTO (COM DESTAQUE) ==========
// ========== CARREGAR BOLÃO ABERTO (COM DESTAQUE CORRIGIDO) ==========
async function carregarBolaoAberto() {
    const card = document.getElementById('cardBolaoAberto');
    const container = document.getElementById('bolaoAbertoContainer');
    if (!card || !container) return;

    try {
        console.log('🔄 Carregando bolão aberto...');
        
        const configDoc = await db.collection('config_boloes').doc('ativos').get();
        if (!configDoc.exists) {
            console.log('❌ Configuração de bolões não encontrada');
            card.style.display = 'none';
            return;
        }

        const dados = configDoc.data();
        const idsSelecionados = dados.ids || [];
        const statusMap = dados.status || {};
        const destaqueMap = dados.destaque || {};
        const estrategiaMap = dados.estrategia || {};
        const dataLimiteMap = dados.dataLimite || {};

        console.log('📌 IDs selecionados:', idsSelecionados);
        console.log('📌 Status:', statusMap);
        console.log('📌 Destaques:', destaqueMap);

        // Filtrar apenas os que estão abertos
        const boloesAbertos = [];
        for (const id of idsSelecionados) {
            if (statusMap[id] === 'aberto') {
                try {
                    const doc = await db.collection('participantes').doc(id).get();
                    if (doc.exists) {
                        boloesAbertos.push({ id: id, data: doc.data() });
                        console.log(`✅ Bolão aberto encontrado: ${doc.data().titulo} (${id})`);
                    }
                } catch (e) {
                    console.warn(`⚠️ Erro ao buscar bolão ${id}:`, e);
                }
            }
        }

        if (boloesAbertos.length === 0) {
            console.log('❌ Nenhum bolão aberto encontrado');
            card.style.display = 'none';
            return;
        }

        console.log(`📊 ${boloesAbertos.length} bolão(ões) aberto(s) encontrado(s)`);

        // Tentar encontrar o que está com destaque (true)
        let bolaoDestaque = null;
        for (const b of boloesAbertos) {
            if (destaqueMap[b.id] === true) {
                bolaoDestaque = b;
                console.log(`⭐ Bolão em destaque encontrado: ${b.data.titulo}`);
                break;
            }
        }

        // Se não houver destaque, pega o primeiro
        const bolaoSelecionado = bolaoDestaque || boloesAbertos[0];
        const bolaoId = bolaoSelecionado.id;
        const bolao = bolaoSelecionado.data;
        const estrategia = estrategiaMap[bolaoId] || '';

        console.log(`🎯 Bolão selecionado: ${bolao.titulo} (${bolaoId}) - ${bolaoDestaque ? '⭐ EM DESTAQUE' : 'PRIMEIRO DA LISTA'}`);

        card.style.display = 'block';

        const vagasDisponiveis = bolao.vagasDisponiveis || 0;
        const vagasTotais = bolao.vagasTotais || 0;
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

        // Nome da loteria
        const loteriaNomes = {
            'mega': 'MEGA-SENA',
            'lotofacil': 'LOTOFÁCIL',
            'quina': 'QUINA',
            'maismilionaria': '+MILIONÁRIA'
        };
        const loteriaNome = loteriaNomes[bolao.loteria] || bolao.loteria?.toUpperCase() || 'LOTERIA';

        let html = `<div style="text-align:center; padding: 4px 0;">
            <div style="font-size: 18px; font-weight: 700; color: #1e293b;">🎯 ${escapeHtml(bolao.titulo)}</div>
            <div style="font-size: 14px; color: #475569; margin-top: 2px;">
                ${loteriaNome} ${bolao.concurso ? `- Concurso ${bolao.concurso}` : ''}
                <span style="display: inline-block; background: #d1fae5; color: #065f46; padding: 0 12px; border-radius: 30px; font-size: 12px; font-weight: 600; margin-left: 6px;">🟢 ABERTO</span>
            </div>
            <div style="font-size: 14px; color: #475569; margin-top: 4px;">
                💰 R$ ${(bolao.valorPorCota || 0).toFixed(2).replace('.', ',')} / cota${dataTexto}
            </div>
            ${vagasTexto ? `<div style="font-size: 13px; font-weight: 600; color:${vagasTexto.includes('LOTADO') ? '#ef4444' : '#059669'}; margin-top: 4px;">${vagasTexto}</div>` : ''}`;

        if (estrategia) {
            html += `
                <div style="margin-top: 8px;">
                    <button id="btnVerEstrategia" style="background:transparent; border:1px solid #cbd5e1; border-radius:30px; padding:4px 16px; color:#3b82f6; cursor:pointer; font-size: 12px;">💡 VER ESTRATÉGIA</button>
                </div>
                <div id="modalEstrategia" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10001; justify-content:center; align-items:center;">
                    <div style="background:white; border-radius:20px; max-width:350px; width:90%; padding:25px; text-align:center;">
                        <div style="font-size:24px;">💡</div>
                        <div style="font-weight:bold; font-size:16px; margin:8px 0;">ESTRATÉGIA DO BOLÃO</div>
                        <div style="font-size:14px; text-align:left; margin:12px 0; color: #1e293b;">${estrategia.replace(/\n/g, '<br>')}</div>
                        <button id="fecharModalEstrategia" style="background:#3b82f6; color:white; border:none; width:100%; padding:10px; border-radius:30px; font-weight:600; cursor:pointer;">FECHAR</button>
                    </div>
                </div>`;
        }

        html += `
            <button id="btnParticiparAberto" style="background:#10b981; color:white; border:none; margin-top:10px; padding:10px 30px; border-radius:30px; font-weight:600; font-size:15px; cursor:pointer;">📝 QUERO PARTICIPAR</button>
        </div>`;

        container.innerHTML = html;

        document.getElementById('btnVerEstrategia')?.addEventListener('click', () => {
            document.getElementById('modalEstrategia').style.display = 'flex';
        });
        document.getElementById('fecharModalEstrategia')?.addEventListener('click', () => {
            document.getElementById('modalEstrategia').style.display = 'none';
        });
        document.getElementById('btnParticiparAberto').onclick = () => mostrarModalParticipacao(bolao);

    } catch (error) {
        console.error('❌ Erro ao carregar bolão aberto:', error);
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
                    <p>💰 Valor da cota: R$ ${(bolao.valorPorCota || 0).toFixed(2).replace('.', ',')}</p>
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

// buscarResultadoAutomatico() foi removida (só pré-buscava pra sugerir
// clicar num botão "Conferir" que não existe mais — ver comentário
// acima de compartilharWhatsApp).

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Inicializando sistema (versão otimizada)...');

    // Conta visitas pra decidir quando mostrar o banner de instalação
    // proativo (a partir da 2ª). No iOS o banner não depende do evento
    // beforeinstallprompt (que nunca dispara lá), então tenta aqui direto.
    const visitasAtuais = parseInt(localStorage.getItem('visitCount') || '0', 10) + 1;
    localStorage.setItem('visitCount', visitasAtuais.toString());
    setTimeout(() => tentarMostrarBannerInstalacaoProativo(), 3000);

    await carregarConfiguracoes();
    await carregarDados();

    // Se veio de "Meus Bolões" (botão "Ver Cartões"), sobrescreve os
    // padrões acima pra loteria/concurso/bolão certos.
    await aplicarSelecaoDaUrl();

    document.getElementById('btnMegaSena').addEventListener('click', () => setLoteria('mega'));
    document.getElementById('btnLotofacil').addEventListener('click', () => setLoteria('lotofacil'));
    document.getElementById('btnQuina').addEventListener('click', () => setLoteria('quina'));
    document.getElementById('btnMaisMilionaria')?.addEventListener('click', () => setLoteria('maismilionaria'));
    
    document.getElementById('concursoSelect').addEventListener('change', async () => {
        console.log('🔄 Concurso alterado, limpando estado...');
        limparEstadoCompleto();

        const concurso = document.getElementById('concursoSelect').value;
        if (concurso) {
            await atualizarSelectBoloesAsync();
            
            const bolaoSelect = document.getElementById('bolaoSelect');
            if (bolaoSelect && bolaoSelect.options.length > 1) {
                const ultimoIndice = bolaoSelect.options.length - 1;
                bolaoSelect.selectedIndex = ultimoIndice;
            }
            
            const resultadoConferido = await verificarResultadoConferido(loteriaAtual, concurso);
            if (resultadoConferido) {
                console.log('✅ Resultado já conferido para este concurso, exibindo direto');
                await exibirResultadoSalvo(loteriaAtual, concurso, resultadoConferido);
            } else {
                console.log('📋 Nenhum resultado conferido, mostrando cartões');
                await mostrarCartoes();
            }
        } else {
            const cartoesArea = document.getElementById('cartoesArea');
            if (cartoesArea) {
                cartoesArea.innerHTML = '<div class="empty-state">📋 Selecione um concurso para ver os cartões</div>';
            }
            const potencialArea = document.getElementById('potencialArea');
            if (potencialArea) potencialArea.innerHTML = '';
            const resultadosArea = document.getElementById('resultadosArea');
            if (resultadosArea) {
                resultadosArea.innerHTML = '<div class="empty-state">📋 Selecione um concurso para ver o resultado</div>';
            }
            const bolaoSelect = document.getElementById('bolaoSelect');
            if (bolaoSelect) {
                bolaoSelect.innerHTML = '<option value="todos">Todos os bolões</option>';
            }
        }
    });
    
    document.getElementById('bolaoSelect').addEventListener('change', async () => {
        console.log('🔄 Bolão alterado, recarregando...');
        const concurso = document.getElementById('concursoSelect').value;
        if (concurso) {
            const resultadoConferido = await verificarResultadoConferido(loteriaAtual, concurso);
            if (resultadoConferido) {
                await exibirResultadoSalvo(loteriaAtual, concurso, resultadoConferido);
            } else {
                await mostrarCartoes();
            }
        }
    });
    
    document.getElementById('btnCompartilhar').addEventListener('click', compartilharSite);
    document.getElementById('btnWhatsappGrupo').addEventListener('click', entrarGrupoWhatsApp);
    document.getElementById('btnSugestao').addEventListener('click', enviarSugestao);
    document.getElementById('btnInstalarApp').addEventListener('click', mostrarPopupInstalar);
    
    const btnMeusBoloes = document.getElementById('btnMeusBoloes');
    if (btnMeusBoloes) {
        btnMeusBoloes.addEventListener('click', () => {
            window.location.href = 'meus-boloes.html';
        });
    } else {
        console.warn('⚠️ Botão "btnMeusBoloes" não encontrado no HTML');
    }
    
    console.log('✅ Sistema carregado (versão otimizada)');
    showToast('🎲 Sistema Bolões Aleatórios carregado!', 'success');
});