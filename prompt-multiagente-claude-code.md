# Prompt: Evolução de Sistema com Multiagentes (Claude Code)

Quero que você atue como um **orquestrador de agentes** para evoluir o sistema abaixo para uma nova versão. Use pelo menos **8 agentes especializados** (via Task tool / subagentes), cada um com uma função clara e entregável específico. Não faça o trabalho sozinho de forma monolítica — divida entre os agentes e sintetize os resultados no final.

## Contexto do projeto

- **Nome do sistema:** Bolões Aleatórios (repositório GitHub `mega-sena-sistema`, pasta local `CONTROLE_BOLOES`)
- **Stack atual:**
  - Site público + painel admin: HTML/CSS/JavaScript puro (sem framework, sem build step), hospedado no GitHub Pages
  - Backend: Firebase — Firestore (banco de dados), Firebase Authentication (login do admin), Firebase Analytics
  - Automação: 1 Cloud Function agendada em `functions/index.js` (bot Telegram de loteria acumulada — hoje redundante com `bot-telegram.js` via GitHub Actions; candidata a remoção futura)
  - Ferramenta desktop paralela: `bolao_pro_v3.py` (Python 3 + Tkinter + SQLite), usada para gestão offline de bolões/reservas financeiras, sincroniza com o mesmo Firestore via REST API
- **Descrição atual:** Sistema para gerir bolões de loteria (Mega-Sena, Lotofácil, Quina): cadastro de cartões (individual, em lote, ou via ferramenta desktop), conferência automática de resultados, gestão de participantes/pagamentos/reservas financeiras, geração de links de acesso pessoal por token, dashboard com estatísticas. `index.html` é a página pública onde participantes conferem resultados e sua situação; `admin.html` é de uso exclusivo do dono do sistema.
- **Objetivo da nova versão:** Evoluir o sistema para um padrão profissional — seguro, sem código morto/duplicado, com métricas confiáveis e telas revisadas uma a uma — com a perspectiva de eventualmente se tornar um produto rentável (não só uso pessoal).

## Estado atual — o que já evoluímos nesta sessão

Resumo do que já foi feito e verificado, para os agentes não refazerem nem contradizerem:

**Segurança**
- Login do admin trocado de hash MD5 verificado no navegador (burlável via `localStorage.setItem` no console) para Firebase Authentication real (e-mail/senha)
- Regras do Firestore reescritas do zero: antes qualquer pessoa podia ler *e escrever* em todas as coleções; agora escrita/exclusão exigem `request.auth != null` nas coleções sensíveis (`cartoes`, `participantes`, `participantes_tokens`, `reservas_participantes`, `config_boloes`, `config_geral`, `participantes_pendentes`, `resultados_mega/lotofacil/quina`). Leitura continua pública (necessária — as páginas públicas não têm backend próprio). `resultados_conferidos` mantém escrita pública de propósito (cache de resultado oficial da loteria, dado público e de baixo risco)
- `bolao_pro_v3.py` (ferramenta desktop) adaptado para autenticar no Firebase antes de escrever — pede a senha do admin numa caixinha na primeira sincronização de cada sessão, guarda só em memória (nunca em disco/variável de ambiente)

**Infraestrutura**
- Service Worker (`sw.js`) trocado de estratégia "cache primeiro" para "rede primeiro" — deploys novos paravam de aparecer pros usuários, escondidos atrás de cache antigo

**Limpeza de código (`admin.js`, foi de ~4200 para ~3100 linhas)**
- Removido código morto inalcançável: cadastro por imagem/OCR (nunca leu imagem de verdade, só simulava com números aleatórios), formulário de cadastro em textarea legado, importação via `prompt()`, importação CSV (a pedido), feature "participante rápido" inteira, botão "Forçar Recarregar" (duplicava leituras no Firestore à toa), botão "Duplicar Cartão" (quebrado, não fazia falta)
- Corrigidas múltiplas funções duplicadas silenciosas — em JavaScript a última declaração de uma função sempre vence; havia versões antigas/quebradas "escondendo" versões novas corretas, causando bugs reais (ex.: dashboard sempre mostrando "-" nos melhores resultados por um erro engolido por `try/catch`)
- Corrigido bug de CSS: a regra `input { appearance: none }` (sem qualificar o tipo) deixava **todos** os checkboxes do admin sem feedback visual de "marcado" (modo seleção, seleção de cartões, bolões, destaque)
- Implementada do zero a funcionalidade "Alterar Tipo" em lote — existia botão na tela sem nenhum código funcional por trás

