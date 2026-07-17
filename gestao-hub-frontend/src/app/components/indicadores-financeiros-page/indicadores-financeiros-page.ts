import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { DashboardService } from '../../services/dashboard.service';

interface MargemData {
  mes: string;
  margemBrutaProjetada: number;
  margemBrutaRealizada: number;
  margemLiquidaProjetada: number;
  margemLiquidaRealizada: number;
}

interface ViabilidadeData {
  id: number;
  empreendimento: string;
  roiProjetado: number;
  roiRealizado: number;
  paybackProjetado: number;
  paybackRealizado: number;
  tirProjetada: number;
  tirRealizada: number;
  vplProjetado: number;
  vplRealizado: number;
  status: 'acima' | 'dentro' | 'abaixo';
}

interface ResumoIndicador {
  label: string;
  projetado: number;
  realizado: number;
  variacao: number;
  unidade: string;
}

@Component({
  selector: 'app-indicadores-financeiros-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './indicadores-financeiros-page.html',
  styleUrls: ['./indicadores-financeiros-page.css']
})
export class IndicadoresFinanceirosPageComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  selectedEmpreendimento: string = '';
  selectedPeriodo: 'mensal' | 'trimestral' | 'anual' = 'anual';

  // KPIs Consolidados
  margemBrutaMedia = 0;
  margemLiquidaMedia = 0;
  roiMedio = 0;
  tirMedia = 0;

  // Dados
  margensData: MargemData[] = [];
  viabilidadeData: ViabilidadeData[] = [];
  resumoIndicadores: ResumoIndicador[] = [];

  // Empreendimentos (preenchido a partir dos dados de viabilidade reais)
  empreendimentos: { id: string; nome: string }[] = [
    { id: '', nome: 'Todos os Empreendimentos' }
  ];

  private dashboardService = inject(DashboardService);

  // Charts
  margemBrutaChart: Chart | null = null;
  margemLiquidaChart: Chart | null = null;
  roiChart: Chart | null = null;
  comparativoChart: Chart | null = null;

  ngOnInit() {
    this.loadIndicadoresData();
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
    if (this.margemBrutaChart) this.margemBrutaChart.destroy();
    if (this.margemLiquidaChart) this.margemLiquidaChart.destroy();
    if (this.roiChart) this.roiChart.destroy();
    if (this.comparativoChart) this.comparativoChart.destroy();
  }

  loadIndicadoresData() {
    this.isLoading = true;
    this.dashboardService.getIndicadores().subscribe({
      next: (data) => {
        this.margensData = data.margens;
        this.viabilidadeData = data.viabilidade;

        // Seletor de empreendimentos a partir dos dados reais
        this.empreendimentos = [
          { id: '', nome: 'Todos os Empreendimentos' },
          ...data.viabilidade.map(v => ({ id: String(v.id), nome: v.empreendimento }))
        ];

        this.calculateTotals();
        this.isLoading = false;
        this.updateCharts();
      },
      error: (error) => {
        console.error('Erro ao carregar indicadores financeiros:', error);
        this.isLoading = false;
      }
    });
  }

  private calculateTotals() {
    // Médias das margens (último mês)
    const ultimoMes = this.margensData[this.margensData.length - 1];
    this.margemBrutaMedia = ultimoMes?.margemBrutaRealizada || 0;
    this.margemLiquidaMedia = ultimoMes?.margemLiquidaRealizada || 0;

    // Médias de ROI e TIR
    this.roiMedio = this.viabilidadeData.reduce((sum, v) => sum + v.roiRealizado, 0) / this.viabilidadeData.length;
    this.tirMedia = this.viabilidadeData.reduce((sum, v) => sum + v.tirRealizada, 0) / this.viabilidadeData.length;

    // Resumo consolidado
    const totalROIProj = this.viabilidadeData.reduce((sum, v) => sum + v.roiProjetado, 0) / this.viabilidadeData.length;
    const totalTIRProj = this.viabilidadeData.reduce((sum, v) => sum + v.tirProjetada, 0) / this.viabilidadeData.length;
    const totalPaybackProj = this.viabilidadeData.reduce((sum, v) => sum + v.paybackProjetado, 0) / this.viabilidadeData.length;
    const totalPaybackReal = this.viabilidadeData.reduce((sum, v) => sum + v.paybackRealizado, 0) / this.viabilidadeData.length;

    this.resumoIndicadores = [
      {
        label: 'ROI Médio',
        projetado: totalROIProj,
        realizado: this.roiMedio,
        variacao: ((this.roiMedio - totalROIProj) / totalROIProj) * 100,
        unidade: '%'
      },
      {
        label: 'TIR Média',
        projetado: totalTIRProj,
        realizado: this.tirMedia,
        variacao: ((this.tirMedia - totalTIRProj) / totalTIRProj) * 100,
        unidade: '%'
      },
      {
        label: 'Payback Médio',
        projetado: totalPaybackProj,
        realizado: totalPaybackReal,
        variacao: ((totalPaybackReal - totalPaybackProj) / totalPaybackProj) * 100,
        unidade: ' meses'
      },
      {
        label: 'Margem Bruta',
        projetado: 37,
        realizado: this.margemBrutaMedia,
        variacao: ((this.margemBrutaMedia - 37) / 37) * 100,
        unidade: '%'
      },
      {
        label: 'Margem Líquida',
        projetado: 23,
        realizado: this.margemLiquidaMedia,
        variacao: ((this.margemLiquidaMedia - 23) / 23) * 100,
        unidade: '%'
      }
    ];
  }

  changePeriodo(periodo: 'mensal' | 'trimestral' | 'anual') {
    this.selectedPeriodo = periodo;
    this.updateCharts();
  }

  changeEmpreendimento() {
    this.loadIndicadoresData();
    setTimeout(() => {
      this.updateCharts();
    }, 600);
  }

  private async initCharts() {
    try {
      const Chart = await import('chart.js/auto').then(m => m.default);

      this.destroyCharts();
      this.initMargemBrutaChart(Chart);
      this.initMargemLiquidaChart(Chart);
      this.initRoiChart(Chart);
      this.initComparativoChart(Chart);
    } catch (error) {
      console.error('Erro ao inicializar charts:', error);
    }
  }

  private initMargemBrutaChart(Chart: any) {
    const canvas = document.getElementById('margemBrutaChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.margemBrutaChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.margensData.map(m => m.mes),
        datasets: [
          {
            label: 'Projetada',
            data: this.margensData.map(m => m.margemBrutaProjetada),
            borderColor: '#09005C',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            pointBackgroundColor: '#09005C',
            pointRadius: 3
          },
          {
            label: 'Realizada',
            data: this.margensData.map(m => m.margemBrutaRealizada),
            borderColor: '#00EDB1',
            backgroundColor: 'rgba(0, 237, 177, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00EDB1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5
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
              padding: 15
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
            grid: { display: false }
          },
          y: {
            beginAtZero: false,
            min: 25,
            max: 45,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              callback: (value: string | number) => `${value}%`
            }
          }
        }
      }
    });
  }

  private initMargemLiquidaChart(Chart: any) {
    const canvas = document.getElementById('margemLiquidaChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.margemLiquidaChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.margensData.map(m => m.mes),
        datasets: [
          {
            label: 'Projetada',
            data: this.margensData.map(m => m.margemLiquidaProjetada),
            borderColor: '#09005C',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            pointBackgroundColor: '#09005C',
            pointRadius: 3
          },
          {
            label: 'Realizada',
            data: this.margensData.map(m => m.margemLiquidaRealizada),
            borderColor: '#30ADFC',
            backgroundColor: 'rgba(48, 173, 252, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#30ADFC',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5
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
              padding: 15
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
            grid: { display: false }
          },
          y: {
            beginAtZero: false,
            min: 10,
            max: 30,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              callback: (value: string | number) => `${value}%`
            }
          }
        }
      }
    });
  }

  private initRoiChart(Chart: any) {
    const canvas = document.getElementById('roiChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.roiChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.viabilidadeData.map(v => v.empreendimento),
        datasets: [
          {
            label: 'ROI Projetado',
            data: this.viabilidadeData.map(v => v.roiProjetado),
            backgroundColor: 'rgba(9, 0, 92, 0.2)',
            borderColor: '#09005C',
            borderWidth: 2,
            borderRadius: 4
          },
          {
            label: 'ROI Realizado',
            data: this.viabilidadeData.map(v => v.roiRealizado),
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
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15
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
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              callback: (value: string | number) => `${value}%`
            }
          }
        }
      }
    });
  }

  private initComparativoChart(Chart: any) {
    const canvas = document.getElementById('comparativoChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.comparativoChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: ['ROI', 'TIR', 'Margem Bruta', 'Margem Líquida', 'Payback (inv)'],
        datasets: [
          {
            label: 'Projetado',
            data: [
              this.resumoIndicadores[0]?.projetado || 0,
              this.resumoIndicadores[1]?.projetado || 0,
              this.resumoIndicadores[3]?.projetado || 0,
              this.resumoIndicadores[4]?.projetado || 0,
              100 - (this.resumoIndicadores[2]?.projetado || 0)
            ],
            borderColor: '#09005C',
            backgroundColor: 'rgba(9, 0, 92, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#09005C'
          },
          {
            label: 'Realizado',
            data: [
              this.resumoIndicadores[0]?.realizado || 0,
              this.resumoIndicadores[1]?.realizado || 0,
              this.resumoIndicadores[3]?.realizado || 0,
              this.resumoIndicadores[4]?.realizado || 0,
              100 - (this.resumoIndicadores[2]?.realizado || 0)
            ],
            borderColor: '#00EDB1',
            backgroundColor: 'rgba(0, 237, 177, 0.2)',
            borderWidth: 2,
            pointBackgroundColor: '#00EDB1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            angleLines: { color: 'rgba(0, 0, 0, 0.05)' },
            pointLabels: {
              font: { size: 11 }
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

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'acima': 'status-acima',
      'dentro': 'status-dentro',
      'abaixo': 'status-abaixo'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'acima': 'Acima do Projetado',
      'dentro': 'Dentro do Projetado',
      'abaixo': 'Abaixo do Projetado'
    };
    return labels[status] || status;
  }

  getVariacaoClass(variacao: number, inverso: boolean = false): string {
    if (inverso) {
      return variacao <= 0 ? 'positive' : 'negative';
    }
    return variacao >= 0 ? 'positive' : 'negative';
  }

  refreshData() {
    this.loadIndicadoresData();
    setTimeout(() => {
      this.updateCharts();
    }, 600);
  }
}
