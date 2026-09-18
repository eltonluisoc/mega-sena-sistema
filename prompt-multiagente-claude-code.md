# Prompt: Evolução de Sistema com Multiagentes (Claude Code)

Quero que você atue como um **orquestrador de agentes** para evoluir o sistema abaixo para uma nova versão. Use pelo menos **8 agentes especializados** (via Task tool / subagentes), cada um com uma função clara e entregável específico. Não faça o trabalho sozinho de forma monolítica — divida entre os agentes e sintetize os resultados no final.

## Contexto do projeto

- **Nome do sistema:** Bolões Aleatórios (repositório GitHub `mega-sena-sistema`, pasta local `CONTROLE_BOLOES`)
- **Stack atual:**
  - Site público + painel admin: HTML/CSS/JavaScript puro (sem framework, sem build step), hospedado no GitHub Pages
  - Backend: Firebase — Firestore (banco de dados), Firebase Authentication (login do admin), Firebase Analytics
  - Automação: nenhuma no momento — o bot Telegram de loteria acumulada (`functions/index.js` duplicado + `bot-telegram.js`/GitHub Actions) foi removido na Rodada 14 (token exposto no repo público + usuário não usava)
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

## Rodada 3 — dinheiro decimal, ID estável, integração desktop↔web, testes, UX

Trabalho feito depois da Rodada 2, incluindo uma investigação dedicada (agente) à confiabilidade da sincronização entre `bolao_pro_v3.py` (desktop) e o site.

**Dados/integridade**
- `valorPorCota` (e `valorPago` no desktop) migrado de `integerValue` (sem centavos) para `doubleValue` em todos os pontos de escrita, dos dois lados
- `boloes.firebase_doc_id` (SQLite): ID do documento Firestore gerado uma única vez e reaproveitado sempre — antes, renomear um bolão publicado recalculava o ID a partir do título e criava um documento duplicado/órfão no Firebase
- Escritas do Firestore (PATCH) passaram a usar `updateMask.fieldPaths` — antes sobrescreviam o documento inteiro; hoje é inofensivo (nada mais escreve nesses docs), mas evitava um risco futuro
- PATCH de bolão já publicado (`firebase_doc_id` salvo) exige `currentDocument.exists=true`: se o admin excluir o bolão no site, o próximo fechamento do desktop **não recria mais o documento** — marca `encerrado=1` localmente em vez disso
- "Remover do site" no desktop agora usa o `firebase_doc_id` salvo em vez de buscar por título (falhava depois de renomear)
- Fechar o app não esconde mais erro de sincronização: só fecha sozinho se tudo deu certo; com erro, exige fechamento manual e mantém o log visível
- Senha do Firebase agora é pedida na abertura do app (fica em cache pro resto da sessão), não mais no meio do fechamento

**Testes e documentação**
- `test/` com 16 testes automatizados (`node --test`, sem dependências extras) cobrindo as funções puras do site (combinatória de cartões, nível de acerto, ordenação por acertos, telefone) via `node:vm`, sem modificar `script.js`/`consulta.js`
- `README.md` criado (arquitetura, como rodar site/desktop, deploy, notas de segurança); `package.json` com nome/versão/scripts

**Bugs corrigidos no site**
- Cartões na tela de conferência de resultado não vinham ordenados por acertos (só a tela de "resultado já conferido" ordenava; a que desenha a lista de fato, `mostrarCartoes()`, não)
- Banner de instalação PWA quebrava palavra por linha no Safari iOS ("font boosting" automático em coluna estreita, sem `text-size-adjust: 100%` pra desativar)
- Botão "Salvar como App" quase invisível (cinza sobre cinza no rodapé)
- Dashboard do admin: 5 cards condensados em 3, removendo números repetidos ("Total de Cartões" x "Cartões por Loteria" mostravam o mesmo total duas vezes; idem "Total de Bolões" x "Maior Bolão")
- Avisos de confidencialidade adicionados no login e no topo do dashboard do admin

**UX no cadastro do desktop (fluxo "importar membro de bolão anterior + pagar")**
- Importar membro já recalcula o valor esperado (antes deixava "0,00" fixo)
- Confirmação de importação virou aviso inline (era popup bloqueante)
- Atalhos: Enter busca, duplo-clique importa, Enter registra o pagamento (campos já vêm com o padrão preenchido)

### Achados da investigação de integração desktop↔web ainda NÃO corrigidos

Investigação dedicada (leitura completa dos caminhos de sync) achou mais itens, priorizados; só os 4 críticos acima foram corrigidos até agora. Ainda pendentes:

- **Centavos perdidos no `valorPago`** publicado pelo desktop (`int(round(pago))` em vez de manter o float) — ex.: R$45,50 vira R$46 no site
- **Colisão de ID em reservas sem telefone**: duas pessoas com o mesmo nome e sem telefone geram o mesmo doc ID em `reservas_participantes`, uma sobrescreve a outra
- **Duas tabelas de mapeamento de ID hardcoded** no desktop (`FIREBASE_BOLAO_IDS` vs `FIREBASE_IDS`), resquício que o `firebase_doc_id` já deveria ter aposentado — as chaves duplicadas/mortas dentro de cada uma foram limpas na Rodada 4, mas as duas tabelas continuam existindo separadamente (só usadas no 1º publish de um bolão, antes de existir `firebase_doc_id`; unificá-las de vez segue pendente)
- **Prompt de senha sem timeout** podia travar o fechamento do app (mitigado, mas não eliminado, pelo login antecipado na abertura)
- `dataLimite` escrito pelo desktop no documento do bolão é campo morto (o site usa `config_boloes/ativos` como fonte real)
- `vagasDisponiveis`/`vagasTotais` são lidos por `script.js` mas nunca escritos por ninguém
- Feature "Sincronizar Participantes Pendentes" no desktop é código morto (nenhum lugar escreve na coleção `participantes_pendentes`, e as regras já exigem admin pra escrever lá)

## Rodada 4 — Revisão multiagente de qualidade (4 agentes de pesquisa: desktop, web, segurança, produto)

Rodada dedicada a "evoluir pra um padrão profissional", cobrindo desktop e web juntos a pedido do usuário. 4 agentes de pesquisa (sem editar nada) rodaram em paralelo; todos os achados foram mostrados pro usuário antes de qualquer correção, que aprovou corrigir tudo (críticos + importantes + menores). Também: a senha do Firebase no desktop passou a ser pedida na abertura do app (fica em cache pro resto da sessão), não mais no meio do fechamento.

**Críticos de segurança corrigidos (achados por 2 agentes independentes, reforçando confiança)**
- `resultados_conferidos` aceitava escrita pública sem validação — qualquer visitante podia forjar o resultado de um sorteio já conferido a qualquer momento, e o site confiava cegamente nesse cache sem revalidar contra a API oficial depois. `firestore.rules` agora só permite `create` (com validação de shape/tipo); `update`/`delete` exigem admin. Deployado e verificado com 4 testes reais via REST API (create inválido bloqueado, update anônimo bloqueado, create válido funciona, sobrescrita anônima do doc recém-criado bloqueada). Precisou criar `firebase.json`/`.firebaserc` na raiz (faltava config de deploy pra `firestore:rules` fora da pasta `functions/`).
- `gerarTokenUnico()` (token que protege `consulta.html?token=...`) usava `Math.random()` — PRNG não criptográfico, previsível a partir de algumas amostras. Trocado por `crypto.getRandomValues()`.
- Nome de participante/título de bolão iam pro `innerHTML` sem escapar em `script.js`, `admin.js`, `consulta.js`, `consulta.html` e `participantes.html` — XSS armazenado, inclusive dentro da sessão autenticada do admin. Adicionado `escapeHtml()` (escapa `<>&"'`) em cada arquivo, aplicado em toda interpolação de nome/título em `innerHTML` ou atributo `data-*`.

**Importantes corrigidos — web**
- `formatarTelefone()` divergia entre `admin.js`/`consulta.html` (formato errado, sem parênteses) e `consulta.js` (formato correto) — alinhados.
- Diálogo "Limpar Seleção" tinha semântica OK/Cancelar invertida: fechar com Esc (= Cancelar) acionava a ação destrutiva. Invertido.
- Botão "🔄 RECARREGAR" na aba Cartões do admin não tinha handler — ligado a `carregarDadosAdmin()`.

**Importantes corrigidos — desktop**
- `to_float()` zerava valor inválido de pagamento silenciosamente, sem avisar — corrigido nos 2 pontos que editam PAGAMENTO (não em `valor_esperado`, que legitimamente aceita zero — caso do ADM isento).
- Auto-atualização do Dashboard ao trocar de aba estava morta havia tempo: dois `bind()` no mesmo notebook, o segundo sobrescrevendo o primeiro em silêncio, e a condição que sobrou nunca era verdadeira. Corrigido com 2 binds em widgets diferentes.
- Registrar pagamento não atualizava Dashboard/Relatório na hora.
- "É o administrador?" divergia entre o Relatório (só checava a flag `is_adm`) e Dashboard/Cards/publicação pro Firebase (checavam flag OU nome batendo com `adm_nome`) — Relatório unificado com o mesmo critério.
- Publicação manual de bolão ganhou a mesma trava de "sem valor de cota" que a sincronização automática já tinha.

**Menores corrigidos**
- Web: removidas 2 funções mortas em `script.js`, markup morto (`#loadingIndicator`) em `index.html`, texto de 9px do link de convite subiu pra 12px, comentário cruzado nas 2 cópias de `combinacao()`.
- Desktop: excluir bolão agora limpa `saques_emergenciais`/`taxa_adm` também (ficavam órfãos); removidas 2 funções stub mortas; chaves duplicadas/mortas removidas de `FIREBASE_BOLAO_IDS`/`FIREBASE_IDS`; reimplementação inline de `fmt_brl()` trocada pela função existente.

### Deliberadamente NÃO corrigido nesta rodada (escopo/risco)

- **Unificar de vez `FIREBASE_BOLAO_IDS`/`FIREBASE_IDS`** numa tabela só, ou eliminá-las (só valem no 1º publish de um bolão) — limpeza pontual feita, unificação completa fica pra depois.
- **Unificar a lógica de payload do Firebase** (hoje triplicada entre `enviar_bolao_para_site()`, o bloco inline de `_on_close`, e `_pub_montar_dados_impl()`) — só a divergência concreta (trava de valor de cota faltando na publicação manual) foi corrigida; a unificação completa é um refactor maior, adiado por risco de regressão num app que não dá pra testar visualmente aqui.
- **Refatorar funções grandes do desktop** (`_adm_load` com N+1 queries, `_dash_load`/`_cards_visuais` misturando UI+regra+SQL) — mesma razão: alto risco, baixo retorno imediato.
- **Mover a navegação de abas do admin (`admin.html`) pra dentro de `admin.js`** — só organização, sem valor funcional, não valia o risco.
- **Self-signup do Firebase Auth não restrito** — não é bug de código, é uma configuração a mudar no Console do Firebase (desabilitar criação de conta por padrão pro provedor Email/Password); baixa prioridade, nenhum caso de uso legítimo depende disso hoje.
- **Achados da investigação de integração desktop↔web da Rodada 3** (centavos perdidos em `valorPago`, colisão de ID em reservas sem telefone, `dataLimite`/`vagasDisponiveis` mortos, "Sincronizar Pendentes" morto) — continuam pendentes, listados acima.
- **Avaliação de prontidão de produto** (mono-admin hardcoded em 3 lugares, app desktop preso a 1 projeto Firebase, zero onboarding self-service, leitura ineficiente que escala mal, Analytics sem eventos de negócio, falta notificação proativa de resultado) — é decisão estratégica, não bug; documentado pro usuário decidir se/quando perseguir virar produto multi-tenant.

## Rodada 5 — Sincronização de reservas nos dois sentidos + achados de arquitetura de informação nas abas

**Reservas: sincronização web→desktop (feature nova)**

Antes, reservas pessoais só sincronizavam desktop→site (o app publica saldo/histórico calculado do SQLite local, sobrescrevendo o documento inteiro no Firestore). Não existia caminho contrário — um depósito feito "no campo" só entrava no sistema se alguém abrisse o desktop e lançasse manualmente.

Implementado seguindo o mesmo padrão de fila que já existia (morto) pra `participantes_pendentes`:
- Nova coleção `reservas_movimentos_pendentes` no Firestore (`allow read, write: if isAdmin()` — deployado e testado: escrita/leitura anônima bloqueadas com 403).
- Admin web (`admin.html`/`admin.js`, seção Reservas): botão "➕ REGISTRAR MOVIMENTO" abre modal pra lançar depósito OU saque/uso, pra pessoa já cadastrada OU pessoa nova (nome+telefone+PIX opcional). Grava na fila, não altera o saldo na hora (deixa isso explícito no toast de confirmação).
- Desktop (`bolao_pro_v3.py`): `_importar_movimentos_pendentes_web()`, chamada logo após o login inicial na abertura do app. Busca a pessoa local por telefone (prioridade) ou nome; se não achar, cria. Insere o movimento em `reservas_movimentos` local, apaga o item da fila no Firestore, e mostra um aviso resumido ("N movimentos importados do site: depósitos RX, saques RY") só se houver algo pra importar — silencioso quando a fila está vazia.
- Depois de importado, o próximo push do desktop pro site (fechamento ou publicação manual) já inclui o movimento normalmente, porque ele passa a fazer parte do SQLite local — não precisou mexer na lógica de push existente.

**Achados de arquitetura de informação nas abas do desktop (apresentados, aguardando aprovação pra aplicar)**
- "✏ Editar" (Financeiro) é redundante com "📋 Histórico" — Histórico já cobre 100% do caso de uso de Editar (busca por nome + duplo-clique pra editar) e tem mais recursos (KPIs, filtro, export). Candidata a remoção.
- Sub-aba "🔄 Sincronizar Participantes" (dentro de Site/Publicar) corresponde à feature já identificada como código morto na Rodada 4 — remover a aba junto com o código.
- Nomes parecidos demais pra conceitos diferentes: "💼 Reserva/Caixa" (Gestão, fundo de caixa do bolão) vs "💰 Reservas Pessoais" (Financeiro, saldo de cada pessoa).

## Rodada 6 — Bug financeiro grave (ADM isento contado nos totais) + fusão Dashboard/Administração

O usuário relatou 3 vezes (com exemplos numéricos reais) que "Total Esperado" no Dashboard incluía o valor esperado dele mesmo em bolões onde está configurado como ADM isento (não paga) — ex.: Mega da Virada com 47 participantes, sendo 46 pagantes de verdade, mostrava o total como se fossem 47.

**Causa raiz encontrada**: `valor_esperado` do ADM só é zerado automaticamente no cadastro se ele for cadastrado DEPOIS do bolão já estar marcado como isento (`_cad_adm_toggle`). Se o bolão virou isento depois de já cadastrado, o valor antigo fica salvo no banco — e o Dashboard calculava "Total Esperado" com um `SUM(valor_esperado)` cru, sem excluir quem é ADM isento pelo critério `is_adm`/nome. `total_pago`/`total_saldo` já excluíam corretamente (via `_status_part_adm`), só "esperado" estava errado.

**Corrigido**:
- `_dash_load()`: `total_esp` agora é somado dentro do mesmo loop que já detecta `eh_adm and not adm_paga`, excluindo o ADM isento de todos os totais (esperado, arrecadado, pendente) de forma consistente — removida a lógica antiga que somava `SUM(valor_esperado)` cru e ainda adicionava 1 cota extra se o ADM isento não estivesse cadastrado.
- `_gerar_rel()` (Relatório): a linha sintética do ADM isento também inflava `te`/`tp` (esperado E arrecadado) com o valor dele — removido, a linha agora só aparece como "QUITADO (isento)" sem entrar em nenhum total.
- `_registrar_pag()`: aviso (não bloqueio) ao tentar registrar um pagamento pro ADM isento — esse tipo de lançamento aparecia escondido no "Total Recebido" da aba Depósitos mesmo o ADM não pagando (Depósitos em si está correto — soma `pagamentos` reais, que por construção não deveriam ter linha pro isento; o aviso é preventivo contra dado incorreto).
- Auditoria: Cards Visuais (só conta status, sem soma monetária — ok), publicação pro site (`_pub_montar_dados_impl`/`_on_close`, já zeravam `valorPago` do ADM isento corretamente — ok), Administração/atrasados (já excluía corretamente — ok).

**UI: Dashboard + Administração fundidos numa tela só** (pedido do usuário, aprovado com "rolagem" em vez de lado-a-lado): "Início" tinha 3 níveis de abas (Início > Administração > Visão Geral/Pendências). Agora são 2 abas diretas: "🏠 Visão Geral" (Dashboard do bolão + resumo da Administração empilhados, com scroll do mouse) e "📅 Pendências por Bolão" (promovida a aba própria, como pedido). Bloco "Ganhos por Loteria" também ficou menor (só 3-4 loterias, não precisava do mesmo espaço do Histórico).

### Rodada 7 — os 3 itens de arquitetura de informação, aprovados e aplicados (v4.1)
- Aba "✏ Editar" removida (redundante com Histórico). Histórico ganhou botão "🗑 Excluir Selecionado" (mesma trava: não deixa excluir pagamento já depositado) pra cobrir a única diferença real que havia.
- Sub-aba "🔄 Sincronizar Participantes" removida (código morto confirmado). A limpeza de "Pagamentos Órfãos" que vivia dentro dela foi preservada e virou botão em "📋 Histórico" — é uma utilidade independente, ainda relevante.
- "💼 Reserva / Caixa" renomeada pra "💼 Caixa por Loteria", pra não confundir com "💰 Reservas Pessoais" (conceitos diferentes: fundo do organizador vs. saldo de cada pessoa).

## Rodada 8 — Reestruturação completa de "Início > Visão Geral" (v4.2 → v5.0)

Sequência de feedback real de uso, culminando numa reestruturação grande:

**v4.2** — Bug de UX: a rolagem do mouse não funcionava na tela fundida. Causa: `bind("<MouseWheel>", ...)` direto no canvas só dispara com o cursor sobre a área vazia dele, quase impossível numa tela cheia de widgets. Corrigido com o padrão certo: `bind_all` ligado/desligado via `<Enter>`/`<Leave>` no canvas.

**v4.3** — Pedido de revisão de UX da tela fundida. 3 tentativas de usar o modelo Opus como segunda opinião falharam por sobrecarga do servidor (erro 529, três vezes seguidas — instabilidade real, não da tarefa). A revisão foi feita por Sonnet mesmo, lendo `_build_dashboard()`/`_dash_load()` por completo: achou e corrigiu 5 problemas (árvores com altura herdada de tela cheia, 3 números duplicados entre KPIs e bloco Financeiro, divisória fraca demais entre as duas metades da tela, cores de KPI repetindo significado entre as duas metades, formulário de ação espremido no meio de uma leitura longa).

**v5.0** — Feedback de que a tela ainda não estava boa: o usuário queria a visão geral (todos os bolões) **primeiro**, não o bolão selecionado. Junto, achado um bug real: a coluna "Devidas" em Participantes Atrasados mostrava um número cumulativo (parcelas esperadas desde o início do bolão, ex.: 8), não quanto realmente falta (ex.: pagou 7 de 8 → falta só 1) — confundia porque a coluna "Saldo" ao lado já mostrava o valor certo. Reestruturação completa, aprovada antes de implementar:
- Corrigida a coluna (virou "Faltam" = Devidas − Pagas).
- Ordem invertida: Visão Geral (todos os bolões) primeiro — 7 KPIs essenciais (Bolões Ativos, Arrecadado Geral, Pendente Depósito Geral, Participantes Atrasados, Total Ganho/Sacado/Saldo do organizador), Depósitos Pendentes, Participantes Atrasados, novo bloco "Últimos Pagamentos (Geral)", Histórico de Lançamentos.
- "Ganhos por Loteria" e "Registrar Lançamento" viraram botões que abrem janelas próprias (`_abrir_ganhos_por_loteria`/`_abrir_registrar_lancamento`) — não competem mais por espaço com informação essencial.
- Novo seletor de bolão: cartões clicáveis (`_atualizar_cartoes_bolao`) em vez do combo pequeno do cabeçalho. `_on_bolao_sel` fatorado numa `_selecionar_bolao_por_id` compartilhada.
- Abaixo do seletor: resumo do bolão (6 KPIs) primeiro, detalhe depois — mesmo conteúdo de antes, reordenado.

