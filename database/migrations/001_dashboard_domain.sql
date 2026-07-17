-- ============================================================================
-- HUB CRM — Domínio de negócio (dashboards, empreendimentos, financeiro, obra)
-- ----------------------------------------------------------------------------
-- Este script cria e popula as tabelas que alimentam TODAS as telas de negócio.
-- Rode-o uma vez no Supabase (SQL Editor). É idempotente: recria as tabelas e
-- repopula com os dados de demonstração toda vez que for executado.
--
-- Os valores de seed foram escolhidos para reconciliar entre as telas:
-- o VGV/caixa do Dashboard Executivo é a soma real dos empreendimentos abaixo.
-- ============================================================================

begin;

drop table if exists home_alertas cascade;
drop table if exists indicadores_margens cascade;
drop table if exists obra_revisoes cascade;
drop table if exists obra_execucao_mensal cascade;
drop table if exists obra_centros_custo cascade;
drop table if exists lancamentos_financeiros cascade;
drop table if exists financeiro_centros_custo cascade;
drop table if exists financeiro_mensal cascade;
drop table if exists empreendimentos cascade;

-- ---------------------------------------------------------------------------
-- Empreendimentos (âncora do domínio)
-- ---------------------------------------------------------------------------
create table empreendimentos (
  id                    bigint generated always as identity primary key,
  nome                  text    not null,
  fase                  text    not null,   -- Pré-lançamento | Lançamento | Construção | Entrega
  spe                   text,
  segmento              text    not null,   -- Vertical | Horizontal | Loteamento
  vgv_total             numeric(16,2) default 0,
  vgv_vendido           numeric(16,2) default 0,
  percentual_vendas     numeric(6,2)  default 0,
  percentual_obras      numeric(6,2)  default 0,
  percentual_recebiveis numeric(6,2)  default 0,
  caixa_disponivel      numeric(16,2) default 0,
  resultado_projetado   numeric(16,2) default 0,
  resultado_realizado   numeric(16,2) default 0,
  area_total            numeric(12,2) default 0,   -- m²
  -- indicadores de viabilidade
  roi_projetado         numeric(6,2)  default 0,
  roi_realizado         numeric(6,2)  default 0,
  payback_projetado     int           default 0,   -- meses
  payback_realizado     int           default 0,
  tir_projetada         numeric(6,2)  default 0,
  tir_realizada         numeric(6,2)  default 0,
  vpl_projetado         numeric(16,2) default 0,
  vpl_realizado         numeric(16,2) default 0,
  status_viabilidade    text          default 'dentro', -- acima | dentro | abaixo
  margem_bruta          numeric(6,2)  default 0,
  margem_liquida        numeric(6,2)  default 0,
  is_active             boolean       default true,
  created_at            timestamptz   default now()
);

insert into empreendimentos
  (nome, fase, spe, segmento, vgv_total, vgv_vendido, percentual_vendas, percentual_obras,
   percentual_recebiveis, caixa_disponivel, resultado_projetado, resultado_realizado, area_total,
   roi_projetado, roi_realizado, payback_projetado, payback_realizado, tir_projetada, tir_realizada,
   vpl_projetado, vpl_realizado, status_viabilidade, margem_bruta, margem_liquida)
