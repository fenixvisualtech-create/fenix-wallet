/**
 * Fenix Wallet App - Controlador Principal v2.5 (Extratos Bancários, Gastos Futuros & Perfil)
 */

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = window.store.getTheme();
  window.ui.applyTheme(savedTheme);

  window.ui.populateCategorySelects();

  initAuthSystem();

  if (window.store.getActiveAccountId()) {
    refreshAll();
  }

  initTabNavigation();
  initMonthSelector();
  initModalHandlers();
  initTransactionFilters();
  initDataHandlers();
  initPWASupport();
  initMobileDrawer();
  initPrivacyToggle();
  initThemeToggle();
  initProfileEditHandler();
  initCardHandlers();
  initBankImportHandler();
  initUpcomingHandlers();
  initProfileModalTrigger();
  initPixBalanceHandlers();
  initForceUpdateHandler();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.store.getActiveAccountId()) {
        window.charts.renderCategoryChart(window.ui.currentYear, window.ui.currentMonth);
        window.charts.renderCashflowChart(window.ui.currentYear, window.ui.currentMonth);
      }
    }, 250);
  });
});

function refreshAll() {
  window.ui.updateDashboard();
  window.ui.renderTransactionsTable();
  window.ui.renderBudgetsAndGoals();
  window.ui.renderUpcomingExpenses();
}

// ----------------------------------------------------
// IMPORTADOR DE EXTRATOS BANCÁRIOS MULTI-ARQUIVOS (ATÉ 5 ARQUIVOS OFX / CSV)
// ----------------------------------------------------
function initBankImportHandler() {
  const modal = document.getElementById('bankImportModal');
  const openBtns = document.querySelectorAll('#openBankImportTopBtn, #openBankImportShortcutBtn, #openBankImportSettingsBtn');
  const fileInput = document.getElementById('bankFileInput');
  const dropzone = document.getElementById('dropzoneBox');
  const selectedFilesContainer = document.getElementById('selectedFilesList');
  const btnProcess = document.getElementById('btnProcessImport');

  openBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        window.ui.selectedFilesToImport = [];
        if (selectedFilesContainer) selectedFilesContainer.innerHTML = '';
        if (btnProcess) btnProcess.disabled = true;
        if (modal) modal.classList.remove('hidden');
      });
    }
  });

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 5) {
        window.ui.showToast('Você só pode selecionar no máximo 5 arquivos de extrato!', 'error');
        return;
      }

      window.ui.selectedFilesToImport = files;
      renderSelectedFilesBadges(files);
    });
  }

  function renderSelectedFilesBadges(files) {
    if (!selectedFilesContainer) return;
    if (files.length === 0) {
      selectedFilesContainer.innerHTML = '';
      if (btnProcess) btnProcess.disabled = true;
      return;
    }

    selectedFilesContainer.innerHTML = files.map((f, i) => `
      <div class="file-badge-item">
        <span><i class="fa-solid fa-file-lines" style="color:var(--accent-red-primary);"></i> ${f.name} (${(f.size/1024).toFixed(1)} KB)</span>
        <i class="fa-solid fa-check" style="color:#10b981;"></i>
      </div>
    `).join('');

    if (btnProcess) btnProcess.disabled = false;
  }

  if (btnProcess) {
    btnProcess.addEventListener('click', async () => {
      const files = window.ui.selectedFilesToImport;
      if (!files || files.length === 0) return;

      const filePromises = files.map(f => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            resolve({ name: f.name, content: evt.target.result });
          };
          reader.readAsText(f);
        });
      });

      const filesData = await Promise.all(filePromises);
      const importedCount = window.store.importMultipleStatements(filesData);

      if (importedCount > 0) {
        window.ui.showToast(`${importedCount} lançamentos importados de ${files.length} arquivo(s)!`, 'success');
        if (modal) modal.classList.add('hidden');
        refreshAll();
      } else {
        window.ui.showToast('Nenhum novo lançamento encontrado nos arquivos.', 'error');
      }
    });
  }
}

