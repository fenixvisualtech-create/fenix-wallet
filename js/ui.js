/**
 * Fenix Wallet UI - Módulo de Interface Avançado (Leitor de Extratos & 10 Avatares Fenix)
 */

class FinanceUI {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth();
    this.isBalanceHidden = false;
    this.selectedRegisterAvatar = AVATAR_PRESETS[0].url;
    this.selectedEditAvatar = null;
    this.selectedFilesToImport = [];
  }

  formatCurrency(value) {
    if (this.isBalanceHidden) {
      return '••••••••';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    if (!toast) return;

    toastMessage.textContent = message;

    if (type === 'success') {
      toastIcon.className = 'fa-solid fa-circle-check';
      toastIcon.style.color = '#10b981';
    } else if (type === 'error') {
      toastIcon.className = 'fa-solid fa-circle-xmark';
      toastIcon.style.color = '#e11d48';
    } else {
      toastIcon.className = 'fa-solid fa-circle-info';
      toastIcon.style.color = '#6366f1';
    }

    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  applyTheme(theme) {
    const html = document.documentElement;
    const icons = document.querySelectorAll('#themeIcon, #themeToggleBtnSettings i');

    if (theme === 'dark') {
      html.classList.add('dark');
      icons.forEach(i => i.className = 'fa-solid fa-sun');
    } else {
      html.classList.remove('dark');
      icons.forEach(i => i.className = 'fa-solid fa-moon');
    }
    window.store.setTheme(theme);
  }

  toggleTheme() {
    const current = window.store.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    this.showToast(`Tema ${next === 'dark' ? 'Noturno' : 'Claro'} ativado!`, 'info');
  }

  // --- DICAS FINANCEIRAS INTELIGENTES ---
  renderSmartInsights() {
    const textEl = document.getElementById('smartInsightText');
    if (!textEl) return;

    const summary = window.store.getMonthlySummary(this.currentYear, this.currentMonth);
    const categoryTotals = window.store.getCategoryTotalsForMonth(this.currentYear, this.currentMonth);

    if (summary.expense === 0 && summary.income === 0) {
      textEl.textContent = 'Adicione seus primeiros lançamentos ou importe um extrato bancário (OFX/CSV) para receber dicas personalizadas!';
      return;
    }

    let topCat = null;
    let maxVal = 0;
    Object.keys(categoryTotals).forEach(catId => {
      if (categoryTotals[catId] > maxVal) {
        maxVal = categoryTotals[catId];
        topCat = catId;
      }
    });

    if (topCat && summary.income > 0) {
      const catInfo = window.store.getCategoryInfo(topCat);
      const pct = Math.round((maxVal / summary.income) * 100);
      textEl.innerHTML = `Sua maior despesa este mês é em <strong>${catInfo.name}</strong>, representando <strong>${pct}% da sua receita</strong> (${this.formatCurrency(maxVal)}). Tente definir um teto no Orçamento!`;
    } else if (summary.savingsRate > 20) {
      textEl.innerHTML = `Parabéns! Sua taxa de poupança está em <strong>${summary.savingsRate}%</strong> este mês. Que tal destinar parte disso para suas Metas de Economia?`;
    } else {
      textEl.innerHTML = `Fique atento: Suas despesas do mês atingiram <strong>${this.formatCurrency(summary.expense)}</strong>. Mantenha suas contas em dia na aba Gastos Futuros.`;
    }
  }

  // --- GASTOS FUTUROS & CONTAS A PAGAR ---
  renderUpcomingExpenses() {
    const container = document.getElementById('upcomingExpensesList');
    const selectModalCat = document.getElementById('upCategory');

    if (selectModalCat) {
      const expenseCats = DEFAULT_CATEGORIES.filter(c => c.type === 'despesa');
      selectModalCat.innerHTML = expenseCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (!container || !window.store.getActiveAccountId()) return;

    const list = window.store.getUpcomingExpenses();

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhuma conta ou gasto futuro agendado.</p>
        </div>
      `;
      return;
    }

    const cards = window.store.getCards();
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = list.map(item => {
      const cat = window.store.getCategoryInfo(item.category);
      const card = cards.find(c => c.id === item.cardId);
      const cardLabel = card ? card.name : 'Pix / Boleto';

      const isPaid = item.status === 'paid';
      const isUrgent = !isPaid && item.dueDate <= today;

      let badgeText = 'Pendente';
      let badgeClass = 'pending';

      if (isPaid) {
        badgeText = 'Pago / Confirmado';
        badgeClass = 'paid';
      } else if (isUrgent) {
        badgeText = 'Vence Hoje / Atrasado';
        badgeClass = 'urgent';
      }

      return `
        <div class="upcoming-card-item">
          <div class="upcoming-left">
            <div class="tx-icon" style="background:${cat.color}15; color:${cat.color};">
              <i class="fa-solid ${cat.icon}"></i>
            </div>
            <div class="tx-details">
              <span class="tx-title">${item.description}</span>
              <span class="tx-meta">
                <span>Vencimento: ${this.formatDateBR(item.dueDate)}</span> • <span>${cardLabel}</span>
              </span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:1rem;">
            <div style="text-align:right;">
              <span class="tx-amount despesa">${this.formatCurrency(item.amount)}</span>
              <div><span class="badge-due ${badgeClass}">${badgeText}</span></div>
            </div>
            <div style="display:flex; gap:0.4rem;">
              ${!isPaid ? `
                <button class="btn btn-success btn-sm pay-upcoming-btn" data-id="${item.id}" title="Dar Baixa e Lançar Despesa">
                  <i class="fa-solid fa-check"></i> Pagar
                </button>
              ` : ''}
              <button class="action-btn delete delete-upcoming-btn" data-id="${item.id}" title="Excluir">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- RENDERS DE PERFIL E AUTENTICAÇÃO ---
  renderActiveUserProfile() {
    const activeAccount = window.store.getActiveAccount();
    if (!activeAccount) return;

    const userAvatarImg = document.getElementById('userAvatarImg');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const topbarUserGreeting = document.getElementById('topbarUserGreeting');

    const profileSettingsAvatar = document.getElementById('profileSettingsAvatar');
    const profileNameInput = document.getElementById('profileNameInput');
    const profileEmailInput = document.getElementById('profileEmailInput');

    if (userAvatarImg) userAvatarImg.src = activeAccount.avatar;
    if (userNameDisplay) userNameDisplay.textContent = activeAccount.name;
    if (topbarUserGreeting) topbarUserGreeting.textContent = `Olá, ${activeAccount.name.split(' ')[0]}! 👋`;

    if (profileSettingsAvatar) profileSettingsAvatar.src = activeAccount.avatar;
    const profileAvatarUrlInput = document.getElementById('profileAvatarUrlInput');
    if (profileAvatarUrlInput) profileAvatarUrlInput.value = activeAccount.avatar;
    if (profileNameInput) profileNameInput.value = activeAccount.name;
    if (profileEmailInput) profileEmailInput.value = activeAccount.email;

    this.renderEditAvatarOptions();
  }

  renderAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    const selectView = document.getElementById('accountSelectView');
    const createView = document.getElementById('accountCreateView');
    const accountsGrid = document.getElementById('accountsGrid');
    const btnCancelCreate = document.getElementById('btnCancelCreateAccount');

    if (!overlay) return;

    const accounts = window.store.getAccounts();
    const activeAccount = window.store.getActiveAccount();

    if (!activeAccount) {
      overlay.classList.remove('hidden');

      if (accounts.length > 0) {
        selectView.classList.remove('hidden');
        createView.classList.add('hidden');

        accountsGrid.innerHTML = accounts.map(acc => `
          <div class="account-card-item select-account-btn" data-id="${acc.id}">
            <div class="acc-left">
              <img src="${acc.avatar}" class="acc-avatar" alt="${acc.name}" />
              <div class="acc-info">
                <span class="acc-name">${acc.name}</span>
                <span class="acc-email">${acc.email}</span>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: var(--accent-red-primary);"></i>
          </div>
        `).join('');
      } else {
        selectView.classList.add('hidden');
        createView.classList.remove('hidden');
        if (btnCancelCreate) btnCancelCreate.classList.add('hidden');
        this.renderAvatarOptions();
      }
    } else {
      overlay.classList.add('hidden');
      this.renderActiveUserProfile();
    }
  }

  renderAvatarOptions() {
    const container = document.getElementById('avatarOptionsContainer');
    if (!container) return;

    container.innerHTML = AVATAR_PRESETS.map((item, idx) => `
      <div class="avatar-option-card ${idx === 0 ? 'active' : ''}" data-url="${item.url}">
        <img src="${item.url}" class="avatar-option-img" alt="${item.name}" />
        <span class="avatar-option-name">${item.name}</span>
      </div>
    `).join('');

    this.selectedRegisterAvatar = AVATAR_PRESETS[0].url;

    container.querySelectorAll('.avatar-option-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.avatar-option-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedRegisterAvatar = card.getAttribute('data-url');
      });
    });
  }

  renderEditAvatarOptions() {
    const container = document.getElementById('editAvatarOptionsContainer');
    if (!container) return;

    const activeAccount = window.store.getActiveAccount();

    container.innerHTML = AVATAR_PRESETS.map((item) => `
      <div class="avatar-option-card ${activeAccount && activeAccount.avatar === item.url ? 'active' : ''}" data-url="${item.url}">
        <img src="${item.url}" class="avatar-option-img" alt="${item.name}" />
        <span class="avatar-option-name">${item.name}</span>
      </div>
    `).join('');

    container.querySelectorAll('.avatar-option-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.avatar-option-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedEditAvatar = card.getAttribute('data-url');
        const inputUrl = document.getElementById('profileAvatarUrlInput');
        if (inputUrl) inputUrl.value = this.selectedEditAvatar;
        const profileSettingsAvatar = document.getElementById('profileSettingsAvatar');
        if (profileSettingsAvatar) profileSettingsAvatar.src = this.selectedEditAvatar;
      });
    });
  }

  populateCategorySelects() {
    const txSelect = document.getElementById('txCategory');
    const filterSelect = document.getElementById('filterCategory');
    const budgetSelect = document.getElementById('budgetCategory');

    if (txSelect) {
      txSelect.innerHTML = DEFAULT_CATEGORIES.map(c => 
        `<option value="${c.id}">${c.type === 'receita' ? '[Receita]' : '[Despesa]'} ${c.name}</option>`
      ).join('');
    }

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">Todas as Categorias</option>' +
        DEFAULT_CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (budgetSelect) {
      const expenseCats = DEFAULT_CATEGORIES.filter(c => c.type === 'despesa');
      budgetSelect.innerHTML = expenseCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  }

  renderCreditCards() {
    const container = document.getElementById('cardsSliderContainer');
    const txCardSelect = document.getElementById('txCard');
    const filterCardSelect = document.getElementById('filterCard');

    if (!window.store.getActiveAccountId()) return;

    const cards = window.store.getCards();

    if (txCardSelect) {
      txCardSelect.innerHTML = '<option value="">Dinheiro / PIX</option>' +
        cards.map(c => `<option value="${c.id}">${c.name} (${c.number})</option>`).join('');
    }

    if (filterCardSelect) {
      filterCardSelect.innerHTML = '<option value="all">Todos os Cartões</option>' +
        '<option value="">Dinheiro / PIX</option>' +
        cards.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (!container) return;

    if (cards.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:1.5rem; width:100%;">
          <p>Nenhum cartão cadastrado. Clique em "+ Novo Cartão".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = cards.map(card => {
      const spent = window.store.getCardSpentTotal(card.id, this.currentYear, this.currentMonth);
      const limit = parseFloat(card.limit) || 1;
      const pct = Math.min(100, Math.round((spent / limit) * 100));

      return `
        <div class="card-slide-item" style="background: ${card.colorGradient};">
          <div class="card-top-row">
            <div>
              <span class="card-name-title">${card.name}</span>
              <div class="card-number-display">${card.number}</div>
            </div>
            <span class="card-brand-tag">${card.brand}</span>
          </div>

          <div class="card-spent-info">
            <span class="spent-label">Gastos na Fatura Atual</span>
            <span class="spent-value">${this.formatCurrency(spent)}</span>
            <div class="card-limit-bar">
              <div class="card-limit-fill" style="width: ${pct}%;"></div>
            </div>
          </div>

          <div class="card-bottom-meta">
            <span>Limite: ${this.formatCurrency(card.limit)}</span>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span>Venc. dia ${card.dueDay}</span>
              <button class="mini-btn delete-card-btn" data-id="${card.id}" title="Excluir Cartão" style="width:24px; height:24px; font-size:0.7rem;">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  updateMonthDisplay() {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const displayEl = document.getElementById('currentMonthDisplay');
    if (displayEl) {
      displayEl.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
    }
  }

  updateDashboard() {
    if (!window.store.getActiveAccountId()) return;

    this.updateMonthDisplay();
    this.renderActiveUserProfile();
    this.renderCreditCards();
    this.renderSmartInsights();
    this.renderUpcomingExpenses();

    const summary = window.store.getMonthlySummary(this.currentYear, this.currentMonth);
    const totalBalance = window.store.getTotalBalanceAllTime();

    const elBalance = document.getElementById('statBalance');
    const elIncome = document.getElementById('statIncome');
    const elExpense = document.getElementById('statExpense');
    const elSavingsRate = document.getElementById('statSavingsRate');

    if (elBalance) elBalance.textContent = this.formatCurrency(totalBalance);
    if (elIncome) elIncome.textContent = this.formatCurrency(summary.income);
    if (elExpense) elExpense.textContent = this.formatCurrency(summary.expense);
    if (elSavingsRate) elSavingsRate.textContent = `${summary.savingsRate}%`;

    window.charts.renderCategoryChart(this.currentYear, this.currentMonth);
    window.charts.renderCashflowChart(this.currentYear, this.currentMonth);

    this.renderRecentTransactions();
    this.renderMiniGoals();
  }

  renderRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    if (!container) return;

    const list = window.store.getFilteredTransactions(this.currentYear, this.currentMonth).slice(0, 5);

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhum lançamento registrado neste mês.</p>
        </div>
      `;
      return;
    }

    const cards = window.store.getCards();

    container.innerHTML = list.map(t => {
      const cat = window.store.getCategoryInfo(t.category);
      const isIncome = t.type === 'receita';
      const card = cards.find(c => c.id === t.cardId);
      const cardLabel = card ? card.name : 'Dinheiro/PIX';

      return `
        <div class="tx-item">
          <div class="tx-left">
            <div class="tx-icon" style="background:${cat.color}15; color:${cat.color};">
              <i class="fa-solid ${cat.icon}"></i>
            </div>
            <div class="tx-details">
              <span class="tx-title">${t.description}</span>
              <span class="tx-meta">
                <span>${cat.name}</span> • <span>${cardLabel}</span> • <span>${this.formatDateBR(t.date)}</span>
              </span>
            </div>
          </div>
          <div class="tx-amount ${t.type}">
            ${isIncome ? '+' : '-'} ${this.formatCurrency(t.amount)}
          </div>
        </div>
      `;
    }).join('');
  }

  renderMiniGoals() {
    const container = document.getElementById('miniGoalsList');
    if (!container) return;

    const goals = window.store.getGoals();

    if (goals.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhuma meta financeira criada.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = goals.map(g => {
      const pct = Math.min(100, Math.round((g.current / g.target) * 100));
      return `
        <div class="goal-item" style="padding: 0.85rem;">
          <div class="goal-header">
            <span class="goal-title">${g.title}</span>
            <span class="goal-values">${pct}% (${this.formatCurrency(g.current)})</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill goal" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderTransactionsTable() {
    if (!window.store.getActiveAccountId()) return;

    const tbody = document.getElementById('fullTransactionsTableBody');
    const mobileContainer = document.getElementById('mobileTransactionsList');
    const emptyState = document.getElementById('emptyTransactionsState');

    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterCategory = document.getElementById('filterCategory')?.value || 'all';
    const filterCard = document.getElementById('filterCard')?.value || 'all';
    const search = document.getElementById('searchInput')?.value || '';

    const list = window.store.getFilteredTransactions(this.currentYear, this.currentMonth, {
      type: filterType,
      category: filterCategory,
      cardId: filterCard,
      search: search
    });

    const cards = window.store.getCards();

    if (list.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (mobileContainer) mobileContainer.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (tbody) {
      tbody.innerHTML = list.map(t => {
        const cat = window.store.getCategoryInfo(t.category);
        const isIncome = t.type === 'receita';
        const card = cards.find(c => c.id === t.cardId);
        const cardLabel = card ? card.name : 'Dinheiro / PIX';

        return `
          <tr>
            <td>${this.formatDateBR(t.date)}</td>
            <td>
              <span class="badge-cat" style="background:${cat.color}15; color:${cat.color}; border: 1px solid ${cat.color}30;">
                <i class="fa-solid ${cat.icon}"></i> ${cat.name}
              </span>
            </td>
            <td><strong>${cardLabel}</strong></td>
            <td><strong>${t.description}</strong></td>
            <td>
              <span class="badge-cat ${isIncome ? 'receita' : 'despesa'}" style="background:${isIncome ? 'rgba(16,185,129,0.12)' : 'rgba(225,29,72,0.12)'}; color:${isIncome ? '#10b981' : '#e11d48'};">
                ${isIncome ? 'Receita' : 'Despesa'}
              </span>
            </td>
            <td class="text-right tx-amount ${t.type}">
              ${isIncome ? '+' : '-'} ${this.formatCurrency(t.amount)}
            </td>
            <td class="text-center">
              <div class="table-actions">
                <button class="action-btn edit-tx-btn" data-id="${t.id}" title="Editar">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn delete delete-tx-btn" data-id="${t.id}" title="Excluir">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (mobileContainer) {
      mobileContainer.innerHTML = list.map(t => {
        const cat = window.store.getCategoryInfo(t.category);
        const isIncome = t.type === 'receita';
        const card = cards.find(c => c.id === t.cardId);
        const cardLabel = card ? card.name : 'Dinheiro/PIX';

        return `
          <div class="tx-item">
            <div class="tx-left">
              <div class="tx-icon" style="background:${cat.color}15; color:${cat.color};">
                <i class="fa-solid ${cat.icon}"></i>
              </div>
              <div class="tx-details">
                <span class="tx-title">${t.description}</span>
                <span class="tx-meta">${cat.name} • ${cardLabel}</span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.3rem;">
              <span class="tx-amount ${t.type}">${isIncome ? '+' : '-'} ${this.formatCurrency(t.amount)}</span>
              <div style="display:flex; gap:0.4rem;">
                <button class="action-btn edit-tx-btn" data-id="${t.id}" style="width:28px; height:28px;"><i class="fa-solid fa-pen" style="font-size:0.75rem;"></i></button>
                <button class="action-btn delete delete-tx-btn" data-id="${t.id}" style="width:28px; height:28px;"><i class="fa-solid fa-trash" style="font-size:0.75rem;"></i></button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  renderBudgetsAndGoals() {
    if (!window.store.getActiveAccountId()) return;

    const budgetsContainer = document.getElementById('budgetsList');
    if (budgetsContainer) {
      const budgets = window.store.getBudgets();
      const monthlyTotals = window.store.getCategoryTotalsForMonth(this.currentYear, this.currentMonth);
      const catKeys = Object.keys(budgets);

      if (catKeys.length === 0) {
        budgetsContainer.innerHTML = `
          <div class="empty-state">
            <p>Nenhum teto de gastos definido ainda.</p>
          </div>
        `;
      } else {
        budgetsContainer.innerHTML = catKeys.map(catId => {
          const limit = budgets[catId];
          const spent = monthlyTotals[catId] || 0;
          const pct = Math.min(100, Math.round((spent / limit) * 100));
          const cat = window.store.getCategoryInfo(catId);

          let statusClass = 'normal';
          if (pct >= 100) statusClass = 'danger';
          else if (pct >= 80) statusClass = 'warning';

          return `
            <div class="budget-item">
              <div class="budget-header">
                <span class="budget-title">
                  <i class="fa-solid ${cat.icon}" style="color:${cat.color}"></i> ${cat.name}
                </span>
                <span class="budget-values">${this.formatCurrency(spent)} / ${this.formatCurrency(limit)} (${pct}%)</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill ${statusClass}" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    const goalsContainer = document.getElementById('goalsList');
    if (goalsContainer) {
      const goals = window.store.getGoals();

      if (goals.length === 0) {
        goalsContainer.innerHTML = `
          <div class="empty-state">
            <p>Nenhuma meta criada ainda.</p>
          </div>
        `;
      } else {
        goalsContainer.innerHTML = goals.map(g => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100));
          return `
            <div class="goal-item">
              <div class="goal-header">
                <span class="goal-title">${g.title}</span>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span class="goal-values">${this.formatCurrency(g.current)} / ${this.formatCurrency(g.target)} (${pct}%)</span>
                  <button class="action-btn delete delete-goal-btn" data-id="${g.id}" title="Excluir Meta">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill goal" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }
}

window.ui = new FinanceUI();
