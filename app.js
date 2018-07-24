const Discord = require('discord.js');

const client = new Discord.Client();

const config = require('./config.json');

let highlightsChannel;
const highlightedMessages = new Set();
const HIGHLIGHTS_CHANNEL_NAME = 'highlights';

client.on("ready", () => {
  console.log(`Bot has started.`);

  [...client.channels.values()].forEach(async channel => {
    if (channel.name === HIGHLIGHTS_CHANNEL_NAME) {
      highlightsChannel = channel;
    }
  });

  [...client.guilds.values()].forEach(guild => {
    // [...guild.emojis.values()].forEach(emoji => {
    //   if (emoji.name === GUILTY_EMOJI_NAME) {
    //     guiltyEmoji = emoji;
    //   }
    //   if (emoji.name === NOT_GUILTY_EMOJI_NAME) {
    //     notGuiltyEmoji = emoji;
    //   }
    // });
    // [...guild.roles.values()].forEach(role => {
    //   if (role.name.toLowerCase() === 'in vegan jail') {
    //     jailedRole = role;
    //   }
    // });
  });
  client.user.setActivity(``);
});

function shouldHighlightMessage(message) {
  const usersReacted = new Set();
  [...message.reactions.values()].forEach(reaction => {
    [...reaction.users.values()].forEach(user => {
      if (user.id !== message.author.id) {
        usersReacted.add(user.id);
      }
    });
  });
  return usersReacted.size >= 4;
}

client.on('messageReactionAdd', async (messageReaction, user) => {
  const { message } = messageReaction;
  if (highlightedMessages.has(message.id)) {
    console.log('already highlighted');
    return;
  }
  if (!shouldHighlightMessage(message)) {
    return;
  }
  highlightedMessages.add(message.id);
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
        // "url": "https://discordapp.com",
        "icon_url": message.author.avatarURL
      },
    }
  })
});

client.login(config.token);