## Rodada 9 — Bug de calibração na probabilidade (Lotofácil/Quina) + visual premium do index

**Bug real em `calcularChancesBolao()` (script.js)**: a matemática combinatória (`combinacao(n,k)`, universo de cada loteria) já estava correta pras 3 loterias — o problema era a classificação por estrelas (★) usar faixas fixas de "bilhetes equivalentes" (>=10000 EXCELENTE, >=100 REGULAR, etc.) **iguais pras 3 loterias**, ignorando que esse número cresce em ritmos muito diferentes conforme o k (dezenas sorteadas): k=6 na Mega, k=15 na Lotofácil, k=5 na Quina.
- Lotofácil: poucos cartões de 18-20 números já somavam dezenas de milhares de "bilhetes" (`combinação(20,15)=15504` por cartão) — sempre 5 estrelas, número às vezes na casa das centenas de milhares, parecendo absurdo/errado.
- Quina: cartões quase sempre no mínimo de 5 números (`combinação(5,5)=1`) — o total quase nunca passava de 100, então praticamente todo bolão de Quina, por maior que fosse, ficava travado em 1 estrela ("SIMPLES").
- Só coincidiu de "parecer certo" na Mega porque as faixas foram originalmente calibradas olhando só pra ela.

**Correção**: a classificação passou a usar a **probabilidade real** (bilhetes cobertos ÷ total de combinações possíveis daquela loteria) — `totalCombinacoesPossiveis` já existia no código mas nunca era usado, era dead code. As faixas foram derivadas dos limiares antigos da própria Mega (ex.: 10000/50.063.860 ≈ 0,02%), então o resultado da Mega não muda; Lotofácil e Quina passam a ser julgadas contra o próprio universo, e ficam comparáveis de verdade. Adicionado também um 4º número no card "Potencial do Bolão" (`CHANCE REAL`, formatado por `formatarProbabilidade()` com casas decimais adaptativas pra não virar "0.00%" em números pequenos). 3 testes novos de regressão em `test/calculos-script.test.js` (Quina não trava em 1 estrela, Lotofácil não explode artificialmente, `formatarProbabilidade` em várias grandezas).

**Visual do index.html** (pedido: "design mais elaborado... movimento... fundo mais estiloso"): bloco `<style>` embutido só no `index.html` (não em `style.css`, que é compartilhado com admin/consulta/participantes — o visual "vitrine" é só pra página pública, não pras telas de trabalho). Fundo com gradiente animado lento (`gradientFlow`, 20s), 6 esferas decorativas flutuando em blur baixo (nod discreto ao tema "bolas de loteria", `pointer-events:none`, não atrapalha clique nem leitura), top-bar com glassmorphism (`backdrop-filter: blur`) e logo com brilho animado (`shine`), cards com entrada escalonada (`cardIn`) e elevação mais viva no hover, botões de loteria com gradiente/glow no estado ativo. Todo o motion desliga em `prefers-reduced-motion: reduce`. `CACHE_NAME` do `sw.js` bumpado (v16→v17) e badge de versão do index (v3.5→v3.6), seguindo a convenção já estabelecida.

**Recalibração (mesmo dia)**: o usuário testou e reportou um caso concreto — 3 cartões de Lotofácil com 18 números (2.448 bilhetes) batendo EXCELENTE, o que "não pode" pra um bolão desse tamanho. A correção por probabilidade real (acima) era matematicamente consistente, mas na prática generosa demais com a Lotofácil: seu universo é ~15x menor que o da Mega, então qualquer fatia dele "pesa" mais em %, fazendo bolões pequenos baterem EXCELENTE fácil demais. Pedido explícito do usuário: Mega mantém o critério atual (confirmado correto); Lotofácil sobe bastante (ÓTIMO/EXCELENTE têm que ser "muito acima da média"); Quina desce bastante. Voltou a ser número ABSOLUTO de bilhetes (mais fácil de calibrar contra exemplos reais), com uma faixa por loteria (`FAIXAS_ESTRELAS` em `script.js`) em vez de uma fórmula só: Mega inalterada (10000/5000/1000/100), Lotofácil bem mais alta (60000/20000/1500/300 — o caso dos 3 cartões de 18 números cai em BOM), Quina bem mais baixa (2000/800/200/50). "CHANCE REAL" continua no card (informação honesta, comparável entre as 3), só deixou de ser a base das estrelas. `CACHE_NAME` do `sw.js` v17→v18.

**2ª correção de visual (mesmo dia)**: o usuário testou o fundo animado colorido + esferas flutuando e achou "muito ruim" — pediu design "estilo Apple", minimalista, citando um artigo sobre sites minimalistas como referência (princípios: paletas neutras/monocromáticas, tipografia sans-serif com espaçamento generoso, bastante espaço em branco, motion sutil). Reescrito o bloco `<style>` embutido do `index.html` do zero:
- Removido: gradiente animado girando, 6 esferas flutuando, texto do logo com brilho animado, glow pulsante na tagline.
- Paleta neutra: fundo cinza-claro `#f5f5f7` (o mesmo tom que a Apple usa em apple.com), superfícies brancas, texto quase-preto `#1d1d1f`, um único acento azul `#0071e3` (a cor de botão/link oficial da Apple) — nada mais de gradiente multicolorido.
- Nav (`.top-bar`) virou uma barra fixa (`sticky`) enxuta com vidro fosco (`backdrop-filter: blur`) e hairline fina embaixo, só com a marca — a tagline saiu de dentro dela.
- Nova seção `.hero` abaixo da nav com a tagline como título de destaque (headline grande, subtítulo pequeno) — separa "marca" de "mensagem".
- `.loteria-selector` virou um controle segmentado (padrão iOS/macOS): uma trilha cinza-claro com o item ativo "flutuando" em branco por cima, em vez de 3 caixas soltas com borda.
- `.card-header` neutro (fundo transparente, texto escuro) com um "dot" colorido de 8px no lugar da barra cheia de cor (`.bg-blue`/`.bg-green`/`.bg-orange` viraram só a cor do dot).
- Botões: pill sólido (`border-radius: 980px`, o valor exato que a Apple usa), sem sombra pesada, feedback só um leve `scale(0.98)` no clique.
- Motion restante é só fade+slide sutil na entrada (hero e cards), nada de cor girando ou texto brilhando — ainda desliga com `prefers-reduced-motion`.
- Badge de versão do index v3.6→v3.7, `CACHE_NAME` do `sw.js` v18→v19.

## Rodada 10 — Lançamento em lote de uso da reserva (admin)

Pedido do usuário: registrar "uso da reserva" pessoa por pessoa no modal `abrirModalRegistrarMovimento()` (admin.js) era lento quando o mesmo valor vale pra várias pessoas de uma vez (ex.: um cartão comprado com a reserva de 15 participantes). Fluxo descrito: ver a lista de nomes, marcar quem vai usar um valor, registrar; se quiser outro valor, marcar outro grupo e registrar de novo.

**Implementado**: novo botão "📦 LANÇAMENTO EM LOTE" na seção Reservas do admin (`admin.html`, ao lado do botão de movimento único) abrindo `abrirModalLancamentoLote()` (novo, em `admin.js`, logo depois de `abrirModalRegistrarMovimento`):
- Lista com checkbox por pessoa (nome + saldo atual da reserva), campo de busca que filtra a lista ao vivo, botões "Marcar visíveis" / "Desmarcar todos".
- Um só formulário de Tipo (Saque/Uso por padrão, já que era o caso de uso citado — também aceita Depósito)/Valor/Data/Descrição vale pra todo mundo marcado.
- Ao confirmar, grava um documento por pessoa marcada em `reservas_movimentos_pendentes` — **mesmo formato** dos documentos criados pelo modal de movimento único (o app desktop já sabe importar, nenhuma mudança necessária lá), só que todos de uma vez, num `db.batch()` do Firestore (atômico, mais rápido que N `.add()` sequenciais).
- **O modal não fecha depois de registrar**: desmarca as caixinhas e limpa o valor/descrição (mantém tipo/data), mostra quantos foram registrados nesta sessão, e fica pronto pra próxima rodada com outro grupo/valor — exatamente o fluxo "marco um valor, registro, marco outro valor, registro" que o usuário descreveu. Um botão "Concluir e fechar" separado do de registrar.

`CACHE_NAME` do `sw.js` v19→v20 (admin.html/admin.js estão na lista de cache do Service Worker).

## Rodada 11 — Tipografia e "imagem" no hero do index (usuário mandou print do apple.com)

Usuário mandou um print da home do apple.com e disse: "as fontes do site estão feias... no padrão apple teríamos fontes mais bonitas e mais estilos entre elas... podemos colocar imagens também... esmaecidas e dando um estilo de felicidade e leveza".

Dois problemas reais identificados:
1. **Fontes**: o `body` usava só a pilha de sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto...`) — em Mac/iPhone isso VIRA SF Pro (bonita), mas a maioria dos visitantes está em Windows/Android, onde cai pra Segoe UI/Roboto (bem mais genéricas, sem a personalidade Apple).
2. **Nenhuma imagem**: o hero era só texto plano, sem nenhum elemento visual.

**Correção**:
- Carregada a fonte **Inter** via Google Fonts (`<link rel="preconnect">` + `css2?family=...`) — a substituta gratuita mais usada pra SF Pro, mesmas proporções. Vira a fonte principal do `body`, com a pilha de sistema como fallback.
- Carregada também **Instrument Serif** (itálica) como fonte de ACENTO, aplicada só num trecho do título do hero (`<span class="accent-serif">grande prêmio</span>`) — reproduz o truque tipográfico que aparece no print do usuário ("iPad *air*", "MacBook *Air*"): um serif leve e itálico contrastando com o sans bold do resto da frase, sem virar bagunça (só 1 acento por título).
- Como não há como buscar/gerar fotografia real aqui, a "imagem" pedida virou um **glow suave** atrás do título (`.hero-glow`): 3 gradientes radiais desfocados (`filter: blur(50px)`), em tons de dourado/azul/verde bem esmaecidos (opacidade ~0,2-0,3), estáticos (sem animação, pra não repetir o erro do fundo giratório da v3.6) — sugere luz/leveza sem competir com a leitura do texto. É a mesma técnica que sites premium usam de "imagem ambiente" quando não têm fotografia própria.
- Título do hero aumentado (`clamp(28px, 6vw, 44px)`, peso 800) pra ter mais presença, junto com o resto da hierarquia tipográfica (logo 600→700).

Badge index v3.7→v3.8, `CACHE_NAME` do `sw.js` v20→v21.

## Rodada 12 — Reskin do admin.html com o mesmo sistema visual

Usuário perguntou se o admin também tinha o tratamento novo (não tinha — só o index foi mexido até aqui, de propósito), e por que existem páginas separadas (`index.html`, `admin.html`, `consulta.html`, `participantes.html`) em vez de uma só com uma "função admin". Resposta dada no chat: não são "dois sites" — é uma página de um site multi-página estático (mesmo domínio, mesmo repositório, mesmo projeto Firebase), sem framework/SPA. `admin.js` sozinho tem ~3.500 linhas (quase o dobro do `script.js` da vitrine) e é protegido por login (Firebase Auth, `onAuthStateChanged`); separar em arquivos evita mandar esse tanto de JS de gestão pra todo visitante anônimo do site público, e mantém o login do admin isolado. Isso é o padrão comum de site estático multi-página (equivalente ao wp-admin do WordPress) — recomendado manter assim; juntar tudo numa SPA só seria uma reestruturação grande sem necessidade real.

**Reskin do `admin.html`** (pedido explícito): diferente do index, `admin.html` já tinha um bloco `<style>` embutido próprio, razoavelmente bem construído (sidebar, cards, formulários, botões, grade de números, toasts) — não precisava de reescrita, só alinhar ao mesmo sistema visual do index:
- Mesma fonte **Inter** carregada via Google Fonts (sem Instrument Serif/glow — isso é console de trabalho, denso em informação, não vitrine; um "momento de destaque tipográfico" ali atrapalharia mais que ajudaria).
- Acento azul trocado de `#3b82f6` (Tailwind blue-500 genérico) pra `#0071e3` (o azul oficial da Apple, mesmo do index) em TODAS as 24 ocorrências do arquivo (sidebar ativo, badges, foco de formulário, botão primário, toasts, barra de progresso do dashboard etc.) — incluindo as variações `#2563eb`→`#0058b3`, `#eff6ff`→`#e8f2ff` e as versões em `rgba(59,130,246,...)`.
- Top-bar continua escura de propósito (sinaliza "modo admin", diferente da vitrine pública) — só trocou o azul-ardósia genérico (`#1e293b`) pelo quase-preto oficial da Apple (`#1d1d1f`) no fundo. Textos que já usavam `#1e293b` como cor de texto (14 ocorrências) ficaram como estavam — visualmente quase idêntico ao `#1d1d1f`, não valia o risco de mexer.
- Hover dos botões (`.btn:hover`) suavizado (elevação e brilho menores) — mais próximo da contenção da Apple, menos "bounce".
- **Não mexido nesta rodada**: as cores geradas dinamicamente pelo `admin.js` (ex.: o modal de lançamento em lote da Rodada 10, que usa roxo/verde fixos em `style=""` inline) — são ~3.500 linhas de JS com estilo inline espalhado, um passe de recoloração completo ali é tarefa separada se o usuário quiser ir mais fundo.

`CACHE_NAME` do `sw.js` v21→v22.

## Rodada 13 — Recoloração completa do admin.js + números dos cartões viram bolinhas

Usuário: "não tocou pois são 3500 linhas? Quero que faça o melhor" — cobrando terminar o que ficou pendente na Rodada 12, mais um problema específico: "ainda acho ruim a forma de informar os números dos cartões". Confirmado: manter páginas separadas (sem pedido de unificar).

**Recoloração completa do `admin.js`**: as 25 ocorrências de `#3b82f6` (+ 2 de `rgba(59,130,246,...)`) que geram HTML dinamicamente (botões, badges, bordas) viraram `#0071e3`/`rgba(0,113,227,...)` — mesmo acento do resto do sistema agora. `#1e293b` usado como cor de TEXTO (19 ocorrências) ficou como estava, mesma lógica do admin.html: visualmente quase idêntico ao `#1d1d1f`, não valia o risco.

**Números dos cartões — o problema real**: 3 lugares diferentes mostravam os números de um cartão como texto cru/tags cinzas retangulares em fonte monoespaçada minúscula (10px na Lotofácil, pra caber até 20 números) — nada a ver com a "bolinha" que o próprio site público usa pra mostrar dezena sorteada:
1. Lista principal de cartões (`exibirCartoesAdmin`) — tags `background:#e2e8f0` monoespaçadas.
2. Prévia do lote ao cadastrar em massa (`atualizarPrevia`) — pior ainda, só uma string de texto "01 02 03..." sem nenhum estilo.
3. Prévia da seleção enquanto o admin clica nos números pra montar um cartão (`atualizarPreviaSelecao`) — tags azuis também monoespaçadas.

Corrigido: nova classe `.numero-cartao-badge` (bolinha, fundo neutro, texto escuro, negrito) em `admin.html`, com variantes `-sm` (compacta, pra prévia do lote onde cabem várias linhas) e `-accent` (azul, pra números "em edição" antes de salvar — diferencia visualmente de um cartão já salvo). Tamanho da bolinha é FIXO — cartão com mais números só ocupa mais linhas (`flex-wrap`), nunca fica com fonte menor. Aproveitado pra também tirar o `style=""` inline redundante que duplicava/conflitava com a classe `.cartao-item` já existente, e adicionar um contador "N números" no cabeçalho de cada cartão da lista.

**Não mexido**: um resumo de grupo de duplicados (`detectar duplicados`) que mostra os números como uma única string monoespaçada de resumo (não por-número) — é um caso de uso diferente (rótulo de uma linha, não lista visual), ficou como estava.

**Combinado, mas ainda pendente** (o usuário quer discutir depois): se existe uma forma mais rápida/melhor de INSERIR cartões (o fluxo de cadastro em si, não só a exibição) — assunto da próxima rodada.

`CACHE_NAME` do `sw.js` v22→v23.

## Rodada 14 — Token do Telegram exposto no repo público + discussão sobre inserção de cartões

Usuário pediu sugestões pra melhorar a INSERÇÃO de cartões (não só a exibição, já corrigida na Rodada 13) — "leitura da imagem do cartão ou outra opção?". Ao investigar a infraestrutura de Cloud Functions existente pra avaliar viabilidade, achado um problema de segurança real:

**Token do Telegram exposto**: `functions/index.js` (uma cópia antiga, não usada — a function real e implantada fica em `functions/functions/index.js`, apontada por `functions/firebase.json`) tinha um token de bot do Telegram **hardcoded em texto puro**, commitado. Confirmado via API do GitHub: o repositório `eltonluisoc/mega-sena-sistema` é **público**. Avisado o usuário antes de qualquer ação (não é algo pra corrigir em silêncio). Usuário confirmou que já revogou o token no BotFather e não usa Telegram — pedido pra excluir tudo relacionado:
- `functions/index.js` (duplicado com o token) — removido.
- `bot-telegram.js` (script standalone, usava variável de ambiente — sem token hardcoded, mas parte da mesma automação não usada) — removido.
- `.github/workflows/telegram-bot.yml` (GitHub Action que rodava o script acima) — removido.
- `axios` tirado do `package.json` raiz (única coisa que dependia dele era o bot removido).
- A function real (`functions/functions/index.js`) não tinha nada de Telegram — não foi tocada.
- **O token em si continua no HISTÓRICO do git** (remover o arquivo não apaga commits antigos) — mas como já foi revogado no BotFather, o token vazado não vale mais nada.

**Sugestões de inserção de cartões** (apresentadas, ainda não implementadas — usuário está avaliando custo antes de decidir): usuário revelou que gera os cartões no app oficial da Caixa e fica com a IMAGEM do cartão gerado — não digita/escolhe números manualmente. Isso muda a resposta:
1. **Geração aleatória automática** (sem custo, sem infra nova) — só faz sentido se os números fossem escolhidos pelo sistema, o que não é o caso aqui.
2. **Colar em lote (texto)** (sem custo, sem infra nova) — ainda útil como via alternativa, mas não resolve o caso principal (a imagem já existe, ninguém digitou os números em lugar nenhum ainda).
3. **Leitura da imagem por IA com visão (Cloud Function)** — a que resolve o caso real do usuário: imagem do app da Caixa é limpa (sem inclinação/reflexo/vinco), ideal pra uma IA com visão identificar quais números estão marcados. Requer: nova Cloud Function (infraestrutura já existe e funciona — `functions/functions/`), uma chave de API de IA com visão (custo pequeno por imagem, usuário pediu estimativa antes de decidir), sempre pré-preenchendo a grade de seleção já existente pra confirmação humana antes de salvar (nunca salvar direto da leitura).

