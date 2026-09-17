# -*- coding: utf-8 -*-
"""
Testes automatizados do desktop (bolao_pro_v3.py) — Rodada 56.

Antes só o lado web tinha testes (test/*.test.js, node:test). O desktop
é o coração do sistema (mexe com dinheiro de verdade) e não tinha
NENHUM teste automatizado — toda verificação era manual (py_compile +
sweep de duplicatas + simulações ad-hoc de SQL em memória, descartadas
ao final de cada rodada). Esta suíte formaliza as simulações que já
foram feitas manualmente ao longo de várias rodadas, cobrindo primeiro
o que mexe com dinheiro: cálculo de cotas, status de pagamento
(QUITADO/EM DIA/PENDENTE), critério de crédito/débito da reserva,
ordenação cronológica e unificação de participantes duplicados.

Usa unittest (biblioteca padrão) em vez de pytest — mesma filosofia já
usada no lado web (node:test, sem dependência externa nova). Roda com:

    python test/test_bolao_pro_v3.py -v

("python -m unittest test.test_bolao_pro_v3" NÃO funciona: o nome
"test/" colide com o pacote "test" da própria biblioteca padrão do
Python — import test.test_bolao_pro_v3 resolve pro stdlib primeiro.
Rodar o arquivo direto como script evita o problema.)

bolao_pro_v3.py só executa a GUI dentro de "if __name__ == '__main__':",
então importar o módulo aqui não abre nenhuma janela Tkinter nem toca
em boloes.db — é seguro rodar em qualquer máquina/CI.
"""
import os
import sqlite3
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bolao_pro_v3 as m


# ════════════════════════════════════════════════════════════
#  to_float / fmt_brl — parsing e formatação de moeda
#  (a base de TUDO que envolve dinheiro no sistema; um bug aqui
#  se propaga silenciosamente pra todo canto)
# ════════════════════════════════════════════════════════════
class TestToFloat(unittest.TestCase):
    def test_formato_brasileiro_com_milhar(self):
        self.assertEqual(m.to_float("1.234,56"), 1234.56)

    def test_formato_internacional_com_milhar(self):
        self.assertEqual(m.to_float("1,234.56"), 1234.56)

    def test_virgula_decimal_sem_milhar(self):
        self.assertEqual(m.to_float("33,00"), 33.0)

    def test_ponto_decimal_sem_milhar(self):
        self.assertEqual(m.to_float("33.00"), 33.0)

    def test_ponto_decimal_um_digito_nao_vira_milhar(self):
        # Achado documentado no próprio docstring da função: "33.0" não
        # pode virar 330 tratando o ponto como separador de milhar.
        self.assertEqual(m.to_float("33.0"), 33.0)

    def test_inteiro_puro(self):
        self.assertEqual(m.to_float("1234"), 1234.0)

    def test_com_prefixo_rs_e_espacos(self):
        self.assertEqual(m.to_float("R$ 1.234,56"), 1234.56)

    def test_vazio_ou_invalido_retorna_zero(self):
        self.assertEqual(m.to_float(""), 0.0)
        self.assertEqual(m.to_float("abc"), 0.0)
        self.assertEqual(m.to_float(None), 0.0)


class TestFmtBrl(unittest.TestCase):
    def test_formata_com_milhar_e_virgula_decimal(self):
        self.assertEqual(m.fmt_brl(1234.5), "R$ 1.234,50")

    def test_valor_zero(self):
        self.assertEqual(m.fmt_brl(0), "R$ 0,00")

    def test_ida_e_volta_com_to_float(self):
        # fmt_brl(to_float(x)) tem que devolver a mesma grandeza — pega
        # regressão se um dos dois lados mudar de convenção sozinho.
        original = 9876.54
        texto = m.fmt_brl(original)
        de_volta = m.to_float(texto)
        self.assertAlmostEqual(de_volta, original, places=2)


