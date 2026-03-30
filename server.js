const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'logs.txt');

function log(mensagem) {
  const linha = `[${new Date().toISOString()}] ${mensagem}\n`;

  console.log(linha); // continua mostrando no console
  fs.appendFile(logFile, linha, err => {
    if (err) console.error("Erro ao gravar log:", err);
  });
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());


// ================= CACHE CLIENT =================

let soapClient = null;

async function getClient() {
  if (soapClient) return soapClient;

  const url = 'https://SEU_ERP_AQUI?wsdl';

  log("🔌 Criando cliente SOAP...");

  soapClient = await soap.createClientAsync(url);

  // 🔐 se precisar autenticação
  soapClient.setSecurity(new soap.BasicAuthSecurity('user', 'pass'));

  return soapClient;
}

// ================= VALIDAR =================
async function chamarERP(client, args, tentativas = 2) {
  try {
    const inicio = Date.now();

    const [result] = await client.ValidarCodigoAsync(args, {
      timeout: 5000
    });

    const tempo = Date.now() - inicio;
    log(`✅ ERP respondeu em ${tempo}ms`);

    return result;

  } catch (err) {
    log(`❌ Erro ERP: ${err.code || err.message}`);

    if (tentativas > 0) {
      log(`🔁 Retry (${tentativas})`);
      return chamarERP(client, args, tentativas - 1);
    }

    throw err;
  }
}

app.post('/validar', async (req, res) => {
  const { tipo, numero, codigoBarras, usuario } = req.body;

  if (!tipo || !numero || !codigoBarras) {
    return res.json({ valido: false, erro: 'Dados incompletos' });
  }

  try {
    const client = await getClient();

    const args = {
      tipo: tipo,
      numero: numero,
      codigo: codigoBarras
    };

    log(`📥 Validação: ${codigoBarras} | ${tipo} | ${numero}`);

    const result = await chamarERP(client, args);

    if (result.valido === true) {
      return res.json({ valido: true });
    } else {
      return res.json({
        valido: false,
        erro: result.mensagem || 'Código inválido'
      });
    }

  } catch (err) {

    let erroMsg = "Erro ao comunicar com ERP";

    if (err.code === 'ETIMEDOUT') {
      erroMsg = "⏱ ERP demorou para responder";
    } 
    else if (err.code === 'ECONNREFUSED') {
      erroMsg = "🚫 ERP fora do ar";
    } 
    else if (err.code === 'ENOTFOUND') {
      erroMsg = "🌐 ERP não encontrado";
    }

    log(`🔥 ERRO FINAL: ${erroMsg}`);

    return res.json({
      valido: false,
      erro: erroMsg
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
