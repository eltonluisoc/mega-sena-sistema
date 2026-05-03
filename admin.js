const SENHA_ADMIN = '172163';
let cartoes = [];

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
        alert('Senha incorreta!');
    }
}

function sair() {
    localStorage.removeItem('admin_autenticado');
    verificarAutenticacao();
}

// ============ FIREBASE ============
async function carregarDadosDoFirebase() {
    try {
        const snapshot = await db.collection('cartoes').get();
        cartoes = [];
        snapshot.forEach(doc => {
            cartoes.push({ id: doc.id, ...doc.data() });
        });
        exibirCartoes();
        carregarConcursos();
        document.getElementById('totalCartoes').innerHTML = cartoes.length + ' cartões';
    } catch (error) {
        alert('Erro ao carregar: ' + error.message);
    }
}

// ============ EXIBIR CARTÕES (VERSÃO CORRIGIDA) ============
function exibirCartoes() {
    const filtro = document.getElementById('filtroConcurso').value;
    let filtrados = filtro === 'todos' ? cartoes : cartoes.filter(c => c.concurso == filtro);
    
    const container = document.getElementById('cartoesLista');
    if (filtrados.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum cartão cadastrado</div>';
        return;
    }
    
    let html = '';
    for (const cartao of filtrados) {
        html += `
            <div class="cartao-item" style="border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:10px; background:#f8fafc;">
                <div style="display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                    <div style="flex-shrink: 0;">
                        <input type="checkbox" class="checkbox-cartao" data-id="${cartao.id}" style="width: 22px; height: 22px; margin-top: 4px;">
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <strong>Cartão #${cartao.id.slice(-6)}</strong>
                            <button class="btn-editar" data-id="${cartao.id}" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;">✏️ Editar</button>
                        </div>
                        <div style="font-size: 12px; color: #666; margin: 5px 0;">
                            Concurso ${cartao.concurso} | Bolão: ${cartao.bolao || 'Sem Bolão'}
                        </div>
                        <div class="cartao-numeros" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
                            ${cartao.numeros.map(n => `<span style="background:#e2e8f0; padding:5px 10px; border-radius:6px; font-family:monospace; font-size:13px; font-weight:bold;">${n.toString().padStart(2,'0')}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
    
    // Botões Editar
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.onclick = function() { editarCartao(this.getAttribute('data-id')); };
    });
    
    // Atualizar contador excluir
    function atualizarContador() {
        const qtd = document.querySelectorAll('.checkbox-cartao:checked').length;
        const btnExcluir = document.getElementById('btnExcluirSelecionados');
        if (btnExcluir) btnExcluir.innerHTML = qtd > 0 ? `🗑️ EXCLUIR (${qtd})` : '🗑️ EXCLUIR';
    }
    
    document.querySelectorAll('.checkbox-cartao').forEach(cb => {
        cb.onchange = atualizarContador;
    });
    atualizarContador();
}

// ============ EDITAR ============
async function editarCartao(id) {
    const doc = await db.collection('cartoes').doc(id).get();
    const cartao = doc.data();
    
    const novos = prompt('Editar números (separados por espaço):\nAtuais: ' + cartao.numeros.join(', '), cartao.numeros.join(' '));
    if (!novos) return;
    
    const numeros = novos.match(/\d+/g).map(Number);
    if (numeros.length < 6) { alert('Mínimo 6 números'); return; }
    numeros.sort((a,b) => a-b);
    
    await db.collection('cartoes').doc(id).update({ numeros: numeros, totalNumeros: numeros.length });
    alert('Cartão atualizado!');
    carregarDadosDoFirebase();
}

// ============ EXCLUIR ============
async function excluirSelecionados() {
    const selecionados = document.querySelectorAll('.checkbox-cartao:checked');
    if (selecionados.length === 0) { alert('Selecione um cartão'); return; }
    if (!confirm('Excluir ' + selecionados.length + ' cartão(ões)?')) return;
    
    for (const cb of selecionados) {
        await db.collection('cartoes').doc(cb.getAttribute('data-id')).delete();
    }
    alert('Excluído(s)!');
    carregarDadosDoFirebase();
}