# ════════════════════════════════════════════════════════════
#  _n_cotas_participante — quantas cotas uma pessoa tem, a partir
#  do valor esperado dela e do valor de 1 cota do bolão. Usado em
#  6 telas diferentes pra decidir status de pagamento (Rodada 44:
#  bug real onde 5 dessas 6 comparavam contra a parcela "flat",
#  sem multiplicar pelas cotas).
# ════════════════════════════════════════════════════════════
class TestNCotasParticipante(unittest.TestCase):
    def _n_cotas(self, ve, vt):
        return m.BolaoApp._n_cotas_participante(None, ve, vt)

    def test_tres_cotas(self):
        self.assertEqual(self._n_cotas(300, 100), 3)

    def test_uma_cota(self):
        self.assertEqual(self._n_cotas(100, 100), 1)

    def test_sem_valor_total_bolao_assume_uma_cota(self):
        self.assertEqual(self._n_cotas(100, 0), 1)

    def test_sem_valor_esperado_assume_uma_cota(self):
        self.assertEqual(self._n_cotas(0, 100), 1)

    def test_nunca_retorna_menos_de_uma_cota(self):
        # round(50/100) = 0 sem o max(1, ...) — participante ficaria com
        # ZERO cotas, o que não existe na prática.
        self.assertEqual(self._n_cotas(50, 100), 1)


# ════════════════════════════════════════════════════════════
#  _status_part — QUITADO / EM DIA / PENDENTE. O bug da Rodada 44:
#  quem tem 2+ cotas aparecia "em dia" cedo demais quando a parcela
#  não vinha multiplicada pelas cotas ANTES de chamar esta função
#  (a correção ficou em cada CHAMADOR — _n_cotas_participante() *
#  parc — não aqui dentro; estes testes fixam o contrato: dado um
#  "parc" já multiplicado corretamente, o resultado tem que bater).
# ════════════════════════════════════════════════════════════
class TestStatusPart(unittest.TestCase):
    def _status(self, pago, val_esp, parc_esp, parc):
        return m.BolaoApp._status_part(None, pago, val_esp, parc_esp, parc)

    def test_quitado_quando_saldo_zero_ou_negativo(self):
        status, tag = self._status(pago=300, val_esp=300, parc_esp=1, parc=300)
        self.assertEqual(tag, "quitado")
        self.assertIn("QUITADO", status)

    def test_tres_cotas_pagou_uma_parcela_fica_pendente(self):
        # Cenário real do achado da Rodada 44: pessoa com 3 cotas a
        # R$100/parcela (precisa de R$300/mês pra estar em dia). Pagou
        # só R$100 (1 parcela "flat"). Com a parcela corretamente
        # multiplicada (parc=300 aqui, já pré-multiplicada pelo
        # chamador), isso tem que dar PENDENTE — antes do fix dava
        # "EM DIA" em 5 das 6 telas que usavam essa comparação.
        status, tag = self._status(pago=100, val_esp=300, parc_esp=1, parc=300)
        self.assertEqual(tag, "pendente")

    def test_tres_cotas_pagou_as_tres_parcelas_fica_em_dia(self):
        status, tag = self._status(pago=300, val_esp=900, parc_esp=1, parc=300)
        self.assertEqual(tag, "emdia")

    def test_parcela_zero_nao_quebra(self):
        # parc=0 é um bolão mal configurado (sem valor de parcela) — não
        # pode lançar ZeroDivisionError, só não marcar como "em dia".
        status, tag = self._status(pago=0, val_esp=100, parc_esp=1, parc=0)
        self.assertEqual(tag, "pendente")


