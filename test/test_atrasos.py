# -*- coding: utf-8 -*-
import json, os, sys, unittest
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bolao_pro_v3 as m

CASOS = json.load(open(os.path.join(os.path.dirname(__file__), "casos_atraso.json"), encoding="utf-8"))


class TestSituacaoAtraso(unittest.TestCase):
    def test_casos_compartilhados_com_o_site(self):
        for c in CASOS:
            with self.subTest(c["caso"]):
                em, pagas, valor = m._situacao_atraso(c["pago"], c["esperado"], c["cotas"], c["devidas"], c["parcela"])
                self.assertEqual((em, pagas, valor), (c["emAtraso"], c["pagas"], c["valor"]))


class TestParcelasVencidas(unittest.TestCase):
    def test_mes_corrente_nao_conta(self):
        b = {"data_inicio": "20/01/2026", "valor_parcela": 75.1, "valor_total": 751}
        self.assertEqual(m._parcelas_vencidas(b, datetime(2026, 11, 10))[1], 10)
        self.assertEqual(m._parcelas_vencidas(b, datetime(2026, 3, 1))[1], 2)

    def test_limitado_ao_total_de_parcelas(self):
        b = {"data_inicio": "2026-09-21", "valor_parcela": 25, "valor_total": 75}
        self.assertEqual(m._parcelas_vencidas(b, datetime(2027, 6, 1))[1], 3)

    def test_data_ilegivel_nao_vence_nada(self):
        b = {"data_inicio": "21/092026", "valor_parcela": 25, "valor_total": 75}
        self.assertEqual(m._parcelas_vencidas(b, datetime(2026, 11, 10))[1], 0)
        self.assertEqual(m._data_inicio_iso("21/092026"), "")
        self.assertEqual(m._data_inicio_iso("21/09/2026"), "2026-09-21")


if __name__ == "__main__":
    unittest.main()
