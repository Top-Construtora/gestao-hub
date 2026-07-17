import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DashboardService } from '../../services/dashboard.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import type { Chart } from 'chart.js';

interface KPICard {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  color: string;
  bgColor: string;
  trend?: number;
  route?: string;
}

interface ModuleCard {
  id: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  route: string;
}

interface AlertItem {
  id: number;
  tipo: 'warning' | 'info' | 'success' | 'danger';
  titulo: string;
  descricao: string;
  data: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.css']
})
export class HomePageComponent implements OnInit, AfterViewInit, OnDestroy {
  userName = '';
  userRole = '';
  currentDate = new Date();

  // KPIs
  kpiCards: KPICard[] = [];

  // Módulos
  moduleCards: ModuleCard[] = [
    {
      id: 'dashboard-executivo',
      icon: 'fas fa-chart-bar',
      label: 'Dashboard Executivo',
      description: 'Visão consolidada dos negócios',
      color: '#09005C',
      route: '/home/dashboard-executivo'
    },
    {
      id: 'empreendimentos',
      icon: 'fas fa-building',
      label: 'Empreendimentos',
      description: 'Gestão de empreendimentos',
      color: '#00EDB1',
      route: '/home/empreendimentos'
    },
    {
      id: 'financeiro',
      icon: 'fas fa-dollar-sign',
      label: 'Financeiro',
      description: 'Pagar, receber e viabilidade',
      color: '#30ADFC',
      route: '/home/financeiro'
    },
    {
      id: 'fluxo-caixa',
      icon: 'fas fa-money-bill-wave',
      label: 'Fluxo de Caixa',
      description: 'Entradas, saídas e projeções',
      color: '#09005C',
      route: '/home/fluxo-caixa'
    },
    {
      id: 'obra',
      icon: 'fas fa-hard-hat',
      label: 'Obra',
      description: 'Acompanhamento de obras',
      color: '#ffc107',
      route: '/home/obra'
    },
    {
      id: 'indicadores',
      icon: 'fas fa-percentage',
      label: 'Indicadores Financeiros',
      description: 'Margens, ROI, TIR e Payback',
      color: '#00EDB1',
      route: '/home/indicadores-financeiros'
    }
  ];

  // Alertas
  alertas: AlertItem[] = [];

  // Chart
  miniChart: Chart | null = null;
  private miniFluxo: { labels: string[]; entradas: number[]; saidas: number[] } = {
    labels: [], entradas: [], saidas: []
  };

  // Dados resumo
  empreendimentosAtivos = 0;
  obrasEmAndamento = 0;
  vendasMes = 0;

  private dashboardService = inject(DashboardService);

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user) {
      this.userName = user.name;
      this.userRole = user.role === 'admin' ? 'Administrador' :
                      user.role === 'admin_gerencial' ? 'Admin Gerencial' : 'Usuário';
    }
    this.loadData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initChart();
    }, 100);
  }

  ngOnDestroy() {
    if (this.miniChart) {
      this.miniChart.destroy();
    }
  }

  private loadData() {
    this.dashboardService.getHome().subscribe({
      next: (data) => {
        const k = data.kpis;
        this.empreendimentosAtivos = k.empreendimentosAtivos;
        this.obrasEmAndamento = k.obrasEmAndamento;

        this.kpiCards = [
          {
            id: 'vgv',
            label: 'VGV Total',
            value: this.formatCurrencyShort(k.vgvTotal),
            subValue: `${k.empreendimentosAtivos} empreendimentos`,
            icon: 'fas fa-city',
            color: '#09005C',
            bgColor: 'rgba(9, 0, 92, 0.15)',
            route: '/home/empreendimentos'
          },
          {
            id: 'caixa',
            label: 'Caixa Disponível',
            value: this.formatCurrencyShort(k.caixaDisponivel),
            subValue: 'consolidado',
            icon: 'fas fa-wallet',
            color: '#00EDB1',
            bgColor: 'rgba(0, 237, 177, 0.15)',
            route: '/home/fluxo-caixa'
          },
          {
            id: 'obras',
            label: 'Obras em Andamento',
            value: `${k.obrasEmAndamento}`,
            subValue: 'em construção',
            icon: 'fas fa-hard-hat',
            color: '#30ADFC',
            bgColor: 'rgba(48, 173, 252, 0.15)',
            route: '/home/obra'
          },
          {
            id: 'margem',
            label: 'Margem Líquida',
            value: `${k.margemLiquida.toFixed(1)}%`,
            subValue: 'realizada',
            icon: 'fas fa-chart-line',
            color: '#ffc107',
            bgColor: 'rgba(255, 193, 7, 0.15)',
            route: '/home/indicadores-financeiros'
          }
        ];

        this.alertas = data.alertas.map((a) => ({
          id: a.id,
          tipo: a.tipo as AlertItem['tipo'],
          titulo: a.titulo,
          descricao: a.descricao,
          data: a.data
        }));

        this.miniFluxo = data.miniFluxo;
        this.refreshChart();
      },
      error: (err) => {
        console.error('Erro ao carregar dados da home:', err);
      }
    });
  }

  private formatCurrencyShort(value: number): string {
    if (value >= 1000000000) return `R$ ${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return `R$ ${value.toFixed(0)}`;
  }

  private refreshChart() {
    if (this.miniChart) {
      this.miniChart.destroy();
      this.miniChart = null;
    }
    setTimeout(() => this.initChart(), 50);
  }

  private async initChart() {
    try {
      const Chart = await import('chart.js/auto').then(m => m.default);
      const canvas = document.getElementById('miniFluxoChart') as HTMLCanvasElement;
      if (!canvas) return;

      this.miniChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: this.miniFluxo.labels,
          datasets: [
            {
              label: 'Entradas',
              data: this.miniFluxo.entradas,
              borderColor: '#00EDB1',
              backgroundColor: 'rgba(0, 237, 177, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0
            },
            {
              label: 'Saídas',
              data: this.miniFluxo.saidas,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0
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
                padding: 15,
                font: { size: 11 }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                font: { size: 10 },
                callback: (value: string | number) => `${value}M`
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Erro ao inicializar chart:', error);
    }
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  getAlertIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'warning': 'fas fa-exclamation-triangle',
      'info': 'fas fa-info-circle',
      'success': 'fas fa-check-circle',
      'danger': 'fas fa-times-circle'
    };
    return icons[tipo] || 'fas fa-bell';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
