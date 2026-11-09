# -*- coding: utf-8 -*-
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bolao_pro_v3 as m


def pessoa(doc_id, saldo, ativo=True, nome=None):
    return {"doc_id": doc_id, "nome": nome or doc_id, "saldo": saldo, "ativo": ativo}


class TestCompararSaldos(unittest.TestCase):
    def test_tudo_igual_nao_diverge(self):
        divs, local, site = m._rsv_comparar_saldos(
            [pessoa("a", 53.0), pessoa("b", 153.0)], {"a": 53.0, "b": 153.0})
        self.assertEqual(divs, [])
        self.assertEqual((local, site), (206.0, 206.0))

    def test_um_centavo_ja_e_divergencia(self):
        divs, _, _ = m._rsv_comparar_saldos([pessoa("a", 10.0)], {"a": 10.01})
        self.assertEqual(len(divs), 1)

    def test_arredondamento_de_ponto_flutuante_nao_gera_alarme_falso(self):
        divs, _, _ = m._rsv_comparar_saldos([pessoa("a", 0.3)], {"a": 0.1 + 0.2})
        self.assertEqual(divs, [])

    def test_caso_real_duplicado_no_lote(self):
        divs, local, site = m._rsv_comparar_saldos(
            [pessoa("cosme", 53.0, nome="Cosme")], {"cosme": 43.0})
        self.assertEqual(divs, [{"nome": "Cosme", "local": 43.0, "site": 53.0}])
        self.assertEqual((local, site), (43.0, 53.0))

    def test_pessoa_inativa_nao_entra(self):
        divs, local, site = m._rsv_comparar_saldos([pessoa("a", 15.0, ativo=False)], {})
        self.assertEqual(divs, [])
        self.assertEqual((local, site), (0, 0))

    def test_pessoa_sem_historico_local_diverge(self):
        divs, _, _ = m._rsv_comparar_saldos([pessoa("a", 20.0)], {})
        self.assertEqual(len(divs), 1)

    def test_texto_resume_quando_passa_do_limite(self):
        divs = [{"nome": f"P{i}", "local": 1.0, "site": 2.0} for i in range(10)]
        texto = m._rsv_texto_divergencias(divs, limite=8)
        self.assertIn("P7:", texto)
        self.assertNotIn("P8:", texto)
        self.assertTrue(texto.endswith("e mais 2"))


if __name__ == "__main__":
    unittest.main()
