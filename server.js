const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript'};
http.createServer((req,res)=>{
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.join(root, requested);
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'text/plain'});
  fs.createReadStream(file).pipe(res);
}).listen(3000, '127.0.0.1', ()=>console.log('Ballot.ng running at http://localhost:3000'));