// ----------------------------------------------------
// GASTOS FUTUROS & CONTAS A PAGAR
// ----------------------------------------------------
function initUpcomingHandlers() {
  const modal = document.getElementById('upcomingModal');
  const openBtn = document.getElementById('openUpcomingModalBtn');
  const form = document.getElementById('upcomingForm');
  const billTypeSelect = document.getElementById('upBillType');
  const instGroup = document.getElementById('upInstallmentsGroup');

  if (billTypeSelect && instGroup) {
    billTypeSelect.addEventListener('change', () => {
      if (billTypeSelect.value === 'financing') {
        instGroup.classList.remove('hidden');
      } else {
        instGroup.classList.add('hidden');
      }
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (form) form.reset();
      if (instGroup) instGroup.classList.add('hidden');
      document.getElementById('upDueDate').value = new Date().toISOString().split('T')[0];
      if (modal) modal.classList.remove('hidden');
    });
  }

  // Atalhos Rápidos da Tela Inicial (Internet, Luz, Água, Empréstimo, Financiamento)
  document.querySelectorAll('.quick-bill-card[data-bill-preset]').forEach(card => {
    card.addEventListener('click', () => {
      const preset = card.getAttribute('data-bill-preset');
      const targetBtn = document.querySelector(`.nav-item[data-tab="upcoming"], .bottom-nav-item[data-tab="upcoming"]`);
      if (targetBtn) targetBtn.click();

      window.ui.showToast(`Visualizando gastos futuros de ${preset.toUpperCase()}`, 'info');
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const description = document.getElementById('upDescription').value;
      const amount = parseFloat(document.getElementById('upAmount').value);
      const category = document.getElementById('upCategory').value;
      const dueDate = document.getElementById('upDueDate').value;
      const billType = document.getElementById('upBillType').value;
      const remainingInstallments = parseInt(document.getElementById('upRemainingInstallments').value) || 12;

      if (!description || !amount || !dueDate) {
        window.ui.showToast('Preencha todos os campos do gasto futuro!', 'error');
        return;
      }

      window.store.addUpcomingExpense({
        description,
        amount,
        category,
        dueDate,
        billType,
        remainingInstallments,
        totalInstallments: remainingInstallments
      });

      window.ui.showToast('Gasto futuro agendado com sucesso!', 'success');
      if (modal) modal.classList.add('hidden');
      refreshAll();

      const ach = window.store.checkFirstAchievement('first_upcoming');
      if (ach) window.ui.showAchievementModal(ach);
    });
  }

  // Dar Baixa e Excluir Gasto Futuro
  document.addEventListener('click', (e) => {
    const payBtn = e.target.closest('.pay-upcoming-btn');
    const deleteUpcomingBtn = e.target.closest('.delete-upcoming-btn');

    if (payBtn) {
      const id = payBtn.getAttribute('data-id');
      const res = window.store.markUpcomingPaid(id);
      if (res) {
        if (res.status === 'quitado') {
          window.ui.showToast(`🎉 PARABÉNS! ${res.description} foi 100% QUITADO com sucesso!`, 'success');
        } else if (res.status === 'paid_installment') {
          window.ui.showToast(`Pagamento efetuado! Restam ${res.remaining} parcelas.`, 'success');
        } else {
          window.ui.showToast(`Conta de ${res.description} paga! Próximo mês agendado.`, 'success');
        }
        refreshAll();
      }
    }

    if (deleteUpcomingBtn) {
      const id = deleteUpcomingBtn.getAttribute('data-id');
      if (confirm('Deseja excluir este gasto futuro?')) {
        window.store.deleteUpcomingExpense(id);
        window.ui.showToast('Gasto futuro removido.', 'info');
        refreshAll();
      }
    }
  });
}

// ----------------------------------------------------
// ABRE PERFIL AO CLICAR NO USER PILL
// ----------------------------------------------------
function initProfileModalTrigger() {
  const profileTriggers = document.querySelectorAll('.openProfileModalBtn');
  profileTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      const settingsNav = document.querySelector('.nav-item[data-tab="settings"], .bottom-nav-item[data-tab="settings"]');
      if (settingsNav) settingsNav.click();
    });
  });
}

// ----------------------------------------------------
// OUTRAS INICIALIZAÇÕES
// ----------------------------------------------------
function initThemeToggle() {
  const toggleBtns = document.querySelectorAll('#themeToggleBtn, #themeToggleBtnSettings');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      window.ui.toggleTheme();
    });
  });
}

function initProfileEditHandler() {
  const profileForm = document.getElementById('editProfileForm');
  if (!profileForm) return;

  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('profileNameInput').value;
    const email = document.getElementById('profileEmailInput').value;
    const avatarUrlInput = document.getElementById('profileAvatarUrlInput').value;
    const selectedGalleryAvatar = window.ui.selectedEditAvatar;

    const newAvatar = avatarUrlInput.trim() || selectedGalleryAvatar || window.store.getActiveAccount()?.avatar;

    if (!name || !email) {
      window.ui.showToast('Preencha nome e e-mail!', 'error');
      return;
    }

    window.store.updateAccountProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: newAvatar
    });

    window.ui.showToast('Perfil e foto atualizados com sucesso!', 'success');
    window.ui.renderActiveUserProfile();
    refreshAll();
  });
}

