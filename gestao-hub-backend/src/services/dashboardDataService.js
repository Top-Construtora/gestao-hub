const { supabase } = require('../config/database');

// Cores por segmento (mesma identidade visual do frontend)
const SEGMENTO_CORES = {
  Vertical: '#09005C',
  Horizontal: '#00EDB1',
  Loteamento: '#30ADFC'
};

const toNumber = (v) => (v === null || v === undefined ? 0 : Number(v));
const toMillions = (v) => Math.round((toNumber(v) / 1000000) * 100) / 100;

// Executa uma query e devolve [] em caso de erro (ex.: migração ainda não rodada),
// para que as telas exibam estado vazio em vez de quebrar.
async function safeSelect(table, columns = '*', build) {
  if (!supabase) return [];
  try {
    let query = supabase.from(table).select(columns);
    if (build) query = build(query);
    const { data, error } = await query;
    if (error) {
      console.warn(`⚠️ [dashboard] Falha ao consultar '${table}':`, error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn(`⚠️ [dashboard] Exceção ao consultar '${table}':`, err.message);
    return [];
  }
}

function mapEmpreendimento(e) {
  return {
    id: e.id,
    nome: e.nome,
    fase: e.fase,
    spe: e.spe,
    segmento: e.segmento,
    vgvTotal: toNumber(e.vgv_total),
    vgvVendido: toNumber(e.vgv_vendido),
    percentualVendas: toNumber(e.percentual_vendas),
    percentualObras: toNumber(e.percentual_obras),
    percentualRecebiveis: toNumber(e.percentual_recebiveis),
    caixaDisponivel: toNumber(e.caixa_disponivel),
    resultadoProjetado: toNumber(e.resultado_projetado),
    resultadoRealizado: toNumber(e.resultado_realizado),
    areaTotal: toNumber(e.area_total)
  };
}

// Projeção mensal de fluxo (em milhões) derivada do VGV real do empreendimento.
// Espelha a curva de desembolso/recebimento usada nos gráficos individuais.
function projetarFluxo(vgvTotal) {
  const base = toNumber(vgvTotal) / 12000000;
  const fatorEntradas = [0.8, 1.2, 1.0, 0.9, 1.4, 1.1, 1.3, 1.0, 1.5, 1.2, 1.6, 1.4];
  const fatorSaidas = [0.6, 0.8, 0.7, 0.65, 0.9, 0.75, 0.85, 0.7, 1.0, 0.8, 1.1, 0.95];
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const entradas = fatorEntradas.map((f) => Math.round(base * f * 100) / 100);
  const saidas = fatorSaidas.map((f) => Math.round(base * f * 100) / 100);
  const saldo = entradas.map((e, i) => Math.round((e - saidas[i]) * 100) / 100);
  return { labels, entradas, saidas, saldo };
}

async function fetchEmpreendimentos() {
  const rows = await safeSelect('empreendimentos', '*', (q) =>
    q.eq('is_active', true).order('id')
  );
  return rows.map(mapEmpreendimento);
}

// ---- Empreendimentos (tela Empreendimentos) --------------------------------
async function listEmpreendimentos() {
  const empreendimentos = await fetchEmpreendimentos();
  return empreendimentos.map((e) => ({
    ...e,
    fluxoProjetado: projetarFluxo(e.vgvTotal)
  }));
}

// ---- Dashboard Executivo ----------------------------------------------------
async function getDashboardExecutivo() {
  const [empreendimentos, mensal] = await Promise.all([
    fetchEmpreendimentos(),
    safeSelect('financeiro_mensal', '*', (q) => q.order('mes'))
  ]);

  const porSegmento = {};
  for (const e of empreendimentos) {
    porSegmento[e.segmento] = (porSegmento[e.segmento] || 0) + 1;
  }
  const empreendimentosPorSegmento = Object.entries(porSegmento).map(([segmento, quantidade]) => ({
    segmento,
    quantidade,
    cor: SEGMENTO_CORES[segmento] || '#6366f1'
  }));

  const vgvTotal = empreendimentos.reduce((s, e) => s + e.vgvTotal, 0);
  const vgvVendido = empreendimentos.reduce((s, e) => s + e.vgvVendido, 0);
  const caixaConsolidado = empreendimentos.reduce((s, e) => s + e.caixaDisponivel, 0);

  const labels = mensal.map((m) => m.mes_label);
  const entradas = mensal.map((m) => toMillions(m.entradas));
  const saidas = mensal.map((m) => toMillions(m.saidas));
  const saldo = entradas.map((e, i) => Math.round((e - saidas[i]) * 100) / 100);

  return {
    totalEmpreendimentos: empreendimentos.length,
    empreendimentosPorSegmento,
    vgvTotal,
    vgvVendido,
    percentualVendas: vgvTotal > 0 ? (vgvVendido / vgvTotal) * 100 : 0,
    caixaConsolidado,
    fluxoCaixa: { labels, entradas, saidas, saldo }
  };
}

// ---- Home (tela Início) -----------------------------------------------------
async function getHomeDashboard() {
  const [empreendimentos, mensal, margens, alertasRows] = await Promise.all([
    fetchEmpreendimentos(),
    safeSelect('financeiro_mensal', '*', (q) => q.order('mes')),
    safeSelect('indicadores_margens', '*', (q) => q.order('mes')),
    safeSelect('home_alertas', '*', (q) => q.eq('is_active', true).order('data', { ascending: false }))
  ]);

  const vgvTotal = empreendimentos.reduce((s, e) => s + e.vgvTotal, 0);
  const caixaDisponivel = empreendimentos.reduce((s, e) => s + e.caixaDisponivel, 0);
  const obrasEmAndamento = empreendimentos.filter((e) => e.fase === 'Construção').length;
  const ultimaMargem = margens.length ? margens[margens.length - 1] : null;
  const margemLiquida = ultimaMargem ? toNumber(ultimaMargem.margem_liquida_realizada) : 0;

  const primeiros6 = mensal.slice(0, 6);
  const miniFluxo = {
    labels: primeiros6.map((m) => m.mes_label),
    entradas: primeiros6.map((m) => toMillions(m.entradas)),
    saidas: primeiros6.map((m) => toMillions(m.saidas))
  };

  const alertas = alertasRows.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    titulo: a.titulo,
    descricao: a.descricao,
    data: a.data
  }));

  return {
    kpis: {
      vgvTotal,
      empreendimentosAtivos: empreendimentos.length,
      caixaDisponivel,
      obrasEmAndamento,
      margemLiquida
    },
    alertas,
    miniFluxo
  };
}

