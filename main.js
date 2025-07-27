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
  console.log('📨 Mensagem recebida de:', msg.from);

  // Ignora grupos
  if (msg.from.endsWith('@g.us')) {
    console.log('🚫 Ignorado (grupo):', msg.from);
    return;
  }

  try {
    const dados = JSON.parse(msg.body);

    // Verifica se o JSON contém a estrutura correta
    if (
      typeof dados.nome !== 'string' ||
      typeof dados.gramatura !== 'string' ||
      typeof dados.data !== 'string' ||
      typeof dados.estabelecimento !== 'string' ||
      typeof dados.preco !== 'object' ||
      typeof dados.preco.normal !== 'number' ||
      typeof dados.preco.atacado !== 'number' ||
      typeof dados.preco.afiliado !== 'number'
    ) {
      return client.sendMessage(msg.from, '⚠️ JSON inválido. Verifique a estrutura e os tipos dos campos.');
    }

    console.log('📦 JSON válido recebido:', dados);

    // Envia para o workflow no n8n
    await axios.post('https://automations.comparo.markets/webhook/produto-identificado', dados, {
      headers: {
        Authorization: 'e4a91f58c27d443d9b32f6a21856b7ee', // substitua pelo seu token real
        'Content-Type': 'application/json'
      }
    });

    const precoFormatado = (dados.preco.normal / 100).toFixed(2).replace('.', ',');

    const resposta = `✅ Produto registrado com sucesso:\n📦 *${dados.nome}*\n💲 R$ ${precoFormatado}\n🏪 ${dados.estabelecimento}`;
    await client.sendMessage(msg.from, resposta);

  } catch (error) {
    console.error('❌ Erro ao processar JSON:', error.message);
    await client.sendMessage(
      msg.from,
      '❌ Ocorreu um erro ao processar o JSON. Certifique-se de enviar com este formato:\n\n' +
      '```\n' +
      JSON.stringify({
        nome: "Maionese Hellmann's",
        preco: {
          normal: 1590,
          atacado: 1590,
          afiliado: 1590
        },
        gramatura: "1kg",
        data: "2025-07-27",
        estabelecimento: "Supershow"
      }, null, 2) +
      '\n```'
    );
  }
});

client.initialize();
