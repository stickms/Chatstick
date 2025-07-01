import { Client, Events, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(process.env.BOT_TOKEN);

let lastmessage = '';

client.on('messageCreate', async (message) => {
  // Ignore bots or self
  if (message.author.bot || message.author.id === client.user.id) {
    return;
  }

  // We only care about self-mentions
  if (!message.mentions.members.has(client.user.id)) {
    return;
  }

  if (message.content.endsWith(' continue') &&
      message.content.split(' ').length === 2) {
    if (lastmessage.length === 0) {
      await message.reply('Error: Response was empty');
    } else {
      await message.reply(lastmessage.slice(0, 2000));
      lastmessage = lastmessage.slice(2000);
    }

    return;
  }

  // Initial message (to show that it's alive)
  const reply = await message.reply({ content: '...' });

  fetch('https://api.mistral.ai/v1/agents/completions', {
    method: 'POST',
    headers: new Headers({
      'Authorization': `Bearer ${process.env.API_TOKEN}`,
      'Content-Type': 'application/json'
    }), 
    body: JSON.stringify({
      agent_id: process.env.AGENT_ID,
      messages: [
        {
          content: message.content,
          role: 'user'
        }
      ]
    })
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error('Invalid response code');
      }

      return res.json(); 
    })
    .then(async (json) => {
      if (!json.choices?.[0]?.message?.content) {
        throw new Error('Response was empty');
      }

      lastmessage = json.choices[0].message.content;
      await reply.edit(lastmessage.slice(0, 2000));
      lastmessage = lastmessage.slice(2000);
    })
    .catch(async (error) => {
      await reply.edit(`An error occurred... \`${error}\``);
    })
    .catch(console.error);
});
