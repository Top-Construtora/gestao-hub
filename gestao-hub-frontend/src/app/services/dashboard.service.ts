import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FluxoSerie {
  labels: string[];
  entradas: number[];
  saidas: number[];
  saldo: number[];
}

export interface EmpreendimentoDTO {
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
  areaTotal: number;
  fluxoProjetado: FluxoSerie;
}

export interface DashboardExecutivoDTO {
  totalEmpreendimentos: number;
  empreendimentosPorSegmento: { segmento: string; quantidade: number; cor: string }[];
  vgvTotal: number;
  vgvVendido: number;
  percentualVendas: number;
  caixaConsolidado: number;
  fluxoCaixa: FluxoSerie;
}

export interface HomeDashboardDTO {
  kpis: {
    vgvTotal: number;
    empreendimentosAtivos: number;
    caixaDisponivel: number;
    obrasEmAndamento: number;
    margemLiquida: number;
  };
  alertas: { id: number; tipo: string; titulo: string; descricao: string; data: string }[];
  miniFluxo: { labels: string[]; entradas: number[]; saidas: number[] };
}

export interface CentroCustoDTO {
  id: number;
  nome: string;
  previsto: number;
  realizado: number;
  percentual: number;
}

export interface FinanceiroDTO {
  totalPagar: number;
  totalReceber: number;
  totalPagarAcumulado: number;
  totalReceberAcumulado: number;
  centrosCusto: CentroCustoDTO[];
  planosFinanceiros: CentroCustoDTO[];
  pagarReceberMensal: { labels: string[]; pagar: number[]; receber: number[] };
}

export interface FluxoCaixaDTO {
  entradas: { id: number; categoria: string; descricao: string; valor: number; data: string; tipo: string }[];
  saidas: { id: number; planoConta: string; descricao: string; valor: number; data: string; categoria: string }[];
  projecao: { mes: string; entradas: number; saidas: number; saldo: number; saldoAcumulado: number }[];
}

export interface ObraDTO {
  empreendimentoId: number;
  nome: string;
  areaTotal: number;
  centrosCusto: {
    id: number; nome: string; orcadoOriginal: number; orcadoAtual: number;
    realizado: number; percentualExecutado: number; saldo: number;
  }[];
  execucaoComparativo: { mes: string; fisicoAcumulado: number; financeiroAcumulado: number }[];
  revisoesOrcamentarias: {
    id: number; numero: string; data: string; descricao: string;
    valorAnterior: number; valorNovo: number; diferenca: number;
    status: 'aprovada' | 'pendente' | 'rejeitada'; responsavel: string;
  }[];
}

export interface IndicadoresDTO {
  margens: {
    mes: string; margemBrutaProjetada: number; margemBrutaRealizada: number;
    margemLiquidaProjetada: number; margemLiquidaRealizada: number;
  }[];
  viabilidade: {
    id: number; empreendimento: string; roiProjetado: number; roiRealizado: number;
    paybackProjetado: number; paybackRealizado: number; tirProjetada: number; tirRealizada: number;
    vplProjetado: number; vplRealizado: number; status: 'acima' | 'dentro' | 'abaixo';
  }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getEmpreendimentos(): Observable<{ empreendimentos: EmpreendimentoDTO[] }> {
    return this.http.get<{ empreendimentos: EmpreendimentoDTO[] }>(`${this.api}/empreendimentos`);
  }

  getDashboardExecutivo(): Observable<DashboardExecutivoDTO> {
    return this.http.get<DashboardExecutivoDTO>(`${this.api}/dashboard/executivo`);
  }

  getHome(): Observable<HomeDashboardDTO> {
    return this.http.get<HomeDashboardDTO>(`${this.api}/dashboard/home`);
  }

  getFinanceiro(): Observable<FinanceiroDTO> {
    return this.http.get<FinanceiroDTO>(`${this.api}/financeiro`);
  }

  getFluxoCaixa(): Observable<FluxoCaixaDTO> {
    return this.http.get<FluxoCaixaDTO>(`${this.api}/fluxo-caixa`);
  }

  getObraEmpreendimentos(): Observable<{ empreendimentos: { id: number; nome: string }[] }> {
    return this.http.get<{ empreendimentos: { id: number; nome: string }[] }>(`${this.api}/obras`);
  }

  getObra(empreendimentoId: number): Observable<ObraDTO> {
    return this.http.get<ObraDTO>(`${this.api}/obras/${empreendimentoId}`);
  }

  getIndicadores(): Observable<IndicadoresDTO> {
    return this.http.get<IndicadoresDTO>(`${this.api}/indicadores`);
  }
}