**Decisão**: consultado o pricing atual da API (skill `claude-api`) — Claude Haiku 4.5 ficaria em ~$0,002/imagem, Sonnet 5 ~$0,004/imagem. Pro volume real do usuário (>400 imagens/mês) isso passa de $0,80-1,60/mês — pouco em termos absolutos, mas o usuário achou caro pra esse volume e decidiu **não seguir com IA de visão**. Pediu pra aprimorar a inserção MANUAL em vez disso (clique-a-clique atual).

## Rodada 15 — "Preencher por texto" nos 2 fluxos de clique da inserção de cartões

Investigado o cadastro de cartões (`section-cadastro` em admin.html): existem 3 fluxos distintos, só 1 já tinha entrada por texto:
1. **Cadastro Individual → Digitação** (`adicionarCartaoIndividual`) — já tinha campo de texto "números separados por espaço". Não mexido.
2. **Cadastro Individual → Modo Seleção** (`gradeSelecaoIndividual`/`numerosSelecionados`) — só clique, sem texto. Usado pra criar vários cartões de um bolão fixo, salvando um por um.
3. **Cadastro em Lote** (`gradeNumeros`/`cartoesLote`, só Lotofácil) — só clique, sem texto. Usado pra criar N cartões × M concursos de uma vez.

Adicionado "preencher por texto" nos fluxos 2 e 3, já que o usuário vai transcrever números de uma imagem (não tem os números como texto em lugar nenhum, mas digitar é mais rápido que clicar 15-20 vezes por cartão):
- Novo helper compartilhado `parseNumerosTexto()` + `regrasLoteria()` (valida contra as mesmas regras de min/max/faixa já usadas em `adicionarCartaoIndividual`, sem duplicar a lógica um terceira vez).
- Fluxo 2: campo de texto + botão "✍️ Preencher" (e Enter) acima da grade — preenche `numerosSelecionados` e reaproveita a visualização já existente.
- Fluxo 3: mesmo campo pro cartão atual, **mais** uma área de "colar vários cartões de uma vez" (um por linha) que substitui `cartoesLote` inteiro de uma vez e ajusta "Quantos cartões?" automaticamente — o maior ganho de tempo real, pensado pro caso de já ter vários cartões transcritos prontos.
- Corrigido de passagem um bug real encontrado no meio do código: `atualizarGradeVisual()` (fluxo 3) usava `document.querySelectorAll('.numero-btn')` sem escopo — pegava também os botões da grade do fluxo 2 quando os dois cards estavam na tela ao mesmo tempo, repintando o estado errado. Escopado a `#gradeNumeros .numero-btn`.
- Nada disso muda o comportamento de salvar — sempre precisa clicar em "Adicionar"/"Gerar Todos" depois, revisando a prévia (já com as bolinhas da Rodada 13).

`CACHE_NAME` do `sw.js` v23→v24.

## Rodada 16 — "Chance real" vira chance de quadra/13 pontos + grade de números mais estreita

**"Chance real" mostrava a chance do prêmio MÁXIMO** (sena/15 pontos/quina) — usuário mandou print mostrando "0,0070%" com 85 cartões cobrindo 100% do universo da Mega, e pediu pra mostrar a chance de uma faixa mais alcançável: **quadra na Mega e na Quina, 13 pontos na Lotofácil**. Isso não é mais o mesmo tipo de cálculo (`combinação(n,k)/total`, que mede "cobrir o k-conjunto inteiro" = só o prêmio máximo) — virou a probabilidade hipergeométrica de acertar EXATAMENTE j das k dezenas sorteadas:

```
P(exatamente j acertos) = C(n,j) × C(N-n, k-j) / C(N,k)
```

somada entre os cartões do bolão (mesma lógica de agregação — valor esperado — já usada no "bilhetes equivalentes"). O rótulo do card mudou pra deixar explícito qual faixa está sendo mostrada: "CHANCE (QUADRA)" ou "CHANCE (13 PTS)". As estrelas/bilhetes continuam olhando pro prêmio máximo (não pedido pra mudar). 3 testes novos de regressão trancando o valor exato pra um cartão mínimo de cada loteria (ex.: Mega 6 números → C(6,4)·C(54,2)/C(60,6) ≈ 0,04%, contra 0,007% de antes pro mesmo caso da tela real).

**Grade de seleção de números mais estreita**: usuário reportou que as caixinhas onde clica os números (com o mouse) estavam largas demais, exigindo deslocar o mouse mais do que precisava. A pior era a grade do "Cadastro em Lote" (só Lotofácil, 25 números em só 7 colunas — a mais larga do sistema); aumentada pra 13 colunas. O padrão geral (`.grade-numeros`, usado no "Modo Seleção" também) foi de 10 pra 12 colunas — precisou mexer em dois lugares porque o "Modo Seleção" define a largura via `style.gridTemplateColumns` no JS (sobrescreve a classe CSS).

Badge index v3.8→v3.9, `CACHE_NAME` do `sw.js` v24→v25.

## Rodada 17 — Grade de números: colunas fixas em vez de flexíveis (correção do ajuste anterior)

O ajuste da Rodada 16 (10→12 colunas, 7→13 colunas) reduziu a largura, mas ainda usava `1fr` — colunas que ESTICAM pra preencher toda a largura disponível. Usuário mandou print (grade de 60 números da Mega, 12 por linha) e explicou o que faltava: quer **10 por linha**, mas a caixinha em si **pequena e fixa**, sem esticar pra ocupar o espaço sobrando.

Trocado `repeat(N, 1fr)` por `repeat(10, 40px)` + `justify-content: start` nos dois lugares (`.grade-numeros` em admin.html e o `style.gridTemplateColumns` setado via JS em `inicializarGradeSelecaoIndividual`, que sobrescreve a classe) — agora a largura de cada caixinha é fixa (40px) independente da largura do container; o espaço sobrando na linha fica em branco, de propósito. Adicionado `overflow-x: auto` no container como rede de segurança: numa tela estreita (celular), 10 colunas de 40px + gaps podem passar da largura disponível — vira rolagem horizontal em vez de estourar o layout.

`CACHE_NAME` do `sw.js` v25→v26.

## Rodada 18 — Bug real de cache: "rede primeiro" do Service Worker não era de verdade

Usuário testou a Rodada 17 e mandou print mostrando 12 colunas ainda — a mudança parecia não ter ido pro ar. Investigado: `curl` direto na URL pública confirmou que o `admin.js` publicado **já tinha** a correção (`repeat(10, 40px)`) — o servidor estava certo. O problema era client-side: o GitHub Pages manda os arquivos com `Cache-Control: max-age=600` (10 minutos), e o `fetch(event.request)` dentro do `sw.js` (comentado como "rede primeiro") não tinha nenhuma opção de cache — então esse fetch respeitava o cache HTTP normal do navegador, e "rede primeiro" virava, na prática, "cache do navegador primeiro" por até 10 minutos depois de cada deploy. O Service Worker em si podia estar atualizado (`skipWaiting`/`clients.claim` já ativos) e mesmo assim servir JS/HTML antigo por causa disso.

**Correção**: `fetch(event.request, { cache: 'no-store' })` — força ignorar o cache HTTP do navegador nessa chamada, sem afetar o cache MANUAL que o próprio SW já mantém em `caches.open(CACHE_NAME)` pra funcionar offline (esse continua servindo como fallback só quando a rede falha, que é o objetivo real do "offline-first com fallback"). Instrução dada ao usuário nesse meio-tempo: Ctrl+Shift+R (hard refresh) resolve na hora, sem precisar esperar os 10 minutos.

`CACHE_NAME` do `sw.js` v26→v27.

## Rodada 19 — Revisão multiagente completa do desktop: Início vira mestre-detalhe (v5.4 → v6.0)

Usuário pediu uma "análise completa via agentes" do sistema desktop, insatisfeito com a usabilidade de "Início > Visão Geral" e "Bolão Selecionado" ("muito bagunçadas"), com "50 abas para assuntos correlatos" e sem jeito de clicar no nome de um participante pra registrar pagamento. Pediu resumo pra aprovar antes de implementar.

**3 agentes de pesquisa (background, só leitura) rodaram em paralelo**:
1. **Arquiteto de Navegação** — mapeou as 22 abas + ~21 popups do sistema (a soma real por trás da sensação de "50 abas"). Achou: mesma pergunta (participante × situação de pagamento) calculada em 4 lugares com queries independentes (mesmo padrão do bug do ADM isento, Rodada 6); "Registrar" e "Visualizar/Recibo" eram a mesma tela por participante, só sincronizadas por um StringVar; 3 funções de código morto (`_editar_part`/`_form_part`/`_remover_part`, zero chamadas); dois popups diferentes chamados "Editar Pessoa".
2. **UX Visão Geral/Bolão Selecionado** — achou que "Início" usa tema escuro enquanto o resto do app é claro; paletas de cor diferentes entre as duas sub-abas (mesma cor significando coisas diferentes); dois seletores de bolão concorrentes (combo do cabeçalho + cartões); nenhuma árvore com busca, altura fixa de 8-12 linhas pra bolões de 50+ participantes.
3. **Fluxo de Pagamento Rápido** — documentou o precedente já existente (`_pend_registrar_dblclick`, duplo-clique em "Pendências deste Bolão") e achou que ele **não respeitava o aviso de "participante isento"** que o formulário principal (`_registrar_pag`) tem — um buraco de segurança que generalizar sem corrigir replicaria em todo canto novo.

**Usuário aprovou tudo** e pediu adicionalmente uma proposta do modelo **Fable** especificamente pra navegabilidade de "Início". Fable propôs ir além do esboço original (que mantinha 2 sub-abas): trocar por um **layout mestre-detalhe fixo** (`ttk.PanedWindow`, nativo do Tkinter) — lista de bolões numa coluna à esquerda, sempre visível, conteúdo à direita trocando sem trocar de aba. Usuário escolheu a proposta do Fable.

**Implementado**:
- **`_build_tabs`**: "Início" trocou de `ttk.Notebook` (2 sub-abas) pra `tk.PanedWindow` — coluna esquerda (`self.tab_inicio_lista`, largura fixa 220px) + coluna direita (`self.tab_dash`/`self.tab_bolao` empilhados com `.place()` + `.tkraise()`, técnica clássica de "notebook sem abas" do Tkinter).
- **Nova `_build_inicio_lista`**: item fixo "📊 Visão Geral" no topo (realçado quando é o modo ativo) + lista rolável de bolões abaixo, com o mesmo badge de status (✅ em dia / ⚠ N atrasado(s)) que já existia nos cartões antigos.
- **Nova `_mostrar_inicio_modo(modo)`**: troca `tab_dash`↔`tab_bolao` via `tkraise()`. `_ir_para_visao_geral()` chama isso + `_refresh_dados_visiveis()`. `_selecionar_bolao_via_cartao` (renomeado internamente, mesma função) chama `_selecionar_bolao_por_id` (já fazia `_refresh_all()`) + `_mostrar_inicio_modo("bolao")`.
- **`_atualizar_cartoes_bolao`**: virou lista vertical (era grade 5 colunas) — mesma função, conteúdo redesenhado pra caber na coluna estreita.
- **`_build_bolao_sel`**: removido o cabeçalho "Selecione um bolão" (a seleção só existe na coluna esquerda agora) — elimina o "qual dos dois seletores vale?" que a segunda rodada de agentes apontou.
- **Correção do buraco de segurança**: extraída `_confirmar_pagamento_isento(pid, bid)` de dentro de `_registrar_pag`, e criado `_abrir_popup_registrar_pagamento(participante_id, bolao_id, valor_sugerido, nome_exibicao)` — popup único reaproveitado por `_pend_registrar_dblclick` (que antes reimplementava o INSERT sem a checagem de isento) e pelo novo duplo-clique em "Situação dos Participantes" (`_dash_sit_dblclick`). Os dois agora respeitam o mesmo aviso.
- **Duplo clique estendido**: "Situação dos Participantes" (dentro de Bolão Selecionado) ganhou duplo-clique pra registrar pagamento — antes só existia em "Pendências deste Bolão". Funciona pra pendente ou já quitado (permite adiantar/pagamento extra). iid da árvore virou `"p<participante_id>"`, eliminando busca por nome (mais seguro que o padrão do precedente).
- **Busca por nome**: novo campo de filtro em "Situação dos Participantes" (`_filtrar_situacao_participantes`, refiltra em memória sem reconsultar o banco a cada tecla).
- **Financeiro (Fase 2, feita antes da parte do Início)**: "Visualizar/Recibo" fundida em "Pagamentos" (era "Registrar") — 7→6 sub-abas, elimina o StringVar `_pag_part_sync`. Removidas as 3 funções de código morto confirmadas.

**Pendente (próxima rodada, se o usuário quiser continuar)**: consolidar Participantes (4→2 sub-abas), unificar de vez "Situação dos Participantes" + "Pendências deste Bolão" numa lista só (hoje coexistem, ambas com ação, mas ainda são 2 queries separadas), e rebaixar o combo do cabeçalho a indicador/atalho (sugestão do Fable, não implementada — o combo continua funcional, só que agora convive com a lista da esquerda como segundo caminho pro mesmo resultado).

Versão v5.4 → v5.5 (Financeiro) → v6.0 (Início mestre-detalhe).

## Rodada 20 — Ajuste de posição dos botões (v6.1) + Participantes consolidado (v6.2)

Usuário testou o v6.0 e aprovou tudo, com um único ajuste cosmético: os botões "📊 Ver Ganhos por Loteria" e "➕ Registrar Lançamento" estavam soltos acima das tabelas da Visão Geral, sem relação clara com o resto da tela — pediu pra mover pro card "Histórico de Lançamentos", já que são ações sobre o mesmo assunto desse card (ganhos/saques do organizador). Aprovou o resto e pediu pra continuar desenvolvendo os itens pendentes da Rodada 19.

**v6.1**: bloco solto "Ações rápidas" removido de `_build_dashboard`; os 2 botões (relabelados "📊 Ganhos por Loteria" / "➕ Novo Lançamento") passaram a viver dentro do `LabelFrame` "HISTÓRICO DE LANÇAMENTOS", acima da árvore.

**v6.2**: consolidação de Participantes (4→2 sub-abas), primeiro item pendente da Rodada 19:
- `_build_cad` ("➕ Novo Participante", uma das 4 sub-abas) virou popup `_abrir_popup_novo_participante` — mesmo padrão de popup-ificação já usado em Início/Financeiro (Toplevel com canvas rolável, mantendo os mesmos nomes de atributo internos, então `_cadastrar`/`_cadastrar_e_pagar`/`_cad_adm_toggle`/`_calcular_valor_cotas`/`_imp_buscar`/`_imp_importar` não precisaram de nenhuma mudança).
- `_build_cad_editar` ("✏ Editar Participante", outra das 4) virou popup `_abrir_popup_editar_participante(participante_id=None)`, aceitando um id opcional pra já abrir com o participante pré-selecionado (usado no duplo-clique).
- A lista "👥 Participantes" (a sub-aba que sobrou, hoje só listagem) ganhou: botão "➕ Novo Participante" (chama o popup novo), campo de busca por nome (filtra em memória, mesmo padrão de `_filtrar_situacao_participantes` da Rodada 19 — sem reconsultar o banco a cada tecla) e duplo-clique numa linha abre a edição já com esse participante (a árvore já usava `iid=str(participante_id)`, então não precisou de busca por nome pra achar o id).
- Resultado: Participantes foi de 4 sub-abas ("Cadastrar", "Editar", "Pessoas/Unificar" e a lista) pra 2 ("👥 Participantes" e "🔗 Pessoas/Unificar").

**Ainda pendente** (itens 2 e 3 da Rodada 19, não pedidos explicitamente ainda): unificar "Situação dos Participantes" + "Pendências deste Bolão" numa lista só, e rebaixar o combo do cabeçalho a indicador/atalho (sugestão do Fable).

Versão v6.0 → v6.1 (botões) → v6.2 (Participantes).

## Rodada 21 — Situação dos Participantes funde com Pendências deste Bolão (v6.3)

Usuário pediu pra continuar desenvolvendo os itens pendentes da Rodada 19. Item escolhido: unificar "Situação dos Participantes" (coluna estreita à esquerda em "Bolão Selecionado", com busca por nome, uma consulta) e "Pendências deste Bolão" (seção de largura toda, logo abaixo, outra consulta) — as duas mostravam pago/saldo/status do mesmo participante, só com layout e nível de detalhe diferentes.

**Achado ao comparar as duas consultas**: o status de "Situação dos Participantes" vinha de `_status_part_adm` → `_status_part(pago, ve, parc_esp, parc)`, passando a parcela **sem** multiplicar por `n_cotas`; já "Pendências" fazia `_status_part(pago, ve, parc_esp, parc_val * n_cotas)`, multiplicando certo. Resultado: um participante com 2+ cotas podia acumular pagamentos suficientes pra 1 cota e já aparecer "🟦 Em Dia" em "Situação", mesmo devendo pela segunda cota — um bug real de exibição, não só duplicação de tela.

**Implementado**:
- "Pendências deste Bolão" removida por completo (`_atualizar_pendencias_bolao_sel`, `_pend_registrar_dblclick`, `_pend_tree`/`_pend_mes_lbl`/`_pend_rodape_lbl` — tudo apagado).
- "Situação dos Participantes" ganhou a coluna **Cotas** e o resumo de rodapé (`_dash_sit_rodape_lbl`: "N pendente(s) | M em dia/quitado(s) | Parcelas esperadas: X") que só existiam em Pendências.
- Corrigido o bug: `_dash_load` agora calcula `n_cotas` por participante e passa `parc_d * n_cotas` pra `_status_part_adm`. Status agora distingue 3 estados (✅ Quitado / 🟦 Em Dia / ⚠ Pendente) — antes "Situação" só mostrava Quitado/Pendente (binário), escondendo o "em dia mas não quitado" que só "Pendências" sabia calcular.
- Botões "Encerrar Bolão"/"Reativar Encerrado" (ficavam no cabeçalho da seção removida) foram pro cabeçalho do topo da tela, ao lado do botão de atualizar (🔄).
- `_filtrar_situacao_participantes`/`_dash_sit_dblclick` ajustados pro novo formato de tupla (7 campos, incluindo `n_cotas`) e pra nova posição da coluna Saldo (índice 3, não mais 2).

**Ainda pendente** (item 3 da Rodada 19, não pedido explicitamente ainda): rebaixar o combo do cabeçalho a indicador/atalho (sugestão do Fable) — o combo continua funcional, convivendo com a lista da coluna esquerda como segundo caminho pro mesmo resultado.

Versão v6.2 → v6.3.

## Rodada 22 — Cartão duplicado agora é bloqueado no cadastro, não só detectado depois (web v28)

Usuário relatou que "Potencial do Bolão" mostrava 104 cartões no concurso 3054, mas ele lembrava de ter lançado só 72. Investigação (consulta read-only direto no Firestore de produção, usando o mesmo acesso público que o site já usa — sem tocar em nada) confirmou: os 104 cartões existem de verdade, todos no bolão "Bolão 10,00", Mega-Sena. Achado real dentro desse total: **5 pares de cartões idênticos** (mesmas 8 dezenas cada par), lançados ~17 minutos um do outro — um lote salvo duas vezes sem o usuário perceber. Os outros ~27 cartões "a mais" eram todos combinações distintas, não duplicatas — ou seja, o usuário só tinha subestimado quantos cartões realmente lançou; "Potencial do Bolão" estava contando certo. Usuário apagou os 5 pares manualmente e pediu: o sistema **nunca deveria deixar um duplicado entrar, avisando na hora**, não só detectável depois via "🔁 Verificar Duplicados" (ferramenta manual que já existia).

