const http       = require('http');
const WebSocket  = require('ws');

const PORT   = 3000;
http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Match-maker running\n');
}).listen(PORT, () => console.log(`HTTP OK  : http://localhost:${PORT}`));

const wss    = new WebSocket.Server({ port: 3001 });
const queue  = [];

function heartbeat() {
  this.isAlive = true;
}

const HEARTBEAT_INTERVAL = 30000;
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      removeFromQueue(ws);
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(interval);
});

function removeFromQueue(ws) {
  const i = queue.indexOf(ws);
  if (i !== -1) {
    queue.splice(i, 1);
    console.log(`Removed ${ws.oid || 'unknown'} from queue`);
  }
}

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join' && typeof msg.oid === 'string') {
      ws.oid = msg.oid;
      queue.forEach((existingWs, index) => {
        if (existingWs.oid === msg.oid) {
          queue.splice(index, 1);
        }
      });
      queue.push(ws);
      console.log(`Added ${ws.oid} to queue`);
      tryPair();
    } else if (msg.type === 'cancel' && typeof msg.oid === 'string') {
      removeFromQueue(ws);
      ws.send(JSON.stringify({
        type: 'cancel_confirm'
      }));
    }
  });

  ws.on('close', () => {
    removeFromQueue(ws);
  });

  ws.on('error', () => {
    removeFromQueue(ws);
  });
});

function tryPair () {
  while (queue.length >= 2) {
    const host   = queue.shift();
    const client = queue.shift();

    if (host.readyState   !== WebSocket.OPEN ||
        client.readyState !== WebSocket.OPEN ||
        !host.isAlive || !client.isAlive) {
      if (host.readyState === WebSocket.OPEN && host.isAlive) {
        queue.push(host);
      }
      if (client.readyState === WebSocket.OPEN && client.isAlive) {
        queue.push(client);
      }
      continue;
    }

    console.log(`Matching ${host.oid} (host) with ${client.oid} (client)`);

    host.send(JSON.stringify({
      type     : 'match',
      role     : 'host',
      peer_oid : client.oid
    }));

    client.send(JSON.stringify({
      type     : 'match',
      role     : 'client',
      host_oid : host.oid
    }));
  }
}

console.log(`WS  OK  : ws://localhost:3001`); 
