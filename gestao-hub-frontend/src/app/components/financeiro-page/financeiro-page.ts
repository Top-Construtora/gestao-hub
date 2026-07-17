import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { DashboardService } from '../../services/dashboard.service';

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

  private dashboardService = inject(DashboardService);

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

  loadFinanceiroData() {
    this.isLoading = true;
    this.dashboardService.getFinanceiro().subscribe({
      next: (data) => {
        this.totalPagar = data.totalPagar;
        this.totalReceber = data.totalReceber;
        this.saldoLiquido = this.totalReceber - this.totalPagar;
        this.totalPagarAcumulado = data.totalPagarAcumulado;
        this.totalReceberAcumulado = data.totalReceberAcumulado;
        this.centrosCusto = data.centrosCusto;
        this.planosFinanceiros = data.planosFinanceiros;
        this.pagarReceberData = data.pagarReceberMensal;
        this.updateKPICards();
        this.isLoading = false;
        this.destroyCharts();
        setTimeout(() => this.initCharts(), 50);
      },
      error: (error) => {
        console.error('Erro ao carregar dados financeiros:', error);
        this.isLoading = false;
      }
    });
  }

  private destroyCharts() {
    if (this.pagarReceberChart) { this.pagarReceberChart.destroy(); this.pagarReceberChart = null; }
    if (this.comparativoChart) { this.comparativoChart.destroy(); this.comparativoChart = null; }
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

      this.destroyCharts();
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
  }
}
