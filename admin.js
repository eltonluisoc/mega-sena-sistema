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

// ============ EXIBIR CARTÕES ============
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
            <div style="border:1px solid #ddd; border-radius:8px; padding:10px; margin-bottom:10px; background:#f8fafc;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <input type="checkbox" class="checkbox-cartao" data-id="${cartao.id}" style="width:20px; height:20px;">
                    <div style="flex:1">
                        <div><strong>Cartão #${cartao.id.slice(-6)}</strong></div>
                        <div style="font-size:12px; color:#666;">Concurso ${cartao.concurso} | Bolão: ${cartao.bolao || 'Sem Bolão'}</div>
                        <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:5px;">
                            ${cartao.numeros.map(n => `<span style="background:#e2e8f0; padding:4px 8px; border-radius:5px;">${n.toString().padStart(2,'0')}</span>`).join('')}
                        </div>
                    </div>
                    <button class="btn-editar" data-id="${cartao.id}" style="background:#3b82f6; color:white; border:none; padding:5px 12px; border-radius:5px; cursor:pointer;">Editar</button>
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
    document.querySelectorAll('.checkbox-cartao').forEach(cb => {
        cb.onchange = function() {
            const qtd = document.querySelectorAll('.checkbox-cartao:checked').length;
            const btnExcluir = document.getElementById('btnExcluirSelecionados');
            if (btnExcluir) btnExcluir.innerHTML = qtd > 0 ? `🗑️ EXCLUIR ${qtd}` : '🗑️ EXCLUIR SELECIONADOS';
        };
    });
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
    input.accept = '.txt,.csv';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const concurso = prompt('Concurso:', '2700');
        if (!concurso) return;
        const bolao = prompt('Bolão:', 'Importado');
        if (!bolao) return;
        
        const reader = new FileReader();
        reader.onload = async function(event) {
            const linhas = event.target.result.split(/\r?\n/);
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
            alert(adicionados + ' cartões importados!');
            carregarDadosDoFirebase();
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============ ADICIONAR ============
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
});