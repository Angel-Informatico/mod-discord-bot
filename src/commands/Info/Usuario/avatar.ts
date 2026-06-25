import { Command } from '@/structures/Command';
import { Embed } from '@/extenders/discord/Embed';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember } from 'discord.js';
import Client from '@/structures/Client';

export default {
   ALIASES: ['useravatar', 'uavatar', 'memberavatar', 'mavatar'],
   OPTIONS: [
      {
         USER: {
            REQUIRED: false,
         },
      },
   ],
   USAGE: "<Usuario?>",
   async execute(client:Client, message, args, prefix, guildData) {
      const userTarget = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author) || message.author;
      const member = message.guild ? (await client.utils.general.getMember(message, args[0])) || message.member : null;
      const user = member?.user || userTarget;
      const displayName = member?.displayName || user.displayName || user.username;

      const buttons: ButtonBuilder[] = [];

      const isAnimatedAvatar = user.displayAvatarURL().endsWith('.gif');

      if (isAnimatedAvatar) {
         buttons.push(
            new ButtonBuilder()
               .setLabel('GIF')
               .setStyle(ButtonStyle.Link)
               .setURL(user.displayAvatarURL({ size: 4096 })),

            new ButtonBuilder()
               .setLabel('PNG')
               .setStyle(ButtonStyle.Link)
               .setURL(user.displayAvatarURL({ size: 4096, extension: 'png' })),
         );
      } else {
         buttons.push(
            new ButtonBuilder()
               .setLabel('PNG')
               .setStyle(ButtonStyle.Link)
               .setURL(user.displayAvatarURL({size: 4096 })),
         );
      }

      message.reply({
         embeds: [
            new Embed()
               .setAuthor({
                  name: client.translate(guildData.language, `${this.LANG_KEY}.embed.author.avatar`, {name: displayName}),
                  iconURL: user.displayAvatarURL({ dynamic: true }),
               })
               .setImage(user.displayAvatarURL({ dynamic: true, size: 512 })),
         ],
         components: [new ActionRowBuilder().addComponents(...buttons)],
      });
   },
} as Command;