**Dashboard (admin)**
- Corrigidos: Total de Bolões (cada concurso cadastrado conta como um bolão distinto, mesmo reaproveitando nome), Maior Bolão (agora mostra o concurso), ranking Top-3 por concurso/loteria (desempate por quantidade de cartões no nível, piso mínimo de "prêmio" — duque+ na Mega/Quina, 11+ pontos na Lotofácil — pra não listar "1 acerto" como conquista)
- Substituída a métrica "Probabilidade Média" (aproximação linear grosseira, sem relação real com chance de ganhar, misturava as 3 loterias) por "Bilhetes Jogados" (cálculo combinatório real — `combinação(n,k)` — mesmo usado no card "Potencial do Bolão" do site público)
- Removidos cards enganosos: "Média de Participantes/Bolão" (só existia 1 bolão formalizado com lista de participantes, o número não significava nada) e "Maiores Acertos" (redundante com os cards por loteria)

**Site público (`index.html` / `script.js`)**
- Card "Potencial do Bolão" agora aparece também em concursos já conferidos anteriormente (antes só aparecia no concurso mais recente, ainda não conferido)

## Requisitos que NÃO podem regredir

- Login do admin deve continuar exigindo autenticação real via Firebase Auth — não voltar a senha em JS/localStorage
- Regras do Firestore devem continuar bloqueando escrita anônima nas coleções sensíveis listadas acima
- `bolao_pro_v3.py` deve continuar se autenticando antes de escrever no Firestore
- Leitura pública de `index.html`, `consulta.html`, `meus-boloes.html`, `participantes.html` não pode passar a exigir login — não têm backend próprio
- `resultados_conferidos` deve continuar com escrita pública (usado pelo site público ao conferir resultados)
- Service Worker deve continuar em estratégia "rede primeiro" (não voltar a cachear agressivamente o HTML/JS) — e `forcarAtualizacaoCache()` (que desregistrava o SW a cada load) não pode voltar
- `participantes.html` deve continuar funcionando sem login, lendo 1 documento por vez (`get`) — só a listagem da coleção inteira (`list`) é que foi restringida
- `consulta.html` deve continuar aceitando acesso público por `?token=` sem login

## Rodada 2 — Multiagentes (Arquiteto + Requisitos) e o que evoluiu depois

Rodei os agentes "Arquiteto" e "Levantamento de Requisitos" (fase de pesquisa, sem editar nada) pra mapear o que falta pra próxima versão. Achados críticos novos, já corrigidos:

- **`participantes_tokens` e `reservas_participantes` eram listáveis publicamente** — a regra genérica `match /{document=**} { allow read: if true }` cobria tudo, inclusive isso. Qualquer um podia listar todos os tokens de acesso válidos + nome + telefone (o sistema de "link pessoal" não tinha segurança nenhuma), e todos os saldos financeiros por pessoa. Corrigido: `firestore.rules` reescrita sem a regra coringa, cada coleção declara `read`/`write` explicitamente; `participantes_tokens` permite `get` público (necessário pra `consulta.html` verificar o token do visitante) mas restringe `list` ao admin; `reservas_participantes` fica inteiramente restrita ao admin; `participantes` segue com `get` E `list` públicos por enquanto (ver item pendente abaixo).
- **`forcarAtualizacaoCache()` desregistrava o Service Worker a cada load do `index.html`** — anulava sozinha a correção "rede primeiro" feita antes. Removida.
- **Os dois caminhos de conferência de resultado (`conferirResultados` e `exibirResultadoSalvo`) davam números diferentes pro mesmo concurso** — um respeitava o filtro de bolão selecionado, o outro ignorava. Unificados.
- **`consulta.js` (busca por telefone): status do bolão nunca era aplicado** — a busca em `config_boloes` era assíncrona e disparada dentro do loop, resolvendo depois do bolão já ter sido adicionado à lista com o valor padrão "em andamento". Corrigido pra buscar uma vez, antes do loop.

