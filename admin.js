// Configuração inicial
const SENHA_ADMIN = '172163';

// ============ AUTENTICAÇÃO ============
function verificarAutenticacao() {
    const autenticado = localStorage.getItem('admin_autenticado');
    if (!autenticado) {
        document.getElementById('authModal').classList.add('show');
    } else {
        document.getElementById('authModal').classList.remove('show');
        carregarDadosDoFirebase();
    }
}

function autenticar() {
    const senha = document.getElementById('senhaAdmin').value;
    if (senha === SENHA_ADMIN) {
        localStorage.setItem('admin_autenticado', 'true');
        verificarAutenticacao();
    } else {
        alert('❌ Senha incorreta!');
    }
}

function sair() {
    localStorage.removeItem('admin_autenticado');
    verificarAutenticacao();
}

// ============ FIREBASE - CARREGAR DADOS ============
async function carregarDadosDoFirebase() {
    console.log('🔄 Carregando dados do Firebase...');
    
    try {
        // Carregar cartões
        const cartoesSnapshot = await db.collection('cartoes').get();
        const cartoes = [];
        cartoesSnapshot.forEach(doc => {
            cartoes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Salvar temporariamente
        localStorage.setItem('cartoes_temp', JSON.stringify(cartoes));
        
        console.log(`✅ ${cartoes.length} cartões carregados do Firebase`);
        exibirCartoes(cartoes);
        carregarConcursos(cartoes);
        atualizarStats(cartoes);
        
    } catch (error) {
        console.error('❌ Erro ao carregar do Firebase:', error);
        alert('Erro ao conectar com o Firebase. Verifique sua internet.');
    }
}

// ============ FIREBASE - SALVAR CARTÃO ============
async function salvarCartaoNoFirebase(cartao) {
    try {
        const docRef = await db.collection('cartoes').add({
            concurso: cartao.concurso,
            bolao: cartao.bolao,
            numeros: cartao.numeros,
            dataCadastro: new Date().toISOString(),
            totalNumeros: cartao.numeros.length
        });
        console.log('✅ Cartão salvo no Firebase:', docRef.id);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar no Firebase:', error);
        throw error;
    }
}

// ============ EXIBIR CARTÕES ============
function exibirCartoes(cartoes) {
    const filtro = document.getElementById('filtroConcurso').value;
    const container = document.getElementById('cartoesLista');
    
    let cartoesFiltrados = cartoes;
    if (filtro !== 'todos') {
        cartoesFiltrados = cartoes.filter(c => c.concurso == filtro);
    }
    
    if (!cartoesFiltrados || cartoesFiltrados.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Nenhum cartão cadastrado ainda</div>';
        return;
    }
    
    container.innerHTML = cartoesFiltrados.map(cartao => `
        <div class="cartao-item">
            <div class="cartao-header">
                <div class="cartao-id">Cartão #${cartao.id.slice(-6)}</div>
                <div class="cartao-concurso">Concurso ${cartao.concurso} | Bolão: ${cartao.bolao || 'Sem Bolão'}</div>
            </div>
            <div class="cartao-numeros">
                ${cartao.numeros.map(num => `<span class="numero">${num.toString().padStart(2, '0')}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// ============ CARREGAR CONCURSOS ============
function carregarConcursos(cartoes) {
    const concursos = [...new Set(cartoes.map(c => c.concurso))];
    concursos.sort((a,b) => b - a);
    
    const selectResultado = document.getElementById('concursoResultado');
    const filtroConcurso = document.getElementById('filtroConcurso');
    
    if (selectResultado) {
        selectResultado.innerHTML = '<option value="">Selecione um concurso</option>';
    }
    
    if (filtroConcurso) {
        filtroConcurso.innerHTML = '<option value="todos">Todos os concursos</option>';
    }
    
    concursos.forEach(concurso => {
        const total = cartoes.filter(c => c.concurso == concurso).length;
        if (selectResultado) {
            selectResultado.innerHTML += `<option value="${concurso}">Concurso ${concurso} (${total} cartões)</option>`;
        }
        if (filtroConcurso) {
            filtroConcurso.innerHTML += `<option value="${concurso}">Concurso ${concurso}</option>`;
        }
    });
}

// ============ ADICIONAR CARTÕES ============
async function adicionarCartoes() {
    const concurso = document.getElementById('concurso').value;
    const bolao = document.getElementById('bolao').value || 'Sem Bolão';
    const textoNumeros = document.getElementById('numerosCartoes').value;
    
    if (!concurso) {
        alert('⚠️ Informe o número do concurso!');
        return;
    }
    
    if (!textoNumeros.trim()) {
        alert('⚠️ Informe os números dos cartões!');
        return;
    }
    
    const linhas = textoNumeros.split('\n');
    let adicionados = 0;
    let erros = 0;
    
    // Carregar cartões atuais para verificar duplicatas
    const cartoesSnapshot = await db.collection('cartoes').get();
    const cartoesExistentes = [];
    cartoesSnapshot.forEach(doc => {
        cartoesExistentes.push(doc.data());
    });
    
    for (const linha of linhas) {
        if (!linha.trim()) continue;
        
        const numeros = linha.match(/\d+/g).map(Number);
        
        if (numeros.length < 6 || numeros.length > 15) {
            erros++;
            continue;
        }
        
        const numerosInvalidos = numeros.filter(n => n < 1 || n > 60);
        if (numerosInvalidos.length > 0) {
            erros++;
            continue;
        }
        
        numeros.sort((a,b) => a-b);
        
        // Verificar duplicata
        const existe = cartoesExistentes.some(c => 
            c.concurso == concurso && 
            c.bolao == bolao && 
            JSON.stringify(c.numeros) === JSON.stringify(numeros)
        );
        
        if (existe) {
            continue;
        }
        
        try {
            await salvarCartaoNoFirebase({
                concurso: concurso,
                bolao: bolao,
                numeros: numeros
            });
            adicionados++;
        } catch (error) {
            erros++;
        }
    }
    
    if (adicionados > 0) {
        await carregarDadosDoFirebase();
        document.getElementById('numerosCartoes').value = '';
        alert(`✅ ${adicionados} cartões salvos no Firebase!`);
    } else if (erros > 0) {
        alert(`❌ ${erros} erros. Verifique os números (mínimo 6, máximo 15, entre 1-60)`);
    } else {
        alert('⚠️ Nenhum novo cartão adicionado (todos já existem)');
    }
}

// ============ SALVAR RESULTADO ============
async function salvarResultado() {
    const concurso = document.getElementById('concursoResultado').value;
    const numerosText = document.getElementById('numerosSorteadosInput').value;
    
    if (!concurso) {
        alert('⚠️ Selecione um concurso!');
        return;
    }
    
    if (!numerosText.trim()) {
        alert('⚠️ Digite os números sorteados!');
        return;
    }
    
    const numeros = numerosText.match(/\d+/g).map(Number);
    
    if (numeros.length < 6) {
        alert('⚠️ Digite pelo menos 6 números!');
        return;
    }
    
    numeros.sort((a,b) => a-b);
    
    try {
        await db.collection('resultados').doc(concurso).set({
            concurso: concurso,
            numeros: numeros,
            dataAtualizacao: new Date().toISOString()
        });
        alert(`✅ Resultado do concurso ${concurso} salvo no Firebase!\nNúmeros: ${numeros.join(' - ')}`);
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao salvar resultado. Tente novamente.');
    }
}

// ============ FUNÇÕES AUXILIARES ============
function atualizarStats(cartoes) {
    const total = cartoes.length;
    const statsDiv = document.getElementById('totalCartoes');
    if (statsDiv) {
        statsDiv.textContent = `📊 ${total} cartões (Firebase)`;
    }
}

function limparFormulario() {
    document.getElementById('numerosCartoes').value = '';
}

function recarregarLista() {
    carregarDadosDoFirebase();
}

// ============ BUSCAR RESULTADO ONLINE ============
async function buscarResultadoOnlineAdmin() {
    const concurso = document.getElementById('concursoResultado').value;
    
    if (!concurso) {
        alert('⚠️ Selecione um concurso primeiro!');
        return;
    }
    
    const btnBuscar = document.getElementById('btnBuscarResultado');
    const btnSalvar = document.getElementById('btnSalvarResultado');
    
    if (btnBuscar) {
        btnBuscar.disabled = true;
        btnBuscar.textContent = '⏳ BUSCANDO...';
    }
    
    alert(`🔍 Buscando resultado do concurso ${concurso}...`);
    
    let numeros = null;
    
    // Tentar Brasil API
    try {
        const url = `https://loteriascaixa-api.herokuapp.com/api/megasena/${concurso}`;
        const response = await fetch(url);
        if (response.ok) {
            const dados = await response.json();
            if (dados.dezenas && dados.dezenas.length >= 6) {
                numeros = dados.dezenas.map(n => parseInt(n));
            }
        }
    } catch (error) {
        console.log('Brasil API falhou');
    }
    
    // Tentar Loteria API
    if (!numeros) {
        try {
            const url = `https://loteriascaixa-api.herokuapp.com/api/mega-sena/${concurso}`;
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.dezenas && dados.dezenas.length >= 6) {
                    numeros = dados.dezenas.map(n => parseInt(n));
                }
            }
        } catch (error) {
            console.log('Loteria API falhou');
        }
    }
    
    if (numeros && numeros.length >= 6) {
        numeros.sort((a,b) => a-b);
        document.getElementById('numerosSorteadosInput').value = numeros.join(' ');
        alert(`✅ Resultado encontrado!\nNúmeros: ${numeros.join(' - ')}`);
    } else {
        alert(`❌ Resultado do concurso ${concurso} não encontrado online.`);
    }
    
    if (btnBuscar) {
        btnBuscar.disabled = false;
        btnBuscar.textContent = '🌐 BUSCAR ONLINE';
    }
}

// Adicionar botão de busca se não existir
function adicionarBotaoBusca() {
    if (document.getElementById('btnBuscarResultado')) return;
    
    const container = document.querySelector('.numeros-container');
    if (container) {
        const btnBuscar = document.createElement('button');
        btnBuscar.id = 'btnBuscarResultado';
        btnBuscar.textContent = '🌐 BUSCAR ONLINE';
        btnBuscar.className = 'btn btn-success';
        btnBuscar.style.marginLeft = '10px';
        btnBuscar.onclick = buscarResultadoOnlineAdmin;
        container.appendChild(btnBuscar);
    }
}

// ============ EVENTOS ============
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    adicionarBotaoBusca();
    
    document.getElementById('btnAutenticar')?.addEventListener('click', autenticar);
    document.getElementById('btnSair')?.addEventListener('click', sair);
    document.getElementById('btnAdicionar')?.addEventListener('click', adicionarCartoes);
    document.getElementById('btnLimpar')?.addEventListener('click', limparFormulario);
    document.getElementById('btnSalvarResultado')?.addEventListener('click', salvarResultado);
    document.getElementById('btnRecarregar')?.addEventListener('click', recarregarLista);
    document.getElementById('filtroConcurso')?.addEventListener('change', () => {
        const cartoes = JSON.parse(localStorage.getItem('cartoes_temp') || '[]');
        exibirCartoes(cartoes);
    });
    document.getElementById('senhaAdmin')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') autenticar();
    });
});

console.log('✅ admin.js (Firebase) carregado com sucesso!');