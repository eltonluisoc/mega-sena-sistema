const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit.
setGlobalOptions({ maxInstances: 10 });

// ============================================================
// Mediação de leitura de dados pessoais de participantes.
//
// Antes, consulta.js (busca por telefone) e consulta.html (link por
// token) baixavam a coleção "participantes" INTEIRA para o navegador
// (nome, telefone, valor pago, situação de TODOS os participantes de
// TODOS os bolões) e filtravam no cliente. Qualquer visitante podia
// ver esses dados de qualquer pessoa via console do navegador, mesmo
// sem token válido. As duas funções abaixo fazem essa busca no
// servidor (via Admin SDK, que ignora as regras do Firestore) e
// devolvem só o que a pessoa que perguntou tem direito de ver: os
// próprios bolões, e a lista pública de bolões abertos para participar.
// ============================================================

function normalizarTelefone(telefone) {
  return (telefone || "").toString().replace(/\D/g, "");
}

function aplicarCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

async function buscarBoloesPorTelefoneNormalizado(telefoneNormalizado) {
  const [configSnap, participantesSnap] = await Promise.all([
    db.collection("config_boloes").doc("ativos").get(),
    db.collection("participantes").get(),
  ]);
  const statusMap = configSnap.exists ? (configSnap.data().status || {}) : {};

  const participa = [];
  const abertosParaParticipar = [];

  participantesSnap.forEach((doc) => {
    const bolao = doc.data();
    const participantes = bolao.participantes || [];
    const status = statusMap[doc.id] || "andamento";

    const encontrado = participantes.find(
        (p) => normalizarTelefone(p.telefone) === telefoneNormalizado,
    );

    const infoPublica = {
      id: doc.id,
      titulo: bolao.titulo || "Bolão sem título",
      loteria: bolao.loteria || "?",
      concurso: bolao.concurso || "?",
      valorPorCota: bolao.valorPorCota || 0,
      dataLimite: bolao.dataLimite || "",
      status,
    };

    if (encontrado) {
      participa.push({
        ...infoPublica,
        meuStatus: encontrado.situacao || "em_andamento",
        minhasCotas: encontrado.quantidadeCotas || 1,
        meuValorPago: encontrado.valorPago || 0,
        meuNome: encontrado.nome || "",
      });
    } else if (status === "aberto") {
      abertosParaParticipar.push(infoPublica);
    }
  });

  return { participa, abertosParaParticipar };
}

// POST { telefone: "61999999999" } -> { participa: [...], abertosParaParticipar: [...] }
exports.buscarBoloesPorTelefone = onRequest(async (req, res) => {
  aplicarCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({erro: "Método não permitido"});
    return;
  }

  const telefoneNormalizado = normalizarTelefone(req.body && req.body.telefone);
  if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
    res.status(400).json({erro: "Telefone inválido"});
    return;
  }

  try {
    const resultado = await buscarBoloesPorTelefoneNormalizado(telefoneNormalizado);
    res.status(200).json(resultado);
  } catch (error) {
    logger.error("Erro em buscarBoloesPorTelefone", error);
    res.status(500).json({erro: "Erro interno"});
  }
});

// POST { token: "abc123" } -> { nome, telefone, participa: [...], abertosParaParticipar: [...] }
exports.buscarBoloesPorToken = onRequest(async (req, res) => {
  aplicarCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({erro: "Método não permitido"});
    return;
  }

  const token = ((req.body && req.body.token) || "").toString().trim();
  if (!token) {
    res.status(400).json({erro: "Token não informado"});
    return;
  }

  try {
    const tokenDoc = await db.collection("participantes_tokens").doc(token).get();
    if (!tokenDoc.exists || tokenDoc.data().ativo !== true) {
      res.status(404).json({erro: "Token inválido ou revogado"});
      return;
    }

    const dadosToken = tokenDoc.data();
    const telefoneNormalizado = normalizarTelefone(dadosToken.telefone);
    const resultado = await buscarBoloesPorTelefoneNormalizado(telefoneNormalizado);

    res.status(200).json({
      nome: dadosToken.nome || "",
      telefone: dadosToken.telefone || "",
      ...resultado,
    });
  } catch (error) {
    logger.error("Erro em buscarBoloesPorToken", error);
    res.status(500).json({erro: "Erro interno"});
  }
});