// ---- Financeiro -------------------------------------------------------------
async function getFinanceiro() {
  const [mensal, centros] = await Promise.all([
    safeSelect('financeiro_mensal', '*', (q) => q.order('mes')),
    safeSelect('financeiro_centros_custo', '*', (q) => q.order('ordem'))
  ]);

  const ultimoMes = mensal.length ? mensal[mensal.length - 1] : null;
  const totalPagar = ultimoMes ? toNumber(ultimoMes.a_pagar) : 0;
  const totalReceber = ultimoMes ? toNumber(ultimoMes.a_receber) : 0;
  const totalPagarAcumulado = mensal.reduce((s, m) => s + toNumber(m.a_pagar), 0);
  const totalReceberAcumulado = mensal.reduce((s, m) => s + toNumber(m.a_receber), 0);

  const mapCentro = (c) => ({
    id: c.id,
    nome: c.nome,
    previsto: toNumber(c.previsto),
    realizado: toNumber(c.realizado),
    percentual: toNumber(c.previsto) > 0
      ? Math.round((toNumber(c.realizado) / toNumber(c.previsto)) * 1000) / 10
      : 0
  });

  return {
    totalPagar,
    totalReceber,
    totalPagarAcumulado,
    totalReceberAcumulado,
    centrosCusto: centros.filter((c) => c.categoria === 'centro_custo').map(mapCentro),
    planosFinanceiros: centros.filter((c) => c.categoria === 'plano_financeiro').map(mapCentro),
    pagarReceberMensal: {
      labels: mensal.map((m) => m.mes_label),
      pagar: mensal.map((m) => toMillions(m.a_pagar)),
      receber: mensal.map((m) => toMillions(m.a_receber))
    }
  };
}

// ---- Fluxo de Caixa ---------------------------------------------------------
async function getFluxoCaixa() {
  const [lancamentos, mensal] = await Promise.all([
    safeSelect('lancamentos_financeiros', '*', (q) => q.order('data')),
    safeSelect('financeiro_mensal', '*', (q) => q.order('mes'))
  ]);

  const entradas = lancamentos
    .filter((l) => l.tipo === 'entrada')
    .map((l) => ({
      id: l.id,
      categoria: l.categoria,
      descricao: l.descricao,
      valor: toNumber(l.valor),
      data: l.data,
      tipo: l.subtipo
    }));

  const saidas = lancamentos
    .filter((l) => l.tipo === 'saida')
    .map((l) => ({
      id: l.id,
      planoConta: l.plano_conta,
      descricao: l.descricao,
      valor: toNumber(l.valor),
      data: l.data,
      categoria: l.centro_custo
    }));

  let acumulado = 0;
  const projecao = mensal.map((m) => {
    const ent = toNumber(m.entradas);
    const sai = toNumber(m.saidas);
    const saldo = ent - sai;
    acumulado += saldo;
    return { mes: m.mes_label, entradas: ent, saidas: sai, saldo, saldoAcumulado: acumulado };
  });

  return { entradas, saidas, projecao };
}

