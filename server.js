const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ================= VALIDAR =================
app.post('/validar', (req, res) => {
  const { tipo, numero, codigoBarras, usuario } = req.body;

  if (!tipo || !numero || !codigoBarras) {
    return res.json({ valido: false, erro: 'Dados incompletos' });
  }

  // 🔥 SIMULAÇÃO TEMPORÁRIA
  if (codigoBarras === "123456") {
    return res.json({ valido: true });
  }

  if (codigoBarras === "000000") {
    return res.json({ valido: false, erro: "Produto não pertence ao pedido" });
  }

  return res.json({
    valido: false,
    erro: "Código não reconhecido"
  });
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
