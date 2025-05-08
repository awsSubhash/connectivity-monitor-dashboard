require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const ping = require('ping');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const targets = [
  { name: 'Google DNS', address: '8.8.8.8' },
  { name: 'Cloudflare DNS', address: '1.1.1.1' },
  { name: 'GitHub', address: 'github.com' },
  { name: 'My Server', address: '3.8.9.4' }
];

let statusMap = {};

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendAlertEmail(target) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: `⚠️ ALERT: ${target.name} is DOWN`,
    text: `The host "${target.name}" (${target.address}) is currently unreachable as of ${new Date().toLocaleString()}.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Email sending failed:', error);
    } else {
      console.log(`✅ Alert email sent for ${target.name}: ${info.response}`);
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'notification',
            message: `Email alert sent for ${target.name} at ${new Date().toLocaleTimeString()}`
          }));
        }
      });
    }
  });
}

function broadcastStatus() {
  const payload = JSON.stringify({
    type: 'status',
    data: Object.values(statusMap).map(host => ({
      ...host,
      lastChecked: host.lastChecked.toISOString(),
      downtimes: host.downtimes.map(d => ({
        start: d.start.toISOString(),
        end: d.end ? d.end.toISOString() : null
      }))
    }))
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

async function checkStatus() {
  for (const target of targets) {
    try {
      const res = await ping.promise.probe(target.address, { timeout: 5 });
      const isDown = !res.alive;
      const now = new Date();

      if (!statusMap[target.address]) {
        statusMap[target.address] = {
          name: target.name,
          address: target.address,
          alive: true,
          downtimes: [],
          lastChecked: now
        };
      }

      const hostStatus = statusMap[target.address];
      const wasAlive = hostStatus.alive;

      hostStatus.alive = !isDown;
      hostStatus.lastChecked = now;

      if (!wasAlive && !isDown) {
        // Host recovered
        const ongoing = hostStatus.downtimes.find(d => !d.end);
        if (ongoing) ongoing.end = now;
      } else if (wasAlive && isDown) {
        // New downtime
        hostStatus.downtimes.push({
          start: now,
          end: null
        });
        sendAlertEmail(target);
      }
    } catch (err) {
      console.error(`Error pinging ${target.address}:`, err);
    }
  }

  broadcastStatus();
  setTimeout(checkStatus, 30000);
}

app.use(express.static('public'));

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
  checkStatus();
});