values
  ('Residencial Aurora',       'Lançamento',     'Aurora SPE Ltda',       'Vertical',   85000000,  42500000, 50, 25, 35, 12500000, 15000000,  8500000,  9800,
   28.5, 31.2, 36, 32, 18.5, 20.1, 12500000, 14200000, 'acima',  37.0, 23.2),
  ('Condomínio Verde Vale',    'Construção',     'Verde Vale SPE Ltda',   'Horizontal',120000000, 96000000, 80, 65, 55,  8200000, 22000000, 18500000, 15400,
   20.0, 22.8, 54, 48, 13.0, 15.2,  4800000,  5900000, 'acima',  35.5, 21.8),
  ('Loteamento Sol Nascente',  'Pré-lançamento', 'Sol Nascente SPE Ltda', 'Loteamento', 45000000,  9000000, 20, 10, 15,  5800000,  8000000,  1200000, 22000,
   22.0, 18.5, 48, 56, 14.5, 11.8,  6200000,  4500000, 'abaixo', 30.4, 16.9),
  ('Edifício Metropolitan',    'Entrega',        'Metropolitan SPE Ltda', 'Vertical',  180000000,171000000, 95,100, 78,  3500000, 35000000, 32800000, 12500,
   30.0, 29.5, 30, 31, 21.0, 20.5, 18000000, 17200000, 'dentro', 38.6, 24.1),
  ('Parque das Palmeiras',     'Construção',     'Palmeiras SPE Ltda',    'Horizontal', 75000000, 52500000, 70, 45, 40,  6200000, 12000000,  7800000, 11800,
   25.0, 24.2, 42, 44, 16.0, 15.2,  8500000,  7800000, 'dentro', 34.2, 20.7),
  ('Loteamento Bosque Real',   'Lançamento',     'Bosque Real SPE Ltda',  'Loteamento', 32000000, 14400000, 45, 30, 28,  4100000,  6500000,  3200000, 18000,
   22.0, 18.5, 48, 56, 14.5, 11.8,  6200000,  4500000, 'abaixo', 31.8, 17.4);

-- ---------------------------------------------------------------------------
-- Série financeira mensal consolidada (fluxo/dashboard/financeiro)
-- valores em reais
-- ---------------------------------------------------------------------------
create table financeiro_mensal (
  id         bigint generated always as identity primary key,
  ano        int  not null,
  mes        int  not null,          -- 1-12
  mes_label  text not null,          -- Jan, Fev...
  a_pagar    numeric(16,2) default 0,
  a_receber  numeric(16,2) default 0,
  entradas   numeric(16,2) default 0,
  saidas     numeric(16,2) default 0,
  created_at timestamptz default now(),
  unique (ano, mes)
);

insert into financeiro_mensal (ano, mes, mes_label, a_pagar, a_receber, entradas, saidas) values
  (2026, 1,  'Jan', 4200000, 6500000, 12500000,  8200000),
  (2026, 2,  'Fev', 4500000, 6800000, 15200000, 10500000),
  (2026, 3,  'Mar', 4800000, 7200000, 18300000, 12100000),
  (2026, 4,  'Abr', 4300000, 6900000, 14800000,  9800000),
  (2026, 5,  'Mai', 5100000, 7500000, 22100000, 15300000),
  (2026, 6,  'Jun', 4700000, 7100000, 19500000, 13200000),
  (2026, 7,  'Jul', 5200000, 7800000, 25300000, 18400000),
  (2026, 8,  'Ago', 4900000, 7400000, 21800000, 16200000),
  (2026, 9,  'Set', 5500000, 8200000, 28400000, 20100000),
  (2026, 10, 'Out', 5000000, 7600000, 24600000, 17500000),
  (2026, 11, 'Nov', 5800000, 8500000, 31200000, 22800000),
  (2026, 12, 'Dez', 4850000, 7200000, 27800000, 19400000);

-- ---------------------------------------------------------------------------
-- Centros de custo e planos financeiros (tela Financeiro)
-- ---------------------------------------------------------------------------
create table financeiro_centros_custo (
  id        bigint generated always as identity primary key,
  nome      text not null,
  categoria text not null,          -- centro_custo | plano_financeiro
  previsto  numeric(16,2) default 0,
  realizado numeric(16,2) default 0,
  ordem     int default 0
);

insert into financeiro_centros_custo (nome, categoria, previsto, realizado, ordem) values
  ('Construção Civil',       'centro_custo', 2500000, 2380000, 1),
  ('Administrativo',         'centro_custo',  450000,  485000, 2),
  ('Marketing',              'centro_custo',  350000,  320000, 3),
  ('Comercial',              'centro_custo',  280000,  295000, 4),
  ('Jurídico',               'centro_custo',  180000,  165000, 5),
  ('RH',                     'centro_custo',  220000,  218000, 6),
  ('TI',                     'centro_custo',  150000,  142000, 7),
  ('Financeiro',             'centro_custo',  120000,  125000, 8),
  ('Receitas de Vendas',     'plano_financeiro', 6500000, 7200000, 1),
  ('Custos Diretos',         'plano_financeiro', 3200000, 3050000, 2),
  ('Despesas Operacionais',  'plano_financeiro', 1200000, 1280000, 3),
  ('Investimentos',          'plano_financeiro',  800000,  720000, 4),
  ('Receitas Financeiras',   'plano_financeiro',  150000,  185000, 5),
  ('Despesas Financeiras',   'plano_financeiro',  280000,  265000, 6);