function initCardHandlers() {
  const cardModal = document.getElementById('cardModal');
  const openCardBtns = document.querySelectorAll('#openAddCardModalBtn, #openAddCardModalShortcutBtn');
  const cardForm = document.getElementById('cardForm');

  openCardBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (cardForm) cardForm.reset();
        cardModal.classList.remove('hidden');
      });
    }
  });

  if (cardForm) {
    const cardBankSelect = document.getElementById('cardBank');
    const cardColorSelect = document.getElementById('cardColor');

    if (cardBankSelect && cardColorSelect) {
      cardBankSelect.addEventListener('change', () => {
        const bank = cardBankSelect.value;
        if (bank.includes('Nubank')) cardColorSelect.value = 'linear-gradient(135deg, #a855f7 0%, #7e22ce 50%, #581c87 100%)';
        else if (bank.includes('Inter') || bank.includes('BMG')) cardColorSelect.value = 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #9a3412 100%)';
        else if (bank.includes('Neon') || bank.includes('Pan')) cardColorSelect.value = 'linear-gradient(135deg, #ec4899 0%, #be185d 50%, #831843 100%)';
        else if (bank.includes('Itaú') || bank.includes('Bradesco') || bank.includes('Caixa')) cardColorSelect.value = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e3a8a 100%)';
        else if (bank.includes('PicPay') || bank.includes('Sicoob') || bank.includes('Sicredi')) cardColorSelect.value = 'linear-gradient(135deg, #10b981 0%, #059669 50%, #064e3b 100%)';
        else if (bank.includes('Banco do Brasil') || bank.includes('Will') || bank.includes('Nomad')) cardColorSelect.value = 'linear-gradient(135deg, #eab308 0%, #ca8a04 50%, #854d0e 100%)';
        else if (bank.includes('C6') || bank.includes('BTG') || bank.includes('XP')) cardColorSelect.value = 'linear-gradient(135deg, #334155 0%, #0f172a 50%, #020617 100%)';
      });
    }

    cardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cardName').value;
      const bank = document.getElementById('cardBank') ? document.getElementById('cardBank').value : 'Outro';
      const brand = document.getElementById('cardBrand').value;
      const digits = document.getElementById('cardLastDigits').value;
      const limit = parseFloat(document.getElementById('cardLimit').value);
      const dueDay = parseInt(document.getElementById('cardDueDay').value) || 10;
      const colorGradient = document.getElementById('cardColor').value;

      if (!name || !limit) {
        window.ui.showToast('Preencha os dados do cartão!', 'error');
        return;
      }

      const newCard = {
        name,
        bank,
        brand,
        number: `•••• ${digits || '5678'}`,
        limit,
        dueDay,
        colorGradient
      };

      window.store.addCard(newCard);
      window.ui.showToast(`Novo cartão ${bank} (${brand}) adicionado!`, 'success');
      cardModal.classList.add('hidden');
      refreshAll();

      const ach = window.store.checkFirstAchievement('first_card');
      if (ach) window.ui.showAchievementModal(ach);
    });
  }

  document.addEventListener('click', (e) => {
    const deleteCardBtn = e.target.closest('.delete-card-btn');
    if (deleteCardBtn) {
      const cardId = deleteCardBtn.getAttribute('data-id');
      if (confirm('Deseja realmente remover este cartão?')) {
        window.store.deleteCard(cardId);
        window.ui.showToast('Cartão removido.', 'info');
        refreshAll();
      }
    }
  });
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function initGoogleNativeIdentity() {
  try {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: "958043682976-fenixwallet.apps.googleusercontent.com",
        auto_select: false,
        callback: (response) => {
          if (response && response.credential) {
            const payload = parseJwt(response.credential);
            if (payload && payload.email) {
              const email = payload.email;
              const name = payload.name || payload.given_name || email.split('@')[0];
              const remember = document.getElementById('googleRememberMe')?.checked ?? true;

              window.store.setRememberMe(remember);
              const acc = window.store.loginWithGoogle(email, name);

              window.ui.showToast(`Login efetuado com sua conta do Google (${email})!`, 'success');
              document.getElementById('googleAuthModal')?.classList.add('hidden');
              document.getElementById('authOverlay')?.classList.add('hidden');
              refreshAll();
              initTutorialHandlers(false);
            }
          }
        }
      });
    }
  } catch (e) {
    console.warn('Google GIS SDK não carregou ou ambiente offline.');
  }
}