### Pendente — bloqueado por decisão de custo, não por código

- **Exposição de dados pessoais em `participantes` continua aberta.** `consulta.js` e `consulta.html` ainda baixam a coleção `participantes` inteira (nome, telefone, valor pago, situação de TODOS os participantes de TODOS os bolões) e filtram no navegador. A correção desenhada: duas Cloud Functions (`buscarBoloesPorTelefone`, `buscarBoloesPorToken`, já escritas em `functions/functions/index.js`) fazem essa busca no servidor via Admin SDK e devolvem só o que cada pessoa tem direito de ver. **Não foi possível fazer o deploy**: o projeto está no plano Spark (gratuito) do Firebase, e Cloud Functions exigem o plano Blaze (pago por uso, com camada gratuita generosa — tende a ficar em R$0/mês nesse volume de uso, mas exige cartão cadastrado). Decisão de não mexer em plano/pagamento por enquanto. Quando decidirem fazer o upgrade: `firebase deploy --only functions --project mega-sena-sistema` (rodar dentro de `functions/`), depois trocar as chamadas `db.collection('participantes').get()` em `consulta.js`/`consulta.html` por `fetch()` nas novas functions, e por fim restringir `participantes` no `firestore.rules` do mesmo jeito que já foi feito com `participantes_tokens`/`reservas_participantes`.

## Agentes a utilizar

1. **Agente Arquiteto** — analisa a estrutura atual do código, mapeia dependências e propõe o desenho técnico da nova versão (módulos, fluxo de dados, pontos de risco).
2. **Agente de Levantamento de Requisitos** — lê o código e/ou documentação existente e lista requisitos funcionais e não funcionais da versão nova, incluindo o que NÃO pode regredir.
3. **Agente Desenvolvedor Core** — implementa a lógica principal/backend da nova versão conforme o desenho do Arquiteto.
4. **Agente Desenvolvedor de Interface** — implementa ou ajusta a camada de UI/UX (Tkinter, React, etc.), quando aplicável.
5. **Agente de Dados/Persistência** — cuida de schema de banco, migrações e integridade dos dados existentes.
6. **Agente de Testes/QA** — escreve e roda testes (unitários e de integração), cobrindo cenários críticos e casos de borda.
7. **Agente Revisor de Código** — revisa tudo que os demais agentes produziram, aponta contradições, riscos, código duplicado e desvios do desenho original.
8. **Agente de Segurança e Performance** — avalia riscos de segurança (validação de dados, exposição de credenciais, etc.) e gargalos de performance.
9. **Agente de Documentação** — atualiza README, changelog e comentários relevantes, documentando o que mudou e por quê.

## Fluxo de trabalho esperado

1. Arquiteto + Levantamento de Requisitos trabalham primeiro e em paralelo, depois convergem num plano único.
2. Desenvolvedores (Core, Interface, Dados) implementam com base no plano aprovado.
3. QA e Revisor atuam sobre o código já implementado, de forma independente entre si.
4. Segurança/Performance revisa por último, antes da documentação.
5. Ao final, apresente um **resumo consolidado**: o que foi feito, decisões tomadas, contradições encontradas entre agentes (se houver) e como foram resolvidas, e o que ficou pendente.

## Regras obrigatórias

- Cada agente deve declarar explicitamente seu papel e escopo antes de agir.
- Nenhum agente deve sobrescrever o trabalho de outro sem justificativa registrada.
- Aponte **contradições** entre as decisões dos agentes (ex: Arquiteto propõe X, mas Desenvolvedor implementa Y) antes de finalizar.
- Não quebrar funcionalidades existentes sem aviso explícito no resumo final.
- Ao terminar, listar arquivos alterados/criados e comandos para rodar/testar a nova versão.
