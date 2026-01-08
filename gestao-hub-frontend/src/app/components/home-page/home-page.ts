import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  route: string;
  description: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.css']
})
export class HomePageComponent implements OnInit {
  userName = '';
  userRole = '';
  currentYear = new Date().getFullYear();

  quickActions: QuickAction[] = [
    {
      id: 'usuarios',
      icon: 'fas fa-users-cog',
      label: 'Gerenciar Usuários',
      color: '#09005C',
      route: '/home/usuarios',
      description: 'Visualizar e gerenciar usuários do sistema'
    },
    {
      id: 'analytics',
      icon: 'fas fa-chart-pie',
      label: 'Analytics',
      color: '#00EDB1',
      route: '/home/analytics',
      description: 'Visualizar métricas e estatísticas'
    },
    {
      id: 'configuracoes',
      icon: 'fas fa-cog',
      label: 'Configurações',
      color: '#30ADFC',
      route: '/home/configuracoes',
      description: 'Configurações do sistema'
    },
    {
      id: 'ajuda',
      icon: 'fas fa-question-circle',
      label: 'Ajuda',
      color: '#09005C',
      route: '/home/ajuda',
      description: 'Central de ajuda e suporte'
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    if (user) {
      this.userName = user.name;
      this.userRole = user.role === 'admin' ? 'Administrador' : 'Usuário';
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
}
