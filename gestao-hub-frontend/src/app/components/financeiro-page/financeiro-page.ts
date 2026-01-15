import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

interface KPICard {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  color: string;
  bgColor: string;
}

interface CentroCusto {
  id: number;
  nome: string;
  previsto: number;
  realizado: number;
  percentual: number;
}

@Component({
  selector: 'app-financeiro-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './financeiro-page.html',
  styleUrls: ['./financeiro-page.css']
})
export class FinanceiroPageComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  selectedPeriodo: 'mensal' | 'acumulado' = 'mensal';
  selectedView: 'centro-custo' | 'plano-financeiro' = 'centro-custo';

  // KPIs
  kpiCards: KPICard[] = [];

  // Totais
  totalPagar = 0;
  totalReceber = 0;
  saldoLiquido = 0;

  // Acumulado
  totalPagarAcumulado = 0;
  totalReceberAcumulado = 0;

  // Centros de Custo / Plano Financeiro
  centrosCusto: CentroCusto[] = [];
  planosFinanceiros: CentroCusto[] = [];

  // Charts
  pagarReceberChart: Chart | null = null;
  comparativoChart: Chart | null = null;

  // Dados dos gráficos
  pagarReceberData = {
    labels: [] as string[],
    pagar: [] as number[],
    receber: [] as number[]
  };

  ngOnInit() {
    this.loadFinanceiroData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCharts();
    }, 100);
  }

  ngOnDestroy() {
    if (this.pagarReceberChart) {
      this.pagarReceberChart.destroy();
    }
    if (this.comparativoChart) {
      this.comparativoChart.destroy();
    }
  }

  async loadFinanceiroData() {
    this.isLoading = true;
    try {
      await this.loadMockData();
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadMockData() {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Totais Mensais
    this.totalPagar = 4850000;
    this.totalReceber = 7200000;
    this.saldoLiquido = this.totalReceber - this.totalPagar;

    // Totais Acumulados (ano)
    this.totalPagarAcumulado = 52300000;
    this.totalReceberAcumulado = 78500000;

    // Centros de Custo
    this.centrosCusto = [
      { id: 1, nome: 'Construção Civil', previsto: 2500000, realizado: 2380000, percentual: 95.2 },
      { id: 2, nome: 'Administrativo', previsto: 450000, realizado: 485000, percentual: 107.8 },
      { id: 3, nome: 'Marketing', previsto: 350000, realizado: 320000, percentual: 91.4 },
      { id: 4, nome: 'Comercial', previsto: 280000, realizado: 295000, percentual: 105.4 },
      { id: 5, nome: 'Jurídico', previsto: 180000, realizado: 165000, percentual: 91.7 },
      { id: 6, nome: 'RH', previsto: 220000, realizado: 218000, percentual: 99.1 },
      { id: 7, nome: 'TI', previsto: 150000, realizado: 142000, percentual: 94.7 },
      { id: 8, nome: 'Financeiro', previsto: 120000, realizado: 125000, percentual: 104.2 }
    ];

    // Planos Financeiros
    this.planosFinanceiros = [
      { id: 1, nome: 'Receitas de Vendas', previsto: 6500000, realizado: 7200000, percentual: 110.8 },
      { id: 2, nome: 'Custos Diretos', previsto: 3200000, realizado: 3050000, percentual: 95.3 },
      { id: 3, nome: 'Despesas Operacionais', previsto: 1200000, realizado: 1280000, percentual: 106.7 },
      { id: 4, nome: 'Investimentos', previsto: 800000, realizado: 720000, percentual: 90.0 },
      { id: 5, nome: 'Receitas Financeiras', previsto: 150000, realizado: 185000, percentual: 123.3 },
      { id: 6, nome: 'Despesas Financeiras', previsto: 280000, realizado: 265000, percentual: 94.6 }
    ];

    // Dados do gráfico mensal
    this.pagarReceberData = {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      pagar: [4.2, 4.5, 4.8, 4.3, 5.1, 4.7, 5.2, 4.9, 5.5, 5.0, 5.8, 4.85],
      receber: [6.5, 6.8, 7.2, 6.9, 7.5, 7.1, 7.8, 7.4, 8.2, 7.6, 8.5, 7.2]
    };

    this.updateKPICards();
  }

  private updateKPICards() {
    const isPeriodoMensal = this.selectedPeriodo === 'mensal';

    this.kpiCards = [
      {
        id: 'total-receber',
        label: isPeriodoMensal ? 'A Receber (Mês)' : 'A Receber (Acumulado)',
        value: this.formatCurrency(isPeriodoMensal ? this.totalReceber : this.totalReceberAcumulado),
        subValue: isPeriodoMensal ? 'previsto no mês' : 'total do ano',
        icon: 'fas fa-arrow-down',
        color: '#00EDB1',
        bgColor: 'rgba(0, 237, 177, 0.15)'
      },
      {
        id: 'total-pagar',
        label: isPeriodoMensal ? 'A Pagar (Mês)' : 'A Pagar (Acumulado)',
        value: this.formatCurrency(isPeriodoMensal ? this.totalPagar : this.totalPagarAcumulado),
        subValue: isPeriodoMensal ? 'previsto no mês' : 'total do ano',
        icon: 'fas fa-arrow-up',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)'
      },
      {
        id: 'saldo',
        label: 'Saldo Líquido',
        value: this.formatCurrency(isPeriodoMensal ? this.saldoLiquido : (this.totalReceberAcumulado - this.totalPagarAcumulado)),
        subValue: this.saldoLiquido >= 0 ? 'positivo' : 'negativo',
        icon: 'fas fa-balance-scale',
        color: '#09005C',
        bgColor: 'rgba(9, 0, 92, 0.15)'
      },
      {
        id: 'variacao',
        label: 'Variação Previsto',
        value: '+5.2%',
        subValue: 'acima do planejado',
        icon: 'fas fa-chart-line',
        color: '#30ADFC',
        bgColor: 'rgba(48, 173, 252, 0.15)'
      }
    ];
  }

  changePeriodo(periodo: 'mensal' | 'acumulado') {
    this.selectedPeriodo = periodo;
    this.updateKPICards();
  }

  changeView(view: 'centro-custo' | 'plano-financeiro') {
    this.selectedView = view;
  }

  getActiveList(): CentroCusto[] {
    return this.selectedView === 'centro-custo' ? this.centrosCusto : this.planosFinanceiros;
  }

  private async initCharts() {
    try {
      const Chart = await import('chart.js/auto').then(m => m.default);

      this.initPagarReceberChart(Chart);
      this.initComparativoChart(Chart);
    } catch (error) {
      console.error('Erro ao inicializar charts:', error);
    }
  }

  private initPagarReceberChart(Chart: any) {
    const canvas = document.getElementById('pagarReceberChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.pagarReceberChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.pagarReceberData.labels,
        datasets: [
          {
            label: 'A Receber',
            data: this.pagarReceberData.receber,
            backgroundColor: 'rgba(0, 237, 177, 0.8)',
            borderColor: '#00EDB1',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'A Pagar',
            data: this.pagarReceberData.pagar,
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context: { raw: unknown; dataset: { label?: string } }) => {
                const value = context.raw as number;
                return `${context.dataset.label || ''}: R$ ${value.toFixed(1)}M`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value: string | number) => `R$ ${value}M`
            }
          }
        }
      }
    });
  }

  private initComparativoChart(Chart: any) {
    const canvas = document.getElementById('comparativoChart') as HTMLCanvasElement;
    if (!canvas) return;

    const data = this.getActiveList().slice(0, 6);

    this.comparativoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(item => item.nome),
        datasets: [
          {
            label: 'Previsto',
            data: data.map(item => item.previsto / 1000000),
            backgroundColor: 'rgba(9, 0, 92, 0.2)',
            borderColor: '#09005C',
            borderWidth: 2,
            borderRadius: 4
          },
          {
            label: 'Realizado',
            data: data.map(item => item.realizado / 1000000),
            backgroundColor: 'rgba(0, 237, 177, 0.8)',
            borderColor: '#00EDB1',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context: { raw: unknown; dataset: { label?: string } }) => {
                const value = context.raw as number;
                return `${context.dataset.label || ''}: R$ ${value.toFixed(2)}M`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value: string | number) => `R$ ${value}M`
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  formatCurrency(value: number): string {
    if (value >= 1000000000) {
      return `R$ ${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return `R$ ${value.toFixed(2)}`;
  }

  getStatusClass(percentual: number): string {
    if (percentual > 105) return 'status-over';
    if (percentual < 95) return 'status-under';
    return 'status-ok';
  }

  getStatusIcon(percentual: number): string {
    if (percentual > 105) return 'fas fa-arrow-up';
    if (percentual < 95) return 'fas fa-arrow-down';
    return 'fas fa-check';
  }

  refreshData() {
    this.loadFinanceiroData();
    setTimeout(() => {
      if (this.pagarReceberChart) {
        this.pagarReceberChart.destroy();
      }
      if (this.comparativoChart) {
        this.comparativoChart.destroy();
      }
      this.initCharts();
    }, 600);
  }
}
