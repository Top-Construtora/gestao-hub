// Testa a lógica de agregação/transformação do dashboard com Supabase mockado,
// sem depender das tabelas reais.

jest.mock('../src/config/database', () => {
  const store = { tables: {} };
  const makeChain = (rows) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      then: (resolve) => resolve({ data: rows, error: null })
    };
    return chain;
  };
  return {
    __store: store,
    supabase: {
      from(table) {
        return makeChain(store.tables[table] || []);
      }
    }
  };
});

const db = require('../src/config/database');
const dashboard = require('../src/services/dashboardDataService');

function setTables(tables) {
  db.__store.tables = tables;
}

beforeEach(() => setTables({}));

describe('projetarFluxo', () => {
  it('gera 12 meses com saldo = entradas - saídas', () => {
    const fluxo = dashboard._internal.projetarFluxo(120000000);
    expect(fluxo.labels).toHaveLength(12);
    expect(fluxo.entradas).toHaveLength(12);
    expect(fluxo.saldo[0]).toBeCloseTo(fluxo.entradas[0] - fluxo.saidas[0], 2);
  });
});

describe('getDashboardExecutivo', () => {
  it('agrega segmentos, soma VGV/caixa e calcula % vendido', async () => {
    setTables({
      empreendimentos: [
        { id: 1, nome: 'A', fase: 'Lançamento', segmento: 'Vertical', vgv_total: 100, vgv_vendido: 50, caixa_disponivel: 10, is_active: true },
        { id: 2, nome: 'B', fase: 'Construção', segmento: 'Vertical', vgv_total: 100, vgv_vendido: 30, caixa_disponivel: 20, is_active: true },
        { id: 3, nome: 'C', fase: 'Entrega', segmento: 'Horizontal', vgv_total: 200, vgv_vendido: 120, caixa_disponivel: 5, is_active: true }
      ],
      financeiro_mensal: [
        { mes_label: 'Jan', entradas: 5000000, saidas: 2000000 },
        { mes_label: 'Fev', entradas: 8000000, saidas: 3000000 }
      ]
    });

    const r = await dashboard.getDashboardExecutivo();
    expect(r.totalEmpreendimentos).toBe(3);
    expect(r.vgvTotal).toBe(400);
    expect(r.vgvVendido).toBe(200);
    expect(r.percentualVendas).toBeCloseTo(50, 5);
    expect(r.caixaConsolidado).toBe(35);
    const vertical = r.empreendimentosPorSegmento.find(s => s.segmento === 'Vertical');
    expect(vertical.quantidade).toBe(2);
    expect(r.fluxoCaixa.entradas).toEqual([5, 8]); // convertido para milhões
    expect(r.fluxoCaixa.saldo).toEqual([3, 5]);
  });

  it('devolve zeros quando não há dados', async () => {
    const r = await dashboard.getDashboardExecutivo();
    expect(r.totalEmpreendimentos).toBe(0);
    expect(r.vgvTotal).toBe(0);
    expect(r.percentualVendas).toBe(0);
  });
});

describe('getFinanceiro', () => {
  it('calcula percentual por centro e acumulado do ano', async () => {
    setTables({
      financeiro_mensal: [
        { mes_label: 'Jan', a_pagar: 100, a_receber: 200 },
        { mes_label: 'Fev', a_pagar: 300, a_receber: 400 }
      ],
      financeiro_centros_custo: [
        { id: 1, nome: 'Obra', categoria: 'centro_custo', previsto: 1000, realizado: 900, ordem: 1 },
        { id: 2, nome: 'Vendas', categoria: 'plano_financeiro', previsto: 2000, realizado: 2200, ordem: 1 }
      ]
    });

    const r = await dashboard.getFinanceiro();
    expect(r.totalPagar).toBe(300); // último mês
    expect(r.totalReceber).toBe(400);
    expect(r.totalPagarAcumulado).toBe(400);
    expect(r.totalReceberAcumulado).toBe(600);
    expect(r.centrosCusto[0].percentual).toBe(90);
    expect(r.planosFinanceiros[0].percentual).toBe(110);
  });
});

describe('getObra', () => {
  it('calcula % executado, saldo e diferença de revisões', async () => {
    setTables({
      empreendimentos: [{ id: 4, nome: 'Metropolitan', area_total: 10000 }],
      obra_centros_custo: [
        { id: 1, empreendimento_id: 4, nome: 'Fundação', orcado_original: 1000, orcado_atual: 1200, realizado: 600, ordem: 1 }
      ],
      obra_execucao_mensal: [
        { empreendimento_id: 4, mes_label: 'Jan', mes_ordem: 1, fisico_acumulado: 10, financeiro_acumulado: 8 }
      ],
      obra_revisoes: [
        { id: 1, empreendimento_id: 4, numero: 'REV-001', valor_anterior: 1000, valor_novo: 1200, status: 'aprovada' }
      ]
    });

    const r = await dashboard.getObra(4);
    expect(r.nome).toBe('Metropolitan');
    expect(r.areaTotal).toBe(10000);
    expect(r.centrosCusto[0].percentualExecutado).toBe(50);
    expect(r.centrosCusto[0].saldo).toBe(600);
    expect(r.revisoesOrcamentarias[0].diferenca).toBe(200);
  });
});

describe('getIndicadores', () => {
  it('mapeia margens e viabilidade dos empreendimentos', async () => {
    setTables({
      indicadores_margens: [
        { mes_label: 'Jan', margem_bruta_projetada: 32, margem_bruta_realizada: 30, margem_liquida_projetada: 18, margem_liquida_realizada: 17 }
      ],
      empreendimentos: [
        { id: 1, nome: 'A', roi_projetado: 28, roi_realizado: 31, payback_projetado: 36, payback_realizado: 32, tir_projetada: 18, tir_realizada: 20, vpl_projetado: 100, vpl_realizado: 120, status_viabilidade: 'acima', is_active: true }
      ]
    });

    const r = await dashboard.getIndicadores();
    expect(r.margens[0].margemBrutaRealizada).toBe(30);
    expect(r.viabilidade[0].empreendimento).toBe('A');
    expect(r.viabilidade[0].roiRealizado).toBe(31);
    expect(r.viabilidade[0].status).toBe('acima');
  });
});

describe('getHomeDashboard', () => {
  it('conta obras em construção e usa a última margem líquida', async () => {
    setTables({
      empreendimentos: [
        { id: 1, nome: 'A', fase: 'Construção', vgv_total: 100, caixa_disponivel: 10, is_active: true },
        { id: 2, nome: 'B', fase: 'Construção', vgv_total: 50, caixa_disponivel: 5, is_active: true },
        { id: 3, nome: 'C', fase: 'Entrega', vgv_total: 30, caixa_disponivel: 2, is_active: true }
      ],
      financeiro_mensal: [{ mes_label: 'Jan', entradas: 1000000, saidas: 500000 }],
      indicadores_margens: [
        { mes_label: 'Jan', margem_liquida_realizada: 20 },
        { mes_label: 'Fev', margem_liquida_realizada: 23.2 }
      ],
      home_alertas: [{ id: 1, tipo: 'info', titulo: 'Teste', descricao: 'x', data: '2026-07-01' }]
    });

    const r = await dashboard.getHomeDashboard();
    expect(r.kpis.empreendimentosAtivos).toBe(3);
    expect(r.kpis.obrasEmAndamento).toBe(2);
    expect(r.kpis.vgvTotal).toBe(180);
    expect(r.kpis.margemLiquida).toBe(23.2);
    expect(r.alertas).toHaveLength(1);
  });
});
