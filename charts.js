/**
 * Fenix Wallet Charts - Módulo de Gráficos Otimizado para Mobile & Modo Noturno
 */

class FinanceCharts {
  constructor() {
    this.categoryChart = null;
    this.cashflowChart = null;
  }

  getChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      text: isDark ? '#cbd5e1' : '#475569',
      subtext: isDark ? '#94a3b8' : '#64748b',
      border: isDark ? '#1e293b' : '#ffffff',
      grid: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)'
    };
  }

  renderCategoryChart(year, month) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const totals = window.store.getCategoryTotalsForMonth(year, month);
    const catKeys = Object.keys(totals);
    const noDataEl = document.getElementById('noChartCategoryData');

    if (catKeys.length === 0) {
      if (this.categoryChart) {
        this.categoryChart.destroy();
        this.categoryChart = null;
      }
      ctx.style.display = 'none';
      if (noDataEl) noDataEl.classList.remove('hidden');
      return;
    }

    if (noDataEl) noDataEl.classList.add('hidden');
    ctx.style.display = 'block';

    const labels = [];
    const dataValues = [];
    const bgColors = [];

    catKeys.forEach(catId => {
      const catInfo = window.store.getCategoryInfo(catId);
      labels.push(catInfo.name);
      dataValues.push(totals[catId]);
      bgColors.push(catInfo.color);
    });

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    const colors = this.getChartColors();
    const isMobile = window.innerWidth <= 520;

    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: colors.border,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: isMobile ? 5 : 10
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: colors.text,
              font: { family: 'Plus Jakarta Sans', size: isMobile ? 10 : 12, weight: 600 },
              padding: isMobile ? 8 : 14,
              boxWidth: isMobile ? 10 : 14,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.parsed;
                return ` ${context.label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              }
            }
          }
        },
        cutout: isMobile ? '62%' : '72%'
      }
    });
  }

  renderCashflowChart(currentYear, currentMonth) {
    const ctx = document.getElementById('cashflowChart');
    if (!ctx) return;

    const labels = [];
    const incomes = [];
    const expenses = [];

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      let d = new Date(currentYear, currentMonth - i, 1);
      let y = d.getFullYear();
      let m = d.getMonth();

      labels.push(`${monthNames[m]} ${String(y).slice(2)}`);
      const summary = window.store.getMonthlySummary(y, m);
      incomes.push(summary.income);
      expenses.push(summary.expense);
    }

    if (this.cashflowChart) {
      this.cashflowChart.destroy();
    }

    const colors = this.getChartColors();
    const isMobile = window.innerWidth <= 520;

    this.cashflowChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Receitas',
            data: incomes,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 6,
            barPercentage: isMobile ? 0.75 : 0.6
          },
          {
            label: 'Despesas',
            data: expenses,
            backgroundColor: 'rgba(225, 29, 72, 0.85)',
            borderRadius: 6,
            barPercentage: isMobile ? 0.75 : 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: isMobile ? { left: 0, right: 5, top: 5, bottom: 0 } : { left: 5, right: 10, top: 10, bottom: 5 }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: colors.text,
              font: { family: 'Plus Jakarta Sans', size: isMobile ? 11 : 12, weight: 600 },
              usePointStyle: true,
              boxWidth: isMobile ? 8 : 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.parsed.y;
                return ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: colors.subtext,
              font: { family: 'Plus Jakarta Sans', size: isMobile ? 9.5 : 11, weight: 600 }
            }
          },
          y: {
            grid: { color: colors.grid },
            ticks: {
              color: colors.subtext,
              font: { family: 'Plus Jakarta Sans', size: isMobile ? 9.5 : 11, weight: 600 },
              callback: function(value) {
                if (isMobile && value >= 1000) {
                  return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                }
                return 'R$ ' + value.toLocaleString('pt-BR');
              }
            }
          }
        }
      }
    });
  }
}

window.charts = new FinanceCharts();