-- ---------------------------------------------------------------------------
-- Lançamentos individuais de fluxo de caixa (tela Fluxo de Caixa)
-- ---------------------------------------------------------------------------
create table lancamentos_financeiros (
  id               bigint generated always as identity primary key,
  empreendimento_id bigint references empreendimentos(id) on delete set null,
  tipo             text not null,   -- entrada | saida
  categoria        text,            -- Vendas, Aporte, Financeiro (entradas)
  subtipo          text,            -- receita | aporte | juros | multa (entradas)
  plano_conta      text,            -- saidas
  centro_custo     text,            -- saidas
  descricao        text not null,
  valor            numeric(16,2) not null,
  data             date not null,
  created_at       timestamptz default now()
);

insert into lancamentos_financeiros (empreendimento_id, tipo, categoria, subtipo, descricao, valor, data) values
  (1, 'entrada', 'Vendas',    'receita', 'Venda Unidade 101 - Ed. Aurora',   450000, '2026-01-15'),
  (1, 'entrada', 'Vendas',    'receita', 'Venda Unidade 205 - Ed. Aurora',   520000, '2026-01-18'),
  (1, 'entrada', 'Aporte',    'aporte',  'Aporte Sócio - Capital',          1000000, '2026-01-10'),
  (1, 'entrada', 'Financeiro','juros',   'Juros sobre aplicação',             15000, '2026-01-20'),
  (1, 'entrada', 'Financeiro','multa',   'Multa contratual - Cliente',         8500, '2026-01-22'),
  (1, 'entrada', 'Vendas',    'receita', 'Parcela financiamento - Un. 102',   35000, '2026-01-25'),
  (2, 'entrada', 'Aporte',    'aporte',  'Aporte Sócio - Investimento',      500000, '2026-01-28'),
  (2, 'entrada', 'Financeiro','juros',   'Rendimento CDB',                    12000, '2026-01-30');

insert into lancamentos_financeiros (empreendimento_id, tipo, plano_conta, centro_custo, descricao, valor, data) values
  (1, 'saida', 'Mão de Obra',            'Custos Diretos',        'Folha de pagamento - Janeiro',  280000, '2026-01-05'),
  (1, 'saida', 'Materiais',              'Custos Diretos',        'Compra de cimento e aço',       450000, '2026-01-08'),
  (1, 'saida', 'Serviços Terceirizados', 'Custos Diretos',        'Instalação elétrica',            85000, '2026-01-12'),
  (1, 'saida', 'Administrativo',         'Despesas Operacionais', 'Aluguel escritório',             15000, '2026-01-10'),
  (1, 'saida', 'Marketing',              'Despesas Operacionais', 'Campanha digital',               45000, '2026-01-15'),
  (2, 'saida', 'Impostos',               'Tributário',            'ISSQN',                          32000, '2026-01-20'),
  (2, 'saida', 'Financeiro',             'Despesas Financeiras',  'Juros empréstimo',               28000, '2026-01-25'),
  (2, 'saida', 'Equipamentos',           'Custos Diretos',        'Locação de equipamentos',        65000, '2026-01-28');

-- ---------------------------------------------------------------------------
-- Obra: centros de custo por empreendimento (tela Obra)
-- ---------------------------------------------------------------------------
create table obra_centros_custo (
  id                bigint generated always as identity primary key,
  empreendimento_id bigint references empreendimentos(id) on delete cascade,
  nome              text not null,
  orcado_original   numeric(16,2) default 0,
  orcado_atual      numeric(16,2) default 0,
  realizado         numeric(16,2) default 0,
  ordem             int default 0
);