// ============ IMPORTAR ============
function importarExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,.txt';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const concurso = prompt('Concurso:', '2700');
        if (!concurso) return;
        const bolao = prompt('Bolão:', 'Importado');
        if (!bolao) return;
        
        const reader = new FileReader();
        reader.onload = async function(event) {
            let numerosPorLinha = [];
            
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const primeiraPlanilha = workbook.Sheets[workbook.SheetNames[0]];
                const dados = XLSX.utils.sheet_to_json(primeiraPlanilha, { header: 1 });
                
                for (const linha of dados) {
                    if (!linha || linha.length === 0) continue;
                    const numeros = linha.filter(v => v && typeof v === 'number').map(Number);
                    if (numeros.length >= 6) {
                        numerosPorLinha.push(numeros);
                    }
                }
            } else {
                const linhas = event.target.result.split(/\r?\n/);
                for (const linha of linhas) {
                    if (!linha.trim()) continue;
                    const numeros = linha.match(/\d+/g).map(Number);
                    if (numeros.length >= 6) {
                        numerosPorLinha.push(numeros);
                    }
                }
            }
            
            let adicionados = 0;
            for (const numeros of numerosPorLinha) {
                numeros.sort((a,b) => a-b);
                await db.collection('cartoes').add({
                    concurso: concurso,
                    bolao: bolao,
                    numeros: numeros,
                    dataCadastro: new Date().toISOString(),
                    totalNumeros: numeros.length
                });
                adicionados++;
            }
            alert(`${adicionados} cartões importados!`);
            carregarDadosDoFirebase();
        };
        
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    };
    input.click();
}

// ============ BUSCAR RESULTADO ONLINE (API MEGA-SENA) ============
async function buscarResultadoOnlineAdmin() {
    const concurso = document.getElementById('concursoResultado').value;
    
    if (!concurso) {
        alert('⚠️ Selecione um concurso primeiro!');
        return;
    }
    
    const btnBuscar = document.getElementById('btnBuscarResultadoAdmin');
    const statusDiv = document.getElementById('statusBuscaAdmin');
    
    if (btnBuscar) {
        btnBuscar.disabled = true;
        btnBuscar.textContent = '⏳ BUSCANDO...';
    }
    
    if (statusDiv) {
        statusDiv.innerHTML = `<div class="status-info">🔍 Buscando resultado do concurso ${concurso}...</div>`;
    }
    
    let numeros = null;
    let apiUsada = null;
    
    // API 1: Brasil API (Mega-Sena)
    try {
        const url = `https://brasilapi.com.br/api/loterias/mega-sena/${concurso}`;
        const response = await fetch(url);
        if (response.ok) {
            const dados = await response.json();
            if (dados.dezenas && dados.dezenas.length >= 6) {
                numeros = dados.dezenas.map(n => parseInt(n));
                apiUsada = 'Brasil API';
            }
        }
    } catch (error) {
        console.log('Brasil API falhou:', error);
    }
    
    // API 2: Loteria API (fallback)
    if (!numeros) {
        try {
            const url = `https://loteriascaixa-api.herokuapp.com/api/mega-sena/${concurso}`;
            const response = await fetch(url);
            if (response.ok) {
                const dados = await response.json();
                if (dados.dezenas && dados.dezenas.length >= 6) {
                    numeros = dados.dezenas.map(n => parseInt(n));
                    apiUsada = 'Loteria API';
                }
            }
        } catch (error) {
            console.log('Loteria API falhou:', error);
        }
    }
    
    if (numeros && numeros.length >= 6) {
        numeros.sort((a,b) => a-b);
        document.getElementById('numerosSorteadosInput').value = numeros.join(' ');
        
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status-success">✅ Resultado encontrado! (${apiUsada})<br>Números: ${numeros.join(' - ')}</div>`;
        }
        
        if (confirm(`Resultado do concurso ${concurso} encontrado!\nNúmeros: ${numeros.join(' - ')}\n\nDeseja salvar?`)) {
            await db.collection('resultados').doc(concurso).set({
                concurso: concurso,
                numeros: numeros,
                dataAtualizacao: new Date().toISOString()
            });
            alert('✅ Resultado salvo com sucesso!');
        }
    } else {
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status-error">❌ Resultado do concurso ${concurso} não encontrado online.</div>`;
        }
        alert(`❌ Resultado do concurso ${concurso} não encontrado online.`);
    }
    
    if (btnBuscar) {
        btnBuscar.disabled = false;
        btnBuscar.textContent = '🌐 BUSCAR RESULTADO';
    }
    
    setTimeout(() => {
        if (statusDiv) statusDiv.innerHTML = '';
    }, 5000);
}

