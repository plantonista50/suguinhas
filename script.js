// ============================================================
// 0. ANIMAÇÃO DE ANO NOVO (GOLD SPARKS & FIREWORKS) — PRESERVADA
// ============================================================

const loginOverlay = document.getElementById('login-screen');
if (loginOverlay && loginOverlay.style.display !== 'none') {
  const canvas = document.createElement('canvas');
  canvas.id = 'ny-canvas';
  loginOverlay.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  const goldPalette = ['#bf953f', '#fcf6ba', '#b38728', '#fbf5b7', '#aa771c', '#FFD700'];
  let sparks = [];

  class Spark {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * -height;
      this.size = Math.random() * 2 + 1;
      this.speedY = Math.random() * 2 + 1;
      this.color = goldPalette[Math.floor(Math.random() * goldPalette.length)];
      this.opacity = Math.random() * 0.8 + 0.2;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = Math.random() * 0.05 + 0.02;
    }
    update() {
      this.y += this.speedY;
      this.wobble += this.wobbleSpeed;
      this.x += Math.sin(this.wobble) * 0.5;
      if (this.y > height) {
        this.y = Math.random() * -50;
        this.x = Math.random() * width;
      }
    }
    draw() {
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initSparks() {
    sparks = [];
    for (let i = 0; i < 150; i++) sparks.push(new Spark());
  }

  function animateSparks() {
    ctx.clearRect(0, 0, width, height);
    sparks.forEach(s => { s.update(); s.draw(); });
    requestAnimationFrame(animateSparks);
  }

  initSparks();
  animateSparks();
}

// ============================================================
// UX STATUS SIMULATION (ADIÇÃO — NÃO ESTRUTURAL)
// ============================================================

const UX_STEPS = [
  { text: "🤖📄 Lendo documento…", time: 700 },
  { text: "🤖🧠 Analisando documento…", time: 1200 },
  { text: "🛡️🔐 Anonimizando dados do paciente…", time: 1600 },
  { text: "⚙️🧠 Organizando informações clínicas…", time: 1100 }
];

let uxTimer = null;
let uxIndex = 0;
let uxDirection = 1;

function startUxSimulation(updateFn) {
  if (uxTimer) return;

  updateFn(UX_STEPS[uxIndex].text);

  uxTimer = setTimeout(function tick() {
    uxIndex += uxDirection;

    if (uxIndex === UX_STEPS.length - 1 || uxIndex === 0) {
      uxDirection *= -1;
    }

    updateFn(UX_STEPS[uxIndex].text);
    uxTimer = setTimeout(tick, UX_STEPS[uxIndex].time);
  }, UX_STEPS[uxIndex].time);
}

function stopUxSimulation() {
  clearTimeout(uxTimer);
  uxTimer = null;
  uxIndex = 0;
  uxDirection = 1;
}

// ============================================================
// FUNÇÃO handleSend — COM INJEÇÕES DE UX (SEM QUEBRAR LOGIN)
// ============================================================

async function handleSend() {

  if (isRecording) {
    recorder.stopRecording(() => {
      const file = new File(
        [recorder.getBlob()],
        `gravacao_${Date.now()}.wav`,
        { type: 'audio/wav' }
      );
      selectedFiles.push(file);
      isRecording = false;
      btnMic.classList.remove('recording');
      btnMic.querySelector('span').textContent = 'mic';
      handleSend();
    });
    return;
  }

  if (!chatInput.value.trim() && selectedFiles.length === 0) return;

  const userMessage = chatInput.value.trim();
  addMessage('user', userMessage);

  chatInput.value = '';
  chatInput.style.height = 'auto';

  const filesToSend = [...selectedFiles];
  resetFileInput();

  const ldId = 'ld-' + Date.now();
  const ldDiv = document.createElement('div');
  ldDiv.className = 'message-wrapper ai';
  ldDiv.id = ldId;
  ldDiv.innerHTML = `
    <div class="avatar-icon ai">
      <span class="material-symbols-outlined">smart_toy</span>
    </div>
    <div class="message-content">...</div>
  `;
  chatHistory.appendChild(ldDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  const msgContent = ldDiv.querySelector('.message-content');

  // 🔹 inicia UX após paint
  requestAnimationFrame(() => {
    startUxSimulation(text => {
      if (msgContent) msgContent.textContent = text;
    });
  });

  const formData = new FormData();
  formData.append('message', userMessage);
  filesToSend.forEach(f => formData.append('files', f));

  try {
    const response = await fetch('/api/chat', { method: 'POST', body: formData });
    const data = await response.json();

    stopUxSimulation();
    document.getElementById(ldId)?.remove();

    if (data?.status_ux && data?.error) {
      addMessage('ai', data.status_ux);
      return;
    }

    addMessage('ai', data.response || 'Resposta indisponível.');

  } catch (err) {
    stopUxSimulation();
    document.getElementById(ldId)?.remove();
    addMessage('ai', 'Erro ao processar o documento.');
  }
}
