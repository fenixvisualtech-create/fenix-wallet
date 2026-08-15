/**
 * Fenix Wallet Store - Extratos Bancários, Gastos Futuros, Insights, Saldo PIX & Parcelamento de Cartão
 */

const STORAGE_KEYS = {
  ACCOUNTS: 'fenix_accounts_v1',
  ACTIVE_ACCOUNT: 'fenix_active_account_id_v1',
  THEME: 'fenix_theme_preference_v1',
  DATA_PREFIX: 'fenix_data_'
};

const DEFAULT_CATEGORIES = [
  { id: 'alimentacao', name: 'Alimentação', icon: 'fa-utensils', color: '#f59e0b', type: 'despesa' },
  { id: 'moradia', name: 'Moradia & Contas', icon: 'fa-house', color: '#e11d48', type: 'despesa' },
  { id: 'transporte', name: 'Transporte', icon: 'fa-car', color: '#06b6d4', type: 'despesa' },
  { id: 'lazer', name: 'Lazer & Assinaturas', icon: 'fa-gamepad', color: '#ec4899', type: 'despesa' },
  { id: 'saude', name: 'Saúde & Farmácia', icon: 'fa-heart-pulse', color: '#ef4444', type: 'despesa' },
  { id: 'educacao', name: 'Educação & Cursos', icon: 'fa-graduation-cap', color: '#8b5cf6', type: 'despesa' },
  { id: 'outros_despesa', name: 'Outras Despesas', icon: 'fa-receipt', color: '#64748b', type: 'despesa' },
  { id: 'salario', name: 'Salário & Renda Fixa', icon: 'fa-money-bill-wave', color: '#10b981', type: 'receita' },
  { id: 'freelance', name: 'Freelance & Extras', icon: 'fa-laptop-code', color: '#3b82f6', type: 'receita' },
  { id: 'investimentos', name: 'Rendimentos & Inv.', icon: 'fa-chart-line', color: '#8b5cf6', type: 'receita' },
  { id: 'outros_receita', name: 'Outras Receitas', icon: 'fa-hand-holding-dollar', color: '#14b8a6', type: 'receita' }
];

const AVATAR_PRESETS = [
  { id: 'ash', name: 'Fênix Ash', url: 'assets/avatars/ash.jpg' },
  { id: 'blaze', name: 'Fênix Blaze', url: 'assets/avatars/blaze.jpg' },
  { id: 'ember', name: 'Fênix Ember', url: 'assets/avatars/ember.jpg' },
  { id: 'pyre', name: 'Fênix Pyre', url: 'assets/avatars/pyre.jpg' },
  { id: 'solaris', name: 'Fênix Solaris', url: 'assets/avatars/solaris.jpg' },
  { id: 'ignis', name: 'Fênix Ignis', url: 'assets/avatars/ignis.jpg' },
  { id: 'rebirth', name: 'Fênix Rebirth', url: 'assets/avatars/rebirth.jpg' },
  { id: 'cinder', name: 'Fênix Cinder', url: 'assets/avatars/cinder.jpg' },
  { id: 'flare', name: 'Fênix Flare', url: 'assets/avatars/flare.jpg' },
  { id: 'aether', name: 'Fênix Aether', url: 'assets/avatars/aether.jpg' }
];