**Implementado em `admin.js`**:
- Nova `existeCartaoDuplicado(tipo, concurso, bolao, numerosOrdenados)`: consulta os cartões já salvos com a mesma loteria + concurso + bolão e compara os números (ordenados) contra o cartão prestes a ser salvo. Escopo é por bolão de propósito — dois bolões DIFERENTES baterem nos mesmos números por acaso não é erro; dentro do MESMO bolão, é.
- Chamada nos 3 pontos onde um cartão individual é salvo direto no Firestore (grade de seleção, texto avulso, seleção-em-lote) — se já existir, a gravação é **bloqueada** (não é um aviso ignorável) e mostra os números do cartão batido.
- `gerarLote` (gerador em massa da Lotofácil, N cartões × M concursos) ganhou uma checagem equivalente, mas local/sem ida ao banco: compara os cartões DENTRO do próprio lote entre si antes de gerar. Repetir o mesmo cartão em concursos diferentes continua sendo o uso normal dessa tela (não bloqueado); dois cartões idênticos dentro do mesmo lote, sim.
- `sw.js`: `CACHE_NAME` → v28.

Versão web (Service Worker) v27 → v28.

## Rodada 23 — Grade de números: fluida em vez de fixa (resolve desktop pequeno demais E mobile com scroll escondendo colunas)

Usuário testou a grade de largura fixa (40px, da Rodada 17) e trouxe dois problemas opostos: no desktop, a fonte/caixinha ficou pequena demais (pediu aumentar "um pouco, pouco"); no celular, 10 colunas de 40px passavam da largura da tela, e colunas 9/10 só apareciam rolando a barra horizontal — "PÉSSIMO" (palavra do usuário).

**Causa raiz do problema do celular**: já existia uma media query `@media (max-width:768px) { .grade-numeros { grid-template-columns: repeat(5,1fr); } }` pensada pra mobile — só que nunca fazia efeito, porque tanto `#gradeNumeros` (HTML) quanto `#gradeSelecaoIndividual` (JS, em `inicializarGradeSelecaoIndividual`) tinham `style="grid-template-columns: repeat(10, 40px)"` **inline**, e estilo inline sempre vence regra de classe, media query ou não.

**Correção**: trocado `repeat(10, 40px)` fixo por `repeat(10, 1fr)` fluido + `max-width: 480px` no container (`.grade-numeros`). Resolve os dois lados de uma vez: no desktop o `max-width` impede as caixinhas de esticar demais (era o problema ORIGINAL da Rodada 16 que pediu largura fixa); no celular, 1fr sempre divide a largura disponível entre as 10 colunas igualmente — nunca estoura, nunca precisa rolar, em qualquer tela. A media query de 5 colunas virou desnecessária e foi removida. Fonte/moldura dos botões subiu um pouco (13px/38px → 14px/42px, padding 8px→9px) — o pedido do "aumentar um pouco" do desktop. Quina (80 números, 8 linhas) ganhou uma classe `.numero-btn.compacto` (12px/34px) só pra ela, evitando que a grade fique alta demais.

Removidos de vez os estilos inline duplicados (`grade.style.gridTemplateColumns/justifyContent/gap` em JS, e o `style=""` no HTML) que causavam a raiz do bug — tamanho/layout da grade agora vive 100% no CSS.

`sw.js`: `CACHE_NAME` → v29.

Versão web (Service Worker) v28 → v29.

## Rodada 24 — Aumento da Rodada 23 era pequeno demais pra notar

Usuário testou a Rodada 23 no "Modo Seleção" (desktop) e disse não ter percebido nenhum aumento de fonte ou largura. Conta: o `max-width` escolhido (480px) contra o total antigo fixo (`repeat(10,40px)` + 9 gaps de 6px = 454px) só dava ~2,6px a mais por caixinha — matematicamente um aumento, mas pequeno demais pra ser visível. Não era bug de cache nem de override de CSS (conferido: nenhuma outra regra `.numero-btn`/`#gradeSelecaoIndividual` no arquivo, nenhum estilo inline sobrando).

Corrigido subindo o `max-width` pra 560px (~50px por caixinha) e a fonte/moldura dos botões junto (14px/42px → 15px/46px, padding 9px→10px; a variante `.compacto` da Quina foi junto: 12px/34px → 13px/38px). Continua fluido (`1fr`), então o comportamento sem rolagem horizontal no celular da Rodada 23 não muda em nada — só o teto no desktop subiu.

`sw.js`: `CACHE_NAME` → v30.

Versão web (Service Worker) v29 → v30.

## Rodada 25 — Cartão com mais números que o mínimo vale VÁRIAS apostas, não 1 (web v31)

Usuário viu o banner "Melhor Resultado do Concurso" (Bolão 10,00 bateu QUADRA com um cartão de 8 números) e fez duas perguntas: (1) dava pra marcar com estrela quais dos 8 números do cartão foram os que bateram? (2) acertar 4 números num cartão de 8 é só 1 quadra ou são várias?

**Resposta pra (2), e por que era um bug real**: um cartão de 8 números é uma "aposta múltipla" — na Mega, equivale a jogar C(8,6)=28 apostas simples de uma vez, exatamente como a Caixa paga de verdade. Com 4 dos 8 números batendo, as 28 apostas simples embutidas nesse cartão se dividem em C(4,4)·C(4,2)=**6 que batem quadra**, C(4,3)·C(4,3)=16 que batem terno, e C(4,2)·C(4,4)=6 que batem duque (soma 28, confere). O resumo de prêmios (`SENA/QUINA/QUADRA/TERNO/DUQUE`, e `PONTOS` na Lotofácil) sempre contou "1 cartão = 1 prêmio", ignorando essa multiplicidade — sub-contava (e ainda escondia terno/duque) de todo cartão com mais números que o mínimo da loteria (6 na Mega, 5 na Quina, 15 na Lotofácil). Cartão do tamanho mínimo (o caso mais comum) não muda: continua contando exatamente 1 prêmio, igual sempre foi.

**Implementado em `script.js`**:
- `contarPremiosPorFaixa(qtdNumeros, acertos, k)`: hipergeométrica (mesma família de fórmula já usada em `calcularChancesBolao`) — para cada faixa `j` possível, `C(acertos,j)·C(qtdNumeros-acertos,k-j)`.
- `calcularPremios(cartoesLista, numerosSorteados, loteria)`: soma isso pra cada cartão, substituindo os 2 blocos de contagem `filter(...).length` duplicados (um em `exibirResultadoSalvo`, outro em `conferirResultados`) por uma função só.
- `notaApostaMultiplaHtml(...)`: nota "💡 Cartões com mais de N números valem várias apostas simples — os números acima contam prêmios, não cartões", só aparece quando existe pelo menos um cartão de aposta múltipla no bolão (senão seria ruído).
- **Resposta pra (1)**: `gerarBannerTrofeu` agora recebe `numerosSorteados` e marca com ⭐ + fundo dourado os números do cartão vencedor que bateram (os que não bateram continuam verdes) — antes todos os números do cartão apareciam idênticos, sem dar pra distinguir os acertos a olho. O banner também ganhou uma nota específica pro cartão vencedor quando ele é aposta múltipla (ex.: "Esses 4 acertos valem 6× QUADRA, não só 1").
- 3 testes novos em `test/calculos-script.test.js`, incluindo o caso exato do usuário (8 números, 4 acertos).

`sw.js`: `CACHE_NAME` → v31.

Versão web (Service Worker) v30 → v31.

## Rodada 26 — Mesmo bug de aposta múltipla, agora no ranking "Top Concursos" do dashboard admin (v32)

Usuário viu os cards "TOP CONCURSOS MEGA-SENA/LOTOFÁCIL/QUINA" do dashboard admin (ex.: "Concurso 3054 — 2 quadras") e perguntou se precisava do mesmo ajuste da Rodada 25. Sim — era o idêntico bug, só que no admin em vez do site público: `porConcursoPorLoteria[tipo][concurso]` guardava `{maxAcertos, quantidade}` contando CARTÕES com aquele nível de acerto, não prêmios reais. Um cartão de aposta múltipla (mais números que o mínimo) vale várias apostas simples, cada uma podendo cair numa faixa diferente — um cartão de 8 números com 4 acertos rende 6 quadras (e 16 ternos e 6 duques ao mesmo tempo), não "1 quadra".

**Implementado em `admin.js`**:
- Nova `contarPremiosPorFaixaAdmin(qtdNumeros, acertos, k)` — mesma fórmula hipergeométrica de `contarPremiosPorFaixa` em `script.js` (duplicada por não ter build step entre os dois arquivos, mesmo padrão já usado em `combinacao`/`combinacaoAdmin`).
- `porConcursoPorLoteria[tipo][concurso]` virou um acumulador por faixa (`{2:N, 3:N, 4:N, ...}`, somando prêmios reais de todos os cartões daquele concurso) em vez de `{maxAcertos, quantidade}` de cartões. O ranking top-3 agora pega, pra cada concurso, a MAIOR faixa com prêmio real (`> 0`) e usa a soma real como quantidade.
- Removidos os campos `quadras`/`ternos`/`duques` de `boloesPorLoteria` — setados desde sempre mas nunca lidos por nada (código morto, confirmado via grep).
- 4 testes novos em `test/calculos-admin.test.js`, incluindo o caso do usuário (cartão de 8 números, 4 acertos = 6 quadras no ranking, não 2).

`sw.js`: `CACHE_NAME` → v32.

Versão web (Service Worker) v31 → v32.

## Rodada 27 — Importação de comprovante PDF da Caixa no admin (v33)

Usuário pediu pra eliminar a digitação manual dos jogos ao cadastrar cartelas: subir o PDF "Comprovante de Aposta Bolão" gerado pelo app da Caixa (tem camada de texto real embutida, não é imagem — extraível sem OCR) e o sistema cadastrar os jogos sozinho. Pediu a arquitetura antes de implementar; aprovou e mandou 2 PDFs de exemplo.

**Decisão de arquitetura**: roda 100% no navegador (o site é estático, sem backend). As libs Python que ele citou (pdfplumber/PyMuPDF) não valem — o equivalente browser é **pdf.js** (Mozilla), carregado sob demanda do cdnjs (mesmo padrão dos outros scripts CDN do admin; não entra no cache do SW).

**Implementado**:
- Nova seção lateral "📄 Importar PDF" no `admin.html` — 4 campos mestre (Loteria, Concurso, Bolão, Tipo, iguais ao cadastro manual) + upload múltiplo de PDFs.
- `parsearComprovanteCaixa(texto, {loteriaEsperada, concursoEsperado})` em `admin.js` — **função pura**, testável no `node --test`. Regex sobre o texto extraído → `modalidade` (campo "Modalidade:" ou cabeçalho), `concurso` (`Concurso:\s*(\d+)`, desambiguado do "Cota: 54/90" na mesma linha), `jogos` (cada "Jogo N" seguido das dezenas separadas por " | " — a linha de telefones "0800..." não tem "|", nunca é capturada). Um PDF pode ter vários jogos → todos retornados, cada um vira um cartão.
- Validação por jogo com as mesmas `regrasLoteria()` do cadastro manual (contagem de dezenas, intervalo, sem repetida). Divergência de concurso/modalidade vs. o que o usuário informou **avisa mas não bloqueia** (checkbox "cadastrar assim mesmo").
- `extrairTextoPdf(file)` — camada browser (pdf.js), reconstrói linhas agrupando fragmentos por posição vertical. Só I/O, não testada em node.
- Fila de múltiplos PDFs, resultado por arquivo, erro gracioso: PDF sem texto → rejeita com mensagem clara (**nunca tenta OCR**), modalidade não suportada → não inventa dado. Grava só após "Confirmar", passando pelo bloqueio de duplicado da Rodada 22, com `origem: 'importacao-pdf'` no documento. QR Code ignorado por completo (é só token de referência da Caixa).
- `MODALIDADE_IMPORT` mapeia o texto impresso → chave interna (mega/lotofacil/quina). `semAcento()` novo helper (map de acentuadas, ASCII-safe no fonte).
- 8 testes em `test/parser-comprovante.test.js` com o texto real dos 2 PDFs de exemplo (comprovante1: 2 jogos de 10 dezenas; comprovante2: 10 jogos de 9), + divergência de concurso/modalidade, PDF vazio, modalidade não suportada, jogo com dezena repetida/fora do range/contagem errada.

**Pendente de teste pelo usuário**: a camada do pdf.js (extração no browser) não dá pra rodar no `node --test` — testar com os 2 PDFs reais e conferir se a revisão na tela mostra 2 e 10 jogos.

`sw.js`: `CACHE_NAME` → v33.

Versão web (Service Worker) v32 → v33.

## Rodada 28 — Importação de PDF só trazia 1 coluna de jogos (v34)

Usuário testou: comprovante1 (2 jogos) importou só 1; comprovante2 (10 jogos) importou só os 5 da coluna da esquerda. Causa: o comprovante é de **2 colunas**, e o pdf.js (via a reconstrução de linha por posição vertical do `extrairTextoPdf`) devolve "Jogo 1" e "Jogo 2" na MESMA linha, lado a lado, e as duas fileiras de dezenas também. O parser ancorava em `Jogo\s+\d+\s+(dezenas)` — só casava a primeira coluna de cada linha.

**Correção**: parar de ancorar no rótulo "Jogo N". Agora casa toda sequência de dezenas ligadas por "|" (`/\d{1,2}(?:\s*\|\s*\d{1,2}){2,}/g`) dentro do bloco "Seus Números". A fronteira entre as colunas tem um ESPAÇO, não "|", então `... | 60 09 | 13 | ...` se separa sozinho em 2 jogos. A linha de telefones (`0800 726 0101 ...`) não tem "|", continua nunca casando. O `{2,}` (3+ dezenas) pega até jogo curto/corrompido pra validação reclamar em vez de sumir sem aviso — o comprovante não tem nenhuma outra sequência `N | N | N` fora dos jogos.

Também: botão "🗑️ Limpar" no rodapé da importação pra descartar a lista e recomeçar (antes só tinha "Confirmar e cadastrar"). 2 testes novos de layout 2 colunas.

`sw.js`: `CACHE_NAME` → v34.

Versão web (Service Worker) v33 → v34.

## Rodada 29 — Importação de PDF: jogo quebrado em 2 linhas + 2 colunas misturava os números (v35)

Usuário testou com um comprovante Lotofácil "da Independência" (17 dezenas por jogo, acima do que cabe numa linha só) e achou um caso pior que o da Rodada 28: Jogo 1 veio com 29 números misturados (união dos 2 jogos) e Jogo 2 só com 5 (o resto). Causa: quando um jogo tem dezenas demais pra caber numa linha, o comprovante quebra em 2 linhas — e a quebra caiu bem depois de um "|", deixando a coluna A terminar a 1ª linha com um pipe solto. Ao achatar tudo numa string só (jeito da Rodada 28), esse pipe solto da coluna A grudava direto no primeiro número da coluna B — e isso é **literalmente indistinguível**, em texto puro, de uma continuação de verdade da própria coluna A pra 2ª linha. Não dava pra resolver só com regex melhor; a ambiguidade é real.

**Correção — usar a posição de verdade em vez de texto achatado**:
- Nova `extrairJogosDeItensPosicionados(itens)`: recebe os itens do pdf.js com x/y reais (não mais só a string final). Agrupa por LINHA (y, tolerância 3px), separa cada linha em "colunas" onde o gap horizontal é ≥4x a mediana dos gaps da própria linha (a coluna A e a coluna B ficam claramente mais afastadas entre si do que os números dentro de cada uma), e reagrupa por ÍNDICE de coluna — coluna 0 de todas as linhas vira uma sequência própria, coluna 1 vira outra. Isso mantém a quebra de linha DENTRO da mesma coluna colada certo (o `\s*` do regex ainda atravessa o `\n`) sem nunca misturar com a coluna vizinha.
- `extrairJogosDoTexto(texto)`: a lógica antiga (Rodada 28, achatada) virou uma função própria, mantida como **fallback** pra quando não há posição disponível (e é o que os testes com string direta continuam exercitando).
- `extrairTextoPdf` virou `extrairDadosPdf(file)`, devolvendo `{texto, itens}` — o texto achatado continua servindo pra Modalidade/Concurso (que são "rótulo: valor" na mesma linha, sobrevivem ao achatamento), e os itens posicionados alimentam a extração de jogos.
- `parsearComprovanteCaixa` ganhou `opts.jogosPreExtraidos` — usa quando fornecido (é o que `processarPdfsImportacao` sempre passa agora), senão cai no fallback em texto puro.
- 5 testes novos em `test/parser-comprovante-posicoes.test.js`, com fixtures sintéticas de coordenadas reproduzindo o bug exato (2 colunas, jogo de 17 dezenas quebrado em 2 linhas) — confirmando os 2 jogos saem certos, sem mistura.

`sw.js`: `CACHE_NAME` → v35.

Versão web (Service Worker) v34 → v35.

## Rodada 30 — Correção da Rodada 29 não cobria o formato real de itens do pdf.js (v36)

Usuário testou o mesmo comprovante Lotofácil "da Independência" depois do fix da Rodada 29 e viu o MESMO sintoma (Jogo 1 com 29 números, Jogo 2 com 5) — o fix não resolveu de fato.

**Causa raiz do fix ter falhado**: o limiar de "isso é um gap de coluna" usava a mediana dos gaps calculada a partir dos itens **da própria linha**. Isso funciona bem quando uma linha tem muitos itens (um por número/pipe — o que os testes sintéticos da Rodada 29 simulavam). Mas no pdf.js real, tudo indica que cada fileira de dezenas de uma coluna é **um único item de texto** (o PDF gerador da Caixa desenha a linha toda de uma vez, não número por número) — então uma linha com 2 colunas tem só 2 itens, ou seja, **1 gap medido**. "A mediana dos gaps desta linha" e "o gap que eu preciso avaliar" viravam o MESMO número — nunca dava pra classificar um gap como "muito maior que o normal" comparando ele com ele mesmo. Os testes da Rodada 29 não cobriam esse formato (item-por-token vs. item-por-linha), por isso passavam mas o bug real persistiu.

**Correção**: trocado o limiar de "mediana local" pra **tamanho da fonte** (`Math.hypot(transform[2], transform[3])` do item do pdf.js — a escala vertical do texto, robusta a rotação, sempre presente independente de quantos itens existem na linha). Um espaço em branco normal entre palavras é uma fração do tamanho da fonte; o vão entre 2 colunas de um formulário é ordens de grandeza maior — limiar = `max(fontSize × 8, 40)`. `extrairDadosPdf` agora também captura `width` e `fontSize` de cada item (antes só `str`/`x`/`y`).

Novo teste com fixture sintética no formato "1 item de texto por linha por coluna" (não 1 por token) reproduz o bug exato que persistiu e confirma a correção — é o caso que faltava cobertura antes.

`sw.js`: `CACHE_NAME` → v36.

Versão web (Service Worker) v35 → v36.

## Rodada 31 — Diagnóstico + recalibração com dados reais do pdf.js (v37/v38)

Usuário testou a Rodada 30 e viu o MESMO sintoma de novo (Jogo 1 com 29 números, Jogo 2 com 5) — 3ª tentativa consecutiva sem resolver. Em vez de arriscar uma 4ª correção às cegas (o ambiente de desenvolvimento não roda pdf.js, só browser), parei pra instrumentar.

**v37 — diagnóstico**: `_debugItensImportacaoPdf(nomeArquivo, itens)`, chamado logo após `extrairDadosPdf`, imprime no Console (`console.table`) cada item extraído do pdf.js (linha, texto, x, width, fontSize, y). Pedido ao usuário: F12 → Console → reimportar o PDF → print da tabela. Usuário mandou o log completo dos 61 itens do `comprovante2.pdf`.

