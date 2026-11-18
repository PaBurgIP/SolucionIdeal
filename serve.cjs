/* Author: Pablo Ib | Last modified by: Pablo Ib */
// Optional local server. Opening index.html directly also works.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Set(['index.html','styles.css','model.js','graph.js','app.js','favicon.svg']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((request,response) => {
  let filename;
  try { filename=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\/+/, '') || 'index.html'; }
  catch { response.writeHead(400); response.end('Solicitud incorrecta'); return; }
  if (!files.has(filename)) { response.writeHead(404); response.end('No encontrado'); return; }
  fs.readFile(path.join(__dirname,filename),(error,content) => {
    if(error){response.writeHead(500);response.end('No se ha podido leer el archivo');return;}
    response.writeHead(200,{'Content-Type':types[path.extname(filename)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});response.end(content);
  });
});
server.listen(4173,'127.0.0.1',()=>console.log('Distancia al ideal: http://127.0.0.1:4173'));
