document.addEventListener('DOMContentLoaded', () => {
    
    // --- ESTADO GLOBAL ---
    let currentTool = 'prontuario'; 
    let selectedFiles = []; 
    let currentUser = null;
    
    // Variáveis do Gravador (RecordRTC)
    let recorder = null; 
    let isRecording = false;

    // --- CONFIGURAÇÃO ---
    const USE_REAL_BACKEND = true; 
    const AUTH_WEBHOOK = "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/suga-auth"; 

    // DOM ELEMENTS - AUTH
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    const signupModal = document.getElementById('signup-modal');
    const forgotModal = document.getElementById('forgot-modal');
    const forgotStep1 = document.getElementById('forgot-step-1');
    const forgotStep2 = document.getElementById('forgot-step-2');
    const userInitialsDisplay = document.getElementById('user-initials');

    // ============================================================
    // 1. DETECTOR DE URL (LINK MÁGICO / RECUPERAÇÃO DE SENHA)
    // ============================================================
    const hash = window.location.hash;
    
    if (hash && hash.includes('access_token')) {
        console.log("Link de autenticação detectado!");
        
        // Pega os dados do link (Token do Supabase)
        const params = new URLSearchParams(hash.substring(1)); 
        const accessToken = params.get('access_token');
        const type = params.get('type'); // 'recovery' ou 'signup'

        if (accessToken) {
            // Salva o token temporariamente
            currentUser = { email: "Verificado", token: accessToken };

            // Limpa a URL
            window.history.replaceState(null, null, window.location.pathname);

            if (type === 'recovery') {
                // CENÁRIO 1: Redefinir Senha
                alert("🔔 Link aceito! Agora defina sua nova senha.");
                loginScreen.style.display = 'none';
                forgotModal.style.display = 'flex';
                if(forgotStep1) forgotStep1.style.display = 'none';
                if(forgotStep2) forgotStep2.style.display = 'block';

            } else {
                // CENÁRIO 2: Confirmação de Email (Signup)
                alert("✅ E-mail confirmado com sucesso! Você está logado.");
                loginScreen.style.display = 'none';
                if(userInitialsDisplay) {
                    userInitialsDisplay.textContent = "OK";
                    userInitialsDisplay.style.backgroundColor = '#4caf50';
                }
            }
        }
    }

    // ============================================================
    // 2. LÓGICA DE NOVA SENHA
    // ============================================================
    if (forgotStep2) {
        forgotStep2.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = document.getElementById('new-pass').value;
            
            if(newPass.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");
            if(!currentUser || !currentUser.token) return alert("Erro de sessão: Token não encontrado.");

            const btn = forgotStep2.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = "Salvando...";
            btn.disabled = true;

            try {
                const response = await fetch(AUTH_WEBHOOK, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'update_password', 
                        password: newPass,
                        token: currentUser.token 
                    })
                });
                
                const data = await response.json();
                const responseData = Array.isArray(data) ? data[0] : data;

                if (responseData.id || responseData.email || !responseData.code) {
                    alert("🔒 Senha alterada com sucesso! Faça login.");
                    forgotModal.style.display = 'none';
                    loginScreen.style.display = 'flex'; 
                    forgotStep1.style.display = 'block';
                    forgotStep2.style.display = 'none';
                    currentUser = null; 
                } else {
                    alert("Erro ao atualizar senha: " + (responseData.msg || "Erro desconhecido"));
                }

            } catch (error) {
                console.error(error);
                alert("Erro de conexão ao salvar senha.");
            }
            btn.textContent = originalText;
            btn.disabled = false;
        });
    }

    // ============================================================
    // 3. AUTH: LOGIN
    // ============================================================
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
                    // SUCESSO NO LOGIN
                    currentUser = { email: data.user.email, token: data.access_token };
                    
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
                }
            } catch (err) { alert("Erro de conexão."); } 
        } 
        btn.textContent = originalBtnText; btn.disabled = false;
    });

    // ============================================================
    // 4. AUTH: CADASTRO
    // ============================================================
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validação de Termos LGPD
            const termsCheckbox = document.getElementById('signup-terms');
            if (!termsCheckbox || !termsCheckbox.checked) {
                return alert("Você deve aceitar os termos de uso (LGPD/HIPAA) para continuar.");
            }

            const email = document.getElementById('signup-email').value;
            const pass = document.getElementById('signup-pass').value;
            const confirm = document.getElementById('signup-confirm').value;
            const btn = signupForm.querySelector('button');
            const originalText = btn.textContent;

            if (pass !== confirm) return alert("Senhas não conferem.");
            
            btn.textContent = "Cadastrando..."; btn.disabled = true;

            try {
                const response = await fetch(AUTH_WEBHOOK, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'signup', email: email, password: pass })
                });
                let data = await response.json();
                if (Array.isArray(data)) data = data[0];

                if (data.user || data.id || (data.role === 'authenticated')) {
                    alert("Cadastro realizado! Verifique seu e-mail.");
                    signupModal.style.display = 'none';
                    signupForm.reset();
                } else {
                    alert("Erro: " + (data.msg || "Falha no cadastro"));
                }
            } catch (e) { alert("Erro de conexão."); }
            btn.textContent = originalText; btn.disabled = false;
        });
    }

    // ============================================================
    // 5. AUTH: ESQUECI SENHA (Passo 1)
    // ============================================================
    if (forgotStep1) {
        forgotStep1.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            const btn = forgotStep1.querySelector('button');
            const originalText = btn.textContent;

            btn.textContent = "Enviando..."; btn.disabled = true;

            try {
                await fetch(AUTH_WEBHOOK, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'forgot', email: email })
                });
                alert("Se o e-mail existir, você receberá um link.");
                forgotModal.style.display = 'none';
                forgotStep1.reset();
            } catch (e) { alert("Erro de conexão."); }
            btn.textContent = originalText; btn.disabled = false;
        });
    }

    // CONTROLE DE MODAIS
    const linkSignup = document.getElementById('link-signup');
    const linkForgot = document.getElementById('link-forgot');
    const closeButtons = document.querySelectorAll('.close-modal');

    if(linkSignup) linkSignup.addEventListener('click', (e) => { e.preventDefault(); signupModal.style.display = 'flex'; });
    if(linkForgot) linkForgot.addEventListener('click', (e) => { e.preventDefault(); forgotModal.style.display = 'flex'; });
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if(signupModal) signupModal.style.display = 'none'; 
            if(forgotModal) forgotModal.style.display = 'none';
        });
    });

    // ============================================================
    // 6. CHAT E FERRAMENTAS
    // ============================================================
    const TOOLS = {
        prontuario: { title: "SuGa PRONTUÁRIO", webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/cfadce39-4d13-4a1e-ac7d-24ed345a5e9c", placeholder: "Digite a transcrição do áudio ou anexe arquivos..." },
        examinator: { title: "SuGa EXAMINATOR", webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/processar-exame", placeholder: "Anexe os exames (PDF/Imagem) para análise..." },
        brainstorm: { title: "SuGa BRAINSTORM", webhook: "https://n8n-n8n-start.zvu2si.easypanel.host/webhook/suga-brainstorm", placeholder: "Descreva o caso clínico..." }
    };

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
        mainTitle.textContent = TOOLS[toolId].title;
        chatInput.placeholder = TOOLS[toolId].placeholder;
        clearChat();
    }

    function clearChat() {
        const messages = chatHistory.querySelectorAll('.message-wrapper');
        messages.forEach(msg => msg.remove());
        welcomeScreen.style.display = 'block';
        resetFileInput(); 
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    // ============================================================
    // 7. GRAVAÇÃO DE ÁUDIO (CORRIGIDA PARA WAV - AZURE)
    // ============================================================
    if (btnMic) btnMic.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                // Solicita acesso ao microfone
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // --- USO DO RECORDRTC (WAV) ---
                if (typeof RecordRTC === 'undefined') {
                    // Se não tiver a biblioteca, alerta mas não quebra tudo
                    alert("Erro: Biblioteca RecordRTC não carregada. Verifique o index.html.");
                    return;
                }

                recorder = new RecordRTC(stream, {
                    type: 'audio',
                    mimeType: 'audio/wav',
                    recorderType: RecordRTC.StereoAudioRecorder, // Força WAV
                    numberOfAudioChannels: 1, // Mono (Melhor para Speech-to-Text)
                    desiredSampRate: 16000 // 16kHz (Padrão Azure)
                });

                recorder.startRecording();
                isRecording = true;
                
                // Feedback Visual
                btnMic.classList.add('recording');
                btnMic.querySelector('span').textContent = 'stop_circle';
                chatInput.placeholder = "Gravando (WAV)...";

            } catch (e) {
                console.error(e);
                alert("Erro ao acessar microfone. Verifique as permissões.");
            }
        } else {
            // Parar Gravação
            recorder.stopRecording(() => {
                const blob = recorder.getBlob();
                // Cria arquivo WAV
                const file = new File([blob], `gravacao_${Date.now()}.wav`, { type: 'audio/wav' });
                
                // Adiciona à lista de arquivos para envio
                selectedFiles.push(file);
                renderFileList();
                
                // Limpa UI
                isRecording = false;
                btnMic.classList.remove('recording');
                btnMic.querySelector('span').textContent = 'mic';
                chatInput.placeholder = TOOLS[currentTool].placeholder;
                
                // Libera câmera/mic
                recorder.getInternalRecorder().blob = null; 
                recorder.camera.stop(); 
            });
        }
    });

    // Controle de Arquivos (Anexos)
    btnAttachment.addEventListener('click', () => hiddenFileInput.click());
    hiddenFileInput.addEventListener('change', (e) => {
        selectedFiles = [...selectedFiles, ...Array.from(e.target.files)].slice(0, 10);
        renderFileList();
        hiddenFileInput.value = ''; 
    });

    function renderFileList() {
        fileListContainer.innerHTML = '';
        fileListContainer.style.display = selectedFiles.length ? 'flex' : 'none';
        selectedFiles.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.className = 'file-chip';
            const icon = (file.type.includes('audio') || file.name.endsWith('.wav')) ? 'mic' : 'description';
            chip.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem">${icon}</span> <span class="file-name">${file.name}</span> <button class="remove-btn" onclick="removeFile(${index})">&times;</button>`;
            fileListContainer.appendChild(chip);
        });
        window.removeFile = idx => { selectedFiles.splice(idx, 1); renderFileList(); };
    }
    function resetFileInput() { selectedFiles = []; renderFileList(); }

    btnSend.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
    chatInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; if(this.value==='') this.style.height='auto'; });

    // ============================================================
    // 8. ENVIO DE MENSAGEM (COM AUDITORIA CORRIGIDA)
    // ============================================================
    async function handleSend() {
        // Se estiver gravando, para e envia
        if (isRecording) { 
            recorder.stopRecording(() => {
                const blob = recorder.getBlob();
                const file = new File([blob], `gravacao_${Date.now()}.wav`, { type: 'audio/wav' });
                selectedFiles.push(file);
                // Recursivamente chama handleSend após parar o áudio
                isRecording = false;
                btnMic.classList.remove('recording');
                btnMic.querySelector('span').textContent='mic';
                handleSend(); // Chama de novo agora com o arquivo
            });
            return;
        }
        
        const text = chatInput.value.trim();
        if (!text && selectedFiles.length === 0) return;

        welcomeScreen.style.display = 'none';
        
        // UI User Msg
        const wrapper = document.createElement('div'); wrapper.className = 'message-wrapper user';
        let html = selectedFiles.map(f => `<div style="font-size:0.8rem;color:#a8c7fa;margin-bottom:4px">📎 ${f.name}</div>`).join('');
        if(text) html += `<div>${text.replace(/\n/g,'<br>')}</div>`;
        wrapper.innerHTML = `<div class="message-content">${html}</div><div class="avatar-icon user">VC</div>`;
        chatHistory.appendChild(wrapper);

        chatInput.value = ''; chatInput.style.height = 'auto';
        const filesToSend = [...selectedFiles]; resetFileInput();
        
        // Loading
        const ldId = 'ld-'+Date.now();
        const ldDiv = document.createElement('div'); ldDiv.className = 'message-wrapper ai'; ldDiv.id = ldId;
        ldDiv.innerHTML = `<div class="avatar-icon ai"><span class="material-symbols-outlined">smart_toy</span></div><div class="message-content">...</div>`;
        chatHistory.appendChild(ldDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        const formData = new FormData();
        filesToSend.forEach((f, i) => formData.append(`file_${i}`, f));
        if(text) formData.append('textoBruto', text);

        // --- CORREÇÃO DA AUDITORIA (Envia email para o n8n) ---
        // Se currentUser for null (deslogado por refresh), tenta enviar "anonimo_erro"
        // mas idealmente o sistema forçaria o login antes.
        const userEmail = currentUser ? currentUser.email : "anonimo_erro";
        formData.append('user_email', userEmail);
        console.log("AUDITORIA - Enviando:", userEmail); // Debug no console
        formData.append('user_email', userEmail);
        // -----------------------------------------------------

        try {
            const res = await fetch(TOOLS[currentTool].webhook, { method: 'POST', body: formData });
            const data = await res.json();
            
            // Tenta pegar o texto de várias formas possíveis (resumoCompleto, text, etc)
            const aiText = data.resumoCompleto || data.text || (data.length ? JSON.stringify(data) : "Processamento concluído.");
            
            document.getElementById(ldId)?.remove();
            
            const aiWrapper = document.createElement('div'); aiWrapper.className = 'message-wrapper ai';
            aiWrapper.innerHTML = `<div class="avatar-icon ai"><span class="material-symbols-outlined">smart_toy</span></div><div class="message-content"><pre>${aiText}</pre><div style="text-align:right"><span class="material-symbols-outlined" style="cursor:pointer;color:#666" onclick="copyText(this)">content_copy</span></div></div>`;
            chatHistory.appendChild(aiWrapper);

        } catch (e) {
            console.error(e);
            document.getElementById(ldId)?.remove();
            const errDiv = document.createElement('div'); errDiv.className = 'message-wrapper ai';
            errDiv.innerHTML = `<div class="avatar-icon ai">⚠️</div><div class="message-content">Erro ao processar. Verifique o console.</div>`;
            chatHistory.appendChild(errDiv);
        }
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    window.copyText = function(btn) {
        const pre = btn.closest('.message-content').querySelector('pre');
        navigator.clipboard.writeText(pre.textContent).then(() => { btn.style.color='#4caf50'; setTimeout(()=>btn.style.color='#666',2000); });
    };
});

