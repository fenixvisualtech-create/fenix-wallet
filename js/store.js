/**
 * Fenix Wallet Store - Extratos Bancários, Gastos Futuros & Insights
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

  // --- GERENCIAMENTO DE TEMA (DARK / LIGHT) ---
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  }

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  // --- CONTAS E AUTENTICAÇÃO ---
  getAccounts() {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    return data ? JSON.parse(data) : [];
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

  createAccount(name, email, avatar) {
    const accounts = this.getAccounts();
    const newAccount = {
      id: 'acc_' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
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

  // --- GERENCIAMENTO DE DADOS ISOLADOS ---
  getAccountStorageKey(key) {
    const activeId = this.getActiveAccountId();
    if (!activeId) throw new Error('Nenhuma conta ativa!');
    return `${STORAGE_KEYS.DATA_PREFIX}${activeId}_${key}`;
  }

  seedInitialDataForAccount(accountId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

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
      { id: 'tx_1', description: 'Salário Mensal', amount: 6500.00, type: 'receita', category: 'salario', date: `${year}-${month}-01`, cardId: '' },
      { id: 'tx_2', description: 'Supermercado Mensal', amount: 840.50, type: 'despesa', category: 'alimentacao', date: `${year}-${month}-03`, cardId: 'card_fenix_red' },
      { id: 'tx_3', description: 'Aluguel & Contas', amount: 1900.00, type: 'despesa', category: 'moradia', date: `${year}-${month}-05`, cardId: '' },
      { id: 'tx_4', description: 'Assinatura Netflix & Spotify', amount: 85.90, type: 'despesa', category: 'lazer', date: `${year}-${month}-08`, cardId: 'card_nubank' },
      { id: 'tx_5', description: 'Combustível & Uber', amount: 280.00, type: 'despesa', category: 'transporte', date: `${year}-${month}-12`, cardId: 'card_fenix_red' }
    ];

    const sampleUpcoming = [
      { id: 'up_1', description: 'Fatura do Cartão Fenix Red', amount: 1120.50, category: 'moradia', dueDate: `${year}-${month}-15`, cardId: 'card_fenix_red', status: 'pending' },
      { id: 'up_2', description: 'Assinatura Claude Max', amount: 299.00, category: 'lazer', dueDate: `${year}-${month}-22`, cardId: 'card_nubank', status: 'pending' },
      { id: 'up_3', description: 'Plano de Saúde', amount: 450.00, category: 'saude', dueDate: `${year}-${month}-28`, cardId: '', status: 'pending' }
    ];

    const sampleBudgets = { alimentacao: 1200, moradia: 2200, lazer: 600 };
    const sampleGoals = [
      { id: 'g_1', title: 'Reserva de Emergência', target: 15000, current: 9500 },
      { id: 'g_2', title: 'Viagem de Fim de Ano', target: 5000, current: 3200 }
    ];

    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_cards`, JSON.stringify(sampleCards));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_transactions`, JSON.stringify(sampleTransactions));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_upcoming`, JSON.stringify(sampleUpcoming));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_budgets`, JSON.stringify(sampleBudgets));
    localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${accountId}_goals`, JSON.stringify(sampleGoals));
  }

  // --- GASTOS FUTUROS & CONTAS A PAGAR ---
  getUpcomingExpenses() {
    const data = localStorage.getItem(this.getAccountStorageKey('upcoming'));
    return data ? JSON.parse(data) : [];
  }

  saveUpcomingExpenses(list) {
    localStorage.setItem(this.getAccountStorageKey('upcoming'), JSON.stringify(list));
  }

  addUpcomingExpense(item) {
    const list = this.getUpcomingExpenses();
    item.id = 'up_' + Date.now();
    item.status = 'pending';
    list.push(item);
    this.saveUpcomingExpenses(list);
    return item;
  }

  markUpcomingPaid(id) {
    const list = this.getUpcomingExpenses();
    const item = list.find(u => u.id === id);
    if (item) {
      item.status = 'paid';
      this.saveUpcomingExpenses(list);

      this.addTransaction({
        description: item.description,
        amount: item.amount,
        type: 'despesa',
        category: item.category || 'outros_despesa',
        cardId: item.cardId || '',
        date: new Date().toISOString().split('T')[0]
      });
      return true;
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
          cardId: ''
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
            cardId: ''
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
    const data = localStorage.getItem(this.getAccountStorageKey('cards'));
    return data ? JSON.parse(data) : [];
  }

  saveCards(cards) {
    localStorage.setItem(this.getAccountStorageKey('cards'), JSON.stringify(cards));
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
    const txs = this.getFilteredTransactions(year, month, { type: 'despesa' });
    let total = 0;
    txs.forEach(t => {
      if (t.cardId === cardId) {
        total += parseFloat(t.amount);
      }
    });
    return total;
  }

  // --- TRANSAÇÕES ---
  getTransactions() {
    const data = localStorage.getItem(this.getAccountStorageKey('transactions'));
    return data ? JSON.parse(data) : [];
  }

  saveTransactions(transactions) {
    localStorage.setItem(this.getAccountStorageKey('transactions'), JSON.stringify(transactions));
  }

  addTransaction(tx) {
    const transactions = this.getTransactions();
    tx.id = 'tx_' + Date.now();
    transactions.unshift(tx);
    this.saveTransactions(transactions);
    return tx;
  }

  updateTransaction(id, updatedTx) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updatedTx, id };
      this.saveTransactions(transactions);
    }
  }

  deleteTransaction(id) {
    const transactions = this.getTransactions().filter(t => t.id !== id);
    this.saveTransactions(transactions);
  }

  // --- ORÇAMENTOS & METAS ---
  getBudgets() {
    const data = localStorage.getItem(this.getAccountStorageKey('budgets'));
    return data ? JSON.parse(data) : {};
  }

  saveBudgets(budgets) {
    localStorage.setItem(this.getAccountStorageKey('budgets'), JSON.stringify(budgets));
  }

  setBudget(category, limit) {
    const budgets = this.getBudgets();
    budgets[category] = parseFloat(limit);
    this.saveBudgets(budgets);
  }

  getGoals() {
    const data = localStorage.getItem(this.getAccountStorageKey('goals'));
    return data ? JSON.parse(data) : [];
  }

  saveGoals(goals) {
    localStorage.setItem(this.getAccountStorageKey('goals'), JSON.stringify(goals));
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

  // --- CÁLCULOS & FILTROS ---
  getCategoryInfo(catId) {
    return DEFAULT_CATEGORIES.find(c => c.id === catId) || {
      id: catId, name: catId, icon: 'fa-folder', color: '#94a3b8', type: 'despesa'
    };
  }

  getFilteredTransactions(year, month, filters = {}) {
    let list = this.getTransactions();

    if (year && month !== undefined) {
      const monthStr = String(month + 1).padStart(2, '0');
      const targetPrefix = `${year}-${monthStr}`;
      list = list.filter(t => t.date.startsWith(targetPrefix));
    }

    if (filters.type && filters.type !== 'all') {
      list = list.filter(t => t.type === filters.type);
    }

    if (filters.category && filters.category !== 'all') {
      list = list.filter(t => t.category === filters.category);
    }

    if (filters.cardId && filters.cardId !== 'all') {
      list = list.filter(t => t.cardId === filters.cardId);
    }

    if (filters.search && filters.search.trim() !== '') {
      const query = filters.search.toLowerCase().trim();
      list = list.filter(t => t.description.toLowerCase().includes(query));
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
    const all = this.getTransactions();
    let balance = 0;
    all.forEach(t => {
      const val = parseFloat(t.amount);
      if (t.type === 'receita') balance += val;
      else balance -= val;
    });
    return balance;
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
    let csv = 'ID,Data,Tipo,Categoria,Cartao,Descricao,Valor\n';
    list.forEach(t => {
      const cat = this.getCategoryInfo(t.category).name;
      const card = cards.find(c => c.id === t.cardId);
      const cardName = card ? card.name : 'Dinheiro / Pix';
      csv += `"${t.id}","${t.date}","${t.type}","${cat}","${cardName}","${t.description.replace(/"/g, '""')}",${t.amount}\n`;
    });
    return csv;
  }

  clearAllData() {
    const activeId = this.getActiveAccountId();
    if (activeId) {
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_cards`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_transactions`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_upcoming`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_budgets`);
      localStorage.removeItem(`${STORAGE_KEYS.DATA_PREFIX}${activeId}_goals`);
    }
  }
}

window.store = new FinanceStore();
