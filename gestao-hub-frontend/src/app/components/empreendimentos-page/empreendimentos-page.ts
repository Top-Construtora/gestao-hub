import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { DashboardService, EmpreendimentoDTO } from '../../services/dashboard.service';

type Empreendimento = EmpreendimentoDTO;

@Component({
  selector: 'app-empreendimentos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './empreendimentos-page.html',
  styleUrls: ['./empreendimentos-page.css']
})
export class EmpreendimentosPageComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  searchTerm = '';
  selectedSegmento = '';
  selectedEmpreendimento: Empreendimento | null = null;

  empreendimentos: Empreendimento[] = [];
  filteredEmpreendimentos: Empreendimento[] = [];

  // Chart
  fluxoCaixaChart: Chart | null = null;

  // Dados do fluxo de caixa individual
  fluxoCaixaData = {
    labels: [] as string[],
    entradas: [] as number[],
    saidas: [] as number[],
    saldo: [] as number[]
  };

  ngOnInit() {
    this.loadEmpreendimentos();
  }

  ngAfterViewInit() {
    // Chart será inicializado quando um empreendimento for selecionado
  }

  ngOnDestroy() {
    if (this.fluxoCaixaChart) {
      this.fluxoCaixaChart.destroy();
    }
  }

  private dashboardService = inject(DashboardService);

  loadEmpreendimentos() {
    this.isLoading = true;
    this.dashboardService.getEmpreendimentos().subscribe({
      next: (data) => {
        this.empreendimentos = data.empreendimentos;
        this.filteredEmpreendimentos = [...this.empreendimentos];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar empreendimentos:', error);
        this.isLoading = false;
      }
    });
  }

  filterEmpreendimentos() {
    this.filteredEmpreendimentos = this.empreendimentos.filter(emp => {
      const matchSearch = !this.searchTerm ||
        emp.nome.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.spe.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.fase.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchSegmento = !this.selectedSegmento || emp.segmento === this.selectedSegmento;

      return matchSearch && matchSegmento;
    });
  }

  selectEmpreendimento(emp: Empreendimento) {
    this.selectedEmpreendimento = emp;
    // Fluxo projetado vem calculado do backend a partir do VGV real
    this.fluxoCaixaData = {
      labels: emp.fluxoProjetado.labels,
      entradas: emp.fluxoProjetado.entradas,
      saidas: emp.fluxoProjetado.saidas,
      saldo: emp.fluxoProjetado.saldo
    };

    setTimeout(() => {
      this.initFluxoCaixaChart();
    }, 100);
  }

  closeDetails() {
    this.selectedEmpreendimento = null;
    if (this.fluxoCaixaChart) {
      this.fluxoCaixaChart.destroy();
      this.fluxoCaixaChart = null;
    }
  }

  private async initFluxoCaixaChart() {
    if (this.fluxoCaixaChart) {
      this.fluxoCaixaChart.destroy();
    }

    try {
      const Chart = await import('chart.js/auto').then(m => m.default);

      const canvas = document.getElementById('fluxoCaixaIndividualChart') as HTMLCanvasElement;
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
    } catch (error) {
      console.error('Erro ao inicializar chart:', error);
    }
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

  getSegmentoClass(segmento: string): string {
    const classes: { [key: string]: string } = {
      'Vertical': 'segmento-vertical',
      'Horizontal': 'segmento-horizontal',
      'Loteamento': 'segmento-loteamento'
    };
    return classes[segmento] || '';
  }

  getFaseClass(fase: string): string {
    const classes: { [key: string]: string } = {
      'Pré-lançamento': 'fase-pre',
      'Lançamento': 'fase-lancamento',
      'Construção': 'fase-construcao',
      'Entrega': 'fase-entrega'
    };
    return classes[fase] || '';
  }

  getResultadoPercentual(emp: Empreendimento): number {
    if (emp.resultadoProjetado === 0) return 0;
    return (emp.resultadoRealizado / emp.resultadoProjetado) * 100;
  }

  refreshData() {
    this.loadEmpreendimentos();
  }
}
