# -*- coding: utf-8 -*-
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bolao_pro_v3 as m


def doc_rest(doc_id, **campos):
    fields = {}
    for k, v in campos.items():
        if isinstance(v, bool):
            fields[k] = {"booleanValue": v}
        elif isinstance(v, int):
            fields[k] = {"integerValue": str(v)}
        elif isinstance(v, float):
            fields[k] = {"doubleValue": v}
        else:
            fields[k] = {"stringValue": v}
    return {"name": f"projects/x/databases/(default)/documents/lancamentos_pendentes/{doc_id}",
            "updateTime": "2026-11-10T12:00:00.000000Z", "fields": fields}


def inscricao(doc_id="ins1", **extra):
    base = dict(tipo="inscricao", status="pendente", bolaoDocId="bolao_mega", bolaoTitulo="Mega",
                nome="Fulano de Tal", telefone="(61) 99999-0001", cotas=1, valorPago=25,
                dataPagamento="10/11/2026", formaPagamento="pix", criadoEm="2026-11-10T12:00:00Z")
    base.update(extra)
    return m._fila_ler_doc(doc_rest(doc_id, **base))


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self._db_file = m.DB_FILE
        m.DB_FILE = os.path.join(self.dir, "t.db")
        self.db = m.Database()
        self.db.execute("INSERT INTO boloes (nome, num_participantes, valor_total, valor_parcela, "
                        "firebase_doc_id, encerrado) VALUES ('Mega', 3, 100, 25, 'bolao_mega', 0)")
        self.bid = self.db.fetchone("SELECT id FROM boloes")["id"]

    def tearDown(self):
        self.db.close()
        m.DB_FILE = self._db_file

    def importar(self, item):
        sit, motivo, ctx = m._fila_validar(self.db, item)
        self.assertEqual(sit, "ok", motivo)
        return m._fila_aplicar(self.db.conn, item, ctx)


class TestLeitura(unittest.TestCase):
    def test_numeros_inteiros_e_decimais(self):
        self.assertEqual(inscricao(valorPago=25)["valorPago"], 25.0)
        self.assertEqual(inscricao(valorPago=12.5)["valorPago"], 12.5)
        self.assertEqual(inscricao(cotas=2.0)["cotas"], 2)

    def test_telefone_so_digitos(self):
        self.assertEqual(inscricao()["telefone"], "61999990001")


class TestInscricao(Base):
    def test_inscricao_com_pagamento(self):
        pid = self.importar(inscricao())
        p = self.db.fetchone("SELECT * FROM participantes WHERE id=?", (pid,))
        self.assertEqual(p["valor_esperado"], 100)
        self.assertEqual(p["telefone"], "61999990001")
        pg = self.db.fetchall("SELECT * FROM pagamentos WHERE participante_id=?", (pid,))
        self.assertEqual([(r["valor"], r["mes_referencia"], r["data_pagamento"]) for r in pg],
                         [(25, "11/2026", "10/11/2026")])

    def test_sem_pagamento_nao_cria_pagamento(self):
        pid = self.importar(inscricao(valorPago=0))
        self.assertIsNone(self.db.fetchone("SELECT id FROM pagamentos WHERE participante_id=?", (pid,)))

    def test_repetir_nao_duplica(self):
        item = inscricao()
        self.importar(item)
        self.assertEqual(m._fila_validar(self.db, item)[0], "ja_importado")
        with self.assertRaises(Exception):
            m._fila_aplicar(self.db.conn, item, {"bid": self.bid, "vt": 100, "nome": "X", "pessoa_id": None})
        self.assertEqual(self.db.fetchone("SELECT COUNT(*) c FROM participantes")["c"], 1)
        self.assertEqual(self.db.fetchone("SELECT COUNT(*) c FROM pagamentos")["c"], 1)

    def test_ja_inscrito_e_conflito(self):
        self.importar(inscricao("a"))
        sit, motivo, _ = m._fila_validar(self.db, inscricao("b", nome="Outro nome"))
        self.assertEqual(sit, "conflito")
        self.assertIn("já está inscrito", motivo)

    def test_cotas_esgotadas_e_conflito(self):
        self.importar(inscricao("a", cotas=2))
        sit, motivo, _ = m._fila_validar(self.db, inscricao("b", telefone="61999990002", cotas=2))
        self.assertEqual(sit, "conflito")
        self.assertIn("1 cota(s) livre(s)", motivo)

    def test_segunda_inscricao_ve_cotas_da_primeira(self):
        self.importar(inscricao("a", cotas=2))
        self.importar(inscricao("b", telefone="61999990002", cotas=1))
        self.assertEqual(m._cotas_ocupadas(self.db, self.bid), (3, 3))

    def test_pessoa_existente_usa_cadastro(self):
        self.db.execute("INSERT INTO pessoas (nome, telefone, chave_pix) VALUES ('Fulano Certo', '61999990001', 'pix1')")
        pid = self.importar(inscricao(nome="fulano digitado"))
        p = self.db.fetchone("SELECT * FROM participantes WHERE id=?", (pid,))
        self.assertEqual((p["nome"], p["chave_pix"]), ("Fulano Certo", "pix1"))
        self.assertEqual(self.db.fetchone("SELECT COUNT(*) c FROM pessoas")["c"], 1)

    def test_telefone_formatado_no_banco_ainda_e_a_mesma_pessoa(self):
        self.db.execute("INSERT INTO pessoas (nome, telefone) VALUES ('André Freitas', '61-99999-0001')")
        pid = self.importar(inscricao(nome="andre"))
        self.assertEqual(self.db.fetchone("SELECT COUNT(*) c FROM pessoas")["c"], 1)
        self.assertEqual(self.db.fetchone("SELECT nome FROM participantes WHERE id=?", (pid,))["nome"], "André Freitas")

    def test_ja_inscrito_com_telefone_formatado_e_conflito(self):
        self.db.execute("INSERT INTO participantes (bolao_id, nome, telefone, valor_esperado, ativo) "
                        "VALUES (?, 'André', '(61) 99999-0001', 100, 1)", (self.bid,))
        sit, motivo, _ = m._fila_validar(self.db, inscricao())
        self.assertEqual(sit, "conflito")
        self.assertIn("já está inscrito", motivo)

    def test_bolao_desconhecido_ou_encerrado(self):
        self.assertEqual(m._fila_validar(self.db, inscricao(bolaoDocId="outro"))[0], "conflito")
        self.db.execute("UPDATE boloes SET encerrado=1")
        self.assertEqual(m._fila_validar(self.db, inscricao())[0], "conflito")

    def test_telefone_invalido(self):
        self.assertEqual(m._fila_validar(self.db, inscricao(telefone="12345"))[0], "conflito")


