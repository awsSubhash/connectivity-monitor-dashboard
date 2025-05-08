require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const ping = require('ping');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// List of IPs/hosts to monitor
const targets = [
  { name: 'Google DNS', address: '8.8.8.8' },
  { name: 'Cloudflare DNS', address: '1.1.1.1' },
  { name: 'GitHub', address: 'github.com' },
  { name: 'My Server', address: '3.8.9.4' }
];

let statusMap = {};

// Setup email transporter using .env config
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send alert email every time a host is down
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
    }
  });
}

// Broadcast latest status to all WebSocket clients
function broadcastStatus() {
  const payload = JSON.stringify(statusMap);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Check all targets and update status
function checkStatus() {
  targets.forEach(async target => {
    try {
      const res = await ping.promise.probe(target.address, { timeout: 5 });
      const isDown = !res.alive;

      // Save status for frontend
      statusMap[target.address] = {
        name: target.name,
        address: target.address,
        alive: !isDown,
        time: new Date().toLocaleTimeString()
        
      };

      if (isDown) {
        sendAlertEmail(target); // Send alert every 30s if down
      }

    } catch (err) {
      console.error(`Error pinging ${target.address}:`, err);
    }
  });

  // After checking all, broadcast and schedule next round
  setTimeout(() => {
    broadcastStatus();
    checkStatus();
  }, 30000);
}

// Serve frontend from public/
app.use(express.static('public'));

// Start server
server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
  checkStatus(); // Start monitoring loop
});

