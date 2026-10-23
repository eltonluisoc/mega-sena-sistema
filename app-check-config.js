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
// PASSO MANUAL NECESSÁRIO (só o dono da conta Google consegue fazer):
// 1. Criar um site reCAPTCHA v3 em https://www.google.com/recaptcha/admin/create
//    — domínio: eltonluisoc.github.io (ou o domínio real do site, se
//    tiver um domínio próprio configurado).
// 2. Copiar a "Site Key" gerada.
// 3. No Firebase Console → Configurações do Projeto → App Check → app
//    Web → Registrar → escolher "reCAPTCHA v3" → colar a Site Key.
// 4. Colar essa MESMA Site Key na constante abaixo, no lugar do
//    placeholder.
//
// Enquanto a chave continuar sendo o placeholder, isto não faz nada
// (nem quebra nada) — o App Check só passa a ser EXIGIDO de verdade
// numa etapa separada, depois, mudando firestore.rules (não acontece
// sozinho só por este arquivo existir).
const APP_CHECK_SITE_KEY = "COLOQUE_AQUI_A_CHAVE_RECAPTCHA_V3";

try {
    if (APP_CHECK_SITE_KEY && !APP_CHECK_SITE_KEY.startsWith("COLOQUE_AQUI") && firebase.appCheck) {
        firebase.appCheck().activate(
            new firebase.appCheck.ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
            true // atualiza o token sozinho antes de expirar
        );
        console.log('🔒 App Check ativado');
    } else {
        console.log('ℹ️ App Check: chave reCAPTCHA v3 ainda não configurada (ver app-check-config.js)');
    }
} catch (e) {
    console.warn('App Check não pôde ser ativado:', e);
}
