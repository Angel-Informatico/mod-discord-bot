import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildChannel, GuildMember, Role } from 'discord.js';
import { ErrorEmbed } from '@/extenders/discord/Embed';
import Client from '@/structures/Client';
import { Locale } from '@/typings/locales';
import loadFiles from '@/utils/loadFiles';
import os from 'node-os-utils';
export default class GeneralUtils {
   client: Client;
   loadFiles: typeof loadFiles;
   constructor(client: Client) {
      this.client = client;
      this.loadFiles = loadFiles;
   }

   levenshteinDistance(a: string, b: string): number {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;

      const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

      for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;

      for (let j = 1; j <= b.length; j += 1) {
         for (let i = 1; i <= a.length; i += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
               matrix[j][i - 1] + 1, // deletion
               matrix[j - 1][i] + 1, // insertion
               matrix[j - 1][i - 1] + indicator // substitution
            );
         }
      }
      return matrix[b.length][a.length];
   }

   findClosestMatch(input: string, validInputs: string[]) {
      let closestCommand = '';
      let shortestDistance = Infinity;

      for (const validInput of validInputs) {
         const distance = this.levenshteinDistance(input, validInput);
         if (distance < shortestDistance) {
            closestCommand = validInput;
            shortestDistance = distance;
         }
      }
      return closestCommand;
   }

   getEntrantsLang(gData, language = process.env.LANGUAGE) {
      if (!gData) throw 'NO GIVEAWAY DATA';
      return `${gData.entriesAmount} ${
         gData.entriesAmount == 1
            ? this.client.utils.locale.inlineLocale(language, `COMMON.COMMAND.giveaway.entrants.singular`)
            : this.client.utils.locale.inlineLocale(language, `COMMON.COMMAND.giveaway.entrants.singular`)
      }`;
   }

   canModerate(ctx, member: GuildMember, language = process.env.LANGUAGE): boolean {
      if (!member) throw new Error('No author specified');

      if (member.id === ctx.guild.ownerId)
         return (
            ctx.reply({
               embeds: [
                  new ErrorEmbed().addField(
                     this.client.translate(language, `UTILS.GENERAL.CANMODERATE.notOwner.name`),
                     this.client.translate(language, `UTILS.GENERAL.CANMODERATE.notOwner.value`),
                  ),
               ],
            }),
            false
         );

      if (member.roles.highest.rawPosition >= ctx.guild.members.me.roles.highest.rawPosition)
         return (
            ctx.reply({
               embeds: [
                  new ErrorEmbed().addField(
                     this.client.translate(language, `UTILS.GENERAL.CANMODERATE.botRoleLow.name`),
                     this.client.translate(language, `UTILS.GENERAL.CANMODERATE.botRoleLow.value`),
                  ),
               ],
            }),
            false
         );

      if (member.roles.highest.rawPosition >= ctx.member.roles.highest.rawPosition)
         return (
            ctx.reply({
               embeds: [
                  new ErrorEmbed().addField(
                     this.client.translate(language, `UTILS.GENERAL.CANMODERATE.moderatorRoleLow.name`),
                     this.client.translate(language, `UTILS.GENERAL.CANMODERATE.moderatorRoleLow.value`),
                  ),
               ],
            }),
            false
         );

      return true;
   }

   getMemberStatus(member, language: Locale) {
      return member.presence
         ? `${this.client.allemojis[`${member.presence}`]} \`${this.client.translate(language, `PRESENCES.${member.presence}`)}\``
         : `${this.client.allemojis.offline} \`${this.client.translate(language, `PRESENCES.offline`)}\``;
   }

   toCodePoint(unicodeSurrogates, sep?) {
      let
         // eslint-disable-next-line prefer-const
         r:string[] = [],
         c = 0,
         p = 0,
         i = 0;
      while (i < unicodeSurrogates.length) {
         c = unicodeSurrogates.charCodeAt(i++);
         if (p) {
            // eslint-disable-next-line no-bitwise
            r.push((0x10000 + ((p - 0xd800) << 10) + (c - 0xdc00)).toString(16));
            p = 0;
         } else if (0xd800 <= c && c <= 0xdbff) {
            p = c;
         } else {
            r.push(c.toString(16));
         }
      }
      return r.join(sep || '-');
   }

   toUnixTimestamp(timestamp) {
      return Math.round(timestamp / 1000);
   }

   async receiveBotInfo(useCache = true) {
      try {
         const botinfoCache = this.client.cache.get('botInfo');
         if (botinfoCache && useCache) return botinfoCache;
         const cluster = this.client.cluster.id;
         const shards = Array.isArray(this.client.cluster.ids)
            ? this.client.cluster.ids.map((id) => `#${id}`).join(', ')
            : this.client.cluster.ids.map((shard, id) => `#${id}`).join(', ');
         const guilds = this.client.guilds.cache.size;
         const members = this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
         const memoryUsage = process.memoryUsage();
         const ram = {
            heapTotal: this.formatBytes(memoryUsage.heapTotal),
            heapUsed: this.formatBytes(memoryUsage.heapUsed),
            rss: this.formatBytes(memoryUsage.rss),
            external: this.formatBytes(memoryUsage.external),
            arrayBuffers: this.formatBytes(memoryUsage.arrayBuffers),
         };
         const memory = `${this.formatByteStrings(ram.heapUsed)}/${this.formatByteStrings(ram.rss)}`;
         const ping = Math.abs(this.client.ws.ping);
         const dbPing = (await this.client.db.getPing()) || '0';
         const dbLatency = (await this.client.db.getLatency()) || '0';
         const CPUUsage = await this.receiveCPUUsage();
         const uptime = this.client.uptime || 0;
         const players = this.client.lavalink.players.size || 0;
         const playerNodes = this.client.lavalink.nodeManager.nodes.size || 0;
         const formattedShortUptime = this.duration(uptime, process.env.LANGUAGE, false, true);
         const formattedLongUptime = this.duration(uptime, process.env.LANGUAGE);
         const cache = {
            cluster,
            shards,
            guilds,
            members,
            ram,
            CPUUsage,
            /* Players*/ uptime,
            players,
            playerNodes,
            ping,
            dbPing,
            dbLatency,
            memory,
            formattedShortUptime,
            formattedLongUptime,
            validUntil: Date.now() + 60,
         };
         return this.client.cache.set('botInfo', cache, 60 * 1000);
      } catch (e) {
         console.error(e);
         return { cluster: this.client.cluster.id, e };
      }
   }
   receiveCPUUsage() {
      // @ts-ignore
      return os.cpu.usage(100);
   }

   async getMember(message, id) {
      if (!id) return null;
      return message.token
         ? message.guild?.members.cache.get(id) || (await message.guild?.members.fetch(id).catch(() => null))
         : ((message.guild?.members.cache.get(id) ||
              (await message.guild?.members.fetch(id).catch(() => null)) ||
              message.mentions.members?.filter((m) => m.guild.id === message.guild?.id).first()) as GuildMember);
   }

   async getChannel(message, id) {
      if (!id) return null;
      return message.token
         ? message.guild?.channels.cache.get(id) || (await message.guild?.channels.fetch(id).catch(() => null))
         : ((message.guild?.channels.cache.get(id) ||
              (await message.guild?.channels.fetch(id).catch(() => null)) ||
              message.mentions.channels?.filter((m) => m.guild.id === message.guild?.id).first()) as GuildChannel);
   }

   async getRole(message, id) {
      if (!id) return null;
      return message.token
         ? message.guild?.roles.cache.get(id) || (await message.guild?.roles.fetch(id).catch(() => null))
         : ((message.guild?.roles.cache.get(id) ||
              (await message.guild?.roles.fetch(id).catch(() => null)) ||
              message.mentions.roles?.filter((m) => m.guild.id === message.guild?.id).first()) as Role);
   }

   async getNsfwImage(ctx, type, userData, guildData, customTags?: string[]) {
      const { language } = guildData;
      const booruEndpoints = {
         rule34: [
            {
               cmdName: 'rule34',
               searchTags: customTags || [],
            },
            {
               cmdName: 'futa',
               searchTags: ['nai_diffusion', 'futanari'],
            },
            {
               cmdName: 'trap',
               searchTags: ['nai_diffusion', 'trap'],
            },
         ],
         realbooru: [
            {
               cmdName: 'realbooru',
               searchTags: customTags || [],
            },
            {
               cmdName: 'trans',
               searchTags: ['transgender'],
            },
            {
               cmdName: 'swimsuit',
            },
            {
               cmdName: 'milf',
            },
            {
               cmdName: 'trans',
            },
            {
               cmdName: 'cumshot',
            },
            {
               cmdName: 'milf',
            },
            {
               cmdName: 'cosplay',
            },
            {
               cmdName: 'blowjob',
            },
            {
               cmdName: 'footjob',
            },
            {
               cmdName: 'titfuck',
            },
            {
               cmdName: 'cowgirl',
            },
            {
               cmdName: 'pov',
            },
            {
               cmdName: 'fishnets',
            },
            {
               cmdName: 'latina',
            },
            {
               cmdName: 'socks',
            },
            {
               cmdName: 'panties',
            },
            {
               cmdName: 'thighhighs',
            },
            {
               cmdName: 'asian',
            },
            {
               cmdName: 'stockings',
            },
            {
               cmdName: 'tiktits',
               searchTags: ['tiktok'],
            },
         ],
      };

      const apiEndpoints = [
         {
            apiUrl: 'https://nekobot.xyz/api/image',
            endpoints: [
               'hass',
               'hmidriff',
               'pgif',
               '4k',
               'hentai',
               'holo',
               'hneko',
               'neko',
               'hyuri',
               'hkitsune',
               'kemonomimi',
               'anal',
               'hanal',
               'gonewild',
               'kanna',
               'ass',
               'pussy',
               'thigh',
               'hthigh',
               'gah',
               'coffee',
               'food',
               'paizuri',
               'tentacle',
               'boobs',
               'hboobs',
               'yaoi',
               'cosplay',
               'swimsuit',
               'pantsu',
               'nakadashi',
            ],
            params: { type },
            headers: {
               Authorization: process.env.NEKOBOT_TOKEN || '015445535454455354D6',
            },
         },
         {
            apiUrl: 'https://www.nekos.life/api/v2/img',
            endpoints: ['gasm', 'fox_girl', 'lizard', 'neko', 'kiss', 'wallpaper', 'spank', 'waifu', 'lewd', 'ngif'],
            aliases: {
               hneko: 'neko',
            },
         },
         {
            apiUrl: 'https://hmtai.hatsunia.cfd/v2',
            endpoints: [
               'ass',
               'anal',
               'bdsm',
               'classic',
               'cum',
               'creampie',
               'manga',
               'femdom',
               'hentai',
               'incest',
               'masturbation',
               'public',
               'ero',
               'orgy',
               'elves',
               'yuri',
               'pantsu',
               'pussy',
               'glasses',
               'cuckold',
               'blowjob',
               'boobjob',
               'handjob',
               'footjob',
               'boobs',
               'thighs',
               'ahegao',
               'uniform',
               'gangbang',
               'tentacles',
               'gif',
               'nsfwNeko',
               'nsfwMobileWallpaper',
               'zettaiRyouiki',
            ],
            aliases: {
               hpussy: 'pussy',
               hblowjob: 'blowjob',
               hboobjob: 'boobjob',
               hfootjob: 'footjob',
               hhandjob: 'handjob',
               hcreampie: 'creampie',
            },
         },
      ];

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const foundApi =
         apiEndpoints.find(
            (api) =>
               api.endpoints.includes(type) || // Buscar por tipo (cmdName)
               (api.aliases && api.aliases[type]), // Buscar por apiAliases (en caso de que ya exista un cmd con ese nombre)
         ) || null;

      const foundBooru =
         Object.entries(booruEndpoints)
            .map(([key, values]) => {
               const matchingItem = values.find((item) => item.cmdName === type);
               if (matchingItem) {
                  const searchTags =
                     matchingItem.cmdName === 'rule34' && customTags ? customTags : matchingItem.searchTags || [matchingItem.cmdName];
                  return { type: key, searchTags: searchTags };
               }
               return null;
            })
            .find((item) => item && item.searchTags) || null;

      const updateButton =
         userData.isPremium || guildData.isPremium
            ? new ButtonBuilder()
                 .setStyle(ButtonStyle.Secondary)
                 .setLabel(this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.button.update`))
                 .setEmoji(this.client.allemojis.load)
                 .setCustomId(`update-nsfw-{${type}}-{${ctx.user.id}}`)
            : new ButtonBuilder()
                 .setStyle(ButtonStyle.Secondary)
                 .setLabel(this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.button.premiumOnly`))
                 .setEmoji(this.client.allemojis.load)
                 .setDisabled(true)
                 .setCustomId(`update-nsfw-{${type}}-{${ctx.user.id}}`);

      const loadingContentMessage = {
         embeds: [],
         components: [
            new ActionRowBuilder().addComponents(
               ButtonBuilder.from(updateButton)
                  .setDisabled(true)
                  .setEmoji(this.client.allemojis.loading)
                  .setLabel(this.client.translate(language, `COMMON.TEXTS.loading`)),
            ),
         ],
      };

      // Si ctx tiene customId significa que han hecho clic en el botón actualizar
      const loadingMessage = ctx.customId ? await ctx.update(loadingContentMessage) : await ctx.reply(loadingContentMessage);
      const components = [new ActionRowBuilder().addComponents(updateButton.setDisabled(!(guildData.isPremium || userData.isPremium)))];

      if (!foundApi && !foundBooru)
         return (
            this.client.utils.message.edit(ctx, loadingMessage, {
               embeds: [
                  new ErrorEmbed().addField(
                     this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.error.name`),
                     this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.error.value`),
                  ),
               ],
            }),
            console.error(`No API found for ${type} NSFW Command`)
         );

      const reply = (url) => {
         return this.client.utils.message.edit(ctx, loadingMessage, {
            content: url,
            embeds: [],
            components,
         });
      };

      try {
         if (foundBooru) {
            const url = await this.client.wrappers.booru.search(foundBooru.searchTags, {
               limit: 1,
               cacheId: ctx.user.id,
               type: foundBooru.type,
            });
            if (!url)
               return this.client.utils.message.edit(ctx, loadingMessage, {
                  embeds: [
                     new ErrorEmbed().addField(
                        this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.notFound.name`),
                        this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.notFound.value`),
                     ),
                  ],
                  components,
               });
            const repliedMsg = await reply(url.join('\n'));
            if (customTags && (userData.isPremium || guildData.isPremium))
               return this.client.cache.set(ctx.message ? ctx.message.id : repliedMsg.id, customTags, 2 * 60 * 60 * 1024); // 2hrs
            return;
         }

         const searchParams = foundApi && foundApi.params ? new URLSearchParams(foundApi.params) : null;
         const apiUrl = `${foundApi!.apiUrl}${
            searchParams ? `?${searchParams}` : `/${foundApi!.aliases?.[type] ? foundApi!.aliases[type] : type}`
         }`;

         const response = await fetch(apiUrl, {
            headers: foundApi!.headers,
         });
         if (response.status !== 200)
            return this.client.utils.message.edit(ctx, loadingMessage, {
               embeds: [
                  new ErrorEmbed().addField(
                     this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.notFound.name`),
                     this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.notFound.value`),
                  ),
               ],
               components,
            });

         const data = await response.json();
         const url = data && typeof data === 'object' ? Object.values(data).find((v) => String(v).isValidUrl()) : null;

         return reply(url);
      } catch (e) {
         return this.client.utils.message.edit(ctx, loadingMessage, {
            embeds: [
               new ErrorEmbed().addField(
                  this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.searchError.name`),
                  this.client.translate(language, `UTILS.GENERAL.GETNSFWIMAGE.searchError.value`),
               ),
            ],
            components,
         });
      }
   }

   formatBytes(num) {
      return Math.floor((num / 1024 / 1024) * 100) / 100;
   }
   formatByteStrings(str) {
      if (!str) return str;
      if (typeof str === 'number') str = String(str);
      if (str.endsWith?.('k')) return `${str.replace('k', '')}gb`;
      if (str.endsWith?.('M')) return `${str.replace('M', '')}tb`;
      return `${str}mb`;
   }

   duration(time: number, language: Locale = process.env.LANGUAGE as any, useMilli: boolean = false, useShort = false) {
      let remain = time;

      const units = [
         { name: 'years', value: 1000 * 60 * 60 * 24 * 365 },
         { name: 'months', value: 1000 * 60 * 60 * 24 * 30 },
         { name: 'weeks', value: 1000 * 60 * 60 * 24 * 7 },
         { name: 'days', value: 1000 * 60 * 60 * 24 },
         { name: 'hours', value: 1000 * 60 * 60 },
         { name: 'minutes', value: 1000 * 60 },
         { name: 'seconds', value: 1000 },
      ];

      const parts: string[] = [];

      for (const unit of units) {
         const amount = Math.floor(remain / unit.value);
         remain = remain % unit.value;

         if (amount) {
            const form = amount === 1 ? 'singular' : 'plural';
            const shortStr = useShort ? 'short.' : '';
            const translated = this.client.translate(language, `UTILS.GENERAL.DURATION.time.${unit.name}.${shortStr}${form}`);
            parts.push(`${amount} ${translated}`);
         }
      }

      if (useMilli && remain) {
         parts.push(`${remain} ms`);
      }

      return parts.length === 0 ? ['0s'] : parts;
   }

   delay(time = 10) {
      return new Promise((r) => setTimeout(() => r(2), time));
   }
}
