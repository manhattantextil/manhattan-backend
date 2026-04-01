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
let criandoClient = false;

async function getClient(force = false) {
  if (soapClient && !force) return soapClient;

  if (criandoClient) {
    // evita múltiplas criações simultâneas
    await new Promise(r => setTimeout(r, 500));
    return getClient();
  }

  try {
    criandoClient = true;

    const url = 'https://web02s1p.seniorcloud.com.br:30781/g5-senior-services/sapiens_Synccom_manhattan?wsdl';

    log("🔄 Criando novo client SOAP...");

    soapClient = await soap.createClientAsync(url);

    // 🔐 se necessário
    soapClient.setSecurity(new soap.BasicAuthSecurity('leitor.expedicao', 'exped0104'));
    soapClient.setEndpoint('https://web02s1p.seniorcloud.com.br:30781/g5-senior-services/sapiens_Synccom_manhattan');

    log("✅ Client SOAP criado com sucesso");

    return soapClient;

  } catch (err) {
    log("❌ Erro ao criar client: " + err.message);
    throw err;

  } finally {
    criandoClient = false;
  }
}

// ================= VALIDAR =================
async function chamarERP(args, tentativas = 2) {
  try {
    const client = await getClient();

    const inicio = Date.now();

    const [result] = await client.ValidarCodigoAsync(args, {
      timeout: 5000
    });

    const tempo = Date.now() - inicio;
    log(`✅ ERP respondeu em ${tempo}ms`);

    return result;

  } catch (err) {

    const erro = err.code || err.message;

    log(`❌ Erro ERP: ${erro}`);

    // 💥 ERROS QUE INDICAM CLIENT QUEBRADO
    const errosCriticos = [
      'ECONNRESET',
      'EPIPE',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];

    if (errosCriticos.includes(err.code)) {
      log("💥 Client inválido — recriando...");
      soapClient = null; // força recriação
    }

    if (tentativas > 0) {
      log(`🔁 Retry (${tentativas})`);
      return chamarERP(args, tentativas - 1);
    }

    throw err;
  }
}

app.post('/validar', async (req, res) => {
  const {codFil, numPed, codBar, usuario } = req.body;

  if (!codFil || !numPed || !codBar) {
    return res.json({ valido: false, erro: 'Dados incompletos' });
  }

  try {
    const args = {
      codEmp: 1,
      codFil: codFil,
      numPed: numPed,
      codBar: codBar
    };

    log(`📥 Validação: ${codigoBarras} | ${tipo} | ${numero}`);

    const result = await chamarERP(args);

    return res.json({
      valido: result.valido === true,
      erro: result.valido ? null : (result.mensagem || 'Código inválido')
    });

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
