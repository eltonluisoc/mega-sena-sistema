"""v8.5: quem já depositou mais que o limite recebe a marca do alerta."""
import sqlite3, unittest
import bolao_pro_v3 as app


def _banco():
    c = sqlite3.connect(":memory:")
    c.executescript("""
        CREATE TABLE reservas_pessoas (id INTEGER PRIMARY KEY, nome TEXT, ativo INTEGER,
            firebase_doc_id TEXT, alerta_qualifica_ok INTEGER DEFAULT 0);
        CREATE TABLE reservas_movimentos (id INTEGER PRIMARY KEY, pessoa_id INTEGER,
            tipo TEXT, valor REAL);
        INSERT INTO reservas_pessoas VALUES (1,'Erika',1,'erika',0),(2,'Pequeno',1,'peq',0),
            (3,'Inativo',0,'ina',0),(4,'JaMarcado',1,'ja',1),(5,'SemDoc',1,NULL,0);
        INSERT INTO reservas_movimentos (pessoa_id,tipo,valor) VALUES
            (1,'CRÉDITO',200),(1,'DÉBITO',200),(2,'CRÉDITO',20),(2,'DÉBITO',300),
            (3,'CRÉDITO',100),(4,'CRÉDITO',100),(5,'CRÉDITO',100);
    """)
    return c


class TestAlertaQualifica(unittest.TestCase):
    def test_so_quem_depositou_mais_que_o_limite(self):
        self.assertEqual(app._rsv_qualificam_alerta(_banco(), 20.0), [(1, 'erika')])

    def test_limite_maior_exclui(self):
        self.assertEqual(app._rsv_qualificam_alerta(_banco(), 250.0), [])


if __name__ == "__main__":
    unittest.main()
