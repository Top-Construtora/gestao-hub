import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

interface EntradaItem {
  id: number;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: 'receita' | 'aporte' | 'juros' | 'multa';
}

interface SaidaItem {
  id: number;
  planoConta: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
}

interface ProjecaoItem {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
}

@Component({
  selector: 'app-fluxo-caixa-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './fluxo-caixa-page.html',
  styleUrls: ['./fluxo-caixa-page.css']
})
export class FluxoCaixaPageComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  selectedPeriodo: 'mensal' | 'trimestral' | 'anual' = 'mensal';
  selectedView: 'entradas' | 'saidas' = 'entradas';
  selectedTipoEntrada: string = '';

  // Totais
  totalEntradas = 0;
  totalSaidas = 0;
  saldoAtual = 0;
  saldoProjetado = 0;

  // Dados
  entradas: EntradaItem[] = [];
  saidas: SaidaItem[] = [];
  projecao: ProjecaoItem[] = [];

  // Entradas por categoria
  entradasPorTipo = {
    receitas: 0,
    aportes: 0,
    juros: 0,
    multas: 0
  };

  // Saídas por plano de contas
  saidasPorPlano: { nome: string; valor: number; percentual: number }[] = [];

  // Charts
  fluxoChart: Chart | null = null;
  projecaoChart: Chart | null = null;
  entradasPieChart: Chart | null = null;
  saidasPieChart: Chart | null = null;

  ngOnInit() {
    this.loadFluxoCaixaData();
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
    if (this.fluxoChart) this.fluxoChart.destroy();
    if (this.projecaoChart) this.projecaoChart.destroy();
    if (this.entradasPieChart) this.entradasPieChart.destroy();
    if (this.saidasPieChart) this.saidasPieChart.destroy();
  }

  async loadFluxoCaixaData() {
    this.isLoading = true;
    try {
      await this.loadMockData();
    } catch (error) {
      console.error('Erro ao carregar dados do fluxo de caixa:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadMockData() {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Entradas
    this.entradas = [
      { id: 1, categoria: 'Vendas', descricao: 'Venda Unidade 101 - Ed. Aurora', valor: 450000, data: '2024-01-15', tipo: 'receita' },
      { id: 2, categoria: 'Vendas', descricao: 'Venda Unidade 205 - Ed. Aurora', valor: 520000, data: '2024-01-18', tipo: 'receita' },
      { id: 3, categoria: 'Aporte', descricao: 'Aporte Sócio - Capital', valor: 1000000, data: '2024-01-10', tipo: 'aporte' },
      { id: 4, categoria: 'Financeiro', descricao: 'Juros sobre aplicação', valor: 15000, data: '2024-01-20', tipo: 'juros' },
      { id: 5, categoria: 'Financeiro', descricao: 'Multa contratual - Cliente', valor: 8500, data: '2024-01-22', tipo: 'multa' },
      { id: 6, categoria: 'Vendas', descricao: 'Parcela financiamento - Un. 102', valor: 35000, data: '2024-01-25', tipo: 'receita' },
      { id: 7, categoria: 'Aporte', descricao: 'Aporte Sócio - Investimento', valor: 500000, data: '2024-01-28', tipo: 'aporte' },
      { id: 8, categoria: 'Financeiro', descricao: 'Rendimento CDB', valor: 12000, data: '2024-01-30', tipo: 'juros' }
    ];

    // Saídas
    this.saidas = [
      { id: 1, planoConta: 'Mão de Obra', descricao: 'Folha de pagamento - Janeiro', valor: 280000, data: '2024-01-05', categoria: 'Custos Diretos' },
      { id: 2, planoConta: 'Materiais', descricao: 'Compra de cimento e aço', valor: 450000, data: '2024-01-08', categoria: 'Custos Diretos' },
      { id: 3, planoConta: 'Serviços Terceirizados', descricao: 'Instalação elétrica', valor: 85000, data: '2024-01-12', categoria: 'Custos Diretos' },
      { id: 4, planoConta: 'Administrativo', descricao: 'Aluguel escritório', valor: 15000, data: '2024-01-10', categoria: 'Despesas Operacionais' },
      { id: 5, planoConta: 'Marketing', descricao: 'Campanha digital', valor: 45000, data: '2024-01-15', categoria: 'Despesas Operacionais' },
      { id: 6, planoConta: 'Impostos', descricao: 'ISSQN', valor: 32000, data: '2024-01-20', categoria: 'Tributário' },
      { id: 7, planoConta: 'Financeiro', descricao: 'Juros empréstimo', valor: 28000, data: '2024-01-25', categoria: 'Despesas Financeiras' },
      { id: 8, planoConta: 'Equipamentos', descricao: 'Locação de equipamentos', valor: 65000, data: '2024-01-28', categoria: 'Custos Diretos' }
    ];

    // Projeção
    this.projecao = [
      { mes: 'Jan', entradas: 2540500, saidas: 1000000, saldo: 1540500, saldoAcumulado: 1540500 },
      { mes: 'Fev', entradas: 1850000, saidas: 1200000, saldo: 650000, saldoAcumulado: 2190500 },
      { mes: 'Mar', entradas: 2100000, saidas: 1350000, saldo: 750000, saldoAcumulado: 2940500 },
      { mes: 'Abr', entradas: 1950000, saidas: 1100000, saldo: 850000, saldoAcumulado: 3790500 },
      { mes: 'Mai', entradas: 2300000, saidas: 1450000, saldo: 850000, saldoAcumulado: 4640500 },
      { mes: 'Jun', entradas: 2150000, saidas: 1300000, saldo: 850000, saldoAcumulado: 5490500 },
      { mes: 'Jul', entradas: 1800000, saidas: 1250000, saldo: 550000, saldoAcumulado: 6040500 },
      { mes: 'Ago', entradas: 2400000, saidas: 1400000, saldo: 1000000, saldoAcumulado: 7040500 },
      { mes: 'Set', entradas: 2200000, saidas: 1350000, saldo: 850000, saldoAcumulado: 7890500 },
      { mes: 'Out', entradas: 2500000, saidas: 1500000, saldo: 1000000, saldoAcumulado: 8890500 },
      { mes: 'Nov', entradas: 2350000, saidas: 1400000, saldo: 950000, saldoAcumulado: 9840500 },
      { mes: 'Dez', entradas: 2800000, saidas: 1600000, saldo: 1200000, saldoAcumulado: 11040500 }
    ];

    this.calculateTotals();
  }

  private calculateTotals() {
    // Total de entradas
    this.totalEntradas = this.entradas.reduce((sum, e) => sum + e.valor, 0);

    // Total de saídas
    this.totalSaidas = this.saidas.reduce((sum, s) => sum + s.valor, 0);

    // Saldo atual
    this.saldoAtual = this.totalEntradas - this.totalSaidas;

    // Saldo projetado (último mês da projeção)
    this.saldoProjetado = this.projecao[this.projecao.length - 1]?.saldoAcumulado || 0;

    // Entradas por tipo
    this.entradasPorTipo = {
      receitas: this.entradas.filter(e => e.tipo === 'receita').reduce((sum, e) => sum + e.valor, 0),
      aportes: this.entradas.filter(e => e.tipo === 'aporte').reduce((sum, e) => sum + e.valor, 0),
      juros: this.entradas.filter(e => e.tipo === 'juros').reduce((sum, e) => sum + e.valor, 0),
      multas: this.entradas.filter(e => e.tipo === 'multa').reduce((sum, e) => sum + e.valor, 0)
    };

    // Saídas por plano de contas
    const saidasAgrupadas = this.saidas.reduce((acc, s) => {
      if (!acc[s.planoConta]) {
        acc[s.planoConta] = 0;
      }
      acc[s.planoConta] += s.valor;
      return acc;
    }, {} as { [key: string]: number });

    this.saidasPorPlano = Object.entries(saidasAgrupadas)
      .map(([nome, valor]) => ({
        nome,
        valor,
        percentual: (valor / this.totalSaidas) * 100
      }))
      .sort((a, b) => b.valor - a.valor);
  }

  changePeriodo(periodo: 'mensal' | 'trimestral' | 'anual') {
    this.selectedPeriodo = periodo;
    this.updateCharts();
  }

  changeView(view: 'entradas' | 'saidas') {
    this.selectedView = view;
  }

  filterEntradas(): EntradaItem[] {
    if (!this.selectedTipoEntrada) {
      return this.entradas;
    }
    return this.entradas.filter(e => e.tipo === this.selectedTipoEntrada);
  }

  private async initCharts() {
    try {
      const Chart = await import('chart.js/auto').then(m => m.default);

      this.initFluxoChart(Chart);
      this.initProjecaoChart(Chart);
      this.initEntradasPieChart(Chart);
      this.initSaidasPieChart(Chart);
    } catch (error) {
      console.error('Erro ao inicializar charts:', error);
    }
  }

  private initFluxoChart(Chart: any) {
    const canvas = document.getElementById('fluxoChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.fluxoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.projecao.map(p => p.mes),
        datasets: [
          {
            label: 'Entradas',
            data: this.projecao.map(p => p.entradas / 1000000),
            backgroundColor: 'rgba(0, 237, 177, 0.8)',
            borderColor: '#00EDB1',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Saídas',
            data: this.projecao.map(p => p.saidas / 1000000),
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
                return `${context.dataset.label || ''}: R$ ${value.toFixed(2)}M`;
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

  private initProjecaoChart(Chart: any) {
    const canvas = document.getElementById('projecaoChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.projecaoChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.projecao.map(p => p.mes),
        datasets: [
          {
            label: 'Saldo Acumulado',
            data: this.projecao.map(p => p.saldoAcumulado / 1000000),
            borderColor: '#09005C',
            backgroundColor: 'rgba(9, 0, 92, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#09005C',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Saldo Mensal',
            data: this.projecao.map(p => p.saldo / 1000000),
            borderColor: '#30ADFC',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#30ADFC',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
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
                return `${context.dataset.label || ''}: R$ ${value.toFixed(2)}M`;
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

  private initEntradasPieChart(Chart: any) {
    const canvas = document.getElementById('entradasPieChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.entradasPieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Receitas', 'Aportes', 'Juros', 'Multas'],
        datasets: [{
          data: [
            this.entradasPorTipo.receitas,
            this.entradasPorTipo.aportes,
            this.entradasPorTipo.juros,
            this.entradasPorTipo.multas
          ],
          backgroundColor: [
            'rgba(0, 237, 177, 0.8)',
            'rgba(9, 0, 92, 0.8)',
            'rgba(48, 173, 252, 0.8)',
            'rgba(255, 193, 7, 0.8)'
          ],
          borderColor: [
            '#00EDB1',
            '#09005C',
            '#30ADFC',
            '#ffc107'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context: { raw: unknown; label?: string }) => {
                const value = context.raw as number;
                return `${context.label || ''}: ${this.formatCurrency(value)}`;
              }
            }
          }
        }
      }
    });
  }

  private initSaidasPieChart(Chart: any) {
    const canvas = document.getElementById('saidasPieChart') as HTMLCanvasElement;
    if (!canvas) return;

    const colors = [
      'rgba(239, 68, 68, 0.8)',
      'rgba(9, 0, 92, 0.8)',
      'rgba(48, 173, 252, 0.8)',
      'rgba(0, 237, 177, 0.8)',
      'rgba(255, 193, 7, 0.8)',
      'rgba(156, 39, 176, 0.8)',
      'rgba(255, 87, 34, 0.8)',
      'rgba(0, 150, 136, 0.8)'
    ];

    this.saidasPieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: this.saidasPorPlano.map(s => s.nome),
        datasets: [{
          data: this.saidasPorPlano.map(s => s.valor),
          backgroundColor: colors.slice(0, this.saidasPorPlano.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context: { raw: unknown; label?: string }) => {
                const value = context.raw as number;
                return `${context.label || ''}: ${this.formatCurrency(value)}`;
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

  getTipoClass(tipo: string): string {
    const classes: { [key: string]: string } = {
      'receita': 'tipo-receita',
      'aporte': 'tipo-aporte',
      'juros': 'tipo-juros',
      'multa': 'tipo-multa'
    };
    return classes[tipo] || '';
  }

  getTipoLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'receita': 'Receita',
      'aporte': 'Aporte',
      'juros': 'Juros',
      'multa': 'Multa'
    };
    return labels[tipo] || tipo;
  }

  refreshData() {
    this.loadFluxoCaixaData();
    setTimeout(() => {
      this.updateCharts();
    }, 600);
  }
}