# ════════════════════════════════════════════════════════════
#  Critério único de crédito/débito da reserva (Rodada 51) —
#  TIPOS_CREDITO_RESERVA / TIPOS_DEBITO_RESERVA / _sql_in_tipos /
#  _eh_credito_reserva / _tipo_fb. Antes existiam 3 critérios
#  ligeiramente diferentes espalhados pelo arquivo.
# ════════════════════════════════════════════════════════════
class TestCriterioReserva(unittest.TestCase):
    def test_eh_credito_reserva_reconhece_variantes(self):
        for tipo in ("CRÉDITO", "credito", "Entrada", "DEPOSITO", "depósito"):
            with self.subTest(tipo=tipo):
                self.assertTrue(m._eh_credito_reserva(tipo))

    def test_eh_credito_reserva_rejeita_debito(self):
        for tipo in ("DÉBITO", "debito", "saque", "USO", "lixo", "", None):
            with self.subTest(tipo=tipo):
                self.assertFalse(m._eh_credito_reserva(tipo))

    def test_tipo_fb_mapeia_pro_vocabulario_do_site(self):
        self.assertEqual(m._tipo_fb("CRÉDITO"), "deposito")
        self.assertEqual(m._tipo_fb("ENTRADA"), "deposito")
        self.assertEqual(m._tipo_fb("DÉBITO"), "uso")
        self.assertEqual(m._tipo_fb("USO"), "uso")
        self.assertEqual(m._tipo_fb("SAIDA"), "saque")  # cai no default

    def test_sql_in_tipos_soma_corretamente_variantes_legadas(self):
        # Mesma simulação feita manualmente na Rodada 51, agora formal:
        # um lançamento com variante antiga ("ENTRADA" sem acento) tem
        # que somar certo tanto quanto "CRÉDITO".
        conn = sqlite3.connect(":memory:")
        conn.execute("CREATE TABLE t (tipo TEXT, valor REAL)")
        conn.executemany("INSERT INTO t VALUES (?,?)", [
            ("CRÉDITO", 100), ("ENTRADA", 50), ("DÉBITO", 30), ("SAQUE", 10),
        ])
        sql_cred = "SELECT COALESCE(SUM(valor),0) FROM t WHERE UPPER(tipo) IN " + \
            m._sql_in_tipos(m.TIPOS_CREDITO_RESERVA)
        sql_deb = "SELECT COALESCE(SUM(valor),0) FROM t WHERE UPPER(tipo) IN " + \
            m._sql_in_tipos(m.TIPOS_DEBITO_RESERVA)
        self.assertEqual(conn.execute(sql_cred).fetchone()[0], 150.0)
        self.assertEqual(conn.execute(sql_deb).fetchone()[0], 40.0)
        conn.close()


# ════════════════════════════════════════════════════════════
#  Ordenação cronológica de datas "DD/MM/AAAA" guardadas como
#  texto (Rodada 51) — ordenar a string direto não dá ordem
#  cronológica real porque o dia vem primeiro no texto.
# ════════════════════════════════════════════════════════════
class TestOrdenacaoCronologica(unittest.TestCase):
    def test_datas_em_meses_diferentes_ordenam_certo(self):
        conn = sqlite3.connect(":memory:")
        conn.execute("CREATE TABLE premiacoes (id INTEGER PRIMARY KEY, data_sorteio TEXT, valor_premio REAL)")
        conn.executemany("INSERT INTO premiacoes (data_sorteio, valor_premio) VALUES (?,?)", [
            ("20/12/2025", 100), ("05/01/2026", 200),
            ("15/06/2025", 50), ("01/01/2026", 300),
        ])
        data_chave = ("substr(data_sorteio,7,4) || substr(data_sorteio,4,2) "
                      "|| substr(data_sorteio,1,2)")
        rows = conn.execute(
            f"SELECT data_sorteio FROM premiacoes ORDER BY {data_chave} DESC, id DESC"
        ).fetchall()
        datas_na_ordem = [r[0] for r in rows]
        self.assertEqual(datas_na_ordem,
            ["05/01/2026", "01/01/2026", "20/12/2025", "15/06/2025"])
        conn.close()


