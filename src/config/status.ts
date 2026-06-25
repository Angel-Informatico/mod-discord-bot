import {ActivityType} from 'discord.js';
export default [
   {
      text: process.env.STATUS || process.env.WEB_DOMAIN || "Niby",
      type: ActivityType[process.env.STATUS_TYPE as keyof typeof ActivityType] ?? ActivityType.Playing
   },
   {
      text: "Shard #{shard} | Cluster #{cluster}",
      type: ActivityType.Custom
   },
]