-- Metropolitan (id 4) — detalhamento completo (soma: orçado 10,10M / realizado 6,23M)
insert into obra_centros_custo (empreendimento_id, nome, orcado_original, orcado_atual, realizado, ordem) values
  (4, 'Fundação',                 1200000, 1250000, 1180000, 1),
  (4, 'Estrutura',                3500000, 3650000, 2920000, 2),
  (4, 'Alvenaria',                 800000,  820000,  574000, 3),
  (4, 'Instalações Elétricas',     650000,  680000,  340000, 4),
  (4, 'Instalações Hidráulicas',   550000,  570000,  256500, 5),
  (4, 'Revestimento',              900000,  950000,  285000, 6),
  (4, 'Pintura',                   400000,  420000,   84000, 7),
  (4, 'Esquadrias',                750000,  780000,  156000, 8),
  (4, 'Impermeabilização',         350000,  360000,  252000, 9),
  (4, 'Elevadores',                600000,  620000,  186000, 10);

-- Condomínio Verde Vale (id 2) — obra em construção
insert into obra_centros_custo (empreendimento_id, nome, orcado_original, orcado_atual, realizado, ordem) values
  (2, 'Fundação',      2000000, 2050000, 2050000, 1),
  (2, 'Estrutura',     4200000, 4300000, 3010000, 2),
  (2, 'Infraestrutura',1800000, 1850000, 1110000, 3),
  (2, 'Alvenaria',     1500000, 1520000,  760000, 4),
  (2, 'Acabamento',    2400000, 2480000,  620000, 5);

-- Parque das Palmeiras (id 5) — obra em construção
insert into obra_centros_custo (empreendimento_id, nome, orcado_original, orcado_atual, realizado, ordem) values
  (5, 'Fundação',      1400000, 1420000, 1420000, 1),
  (5, 'Estrutura',     2600000, 2680000, 1608000, 2),
  (5, 'Alvenaria',      900000,  920000,  414000, 3),
  (5, 'Instalações',   1100000, 1150000,  460000, 4),
  (5, 'Acabamento',    1500000, 1560000,  312000, 5);

-- ---------------------------------------------------------------------------
-- Obra: curva de execução física vs financeira (tela Obra)
-- ---------------------------------------------------------------------------
create table obra_execucao_mensal (
  id                   bigint generated always as identity primary key,
  empreendimento_id    bigint references empreendimentos(id) on delete cascade,
  mes_label            text not null,
  mes_ordem            int not null,
  fisico_acumulado     numeric(6,2) default 0,
  financeiro_acumulado numeric(6,2) default 0
);

insert into obra_execucao_mensal (empreendimento_id, mes_label, mes_ordem, fisico_acumulado, financeiro_acumulado) values
  (4, 'Jan', 1,  5,  4), (4, 'Fev', 2, 12, 10), (4, 'Mar', 3, 20, 18), (4, 'Abr', 4, 28, 25),
  (4, 'Mai', 5, 36, 33), (4, 'Jun', 6, 44, 40), (4, 'Jul', 7, 52, 48), (4, 'Ago', 8, 58, 54),
  (4, 'Set', 9, 65, 60), (4, 'Out', 10, 72, 67), (4, 'Nov', 11, 78, 73), (4, 'Dez', 12, 85, 80),
  (2, 'Jan', 1,  4,  3), (2, 'Fev', 2, 10,  8), (2, 'Mar', 3, 16, 14), (2, 'Abr', 4, 24, 21),
  (2, 'Mai', 5, 32, 28), (2, 'Jun', 6, 40, 36), (2, 'Jul', 7, 48, 43), (2, 'Ago', 8, 54, 49),
  (2, 'Set', 9, 60, 55), (2, 'Out', 10, 65, 60),
  (5, 'Jan', 1,  6,  5), (5, 'Fev', 2, 13, 11), (5, 'Mar', 3, 21, 18), (5, 'Abr', 4, 29, 25),
  (5, 'Mai', 5, 37, 33), (5, 'Jun', 6, 45, 40);

-- ---------------------------------------------------------------------------
-- Obra: revisões orçamentárias (tela Obra)
-- ---------------------------------------------------------------------------
create table obra_revisoes (
  id                bigint generated always as identity primary key,
  empreendimento_id bigint references empreendimentos(id) on delete cascade,
  numero            text not null,
  data              date,
  descricao         text,
  valor_anterior    numeric(16,2) default 0,
  valor_novo        numeric(16,2) default 0,
  status            text default 'pendente',  -- aprovada | pendente | rejeitada
  responsavel       text
);

