import dns from 'dns';
try {
   dns.setServers(['1.1.1.1', '1.0.0.1']);
} catch (e) {
   console.error('Error setting DNS servers:', e);
}
