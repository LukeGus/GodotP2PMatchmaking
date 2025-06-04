const http       = require('http');
const WebSocket  = require('ws');

// ---- tiny HTTP endpoint ---------------------------------------------------
const PORT   = 3000;
http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Match-maker running\n');
}).listen(PORT, () => console.log(`HTTP OK  : http://localhost:${PORT}`));

// ---- WebSocket matchmaking -------------------------------------------------
const wss    = new WebSocket.Server({ port: 3001 });
const queue  = [];                // waiting players (WebSocket objects)

// Add heartbeat to detect inactive connections
function heartbeat() {
  this.isAlive = true;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
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
      ws.oid = msg.oid;           // stash for later
      // Remove any existing instances of this OID from the queue
      queue.forEach((existingWs, index) => {
        if (existingWs.oid === msg.oid) {
          queue.splice(index, 1);
        }
      });
      queue.push(ws);
      console.log(`Added ${ws.oid} to queue`);
      tryPair();                  // see if we can create a match
    } else if (msg.type === 'cancel' && typeof msg.oid === 'string') {
      removeFromQueue(ws);
      ws.send(JSON.stringify({
        type: 'cancel_confirm'
      }));
    }
  });

  ws.on('close', () => {          // remove from queue if they disconnect
    removeFromQueue(ws);
  });

  ws.on('error', () => {          // remove from queue on error
    removeFromQueue(ws);
  });
});

function tryPair () {
  while (queue.length >= 2) {
    const host   = queue.shift();
    const client = queue.shift();

    // sockets might have died between enqueue and now
    if (host.readyState   !== WebSocket.OPEN ||
        client.readyState !== WebSocket.OPEN ||
        !host.isAlive || !client.isAlive) {
      // Put alive clients back in queue
      if (host.readyState === WebSocket.OPEN && host.isAlive) {
        queue.push(host);
      }
      if (client.readyState === WebSocket.OPEN && client.isAlive) {
        queue.push(client);
      }
      continue; // skip closed/dead sockets, keep looping
    }

    console.log(`Matching ${host.oid} (host) with ${client.oid} (client)`);

    // tell the chosen host:
    host.send(JSON.stringify({
      type     : 'match',
      role     : 'host',
      peer_oid : client.oid
    }));

    // tell the client who to join:
    client.send(JSON.stringify({
      type     : 'match',
      role     : 'client',
      host_oid : host.oid
    }));
  }
}

console.log(`WS  OK  : ws://localhost:3001`); 