# ════════════════════════════════════════════════════════════
#  Unificação de participantes duplicados (Rodada 51/54) —
#  agrupa "pessoas" pelo telefone normalizado (só dígitos) e
#  reaponta os participantes pro registro mais antigo do grupo.
# ════════════════════════════════════════════════════════════
class TestUnificarDuplicados(unittest.TestCase):
    def test_merge_agrupa_por_telefone_normalizado_e_preserva_participantes(self):
        conn = sqlite3.connect(":memory:")
        conn.execute("CREATE TABLE pessoas (id INTEGER PRIMARY KEY, nome TEXT, telefone TEXT)")
        conn.execute("CREATE TABLE participantes (id INTEGER PRIMARY KEY, pessoa_id INTEGER, telefone TEXT)")
        conn.execute("INSERT INTO pessoas VALUES (1,'Joao Silva','61999999999')")
        conn.execute("INSERT INTO pessoas VALUES (2,'Joao Silva','(61) 99999-9999')")
        conn.execute("INSERT INTO pessoas VALUES (3,'Maria Souza','61988887777')")
        conn.execute("INSERT INTO participantes VALUES (10,1,'61999999999')")
        conn.execute("INSERT INTO participantes VALUES (11,2,'(61) 99999-9999')")
        conn.execute("INSERT INTO participantes VALUES (12,3,'61988887777')")

        import re as _re
        pessoas = conn.execute("SELECT * FROM pessoas ORDER BY id").fetchall()
        grupos = {}
        for pid, nome, tel in pessoas:
            tel_norm = _re.sub(r"\D", "", tel or "")
            grupos.setdefault(tel_norm, []).append({"id": pid, "nome": nome})
        duplicados = {t: g for t, g in grupos.items() if len(g) > 1}

        self.assertEqual(list(duplicados.keys()), ["61999999999"])
        for tel, grp in duplicados.items():
            grp_ordenado = sorted(grp, key=lambda g: g["id"])
            principal = grp_ordenado[0]
            for dup in grp_ordenado[1:]:
                conn.execute("UPDATE participantes SET pessoa_id=?, telefone=? WHERE pessoa_id=?",
                             (principal["id"], tel, dup["id"]))
                conn.execute("DELETE FROM pessoas WHERE id=?", (dup["id"],))
            conn.execute("UPDATE pessoas SET telefone=? WHERE id=?", (tel, principal["id"]))

        pessoas_restantes = conn.execute("SELECT id FROM pessoas ORDER BY id").fetchall()
        self.assertEqual([r[0] for r in pessoas_restantes], [1, 3])  # id 2 sumiu

        participantes_apos = conn.execute(
            "SELECT id, pessoa_id FROM participantes ORDER BY id").fetchall()
        # Os DOIS participantes (10 e 11) continuam existindo — só passam
        # a apontar pro mesmo pessoa_id (1). Nada de pagamento se perde.
        self.assertEqual(dict(participantes_apos), {10: 1, 11: 1, 12: 3})
        conn.close()


# ════════════════════════════════════════════════════════════
#  Idempotência da importação de reservas pendentes do site
#  (Rodada 51) — se o INSERT local já rodou numa tentativa
#  anterior mas o DELETE da fila falhou, reimportar o mesmo
#  doc_id não pode duplicar o lançamento.
# ════════════════════════════════════════════════════════════
class TestImportacaoIdempotente(unittest.TestCase):
    def test_reimportar_mesmo_doc_id_nao_duplica(self):
        conn = sqlite3.connect(":memory:")
        conn.execute("""CREATE TABLE reservas_movimentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, pessoa_id INTEGER,
            tipo TEXT, valor REAL, origem_doc_id TEXT)""")

        def importar(doc_id, valor):
            ja = conn.execute(
                "SELECT id FROM reservas_movimentos WHERE origem_doc_id=?", (doc_id,)).fetchone()
            if ja:
                return "ja_existia"
            conn.execute(
                "INSERT INTO reservas_movimentos (pessoa_id,tipo,valor,origem_doc_id) "
                "VALUES (1,'CRÉDITO',?,?)", (valor, doc_id))
            return "inseriu"

        self.assertEqual(importar("docABC", 100), "inseriu")
        self.assertEqual(importar("docABC", 100), "ja_existia")  # reimportação (DELETE falhou antes)

        linhas, soma = conn.execute(
            "SELECT COUNT(*), SUM(valor) FROM reservas_movimentos").fetchone()
        self.assertEqual(linhas, 1)
        self.assertEqual(soma, 100.0)
        conn.close()


if __name__ == "__main__":
    unittest.main()
