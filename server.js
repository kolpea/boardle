const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

http.createServer((req, res) => {

  // CORS headers — allow everything from localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);

  // Proxy route: /tmb?path=/v1/imetro/estacions/123&app_id=...&app_key=...
  if (parsed.pathname === '/tmb') {
    const tmbPath = parsed.query.path;
    if (!tmbPath) {
      res.writeHead(400);
      res.end('Missing path param');
      return;
    }

    // Reconstruct query string without 'path'
    const params = Object.assign({}, parsed.query);
    delete params.path;
    const qs = new URLSearchParams(params).toString();
    const tmbUrl = `https://api.tmb.cat${tmbPath}${qs ? '?' + qs : ''}`;

    console.log('→ Proxying:', tmbUrl);

    https.get(tmbUrl, (tmbRes) => {
      let data = '';
      tmbRes.on('data', chunk => data += chunk);
      tmbRes.on('end', () => {
        res.writeHead(tmbRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    }).on('error', (e) => {
      console.error('Proxy error:', e.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // Serve index.html for everything else
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('index.html not found — put it in the same folder as server.js');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`\n✅ Metro board running at http://localhost:${PORT}\n`);
});