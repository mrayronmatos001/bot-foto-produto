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
  if (!msg.hasMedia) {
    return client.sendMessage(msg.from, '📷 Envie uma *imagem do produto* para análise.');
  }

  try {
    const media = await msg.downloadMedia();

    if (!media) {
      return client.sendMessage(msg.from, '❌ Não foi possível baixar a imagem.');
    }

    const legenda = msg.body?.trim() || '';

    // Enviar para o webhook do n8n
    const response = await axios.post('https://seu-webhook.com/webhook/produto-foto', {
      imagem: media.data,
      mime: media.mimetype,
      estabelecimento: legenda || "Não informado"
    });

    const dados = response.data;

    if (dados.errors) {
      const mensagens = dados.errors.map(e => `❌ ${e.error}`).join('\n');
      await client.sendMessage(msg.from, `⚠️ Erros encontrados:\n${mensagens}`);
    } else {
      const resposta = `✅ Produto identificado`;
      await client.sendMessage(msg.from, resposta);
    }

  } catch (error) {
    console.error('Erro ao enviar para o webhook:', error.message);
    await client.sendMessage(msg.from, '❌ Ocorreu um erro ao processar a imagem.');
  }
});

client.initialize();