**O que o log revelou**: cada fileira de dezenas de uma coluna é mesmo 1 item só (confirmando a suposição da Rodada 30) — MAS o gap real entre as 2 colunas de dezenas é só **31 unidades** (coluna A termina em x=269, coluna B começa em x=300, fonte 10) — bem menor que os limiares "generosos" tentados nas Rodadas 29 e 30 (que giravam em 40-80). A coluna de dezenas é larga (231 unidades pra 12 números) e quase encosta na coluna vizinha.

**v38 — recalibração**: limiar trocado pra `max(fontSize × 2.5, 15)` = 25 nesse caso, abaixo do gap real de 31. Um limiar mais agressivo (baixo) é seguro aqui: cada linha do bloco "Seus Números" já é 1 item por coluna (não tem nada pra proteger DENTRO do próprio jogo), e "errar pra mais" no resto da página (tabela "Dados da Aposta", que tem rótulo:valor com gaps parecidos) é inofensivo — só conteúdo com "|" entra na conta de `extrairJogosDoTexto`.

Novo teste usa os **61 itens reais** do log de debug como fixture (`ITENS_REAIS_COMPROVANTE2` em `test/parser-comprovante-posicoes.test.js`) — trava o valor calibrado contra dado real, não mais suposição. O log de debug (v37) foi mantido por enquanto, marcado pra remover quando o usuário confirmar que resolveu de vez.

`sw.js`: `CACHE_NAME` → v37 → v38.

Versão web (Service Worker) v36 → v38.

## Rodada 32 — Aba Cartões (excluir duplicados) só mostrava concursos da Mega (v39)

Usuário cadastrou cartões duplicados (o próprio sistema avisou), foi excluir na aba "Cartões" e só apareciam concursos da Mega-Sena no filtro — precisava excluir de Lotofácil e Quina também.

**Causa**: a lista de cartões, o filtro de concurso e o "🔍 Verificar Duplicados" (tudo na aba Cartões) sempre filtravam por `loteriaAdmin` — uma variável global só trocada pelos botões Mega/Lotofácil/Quina, que existiam **apenas na aba Cadastro**. A aba Cartões não tinha seletor próprio nem indicação visual de qual loteria estava ativa — o usuário via só Mega (o valor padrão) sem entender por quê, e trocar exigia ir na Cadastro só pra isso.

**Correção**: mesmo seletor de loteria (3 botões) adicionado direto na aba Cartões, sincronizado com o da Cadastro — `setLoteriaAdmin()` agora atualiza os 2 conjuntos de botões juntos (clicando de um lado ou de outro, os dois sempre refletem o mesmo estado). Selecionar Lotofácil ou Quina na própria aba Cartões recarrega lista/filtro/duplicados na hora.

`sw.js`: `CACHE_NAME` → v39.

Versão web (Service Worker) v38 → v39.

## Rodada 33 — Filtro de bolão na aba Cartões + Verificar Duplicados isolado por loteria (v40)

Usuário testou a Rodada 32 e trouxe 2 pontos: (1) um mesmo concurso pode ter vários bolões diferentes cadastrados — precisava dar pra restringir a um bolão específico, não só ao concurso inteiro; (2) ao trocar de loteria, cartões de OUTRA loteria não podiam continuar aparecendo.

**Bolão (1)**: novo `<select>` "Bolão" na aba Cartões, ao lado do filtro de concurso — `carregarBoloesFiltro()` popula com os bolões que existem na combinação loteria+concurso atual (recalculado sempre que a loteria ou o concurso mudam). Filtra tanto a lista de cartões quanto o escopo do "🔍 Verificar Duplicados".

**Loteria vazando (2) — bug real encontrado**: `verificarDuplicados()` nunca filtrava por `tipo` na consulta ao Firestore, só por número de concurso (`where('concurso','==',concurso)`). Se o mesmo número de concurso existisse em 2 loterias diferentes, cartões de uma loteria que nem era a selecionada na tela apareciam misturados nos resultados. Corrigido acrescentando `.where('tipo','==',loteriaAdmin)` à consulta (2 filtros de igualdade — mesmo padrão já usado em `existeCartaoDuplicado` desde a Rodada 22, não precisa de índice composto novo). Bolão é filtrado no cliente, depois da consulta (mesmo padrão do site público pra esse tipo de filtro combinado).

Também: trocar de loteria, ou mudar o filtro de concurso/bolão, agora esconde o resultado de "Verificar Duplicados" anterior — era de outro escopo (loteria/concurso/bolão diferentes) e ficava visível na tela depois da troca, dando a impressão de "cartão de outra loteria aparecendo".

`sw.js`: `CACHE_NAME` → v40.

Versão web (Service Worker) v39 → v40.

## Rodada 34 — Reservas: retry no "too many requests" + lançamento em lote no desktop (v6.4)

Usuário trouxe 2 pedidos sobre o desktop: (1) toda vez que abre o app, aparece "Erro ao verificar reservas do site: HTTP Error 429: Too Many Requests" no rodapé; (2) o site já tem "lançamento em lote" pra uso da reserva (vários lançamentos pro mesmo bolão de uma vez), mas o desktop só cadastra um por um.

**Investigação (agente Explore)** confirmou: o startup faz **uma única** requisição GET a `reservas_movimentos_pendentes` (`_importar_movimentos_pendentes_web`, chamada 400ms depois da janela abrir, via `_login_inicial`) — sem loop, sem retry, sem outro lugar do arquivo repetindo essa chamada. Ou seja, o 429 não é o app pedindo demais; é limite de quota do projeto no Firestore (plano gratuito ou pico de tráfego do ecossistema todo — site público + admin + outras cópias do .exe abrindo ao mesmo tempo), normalmente passageiro.

**1. Retry no 429**: até 2 tentativas extras (espera 1s, depois 2s) antes de mostrar o erro — roda na thread da UI (é o startup), por isso a espera é curta em vez de um backoff longo que travaria a janela por mais tempo.

**2. Lançamento em lote no desktop**: nova ação "📦 Lançamento em Lote" na aba "Reservas Pessoais" (`_abrir_popup_lote_reserva`), espelhando o que já existia no site (`admin.js`, `abrirModalLancamentoLote`) — Tipo/Valor/Data (e Loteria/Concurso/Descrição se DÉBITO) compartilhados pra todo o lote + lista de pessoas com checkbox, busca por nome, "marcar visíveis"/"desmarcar todos". 1 `INSERT` em `reservas_movimentos` por pessoa marcada; validação de saldo insuficiente (débito) resumida numa única confirmação listando quem ficaria negativo, em vez de 1 popup por pessoa.

**Achado incidental**: `_rsv_registrar` (cadastro individual) tentava chamar `sincronizar_reserva(...)` depois de cada lançamento — função que **nunca existiu** neste arquivo, então todo lançamento de reserva sempre lançava `NameError`, silenciado por um `except` genérico (`print` que nem aparece no .exe empacotado). Removida — a sincronização real com o site é o botão manual "📤 Sincronizar Reservas com Site" (reenvia o saldo atual recalculado de todo mundo), que sempre funcionou.

Versão desktop v6.3 → v6.4.

## Rodada 35 — Campo Concurso sem validação (v6.4.1) + investigação do 429 nas Reservas

Usuário testou o lançamento em lote e achou um registro real com "3057-942,25" no campo Concurso — nada impedia digitar/colar besteira ali. Corrigido com `entry_numerico()` (novo helper, `validate="key"`, só aceita dígito) aplicado nos 2 campos Concurso de Reservas Pessoais (individual e lote). Não conserta o registro já salvo errado (não existe função de editar movimento, só excluir+recriar) — só evita que aconteça de novo. Versão v6.4 → v6.4.1.

**Sobre o "429 Too Many Requests" persistir mesmo depois do retry (Rodada 34)**: investigado com `curl` direto na URL do Firestore que o app usa (sem autenticação, de fora do app). Primeira tentativa devolveu `429 "Quota exceeded" (RESOURCE_EXHAUSTED)` — mas tentativas seguintes, poucos segundos depois, vieram como `403` (negado por regra de segurança — essa coleção exige admin autenticado, então 403 é o esperado pra uma chamada sem token, não um erro novo) e ficaram consistentes em `403` por 5 tentativas ao longo de 15s. Ou seja: o 429 que apareceu foi um pico passageiro que já tinha passado no momento de reconfirmar — **não dá pra afirmar com confiança que é cota diária esgotada** (isso exigiria ver 429 de forma sustentada por bem mais tempo). Correção de rumo em relação ao que eu tinha concluído inicialmente (não é definitivamente "cota do projeto zerada" — pelo menos não confirmado). Pedido ao usuário: tentar abrir o app de novo — se voltar a funcionar, foi um pico passageiro (o retry da Rodada 34 já ajuda nesse caso); se continuar caindo toda vez, aí sim vale investigar cota sustentada / considerar o plano Blaze.

## Rodada 36 — Editar lançamento de reserva + erro de senha claro (v6.4.2) + 429 CONFIRMADO: cota do projeto esgotada de verdade

Usuário voltou com 2 pontos: (1) "continua errado o cadastro" — registros antigos com Concurso corrompido (a validação da Rodada 35 só impede digitar errado DAQUI PRA FRENTE, não conserta o que já tava salvo); (2) o 429 voltou a acontecer.

**1. Editar lançamento**: nova ação "✏ Editar Selecionado" na aba Reservas Pessoais — abre um popup com tipo/valor/data/loteria/concurso/descrição pré-preenchidos (o campo Concurso já filtra só os dígitos do que estava salvo, então "3057-942,25" vira "3057942" pronto pra corrigir pra "3057") e faz `UPDATE` no lugar, sem precisar excluir e recadastrar.

**2. Erro de senha claro**: aproveitado o mesmo lote pra resolver o pedido do usuário sobre login — `_firebase_login()` agora lê o código de erro que o Identity Toolkit devolve (`INVALID_LOGIN_CREDENTIALS`, `USER_DISABLED`, `TOO_MANY_ATTEMPTS_TRY_LATER` etc.) e mostra mensagem em português ("Senha incorreta.") em vez do JSON cru que ia direto pro messagebox antes.

**3. Sobre login por câmera/reconhecimento facial** (pergunta do usuário, não implementado — é uma decisão de arquitetura, não um bug): recomendação dada foi NÃO construir reconhecimento facial do zero com webcam comum (sem detecção de vivacidade, uma foto na câmera já falsificaria) — se a ideia é elogiar conveniência sem digitar senha toda vez, o caminho mais seguro é usar o **Windows Hello** que o Windows já tem (rosto por infravermelho ou digital, verificado pelo próprio SO com hardware seguro) só pra liberar a senha guardada com segurança no Windows Credential Manager, em vez de reimplementar biometria do zero de forma mais fraca. Fica como proposta em aberto, não implementada — usuário ainda vai decidir se quer seguir.

**4. O 429 é real e está afetando o SITE PÚBLICO agora** — reinvestigado com `curl` depois do usuário confirmar que persistia: dessa vez, 6 tentativas seguidas ao longo de 30s deram `429 "Quota exceeded"` de forma consistente (diferente da checagem anterior, que tinha achado um pico passageiro). Mais grave: testei OUTRAS coleções do mesmo projeto (`cartoes`, `config_geral`, `resultados_mega`) e **todas** vieram `429` também — não é só a coleção de reservas, é o projeto `mega-sena-sistema` inteiro. Isso significa que **o site público está fora do ar pra visitantes reais agora**, não só uma função do desktop. Não dá pra resolver por código (nem o desktop nem o site fazem chamada em excesso — é limite de leitura do projeto no plano Firebase). Comunicado ao usuário como prioridade: precisa checar Firebase Console → Uso/Faturamento do projeto pra confirmar, e o caminho real de resolução é migrar pro plano Blaze (pay-as-you-go, só cobra acima de uma faixa gratuita generosa) — não dá pra investigar mais fundo sem acesso ao console/faturamento do projeto, que é do usuário.

Versão desktop v6.4.1 → v6.4.2.

## Rodada 37 — Alterar/recuperar senha do admin direto no painel web (v41)

Usuário recusou a proposta de Windows Hello (Rodada 36, item 3) — "só faz o tratamento para erro de senha" — e pediu, além disso, uma forma de trocar a senha de login sem depender do Firebase Console. Mesma conta (`eltonluisoc@gmail.com`) é usada no login do site E do desktop, então resolver no site vale pros dois.

**Implementado em `admin.html`/`admin.js`**:
- **"Esqueci minha senha"** — link no modal de login → `sendPasswordResetEmail(ADMIN_EMAIL)`, manda link de redefinição por e-mail. Cobre o caso de nem conseguir entrar.
- **Card "🔐 SEGURANÇA"** na aba Config → botão "Alterar Senha" abre um modal pedindo senha atual + nova senha + confirmação. Antes de chamar `updatePassword`, reautentica com `reauthenticateWithCredential` — trocar senha é operação sensível, o Firebase exige login "recente" pra permitir; sem reautenticar, uma sessão já aberta há um tempo cairia em `auth/requires-recent-login` em vez de trocar.
- Erros comuns (senha atual errada, nova senha fraca, muitas tentativas, sessão antiga) mostram mensagem em português, não o código cru do Firebase — mesmo espírito do tratamento de erro de login da Rodada 36, agora também nessa tela.

`sw.js`: `CACHE_NAME` → v41.

Versão web (Service Worker) v40 → v41.

## Rodada 38 — Revisão de usabilidade do admin web: menu, Gerenciar Bolões, lista pro WhatsApp, Ver Pendentes (v42)

Usuário pediu uma revisão de usabilidade em 5 pontos do admin web, fechando com "quero versão superior".

1. **Menu lateral em 2 colunas** — 8 itens ocupavam 8 linhas de altura; virou grade 2×4 (ícone empilhado sobre o rótulo, já que lado a lado não cabia em ~120px de coluna). Sidebar alargada de 220px pra 260px pra caber, breakpoint de 1024px ajustado de 180px pra 210px pelo mesmo motivo. Mobile (≤768px) preservado igual — os `.sidebar-item` viram chips horizontais como já eram, só recebendo `flex-direction: row` de volta nesse breakpoint (a base agora é `column`).
2. **"Gerenciar Bolões" redesenhado** — a grade de controles `auto 1fr auto 1fr auto` (Status/Destaque/Data/Estratégia) virou 4 campos lado a lado, cada um com rótulo pequeno em maiúsculas em cima — bem mais fácil de escanear. Botões "Link"/"Excluir" (antes pills com estilo 100% inline, tamanhos batendo com nada mais do painel) viraram `.btn.btn-primary.btn-sm`/`.btn.btn-danger.btn-sm`. Cuidado extra: o toggle de "Destaque" atualiza a UI na hora via manipulação direta do DOM (sem re-renderizar a lista) — preservada a estrutura exata que esse código depende (primeiro `<div>` do card = cabeçalho, wrapper `.switch-destaque`, badge `.badge-destaque`, span `destaque-label-{id}`), só o visual ao redor mudou.
3. **"Copiar Lista pro WhatsApp"** — novo botão na aba "Participantes por Bolão": monta uma mensagem formatada (nome, cotas, pago/total, ✅/⚠️ por status) a partir dos mesmos dados já carregados pra tela, e copia pra área de transferência (`navigator.clipboard.writeText`) — pronta pra colar direto num grupo.
4. **"Ver Pendentes" nas Reservas** — novo botão que lê `reservas_movimentos_pendentes` (a fila que o desktop importa e apaga sozinho) e mostra o que ainda está esperando ser importado. Resolve um risco real: sem isso, não tinha como saber se um lançamento já registrado no site ainda não tinha "chegado" no desktop, abrindo brecha pra registrar o mesmo movimento 2x.
5. **Botões da aba Reservas padronizados** — "Registrar"/"Lote"/"Atualizar" tinham `min-width` diferentes entre si e um deles reimplementava a cor roxa com `style` inline em vez de usar `.btn-purple` (que já existia no CSS). Agora todos usam `.btn-sm` + a classe de cor certa.

`sw.js`: `CACHE_NAME` → v42.

Versão web (Service Worker) v41 → v42.

## Rodada 39 — Menu 2 colunas confirmado ok (era cache); campo Estratégia cortado no mobile (v43)

Usuário reportou "o menu continua centralizado e em oito linhas" logo após a Rodada 38. Verificado direto: o código-fonte E o deploy ao vivo no GitHub Pages (`curl` na URL pública) já tinham a grade de 2 colunas correta — confirmando que era cache do navegador/Service Worker, não bug de código (mesma classe de problema já visto nas Rodadas 17-18). Usuário confirmou depois: "no desktop excelente".

**Mas achou um bug real diferente**: no mobile, o card de cada bolão em "Gerenciar Bolões" cortava o campo "Estratégia". Causa: os 4 campos (Status/Destaque/Data limite/Estratégia) da Rodada 38 ficam lado a lado via `flex-wrap`, cada um com `min-width` próprio em `style=""` inline (gerado no JS) — a SOMA dos mínimos (100+140+160+gaps ≈ 430px+) passa da largura de uma tela de celular, e o campo mais largo (Estratégia) é cortado em vez de quebrar linha direito.

**Correção**: novas classes `bolao-controles-linha`/`bolao-controle-campo` no render (`admin.js`) + regra `@media (max-width:768px)` empilhando os 4 campos um por linha no celular. Precisou de `!important` — inline `style=""` sempre vence uma regra de classe sem isso.

**Achado incidental**: existe um sistema CSS completo e já responsivo (`.bolao-card`, `.bolao-header`, `.bolao-config`, `.switch-modern`, `.bolao-actions`) parado no `admin.html`, nunca referenciado em nenhum JS/HTML — claramente uma versão anterior do redesenho de "Gerenciar Bolões" que nunca chegou a ser ligada. Decisão: **não adotar** (arriscado reconstruir a estrutura DOM exata que esse CSS espera, arriscando quebrar algo, sem ganho de correção sobre o fix cirúrgico já aplicado) — mas vale saber que existe, caso alguma rodada futura queira migrar pra ele de propósito.

`sw.js`: `CACHE_NAME` → v43.

Versão web (Service Worker) v42 → v43.

## Rodada 40 — Evolução do design do admin web, mais Apple (v44)

Usuário pediu pra evoluir o design do admin "estilo Apple". Investigando o CSS antes de mexer, ficou claro que uma rodada anterior (fora do que está resumido neste arquivo) já tinha estabelecido essa direção: Inter como substituta de SF Pro, `#0071e3` azul, `#1d1d1f` quase-preto na topbar, `#f5f5f7` de fundo, cantos arredondados generosos, sombras suaves, `numero-cartao-badge` imitando a bolinha de dezena sorteada do site público. Ou seja, "evolua" era literal — continuar em cima de uma base já certa, não começar do zero.

**Implementado em `admin.html`**:
- **Tokens de design** (`:root`): cor/raio/sombra/transição nomeados (`--cor-primaria`, `--cor-sucesso`, `--raio-pill` etc.) substituindo hex espalhado pelo arquivo. As cores semânticas de sucesso/aviso/erro viraram os tons de sistema da própria Apple (verde `#34c759`, laranja `#ff9500`, vermelho `#ff3b30`) em vez das genéricas de UI kit (`#10b981`/`#f59e0b`/`#ef4444`) que só alguns cantos usavam.
- **Botões (`.btn`) viraram cápsula** (`border-radius: 980px`) — é a assinatura visual mais reconhecível de botão da Apple (App Store, apple.com "Saiba mais"). Toasts também, com sombra mais funda/suave e easing `cubic-bezier` no lugar de `ease` genérico.
- **Barra superior e menu lateral ganharam vidro fosco** (`backdrop-filter: saturate(180%) blur(20px)` sobre fundo translúcido) em vez de cor sólida — a Apple usa exatamente isso nas próprias barras de navegação (Finder, Mail, barra de menu do macOS).
- Cabeçalhos de card e números grandes do dashboard com `letter-spacing` mais fechado (efeito SF Pro Display) + `font-variant-numeric: tabular-nums` pra número não "pular" de largura ao trocar.
- Cores de status em "Gerenciar Bolões" (introduzidas na Rodada 38) trocadas pros tons de sistema da Apple, ficando consistentes com o resto do painel.

