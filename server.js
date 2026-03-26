const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/validar', async (req, res) => {
  const { tipo, numero, codigoBarras, usuario } = req.body;

  if (!tipo || !numero || !codigoBarras) {
    return res.json({ valido: false, erro: 'Dados incompletos' });
  }

  try {
    const respostaERP = await axios.post('https://SEU_ERP_AQUI/api/validar', {
      tipo,
      numero,
      codigoBarras,
      usuario
    }, { timeout: 5000 });

    return res.json(respostaERP.data);

  } catch (erro) {
    return res.json({
      valido: false,
      erro: 'Erro ao comunicar com ERP'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

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