// ============ ADICIONAR BOTÃO DE BUSCA NO ADMIN ============
function adicionarBotaoBuscaAdmin() {
    if (document.getElementById('btnBuscarResultadoAdmin')) return;
    
    const container = document.querySelector('#concursoResultado').parentElement;
    if (container) {
        const btnBuscar = document.createElement('button');
        btnBuscar.id = 'btnBuscarResultadoAdmin';
        btnBuscar.textContent = '🌐 BUSCAR RESULTADO';
        btnBuscar.className = 'btn btn-purple';
        btnBuscar.style.marginTop = '10px';
        btnBuscar.style.width = '100%';
        btnBuscar.onclick = buscarResultadoOnlineAdmin;
        container.appendChild(btnBuscar);
        
        const statusDiv = document.createElement('div');
        statusDiv.id = 'statusBuscaAdmin';
        statusDiv.style.marginTop = '10px';
        container.appendChild(statusDiv);
    }
}

// ============ ADICIONAR CARTÕES ============
async function adicionarCartoes() {
    const concurso = document.getElementById('concurso').value;
    const bolao = document.getElementById('bolao').value || 'Sem Bolão';
    const texto = document.getElementById('numerosCartoes').value;
    if (!concurso || !texto) { alert('Preencha os campos'); return; }
    
    const linhas = texto.split('\n');
    let adicionados = 0;
    for (const linha of linhas) {
        if (!linha.trim()) continue;
        const numeros = linha.match(/\d+/g).map(Number);
        if (numeros.length < 6) continue;
        numeros.sort((a,b) => a-b);
        await db.collection('cartoes').add({
            concurso: concurso,
            bolao: bolao,
            numeros: numeros,
            dataCadastro: new Date().toISOString(),
            totalNumeros: numeros.length
        });
        adicionados++;
    }
    alert(adicionados + ' cartões adicionados!');
    document.getElementById('numerosCartoes').value = '';
    carregarDadosDoFirebase();
}

// ============ OUTRAS FUNÇÕES ============
function carregarConcursos() {
    const concursos = [...new Set(cartoes.map(c => c.concurso))];
    concursos.sort((a,b) => b - a);
    const select = document.getElementById('concursoResultado');
    const filtro = document.getElementById('filtroConcurso');
    
    if (select) {
        select.innerHTML = '<option value="">Selecione</option>';
        concursos.forEach(c => select.innerHTML += `<option value="${c}">Concurso ${c}</option>`);
    }
    if (filtro) {
        filtro.innerHTML = '<option value="todos">Todos</option>';
        concursos.forEach(c => filtro.innerHTML += `<option value="${c}">Concurso ${c}</option>`);
    }
}

async function salvarResultado() {
    const concurso = document.getElementById('concursoResultado').value;
    const texto = document.getElementById('numerosSorteadosInput').value;
    if (!concurso || !texto) { alert('Preencha os campos'); return; }
    const numeros = texto.match(/\d+/g).map(Number);
    if (numeros.length < 6) { alert('Mínimo 6 números'); return; }
    numeros.sort((a,b) => a-b);
    await db.collection('resultados').doc(concurso).set({
        concurso: concurso,
        numeros: numeros,
        dataAtualizacao: new Date().toISOString()
    });
    alert('Resultado salvo!');
}

function limparFormulario() {
    document.getElementById('numerosCartoes').value = '';
}

function recarregarLista() {
    carregarDadosDoFirebase();
}

// ============ INICIALIZAR ============
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacao();
    
    document.getElementById('btnAutenticar').onclick = autenticar;
    document.getElementById('btnSair').onclick = sair;
    document.getElementById('btnAdicionar').onclick = adicionarCartoes;
    document.getElementById('btnLimpar').onclick = limparFormulario;
    document.getElementById('btnSalvarResultado').onclick = salvarResultado;
    document.getElementById('btnRecarregar').onclick = recarregarLista;
    document.getElementById('btnExcluirSelecionados').onclick = excluirSelecionados;
    document.getElementById('btnImportarExcel').onclick = importarExcel;
    document.getElementById('filtroConcurso').onchange = exibirCartoes;
    document.getElementById('senhaAdmin').onkeypress = function(e) {
        if (e.key === 'Enter') autenticar();
    };
    
    adicionarBotaoBuscaAdmin();
});