// ---- Obra -------------------------------------------------------------------
// Lista de empreendimentos que possuem dados de obra (para o seletor da tela).
async function getObraEmpreendimentos() {
  const centros = await safeSelect('obra_centros_custo', 'empreendimento_id');
  const ids = [...new Set(centros.map((c) => c.empreendimento_id))];
  if (!ids.length) return [];
  const empreendimentos = await safeSelect('empreendimentos', 'id, nome', (q) =>
    q.in('id', ids).order('id')
  );
  return empreendimentos.map((e) => ({ id: e.id, nome: e.nome }));
}

async function getObra(empreendimentoId) {
  const id = Number(empreendimentoId);
  const [empRows, centros, execucao, revisoes] = await Promise.all([
    safeSelect('empreendimentos', 'id, nome, area_total', (q) => q.eq('id', id)),
    safeSelect('obra_centros_custo', '*', (q) => q.eq('empreendimento_id', id).order('ordem')),
    safeSelect('obra_execucao_mensal', '*', (q) => q.eq('empreendimento_id', id).order('mes_ordem')),
    safeSelect('obra_revisoes', '*', (q) => q.eq('empreendimento_id', id).order('data'))
  ]);

  const emp = empRows[0] || null;

  return {
    empreendimentoId: id,
    nome: emp ? emp.nome : '',
    areaTotal: emp ? toNumber(emp.area_total) : 0,
    centrosCusto: centros.map((c) => {
      const orcadoAtual = toNumber(c.orcado_atual);
      const realizado = toNumber(c.realizado);
      return {
        id: c.id,
        nome: c.nome,
        orcadoOriginal: toNumber(c.orcado_original),
        orcadoAtual,
        realizado,
        percentualExecutado: orcadoAtual > 0 ? Math.round((realizado / orcadoAtual) * 1000) / 10 : 0,
        saldo: orcadoAtual - realizado
      };
    }),
    execucaoComparativo: execucao.map((e) => ({
      mes: e.mes_label,
      fisicoAcumulado: toNumber(e.fisico_acumulado),
      financeiroAcumulado: toNumber(e.financeiro_acumulado)
    })),
    revisoesOrcamentarias: revisoes.map((r) => ({
      id: r.id,
      numero: r.numero,
      data: r.data,
      descricao: r.descricao,
      valorAnterior: toNumber(r.valor_anterior),
      valorNovo: toNumber(r.valor_novo),
      diferenca: toNumber(r.valor_novo) - toNumber(r.valor_anterior),
      status: r.status,
      responsavel: r.responsavel
    }))
  };
}

// ---- Indicadores Financeiros ------------------------------------------------
async function getIndicadores() {
  const [margens, empreendimentos] = await Promise.all([
    safeSelect('indicadores_margens', '*', (q) => q.order('mes')),
    safeSelect('empreendimentos', '*', (q) => q.eq('is_active', true).order('id'))
  ]);

  return {
    margens: margens.map((m) => ({
      mes: m.mes_label,
      margemBrutaProjetada: toNumber(m.margem_bruta_projetada),
      margemBrutaRealizada: toNumber(m.margem_bruta_realizada),
      margemLiquidaProjetada: toNumber(m.margem_liquida_projetada),
      margemLiquidaRealizada: toNumber(m.margem_liquida_realizada)
    })),
    viabilidade: empreendimentos.map((e) => ({
      id: e.id,
      empreendimento: e.nome,
      roiProjetado: toNumber(e.roi_projetado),
      roiRealizado: toNumber(e.roi_realizado),
      paybackProjetado: toNumber(e.payback_projetado),
      paybackRealizado: toNumber(e.payback_realizado),
      tirProjetada: toNumber(e.tir_projetada),
      tirRealizada: toNumber(e.tir_realizada),
      vplProjetado: toNumber(e.vpl_projetado),
      vplRealizado: toNumber(e.vpl_realizado),
      status: e.status_viabilidade
    }))
  };
}

module.exports = {
  listEmpreendimentos,
  getDashboardExecutivo,
  getHomeDashboard,
  getFinanceiro,
  getFluxoCaixa,
  getObraEmpreendimentos,
  getObra,
  getIndicadores,
  // exportados para teste
  _internal: { projetarFluxo, mapEmpreendimento, toMillions }
};