function initAuthSystem() {
  window.ui.renderAuthOverlay();
  initGoogleNativeIdentity();

  const overlay = document.getElementById('authOverlay');
  const loginView = document.getElementById('accountLoginView');
  const selectView = document.getElementById('accountSelectView');
  const createView = document.getElementById('accountCreateView');

  const googleModal = document.getElementById('googleAuthModal');
  const btnGoogleLogin = document.getElementById('btnGoogleLogin');
  const googleForm = document.getElementById('googleQuickLoginForm');

  const loginForm = document.getElementById('loginAccountForm');
  const createForm = document.getElementById('createAccountForm');

  const btnGoToCreateFromLogin = document.getElementById('btnGoToCreateFromLogin');
  const btnGoToSelectFromLogin = document.getElementById('btnGoToSelectFromLogin');
  const btnGoToCreate = document.getElementById('btnGoToCreateAccount');
  const btnBackToLoginFromSelect = document.getElementById('btnBackToLoginFromSelect');
  const btnCancelCreate = document.getElementById('btnCancelCreateAccount');

  // Verifica se o usuário optou por manter logado e tem conta ativa
  const isRemember = window.store.getRememberMe();
  const activeAcc = window.store.getActiveAccount();
  if (isRemember && activeAcc) {
    overlay.classList.add('hidden');
  }

  // Navegação entre views de Auth
  if (btnGoToCreateFromLogin) {
    btnGoToCreateFromLogin.addEventListener('click', () => {
      loginView.classList.add('hidden');
      selectView.classList.add('hidden');
      createView.classList.remove('hidden');
      window.ui.renderAvatarOptions();
    });
  }

  if (btnGoToSelectFromLogin) {
    btnGoToSelectFromLogin.addEventListener('click', () => {
      loginView.classList.add('hidden');
      createView.classList.add('hidden');
      selectView.classList.remove('hidden');
    });
  }

  if (btnBackToLoginFromSelect) {
    btnBackToLoginFromSelect.addEventListener('click', () => {
      selectView.classList.add('hidden');
      createView.classList.add('hidden');
      loginView.classList.remove('hidden');
    });
  }

  if (btnGoToCreate) {
    btnGoToCreate.addEventListener('click', () => {
      selectView.classList.add('hidden');
      loginView.classList.add('hidden');
      createView.classList.remove('hidden');
      window.ui.renderAvatarOptions();
    });
  }

  if (btnCancelCreate) {
    btnCancelCreate.addEventListener('click', () => {
      createView.classList.add('hidden');
      selectView.classList.add('hidden');
      loginView.classList.remove('hidden');
    });
  }

  // Trigger do Botão de Login do Google (Prompt Nativo do Dispositivo + Pop-up de Contas)
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', () => {
      // 1. Tenta acionar a janela/prompt nativo do Google (Google One-Tap) do dispositivo
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            openGoogleChooserPopup();
          }
        });
      } else {
        openGoogleChooserPopup();
      }
    });
  }

  function openGoogleChooserPopup() {
    const w = 480;
    const h = 620;
    const left = Math.max(0, Math.round((window.screen.width / 2) - (w / 2)));
    const top = Math.max(0, Math.round((window.screen.height / 2) - (h / 2)));

    try {
      const popup = window.open(
        'https://accounts.google.com/AccountChooser?continue=https://accounts.google.com/',
        'GoogleAccountChooserPopup',
        `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,status=no,resizable=yes`
      );

      if (!popup && googleModal) {
        googleModal.classList.remove('hidden');
      }
    } catch (err) {
      if (googleModal) googleModal.classList.remove('hidden');
    }
  }

  // Listener para mensagens vindas da Janela Pop-up do Google!
  if (!window.googleMessageListenerAdded) {
    window.googleMessageListenerAdded = true;
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'GOOGLE_LOGIN') {
        const { email, name } = event.data;
        const remember = document.getElementById('googleRememberMe')?.checked ?? true;

        window.store.setRememberMe(remember);
        const acc = window.store.loginWithGoogle(email, name);

        window.ui.showToast(`Login efetuado via Google! Bem-vindo, ${acc.name}!`, 'success');
        if (googleModal) googleModal.classList.add('hidden');
        overlay.classList.add('hidden');
        refreshAll();
        initTutorialHandlers(false);
      }
    });
  }

  // Clique em uma conta da lista do Google (One-Tap Login)
  document.querySelectorAll('.google-account-item-btn[data-google-email]').forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-google-email');
      const name = btn.getAttribute('data-google-name');
      const remember = document.getElementById('googleRememberMe')?.checked ?? true;

      window.store.setRememberMe(remember);
      const acc = window.store.loginWithGoogle(email, name);

      window.ui.showToast(`Login efetuado via Google! Bem-vindo, ${acc.name}!`, 'success');
      if (googleModal) googleModal.classList.add('hidden');
      overlay.classList.add('hidden');
      refreshAll();
      initTutorialHandlers(false);
    });
  });

  // Botão Usar outra conta do Google
  const btnCustomGoogle = document.getElementById('btnCustomGoogleAccount');
  const googleCustomForm = document.getElementById('googleCustomAccountForm');
  if (btnCustomGoogle && googleCustomForm) {
    btnCustomGoogle.addEventListener('click', () => {
      googleCustomForm.classList.remove('hidden');
    });
  }

  if (googleCustomForm) {
    googleCustomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('googleCustomEmail').value;
      const name = document.getElementById('googleCustomName').value;
      const remember = document.getElementById('googleRememberMe')?.checked ?? true;

      window.store.setRememberMe(remember);
      const acc = window.store.loginWithGoogle(email, name);

      window.ui.showToast(`Conectado com Google (${email})!`, 'success');
      if (googleModal) googleModal.classList.add('hidden');
      overlay.classList.add('hidden');
      refreshAll();
      initTutorialHandlers(false);
    });
  }

  // Formulário de Login por E-mail + Senha
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPassword').value;
      const remember = document.getElementById('loginRememberMe').checked;

      window.store.setRememberMe(remember);
      const res = window.store.loginWithEmail(email, pass);

      if (res.success) {
        window.ui.showToast(`Login realizado com sucesso! Olá, ${res.account.name}!`, 'success');
        overlay.classList.add('hidden');
        refreshAll();
        initTutorialHandlers(false);
      } else {
        window.ui.showToast(res.message, 'error');
      }
    });
  }

  // Formulário de Criar Nova Conta
  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const pass = document.getElementById('regPassword').value;
      const remember = document.getElementById('regRememberMe').checked;
      const avatar = window.ui.selectedRegisterAvatar;

      if (!name || !email) {
        window.ui.showToast('Preencha seu nome e e-mail!', 'error');
        return;
      }

      window.store.setRememberMe(remember);
      const newAccount = window.store.createAccount(name, email, avatar, pass);
      window.ui.showToast(`Conta criada com sucesso! Bem-vindo, ${newAccount.name}!`, 'success');
      
      overlay.classList.add('hidden');
      createForm.reset();
      refreshAll();

      // Dispara o Tutorial Interativo para novas contas
      initTutorialHandlers(true);
    });
  }

  document.addEventListener('click', (e) => {
    const cardBtn = e.target.closest('.select-account-btn');
    if (cardBtn) {
      const id = cardBtn.getAttribute('data-id');
      const account = window.store.switchAccount(id);
      if (account) {
        window.ui.showToast(`Conectado como ${account.name}`, 'success');
        overlay.classList.add('hidden');
        refreshAll();
        initTutorialHandlers(false);
      }
    }
  });

  const switchBtns = document.querySelectorAll('#switchAccountTopBtn, #switchAccountMiniBtn');
  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      window.store.logout();
      window.ui.renderAuthOverlay();
    });
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.store.logout();
      window.ui.showToast('Você desconectou do Fenix Wallet.', 'info');
      window.ui.renderAuthOverlay();
    });
  }
}

