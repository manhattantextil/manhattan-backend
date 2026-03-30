const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ================= VALIDAR =================
const soap = require('soap');

app.post('/validar', async (req, res) => {
  const { tipo, numero, codigoBarras, usuario } = req.body;

  if (!tipo || !numero || !codigoBarras) {
    return res.json({ valido: false, erro: 'Dados incompletos' });
  }

  try {
    const url = 'https://SEU_ERP_AQUI?wsdl';

    const client = await soap.createClientAsync(url);
    client.setSecurity(new soap.BasicAuthSecurity('usuario', 'senha'));
    
    // 🔧 AJUSTE CONFORME SEU ERP
    const args = {
      tipo,
      numero,
      codigo: codigoBarras
    };

    // 🔧 NOME DO MÉTODO DO ERP
    const [result] = await client.ValidarCodigoAsync(args);

    // 🔧 AJUSTAR RESPOSTA CONFORME ERP
    if (result.valido === true) {
      return res.json({ valido: true });
    } else {
      return res.json({
        valido: false,
        erro: result.mensagem || 'Código inválido'
      });
    }

  } catch (err) {
    console.error(err);

    return res.json({
      valido: false,
      erro: 'Erro ao comunicar com ERP (SOAP)'
    });
  }
});

// ================= LOGIN =================
const usuarios = {
  "roberto": "1223",
  "marcos": "4556",
  "jean": "7889",
  "cristiano": "7890"
};

app.post('/login', (req, res) => {
  const { user, pass } = req.body;

  if (!usuarios[user]) {
    return res.json({ ok: false, erro: 'Usuário não encontrado' });
  }

  if (usuarios[user] !== pass) {
    return res.json({ ok: false, erro: 'Senha inválida' });
  }

  return res.json({ ok: true, usuario: user });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
