import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

interface NavItem {
  id: string;
  icon: string;
  text: string;
  route?: string;
  adminOnly?: boolean; // Requer Admin ou Admin Gerencial
  adminOnlyNotGerencial?: boolean; // Requer APENAS Admin (bloqueia Admin Gerencial)
  children?: NavItem[];
  isExpanded?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  @Input() isMobileSidebarOpen = false;
  @Output() sidebarToggled = new EventEmitter<void>();

  navSections: NavSection[] = [
    {
      title: 'PRINCIPAL',
      items: [
        { id: 'inicio', icon: 'fas fa-home', text: 'Início', route: '/home/inicio' },
        { id: 'dashboard-executivo', icon: 'fas fa-chart-bar', text: 'Dashboard Executivo', route: '/home/dashboard-executivo' },
        { id: 'empreendimentos', icon: 'fas fa-building', text: 'Empreendimentos', route: '/home/empreendimentos' },
        { id: 'financeiro', icon: 'fas fa-dollar-sign', text: 'Financeiro', route: '/home/financeiro' },
        { id: 'fluxo-caixa', icon: 'fas fa-money-bill-wave', text: 'Fluxo de Caixa', route: '/home/fluxo-caixa' },
        { id: 'obra', icon: 'fas fa-hard-hat', text: 'Obra', route: '/home/obra' },
        { id: 'indicadores-financeiros', icon: 'fas fa-percentage', text: 'Indicadores Financeiros', route: '/home/indicadores-financeiros' },
        { id: 'analytics', icon: 'fas fa-chart-pie', text: 'Analytics', route: '/home/analytics' }
      ]
    },
    {
      title: 'CONFIGURAÇÕES',
      items: [
        { id: 'usuarios', icon: 'fas fa-users-cog', text: 'Usuários', route: '/home/usuarios', adminOnly: true, adminOnlyNotGerencial: true },
        { id: 'configuracoes', icon: 'fas fa-cog', text: 'Configuraçoes', route: '/home/configuracoes' }
      ]
    },
    {
      title: 'AJUDA',
      items: [
        { id: 'ajuda', icon: 'fas fa-question-circle', text: 'Suporte', route: '/home/ajuda' }
      ]
    }
  ];

  filteredNavSections: NavSection[] = [];

  constructor(private router: Router, private authService: AuthService) {
    this.filterNavigationByRole();
  }

  isRouteActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'subset',
      queryParams: 'subset',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  private filterNavigationByRole() {
    const isAdmin = this.authService.isAdmin();
    const isAdminGerencial = this.authService.isAdminGerencial();

    this.filteredNavSections = this.navSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Bloquear itens que sao APENAS para Admin (nao Admin Gerencial)
        if (item.adminOnlyNotGerencial && !isAdmin) {
          return false;
        }

        // Se e admin, pode ver tudo
        if (isAdmin) {
          return true;
        }

        // Se e Admin Gerencial, pode ver itens adminOnly (exceto adminOnlyNotGerencial)
        if (isAdminGerencial && item.adminOnly) {
          return true;
        }

        // Se nao e admin nem admin gerencial, nao pode ver itens adminOnly
        if (item.adminOnly) {
          return false;
        }

        // Caso contrario, pode ver
        return true;
      }).map(item => {
        // Filtrar children tambem
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(child => {
              // Bloquear children que sao APENAS para Admin
              if (child.adminOnlyNotGerencial && !isAdmin) {
                return false;
              }
              return true;
            })
          };
        }
        return item;
      }).filter(item => !item.children || item.children.length > 0)
    })).filter(section => section.items.length > 0);
  }

  toggleSidebar(): void {
    this.sidebarToggled.emit();
  }

  toggleDropdown(item: NavItem): void {
    if (item.children) {
      if (this.isCollapsed) {
        this.toggleSidebar();
        setTimeout(() => {
          item.isExpanded = true;
        }, 100);
      } else {
        item.isExpanded = !item.isExpanded;
      }
    }
  }

  isChildRouteActive(children?: NavItem[]): boolean {
    if (!children) return false;
    return children.some(child => child.route && this.isRouteActive(child.route));
  }
}