function initTutorialHandlers(forceOpen = false) {
  const modal = document.getElementById('welcomeTutorialModal');
  const btnNext = document.getElementById('btnNextTutorialStep');
  const btnPrev = document.getElementById('btnPrevTutorialStep');
  const dots = document.querySelectorAll('.tutorial-progress-dots .dot');

  if (!modal) return;

  const ach = window.store.getAchievements();
  if (forceOpen || !ach.tour_done) {
    modal.classList.remove('hidden');
  }

  let currentStep = 1;

  function updateStepView() {
    for (let i = 1; i <= 5; i++) {
      const stepEl = document.getElementById(`step${i}`);
      if (stepEl) {
        if (i === currentStep) stepEl.classList.remove('hidden');
        else stepEl.classList.add('hidden');
      }
    }

    dots.forEach((dot, index) => {
      if (index + 1 === currentStep) dot.classList.add('active');
      else dot.classList.remove('active');
    });

    if (btnPrev) btnPrev.disabled = (currentStep === 1);

    if (btnNext) {
      if (currentStep === 5) {
        btnNext.innerHTML = 'Começar Agora! <i class="fa-solid fa-rocket"></i>';
      } else {
        btnNext.innerHTML = 'Próximo <i class="fa-solid fa-arrow-right"></i>';
      }
    }
  }

  if (btnNext) {
    btnNext.onclick = () => {
      if (currentStep < 5) {
        currentStep++;
        updateStepView();
      } else {
        modal.classList.add('hidden');
        const currAch = window.store.getAchievements();
        currAch.tour_done = true;
        window.store.saveAchievements(currAch);
        window.ui.showToast('Tutorial concluído! Bom controle financeiro!', 'success');
      }
    };
  }

  if (btnPrev) {
    btnPrev.onclick = () => {
      if (currentStep > 1) {
        currentStep--;
        updateStepView();
      }
    };
  }
}