**Decidido não fazer**: adotar o sistema `.bolao-card`/`.bolao-config` morto encontrado na Rodada 39 — o risco de reconstruir a estrutura DOM exata que ele espera, só por uma rodada de design, não valia a pena frente ao ganho.

`sw.js`: `CACHE_NAME` → v44.

Versão web (Service Worker) v43 → v44.

## Rodada 41 — Cartões não conferidos ordenam por dezena + rótulo mostra quantidade de números (v45)

Usuário pediu, no site público (tela de conferência): (1) mostrar quantos números tem cada cartão ao lado do rótulo "Cota"/"Exclusivo"; (2) ordenar os cartões pelas próprias dezenas ANTES de conferir o resultado — com o cuidado explícito de não tocar no comportamento pós-conferência, que já mostra do melhor resultado pro pior.

**Implementado em `script.js`**:
- `ordenarCartoesPorAcertos(cartoesLista, numerosSorteados)` ganhou um ramo pro caso `numerosSorteados` nulo (antes de conferir): ordena pelas próprias dezenas do cartão, comparando posição a posição (`[5,18,23]` antes de `[8,13,23]`). O ramo com `numerosSorteados` preenchido (usado tanto por `mostrarCartoes` logo após conferir quanto por `exibirResultadoSalvo` pra um resultado já salvo antes) continua **idêntico** — ordena por acertos, melhor primeiro, como sempre foi.
- Rótulo de tipo de participação ganhou a contagem de dezenas ao lado (ex.: "🎟️ Cota · 8 números") — relevante desde a Rodada 25/26 (aposta múltipla pode ter mais números que o mínimo da loteria). Aplicado nos 2 pontos que renderizam esse rótulo (`mostrarCartoes` e `exibirResultadoSalvo`).
- Teste antigo que travava o comportamento anterior ("sem números sorteados retorna a lista original", sem ordenação nenhuma) foi atualizado pro novo comportamento pedido, mais um teste confirmando que o array original não é mutado (o sort é feito numa cópia).

`sw.js`: `CACHE_NAME` → v45.

Versão web (Service Worker) v44 → v45.

## Rodada 42 — Ordenação da Rodada 41 usava o critério errado (v46)

Usuário testou e apontou: a lista continuava "fora de ordem" (9, 8, 8, 9, 8 números seguidos). Causa: a Rodada 41 implementou "ordem de números" como ordenar pelas DEZENAS em si (`[5,18,23]` antes de `[8,13,23]`) — mas o pedido original era ordenar pela QUANTIDADE de dezenas do cartão, exatamente o critério que o próprio rótulo "Cota · N números" já exibe ao lado. Como o critério usado não batia com o que estava visível na tela, a lista parecia embaralhada mesmo estando "ordenada" (por outra coisa).

**Correção**: `ordenarCartoesPorAcertos` (ramo sem `numerosSorteados`) agora ordena por `numeros.length` decrescente (cartão com mais dezenas primeiro) — desempate por dezenas crescentes pra manter previsibilidade dentro de cartões do mesmo tamanho. Ramo pós-conferência intocado, como sempre.

`sw.js`: `CACHE_NAME` → v46.

Versão web (Service Worker) v45 → v46.

## Rodada 43 — Cadastro de participante: solução profissional (v6.5, desktop)

Usuário reportou que o cadastro de participantes do bolão (desktop) estava confuso, com 3 problemas concretos:

1. O botão "➕ Novo Participante" também serve pra importar um membro de bolão anterior — o nome escondia essa função mais usada.
2. Dentro do popup, a seção de importação (a mais frequente na prática) vinha DEPOIS da seção de cadastro do zero; a janela era estreita o suficiente pra cortar botões, e o campo Observações ocupava espaço desproporcional (3 linhas) pra um campo raramente preenchido.
3. O botão "Cadastrar + Pagar" cadastrava e só DEPOIS abria uma mensagem de confirmação, seguida de um segundo popup pra registrar o pagamento — dois passos extras onde o usuário só queria um clique e um resultado final.

**Implementado em `bolao_pro_v3.py`**:
- Botão renomeado: "➕ Novo Participante" → "➕ Incluir Participante" (`_build_cad_lista`).
- `_abrir_popup_novo_participante`: título "Incluir Participante"; janela alargada de 640x760 pra 720x800; ganhou rolagem por mouse (`canvas.bind("<Enter>"/"<Leave>")`) — faltava nesse popup, ao contrário dos popups irmãos. Seção "Importar Membro de Bolão Anterior" movida pra ANTES de "Cadastrar Novo Participante" (era o bloco duplicado que sobrava depois da linha de botões — removido). Campo de busca da importação encolhido (width 40→26, com `fill="x"`) e botões "🔍 Buscar" (12→10) e "⬇ Importar Selecionado"→"⬇ Importar" (22→12) encolhidos pra não cortar mais o texto. Campo Observações reduzido de `height=3` pra `height=2`.
- `_cadastrar(self, retornar_pid=False, silencioso=False)`: novo parâmetro `silencioso` suprime o `messagebox.showinfo` intermediário; quando `retornar_pid=True` agora retorna `(pid_novo, nome, bolao_nome)` em vez de só `pid_novo`.
- `_cadastrar_e_pagar`: reescrito pra chamar `_cadastrar(retornar_pid=True, silencioso=True)`, buscar o `valor_parcela` do bolão, inserir diretamente uma linha em `pagamentos` (mesmo formato que o popup antigo usava, `observacoes='Cadastro + pagamento simultâneo'`) e mostrar UMA ÚNICA mensagem final combinando cadastro + pagamento (ou uma mensagem alternativa se o bolão não tiver parcela definida). Zero diálogos intermediários.
- Removido o método `_cad_pag_abrir` (~95 linhas) — o popup separado de "Registrar Pagamento" que o antigo `_cadastrar_e_pagar` abria; confirmado via grep que não sobrou nenhuma referência (nem a `_cad_pag_pid`).

Versão desktop v6.4.2 → **v6.5** (4 pontos: docstring, `self.root.title`, header `tk.Label`, 2× `<span>` do WhatsApp). `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 44 — Auditoria matemática multiagente: reserva, depósitos pendentes, cotas (v6.6, desktop)

Usuário pediu explicitamente uma revisão com os agentes de "todos os cálculos da reserva, dos depósitos pendentes, revisão matemática do sistema". Antes de delegar, um levantamento manual em `bolao_pro_v3.py` já achou um indício forte (funções de saldo de reserva usando critérios diferentes pra classificar crédito/débito). Isso virou a pista inicial pra 3 agentes de revisão paralelos (só leitura, sem editar código):

1. **Matemática da reserva (desktop)** — confirmou que `_rsv_editar_mov` não revalidava saldo ao editar tipo/valor de um lançamento (diferente do cadastro normal e do lote, que avisam); confirmou a inconsistência de 3 critérios de crédito/débito (comparação exata em alguns lugares, correspondência ampla com variantes antigas em outros, um deles com "SAIDA" que os outros não tinham) — hoje inofensiva (todo lançamento grava só "CRÉDITO"/"DÉBITO"), mas latente.
2. **Fila de depósitos pendentes (site↔desktop)** — confirmou um risco real de duplicação: o INSERT local em `_importar_movimentos_pendentes_web` é commitado ANTES do DELETE no Firestore; se o DELETE falhar (rede caiu, app fechou no meio), a mensagem de erro diz "continua na fila" mas o lançamento já foi gravado — reimportado de novo na próxima abertura, duplicando o valor.
3. **Matemática geral (cotas/prêmios)** — rodou a suíte de testes (20/20 passando), confirmou que prêmios/faixas são idênticos entre `script.js` e `admin.js`, e achou o bug mais grave: `_status_part` é chamado em 4 lugares fora do Dashboard (Relatório, relatório-texto, exportação Excel) SEM multiplicar a parcela pelas cotas da pessoa — resultado contraditório entre telas pro mesmo participante com 2+ cotas.

**Corrigido em `bolao_pro_v3.py`** (todos os 4 problemas confirmados, mais o achado extra de mais 2 call sites do mesmo bug de cotas que a auditoria não tinha citado — `_rel_whatsapp` e `_cards_visuais` — achados ao caçar every call site de `_status_part`/`_status_part_adm`):

- Novo helper `_n_cotas_participante(valor_esperado, valor_total_bolao)`, usado agora em TODO lugar que decide status de pagamento: `_dash_load` (já estava certo), `_gerar_rel`, `_rel_whatsapp` (lista de "Confirmados"), `_montar_rel_completo`, `_exportar_excel`, `_cards_visuais`. Testado manualmente: pessoa com 3 cotas que pagou 1 parcela flat agora mostra PENDENTE em toda tela (antes: EM DIA em 4 das 6).
- `_rsv_editar_mov` ganhou o mesmo aviso de saldo insuficiente que o cadastro normal e o lote já tinham, projetando o saldo da pessoa (sem o lançamento atual) com os novos tipo/valor antes de salvar.
- Nova coluna `reservas_movimentos.origem_doc_id` (migração seed segura) guarda o ID do documento Firestore que originou um lançamento importado. `_importar_movimentos_pendentes_web` agora checa esse campo antes de inserir — se o doc_id já foi aplicado antes (INSERT local ok, mas DELETE da fila falhou), pula o INSERT e só tenta limpar a fila de novo. Testado com simulação de reimportação: sem a correção duplicava o valor, com a correção soma fica correta.
- Critério de crédito/débito unificado em duas constantes de módulo, `TIPOS_CREDITO_RESERVA`/`TIPOS_DEBITO_RESERVA`, e um helper `_sql_in_tipos()` pra montar a cláusula SQL — usados agora em `_rsv_load`, `_rsv_sel_pessoa`, `_rsv_registrar`, o popup de lote, `_rsv_editar_mov` e `enviar_reservas_para_site` (essa última ganhou o "SAIDA" que faltava nela vindo de outro lugar). Confirmado via grep que não sobrou nenhuma comparação de tipo hardcoded fora dessas constantes.

Versão desktop v6.5 → **v6.6**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`. Suíte `test/calculos-script.test.js` (site) roda 20/20 — não afetada, confirmado só por sanidade já que a auditoria não mudou nada em `script.js`/`admin.js` (Área B e C do agente 3 já estavam corretas).

## Rodada 45 — Evolução multiagente do cadastro de participantes: menos cliques, sem tela cortada (v6.7, desktop)

Usuário pediu explicitamente: "quero evoluir o cadastro de participantes... use os agentes para evoluir e deixar essa tela melhor... mais fácil de lançar, sem erros de tela, sem tantos cliques, sem tela cortada e uma UX aprimorada." Antes de delegar, um levantamento manual já achou um bug concreto: o campo "Valor Total Esperado" nasce fixo em "0,00" e só recalcula no FocusOut/Return do campo Cotas — nunca de forma síncrona quando o popup abre. Isso virou a pista pra 2 agentes em paralelo, só leitura/proposta (sem editar código): um pra auditar toda a fricção do fluxo atual (cliques, tela cortada, mensagens desnecessárias), outro pra propor um redesenho concreto reaproveitando padrões já comprovados no próprio arquivo.

**Achados confirmados pelo agente de auditoria** (além do bug do R$0,00, que ele confirmou ser alcançável só com mouse e que o sistema mostra esse participante como "✅ QUITADO" por `saldo = 0 - 0 <= 0`):
- Popup mais alto do arquivo inteiro (800px fixo, sem `+x+y` de centralização) — não cabe inteiro num notebook comum (1366x768).
- Nenhum campo recebe foco automático ao abrir (usuário sempre precisa clicar no Nome primeiro).
- Nenhum campo (exceto Cotas e a busca de importação) reage à tecla Enter — sempre precisa do mouse.
- Confirmação de sucesso é `messagebox.showinfo`, que exige clicar OK — indo contra o próprio propósito do popup ficar aberto pra cadastrar vários participantes seguidos (Rodada 43).
- Busca de "Importar Membro de Bolão Anterior" exige clicar "🔍 Buscar" ou apertar Enter, ao contrário da lista de participantes (`_filtrar_cad_lista`), que já filtra ao vivo a cada tecla.

**Proposta do agente de design** (convergiu com os mesmos 5 pontos, mais o mapeamento de cliques): reaproveitar o padrão `trace_add("write", ...)` já usado em 4 lugares do arquivo pra busca ao vivo; reaproveitar o único precedente de `focus_set()` (`pag_val`) pra focar o campo certo ao abrir; cadeia de `<Return>` por campo em vez de um Enter-submete-tudo global (quebraria a Text de Observações); altura da janela calculada por `winfo_screenheight()` em vez de fixa. Estimativa: fluxo de importar cai de ~5 pra ~4 cliques, fluxo manual de ~5 pra ~3.

**Implementado em `bolao_pro_v3.py`** (`_abrir_popup_novo_participante`, `_cadastrar`, `_cadastrar_e_pagar`, `_imp_buscar`):
- Janela: altura = `min(800, 85% da tela)`, centralizada com `+x+y` calculado a partir de `winfo_screenwidth/height`.
- Campo Valor chama `_preencher_valor_cad()` uma vez ao montar o popup (não fica mais em "0,00" até o usuário mexer em Cotas).
- Busca de importação: `trace_add("write", ...)` no `_imp_entry_var` (like `_filtrar_cad_lista`), botão "🔍 Buscar" removido, `_imp_buscar` reescrito pra nunca abrir messagebox (exige ≥2 letras, mostra "nada encontrado" no label de status em vez de popup).
- Foco inicial no campo de busca de importação (caminho mais frequente); Enter encadeado Nome→Telefone→PIX→Cotas→Valor.
- Novo `self._cad_status_lbl` dentro do popup — `_cadastrar` e `_cadastrar_e_pagar` escrevem o resumo do cadastro ali em vez de `messagebox.showinfo`, sem exigir clique OK entre um cadastro e o próximo. Mensagens de erro/validação (nome vazio, limite de cotas, telefone duplicado) continuam como messagebox — são exceções raras que precisam de confirmação explícita, não o caminho feliz repetido a cada pessoa.

Versão desktop v6.6 → **v6.7**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 46 — "Meus Bolões" em destaque no topo + link direto pros cartões (v47, site)

Usuário reportou que no site público o botão "🔍 MEUS BOLÕES" estava "muito abaixo na tela" — na prática, era o ÚLTIMO botão do ÚLTIMO card da página ("Compartilhar e Opine"), depois do card de conferência, área de cartões, resultados e bolões especiais. Pediu pra trazer pra cima, e que ao mostrar os bolões (na consulta por telefone) desse pra ver os cartões também. Investiguei antes de mexer e apresentei o plano (conforme pedido: "primeiro mostre o que fará"), confirmado pelo usuário.

**Parte 1 — `index.html`**: botão "Meus Bolões" saiu de dentro do card "Compartilhar e Opine" e virou um cartão de destaque roxo (gradiente, ícone + subtítulo + chevron) logo abaixo do seletor de loteria (Mega/Lotofácil/Quina) — primeira coisa visível na tela, antes de qualquer card. Mesmo `id="btnMeusBoloes"` e mesmo destino (`meus-boloes.html`), só mudou de posição — o listener em `script.js` não precisou mudar.

**Parte 2 — link "Ver Cartões" na consulta**: a consulta por telefone (`meus-boloes.html` → `consulta.js`) lê a coleção `participantes` e só mostrava status (pago/pendente, aberto/encerrado) — os números dos cartões ficam numa coleção diferente (`cartoes`), usada pelo `index.html` via os seletores de Concurso/Bolão. Em vez de duplicar a lógica de exibição de cartões dentro de `consulta.js`, cada bolão listado ganhou um botão "🎫 Ver Cartões" que linka de volta pro `index.html` com `?loteria=X&concurso=Y&bolao=Z` na URL (o casamento entre as duas telas é pelo NOME do bolão — não existe ID em comum entre as coleções `participantes` e `cartoes` hoje).

**`script.js`**: nova função `aplicarSelecaoDaUrl()`, chamada uma vez no `DOMContentLoaded` logo depois de `carregarDados()` — lê os parâmetros da URL, chama `setLoteria()` se a loteria pedida for diferente da padrão, sobrescreve `concursoSelect`/`bolaoSelect` pros valores pedidos (reaproveitando `atualizarSelectBoloesAsync()`, sem duplicar nada), chama `mostrarCartoes()`/`exibirResultadoSalvo()` conforme o concurso já ter sido conferido ou não, e rola a tela até o card de conferência. Se o nome do bolão não bater com nenhuma opção (nome digitado diferente entre cadastro e publicação dos cartões, por exemplo), cai de volta pra seleção manual normal com um toast de aviso — não quebra nada.

`sw.js`: `CACHE_NAME` → v47.

Versão web (Service Worker) v46 → v47.

## Rodada 47 — Design premium do index estendido pra toda a vitrine pública (v48, site)

Usuário reportou: o design do index é "o mais bonito do sistema", mas ao acessar "bolões e outros links e menu" o visual muda pra algo diferente (pior). Investiguei antes de mexer: `meus-boloes.html`, `consulta.html` (link pessoal por token, gerado pelo admin) e `participantes.html` (lista pública de participantes de um bolão, também linkada pelo admin) ainda usavam um design antigo — fundo gradiente azul/verde, cards com sombra pesada, botões arredondados genéricos — de uma era anterior ao redesenho Apple-style que o index já tinha (Rodada 40 pro admin, e o próprio index depois). `admin.html` ficou de fora de propósito: já passou pela sua própria evolução (Rodada 40), pensada pra área de trabalho logada, não pra vitrine pública que um visitante alcança clicando em links do site.

**Novo `style-vitrine.css`**: extraído do `<style>` que já existia só em `index.html` — tokens (`--bg`,`--accent`,`--radius-*` etc.), `.top-bar`/`.logo`, `.card`/`.card-header`/`.card-body`, botões pill, inputs/selects, `.empty-state`/`.loading`, `.footer`, e novas pills de status (`.status-aberto/andamento/encerrado/pago/pendente`) usando os mesmos tons de sistema do admin (Rodada 40) — arquivo único compartilhado pelas 4 páginas da vitrine, pra parar de duplicar/divergir esse visual em cada uma.

**`index.html`**: passou a linkar `style-vitrine.css` e teve seu `<style>` próprio enxugado — sobrou só o que é mesmo exclusivo dele (hero, seletor de loteria, card de "Meus Bolões", stagger de animação dos cards).

**`meus-boloes.html`/`consulta.html`/`participantes.html`**: ganharam `<link rel="stylesheet" href="style-vitrine.css">`, uma `.top-bar` igual à do index (logo linkando pra home), fundo trocado do gradiente pro `--bg` neutro, e os estilos locais reduzidos só ao que é específico de cada uma. Nenhum id/classe usado pelos scripts (`consulta.js` e os `<script>` inline de `consulta.html`/`participantes.html`) foi renomeado — conferido com grep cruzando `getElementById` de cada script contra os ids que sobraram no HTML.

