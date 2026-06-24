import dns from 'dns';
dns.setServers(['1.1.1.1', '1.0.0.1']);
import './structures/Logger';
import Client from '@/structures/Client';
new Client();
