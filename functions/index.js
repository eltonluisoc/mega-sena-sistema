const functions = require('firebase-functions');
const axios = require('axios');

// Configuração do Telegram
const TELEGRAM_TOKEN = '8489018835:AAF4A0LPy2EbPpWKFDo52NH1yFE5oVxuM6c';  // ← Coloque o token do BotFather
const TELEGRAM_CHAT_ID = '79522100';  // ← Coloque seu Chat ID

// Função auxiliar para enviar mensagem no Telegram
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

// Função agendada: roda todos os dias às 8h e 20h
exports.checkAccumulated = functions.pubsub
    .schedule('0 8,20 * * *')
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        
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
            return null;
        }
        
        // Montar mensagem
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
        
        return null;
    });