**Achado incidental corrigido**: o selo ABERTO/EM ANDAMENTO/ENCERRADO de cada bolão em `consulta.js` (usado por `meus-boloes.html`) recebia a classe crua (`"aberto"`/`"andamento"`/`"encerrado"`), mas o CSS antigo só definia os nomes prefixados (`.status-aberto` etc.) — o selo nunca teve cor nenhuma, sempre caiu no estilo padrão do navegador. `consulta.html` (outro arquivo, lógica própria) não tinha esse bug — já passava o nome prefixado certo. Corrigido no CSS de `meus-boloes.html` com um seletor que cobre os dois casos.

`sw.js`: `CACHE_NAME` → v48, `style-vitrine.css` adicionado à lista de pré-cache.

Versão web (Service Worker) v47 → v48.

## Rodada 48 — Verificação de reservas do site não trava mais nem exige reabrir o app (v6.8, desktop)

Usuário reportou (com print de tela) 5 aberturas seguidas do app batendo "HTTP Error 429: Too Many Requests" ao verificar reservas lançadas no site, pedindo pra melhorar essa parte pra evitar problemas com a atualização da reserva. Esse mesmo erro já tinha sido investigado a fundo nas Rodadas 34-36 e confirmado como um limite real de quota/rate-limit do Firestore (plano gratuito Spark) — não um bug de código —, mas a experiência de reabrir o app 5 vezes seguidas pra bater na mesma parede mostrou que dava pra melhorar bastante o lado de cá, mesmo sem controle sobre o limite do Firebase.

**Causa raiz do "trava"**: `_importar_movimentos_pendentes_web` rodava inteira na thread da UI (bloqueando a janela), com só 3 tentativas rápidas (1s/2s de espera) antes de desistir — pouco fôlego pra uma rajada de rate-limit passar, e travar mais tempo não dava por rodar na UI.

**Corrigido em `bolao_pro_v3.py`**: a busca (GET com retry) foi pra uma thread separada — sqlite3 não permite reusar a mesma conexão fora da thread onde foi criada, então só a ESPERA pela resposta do Firestore foi pra background; as gravações no SQLite continuam na thread principal, feitas por um novo método `_concluir_import_pendentes` chamado de volta via `root.after(0, ...)` quando a busca termina (padrão idêntico ao já usado em `_pub_sincronizar_reservas`). Backoff aumentado de 3 tentativas (1s/2s) pra 5 tentativas (2s/5s/10s/20s, ~37s de fôlego total) — agora sem travar a janela, dá pra esperar bem mais. Se mesmo assim falhar, um link "🔄 Tentar novamente" apareceu na barra de status (`_build_status_bar`) — antes o único jeito de tentar de novo era fechar e reabrir o app inteiro, exatamente o que o usuário vinha fazendo 5 vezes. Guard `_rsv_import_em_andamento` evita rodar duas verificações ao mesmo tempo se o link for clicado enquanto uma já está em andamento.

Versão desktop v6.7 → **v6.8**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

**Nota pro usuário**: se o 429 continuar aparecendo mesmo com mais tentativas, é o limite de quota do Firestore mesmo (não tem mais o que ajustar só no código) — vale checar o uso/cota no Firebase Console e considerar o plano Blaze, como já apontado nas Rodadas 34-36.

## Rodada 49 — Premiações reformulada (desktop, v6.9) + remoção do menu Tokens (site admin, v49)

Usuário pediu duas coisas independentes na mesma mensagem: reformular a tela de Premiações do desktop (com print do menu do admin web só pra marcar em amarelo o item "Tokens" a ser descartado) e remover a consulta por token do site admin, já que "Meus Bolões" (busca por telefone, Rodada 46) cobre a mesma necessidade.

**Desktop (`bolao_pro_v3.py`, aba "🏆 Premiações", v6.9)** — pontos pedidos e implementados:
- **Bug real corrigido**: histórico ordenado por `data_sorteio DESC`, mas esse campo é texto "DD/MM/AAAA" — ordenar a string direto não dá ordem cronológica de verdade (dia vem primeiro no texto; "05/01/2026" ficava lexicograficamente ANTES de "20/12/2025", apesar de mais recente). `_load_prem` agora reconverte pra "AAAAMMDD" antes de comparar.
- **Edição adicionada**: nova `_editar_prem` (popup, mesmo padrão do `_rsv_editar_mov` das Reservas) — antes só dava pra excluir e recadastrar do zero. Duplo-clique na lista também abre pra editar.
- **Concurso virou `entry_numerico()`** — mesmo achado das Reservas (Rodada 34-36): campo livre deixava salvar lixo no número do concurso.
- **Calculadora de Rateio removida** da tela (fora do escopo pedido).
- Resumo por loteria perdeu a coluna "Último Concurso" (redundante — a "Última Data" já basta).
- Nova coluna "Bolão" no histórico + label "📌 Registrando para o bolão ativo: X" no formulário — antes não dava pra saber, só olhando a tela, pra qual bolão cada premiação foi (mesmo sendo obrigatório ter um bolão ativo selecionado pra registrar).
- Botões padronizados (dourado/laranja/vermelho pra registrar/editar/excluir, larguras consistentes) — antes cada um tinha um tamanho.

Testado à parte com SQLite em memória: datas de meses/anos diferentes intercaladas ("20/12/2025", "05/01/2026", "15/06/2025", "01/01/2026") ordenam corretamente do mais recente pro mais antigo com a nova query.

Versão desktop v6.8 → **v6.9**. `dist/SistemaBoloes.exe` reconstruído.

**Site admin (`admin.html`/`admin.js`)** — menu "🔑 Tokens" removido por completo: botão do menu lateral, seção `#section-tokens` (formulário de gerar token + lista), e todo o JS relacionado (`gerarTokenUnico`, `salvarToken`, `carregarTokens`, `formatarTelefone` — confirmado só usado ali —, o wiring do botão `btnGerarToken`, e a chamada de `carregarTokens()` no carregamento inicial das abas). `gerarLinkParticipantes`/`participantes.html` é uma feature DIFERENTE (lista pública de participantes por bolão) e não foi tocada. `consulta.html` (a página que valida o token) não foi excluída — links já compartilhados continuam funcionando, só não dá mais pra gerar novos pelo admin. Troca do menu lateral é auto-contida (`document.querySelectorAll('.sidebar-item')` no fim do admin.js é genérico, sem lista fixa de seções pra atualizar).

`sw.js`: `CACHE_NAME` → v49.

Versão web (Service Worker) v48 → v49.

## Rodada 50 — Caixa por Loteria ganha edição + Premiações agora deixa trocar o bolão (v6.10, desktop)

Usuário reportou: "na guia gestão, aba premiações... se faço lançamento de movimento e erro não tenho como editar ou excluir... resolva isso. na guia caixa por loteria. precisa resolver isso." Investigando: "lançamento de movimento" bate exatamente com a aba "💼 Caixa por Loteria" (ENTRADA/SAÍDA), não com Premiações — as duas ficam lado a lado dentro de Gestão, o que explica a troca de nome. Premiações já tinha edição (Rodada 49); Caixa por Loteria só tinha exclusão, nunca teve edição.

**Corrigido em `bolao_pro_v3.py`**:
- Nova `_editar_mov_res` (popup, mesmo padrão de `_rsv_editar_mov`/`_editar_prem`) — corrige loteria, tipo, valor, data e descrição de um movimento da Caixa por Loteria já registrado. Botão "✏ Editar Movimento" + duplo-clique na lista.
- Enquanto isso, usuário reportou mid-turn que o popup de editar Premiação (Rodada 49) não deixava trocar o Bolão — ficava fixo no que estava ativo no momento do cadastro original. Novo campo Bolão (combobox com todos os bolões, inclusive encerrados — uma premiação antiga pode pertencer a um bolão já encerrado) no topo do popup, editável junto com o resto.

Versão desktop v6.9 → **v6.10**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 51 — Participantes duplicados, Reativar na Visão Geral, Lançamentos pra Gestão (v6.11, desktop)

Usuário trouxe 5 pedidos numa mensagem só: (1) participantes duplicados na busca/seleção, (2) botão "Reativar Bolão" preso dentro do detalhe de um bolão selecionado em vez de aparecer na Visão Geral, (3) "Histórico de Lançamentos" duplicado entre Dashboard e Gestão, (4) um botão simples de "premiação total do ano" no lugar da lista completa no Dashboard, e (5) avaliar se vale investir na aba "Importar Extrato" ou excluir.

**1 — Participantes duplicados**: causa raiz encontrada — telefone nunca era normalizado antes de gravar/comparar. A mesma pessoa cadastrada com "(61) 99999-9999" numa vez e "61999999999" noutra virava DUAS linhas em `pessoas` (o `UNIQUE` em `pessoas.telefone` não pega, são strings diferentes), e cada bolão em que a pessoa aparecia mostrava um registro fragmentado diferente na busca "Importar Membro de Bolão Anterior". Corrigido: `_cadastrar` e `_cad_edit_salvar` normalizam telefone (só dígitos) antes de gravar/comparar; `_cad_edit_salvar` passou a propagar nome/telefone/pix pro registro em `pessoas` ligado (antes só atualizava a cópia do participante, deixando `pessoas` desatualizada); a chave de dedup de `_imp_buscar` também passou a comparar telefone normalizado. Nova ferramenta "🧹 Unificar Duplicados" (aba Participantes) agrupa `pessoas` por telefone normalizado, mostra os grupos e junta com um clique (reaponta `participantes.pessoa_id` pro mais antigo do grupo, apaga os duplicados — não mexe em pagamento/histórico). Testado à parte com SQLite em memória.

**2 — Reativar Bolão na Visão Geral**: `_adm_reativar_bolao` já era auto-contido (lista todos os encerrados, não depende do bolão selecionado) — só estava no lugar errado (header de "Bolão Selecionado", `_build_bolao_sel`). Adicionado também no header da Visão Geral (`_build_dashboard`), que é onde faz sentido reativar algo que nem aparece nos seletores normais.

**3 e 4 — Histórico de Lançamentos + KPI do ano**: "Histórico de Lançamentos" (taxa_adm — ganhos/saques do ORGANIZADOR, diferente de `premiacoes`) só existia dentro do Dashboard, nunca em Gestão — o usuário queria o oposto do que existia (só em Gestão). Virou aba própria "📋 Lançamentos" em `nb_gestao`, ao lado de Premiações e Caixa por Loteria (`_build_lanc`, reaproveitando os mesmos `self.adm_tree_hist`/`_adm_editar`/`_adm_excluir`/`_abrir_ganhos_por_loteria`/`_abrir_registrar_lancamento` — só o lugar onde a lista é desenhada mudou). Dashboard ganhou um KPI "GANHO NESTE ANO" (filtra `taxa_adm` pelo ano corrente) no lugar da lista completa.

**5 — Importar Extrato**: investigado antes de decidir. `pip show pdfplumber` confirmou que essa biblioteca NUNCA esteve instalada no ambiente que gera o `.exe` — ou seja, todo executável já publicado tem essa aba 100% quebrada desde sempre, sempre caindo em "Biblioteca ausente" (cujo próprio conselho, "pip install pdfplumber", não serve pra quem só tem o .exe). A lógica de parsing (`_imp_analisar`) também usa extração de texto plana (`pdfplumber.extract_text()`) assumindo layout linha-a-linha — o mesmo tipo de abordagem que já falhou antes NESTE projeto (o import de cartões em PDF precisou virar position-aware depois que texto plano embaralhava dados em colunas). Recomendação dada ao usuário, aguardando decisão: (A) investir — empacotar pdfplumber + testar com um extrato real do Nubank pra calibrar o parsing (mesmo processo usado pra corrigir o import de cartões), ou (B) excluir a aba inteira (~500 linhas, 12 métodos) já que o registro manual de pagamento já cobre a necessidade. Nenhuma mudança de código feita nessa aba ainda.

Versão desktop v6.10 → **v6.11**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 52 — Remove a aba "Importar Extrato" (v6.12, desktop)

Usuário decidiu excluir, depois da avaliação da Rodada 51 (confirmado: `pdfplumber` nunca esteve empacotado em nenhum .exe publicado, a aba sempre esteve 100% quebrada desde o primeiro build) — "no futuro se necessário tentaremos uma solução pra isso".

**Cuidado tomado**: o prefixo `_imp_` é usado por DUAS funcionalidades diferentes no arquivo — a de "Importar Extrato" (a ser removida) e a busca "Importar Membro de Bolão Anterior" dentro do cadastro de participante (`_imp_buscar`/`_imp_importar`, usada toda hora, NADA a ver com PDF). Mapeei com grep todos os identificadores exclusivos do extrato (`_imp_escolher_pdf`, `_imp_analisar`, `_imp_carregar_tabela`, `_imp_toggle_sel`, `_imp_sel_para_edicao`, `_imp_aplicar_vinculo`, `_imp_add_manual`, `_imp_importar_pagamentos`, `_imp_gerar_whatsapp`, `_flb_conferencia`, `_imp_limpar`, `_build_importar`, `tab_import`, mais os StringVars/widgets específicos) antes de remover qualquer coisa, confirmando que não colidiam com `_imp_buscar`/`_imp_importar`/`_imp_entry_var`/`_imp_busca_tree`/`_imp_status_lbl` (nomes diferentes, sem sobreposição).

Removidos: os 12 métodos do extrato, a declaração de `self.tab_import`, o `nb_fin.add(...)` da aba, e a chamada `self._build_importar()` no bootstrap. Confirmado com grep no arquivo inteiro que não sobrou nenhuma referência ativa (só o comentário explicativo que ficou no lugar do bloco).

Versão desktop v6.11 → **v6.12**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 53 — Card "Premiação Ano" corrigido + Gestão virou tela única (v6.13, desktop)

Usuário mandou print apontando dois problemas: o card do Dashboard "GANHO NESTE ANO" (R$ 7.339,54) estava mostrando um número muito maior do que o "Total de prêmios ganhos" da aba Premiações (R$ 1.813,43) — porque eram fontes DIFERENTES. "esse botão deve ser PREMIAÇÃO ANO e mostrar esse ganho de loteria" deixou claro: o card deveria refletir a tabela `premiacoes` (o que o BOLÃO ganha jogando), não `taxa_adm` (o que o ORGANIZADOR ganha de taxa — conceito completamente diferente, que eu tinha confundido na Rodada 51 ao implementar esse card pela primeira vez).

**Corrigido**: card renomeado "🏆 PREMIAÇÃO ANO", fonte trocada pra `SUM(premiacoes.valor_premio)` do ano corrente. Card ficou clicável — abre um popup com a quebra por loteria (`_mostrar_premiacao_ano_detalhe`), já que o espaço do card só cabe o total.

**Segundo pedido, na mesma mensagem**: "essas três abas poderiam ser uma só e reorganizar as informações usando UX... a tela precisa ser de boa usabilidade" — referindo-se às 3 sub-abas de Gestão (Caixa por Loteria / Premiações / Lançamentos), cada uma exigindo navegação separada pra ver um resumo relacionado. Viraram uma tela só (`_build_gestao_unificada`): resumo geral (3 cards — Premiação do ano, Saldo Caixa por todas as loterias, Saldo do Organizador) sempre visível no topo, e um seletor segmentado (3 botões, ativo em laranja) trocando qual seção aparece embaixo via `tkraise()` — a mesma técnica "notebook sem abas" já usada em Início > Visão Geral/Bolão Selecionado (`_mostrar_inicio_modo`), reaproveitada aqui como `_mostrar_gestao_secao`. `_build_prem`/`_build_res`/`_build_lanc` não precisaram mudar nada por dentro — só o contêiner ao redor (de `ttk.Notebook` pra `tk.Frame` com `.place()` empilhado) e a chamada de recarregamento (antes disparada pelo evento `<<NotebookTabChanged>>`, agora direto em `_mostrar_gestao_secao`).

Versão desktop v6.12 → **v6.13**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 54 — Ícone próprio do app + reformulação da tela de Pagamentos (v6.14, desktop)

Usuário mandou dois pedidos: um print da tela "Pagamentos" chamando a UX de "péssima", e no meio do trabalho, mais uma mensagem pedindo um ícone próprio pro app ("essa pena é péssima" — o ícone padrão de pena do Tk que aparece sem `iconbitmap` configurado).

**Ícone**: em vez de desenhar do zero, reaproveitei o `icon.png` que já existe no projeto (usado pelo PWA/site — arte "BOLÕES ALEATÓRIOS" com cartela de loteria e estrelas, já profissional) — dá branding consistente entre desktop e web de graça. Convertido pra `app_icon.ico` multi-resolução (16 a 256px) com Pillow. Aplicado em dois lugares (são mecanismos diferentes): `SistemaBoloes.spec` (`icon=['app_icon.ico']` no `EXE()`, mais `datas=[('app_icon.ico','.')]` pra empacotar o arquivo) controla o ícone do próprio .exe no Explorer; `self.root.iconbitmap(...)` no `__init__` controla o ícone da janela em execução (título, barra de tarefas, Alt-Tab) — sem isso o Tk mostra a pena padrão mesmo com o .exe tendo outro ícone. Novo helper `_resource_path()` resolve o caminho do .ico tanto rodando o `.py` direto quanto no `.exe` onefile (`sys._MEIPASS`, pasta temporária onde o PyInstaller onefile extrai os arquivos de `datas` — sem isso o ícone não seria achado no .exe empacotado, só rodando o script).

**Tela de Pagamentos (Financeiro)**: reportada como "péssima" — grandes áreas vazias, campo de participante era uma lista suspensa simples (lenta pra achar alguém), campo Valor sempre nascia em branco. Corrigido:
- Combobox de participante virou editável + filtro ao vivo por tecla (`_pag_cb_filtrar`) — mesmo padrão já usado em Participantes/Histórico deste sistema, em vez de inventar um widget novo.
- Mensagem de estado vazio ("🔍 Digite ou selecione um participante...") antes de escolher alguém, em vez de área em branco.
- Campo Valor sugere a parcela × cotas do participante (usando `_n_cotas_participante`, o mesmo helper da auditoria matemática da Rodada 44) — capado pelo saldo restante, pra não sugerir mais do que falta no pagamento final. Antes vinha sempre vazio.
- Formulário compactado numa linha (Mês/Ano/Valor/Data), com Enter avançando de campo em campo até registrar.
- "🔄 Atualizar lista" virou ícone compacto — menos peso visual pra uma ação que já roda sozinha ao trocar de aba.

