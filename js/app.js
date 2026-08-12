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

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (form) form.reset();
      document.getElementById('upDueDate').value = new Date().toISOString().split('T')[0];
      if (modal) modal.classList.remove('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const description = document.getElementById('upDescription').value;
      const amount = parseFloat(document.getElementById('upAmount').value);
      const category = document.getElementById('upCategory').value;
      const dueDate = document.getElementById('upDueDate').value;

      if (!description || !amount || !dueDate) {
        window.ui.showToast('Preencha todos os campos do gasto futuro!', 'error');
        return;
      }

      window.store.addUpcomingExpense({ description, amount, category, dueDate });
      window.ui.showToast('Gasto futuro agendado!', 'success');
      if (modal) modal.classList.add('hidden');
      refreshAll();
    });
  }

  // Dar Baixa e Excluir Gasto Futuro
  document.addEventListener('click', (e) => {
    const payBtn = e.target.closest('.pay-upcoming-btn');
    const deleteUpcomingBtn = e.target.closest('.delete-upcoming-btn');

    if (payBtn) {
      const id = payBtn.getAttribute('data-id');
      const success = window.store.markUpcomingPaid(id);
      if (success) {
        window.ui.showToast('Conta confirmada e despesa lançada no seu saldo!', 'success');
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
    cardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cardName').value;
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
        brand,
        number: `•••• ${digits || '5678'}`,
        limit,
        dueDay,
        colorGradient
      };

      window.store.addCard(newCard);
      window.ui.showToast('Novo cartão adicionado!', 'success');
      cardModal.classList.add('hidden');
      refreshAll();
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

function initAuthSystem() {
  window.ui.renderAuthOverlay();

  const overlay = document.getElementById('authOverlay');
  const selectView = document.getElementById('accountSelectView');
  const createView = document.getElementById('accountCreateView');

  const btnGoToCreate = document.getElementById('btnGoToCreateAccount');
  const btnCancelCreate = document.getElementById('btnCancelCreateAccount');
  const createForm = document.getElementById('createAccountForm');

  if (btnGoToCreate) {
    btnGoToCreate.addEventListener('click', () => {
      selectView.classList.add('hidden');
      createView.classList.remove('hidden');
      if (btnCancelCreate) btnCancelCreate.classList.remove('hidden');
      window.ui.renderAvatarOptions();
    });
  }

  if (btnCancelCreate) {
    btnCancelCreate.addEventListener('click', () => {
      createView.classList.add('hidden');
      selectView.classList.remove('hidden');
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const avatar = window.ui.selectedRegisterAvatar;

      if (!name || !email) {
        window.ui.showToast('Preencha seu nome e e-mail!', 'error');
        return;
      }

      const newAccount = window.store.createAccount(name, email, avatar);
      window.ui.showToast(`Bem-vindo ao Fenix Wallet, ${newAccount.name}!`, 'success');
      
      overlay.classList.add('hidden');
      createForm.reset();
      refreshAll();
    });
  }

  document.addEventListener('click', (e) => {
    const cardBtn = e.target.closest('.select-account-btn');
    if (cardBtn) {
      const accId = cardBtn.getAttribute('data-id');
      const acc = window.store.switchAccount(accId);
      if (acc) {
        window.ui.showToast(`Conectado como ${acc.name}`, 'success');
        overlay.classList.add('hidden');
        refreshAll();
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
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
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

      if (!amount || !description || !date) {
        window.ui.showToast('Preencha todos os campos obrigatórios!', 'error');
        return;
      }

      const txData = { description, amount, type, category, cardId, date };

      if (txId) {
        window.store.updateTransaction(txId, txData);
        window.ui.showToast('Transação atualizada!', 'success');
      } else {
        window.store.addTransaction(txData);
        window.ui.showToast('Nova transação adicionada!', 'success');
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
      const tx = window.store.getTransactions().find(t => t.id === id);
      if (tx) {
        document.getElementById('txId').value = tx.id;
        document.getElementById('txAmount').value = tx.amount;
        document.getElementById('txDescription').value = tx.description;
        document.getElementById('txCategory').value = tx.category;
        if (document.getElementById('txCard')) document.getElementById('txCard').value = tx.cardId || '';
        document.getElementById('txDate').value = tx.date;

        const typeRadio = document.querySelector(`input[name="txType"][value="${tx.type}"]`);
        if (typeRadio) {
          typeRadio.checked = true;
          typeBtns.forEach(b => b.classList.remove('active'));
          typeRadio.closest('.type-btn').classList.add('active');
        }

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