function initTabNavigation() {
  const navButtons = document.querySelectorAll('[data-tab]');
  const tabViews = document.querySelectorAll('.tab-view');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      navButtons.forEach(b => {
        if (b.getAttribute('data-tab') === targetTab) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      tabViews.forEach(view => {
        if (view.id === `tab-${targetTab}`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });

      if (targetTab === 'dashboard') {
        window.ui.updateDashboard();
      } else if (targetTab === 'upcoming') {
        window.ui.renderUpcomingExpenses();
      } else if (targetTab === 'transactions') {
        window.ui.renderTransactionsTable();
      } else if (targetTab === 'budgets') {
        window.ui.renderBudgetsAndGoals();
      }
    });
  });

  document.querySelectorAll('[data-tab-jump]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabTarget = link.getAttribute('data-tab-jump');
      const targetBtn = document.querySelector(`.nav-item[data-tab="${tabTarget}"], .bottom-nav-item[data-tab="${tabTarget}"]`);
      if (targetBtn) targetBtn.click();
    });
  });
}

function initMonthSelector() {
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      window.ui.currentMonth--;
      if (window.ui.currentMonth < 0) {
        window.ui.currentMonth = 11;
        window.ui.currentYear--;
      }
      refreshAll();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      window.ui.currentMonth++;
      if (window.ui.currentMonth > 11) {
        window.ui.currentMonth = 0;
        window.ui.currentYear++;
      }
      refreshAll();
    });
  }
}