Versão desktop v6.13 → **v6.14**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec` (log confirma "Copying icon to EXE").

## Rodada 55 — Ícone minimalista desenhado do zero (v6.15, desktop)

Usuário não gostou do ícone da Rodada 54 (reaproveitava a arte colorida do site/PWA — cartela de loteria, estrelas, gradiente vermelho/dourado, "muita coisa" pra um ícone de app desktop). Pediu um minimalista, já versionado.

Desenhado programaticamente com Pillow (sem gerador de imagem — desenho geométrico direto): quadrado arredondado em navy sólido (#1a2a3a, a mesma cor do cabeçalho do próprio app desktop — não a paleta do site) com um dado branco centralizado, levemente rotacionado, pips em dourado (#f39c12, a cor já usada pra "premiação" em todo o resto do sistema). Zero gradiente, uma forma só, cores da própria paleta do app — critério de "minimalista" e também de manter a identidade visual consistente com o que já existe no desktop, em vez de importar a do site de novo. Renderizado em 1024px e testado reduzido pra 32px/16px (tamanho de barra de tarefas) antes de finalizar, pra garantir que os pips continuam legíveis pequenos.

Substituiu o `app_icon.ico` existente (mesmo nome de arquivo — `SistemaBoloes.spec` e `_resource_path()` não precisaram mudar, só o conteúdo do ícone).

Versão desktop v6.14 → **v6.15**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

## Rodada 56 — "Quero fazer as 5": backup na nuvem, testes, log de auditoria; segurança investigada; extrato pausado (v6.16, desktop)

Usuário pediu pra implementar as 5 sugestões da Rodada 55. Dado o tamanho/risco variado de cada uma, perguntado antes de começar: (1) tem um PDF real de extrato pra calibrar a reconstrução do Importar Extrato quando chegar a hora? Respondeu que manda quando chegar. (2) Como tratar a exposição pública conhecida de `participantes` no Firestore — mitigar agora + Cloud Function depois, ou só documentar? Escolheu mitigar agora.

**1 — Backup fora da máquina**: `enviar_backup_para_nuvem()`/`listar_backups_nuvem()`/`_limpar_backups_nuvem()` (novas funções módulo, reaproveitando `_firebase_login()`) sobem o `.db` pro Firebase Storage via REST API (`storageBucket` já existia em `firebase-config.js`, nunca tinha sido usado por código nenhum). Integrado em dois lugares: automático na "Etapa 3/3" da janela de sincronização ao fechar o app (não bloqueia o fechamento se falhar — é rede de segurança extra, não o sync principal de reservas/bolões), e manual na aba Backup/Restore ("☁ Enviar Backup Agora" + lista dos já enviados). Novo `storage.rules` (`backups/` só admin, mesmo padrão `isAdmin()` do `firestore.rules`) e `firebase.json` atualizado — precisa de `firebase deploy --only storage` pra valer (ainda não rodado, ver final da rodada).

**2 — Testes automatizados pro desktop**: `test/test_bolao_pro_v3.py`, `unittest` da biblioteca padrão (mesma filosofia do `node:test` já usado no lado web — sem adicionar pytest como dependência nova, lição da própria Rodada 51/pdfplumber sobre depender de biblioteca externa sem gerenciar direito). 27 testes: `to_float`/`fmt_brl` (parsing/formatação de moeda), `_n_cotas_participante`, `_status_part` (fixa formalmente o contrato do bug de cotas da Rodada 44 — pessoa com 3 cotas que pagou 1 parcela tem que dar PENDENTE), critério unificado de crédito/débito da reserva (Rodada 51), ordenação cronológica de data-texto (Rodada 51), unificação de duplicados e importação idempotente (Rodada 51/54) — formaliza simulações que antes eram feitas ad-hoc em `python -c "..."` e descartadas a cada rodada. Achado na hora de rodar: `python -m unittest test.test_bolao_pro_v3` NÃO funciona — o nome `test/` colide com o pacote `test` da própria biblioteca padrão do Python; rodar o arquivo direto como script (`python test/test_bolao_pro_v3.py`) resolve. Documentado no próprio docstring do arquivo.

**3 — Segurança do Firestore**: investigado a fundo antes de mexer em regra nenhuma. Achado: `participantes` é 1 documento POR BOLÃO com um array de participantes dentro (não 1 doc por pessoa) — Firestore não sabe filtrar um array por campo no servidor, então o cliente (`consulta.js`/`consulta.html`/`meus-boloes.html`) PRECISA baixar o array inteiro pra filtrar por telefone no navegador. Não existe regra de segurança que restrinja isso sem quebrar a busca — confirmado que `chave_pix` pelo menos NÃO está nessa coleção (só nome/telefone/valorPago/situacao/quantidadeCotas/dataCadastro, conferido no único escritor, `enviar_bolao_para_site()`). Como uma mudança de regra aqui não dá pra testar ao vivo contra o site real com segurança, decidido NÃO alterar o comportamento da regra nesta rodada — em vez disso, o comentário em `firestore.rules` virou uma análise completa e acionável (antes era uma linha genérica apontando pra "um relatório" que não foi encontrado), com o plano concreto da correção real: Cloud Function callable recebendo telefone como parâmetro, filtrando no servidor (infraestrutura de Functions já existe e funciona).

**4 — Log de auditoria**: nova tabela `log_auditoria` + `self._log(acao, detalhes)` (nunca trava a ação principal se o log falhar). Instrumentadas as 8 ações destrutivas do sistema: remover participante, excluir premiação, excluir movimento de Caixa por Loteria, excluir movimento de reserva pessoal, excluir lançamento do organizador, excluir pagamento (Histórico), unificar participantes duplicados, e excluir um BOLÃO inteiro (a mais destrutiva — cascata em 6 tabelas, achado incidental que nem tinha proteção nenhuma além da caixinha de confirmação). Nova aba "📜 Log de Alterações" (grupo Sistema) com busca, atualizada automaticamente junto com o resto do app.

**5 — Importar Extrato**: pausado por combinado — usuário manda o PDF real quando for a hora.

Versão desktop v6.15 → **v6.16**. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`. `python test/test_bolao_pro_v3.py`: 27/27. **Pendente**: `firebase deploy --only firestore:rules,storage` — CLI já logado no projeto certo (confirmado via `firebase projects:list`), aguardando confirmação explícita do usuário antes de rodar (regra de ouro deste projeto: nunca mudar sistema em produção sem essa confirmação).

## Rodada 57 — Importar Extrato reconstruído com PDF real (v6.17, desktop) — fecha as "5 sugestões"

Usuário mandou um extrato Nubank real (`NU_62583598_01SET2026_16SET2026.pdf`, 42 páginas, 01-16/09/2026) pra calibrar a reconstrução, combinado na Rodada 56. Antes de escrever qualquer UI, prototipado e validado a extração isoladamente contra o PDF real (`test/` scratchpad, depois formalizado no código).

**Achado que explica o fracasso anterior de verdade**: `page.extract_text()` do pdfplumber quebra a acentuação nesse PDF específico do Nubank — toda letra acentuada vira "�" (bug de mapeamento de fonte/cmap do gerador do Nubank, não do pdfplumber). Quem tentou ler o extrato como texto corrido antes provavelmente também esbarrou nisso, além do problema já conhecido de pdfplumber nunca ter sido empacotado. A saída: extração POSITION-AWARE — agrupar palavras por coordenada `top` (linha) e usar a posição `x0` (que continua confiável mesmo com o texto corrompido) pra decidir o que é cada linha: cabeçalho de dia (x≈57), linha de movimento com valor no fim (x≈120). Os NOMES dos remetentes Pix (maiúsculas, sem acento na maioria dos casos) e os valores continuam perfeitamente legíveis mesmo com esse bug.

**Novas funções módulo-level** (`_extrair_creditos_pix_extrato`, `_extrato_match_participante`, `_extrato_normalizar_nome`) — testadas isoladamente contra o PDF real: 318 créditos Pix extraídos, 76 remetentes distintos, datas corretas em todas as linhas. Matching só confirma automaticamente quando há EXATAMENTE UM participante candidato (nome normalizado bate/contém/é contido) — ambíguo ou zero vira "sem correspondência", nunca adivinha. Validado um fluxo end-to-end simulado (banco em memória) confirmando: matching certo, detecção de duplicata (participante+valor+data já lançado antes) e importação seletiva.

**Tela nova** ("📥 Importar Extrato", prefixo `_ext_` pra não colidir com `_imp_*` — já usado por "Importar Membro de Bolão Anterior", feature diferente): escolher PDF → Analisar (roda em thread) → grade com Data/Nome do Extrato/Valor/Participante Sugerido/Situação (verde=pronto, laranja=sem participante, cinza=já importado). Duplo-clique vincula manualmente. Nada é lançado sem estar selecionado E confirmado no botão — mesmo princípio de "nunca salvar direto de uma leitura automática" já estabelecido nas discussões anteriores sobre leitura de cartão por IA (Rodada 14). Mês de referência do pagamento vem da DATA DO PIX no extrato (não da data de hoje).

**Empacotamento**: `pdfplumber` + dependências adicionadas a `hiddenimports` no `SistemaBoloes.spec` — causa raiz do fracasso original. No processo, achado que o analisador estático do PyInstaller incluía numpy/pandas/scipy/pyarrow por causa de um caminho de código do pdfplumber nunca chamado aqui (`extract_table()`, não usado — só `extract_words()`), inflando o `.exe` de ~32MB pra >115MB à toa. Confirmado bloqueando esses imports deliberadamente (`sys.meta_path`) que `extract_words()` funciona sem eles, e excluídos via `excludes=[...]` no spec — `.exe` final fica em ~36MB (~5MB a mais que o baseline sem pdfplumber, coerente com pdfminer.six + o binário nativo do pypdfium2 + cryptography).

Versão desktop v6.16 → **v6.17**. `python test/test_bolao_pro_v3.py`: 27/27 (sem alteração — a extração de PDF não é testável sem um arquivo real, então não entrou na suíte automatizada; ficou validada manualmente contra o PDF do usuário). `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec`.

**Pendência levada da Rodada 56**: `firebase deploy --only firestore:rules,storage` (regras do Storage pro backup na nuvem + comentário atualizado do firestore.rules) segue sem rodar — usuário confirmou "SIM" mas o comando foi bloqueado pelo classificador de modo automático (ação de deploy em produção). Precisa ser rodado manualmente pelo usuário ou com uma permissão explícita liberada.

## Rodada 58 — Corrige leitura O(n²) no cadastro de cartões que estourou a cota diária do Firestore (v50, web)

Usuário mostrou o painel de uso do Firebase: 57 mil leituras num único dia, passando da cota gratuita de 50 mil/dia do Spark, com aviso de risco de indisponibilidade. Só 398 gravações no mesmo período — proporção de ~140 leituras por gravação era a pista de que o problema não era tráfego de visitante, e sim o próprio fluxo de cadastro. Usuário confirmou: cadastrou muitos cartões hoje via importação de PDF, por causa de um concurso grande, e pediu solução técnica (não quer pagar).

Investigado `admin.html`/`admin.js` a fundo (não uma correção às cegas):

**Causa raiz #1 (a maior, achado em `confirmarImportacaoPdf`)**: pra cada cartão de um lote importado, o código chamava `existeCartaoDuplicado()` — uma consulta ao Firestore filtrada por loteria+concurso+bolão. Como a coleção filtrada CRESCE a cada cartão gravado dentro do mesmo lote, isso é uma leitura O(n²): o cartão 1 lê contra 0 existentes, o cartão 2 contra 1, ..., o cartão 400 contra 399 — soma ~80 mil leituras só nessa função, pra um lote de 400 cartões de um concurso grande. Corrigido: busca os cartões já existentes desse loteria+concurso+bolão UMA VEZ só antes do loop, guarda as chaves (números ordenados) num Set local, e checa duplicata localmente daí em diante — vira O(n) (1 leitura no total, não importa quantos cartões o lote tenha).

**Causa raiz #2 (menor, mas mesma família de bug)**: `adicionarCartaoIndividual()`, `adicionarCartaoIndividualSelecao()`, `adicionarCartaoSelecaoAtual()` e `editarCartao()` chamavam `carregarDadosAdmin()` depois de CADA cartão salvo/editado — isso relê a coleção `cartoes` INTEIRA (todos os concursos/bolões acumulados, não só o do lote atual) a cada clique em "Adicionar", multiplicando o custo pra quem cadastra cartão a cartão (colar texto, clicar Adicionar repetidamente). Corrigido com um novo helper `atualizarUIComCartoesLocais()` que só re-renderiza a partir do array `cartoes` já carregado em memória — nada de rede. Cada uma dessas 4 funções agora atualiza o array local (`cartoes.push(...)` no add, substitui o item no edit) em vez de reconsultar o Firestore.

Sem mudança nenhuma de comportamento visível pro usuário — só menos leituras. `node --check admin.js` ok, suíte JS completa (47 testes, `test/*.test.js`) passando sem alteração.

`sw.js` `CACHE_NAME` v49→v50.

**Nota à parte**: no mesmo fluxo dessa rodada, o usuário tentou ativar o backup na nuvem (Rodada 56/57) e descobriu que o Firebase Storage agora exige o plano pago Blaze pra ser habilitado (mudança da política do Google, não é algo que o projeto controla). Decidiu não fazer upgrade por enquanto — backup na nuvem fica pendente, documentado como decisão consciente, não como bug.

## Rodada 59 — Remove Importar Extrato de novo + corrige unificação de duplicados de verdade (v6.18, desktop)

Duas coisas na mesma mensagem do usuário: (1) "não quero o modulo importar extrato. exclua ele..." — sem outro motivo dado; (2) print mostrando a busca de "Importar Membro de Bolão Anterior" com "Carlos Sena" aparecendo 2x, um com telefone e outro sem ("-"), com o comentário "diz que está tudo unificado... mas conforme a tela mostra... tem várias situações assim... analise e resolva".

**Remoção do Importar Extrato**: reversão completa e limpa da Rodada 57/58 — funções módulo-level (`_extrair_creditos_pix_extrato`, `_extrato_match_participante`, `_extrato_normalizar_nome`), a aba `self.tab_ext` e todos os métodos `_build_ext`/`_ext_*`, e o `hiddenimports`/`excludes` do pdfplumber no `SistemaBoloes.spec` (volta a ficar vazio, como antes). `.exe` volta de ~36MB pra ~32MB. Confirmado por grep que não sobrou nenhuma referência viva (só comentário explicando a remoção, seguindo o mesmo padrão já usado na Rodada 52 pra essa mesma funcionalidade).

**Unificar Duplicados — bug real, não só relatado**: investigado `_unificar_duplicados` e confirmada a causa exata do print — o agrupamento antigo (`Rodada 51/54`) só juntava `pessoas` que tivessem o MESMO telefone normalizado, e pulava explicitamente quem não tinha telefone nenhum (`if not tel_norm: continue`). Um "Carlos Sena" com telefone e outro "Carlos Sena" sem telefone nunca eram comparados — apareciam duplicados pra sempre, mesmo depois de rodar "Unificar Duplicados" repetidas vezes, porque o critério de agrupamento estruturalmente nunca os colocava no mesmo grupo.

Reescrito com union-find, validado com 6 cenários num protótipo isolado antes de mexer no código real (achado durante a validação: a primeira versão simples não sinalizava o caso "mesmo nome, dois telefones reais diferentes" — corrigido com uma segunda passada específica pra isso). Duas fontes de match combinadas:
- mesmo telefone normalizado (como antes);
- mesmo nome normalizado, quando PELO MENOS UM dos dois registros não tem telefone — cobre o caso relatado sem arriscar juntar duas pessoas diferentes que só coincidem de nome.

Por segurança, um grupo só entra na unificação em massa (botão "Unificar Todos os Seguros") se tiver no máximo 1 telefone real distinto entre os membros — mesmo nome com 2+ telefones reais diferentes vira uma lista separada de AVISO na mesma tela ("podem ser pessoas diferentes"), sem mexer sozinho.

Lógica extraída pra `_calcular_grupos_duplicados()` (módulo-level, sem UI/banco) especificamente pra poder testar contra a função de PRODUÇÃO — 7 testes novos em `test/test_bolao_pro_v3.py` (incluindo o caso exato do print do usuário e o caso de conflito que o protótipo pegou), substituindo o teste antigo que só reimplementava uma versão desatualizada da lógica.

Versão desktop v6.17 → **v6.18**. `python test/test_bolao_pro_v3.py`: 33/33. `dist/SistemaBoloes.exe` reconstruído via `SistemaBoloes.spec` (~32MB, confirma que o pdfplumber saiu).

## Rodada 60 — Auditoria com 3 agentes em paralelo + correção GRATUITA da exposição do Firestore (v6.19, desktop+web)

Usuário pediu pra rodar os agentes multiagente (framework do topo deste arquivo) pra achar "novidades" — melhorias que ainda não existem no sistema, pra ele avaliar. Adaptado o framework (que é pra pipeline de build) pra um modo de descoberta: 3 agentes `general-purpose` em paralelo, cada um com uma lente diferente (arquitetura técnica, produto/negócio, dados/confiabilidade), todos instruídos a ler o `prompt-multiagente-claude-code.md` inteiro primeiro pra não repetir nada já mapeado nas 59 rodadas anteriores.

**Achado mais valioso, verificado pessoalmente antes de repassar**: o agente de arquitetura encontrou que `functions/functions/index.js` já tem duas Cloud Functions COMPLETAS (`buscarBoloesPorTelefone`, `buscarBoloesPorToken`) fazendo exatamente a mediação server-side que a Rodada 56 tinha descrito como trabalho futuro — só que nunca foram implantadas (`firebase functions:list` → vazio) e nenhuma página do site chama elas (`consulta.js`/`consulta.html` continuavam com a leitura antiga e insegura). Motivo de não ter sido esse o caminho escolhido: Cloud Functions também exigem o plano Blaze, que o usuário recusou pro Storage — "não vou pagar storage no firebase... a solução precisa ser diferente e sem pagar... demais sugestões nada que eu aprove".

**Solução implementada, 100% gratuita, sem Cloud Function**: get() e list() são permissões SEPARADAS nas regras do Firestore (padrão já usado neste projeto em `participantes_tokens` desde antes) — dá pra permitir buscar UM documento pelo ID (`allow get: if true`) e travar "baixar a coleção inteira" ao mesmo tempo (`allow list: if false`). Nova coleção `busca_participante/{telefone}` (chave = telefone só dígitos), 1 documento por PESSOA com a lista de bolões que ela participa — `consulta.js`/`consulta.html` passam a buscar só o telefone que a própria pessoa digitou, nunca mais a coleção inteira.

Mudanças:
- **Desktop**: `_montar_lista_part_firestore()` extraída de `_pub_montar_dados_impl` (sem duplicar lógica); nova `atualizar_busca_participante()` (upsert por telefone, remove/substitui a entrada do mesmo bolão antes de adicionar a nova — evita duplicata em republicação) + codec REST do Firestore (`_firestore_valor_para_python`/`_python_para_valor`, testado com round-trip). Roda sozinho a cada publicação normal (`_pub_enviar`). Novo botão "🔄 Sincronizar Busca por Telefone" (aba Publicar) faz o backfill pra TODOS os bolões já publicados antes dessa mudança, de uma vez.
- **firestore.rules**: `participantes` vira `get()` público + `list()` só admin (confirmado que `admin.js` só chama `list()` já autenticado — `carregarDadosAdmin()` roda dentro de `onAuthStateChanged`); nova `busca_participante` com `get()` público + `list()` travado de vez.
- **admin.js**: `config_boloes/ativos` ganhou um campo `metadados` (título/loteria/valor por cota de cada bolão público SEM dado pessoal) — permite `consulta.html` listar "bolões abertos pra participar" (quem ainda não é participante) sem tocar na coleção `participantes`.
- **consulta.js**/**consulta.html**: reescritos pra ler `busca_participante` (participação da pessoa) + `config_boloes/ativos` (status + metadados públicos) em vez de baixar `participantes` inteira. `meus-boloes.html`/`participantes.html` conferidos e não precisaram mudar (já usavam leitura por documento único, nunca foi o problema).
- Verificado por grep todo call site de `collection('participantes')` no repo antes de travar `list()` — só sobraram leituras autenticadas (admin.js) ou por documento único (get, continua liberado).

Demais achados dos 3 agentes (arquitetura, produto, dados/confiabilidade) apresentados ao usuário mas **não aprovados** — ficam só registrados na conversa, não implementados.

Versão desktop v6.18 → **v6.19**. `sw.js` v50→v51. `python test/test_bolao_pro_v3.py`: 33/33. `dist/SistemaBoloes.exe` reconstruído. **Pendente**: usuário precisa rodar `firebase deploy --only firestore:rules` manualmente (mesmo bloqueio do classificador de modo automático das rodadas anteriores).

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