class TestPagamento(Base):
    def test_parcela_por_id_local(self):
        pid = self.importar(inscricao())
        item = inscricao("p1", tipo="pagamento", participanteIdLocal=pid, valorPago=25,
                         formaPagamento="reserva", dataPagamento="05/12/2026")
        self.importar(item)
        total = self.db.fetchone("SELECT SUM(valor) t FROM pagamentos WHERE participante_id=?", (pid,))["t"]
        self.assertEqual(total, 50)
        obs = self.db.fetchone("SELECT observacoes FROM pagamentos WHERE origem_doc_id='p1'")["observacoes"]
        self.assertIn("reserva", obs)

    def test_parcela_por_telefone(self):
        self.importar(inscricao())
        self.importar(inscricao("p1", tipo="pagamento", valorPago=25))
        self.assertEqual(self.db.fetchone("SELECT COUNT(*) c FROM pagamentos")["c"], 2)

    def test_parcela_por_telefone_formatado(self):
        self.db.execute("INSERT INTO participantes (bolao_id, nome, telefone, valor_esperado, ativo) "
                        "VALUES (?, 'André', '61-99999-0001', 100, 1)", (self.bid,))
        self.importar(inscricao("p1", tipo="pagamento", valorPago=25))
        self.assertEqual(self.db.fetchone("SELECT COUNT(*) c FROM pagamentos")["c"], 1)

    def test_parcela_sem_participante_e_conflito(self):
        sit, _, _ = m._fila_validar(self.db, inscricao("p1", tipo="pagamento", valorPago=25))
        self.assertEqual(sit, "conflito")

    def test_parcela_sem_valor_e_conflito(self):
        self.importar(inscricao())
        self.assertEqual(m._fila_validar(self.db, inscricao("p1", tipo="pagamento", valorPago=0))[0], "conflito")


class TestExtras(Base):
    def test_campos_extras(self):
        self.importar(inscricao(cotas=2))
        self.assertEqual(m._bolao_campos_extras(self.db, self.bid),
                         {"cotasTotais": 3, "cotasOcupadas": 2, "valorParcela": 25.0,
                          "dataInicio": "", "parcelasTotal": 4})

    def test_id_local_no_participante(self):
        campos = m._participante_firestore({"id": 7, "nome": "A", "telefone": "61 9"})["mapValue"]["fields"]
        self.assertEqual(campos["idLocal"], {"integerValue": "7"})
        self.assertEqual(campos["telefone"], {"stringValue": "619"})
        self.assertNotIn("idLocal", m._participante_firestore({"id": None, "nome": "ADM"})["mapValue"]["fields"])


if __name__ == "__main__":
    unittest.main()
