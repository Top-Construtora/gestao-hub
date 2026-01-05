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
        { id: 'dashboard', icon: 'fas fa-chart-line', text: 'Dashboard', route: '/home/dashboard' },
        { id: 'clientes', icon: 'fas fa-users', text: 'Clientes', route: '/home/clientes', adminOnly: true },
        { id: 'contratos', icon: 'fas fa-file-contract', text: 'Contratos', route: '/home/contratos', adminOnly: true },
        { id: 'servicos', icon: 'fas fa-briefcase', text: 'Serviços', route: '/home/servicos' }
      ]
    },
    {
      title: 'ANALISES',
      items: [
        { id: 'relatorios', icon: 'fas fa-chart-bar', text: 'Relatorios', route: '/home/relatorios', adminOnly: true, adminOnlyNotGerencial: true },
        { id: 'analytics', icon: 'fas fa-chart-pie', text: 'Analytics', route: '/home/analytics', adminOnly: true, adminOnlyNotGerencial: true }
      ]
    },
    {
      title: 'CONFIGURACOES',
      items: [
        { id: 'usuarios', icon: 'fas fa-users-cog', text: 'Usuarios', route: '/home/usuarios', adminOnly: true, adminOnlyNotGerencial: true },
        { id: 'configuracoes', icon: 'fas fa-cog', text: 'Configuracoes', route: '/home/configuracoes' }
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
