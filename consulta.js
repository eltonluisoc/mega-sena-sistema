// ============================================
// CONSULTA DE PARTICIPANTES POR TELEFONE
// ============================================

// ============================================
// FORMATAR TELEFONE PARA EXIBIÇÃO
// ============================================
function formatarTelefone(telefone) {
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
    } else if (numeros.length === 10) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
    }
    return numeros;
}

// ============================================
// VALIDAR TELEFONE
// ============================================
function validarTelefone(telefone) {
    const numeros = telefone.replace(/\D/g, '');
    return numeros.length >= 10 && numeros.length <= 11;
}

// ============================================
// NORMALIZAR TELEFONE (apenas números)
// ============================================
function normalizarTelefone(telefone) {
    return telefone.replace(/\D/g, '');
}

// ============================================
// TOAST
// ============================================
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
        setTimeout(() => { if (toast.parentNode) toast.remove(); if (container.children.length === 0 && container.parentNode) container.remove(); }, 300);
    }, 3000);
}

// ============================================
// CONSULTAR BOLÕES DO PARTICIPANTE
// ============================================
async function consultarBoloes() {
    const input = document.getElementById('telefoneInput');
    const btn = document.getElementById('btnConsultar');
    const resultadosDiv = document.getElementById('resultados');
    const resultadoConteudo = document.getElementById('resultadoConteudo');
    const formConsulta = document.getElementById('formConsulta');
    
    const telefone = normalizarTelefone(input.value);
    
    // Validação
    if (!telefone) {
        showToast('⚠️ Digite seu telefone!', 'warning');
        input.focus();
        return;
    }
    
    if (!validarTelefone(telefone)) {
        showToast('⚠️ Telefone inválido! Digite DDD + número (ex: 61999999999)', 'warning');
        input.focus();
        return;
    }
    
    // Desabilitar botão e mostrar loading
    btn.disabled = true;
    btn.innerHTML = '🔄 Buscando...';
    
    try {
        // Buscar todos os bolões
        const snapshot = await db.collection('participantes').get();
        const boloesEncontrados = [];
        
        snapshot.forEach(doc => {
            const bolao = doc.data();
            const participantes = bolao.participantes || [];
            
            // Verificar se o telefone existe neste bolão
            const participante = participantes.find(p => {
                const telParticipante = normalizarTelefone(p.telefone || '');
                return telParticipante === telefone;
            });
            
            if (participante) {
                // Buscar status do bolão
                let status = bolao.status || 'andamento';
                
                // Se não tiver status no bolão, buscar do config_boloes
                if (!status || status === 'andamento') {
                    try {
                        const configDoc = db.collection('config_boloes').doc('ativos');
                        configDoc.get().then(docConfig => {
                            if (docConfig.exists) {
                                const statusMap = docConfig.data().status || {};
                                if (statusMap[doc.id]) {
                                    status = statusMap[doc.id];
                                }
                            }
                        }).catch(() => {});
                    } catch (e) {
                        console.warn('Erro ao buscar status:', e);
                    }
                }
                
                boloesEncontrados.push({
                    id: doc.id,
                    titulo: bolao.titulo || 'Bolão sem título',
                    loteria: bolao.loteria || '?',
                    concurso: bolao.concurso || '?',
                    valorPorCota: bolao.valorPorCota || 0,
                    status: status,
                    participante: participante,
                    totalParticipantes: participantes.length
                });
            }
        });
        
        // Ordenar: primeiro os em andamento, depois abertos, depois encerrados
        const ordemStatus = { 'aberto': 0, 'andamento': 1, 'encerrado': 2 };
        boloesEncontrados.sort((a, b) => {
            return (ordemStatus[a.status] || 1) - (ordemStatus[b.status] || 1);
        });
        
        // Esconder formulário e mostrar resultados
        formConsulta.style.display = 'none';
        resultadosDiv.style.display = 'block';
        
        // Gerar HTML dos resultados
        if (boloesEncontrados.length === 0) {
            resultadoConteudo.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Nenhum bolão encontrado</div>
                    <div style="font-size: 14px; color: #64748b;">O telefone <strong>${formatarTelefone(telefone)}</strong> não foi encontrado em nenhum bolão.</div>
                    <div style="font-size: 13px; color: #94a3b8; margin-top: 8px;">Verifique se o número está correto ou entre em contato com o administrador.</div>
                </div>
            `;
        } else {
            // Separar por status
            const abertos = boloesEncontrados.filter(b => b.status === 'aberto');
            const andamento = boloesEncontrados.filter(b => b.status === 'andamento');
            const encerrados = boloesEncontrados.filter(b => b.status === 'encerrado');
            
            let html = `
                <div style="margin-bottom: 16px; padding: 12px; background: #f1f5f9; border-radius: 12px; text-align: center;">
                    <div style="font-size: 14px; color: #475569;">
                        📞 Telefone: <strong>${formatarTelefone(telefone)}</strong>
                    </div>
                    <div style="font-size: 12px; color: #64748b;">
                        Encontrado em <strong>${boloesEncontrados.length}</strong> bolão(ões)
                    </div>
                </div>
            `;
            
            // Função para renderizar uma seção
            function renderizarSecao(titulo, lista, statusClass, statusLabel) {
                if (lista.length === 0) return '';
                
                let sectionHtml = `
                    <div class="secao-boloes">
                        <div class="secao-titulo ${statusClass}">
                            ${titulo} (${lista.length})
                        </div>
                `;
                
                for (const bolao of lista) {
                    const participante = bolao.participante;
                    const quantidadeCotas = participante.quantidadeCotas || 1;
                    const situacao = participante.situacao === 'quitado' || participante.situacao === 'pago' ? 'PAGO' : 'EM ANDAMENTO';
                    const situacaoClass = situacao === 'PAGO' ? 'status-pago' : 'status-pendente';
                    
                    const loteriaNomes = {
                        'mega': 'MEGA-SENA',
                        'lotofacil': 'LOTOFÁCIL',
                        'quina': 'QUINA'
                    };
                    const loteriaNome = loteriaNomes[bolao.loteria] || bolao.loteria.toUpperCase();
                    
                    sectionHtml += `
                        <div class="bolao-card">
                            <div class="bolao-nome">🎯 ${bolao.titulo}</div>
                            <div class="bolao-info">
                                <span>📌 Concurso: ${bolao.concurso}</span>
                                <span>🎲 ${loteriaNome}</span>
                            </div>
                            <div class="bolao-info">
                                <span>💰 R$ ${bolao.valorPorCota.toFixed(2)} / cota</span>
                                <span>🎟️ ${quantidadeCotas} cota${quantidadeCotas > 1 ? 's' : ''}</span>
                            </div>
                            <div>
                                <span class="bolao-status ${situacaoClass}">${situacao}</span>
                                <span class="bolao-status ${statusClass}">${statusLabel}</span>
                            </div>
                        </div>
                    `;
                }
                
                sectionHtml += `</div>`;
                return sectionHtml;
            }
            
            html += renderizarSecao('🟢 ABERTOS', abertos, 'aberto', 'ABERTO');
            html += renderizarSecao('🟡 EM ANDAMENTO', andamento, 'andamento', 'EM ANDAMENTO');
            html += renderizarSecao('🔴 ENCERRADOS', encerrados, 'encerrado', 'ENCERRADO');
            
            resultadoConteudo.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Erro ao consultar:', error);
        resultadoConteudo.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Erro ao consultar</div>
                <div style="font-size: 14px; color: #64748b;">${error.message}</div>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 8px;">Tente novamente mais tarde.</div>
            </div>
        `;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔍 CONSULTAR MEUS BOLÕES';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('telefoneInput');
    const btn = document.getElementById('btnConsultar');
    const btnNova = document.getElementById('btnNovaConsulta');
    const formConsulta = document.getElementById('formConsulta');
    const resultadosDiv = document.getElementById('resultados');
    
    // Consultar ao clicar no botão
    btn.addEventListener('click', consultarBoloes);
    
    // Consultar ao pressionar Enter
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btn.click();
        }
    });
    
    // Máscara: permitir apenas números
    input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '');
        // Limitar a 11 dígitos
        if (input.value.length > 11) {
            input.value = input.value.substring(0, 11);
        }
    });
    
    // Nova consulta
    btnNova.addEventListener('click', () => {
        resultadosDiv.style.display = 'none';
        formConsulta.style.display = 'block';
        input.value = '';
        input.focus();
    });
    
    // Focus no input ao carregar
    input.focus();
});