class FinanceStore {
  constructor() {
    this.currentDate = new Date();
  }

  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  }

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  // --- CONTAS E AUTENTICAÇÃO ---
  getAccounts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }

  getActiveAccountId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT);
  }

  setActiveAccountId(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ACCOUNT);
    }
  }

  getActiveAccount() {
    const activeId = this.getActiveAccountId();
    if (!activeId) return null;
    return this.getAccounts().find(a => a.id === activeId) || null;
  }

  getRememberMe() {
    return localStorage.getItem('fenix_remember_me_v1') !== 'false';
  }

  setRememberMe(remember) {
    localStorage.setItem('fenix_remember_me_v1', remember ? 'true' : 'false');
  }

  loginWithEmail(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.email === cleanEmail);

    if (!account) {
      return { success: false, message: 'Conta não encontrada. Clique em "Criar Nova Conta".' };
    }

    if (account.password && account.password !== 'google_oauth' && account.password !== password) {
      return { success: false, message: 'Senha incorreta! Tente novamente.' };
    }

    this.setActiveAccountId(account.id);
    return { success: true, account };
  }

  loginWithGoogle(email, name) {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = this.getAccounts();
    let account = accounts.find(a => a.email === cleanEmail);

    if (!account) {
      account = this.createAccount(name || 'Usuário Google', cleanEmail, AVATAR_PRESETS[0].url, 'google_oauth');
    } else {
      this.setActiveAccountId(account.id);
    }
    return account;
  }

  createAccount(name, email, avatar, password = '') {
    const accounts = this.getAccounts();
    const cleanEmail = email.trim().toLowerCase();

    const existing = accounts.find(a => a.email === cleanEmail);
    if (existing) {
      this.setActiveAccountId(existing.id);
      return existing;
    }

    const newAccount = {
      id: 'acc_' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      password: password || '123456',
      avatar: avatar || AVATAR_PRESETS[0].url,
      createdAt: new Date().toISOString()
    };

    accounts.push(newAccount);
    this.saveAccounts(accounts);
    this.setActiveAccountId(newAccount.id);

    this.seedInitialDataForAccount(newAccount.id);
    return newAccount;
  }

  updateAccountProfile(updatedData) {
    const accounts = this.getAccounts();
    const activeId = this.getActiveAccountId();
    const index = accounts.findIndex(a => a.id === activeId);

    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updatedData };
      this.saveAccounts(accounts);
    }
  }

  switchAccount(accountId) {
    const accounts = this.getAccounts();
    const target = accounts.find(a => a.id === accountId);
    if (target) {
      this.setActiveAccountId(target.id);
      return target;
    }
    return null;
  }

  logout() {
    this.setActiveAccountId(null);
  }

  deleteAccount(accountId) {
    const targetId = accountId || this.getActiveAccountId();
    if (!targetId) return false;

    // 1. Remove todas as chaves de dados da conta no localStorage
    localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${targetId}_pix_initial`);
    localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${targetId}_cards`);
    localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${targetId}_transactions`);
    localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${targetId}_upcoming`);
    localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${targetId}_budgets`);
    localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${targetId}_goals`);
    localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${targetId}_achievements`);

    // 2. Remove a conta do cadastro geral
    const remainingAccounts = this.getAccounts().filter(a => a.id !== targetId);
    this.saveAccounts(remainingAccounts);

    // 3. Se for a conta ativa, desconecta
    if (this.getActiveAccountId() === targetId) {
      this.logout();
    }
    return true;
  }

  // --- ARMAZENAMENTO SEGURO POR CONTA ---
  getAccountStorageKey(key) {
    const activeId = this.getActiveAccountId();
    if (!activeId) return null;
    return `${STORAGE_KEYS.DATA_PREFIX}${activeId}_${key}`;
  }

  getPixInitialBalance() {
    const key = this.getAccountStorageKey('pix_initial');
    if (!key) return 2500.00;
    const val = localStorage.getItem(key);
    return val !== null ? parseFloat(val) : 2500.00;
  }

  setPixInitialBalance(amount) {
    const key = this.getAccountStorageKey('pix_initial');
    if (key) {
      localStorage.setItem(key, parseFloat(amount) || 0);
    }
  }

  getPixSummaryForMonth(year, month) {
    const initial = this.getPixInitialBalance();
    const all = this.getTransactions();

    let totalPixIncomeAllTime = 0;
    let totalPixExpenseAllTime = 0;
    let monthPixIncome = 0;
    let monthPixExpense = 0;

    const monthStr = String(month + 1).padStart(2, '0');
    const targetPrefix = `${year}-${monthStr}`;

    all.forEach(t => {
      if (!t.cardId || t.cardId === '') {
        const val = parseFloat(t.amount);
        if (t.type === 'receita') {
          totalPixIncomeAllTime += val;
          if (t.date && t.date.startsWith(targetPrefix)) monthPixIncome += val;
        } else if (t.type === 'despesa') {
          totalPixExpenseAllTime += val;
          if (t.date && t.date.startsWith(targetPrefix)) monthPixExpense += val;
        }
      }
    });

    const currentPixBalance = initial + totalPixIncomeAllTime - totalPixExpenseAllTime;

    return {
      currentBalance: currentPixBalance,
      monthIncome: monthPixIncome,
      monthExpense: monthPixExpense
    };
  }

  getAchievements() {
    const key = this.getAccountStorageKey('achievements');
    if (!key) return { first_card: false, first_tx: false, first_upcoming: false, first_goal: false, tour_done: false };
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { first_card: false, first_tx: false, first_upcoming: false, first_goal: false, tour_done: false };
  }

  saveAchievements(ach) {
    const key = this.getAccountStorageKey('achievements');
    if (key) localStorage.setItem(key, JSON.stringify(ach));
  }

  checkFirstAchievement(type) {
    const ach = this.getAchievements();
    if (!ach[type]) {
      ach[type] = true;
      this.saveAchievements(ach);

      const messages = {
        first_card: {
          title: '🎉 1º Cartão Cadastrado!',
          text: 'Parabéns! Esse é o seu primeiro cartão de crédito adicionado. Continue assim para ter o controle total das suas faturas!'
        },
        first_tx: {
          title: '🎉 1º Lançamento Financeiro!',
          text: 'Parabéns! Você fez seu primeiro registro no extrato. Continue acompanhando e descubra como melhorar suas finanças!'
        },
        first_upcoming: {
          title: '🎉 1ª Conta Agendada!',
          text: 'Parabéns! Essa é sua primeira conta a pagar agendada. Acompanhe os vencimentos para nunca pagar juros!'
        },
        first_goal: {
          title: '🎉 1ª Meta de Economia!',
          text: 'Parabéns! Sua primeira meta financeira foi criada. Mantenha o foco para conquistar seus objetivos!'
        }
      };

      return messages[type] || null;
    }
    return null;
  }

  seedInitialDataForAccount(accountId, isDemo = false) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    if (!isDemo) {
      // Novas contas registradas iniciam ZERADAS e LIMPAS
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_pix_initial`, '0');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_cards`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_transactions`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_upcoming`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_budgets`, JSON.stringify({}));
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_goals`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_achievements`, JSON.stringify({
        first_card: false, first_tx: false, first_upcoming: false, first_goal: false, tour_done: false
      }));
      return;
    }

    const sampleCards = [
      {
        id: 'card_fenix_red',
        name: 'Fenix Red Card',
        number: '•••• 5678',
        brand: 'VISA',
        limit: 8000.00,
        colorGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #881337 100%)',
        dueDay: 15
      },
      {
        id: 'card_nubank',
        name: 'Cartão Nubank',
        number: '•••• 9123',
        brand: 'MASTERCARD',
        limit: 4500.00,
        colorGradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 50%, #581c87 100%)',
        dueDay: 10
      }
    ];

    const sampleTransactions = [
      { id: 'tx_1', description: 'Salário Mensal via PIX', amount: 6500.00, type: 'receita', category: 'salario', date: `${year}-${month}-01`, cardId: '', installments: 1, installmentAmount: 6500.00 },
      { id: 'tx_2', description: 'Supermercado Mensal', amount: 840.50, type: 'despesa', category: 'alimentacao', date: `${year}-${month}-03`, cardId: 'card_fenix_red', installments: 1, installmentAmount: 840.50 }
    ];

    const sampleUpcoming = [
      { id: 'up_1', description: 'Internet Fibra 500 Mega', amount: 120.00, category: 'lazer', dueDate: `${year}-${month}-10`, cardId: '', status: 'pending', billType: 'recurring' },
      { id: 'up_2', description: 'Conta de Luz (Enel / Cemig)', amount: 185.40, category: 'moradia', dueDate: `${year}-${month}-15`, cardId: '', status: 'pending', billType: 'recurring' }
    ];

    const sampleBudgets = { alimentacao: 1200, moradia: 2200 };
    const sampleGoals = [{ id: 'g_1', title: 'Reserva de Emergência', target: 15000, current: 9500 }];

    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_pix_initial`, '2500');
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_cards`, JSON.stringify(sampleCards));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_transactions`, JSON.stringify(sampleTransactions));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_upcoming`, JSON.stringify(sampleUpcoming));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_budgets`, JSON.stringify(sampleBudgets));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_goals`, JSON.stringify(sampleGoals));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_achievements`, JSON.stringify({
      first_card: true, first_tx: true, first_upcoming: true, first_goal: true, tour_done: true
    }));
  }

  // --- GASTOS FUTUROS & CONTAS A PAGAR ---
  getUpcomingExpenses() {
    const key = this.getAccountStorageKey('upcoming');
    if (!key) return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  saveUpcomingExpenses(list) {
    const key = this.getAccountStorageKey('upcoming');
    if (key) localStorage.setItem(key, JSON.stringify(list));
  }

  addUpcomingExpense(item) {
    const list = this.getUpcomingExpenses();
    item.id = 'up_' + Date.now();
    item.status = 'pending';
    list.push(item);
    this.saveUpcomingExpenses(list);
    return item;
  }

  addOneMonthToDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      let y = parseInt(parts[0]);
      let m = parseInt(parts[1]); // 1-12
      let d = parseInt(parts[2]);

      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return dateStr;
  }

  markUpcomingPaid(id) {
    const list = this.getUpcomingExpenses();
    const item = list.find(u => u.id === id);
    if (item) {
      // 1. Lança a despesa real no extrato e debita do saldo
      this.addTransaction({
        description: item.description,
        amount: item.amount,
        type: 'despesa',
        category: item.category || 'outros_despesa',
        cardId: item.cardId || '',
        installments: 1,
        date: new Date().toISOString().split('T')[0]
      });

      if (item.billType === 'financing') {
        const remaining = (parseInt(item.remainingInstallments) || 1) - 1;
        if (remaining <= 0) {
          // Empréstimo / Financiamento Quitado! Remove da lista
          this.deleteUpcomingExpense(id);
          return { status: 'quitado', description: item.description };
        } else {
          // Atualiza parcelas restantes e avança a data de vencimento em 1 mês
          item.remainingInstallments = remaining;
          item.dueDate = this.addOneMonthToDate(item.dueDate);
          item.status = 'pending';
          this.saveUpcomingExpenses(list);
          return { status: 'paid_installment', remaining: remaining, description: item.description };
        }
      } else {
        // Recorrente Mensal (Luz, Água, Internet) - Avança vencimento para o próximo mês
        item.dueDate = this.addOneMonthToDate(item.dueDate);
        item.status = 'pending';
        this.saveUpcomingExpenses(list);
        return { status: 'paid_recurring', description: item.description };
      }
    }
    return false;
  }

  deleteUpcomingExpense(id) {
    const list = this.getUpcomingExpenses().filter(u => u.id !== id);
    this.saveUpcomingExpenses(list);
  }

  // --- PARSER DE EXTRATOS BANCÁRIOS (OFX & CSV MULTI-ARQUIVOS) ---
  parseOFXContent(text) {
    const transactions = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(text)) !== null) {
      const block = match[1];

      const typeMatch = /<TRNTYPE>(.*)/i.exec(block);
      const dateMatch = /<DTPOSTED>(.*)/i.exec(block);
      const amtMatch = /<TRNAMT>(.*)/i.exec(block);
      const nameMatch = /<NAME>(.*)/i.exec(block) || /<MEMO>(.*)/i.exec(block);

      if (amtMatch && dateMatch) {
        const rawAmt = parseFloat(amtMatch[1].trim());
        const isIncome = rawAmt > 0;
        const amount = Math.abs(rawAmt);

        let dateStr = new Date().toISOString().split('T')[0];
        const rawDate = dateMatch[1].trim();
        if (rawDate.length >= 8) {
          dateStr = `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`;
        }

        const description = nameMatch ? nameMatch[1].trim().replace(/[\r\n]/g, '') : 'Lançamento do Extrato';
        
        let category = isIncome ? 'salario' : 'outros_despesa';
        const descLower = description.toLowerCase();
        if (descLower.includes('mercado') || descLower.includes('padaria') || descLower.includes('ifood')) category = 'alimentacao';
        else if (descLower.includes('uber') || descLower.includes('posto') || descLower.includes('shell')) category = 'transporte';
        else if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('steam')) category = 'lazer';
        else if (descLower.includes('luz') || descLower.includes('agua') || descLower.includes('aluguel')) category = 'moradia';

        transactions.push({
          description,
          amount,
          type: isIncome ? 'receita' : 'despesa',
          category,
          date: dateStr,
          cardId: '',
          installments: 1,
          installmentAmount: amount
        });
      }
    }
    return transactions;
  }

  parseCSVContent(text) {
    const transactions = [];
    const lines = text.split('\n');

    lines.forEach(line => {
      const parts = line.split(/[,;]/);
      if (parts.length >= 3) {
        const dStr = parts[0].replace(/"/g, '').trim();
        const desc = parts[1].replace(/"/g, '').trim();
        const amtStr = parts[2].replace(/"/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const amt = parseFloat(amtStr);

        if (!isNaN(amt) && desc.length > 1 && dStr.length >= 8) {
          const isIncome = amt > 0;
          let formattedDate = new Date().toISOString().split('T')[0];
          if (dStr.includes('/')) {
            const dParts = dStr.split('/');
            if (dParts.length === 3) formattedDate = `${dParts[2]}-${dParts[1].padStart(2,'0')}-${dParts[0].padStart(2,'0')}`;
          } else if (dStr.includes('-')) {
            formattedDate = dStr;
          }

          transactions.push({
            description: desc,
            amount: Math.abs(amt),
            type: isIncome ? 'receita' : 'despesa',
            category: isIncome ? 'salario' : 'outros_despesa',
            date: formattedDate,
            cardId: '',
            installments: 1,
            installmentAmount: Math.abs(amt)
          });
        }
      }
    });
    return transactions;
  }

  importMultipleStatements(filesData) {
    let totalImported = 0;
    const currentTxs = this.getTransactions();

    filesData.forEach(file => {
      let parsed = [];
      if (file.name.toLowerCase().endsWith('.ofx') || file.content.includes('<OFX>')) {
        parsed = this.parseOFXContent(file.content);
      } else if (file.name.toLowerCase().endsWith('.csv') || file.content.includes(';')) {
        parsed = this.parseCSVContent(file.content);
      }

      parsed.forEach(t => {
        t.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        currentTxs.unshift(t);
        totalImported++;
      });
    });

    if (totalImported > 0) {
      this.saveTransactions(currentTxs);
    }
    return totalImported;
  }

  // --- CARTÕES DE CRÉDITO ---
  getCards() {
    const key = this.getAccountStorageKey('cards');
    if (!key) return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  saveCards(cards) {
    const key = this.getAccountStorageKey('cards');
    if (key) localStorage.setItem(key, JSON.stringify(cards));
  }

  addCard(card) {
    const cards = this.getCards();
    card.id = 'card_' + Date.now();
    cards.push(card);
    this.saveCards(cards);
    return card;
  }

  deleteCard(cardId) {
    const cards = this.getCards().filter(c => c.id !== cardId);
    this.saveCards(cards);
  }

  getCardSpentTotal(cardId, year, month) {
    const txs = this.getFilteredTransactions(year, month, { type: 'despesa', cardId: cardId });
    let total = 0;
    txs.forEach(t => {
      total += parseFloat(t.amount);
    });
    return total;
  }

  // --- TRANSAÇÕES ---
  getTransactions() {
    const key = this.getAccountStorageKey('transactions');
    if (!key) return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  saveTransactions(transactions) {
    const key = this.getAccountStorageKey('transactions');
    if (key) localStorage.setItem(key, JSON.stringify(transactions));
  }

  addTransaction(tx) {
    const transactions = this.getTransactions();
    tx.id = 'tx_' + Date.now();

    const instCount = parseInt(tx.installments) || 1;
    tx.installments = instCount;

    if (tx.cardId && instCount > 1) {
      const totalAmt = parseFloat(tx.amount);
      tx.installmentAmount = Math.round((totalAmt / instCount) * 100) / 100;
    } else {
      tx.installments = 1;
      tx.installmentAmount = parseFloat(tx.amount);
    }

    transactions.unshift(tx);
    this.saveTransactions(transactions);
    return tx;
  }

  updateTransaction(id, updatedTx) {
    const targetId = id.includes('_inst_') ? id.split('_inst_')[0] : id;
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === targetId);
    if (index !== -1) {
      const instCount = parseInt(updatedTx.installments) || 1;
      updatedTx.installments = instCount;
      if (updatedTx.cardId && instCount > 1) {
        updatedTx.installmentAmount = Math.round((parseFloat(updatedTx.amount) / instCount) * 100) / 100;
      } else {
        updatedTx.installments = 1;
        updatedTx.installmentAmount = parseFloat(updatedTx.amount);
      }

      transactions[index] = { ...transactions[index], ...updatedTx, id: targetId };
      this.saveTransactions(transactions);
    }
  }

  deleteTransaction(id) {
    const targetId = id.includes('_inst_') ? id.split('_inst_')[0] : id;
    const transactions = this.getTransactions().filter(t => t.id !== targetId && t.id !== id);
    this.saveTransactions(transactions);
  }

  // --- ORÇAMENTOS & METAS ---
  getBudgets() {
    const key = this.getAccountStorageKey('budgets');
    if (!key) return {};
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }

  saveBudgets(budgets) {
    const key = this.getAccountStorageKey('budgets');
    if (key) localStorage.setItem(key, JSON.stringify(budgets));
  }

  setBudget(category, limit) {
    const budgets = this.getBudgets();
    budgets[category] = parseFloat(limit);
    this.saveBudgets(budgets);
  }

  getGoals() {
    const key = this.getAccountStorageKey('goals');
    if (!key) return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  saveGoals(goals) {
    const key = this.getAccountStorageKey('goals');
    if (key) localStorage.setItem(key, JSON.stringify(goals));
  }

  addGoal(goal) {
    const goals = this.getGoals();
    goal.id = 'g_' + Date.now();
    goals.push(goal);
    this.saveGoals(goals);
  }

  deleteGoal(id) {
    const goals = this.getGoals().filter(g => g.id !== id);
    this.saveGoals(goals);
  }

  // --- CÁLCULOS & FILTROS COM SUPORTE A COMPRAS PARCELADAS NO CARTÃO ---
  getCategoryInfo(catId) {
    return DEFAULT_CATEGORIES.find(c => c.id === catId) || {
      id: catId, name: catId, icon: 'fa-folder', color: '#94a3b8', type: 'despesa'
    };
  }

  getFilteredTransactions(year, month, filters = {}) {
    const rawList = this.getTransactions();
    let processedList = [];

    if (year !== undefined && month !== undefined) {
      const targetYear = parseInt(year);
      const targetMonth = parseInt(month); // 0-based

      rawList.forEach(t => {
        const instCount = parseInt(t.installments) || 1;

        if (instCount > 1 && t.cardId) {
          if (t.date) {
            const pParts = t.date.split('-');
            if (pParts.length === 3) {
              const pYear = parseInt(pParts[0]);
              const pMonth = parseInt(pParts[1]) - 1;

              const diffMonths = (targetYear - pYear) * 12 + (targetMonth - pMonth);

              if (diffMonths >= 0 && diffMonths < instCount) {
                const currentInst = diffMonths + 1;
                const instAmt = t.installmentAmount || (parseFloat(t.amount) / instCount);
                
                processedList.push({
                  ...t,
                  id: `${t.id}_inst_${currentInst}`,
                  realId: t.id,
                  description: `${t.description} (${currentInst}/${instCount})`,
                  amount: instAmt,
                  currentInstallment: currentInst,
                  totalInstallments: instCount,
                  date: t.date
                });
              }
            }
          }
        } else {
          const monthStr = String(targetMonth + 1).padStart(2, '0');
          const targetPrefix = `${targetYear}-${monthStr}`;
          if (t.date && t.date.startsWith(targetPrefix)) {
            processedList.push(t);
          }
        }
      });
    } else {
      processedList = rawList;
    }

    let list = processedList;

    if (filters.type && filters.type !== 'all') {
      list = list.filter(t => t.type === filters.type);
    }

    if (filters.category && filters.category !== 'all') {
      list = list.filter(t => t.category === filters.category);
    }

    if (filters.cardId !== undefined && filters.cardId !== 'all') {
      list = list.filter(t => (t.cardId || '') === filters.cardId);
    }

    if (filters.search && filters.search.trim() !== '') {
      const query = filters.search.toLowerCase().trim();
      list = list.filter(t => t.description && t.description.toLowerCase().includes(query));
    }

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getMonthlySummary(year, month) {
    const list = this.getFilteredTransactions(year, month);
    let totalIncome = 0;
    let totalExpense = 0;

    list.forEach(t => {
      const val = parseFloat(t.amount);
      if (t.type === 'receita') totalIncome += val;
      else if (t.type === 'despesa') totalExpense += val;
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: netSavings,
      savingsRate: Math.max(0, savingsRate)
    };
  }

  getTotalBalanceAllTime() {
    const pix = this.getPixSummaryForMonth(this.currentDate.getFullYear(), this.currentDate.getMonth());
    return pix.currentBalance;
  }

  getCategoryTotalsForMonth(year, month) {
    const list = this.getFilteredTransactions(year, month, { type: 'despesa' });
    const totals = {};
    list.forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount);
    });
    return totals;
  }

  // --- IMPORT / EXPORT ---
  exportJSON() {
    const data = {
      version: '1.0',
      account: this.getActiveAccount(),
      exportedAt: new Date().toISOString(),
      pixInitialBalance: this.getPixInitialBalance(),
      cards: this.getCards(),
      transactions: this.getTransactions(),
      upcoming: this.getUpcomingExpenses(),
      budgets: this.getBudgets(),
      goals: this.getGoals()
    };
    return JSON.stringify(data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.pixInitialBalance) this.setPixInitialBalance(parsed.pixInitialBalance);
      if (parsed.cards && Array.isArray(parsed.cards)) this.saveCards(parsed.cards);
      if (parsed.transactions && Array.isArray(parsed.transactions)) this.saveTransactions(parsed.transactions);
      if (parsed.upcoming && Array.isArray(parsed.upcoming)) this.saveUpcomingExpenses(parsed.upcoming);
      if (parsed.budgets) this.saveBudgets(parsed.budgets);
      if (parsed.goals && Array.isArray(parsed.goals)) this.saveGoals(parsed.goals);
      return true;
    } catch (err) {
      console.error('Erro ao importar JSON:', err);
      return false;
    }
  }

  exportCSV() {
    const list = this.getTransactions();
    const cards = this.getCards();
    let csv = 'ID,Data,Tipo,Categoria,Cartao,Parcelas,Descricao,Valor\n';
    list.forEach(t => {
      const cat = this.getCategoryInfo(t.category).name;
      const card = cards.find(c => c.id === t.cardId);
      const cardName = card ? card.name : 'Dinheiro / Pix';
      const instStr = t.installments > 1 ? `${t.installments}x` : '1x';
      csv += `"${t.id}","${t.date}","${t.type}","${cat}","${cardName}","${instStr}","${(t.description || '').replace(/"/g, '""')}",${t.amount}\n`;
    });
    return csv;
  }

  clearAllData() {
    const activeId = this.getActiveAccountId();
    if (activeId) {
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_pix_initial`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_cards`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_transactions`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_upcoming`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_budgets`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_goals`);
    }
  }
}

window.store = new FinanceStore();
