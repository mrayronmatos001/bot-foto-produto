const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  console.log('🔐 Escaneie o QR Code abaixo para logar no WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot conectado ao WhatsApp!');
});

client.on('message', async msg => {
  try {
    if (!msg || !msg.from) {
      console.log('⚠️ Mensagem inválida recebida:', msg);
      return;
    }

    console.log('📨 Mensagem recebida de:', msg.from);

    if (msg.from.endsWith('@g.us')) {
      console.log('🚫 Ignorado (grupo):', msg.from);
      return;
    }
  } catch (err) {
  console.error('Erro:', err);
  }

  try {
    // 🔍 Mostra o texto original da mensagem
    console.log('📝 Texto original recebido:\n', msg.body);

    // 🧼 Corrige aspas tipográficas
    const jsonStr = msg.body
      .replace(/[“”]/g, '"') // aspas duplas curvas → normais
      .replace(/[‘’]/g, "'"); // apóstrofos → normais

    // 🔍 Mostra o texto após sanitização
    console.log('🧪 Texto após sanitização:\n', jsonStr);

    // 🔁 Tenta fazer o parse do JSON
    const dados = JSON.parse(jsonStr);

    // ✅ Log do objeto convertido
    console.log('✅ JSON parseado com sucesso:', dados);

    // Validação da estrutura esperada
    if (
      typeof dados.produto !== 'string' ||
      typeof dados.marca !== 'string' ||
      typeof dados.tipo !== 'string' ||
      typeof dados.sabor !== 'string' ||
      typeof dados.gramatura !== 'string' ||
      typeof dados.data !== 'string' ||
      typeof dados.estabelecimento !== 'string' ||
      typeof dados.preco !== 'object' ||
      typeof dados.preco.normal !== 'number' ||
      typeof dados.preco.atacado !== 'number' ||
      typeof dados.preco.afiliado !== 'number'
    ) {
      return client.sendMessage(msg.from, '⚠️ JSON inválido. Verifique os campos obrigatórios e seus tipos.');
    }

    // Envia para o webhook do n8n
    await axios.post('https://automations.comparo.markets/webhook/produto-identificado', dados, {
      headers: {
        Authorization: 'e4a91f58c27d443d9b32f6a21856b7ee',
        'Content-Type': 'application/json'
      }
    });

    const precoFormatado = (dados.preco.normal / 100).toFixed(2).replace('.', ',');

    await client.sendMessage(msg.from,
      `✅ Produto registrado com sucesso:\n` +
      `📦 *${dados.tipo}*\n` +
      `💲 R$ ${precoFormatado}\n` +
      `🏪 ${dados.estabelecimento}`
    );

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error); // <-- log completo do erro

    await client.sendMessage(
      msg.from,
      '❌ Ocorreu um erro ao processar o JSON. Certifique-se de enviar neste formato (copie e cole como texto simples):\n\n' +
      '```\n' +
      JSON.stringify({
        produto: "Biscoito",
        marca: "Bono",
        tipo: "Recheado",
        sabor: "Doce de Leite",
        preco: {
          normal: 199,
          atacado: 199,
          afiliado: 199
        },
        gramatura: "140g",
        data: "2025-07-30",
        estabelecimento: "Supershow"
      }, null, 2) +
      '\n```'
    );
  }
});

client.initialize();