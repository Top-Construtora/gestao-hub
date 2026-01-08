import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { Router } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { UserService } from '../../services/user';

interface StatCard {
  id: string;
  label: string;
  value: number | string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  color: string;
  bgColor: string;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './analytics-page.html',
  styleUrls: ['./analytics-page.css']
})
export class AnalyticsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  selectedPeriod: 'week' | 'month' | 'year' = 'month';

  statCards: StatCard[] = [];
  userActivityChart: Chart | null = null;

  userActivityData: any = {
    labels: [],
    datasets: []
  };

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadAnalyticsData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCharts();
    }, 100);
  }

  ngOnDestroy() {
    if (this.userActivityChart) {
      this.userActivityChart.destroy();
    }
  }

  async loadAnalyticsData() {
    this.isLoading = true;
    try {
      // Carregar dados de usuários
      const users = await this.userService.getUsers().toPromise();
      const totalUsers = users?.users?.length || 0;
      const activeUsers = users?.users?.filter((u: any) => u.is_active)?.length || 0;

      this.updateStatCards(totalUsers, activeUsers);
      this.generateUserActivityData();

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      this.updateStatCards(0, 0);
    } finally {
      this.isLoading = false;
    }
  }

  private updateStatCards(totalUsers: number, activeUsers: number) {
    this.statCards = [
      {
        id: 'total-users',
        label: 'Total de Usuários',
        value: totalUsers,
        change: `${activeUsers} ativos`,
        changeType: 'positive',
        icon: 'fas fa-users',
        color: '#09005C',
        bgColor: 'rgba(9, 0, 92, 0.15)'
      },
      {
        id: 'active-users',
        label: 'Usuários Ativos',
        value: activeUsers,
        change: totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}% do total` : '0%',
        changeType: 'positive',
        icon: 'fas fa-user-check',
        color: '#00EDB1',
        bgColor: 'rgba(0, 237, 177, 0.15)'
      },
      {
        id: 'system-health',
        label: 'Saúde do Sistema',
        value: 'Ótimo',
        change: 'Todos os serviços operacionais',
        changeType: 'positive',
        icon: 'fas fa-heart',
        color: '#30ADFC',
        bgColor: 'rgba(48, 173, 252, 0.15)'
      },
      {
        id: 'uptime',
        label: 'Disponibilidade',
        value: '99.9%',
        change: 'Últimos 30 dias',
        changeType: 'positive',
        icon: 'fas fa-server',
        color: '#09005C',
        bgColor: 'rgba(9, 0, 92, 0.15)'
      }
    ];
  }

  private generateUserActivityData() {
    // Dados de exemplo para atividade de usuários
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const data = [12, 19, 15, 25, 22, 10, 8];

    this.userActivityData = {
      labels: labels,
      datasets: [
        {
          label: 'Atividade de Usuários',
          data: data,
          backgroundColor: 'rgba(9, 0, 92, 0.1)',
          borderColor: '#09005C',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    };
  }

  private async initCharts() {
    try {
      const Chart = await import('chart.js/auto').then(m => m.default);

      // User Activity Chart
      const activityCanvas = document.getElementById('userActivityChart') as HTMLCanvasElement;
      if (activityCanvas) {
        this.userActivityChart = new Chart(activityCanvas, {
          type: 'line',
          data: this.userActivityData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0
                }
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Erro ao inicializar charts:', error);
    }
  }

  changePeriod(period: 'week' | 'month' | 'year') {
    this.selectedPeriod = period;
    this.loadAnalyticsData();
  }

  refreshData() {
    this.loadAnalyticsData();
  }
}
