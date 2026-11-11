# -*- coding: utf-8 -*-
import json, os, sys, tempfile, unittest
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bolao_pro_v3 as m

D = json.load(open(os.path.join(os.path.dirname(__file__), "casos_cessao.json"), encoding="utf-8"))


def ces_db(lista):
    return [{"id": c["id"], "de_participante_id": c["de"], "para_participante_id": c["para"],
             "cotas_cedidas": c["cotas"], "parcela_inicial": c["s"], "data_cessao": c["data"],
             "valor": c["valor"]} for c in D[lista]]


class TestDevido(unittest.TestCase):
    def test_casos_compartilhados_com_o_site(self):
        for c in D["casos"]:
            with self.subTest(c["caso"]):
                hoje = datetime.strptime(c["hoje"], "%Y-%m-%d")
                devido = m._devido_ate_agora(D["bolao"], c["pid"], c["ve"], ces_db(c["lista"]), hoje)
                self.assertEqual(devido, c["devido"])
                em, _, _, valor = m._situacao_atraso_valor(c["pago"], c["ve"], devido, D["bolao"]["valor_parcela"])
                self.assertEqual((em, valor), (c["emAtraso"], c["valor"]))


class TestRegistrarCessao(unittest.TestCase):
    """Caso real: Marcelo pagou 6 de 10 parcelas (Mega da Virada 2026)."""
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self._db = m.DB_FILE
        m.DB_FILE = os.path.join(self.dir, "t.db")
        self.db = m.Database()
        self.db.execute("INSERT INTO boloes (nome,num_participantes,valor_total,valor_parcela,data_inicio,encerrado) "
                        "VALUES ('Mega da Virada 2026',47,1070,107,'10/01/2026',0)")
        self.bid = self.db.fetchone("SELECT id FROM boloes")["id"]
        for nome, tel in (("Marcelo Cambraia", "61900000001"), ("Assume", "61900000002")):
            self.db.execute("INSERT INTO participantes (bolao_id,nome,telefone,valor_esperado,ativo) VALUES (?,?,?,1070,1)",
                            (self.bid, nome, tel))
        self.a, self.b = [r["id"] for r in self.db.fetchall("SELECT id FROM participantes ORDER BY id")]
        for _ in range(6):
            self.db.execute("INSERT INTO pagamentos (participante_id,bolao_id,valor,data_pagamento) VALUES (?,?,107,'01/01/2026')",
                            (self.a, self.bid))

    def tearDown(self):
        self.db.close()
        m.DB_FILE = self._db

    def ve(self, pid):
        return self.db.fetchone("SELECT valor_esperado v FROM participantes WHERE id=?", (pid,))["v"]

    def test_cessao_ajusta_cotas_e_valores(self):
        cid, para, valor = m._registrar_cessao(self.db.conn, self.bid, self.a, self.b, 1, 7, "2026-11-11")
        self.assertEqual(valor, 428)
        self.assertEqual((self.ve(self.a), self.ve(self.b)), (642, 1498))
        self.assertEqual((m._cotas_de(642, 1070), m._cotas_de(1498, 1070)), (0.6, 1.4))
        self.assertEqual(m._cotas_ocupadas(self.db, self.bid)[0], 2)
        self.assertIn("0,4 cota", m._texto_cessao(self.db, dict(self.db.fetchone("SELECT * FROM cessoes_cota"))))

    def test_desfazer_volta_tudo(self):
        cid, _, _ = m._registrar_cessao(self.db.conn, self.bid, self.a, self.b, 1, 7, "2026-11-11")
        m._desfazer_cessao(self.db.conn, cid)
        self.assertEqual((self.ve(self.a), self.ve(self.b)), (1070, 1070))
        self.assertEqual(m._cessoes_de(self.db, self.a), [])
        with self.assertRaises(ValueError):
            m._desfazer_cessao(self.db.conn, cid)

    def test_pessoa_nova_entra_so_com_a_fracao(self):
        cid, para, _ = m._registrar_cessao(self.db.conn, self.bid, self.a, None, 1, 7, "2026-11-11",
                                           novo={"nome": "Nova Pessoa", "telefone": "(61) 90000-0003"})
        self.assertEqual(self.ve(para), 428)
        self.assertEqual(m._cotas_de(428, 1070), 0.4)

    def test_pessoa_nova_que_ja_esta_no_bolao_e_recusada(self):
        with self.assertRaises(ValueError):
            m._registrar_cessao(self.db.conn, self.bid, self.a, None, 1, 7, "2026-11-11",
                                novo={"nome": "X", "telefone": "61-90000-0002"})
        self.assertEqual(self.db.fetchone("SELECT COUNT(*) n FROM cessoes_cota")["n"], 0)
        self.assertEqual(self.db.fetchone("SELECT COUNT(*) n FROM participantes")["n"], 2)

    def test_nao_cede_mais_do_que_tem(self):
        with self.assertRaises(ValueError):
            m._registrar_cessao(self.db.conn, self.bid, self.a, self.b, 2, 1, "2026-11-11")
        self.assertEqual((self.ve(self.a), self.ve(self.b)), (1070, 1070))

    def test_status_com_cessao_na_tela(self):
        m._registrar_cessao(self.db.conn, self.bid, self.a, self.b, 1, 7, "2026-11-11")
        bd = dict(self.db.fetchone("SELECT * FROM boloes"))
        hoje_nov = m._parcelas_vencidas(bd, datetime(2026, 11, 20))[1]
        esp, parc = m._esp_parcela_status(self.db, bd, self.a, 642, hoje_nov, 107, 0.6)
        st, _ = m.BolaoApp._status_part(None, 642, 642, esp, parc)
        self.assertIn("QUITADO", st)

    def test_publicacao_leva_cessoes(self):
        m._registrar_cessao(self.db.conn, self.bid, self.a, self.b, 1, 7, "2026-11-11")
        bd = dict(self.db.fetchone("SELECT * FROM boloes"))
        pub = m._cessoes_publicacao(self.db, self.b, bd)
        self.assertEqual(pub, [{"tipo": "entrada", "cotas": 1.0, "parcelaInicial": 7, "mesCessao": 11,
                                "valor": 428.0, "outro": "Marcelo Cambraia", "data": "11/11/2026"}])
        campos = m._participante_firestore({"id": self.b, "nome": "Assume", "quantidadeCotas": 1.4,
                                            "valorEsperado": 1498, "cessoes": pub})["mapValue"]["fields"]
        self.assertEqual(campos["quantidadeCotas"], {"doubleValue": 1.4})
        self.assertEqual(campos["valorEsperado"], {"doubleValue": 1498.0})


class TestFormato(unittest.TestCase):
    def test_fmt_cotas(self):
        self.assertEqual([m.fmt_cotas(x) for x in (1, 2.0, 1.4, 0.6, 0.33)], ["1", "2", "1,4", "0,6", "0,33"])


if __name__ == "__main__":
    unittest.main()