function initModalHandlers() {
  const txModal = document.getElementById('transactionModal');
  const openAddBtns = document.querySelectorAll('.openAddModalBtn');
  const txForm = document.getElementById('transactionForm');

  openAddBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      resetTxForm();
      document.getElementById('transactionModalTitle').innerHTML = '<i class="fa-solid fa-circle-plus"></i> Nova Transação';
      txModal.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.closeModalBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    });
  });

  const typeBtns = document.querySelectorAll('.type-btn');
  const txCardSelect = document.getElementById('txCard');
  const txAmountInput = document.getElementById('txAmount');
  const txInstallmentsGroup = document.getElementById('txInstallmentsGroup');
  const txInstallmentsSelect = document.getElementById('txInstallments');
  const txInstallmentDisplay = document.getElementById('txInstallmentAmountDisplay');

  function updateInstallmentsVisibility() {
    const cardId = txCardSelect ? txCardSelect.value : '';
    const type = document.querySelector('input[name="txType"]:checked')?.value || 'despesa';

    if (cardId && type === 'despesa') {
      if (txInstallmentsGroup) txInstallmentsGroup.classList.remove('hidden');
      calcInstallmentDisplay();
    } else {
      if (txInstallmentsGroup) txInstallmentsGroup.classList.add('hidden');
      if (txInstallmentsSelect) txInstallmentsSelect.value = '1';
    }
  }

  function calcInstallmentDisplay() {
    const amount = parseFloat(txAmountInput ? txAmountInput.value : 0) || 0;
    const count = parseInt(txInstallmentsSelect ? txInstallmentsSelect.value : 1) || 1;
    if (amount > 0 && count > 1) {
      const perMonth = amount / count;
      if (txInstallmentDisplay) {
        txInstallmentDisplay.textContent = `R$ ${perMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mês`;
      }
    } else {
      if (txInstallmentDisplay) txInstallmentDisplay.textContent = `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (À vista)`;
    }
  }

  if (txCardSelect) txCardSelect.addEventListener('change', updateInstallmentsVisibility);
  if (txAmountInput) txAmountInput.addEventListener('input', calcInstallmentDisplay);
  if (txInstallmentsSelect) txInstallmentsSelect.addEventListener('change', calcInstallmentDisplay);

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateInstallmentsVisibility();
    });
  });

  if (txForm) {
    txForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const txId = document.getElementById('txId').value;
      const type = document.querySelector('input[name="txType"]:checked').value;
      const amount = parseFloat(document.getElementById('txAmount').value);
      const description = document.getElementById('txDescription').value;
      const category = document.getElementById('txCategory').value;
      const cardId = document.getElementById('txCard').value;
      const date = document.getElementById('txDate').value;
      const installments = parseInt(document.getElementById('txInstallments').value) || 1;

      if (!amount || !description || !date) {
        window.ui.showToast('Preencha todos os campos obrigatórios!', 'error');
        return;
      }

      const txData = { description, amount, type, category, cardId, date, installments };

      if (txId) {
        window.store.updateTransaction(txId, txData);
        window.ui.showToast('Transação atualizada!', 'success');
      } else {
        window.store.addTransaction(txData);
        window.ui.showToast('Nova transação adicionada!', 'success');
        const ach = window.store.checkFirstAchievement('first_tx');
        if (ach) window.ui.showAchievementModal(ach);
      }

      txModal.classList.add('hidden');
      refreshAll();
    });
  }

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-tx-btn');
    const deleteBtn = e.target.closest('.delete-tx-btn');
    const deleteGoalBtn = e.target.closest('.delete-goal-btn');

    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      const realId = id.includes('_inst_') ? id.split('_inst_')[0] : id;
      const tx = window.store.getTransactions().find(t => t.id === realId);
      if (tx) {
        document.getElementById('txId').value = tx.id;
        document.getElementById('txAmount').value = tx.amount;
        document.getElementById('txDescription').value = tx.description;
        document.getElementById('txCategory').value = tx.category;
        if (document.getElementById('txCard')) document.getElementById('txCard').value = tx.cardId || '';
        document.getElementById('txDate').value = tx.date;
        if (document.getElementById('txInstallments')) {
          document.getElementById('txInstallments').value = tx.installments || 1;
        }

        const typeRadio = document.querySelector(`input[name="txType"][value="${tx.type}"]`);
        if (typeRadio) {
          typeRadio.checked = true;
          typeBtns.forEach(b => b.classList.remove('active'));
          typeRadio.closest('.type-btn').classList.add('active');
        }

        updateInstallmentsVisibility();
        document.getElementById('transactionModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Transação';
        txModal.classList.remove('hidden');
      }
    }

    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (confirm('Excluir esta transação?')) {
        window.store.deleteTransaction(id);
        window.ui.showToast('Transação removida.', 'info');
        refreshAll();
      }
    }

    if (deleteGoalBtn) {
      const id = deleteGoalBtn.getAttribute('data-id');
      if (confirm('Excluir esta meta?')) {
        window.store.deleteGoal(id);
        window.ui.showToast('Meta excluída.', 'info');
        refreshAll();
      }
    }
  });

  const budgetModal = document.getElementById('budgetModal');
  const openBudgetBtn = document.getElementById('openBudgetModalBtn');
  const budgetForm = document.getElementById('budgetForm');

  if (openBudgetBtn) {
    openBudgetBtn.addEventListener('click', () => {
      budgetModal.classList.remove('hidden');
    });
  }

  if (budgetForm) {
    budgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cat = document.getElementById('budgetCategory').value;
      const limit = parseFloat(document.getElementById('budgetLimit').value);
      if (cat && limit > 0) {
        window.store.setBudget(cat, limit);
        window.ui.showToast('Orçamento salvo com sucesso!', 'success');
        budgetModal.classList.add('hidden');
        refreshAll();
      }
    });
  }

  const goalModal = document.getElementById('goalModal');
  const openGoalBtn = document.getElementById('openGoalModalBtn');
  const goalForm = document.getElementById('goalForm');

  if (openGoalBtn) {
    openGoalBtn.addEventListener('click', () => {
      goalForm.reset();
      goalModal.classList.remove('hidden');
    });
  }

  if (goalForm) {
    goalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('goalTitle').value;
      const target = parseFloat(document.getElementById('goalTarget').value);
      const current = parseFloat(document.getElementById('goalCurrent').value) || 0;

      if (title && target > 0) {
        window.store.addGoal({ title, target, current });
        window.ui.showToast('Meta criada!', 'success');
        goalModal.classList.add('hidden');
        refreshAll();

        const ach = window.store.checkFirstAchievement('first_goal');
        if (ach) window.ui.showAchievementModal(ach);
      }
    });
  }
}

