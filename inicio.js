const CALORIES_PER_KM = { run: 65, swim: 180 };
const GOALS = { run: 50, swim: 20 };
const WEEKLY_GYM_GOAL = 5; 

let state = JSON.parse(localStorage.getItem('ironman_tracker_data')) || {
  activities: [],
  gymDays: [false, false, false, false, false, false, false]
};

let chartInstance = null;

function saveData() {
  localStorage.setItem('ironman_tracker_data', JSON.stringify(state));
  render();
}

function toggleDay(index) {
  state.gymDays[index] = !state.gymDays[index];
  saveData();
}

function resetGymDays() {
  state.gymDays = [false, false, false, false, false, false, false];
  saveData();
}

// --- DEFINE A DATA DE HOJE COMO PADRÃO NO CAMPO ---
function setDefaultDate() {
  const dateInput = document.getElementById('activity-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

// --- ATUALIZAÇÃO DA FREQUÊNCIA DA ACADEMIA ---
function updateGymTracker() {
  const todayIndex = new Date().getDay();
  const dayButtons = document.querySelectorAll('.day-btn');
  let activeDaysCount = 0;

  dayButtons.forEach((btn, idx) => {
    if (state.gymDays && state.gymDays[idx]) {
      btn.classList.add('active');
      activeDaysCount++;
    } else {
      btn.classList.remove('active');
    }

    if (idx === todayIndex) {
      btn.classList.add('today');
    } else {
      btn.classList.remove('today');
    }
  });

  const gymPercent = Math.min(100, Math.round((activeDaysCount / WEEKLY_GYM_GOAL) * 100));

  const streakText = document.getElementById('gym-streak-text');
  const progressBar = document.getElementById('gym-progress-bar');

  if (streakText) {
    streakText.innerText = `Meta: ${WEEKLY_GYM_GOAL} dias • Frequência: ${activeDaysCount}/7 dias (${gymPercent}%)`;
  }

  if (progressBar) {
    progressBar.style.width = `${gymPercent}%`;
  }
}

// --- SALVAR NOVO TREINO COM A DATA SELECIONADA ---
document.getElementById('activity-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = document.getElementById('type').value;
  const distance = parseFloat(document.getElementById('distance').value);
  const selectedDateValue = document.getElementById('activity-date').value;

  if (!isNaN(distance) && distance > 0 && selectedDateValue) {
    // Converte a data escolhida para o formato correto
    const [year, month, day] = selectedDateValue.split('-');
    const activityDate = new Date(year, month - 1, day, 12, 0, 0);
    const formattedDate = activityDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    state.activities.unshift({
      id: Date.now(),
      type,
      distance,
      date: formattedDate,
      dayOfWeek: activityDate.getDay(), // Pega o dia da semana correto para o gráfico
      timestamp: activityDate.getTime()
    });

    // Limpa o campo de distância e volta a data para 'hoje'
    document.getElementById('distance').value = '';
    setDefaultDate();

    confettiTriggered = { run: false, swim: false };
    saveData();
  }
});

function deleteActivity(id) {
  state.activities = state.activities.filter(act => act.id !== id);
  saveData();
}

// --- GRÁFICO SWIMPION STYLE (Chart.js) ---
function initChart() {
  const canvas = document.getElementById('weeklyChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const gradientRun = ctx.createLinearGradient(0, 0, 0, 200);
  gradientRun.addColorStop(0, '#E31837');
  gradientRun.addColorStop(1, 'rgba(227, 24, 55, 0.05)');

  const gradientSwim = ctx.createLinearGradient(0, 0, 0, 200);
  gradientSwim.addColorStop(0, '#00f2fe');
  gradientSwim.addColorStop(1, 'rgba(0, 242, 254, 0.05)');

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
      datasets: [
        {
          label: 'Corrida (km)',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: gradientRun,
          borderColor: '#E31837',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Natação (km)',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: gradientSwim,
          borderColor: '#00f2fe',
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8e95a5', font: { family: 'Inter', size: 12, weight: '600' } } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8e95a5' } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#8e95a5' }, beginAtZero: true }
      }
    }
  });
}

