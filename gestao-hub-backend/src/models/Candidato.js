const { supabase } = require('../config/database');

class Candidato {
  static async create(candidatoData) {
    try {
      const { data, error } = await supabase
        .from('candidatos')
        .insert([candidatoData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating candidato:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('candidatos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding candidato by id:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('candidatos')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error finding candidato by email:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = supabase
        .from('candidatos')
        .select('*', { count: 'exact' });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        query = query.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%,telefone.ilike.%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;
      return { data, count };
    } catch (error) {
      console.error('Error finding all candidatos:', error);
      throw error;
    }
  }

  static async update(id, candidatoData) {
    try {
      const { data, error } = await supabase
        .from('candidatos')
        .update({
          ...candidatoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating candidato:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('candidatos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting candidato:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('candidatos')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating candidato status:', error);
      throw error;
    }
  }

  static async getCandidatosByVaga(vagaId) {
    try {
      const { data, error } = await supabase
        .from('vaga_candidatos')
        .select(`
          *,
          candidato:candidatos(*)
        `)
        .eq('vaga_id', vagaId)
        .order('data_inscricao', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting candidatos by vaga:', error);
      throw error;
    }
  }

  static async addCandidatoToVaga(vagaId, candidatoId, status = 'inscrito') {
    try {
      const { data, error } = await supabase
        .from('vaga_candidatos')
        .insert([{
          vaga_id: vagaId,
          candidato_id: candidatoId,
          status,
          data_inscricao: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding candidato to vaga:', error);
      throw error;
    }
  }

  static async removeCandidatoFromVaga(vagaId, candidatoId) {
    try {
      const { error } = await supabase
        .from('vaga_candidatos')
        .delete()
        .eq('vaga_id', vagaId)
        .eq('candidato_id', candidatoId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing candidato from vaga:', error);
      throw error;
    }
  }

  static async updateCandidatoVagaStatus(vagaCandidatoId, status, observacoes = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (observacoes !== null) {
        updateData.observacoes = observacoes;
      }

      const { data, error } = await supabase
        .from('vaga_candidatos')
        .update(updateData)
        .eq('id', vagaCandidatoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating candidato vaga status:', error);
      throw error;
    }
  }
}

module.exports = Candidato;