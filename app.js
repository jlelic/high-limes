const Discord = require('discord.js');

const client = new Discord.Client();

const config = require('./config.json');

let highlightsChannel;
let lastHighlightedTime;
let oldHighLights = [];
const highlightedMessages = new Set();
const HIGHLIGHTS_CHANNEL_NAME = 'highlights';
const IGNORED_CHANNELS = ['announcements', 'suggestions', 'server-partners', 'welcome', 'rules-info', 'bot-spam', 'nsfw', 'mod-log', HIGHLIGHTS_CHANNEL_NAME]

async function asyncForEach(array, callback) {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i, array)
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function shouldHighlightMessage(message) {
  const usersReacted = new Set();
  if (message.author.username === 'vegan-police-bot') {
    return false;
  }
  if (message.channel.name === 'mod') {
    return false;
  }

  await asyncForEach([...message.reactions.values()], async reaction => {
    if (reaction.users.size === 0) {
      reaction.users = await reaction.fetchUsers();
    }
    [...reaction.users.values()].forEach(user => {
      if (user.id !== message.author.id) {
        usersReacted.add(user.id);
      }
    });
  });
  return usersReacted.size >= 4;
}

async function sendToHighlights(message) {
  const imageUrl = message.attachments.size ? [...message.attachments.values()][0].url : undefined;
  await highlightsChannel.send(`https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`);
  await highlightsChannel.send({
    "embed": {
      "description": message.content,
      "color": 164610,
      "timestamp": new Date(message.createdTimestamp).toISOString(),
      "image": {
        "url": imageUrl
      },
      "author": {
        "name": message.author.username,
        "icon_url": message.author.avatarURL
      },
    }
  })
}

client.on("ready", () => {
  console.log(`Bot has started.`);
  const channels = [...client.channels.values()];
  channels.forEach(async ch => {
    if (ch.name === HIGHLIGHTS_CHANNEL_NAME) {
      highlightsChannel = ch;
      const highlightMsgs = await ch.fetchMessages({ limit: 1 });
      lastHighlightedTime = highlightMsgs.size ? [...highlightMsgs.values()][0].createdTimestamp : 0;

      await asyncForEach(channels, async channel => {
        if (channel.type !== 'text') {
          return
        }
        if (channel === highlightsChannel || IGNORED_CHANNELS.includes(channel.name)) {
          return;
        }
        console.log(`Scanning ${channel.name}`);
        let lastMsg = { id: undefined };
        do {
          try {
            const fetched = await channel.fetchMessages({ before: lastMsg.id, limit: 50 });
            const msgs = [...(fetched).values()];
            process.stdout.write('.');
            await sleep(200);
            await asyncForEach(msgs, async msg => {
              if (msg.createdTimestamp < lastHighlightedTime) {
                return;
              }
              if (await shouldHighlightMessage(msg)) {
                oldHighLights.push(msg);
                highlightedMessages.add(msg.id)
                console.log(oldHighLights.length);
              }
            });
            lastMsg = msgs[msgs.length - 1];
          } catch (e) {
            console.log(e);
          }
        } while (lastMsg && lastMsg.createdTimestamp > lastHighlightedTime);
        process.stdout.write('\n');
      });
      console.log(`Scan completed, found ${oldHighLights.length} messages`);
      await asyncForEach(oldHighLights.sort((a, b) => a.createdTimestamp - b.createdTimestamp), async (msg, index) => {
        await sendToHighlights(msg);
        console.log(`${index + 1}/${oldHighLights.length}`);
        await sleep(10000);
      });
    }
  });

  client.user.setActivity('your posts', { type: 'WATCHING' });
});

client.on('messageReactionAdd', async (messageReaction, user) => {
  const { message } = messageReaction;
  if (highlightedMessages.has(message.id)) {
    console.log('already highlighted');
    return;
  }
  if (await shouldHighlightMessage(message)) {
    highlightedMessages.add(message.id);
    sendToHighlights(message);
  }
});

client.login(config.token);