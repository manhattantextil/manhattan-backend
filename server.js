const fs = require('fs');
const path = require('path');
const soap = require('soap');

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static('frontend'));

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src *;"
  );
  next();
});

// ================= LOG =================

const logFile = path.join(__dirname, 'logs.txt');

function log(mensagem) {
  const linha = `[${new Date().toISOString()}] ${mensagem}\n`;

  console.log(linha);

  fs.appendFile(logFile, linha, err => {
    if (err) console.error("Erro ao gravar log:", err);
  });
}

// ================= SOAP CONFIG =================

const SOAP_URL =
  'https://web02s1p.seniorcloud.com.br:30781/g5-senior-services/sapiens_Synccom_manhattan?wsdl';

const SOAP_ENDPOINT =
  'https://web02s1p.seniorcloud.com.br:30781/g5-senior-services/sapiens_Synccom_manhattan';

const SOAP_USER = "leitor.expedicao";
const SOAP_PASS = "exped0104";

// ================= CACHE CLIENT =================

let soapClient = null;
let criandoClient = false;

async function getClient(force = false) {

  if (soapClient && !force) {
    return soapClient;
  }

  if (criandoClient) {
    await new Promise(r => setTimeout(r, 300));
    return getClient();
  }

  try {

    criandoClient = true;

    log("🔄 Criando client SOAP...");

    soapClient = await soap.createClientAsync(SOAP_URL, {
      timeout: 5000
    });

    soapClient.setSecurity(
      new soap.BasicAuthSecurity(SOAP_USER, SOAP_PASS)
    );

    soapClient.setEndpoint(SOAP_ENDPOINT);

    log("✅ Client SOAP criado");

    return soapClient;

  } catch (err) {

    log("❌ Erro ao criar client: " + err.message);
    soapClient = null;

    throw err;

  } finally {

    criandoClient = false;
  }
}

// ================= CHAMAR ERP =================

async function chamarERP(args, tentativas = 2) {

  try {

    const client = await getClient();

    const inicio = Date.now();

    const [result] = await client.expedicaoLeiturasAsync(args);

    const tempo = Date.now() - inicio;

    log(`✅ ERP respondeu em ${tempo}ms`);

    return result;

  } catch (err) {

    const erro = err.code || err.message;

    log(`❌ Erro SOAP: ${erro}`);

    const errosCriticos = [
      'ECONNRESET',
      'EPIPE',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ];

    if (errosCriticos.includes(err.code)) {
      log("💥 Client inválido — recriando...");
      soapClient = null;
    }

    if (tentativas > 0) {
      log(`🔁 Retry (${tentativas})`);
      await new Promise(r => setTimeout(r, 500));
      return chamarERP(args, tentativas - 1);
    }

    throw err;
  }
}

// ================= VALIDAR =================

app.post('/validar', async (req, res) => {

  const { codFil, numPed, codBar, usuario, tipo } = req.body;

  log(`📥 Validar: ${codFil} | ${numPed} | ${codBar}`);

  if (!codFil || !numPed || !codBar) {
    return res.json({
      valido: false,
      erro: 'Dados incompletos'
    });
  }

  try {

    const args = {
      user: SOAP_USER,
      password: SOAP_PASS,
      encryption: 0,

      parameters: {
        codEmp: 1,
        codFil,
        numPed,
        codBar,
        tipo // ← opcional se ERP usar
      }
    };

    const result = await chamarERP(args);

    log("📦 Retorno ERP: " + JSON.stringify(result));

    const dados = result?.result?.dadosRetorno || {};

    const mensagem = dados.mensagem || "Código inválido";

    const valido = (!mensagem.toLowerCase().includes("não") &&
                  !mensagem.toLowerCase().includes("erro") &&
                !mensagem.toLowerCase().includes("vinculada"));

    return res.json({
      valido,
      mensagem,
      erro: valido ? null : mensagem
    });

  } catch (err) {

    let erroMsg = "Erro ao comunicar com ERP";

    if (err.code === 'ETIMEDOUT') {
      erroMsg = "⏱ ERP demorou para responder";
    }

    if (err.code === 'ECONNREFUSED') {
      erroMsg = "🚫 ERP fora do ar";
    }

    if (err.code === 'ENOTFOUND') {
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

// const usuarios = {
//   "roberto": "1223",
//   "jean": "4556",
//   "william": "7889",
//   "cristiano": "7890"
// };

// app.post('/login', (req, res) => {

//   const { user, pass } = req.body;

//   if (!usuarios[user]) {
//     return res.json({
//       ok: false,
//       erro: 'Usuário não encontrado'
//     });
//   }

//   if (usuarios[user] !== pass) {
//     return res.json({
//       ok: false,
//       erro: 'Senha inválida'
//     });
//   }

//   return res.json({
//     ok: true,
//     usuario: user
//   });

// });

// ================= HEALTH CHECK =================

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
// });

// ================= SERVER =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  log(`🚀 Servidor rodando na porta ${PORT}`);
});