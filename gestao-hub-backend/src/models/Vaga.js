const { supabase } = require('../config/database');

class Vaga {
  static async create(vagaData) {
    try {
      const { data, error } = await supabase
        .from('vagas')
        .insert([vagaData])
        .select(`
          *,
          client:clients(*),
          contract:contracts(*),
          user:users!vagas_user_id_fkey(*),
          created_by_user:users!vagas_created_by_fkey(*),
          updated_by_user:users!vagas_updated_by_fkey(*),
          candidato_aprovado:candidatos(*)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating vaga:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('vagas')
        .select(`
          *,
          client:clients(
            *,
            clients_pf(*),
            clients_pj(*)
          ),
          contract:contracts(*),
          user:users!vagas_user_id_fkey(*),
          created_by_user:users!vagas_created_by_fkey(*),
          updated_by_user:users!vagas_updated_by_fkey(*),
          candidato_aprovado:candidatos(*),
          vaga_candidatos(
            *,
            candidato:candidatos(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding vaga by id:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = supabase
        .from('vagas')
        .select(`
          *,
          client:clients(
            *,
            clients_pf(*),
            clients_pj(*)
          ),
          contract:contracts(*),
          user:users!vagas_user_id_fkey(*),
          created_by_user:users!vagas_created_by_fkey(*),
          updated_by_user:users!vagas_updated_by_fkey(*),
          candidato_aprovado:candidatos(*),
          vaga_candidatos(
            candidato:candidatos(*)
          )
        `, { count: 'exact' });

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.sigilosa !== undefined) {
        query = query.eq('sigilosa', filters.sigilosa);
      }

      if (filters.tipo_cargo) {
        query = query.eq('tipo_cargo', filters.tipo_cargo);
      }

      if (filters.search) {
        query = query.or(`codigo.ilike.%${filters.search}%,cargo.ilike.%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;
      return { data, count };
    } catch (error) {
      console.error('Error finding all vagas:', error);
      throw error;
    }
  }

  static async update(id, vagaData) {
    try {
      const updateData = {
        ...vagaData,
        updated_at: new Date().toISOString()
      };

      // Se o status está sendo alterado para fechada ou cancelada, adicionar data de fechamento/cancelamento
      if (vagaData.status && ['fechada', 'fechada_rep', 'cancelada_cliente'].includes(vagaData.status)) {
        updateData.data_fechamento_cancelamento = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('vagas')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          client:clients(*),
          contract:contracts(*),
          user:users!vagas_user_id_fkey(*),
          created_by_user:users!vagas_created_by_fkey(*),
          updated_by_user:users!vagas_updated_by_fkey(*),
          candidato_aprovado:candidatos(*)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating vaga:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('vagas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting vaga:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (['fechada', 'fechada_rep', 'cancelada_cliente'].includes(status)) {
        updateData.data_fechamento_cancelamento = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('vagas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating vaga status:', error);
      throw error;
    }
  }

  static async getNextCodigo() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `VAG-${currentYear}-`;

      const { data, error } = await supabase
        .from('vagas')
        .select('codigo')
        .like('codigo', `${prefix}%`)
        .order('codigo', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastCode = data[0].codigo;
        const lastNumber = parseInt(lastCode.replace(prefix, ''));
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error getting next codigo:', error);
      throw error;
    }
  }

  static async getCandidatos(vagaId) {
    try {
      console.log('🔍 Buscando candidatos para vaga:', vagaId);

      const { data, error } = await supabase
        .from('vaga_candidatos')
        .select(`
          *,
          candidato:candidatos(*),
          entrevistas(
            *,
            created_by_user:users!entrevistas_created_by_fkey(id, name)
          )
        `)
        .eq('vaga_id', vagaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro na query de candidatos:', error);
        throw error;
      }

      console.log(`✅ Candidatos encontrados: ${data?.length || 0}`);
      console.log('📊 Dados:', JSON.stringify(data, null, 2));

      return data || [];
    } catch (error) {
      console.error('Error getting candidatos for vaga:', error);
      throw error;
    }
  }

  static async vincularCandidato(vagaId, candidatoId) {
    try {
      console.log('🔗 Vinculando candidato', candidatoId, 'à vaga', vagaId);

      const { data, error } = await supabase
        .from('vaga_candidatos')
        .insert([{
          vaga_id: vagaId,
          candidato_id: candidatoId,
          status: 'inscrito'
        }])
        .select(`
          *,
          candidato:candidatos(*)
        `)
        .single();

      if (error) {
        console.error('❌ Erro ao vincular candidato:', error);
        throw error;
      }

      console.log('✅ Candidato vinculado com sucesso');
      return data;
    } catch (error) {
      console.error('Error vinculando candidato:', error);
      throw error;
    }
  }

  static async getStatistics(filters = {}) {
    try {
      let query = supabase
        .from('vagas')
        .select('*, user:users!vagas_user_id_fkey(name)', { count: 'exact' });

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.date_from) {
        query = query.gte('data_abertura', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('data_abertura', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      const statistics = {
        total: data.length,
        byStatus: {},
        byTipoCargo: {},
        totalFaturamento: 0,
        totalImpostos: 0,
        avgSalario: 0,
        totalVagasAbertas: 0,
        totalVagasFechadas: 0,
        vagasFechadasMes: 0,
        tempoMedioFechamento: 0,
        taxaConversao: 0
      };

      const vagasAbertas = ['aberta', 'divulgacao_prospec', 'entrevista_nc', 'entrevista_empresa', 'testes', 'standby'];
      const vagasFechadas = ['fechada', 'fechada_rep'];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      let totalDiasFechamento = 0;
      let countVagasFechadas = 0;

      data.forEach(vaga => {
        // Count by status
        statistics.byStatus[vaga.status] = (statistics.byStatus[vaga.status] || 0) + 1;

        // Count by tipo cargo
        statistics.byTipoCargo[vaga.tipo_cargo] = (statistics.byTipoCargo[vaga.tipo_cargo] || 0) + 1;

        // Calculate financial data
        const valorFaturamento = parseFloat(vaga.valor_faturamento || 0);
        const impostoEstado = parseFloat(vaga.imposto_estado || 0);

        statistics.totalFaturamento += valorFaturamento;
        statistics.totalImpostos += valorFaturamento * (impostoEstado / 100);
        statistics.avgSalario += parseFloat(vaga.salario || 0);

        // Count vagas abertas
        if (vagasAbertas.includes(vaga.status)) {
          statistics.totalVagasAbertas++;
        }

        // Count vagas fechadas
        if (vagasFechadas.includes(vaga.status)) {
          statistics.totalVagasFechadas++;

          // Count fechadas this month
          if (vaga.data_fechamento_cancelamento) {
            const fechamentoDate = new Date(vaga.data_fechamento_cancelamento);
            if (fechamentoDate.getMonth() === currentMonth &&
                fechamentoDate.getFullYear() === currentYear) {
              statistics.vagasFechadasMes++;
            }

            // Calculate SLA for fechadas
            const aberturaDate = new Date(vaga.data_abertura);
            const diffTime = Math.abs(fechamentoDate.getTime() - aberturaDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalDiasFechamento += diffDays;
            countVagasFechadas++;
          }
        }
      });

      if (data.length > 0) {
        statistics.avgSalario = statistics.avgSalario / data.length;
      }

      // Calculate tempo médio de fechamento
      if (countVagasFechadas > 0) {
        statistics.tempoMedioFechamento = Math.round(totalDiasFechamento / countVagasFechadas);
      }

      // Calculate taxa de conversão (vagas fechadas / total vagas * 100)
      if (data.length > 0) {
        statistics.taxaConversao = Math.round((statistics.totalVagasFechadas / data.length) * 100);
      }

      return statistics;
    } catch (error) {
      console.error('Error getting vaga statistics:', error);
      throw error;
    }
  }
}

module.exports = Vaga;