insert into obra_revisoes (empreendimento_id, numero, data, descricao, valor_anterior, valor_novo, status, responsavel) values
  (4, 'REV-001', '2026-02-15', 'Ajuste fundação - solo rochoso',        1200000, 1250000, 'aprovada', 'João Silva'),
  (4, 'REV-002', '2026-03-20', 'Reforço estrutural - aumento de carga', 3500000, 3650000, 'aprovada', 'Maria Santos'),
  (4, 'REV-003', '2026-05-10', 'Alteração projeto elétrico',             650000,  680000, 'aprovada', 'Carlos Oliveira'),
  (4, 'REV-004', '2026-06-25', 'Melhoria acabamento fachada',            900000,  950000, 'pendente', 'Ana Costa'),
  (4, 'REV-005', '2026-07-15', 'Substituição material hidráulico',       550000,  570000, 'aprovada', 'Pedro Lima'),
  (4, 'REV-006', '2026-08-01', 'Inclusão sistema automação',                  0,  180000, 'pendente', 'Roberto Alves'),
  (2, 'REV-001', '2026-04-10', 'Ajuste infraestrutura de acesso',       1800000, 1850000, 'aprovada', 'Fernanda Reis'),
  (5, 'REV-001', '2026-05-05', 'Revisão de fundações',                  1400000, 1420000, 'aprovada', 'Marcos Dias');

-- ---------------------------------------------------------------------------
-- Indicadores: margens mensais consolidadas (tela Indicadores)
-- ---------------------------------------------------------------------------
create table indicadores_margens (
  id                       bigint generated always as identity primary key,
  ano                      int  not null,
  mes                      int  not null,
  mes_label                text not null,
  margem_bruta_projetada   numeric(6,2) default 0,
  margem_bruta_realizada   numeric(6,2) default 0,
  margem_liquida_projetada numeric(6,2) default 0,
  margem_liquida_realizada numeric(6,2) default 0,
  unique (ano, mes)
);

insert into indicadores_margens (ano, mes, mes_label, margem_bruta_projetada, margem_bruta_realizada, margem_liquida_projetada, margem_liquida_realizada) values
  (2026, 1,  'Jan', 32, 30.5, 18, 16.8),
  (2026, 2,  'Fev', 32, 31.2, 18, 17.5),
  (2026, 3,  'Mar', 33, 32.8, 19, 18.2),
  (2026, 4,  'Abr', 33, 33.5, 19, 19.1),
  (2026, 5,  'Mai', 34, 33.2, 20, 18.9),
  (2026, 6,  'Jun', 34, 34.8, 20, 20.5),
  (2026, 7,  'Jul', 35, 34.2, 21, 19.8),
  (2026, 8,  'Ago', 35, 35.5, 21, 21.2),
  (2026, 9,  'Set', 36, 35.1, 22, 20.8),
  (2026, 10, 'Out', 36, 36.2, 22, 21.5),
  (2026, 11, 'Nov', 37, 36.8, 23, 22.1),
  (2026, 12, 'Dez', 37, 37.5, 23, 23.2);

-- ---------------------------------------------------------------------------
-- Home: alertas (tela Início)
-- ---------------------------------------------------------------------------
create table home_alertas (
  id         bigint generated always as identity primary key,
  tipo       text not null,          -- warning | info | success | danger
  titulo     text not null,
  descricao  text,
  data       date,
  is_active  boolean default true,
  created_at timestamptz default now()
);

insert into home_alertas (tipo, titulo, descricao, data) values
  ('warning', 'Revisão orçamentária pendente', 'Edifício Metropolitan - REV-004 aguardando aprovação', '2026-06-25'),
  ('info',    'Meta de vendas atingida',        'Edifício Metropolitan alcançou 95% das vendas',        '2026-07-10'),
  ('success', 'Obra avançando',                 'Condomínio Verde Vale - 65% de execução física',       '2026-07-12'),
  ('danger',  'Fluxo de caixa em atenção',      'Loteamento Sol Nascente - projeção requer atenção',     '2026-07-08');

commit;

-- ============================================================================
-- Fim. Após rodar, as 7 telas de negócio passam a exibir estes dados reais.
-- ============================================================================
