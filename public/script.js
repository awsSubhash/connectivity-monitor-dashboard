const dashboard = document.getElementById('dashboard');

const socket = new WebSocket('ws://' + location.host);

socket.onmessage = function (event) {
  const data = JSON.parse(event.data);
  dashboard.innerHTML = '';
  Object.values(data).forEach(entry => {
    const card = document.createElement('div');
    card.className = 'card';
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

