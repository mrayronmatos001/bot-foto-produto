const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const mime = require('mime-types');

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
  console.log('📨 Nova mensagem de:', msg.from);

  if (!msg.hasMedia) {
    console.log('⚠️ Mensagem recebida sem mídia.');
    return client.sendMessage(msg.from, '📷 Envie uma *imagem do produto* para análise.');
  }

  try {
    const media = await msg.downloadMedia();

    console.log('📨 Nova mensagem de:', msg.from);

    if (msg.from.endsWith('@g.us')) {
        console.log('🚫 Mensagem ignorada (grupo):', msg.from);
        return;
    }

    if (!msg.hasMedia) {
        console.log('⚠️ Mensagem recebida sem mídia.');
        return client.sendMessage(msg.from, '📷 Envie uma *imagem do produto* para análise.');
    }

    console.log('📥 Mídia recebida. MIME:', media.mimetype);

    const legenda = msg.body?.trim() || '';

    console.log('📤 Enviando para o webhook...');
    const response = await axios.post(
        'https://automations.comparo.markets/webhook/foto-preco',
        {
            imagem: media.data,
            mime: media.mimetype,
            estabelecimento: legenda || "Não informado"
        },
        {
            headers: {
            Authorization: 'e4a91f58c27d443d9b32f6a21856b7ee',
            'Content-Type': 'application/json'
            }
        }
    );

    console.log('📬 Resposta do webhook:', response.data);

    const dados = response.data;

    if (dados.errors) {
      const mensagens = dados.errors.map(e => `❌ ${e.error}`).join('\n');
      await client.sendMessage(msg.from, `⚠️ Erros encontrados:\n${mensagens}`);
    } else {
      const resposta = `✅ Produto identificado`;
      await client.sendMessage(msg.from, resposta);
    }

  } catch (error) {
    console.error('🔥 Erro ao enviar para o webhook:', error.message);
    await client.sendMessage(msg.from, '❌ Ocorreu um erro ao processar a imagem.');
  }
});

client.initialize();
