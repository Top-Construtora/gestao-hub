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

interface EmpreendimentoSegmento {
  segmento: string;
  quantidade: number;
  cor: string;
}

@Component({
  selector: 'app-executive-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './executive-dashboard-page.html',
  styleUrls: ['./executive-dashboard-page.css']
})
export class ExecutiveDashboardPageComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;

  // KPIs principais
  kpiCards: KPICard[] = [];

  // Dados de empreendimentos por segmento
  empreendimentosPorSegmento: EmpreendimentoSegmento[] = [];
  totalEmpreendimentos = 0;

  // VGV
  vgvTotal = 0;
  vgvVendido = 0;
  percentualVendas = 0;

  // Caixa
  caixaConsolidado = 0;

  // Charts
  segmentoChart: Chart | null = null;
  fluxoCaixaChart: Chart | null = null;

  // Dados do fluxo de caixa (mock)
  fluxoCaixaData = {
    labels: [] as string[],
    entradas: [] as number[],
    saidas: [] as number[],
    saldo: [] as number[]
  };

  ngOnInit() {
    this.loadDashboardData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCharts();
    }, 100);
  }

  ngOnDestroy() {
    if (this.segmentoChart) {
      this.segmentoChart.destroy();
    }
    if (this.fluxoCaixaChart) {
      this.fluxoCaixaChart.destroy();
    }
  }

  async loadDashboardData() {
    this.isLoading = true;
    try {
      // Dados mockados para demonstração
      await this.loadMockData();
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadMockData() {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));

    // Empreendimentos por segmento
    this.empreendimentosPorSegmento = [
      { segmento: 'Vertical', quantidade: 8, cor: '#09005C' },
      { segmento: 'Horizontal', quantidade: 12, cor: '#00EDB1' },
      { segmento: 'Loteamento', quantidade: 5, cor: '#30ADFC' }
    ];
    this.totalEmpreendimentos = this.empreendimentosPorSegmento.reduce((acc, e) => acc + e.quantidade, 0);

    // VGV (Valor Geral de Vendas)
    this.vgvTotal = 850000000; // R$ 850 milhões
    this.vgvVendido = 612000000; // R$ 612 milhões
    this.percentualVendas = (this.vgvVendido / this.vgvTotal) * 100;

    // Caixa consolidado
    this.caixaConsolidado = 45800000; // R$ 45,8 milhões

    // Fluxo de caixa mensal
    this.fluxoCaixaData = {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      entradas: [12.5, 15.2, 18.3, 14.8, 22.1, 19.5, 25.3, 21.8, 28.4, 24.6, 31.2, 27.8],
      saidas: [8.2, 10.5, 12.1, 9.8, 15.3, 13.2, 18.4, 16.2, 20.1, 17.5, 22.8, 19.4],
      saldo: [4.3, 4.7, 6.2, 5.0, 6.8, 6.3, 6.9, 5.6, 8.3, 7.1, 8.4, 8.4]
    };

    // Atualizar cards KPI
    this.updateKPICards();
  }

  private updateKPICards() {
    this.kpiCards = [
      {
        id: 'empreendimentos',
        label: 'Empreendimentos',
        value: this.totalEmpreendimentos.toString(),
        subValue: 'ativos',
        icon: 'fas fa-building',
        color: '#09005C',
        bgColor: 'rgba(9, 0, 92, 0.15)'
      },
      {
        id: 'vgv-total',
        label: 'VGV Total',
        value: this.formatCurrency(this.vgvTotal),
        subValue: 'valor geral de vendas',
        icon: 'fas fa-chart-line',
        color: '#00EDB1',
        bgColor: 'rgba(0, 237, 177, 0.15)'
      },
      {
        id: 'vgv-vendido',
        label: 'VGV Vendido',
        value: this.formatCurrency(this.vgvVendido),
        subValue: `${this.percentualVendas.toFixed(1)}% vendido`,
        icon: 'fas fa-hand-holding-usd',
        color: '#30ADFC',
        bgColor: 'rgba(48, 173, 252, 0.15)'
      },
      {
        id: 'caixa',
        label: 'Caixa Consolidado',
        value: this.formatCurrency(this.caixaConsolidado),
        subValue: 'saldo atual',
        icon: 'fas fa-wallet',
        color: '#09005C',
        bgColor: 'rgba(9, 0, 92, 0.15)'
      }
    ];
  }

  private async initCharts() {
    try {
      const Chart = await import('chart.js/auto').then(m => m.default);

      this.initSegmentoChart(Chart);
      this.initFluxoCaixaChart(Chart);
    } catch (error) {
      console.error('Erro ao inicializar charts:', error);
    }
  }

  private initSegmentoChart(Chart: any) {
    const canvas = document.getElementById('segmentoChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.segmentoChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: this.empreendimentosPorSegmento.map(e => e.segmento),
        datasets: [{
          data: this.empreendimentosPorSegmento.map(e => e.quantidade),
          backgroundColor: this.empreendimentosPorSegmento.map(e => e.cor),
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: { raw: unknown; label: string }) => {
                const value = context.raw as number;
                const total = this.totalEmpreendimentos;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  private initFluxoCaixaChart(Chart: any) {
    const canvas = document.getElementById('fluxoCaixaChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.fluxoCaixaChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.fluxoCaixaData.labels,
        datasets: [
          {
            label: 'Entradas',
            data: this.fluxoCaixaData.entradas,
            backgroundColor: 'rgba(0, 237, 177, 0.8)',
            borderColor: '#00EDB1',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Saídas',
            data: this.fluxoCaixaData.saidas,
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Saldo',
            data: this.fluxoCaixaData.saldo,
            type: 'line',
            borderColor: '#09005C',
            backgroundColor: 'rgba(9, 0, 92, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#09005C',
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
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context: { raw: unknown; dataset: { label: string } }) => {
                const value = context.raw as number;
                return `${context.dataset.label}: R$ ${value.toFixed(1)}M`;
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

  refreshData() {
    this.loadDashboardData();
    setTimeout(() => {
      if (this.segmentoChart) {
        this.segmentoChart.destroy();
      }
      if (this.fluxoCaixaChart) {
        this.fluxoCaixaChart.destroy();
      }
      this.initCharts();
    }, 600);
  }

  getSegmentoPercentage(quantidade: number): number {
    return (quantidade / this.totalEmpreendimentos) * 100;
  }
}
