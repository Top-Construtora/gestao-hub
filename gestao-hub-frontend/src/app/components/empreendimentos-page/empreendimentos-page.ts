import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

interface Empreendimento {
  id: number;
  nome: string;
  fase: string;
  spe: string;
  segmento: 'Vertical' | 'Horizontal' | 'Loteamento';
  vgvTotal: number;
  vgvVendido: number;
  percentualVendas: number;
  percentualObras: number;
  percentualRecebiveis: number;
  caixaDisponivel: number;
  resultadoProjetado: number;
  resultadoRealizado: number;
}

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

  async loadEmpreendimentos() {
    this.isLoading = true;
    try {
      await this.loadMockData();
    } catch (error) {
      console.error('Erro ao carregar empreendimentos:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadMockData() {
    await new Promise(resolve => setTimeout(resolve, 500));

    this.empreendimentos = [
      {
        id: 1,
        nome: 'Residencial Aurora',
        fase: 'Lançamento',
        spe: 'Aurora SPE Ltda',
        segmento: 'Vertical',
        vgvTotal: 85000000,
        vgvVendido: 42500000,
        percentualVendas: 50,
        percentualObras: 25,
        percentualRecebiveis: 35,
        caixaDisponivel: 12500000,
        resultadoProjetado: 15000000,
        resultadoRealizado: 8500000
      },
      {
        id: 2,
        nome: 'Condomínio Verde Vale',
        fase: 'Construção',
        spe: 'Verde Vale SPE Ltda',
        segmento: 'Horizontal',
        vgvTotal: 120000000,
        vgvVendido: 96000000,
        percentualVendas: 80,
        percentualObras: 65,
        percentualRecebiveis: 55,
        caixaDisponivel: 8200000,
        resultadoProjetado: 22000000,
        resultadoRealizado: 18500000
      },
      {
        id: 3,
        nome: 'Loteamento Sol Nascente',
        fase: 'Pré-lançamento',
        spe: 'Sol Nascente SPE Ltda',
        segmento: 'Loteamento',
        vgvTotal: 45000000,
        vgvVendido: 9000000,
        percentualVendas: 20,
        percentualObras: 10,
        percentualRecebiveis: 15,
        caixaDisponivel: 5800000,
        resultadoProjetado: 8000000,
        resultadoRealizado: 1200000
      },
      {
        id: 4,
        nome: 'Edifício Metropolitan',
        fase: 'Entrega',
        spe: 'Metropolitan SPE Ltda',
        segmento: 'Vertical',
        vgvTotal: 180000000,
        vgvVendido: 171000000,
        percentualVendas: 95,
        percentualObras: 100,
        percentualRecebiveis: 78,
        caixaDisponivel: 3500000,
        resultadoProjetado: 35000000,
        resultadoRealizado: 32800000
      },
      {
        id: 5,
        nome: 'Parque das Palmeiras',
        fase: 'Construção',
        spe: 'Palmeiras SPE Ltda',
        segmento: 'Horizontal',
        vgvTotal: 75000000,
        vgvVendido: 52500000,
        percentualVendas: 70,
        percentualObras: 45,
        percentualRecebiveis: 40,
        caixaDisponivel: 6200000,
        resultadoProjetado: 12000000,
        resultadoRealizado: 7800000
      },
      {
        id: 6,
        nome: 'Loteamento Bosque Real',
        fase: 'Lançamento',
        spe: 'Bosque Real SPE Ltda',
        segmento: 'Loteamento',
        vgvTotal: 32000000,
        vgvVendido: 14400000,
        percentualVendas: 45,
        percentualObras: 30,
        percentualRecebiveis: 28,
        caixaDisponivel: 4100000,
        resultadoProjetado: 6500000,
        resultadoRealizado: 3200000
      }
    ];

    this.filteredEmpreendimentos = [...this.empreendimentos];
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
    this.generateFluxoCaixaData(emp);

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

  private generateFluxoCaixaData(emp: Empreendimento) {
    // Gera dados mock baseados no empreendimento
    const baseValue = emp.vgvTotal / 12000000;

    this.fluxoCaixaData = {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      entradas: [
        baseValue * 0.8, baseValue * 1.2, baseValue * 1.0, baseValue * 0.9,
        baseValue * 1.4, baseValue * 1.1, baseValue * 1.3, baseValue * 1.0,
        baseValue * 1.5, baseValue * 1.2, baseValue * 1.6, baseValue * 1.4
      ],
      saidas: [
        baseValue * 0.6, baseValue * 0.8, baseValue * 0.7, baseValue * 0.65,
        baseValue * 0.9, baseValue * 0.75, baseValue * 0.85, baseValue * 0.7,
        baseValue * 1.0, baseValue * 0.8, baseValue * 1.1, baseValue * 0.95
      ],
      saldo: []
    };

    // Calcula saldo
    this.fluxoCaixaData.saldo = this.fluxoCaixaData.entradas.map((entrada, i) =>
      entrada - this.fluxoCaixaData.saidas[i]
    );
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
