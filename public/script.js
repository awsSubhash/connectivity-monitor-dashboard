const dashboard = document.getElementById('dashboard');
const totalEl = document.getElementById('total-count');
const upEl = document.getElementById('online-count');
const downEl = document.getElementById('offline-count');
const notifications = document.getElementById('notifications');

const socket = new WebSocket('ws://' + location.host);

socket.onmessage = function (event) {
  const message = JSON.parse(event.data);
  
  if (message.type === 'status') {
    updateStatus(message.data);
  } else if (message.type === 'notification') {
    showNotification(message.message);
  }
};

function updateStatus(hosts) {
  const total = hosts.length;
  const up = hosts.filter(h => h.alive).length;

  totalEl.textContent = total;
  upEl.textContent = up;
  downEl.textContent = total - up;

  dashboard.innerHTML = hosts.map((host, index) => `
    <div class="card" style="--i: ${index}">
      <div class="name">${host.name}</div>
      <div class="status ${host.alive ? 'up' : 'down'}">
        ${host.alive ? 'Up ✅' : 'Down ❌'}
      </div>
      <div class="time">Last checked: ${new Date(host.lastChecked).toLocaleString()}</div>
      ${host.downtimes.length > 0 ? `
        <div class="downtime-section">
          <h3>Downtime History:</h3>
          <ul class="downtime-list">
            ${host.downtimes.map(downtime => `
              <li>
                ⏳ ${new Date(downtime.start).toLocaleString()} 
                - ${downtime.end ? new Date(downtime.end).toLocaleString() : 'Ongoing'}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `
    <span class="notification-icon">✉️</span>
    <span class="notification-text">${message}</span>
  `;
  
  notifications.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 5000);
}
