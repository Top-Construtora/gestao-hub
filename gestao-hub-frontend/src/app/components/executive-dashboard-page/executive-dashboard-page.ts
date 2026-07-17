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

  // Dados do fluxo de caixa
  fluxoCaixaData = {
    labels: [] as string[],
    entradas: [] as number[],
    saidas: [] as number[],
    saldo: [] as number[]
  };

  private dashboardService = inject(DashboardService);

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

  loadDashboardData() {
    this.isLoading = true;
    this.dashboardService.getDashboardExecutivo().subscribe({
      next: (data) => {
        this.empreendimentosPorSegmento = data.empreendimentosPorSegmento;
        this.totalEmpreendimentos = data.totalEmpreendimentos;
        this.vgvTotal = data.vgvTotal;
        this.vgvVendido = data.vgvVendido;
        this.percentualVendas = data.percentualVendas;
        this.caixaConsolidado = data.caixaConsolidado;
        this.fluxoCaixaData = data.fluxoCaixa;
        this.updateKPICards();
        this.isLoading = false;
        this.destroyCharts();
        setTimeout(() => this.initCharts(), 50);
      },
      error: (error) => {
        console.error('Erro ao carregar dashboard:', error);
        this.isLoading = false;
      }
    });
  }

  private destroyCharts() {
    if (this.segmentoChart) { this.segmentoChart.destroy(); this.segmentoChart = null; }
    if (this.fluxoCaixaChart) { this.fluxoCaixaChart.destroy(); this.fluxoCaixaChart = null; }
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

      this.destroyCharts();
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
  }

  getSegmentoPercentage(quantidade: number): number {
    return (quantidade / this.totalEmpreendimentos) * 100;
  }
}
