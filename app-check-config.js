// Firebase App Check (reCAPTCHA v3) — restringe quem consegue ler certas
// coleções do Firestore (ex.: cartões) a pedidos que vêm de verdade
// deste site, carregado num navegador real — não um script/curl batendo
// direto na API do Firestore (o que qualquer um podia fazer até aqui,
// já que o projeto não tem backend próprio pra servir de barreira).
// Pedido do usuário: "não queria que pegassem no firebase... colocar
// proteções básicas, não deixar tão aberto."
//
// Carregado só em index.html e admin.html (as 2 únicas páginas que leem
// a coleção "cartoes" — ver script.js/admin.js) — as outras páginas
// (consulta.html, meus-boloes.html, participantes.html) não precisam
// disso agora.
//
// Achado real: o reCAPTCHA clássico (v3) foi descontinuado pelo Google
// pra registros NOVOS em App Check (o campo de chave secreta ficava
// travado no Firebase Console, com aviso "use o Google Cloud Fraud
// Defense"). A chave abaixo é do tipo novo — "Fraud Defense" (antes
// chamado reCAPTCHA Enterprise) — por isso usa o provider
// ReCaptchaEnterpriseProvider, não ReCaptchaV3Provider. Tem nível
// gratuito de 10.000 verificações/mês sem precisar de cartão de
// crédito/faturamento no Google Cloud.
//
// FALTA: registrar essa MESMA chave em Firebase Console → Configurações
// do Projeto → App Check → app Web → Registrar → "Fraud Defense" — só
// depois disso o token emitido aqui é aceito pelo Firebase de verdade.
// Enquanto isso não for feito, isto não quebra nada (o token só não é
// validado do outro lado ainda) — a exigência de verdade só entra numa
// etapa separada, depois, mudando firestore.rules (não acontece sozinho
// só por este arquivo existir).
const APP_CHECK_SITE_KEY = "6LdYxv0tAAAAAGN2kq_SW53OMe3OdX09NJ2VcyzQ";

// DESATIVADO (08/11) — achado real do usuário: a troca de token com o
// reCAPTCHA Enterprise passou a voltar "400 Bad Request" sempre, o App
// Check entra em estado "throttled", e isso quebrava de verdade a
// gravação de lançamentos de reserva no Firestore (erro confuso
// "Expected type 'Vd', but it was: a custom Bd object" — sintoma
// indireto do App Check travado, não um bug no código de gravação).
// Causa provável: reCAPTCHA Enterprise normalmente exige uma conta de
// faturamento vinculada no Google Cloud mesmo dentro do nível
// gratuito — nunca foi habilitada (usuário recusa qualquer plano
// pago). Como a exigência de verdade NUNCA chegou a ser ativada do
// lado do servidor (ver comentário antigo abaixo), essa proteção não
// estava bloqueando ninguém mesmo — só quebrando gravações reais.
// Desativada até existir uma forma gratuita e funcional de reativar.
const APP_CHECK_ATIVO = false;

try {
    if (APP_CHECK_ATIVO && APP_CHECK_SITE_KEY && !APP_CHECK_SITE_KEY.startsWith("COLOQUE_AQUI") && firebase.appCheck) {
        firebase.appCheck().activate(
            new firebase.appCheck.ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
            true // atualiza o token sozinho antes de expirar
        );
        console.log('🔒 App Check ativado');
    } else {
        console.log('ℹ️ App Check: desativado (ver app-check-config.js)');
    }
} catch (e) {
    console.warn('App Check não pôde ser ativado:', e);
}
