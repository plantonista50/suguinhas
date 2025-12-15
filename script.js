document.addEventListener('DOMContentLoaded', () => {
    
    // --- ESTADO DA APLICAÇÃO ---
    let currentTool = 'prontuario'; 
    let selectedFiles = []; 
    let currentUser = null;
    
    // VARIÁVEIS DE GRAVAÇÃO
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    // --- CONFIGURAÇÃO DE BACKEND (AUTENTICAÇÃO) ---
    // Mude para true para conectar ao N8N/Supabase de verdade
    const USE_REAL_BACKEND = true; 
    const AUTH_WEBHOOK = "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/suga-auth"; 

    const TOOLS = {
        prontuario: { title: "SuGa PRONTUÁRIO", webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/cfadce39-4d13-4a1e-ac7d-24ed345a5e9c", placeholder: "Digite a transcrição do áudio ou anexe arquivos..." },
        examinator: { title: "SuGa EXAMINATOR", webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/processar-exame", placeholder: "Anexe os exames (PDF/Imagem) para análise..." },
        brainstorm: { title: "SuGa BRAINSTORM", webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/suga-brainstorm", placeholder: "Descreva o caso clínico..." }
    };

    // DOM ELEMENTS - GERAIS
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const desktopMenuToggle = document.getElementById('desktop-sidebar-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainTitle = document.getElementById('main-title');
    const navItems = document.querySelectorAll('.nav-item[data-tool]');
    const btnNewChat = document.getElementById('btn-new-chat');
    const chatHistory = document.getElementById('chat-history');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const btnAttachment = document.getElementById('btn-attachment');
    const btnMic = document.getElementById('btn-mic');
    const hiddenFileInput = document.getElementById('hidden-file-input');
    const fileListContainer = document.getElementById('file-list-container');
    const userInitialsDisplay = document.getElementById('user-initials');

    // DOM ELEMENTS - AUTH
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    const linkSignup = document.getElementById('link-signup');
    const linkForgot = document.getElementById('link-forgot');
    const signupModal = document.getElementById('signup-modal');
    const forgotModal = document.getElementById('forgot-modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    const signupForm = document.getElementById('signup-form');
    const forgotStep1 = document.getElementById('forgot-step-1');

    // --- LÓGICA DE LOGIN ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = loginForm.querySelector('button');
        const originalBtnText = btn.textContent;
        
        btn.textContent = "Autenticando..."; 
        btn.disabled = true;

        if(USE_REAL_BACKEND) {
            try {
                const response = await fetch(AUTH_WEBHOOK, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', email, password })
                });
                
                let data = await response.json();
                if (Array.isArray(data)) data = data[0]; 

                if (data && data.access_token) {
                    currentUser = { email: data.user.email, token: data.access_token };
                    
                    // Sucesso: Atualiza UI e fecha Login
                    const initials = (currentUser.email || "MD").substring(0,2).toUpperCase();
                    if(userInitialsDisplay) {
                        userInitialsDisplay.textContent = initials;
                        userInitialsDisplay.style.backgroundColor = '#4caf50';
                    }
                    
                    loginScreen.style.opacity = '0';
                    setTimeout(() => { loginScreen.style.display = 'none'; }, 500);
                } else {
                    let msg = data.error_description || data.msg || data.message || "Credenciais inválidas.";
                    alert("Erro: " + msg);
                    btn.textContent = originalBtnText; 
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err); 
                alert("Erro de conexão com o servidor.");
                btn.textContent = originalBtnText; 
                btn.disabled = false;
            } 
        } else {
            // MODO SIMULAÇÃO
            if(email && password) {
                setTimeout(() => {
                    if(userInitialsDisplay) userInitialsDisplay.textContent = email.substring(0,2).toUpperCase();
                    loginScreen.style.opacity = '0';
                    setTimeout(() => { loginScreen.style.display = 'none'; }, 500);
                }, 800);
            }
        }
    });

    // --- LÓGICA DE CADASTRO ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-pass').value;
        const confirm = document.getElementById('signup-confirm').value;
        const btn = signupForm.querySelector('button');
        const originalText = btn.textContent;

        if (pass !== confirm) { return alert("As senhas não coincidem."); }
        if (pass.length < 6) { return alert("A senha deve ter no mínimo 6 caracteres."); }

        btn.textContent = "Processando...";
        btn.disabled = true;

        if (USE_REAL_BACKEND) {
            try {
                const response = await fetch(AUTH_WEBHOOK, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'signup', email: email, password: pass })
                });
                let data = await response.json();
                if (Array.isArray(data)) data = data[0];

                if (data.user || data.id || (data.role === 'authenticated')) {
                    alert("Cadastro realizado! Verifique seu e-mail ou faça login.");
                    signupModal.style.display = 'none';
                    signupForm.reset();
                } else {
                    const errorMsg = data.msg || data.message || data.error_description || "Falha no cadastro";
                    alert("Erro: " + errorMsg);
                }
            } catch (error) {
                alert("Erro de conexão.");
            }
        } else {
            setTimeout(() => { alert("Simulação: Cadastro OK"); signupModal.style.display = 'none'; }, 1000);
        }
        btn.textContent = originalText; btn.disabled = false;
    });

    // --- LÓGICA ESQUECI SENHA ---
    forgotStep1.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        const btn = forgotStep1.querySelector('button');
        const originalText = btn.textContent;

        btn.textContent = "Enviando...";
        btn.disabled = true;

        if (USE_REAL_BACKEND) {
            try {
                await fetch(AUTH_WEBHOOK, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'forgot', email: email })
                });
                alert("Se o e-mail existir, você receberá um link.");
                forgotModal.style.display = 'none';
                forgotStep1.reset();
            } catch (error) { alert("Erro de conexão."); }
        } else {
            setTimeout(() => { alert("Simulação: E-mail enviado"); forgotModal.style.display = 'none'; }, 1000);
        }
        btn.textContent = originalText; btn.disabled = false;
    });

    // --- CONTROLE DE MODAIS (ABRIR/FECHAR) ---
    linkSignup.addEventListener('click', (e) => { e.preventDefault(); signupModal.style.display = 'flex'; });
    linkForgot.addEventListener('click', (e) => { e.preventDefault(); forgotModal.style.display = 'flex'; });
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            signupModal.style.display = 'none'; 
            forgotModal.style.display = 'none';
        });
    });


    // --- APP LOGIC (CHAT, UPLOAD, MIC) ---
    function toggleMobileMenu() { sidebar.classList.toggle('mobile-open'); sidebarOverlay.classList.toggle('active'); }
    function closeMobileMenu() { sidebar.classList.remove('mobile-open'); sidebarOverlay.classList.remove('active'); }
    function toggleDesktopMenu() { sidebar.classList.toggle('collapsed'); }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    if (desktopMenuToggle) desktopMenuToggle.addEventListener('click', toggleDesktopMenu);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileMenu);

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const toolId = item.getAttribute('data-tool');
            setActiveTool(toolId);
            if (window.innerWidth <= 768) closeMobileMenu();
        });
    });

    if(btnNewChat) btnNewChat.addEventListener('click', clearChat);

    function setActiveTool(toolId) {
        navItems.forEach(nav => nav.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-tool="${toolId}"]`);
        if(activeNav) activeNav.classList.add('active');

        currentTool = toolId;
        const toolData = TOOLS[toolId];
        mainTitle.textContent = toolData.title;
        chatInput.placeholder = toolData.placeholder;
        clearChat();
    }

    function clearChat() {
        const messages = chatHistory.querySelectorAll('.message-wrapper');
        messages.forEach(msg => msg.remove());
        welcomeScreen.style.display = 'block';
        resetFileInput(); 
        chatInput.value = '';
        adjustTextareaHeight(chatInput);
        if (window.innerWidth <= 768) closeMobileMenu();
    }

    // GRAVAÇÃO DE ÁUDIO
    if (btnMic) btnMic.addEventListener('click', toggleRecording);

    async function toggleRecording() {
        if (!isRecording) await startRecording(); else stopRecording();
    }

    async function startRecording() {
        if (selectedFiles.length >= 10) return alert("Limite de arquivos atingido.");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `gravacao_${Date.now()}.webm`, { type: 'audio/webm' });
                selectedFiles.push(audioFile);
                renderFileList();
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            isRecording = true;
            btnMic.classList.add('recording');
            btnMic.querySelector('span').textContent = 'stop_circle';
            chatInput.placeholder = "Gravando...";
        } catch (err) { alert("Erro ao acessar microfone."); }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            isRecording = false;
            btnMic.classList.remove('recording');
            btnMic.querySelector('span').textContent = 'mic';
            chatInput.placeholder = TOOLS[currentTool].placeholder;
        }
    }

    // UPLOAD E ENVIO
    btnAttachment.addEventListener('click', () => hiddenFileInput.click());
    hiddenFileInput.addEventListener('change', (e) => {
        const newFiles = Array.from(e.target.files);
        if (selectedFiles.length + newFiles.length > 10) return alert("Limite de arquivos.");
        selectedFiles = [...selectedFiles, ...newFiles];
        renderFileList();
        hiddenFileInput.value = ''; 
    });

    function renderFileList() {
        fileListContainer.innerHTML = '';
        if (selectedFiles.length === 0) { fileListContainer.style.display = 'none'; return; }
        fileListContainer.style.display = 'flex';
        selectedFiles.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.classList.add('file-chip');
            const icon = document.createElement('span');
            icon.className = 'material-symbols-outlined';
            icon.style.fontSize = '1.1rem';
            icon.textContent = (file.type.includes('audio') || file.name.endsWith('.webm')) ? 'mic' : 'description';
            
            chip.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem">${icon.textContent}</span> <span class="file-name">${file.name}</span> <button class="remove-btn" onclick="removeFile(${index})">&times;</button>`;
            fileListContainer.appendChild(chip);
        });
        window.removeFile = (idx) => { selectedFiles.splice(idx, 1); renderFileList(); };
    }

    function resetFileInput() { selectedFiles = []; renderFileList(); }

    chatInput.addEventListener('input', function() { adjustTextareaHeight(this); });
    function adjustTextareaHeight(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight) + 'px'; if(el.value === '') el.style.height = 'auto'; }
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });

    btnSend.addEventListener('click', handleSend);

    async function handleSend() {
        if (isRecording) { stopRecording(); await new Promise(r => setTimeout(r, 500)); }
        const text = chatInput.value.trim();
        if (!text && selectedFiles.length === 0) return;

        welcomeScreen.style.display = 'none';
        const fileNames = selectedFiles.map(f => f.name);
        addUserMessage(text, fileNames);

        chatInput.value = ''; chatInput.style.height = 'auto';
        const filesToSend = [...selectedFiles];
        resetFileInput(); 
        const loadingId = addLoadingMessage();
        scrollToBottom();

        const formData = new FormData();
        filesToSend.forEach((file, index) => formData.append(`file_${index}`, file));
        if (text) formData.append('textoBruto', text);

        try {
            const response = await fetch(TOOLS[currentTool].webhook, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Erro API');
            const data = await response.json();
            const aiResponse = data.resumoCompleto || data.text || JSON.stringify(data);
            removeMessage(loadingId);
            addAiMessage(aiResponse);
        } catch (error) {
            removeMessage(loadingId);
            addAiMessage("Ocorreu um erro ao processar. Verifique a conexão com o n8n.");
        }
        scrollToBottom();
    }

    function addUserMessage(text, fileNames) {
        const wrapper = document.createElement('div'); wrapper.classList.add('message-wrapper', 'user');
        let html = '';
        if (fileNames && fileNames.length) fileNames.forEach(n => html += `<div style="font-size:0.8rem;color:#a8c7fa;margin-bottom:4px">📎 ${n}</div>`);
        if (text) html += `<div>${text.replace(/\n/g, '<br>')}</div>`;
        wrapper.innerHTML = `<div class="message-content">${html}</div><div class="avatar-icon user">VC</div>`;
        chatHistory.appendChild(wrapper);
    }

    function addAiMessage(text) {
        const wrapper = document.createElement('div'); wrapper.classList.add('message-wrapper', 'ai');
        wrapper.innerHTML = `<div class="avatar-icon ai"><span class="material-symbols-outlined">smart_toy</span></div><div class="message-content"><pre>${text}</pre><div style="text-align:right"><span class="material-symbols-outlined" style="cursor:pointer;color:#666" onclick="copyText(this)">content_copy</span></div></div>`;
        chatHistory.appendChild(wrapper);
    }

    function addLoadingMessage() {
        const id = 'ld-'+Date.now();
        const wrapper = document.createElement('div'); wrapper.className = 'message-wrapper ai'; wrapper.id = id;
        wrapper.innerHTML = `<div class="avatar-icon ai"><span class="material-symbols-outlined">smart_toy</span></div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
        chatHistory.appendChild(wrapper);
        return id;
    }

    function removeMessage(id) { document.getElementById(id)?.remove(); }
    function scrollToBottom() { chatHistory.scrollTop = chatHistory.scrollHeight; }
    
    window.copyText = function(btn) {
        const pre = btn.closest('.message-content').querySelector('pre');
        navigator.clipboard.writeText(pre.textContent).then(() => { btn.style.color='#4caf50'; setTimeout(()=>btn.style.color='#666',2000); });
    };
});