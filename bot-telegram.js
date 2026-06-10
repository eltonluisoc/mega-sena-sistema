const axios = require('axios');

// Pega o token e chat ID das variáveis de ambiente (configuraremos depois no GitHub)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function enviarTelegram(mensagem) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: mensagem,
            parse_mode: 'HTML'
        });
        console.log('✅ Mensagem enviada para o Telegram');
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error.message);
    }
}

async function verificarLoterias() {
    const loterias = [
        { nome: 'MEGA-SENA', url: 'megasena' },
        { nome: 'LOTOFÁCIL', url: 'lotofacil' },
        { nome: 'LOTOMANIA', url: 'lotomania' }
    ];
    
    const acumuladas = [];
    
    for (const loteria of loterias) {
        try {
            const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/${loteria.url}/ultimo`;
            const response = await axios.get(url);
            const dados = response.data;
            
            if (dados.acumulou === true) {
                acumuladas.push({
                    nome: loteria.nome,
                    concurso: dados.concurso,
                    premio: dados.valorEstimadoPremioProximoConcurso,
                    data: dados.dataDoConcurso,
                    dezenas: dados.dezenasSorteadas || '---'
                });
            }
        } catch (error) {
            console.error(`Erro ao buscar ${loteria.nome}:`, error.message);
        }
    }
    
    if (acumuladas.length === 0) {
        console.log('✅ Nenhuma loteria acumulou hoje');
        return;
    }
    
    let mensagem = `<b>🎲 ALERTA DE ACUMULAÇÃO!</b>\n\n`;
    mensagem += `A(s) seguinte(s) loteria(s) acumulou/aram:\n\n`;
    
    for (const loteria of acumuladas) {
        mensagem += `<b>🏆 ${loteria.nome}</b>\n`;
        mensagem += `📌 Concurso: ${loteria.concurso}\n`;
        if (loteria.dezenas && loteria.dezenas.length) {
            mensagem += `🎯 Dezenas: ${loteria.dezenas.join(' - ')}\n`;
        }
        mensagem += `💰 Prêmio estimado: R$ ${loteria.premio || '---'}\n`;
        mensagem += `📅 Data: ${loteria.data}\n\n`;
    }
    
    mensagem += `🔗 <a href="https://eltonluisoc.github.io/mega-sena-sistema/">Acesse o site</a> para mais detalhes.`;
    
    await enviarTelegram(mensagem);
}

// Executar a função principal
verificarLoterias();