function updateChart() {
  if (!chartInstance) return;

  const runData = [0, 0, 0, 0, 0, 0, 0];
  const swimData = [0, 0, 0, 0, 0, 0, 0];
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  if (Array.isArray(state.activities)) {
    state.activities.forEach(act => {
      if (act.timestamp && act.timestamp >= oneWeekAgo) {
        const day = act.dayOfWeek !== undefined ? act.dayOfWeek : 0;
        if (act.type === 'run') runData[day] += act.distance;
        if (act.type === 'swim') swimData[day] += act.distance;
      }
    });
  }

  chartInstance.data.datasets[0].data = runData;
  chartInstance.data.datasets[1].data = swimData;
  chartInstance.update();
}

// --- COMEMORAÇÃO DE META ---
let confettiTriggered = { run: false, swim: false };

function checkMetaCompletion(runPercent, swimPercent) {
  if (runPercent >= 100 && !confettiTriggered.run) {
    triggerConfetti();
    confettiTriggered.run = true;
  }
  if (swimPercent >= 100 && !confettiTriggered.swim) {
    triggerConfetti();
    confettiTriggered.swim = true;
  }
}

function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#E31837', '#00f2fe', '#ffffff']
    });
  }
}

// --- RENDER PRINCIPAL ---
function render() {
  updateGymTracker();

  let runTotal = 0;
  let swimTotal = 0;

  if (Array.isArray(state.activities)) {
    state.activities.forEach(act => {
      if (act.type === 'run') runTotal += act.distance;
      if (act.type === 'swim') swimTotal += act.distance;
    });
  }

  const totalCalories = Math.round((runTotal * CALORIES_PER_KM.run) + (swimTotal * CALORIES_PER_KM.swim));

  document.getElementById('total-run').innerHTML = `${runTotal.toFixed(1)} <span>km</span>`;
  document.getElementById('total-swim').innerHTML = `${swimTotal.toFixed(1)} <span>km</span>`;
  document.getElementById('total-calories').innerHTML = `${totalCalories.toLocaleString('pt-BR')} <span>kcal</span>`;

  const runPercent = Math.min(100, Math.round((runTotal / GOALS.run) * 100));
  const swimPercent = Math.min(100, Math.round((swimTotal / GOALS.swim) * 100));

  document.getElementById('goal-run-text').innerText = `${runTotal.toFixed(1)} / ${GOALS.run} km (${runPercent}%)`;
  document.getElementById('goal-run-bar').style.width = `${runPercent}%`;

  document.getElementById('goal-swim-text').innerText = `${swimTotal.toFixed(1)} / ${GOALS.swim} km (${swimPercent}%)`;
  document.getElementById('goal-swim-bar').style.width = `${swimPercent}%`;

  checkMetaCompletion(runPercent, swimPercent);

  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';

  if (!state.activities || state.activities.length === 0) {
    historyList.innerHTML = `<div class="empty-state">Nenhum treino registrado. Bora buscar a meta!</div>`;
  } else {
    state.activities.forEach(act => {
      const li = document.createElement('li');
      const isSwim = act.type === 'swim';
      li.className = `history-item ${isSwim ? 'tag-swim' : ''}`;
      
      const iconClass = isSwim ? 'fa-person-swimming' : 'fa-person-running';
      const label = isSwim ? 'Natação' : 'Corrida';
      const estCalories = Math.round(act.distance * CALORIES_PER_KM[act.type]);

      li.innerHTML = `
        <div class="details">
          <div class="tag"><i class="fa-solid ${iconClass}"></i></div>
          <div class="meta">
            <span class="main-text">${label} - ${act.distance.toFixed(2)} km</span>
            <span class="sub-text">${act.date} • ~${estCalories} kcal</span>
          </div>
        </div>
        <button class="delete-btn" onclick="deleteActivity(${act.id})" title="Excluir">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;
      historyList.appendChild(li);
    });
  }

  if (chartInstance) {
    updateChart();
  }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  setDefaultDate(); // Preenche o campo com o dia de hoje
  render();
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('Service Worker não registrado:', err);
    });
  });
}