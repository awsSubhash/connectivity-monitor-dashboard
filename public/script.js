const dashboard = document.getElementById('dashboard');
const totalEl = document.getElementById('total-count');
const upEl = document.getElementById('online-count');
const downEl = document.getElementById('offline-count');

const socket = new WebSocket('ws://' + location.host);

socket.onmessage = function (event) {
  const data = JSON.parse(event.data);
  const entries = Object.values(data);

  const total = entries.length;
  const up = entries.filter(e => e.alive).length;
  const down = total - up;

  totalEl.textContent = total;
  upEl.textContent = up;
  downEl.textContent = down;

  dashboard.innerHTML = '';
  entries.forEach((entry, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--i', i);
    card.innerHTML = `
      <div class="name">${entry.name}</div>
      <div class="status ${entry.alive ? 'up' : 'down'}">
        ${entry.alive ? 'Up ✅' : 'Down ❌'}
      </div>
      <div class="time">Last checked: ${entry.time}</div>
    `;
    dashboard.appendChild(card);
  });
};
