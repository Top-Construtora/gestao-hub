import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { DashboardService } from '../../services/dashboard.service';

interface CentroCusto {
  id: number;
  nome: string;
  orcadoOriginal: number;
  orcadoAtual: number;
  realizado: number;
  percentualExecutado: number;
  saldo: number;
}

interface ExecucaoComparativo {
  mes: string;
  fisicoAcumulado: number;
  financeiroAcumulado: number;
}

interface RevisaoOrcamentaria {
  id: number;
  numero: string;
  data: string;
  descricao: string;
  valorAnterior: number;
  valorNovo: number;
  diferenca: number;
  status: 'aprovada' | 'pendente' | 'rejeitada';
  responsavel: string;
}

interface CustoM2 {
  centroCusto: string;
  custoTotal: number;
  areaTotal: number;
  custoM2: number;
  percentualTotal: number;
}

@Component({
  selector: 'app-obra-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './obra-page.html',
  styleUrls: ['./obra-page.css']
})
export class ObraPageComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  selectedEmpreendimento: number | null = null;

  // KPIs
  orcamentoTotal = 0;
  executadoTotal = 0;
  saldoTotal = 0;
  percentualFisico = 0;
  percentualFinanceiro = 0;
  custoM2Medio = 0;
  areaTotal = 0;

  // Dados
  centrosCusto: CentroCusto[] = [];
  execucaoComparativo: ExecucaoComparativo[] = [];
  revisoesOrcamentarias: RevisaoOrcamentaria[] = [];
  custosM2: CustoM2[] = [];

  // Empreendimentos disponíveis (carregados do backend)
  empreendimentos: { id: number; nome: string }[] = [];

  // Charts
  centroCustoChart: Chart | null = null;
  execucaoChart: Chart | null = null;
  custoM2Chart: Chart | null = null;

  private dashboardService = inject(DashboardService);

  ngOnInit() {
    this.dashboardService.getObraEmpreendimentos().subscribe({
      next: (data) => {
        this.empreendimentos = data.empreendimentos;
        if (this.empreendimentos.length) {
          this.selectedEmpreendimento = this.empreendimentos[0].id;
          this.loadObraData();
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Erro ao carregar empreendimentos de obra:', error);
        this.isLoading = false;
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCharts();
    }, 100);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  private destroyCharts() {
    if (this.centroCustoChart) this.centroCustoChart.destroy();
    if (this.execucaoChart) this.execucaoChart.destroy();
    if (this.custoM2Chart) this.custoM2Chart.destroy();
  }

  loadObraData() {
    if (this.selectedEmpreendimento == null) return;
    this.isLoading = true;
    this.dashboardService.getObra(this.selectedEmpreendimento).subscribe({
      next: (data) => {
        this.areaTotal = data.areaTotal;
        this.centrosCusto = data.centrosCusto;
        this.execucaoComparativo = data.execucaoComparativo;
        this.revisoesOrcamentarias = data.revisoesOrcamentarias;

        // Custo por m² derivado dos centros de custo reais
        this.custosM2 = this.centrosCusto.map(cc => ({
          centroCusto: cc.nome,
          custoTotal: cc.realizado,
          areaTotal: this.areaTotal,
          custoM2: this.areaTotal > 0 ? cc.realizado / this.areaTotal : 0,
          percentualTotal: 0
        }));

        this.calculateTotals();
        this.isLoading = false;
        this.updateCharts();
      },
      error: (error) => {
        console.error('Erro ao carregar dados da obra:', error);
        this.isLoading = false;
      }
    });
  }

  private calculateTotals() {
    // Orçamento total atual
    this.orcamentoTotal = this.centrosCusto.reduce((sum, cc) => sum + cc.orcadoAtual, 0);

    // Executado total
    this.executadoTotal = this.centrosCusto.reduce((sum, cc) => sum + cc.realizado, 0);

    // Saldo total
    this.saldoTotal = this.orcamentoTotal - this.executadoTotal;

    // Percentuais (último mês)
    const ultimoMes = this.execucaoComparativo[this.execucaoComparativo.length - 1];
    this.percentualFisico = ultimoMes?.fisicoAcumulado || 0;
    this.percentualFinanceiro = ultimoMes?.financeiroAcumulado || 0;

    // Custo m² médio
    this.custoM2Medio = this.areaTotal > 0 ? this.executadoTotal / this.areaTotal : 0;

    // Calcular percentual de cada custo no total
    const custoTotalM2 = this.custosM2.reduce((sum, c) => sum + c.custoM2, 0);
    this.custosM2.forEach(c => {
      c.percentualTotal = custoTotalM2 > 0 ? (c.custoM2 / custoTotalM2) * 100 : 0;
    });

    // Ordenar por custo m²
    this.custosM2.sort((a, b) => b.custoM2 - a.custoM2);
  }

  changeEmpreendimento() {
    this.loadObraData();
  }

  private async initCharts() {
    try {
      const Chart = await import('chart.js/auto').then(m => m.default);

      this.destroyCharts();
      this.initCentroCustoChart(Chart);
      this.initExecucaoChart(Chart);
      this.initCustoM2Chart(Chart);
    } catch (error) {
      console.error('Erro ao inicializar charts:', error);
    }
  }

  private initCentroCustoChart(Chart: any) {
    const canvas = document.getElementById('centroCustoChart') as HTMLCanvasElement;
    if (!canvas) return;

    const topCentros = this.centrosCusto.slice(0, 6);

    this.centroCustoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: topCentros.map(cc => cc.nome),
        datasets: [
          {
            label: 'Orçado Atual',
            data: topCentros.map(cc => cc.orcadoAtual / 1000000),
            backgroundColor: 'rgba(9, 0, 92, 0.2)',
            borderColor: '#09005C',
            borderWidth: 2,
            borderRadius: 4
          },
          {
            label: 'Realizado',
            data: topCentros.map(cc => cc.realizado / 1000000),
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

  private initExecucaoChart(Chart: any) {
    const canvas = document.getElementById('execucaoChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.execucaoChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.execucaoComparativo.map(e => e.mes),
        datasets: [
          {
            label: '% Físico',
            data: this.execucaoComparativo.map(e => e.fisicoAcumulado),
            borderColor: '#09005C',
            backgroundColor: 'rgba(9, 0, 92, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#09005C',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: '% Financeiro',
            data: this.execucaoComparativo.map(e => e.financeiroAcumulado),
            borderColor: '#00EDB1',
            backgroundColor: 'rgba(0, 237, 177, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#00EDB1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
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
                return `${context.dataset.label || ''}: ${value.toFixed(1)}%`;
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
            max: 100,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value: string | number) => `${value}%`
            }
          }
        }
      }
    });
  }

  private initCustoM2Chart(Chart: any) {
    const canvas = document.getElementById('custoM2Chart') as HTMLCanvasElement;
    if (!canvas) return;

    const topCustos = this.custosM2.slice(0, 8);

    const colors = [
      'rgba(9, 0, 92, 0.8)',
      'rgba(0, 237, 177, 0.8)',
      'rgba(48, 173, 252, 0.8)',
      'rgba(255, 193, 7, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(156, 39, 176, 0.8)',
      'rgba(255, 87, 34, 0.8)',
      'rgba(0, 150, 136, 0.8)'
    ];

    this.custoM2Chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: topCustos.map(c => c.centroCusto),
        datasets: [{
          data: topCustos.map(c => c.custoM2),
          backgroundColor: colors,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 12,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context: { raw: unknown; label?: string }) => {
                const value = context.raw as number;
                return `${context.label || ''}: R$ ${value.toFixed(2)}/m²`;
              }
            }
          }
        }
      }
    });
  }

  private updateCharts() {
    this.destroyCharts();
    setTimeout(() => {
      this.initCharts();
    }, 100);
  }

  formatCurrency(value: number): string {
    if (value >= 1000000000) {
      return `R$ ${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return `R$ ${value.toFixed(2)}`;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'aprovada': 'status-aprovada',
      'pendente': 'status-pendente',
      'rejeitada': 'status-rejeitada'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'aprovada': 'Aprovada',
      'pendente': 'Pendente',
      'rejeitada': 'Rejeitada'
    };
    return labels[status] || status;
  }

  getProgressClass(percentual: number): string {
    if (percentual >= 90) return 'progress-high';
    if (percentual >= 50) return 'progress-medium';
    return 'progress-low';
  }

  getVariacaoClass(): string {
    const diferenca = this.percentualFisico - this.percentualFinanceiro;
    if (diferenca > 0) return 'positive';
    if (diferenca < 0) return 'negative';
    return '';
  }

  getTotalRevisoes(): number {
    return this.revisoesOrcamentarias.reduce((sum, r) => sum + r.diferenca, 0);
  }

  refreshData() {
    this.loadObraData();
  }
}
