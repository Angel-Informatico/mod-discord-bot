export default function extractRoute(filePath: string) {
   const parts = filePath.split(/[\\/]routes[\\/]/);
   if (parts.length > 1) {
       const routeParts = parts[1].split('.')[0].split(/[\\/]/);
       const filteredParts = routeParts.filter(part => part !== '' && part !== 'index');
       return '/' + filteredParts.join('/');
   }
   return '/';
}
