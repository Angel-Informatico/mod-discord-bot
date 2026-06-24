import dns from 'dns';
dns.setServers(['1.1.1.1', '1.0.0.1']);
import './structures/Logger';
console.info('Iniciando proceso...', { sendWebhook: true });
import ClusterManager from '@/structures/ClusterManager';
new ClusterManager(`${__dirname}/bot.js`);