function resetTxForm() {
  const form = document.getElementById('transactionForm');
  if (form) form.reset();
  document.getElementById('txId').value = '';
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
  
  const defaultRadio = document.querySelector('input[name="txType"][value="despesa"]');
  if (defaultRadio) {
    defaultRadio.checked = true;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    defaultRadio.closest('.type-btn').classList.add('active');
  }
}

function initTransactionFilters() {
  const searchInput = document.getElementById('searchInput');
  const filterType = document.getElementById('filterType');
  const filterCategory = document.getElementById('filterCategory');
  const filterCard = document.getElementById('filterCard');

  if (searchInput) searchInput.addEventListener('input', () => window.ui.renderTransactionsTable());
  if (filterType) filterType.addEventListener('change', () => window.ui.renderTransactionsTable());
  if (filterCategory) filterCategory.addEventListener('change', () => window.ui.renderTransactionsTable());
  if (filterCard) filterCard.addEventListener('change', () => window.ui.renderTransactionsTable());
}

function initDataHandlers() {
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      const jsonStr = window.store.exportJSON();
      downloadFile(jsonStr, `fenix_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      window.ui.showToast('Backup JSON baixado!');
    });
  }

  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const quickExportCsvBtn = document.getElementById('quickExportCsvBtn');

  const triggerCsv = () => {
    const csvStr = window.store.exportCSV();
    downloadFile(csvStr, `fenix_transacoes_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    window.ui.showToast('Planilha CSV baixada!');
  };

  if (exportCsvBtn) exportCsvBtn.addEventListener('click', triggerCsv);
  if (quickExportCsvBtn) quickExportCsvBtn.addEventListener('click', triggerCsv);

  const triggerImportBtn = document.getElementById('triggerImportBtn');
  const importJsonInput = document.getElementById('importJsonInput');

  if (triggerImportBtn && importJsonInput) {
    triggerImportBtn.addEventListener('click', () => importJsonInput.click());

    importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const success = window.store.importJSON(event.target.result);
        if (success) {
          window.ui.showToast('Backup restaurado!', 'success');
          refreshAll();
        } else {
          window.ui.showToast('Arquivo de backup inválido!', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  const clearDataBtn = document.getElementById('clearDataBtn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', () => {
      if (confirm('Deseja realmente resetar os lançamentos e cartões da conta ativa?')) {
        window.store.clearAllData();
        window.ui.showToast('Dados desta conta foram resetados.', 'info');
        refreshAll();
      }
    });
  }
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

function initPWASupport() {
  let deferredPrompt;
  const pwaInstallBtn = document.getElementById('pwaInstallBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBtn) pwaInstallBtn.classList.remove('hidden');
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          window.ui.showToast('Fenix Wallet instalado!');
        }
        deferredPrompt = null;
        pwaInstallBtn.classList.add('hidden');
      }
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('[ServiceWorker] Registrado.'))
      .catch(err => console.error('[ServiceWorker] Erro:', err));
  }
}

function initMobileDrawer() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }
}

function initPrivacyToggle() {
  const toggleBtn = document.getElementById('togglePrivacyBtn');
  const icon = document.getElementById('privacyIcon');

  if (toggleBtn && icon) {
    toggleBtn.addEventListener('click', () => {
      window.ui.isBalanceHidden = !window.ui.isBalanceHidden;
      icon.className = window.ui.isBalanceHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      window.ui.updateDashboard();
      window.ui.renderTransactionsTable();
    });
  }
}

function initPixBalanceHandlers() {
  const openBtn = document.getElementById('openPixModalBtn');
  const modal = document.getElementById('pixBalanceModal');
  const form = document.getElementById('pixBalanceForm');
  const input = document.getElementById('pixInitialInput');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      if (input) {
        input.value = window.store.getPixInitialBalance();
      }
      modal.classList.remove('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        window.store.setPixInitialBalance(val);
        modal.classList.add('hidden');
        refreshAll();
        window.ui.showToast('Saldo em Conta / PIX atualizado com sucesso!', 'success');
      }
    });
  }
}

function initForceUpdateHandler() {
  const btn = document.getElementById('forceUpdateBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      window.ui.showToast('Limpando cache e atualizando...', 'info');
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let r of regs) {
            await r.unregister();
          }
        }
      } catch (err) {
        console.error(err);
      }
      setTimeout(() => {
        window.location.reload(true);
      }, 500);
    });
  }
}


