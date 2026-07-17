const { supabase, query } = require('../config/database');
const bcrypt = require('bcryptjs');
const authConfig = require('../config/auth');

class UserModel {
  async create(userData) {
    const { email, password, name, roleId = 2, must_change_password = true, cargo } = userData;
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, authConfig.bcrypt.saltRounds);
    
    // Inserir usuário no Supabase DIRETAMENTE
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email,
        password: hashedPassword,
        name,
        role_id: roleId,
        must_change_password: true,
        cargo
      }])
      .select('id, email, name, role_id, is_active, must_change_password, created_at, cargo')
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar usuário:', error);
      throw error;
    }
    
    return data;
  }

  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, email, name, password, is_active,
        must_change_password, last_login,
        created_at, updated_at, role_id, cargo,
        profile_picture_url, roles!inner(name)
      `)
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Não encontrado
      console.error('❌ Erro ao buscar usuário por email:', error);
      throw error;
    }
    
    // Ajustar formato para compatibilidade
    if (data) {
      data.role_name = data.roles.name;
      delete data.roles;
    }
    
    return data;
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, email, name, password, is_active,
        must_change_password, last_login,
        created_at, updated_at, role_id, cargo,
        profile_picture_url, roles!inner(name)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Não encontrado
      console.error('❌ Erro ao buscar usuário por ID:', error);
      throw error;
    }
    
    // Ajustar formato para compatibilidade
    if (data) {
      data.role_name = data.roles.name;
      delete data.roles;
    }
    
    return data;
  }

  async updateLastLogin(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString()
        })
        .eq('id', userId)
        .select('last_login')
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar último login:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro no updateLastLogin:', error);
      return null;
    }
  }

  async updateLastActivity(userId) {
    // Simplificado - não rastreia atividade por enquanto
    return true;
  }

  async update(id, data) {
    try {
      console.log('🔍 Update user - ID:', id, 'Data:', data);
      
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao atualizar usuário:', error);
        throw error;
      }
      
      return updatedUser;
    } catch (error) {
      console.error('❌ Erro no update:', error);
      throw error;
    }
  }

  async softDelete(id) {
    try {
      const user = await this.findById(id);
      if (!user) {
        console.warn(`⚠️ Tentativa de soft-delete de usuário não existente: ID ${id}`);
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: false,
          email: `deleted_${Date.now()}_${user.email}`,
          name: `${user.name} (Excluído)`
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro no softDelete do usuário:', error);
      throw error;
    }
  }

  async hardDelete(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir este usuário pois ele está associado a outros registros (contratos, etc.). Considere desativá-lo.');
      }
      console.error('❌ Erro ao excluir usuário permanentemente:', error);
      throw error;
    }
    return { success: true };
  }

  async findAll(filters = {}) {
    let query = supabase
      .from('users')
      .select(`
        id, email, name, is_active,
        must_change_password, last_login,
        created_at, updated_at, role_id, cargo,
        profile_picture_url, roles!inner(name)
      `)
      .order('created_at', { ascending: false });
    
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.role) {
      query = query.eq('roles.name', filters.role);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      throw error;
    }

    const users = (data || []).map(user => ({
      ...user,
      role_name: user.roles.name,
      roles: undefined
    }));

    return users;
  }

  async getUserPermissions(userId) {
    console.log('🔍 getUserPermissions chamado para userId:', userId);
    
    try {
      // Primeiro, vamos buscar o role_id do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role_id')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('❌ Erro ao buscar usuário:', userError);
        return [];
      }

      console.log('🔍 Role ID do usuário:', userData.role_id);

      // Agora buscar as permissões desse role
      const { data: rolePermissions, error: rpError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', userData.role_id);

      if (rpError) {
        console.error('❌ Erro ao buscar role_permissions:', rpError);
        return [];
      }

      console.log('🔍 Permission IDs:', rolePermissions);

      if (!rolePermissions || rolePermissions.length === 0) {
        console.log('⚠️ Nenhuma permissão encontrada para o role');
        return [];
      }

      // Buscar os nomes das permissões
      const permissionIds = rolePermissions.map(rp => rp.permission_id);
      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('name')
        .in('id', permissionIds);

      if (permError) {
        console.error('❌ Erro ao buscar permissions:', permError);
        return [];
      }

      const permissionNames = (permissions || []).map(p => p.name);
      
      return permissionNames;
    } catch (error) {
      console.error('❌ Erro geral em getUserPermissions:', error);
      return [];
    }
  }

  async setResetToken(email, token, expires) {
    // NOTA: reset_token e reset_token_expires não existem na tabela users
    // Esta funcionalidade requer adicionar esses campos ao Supabase
    console.warn('⚠️ setResetToken: campos reset_token não disponíveis no banco');
    // Por enquanto, retornar sucesso simulado para não quebrar o fluxo
    return { id: 'simulated' };
  }

  async findByResetToken(token) {
    // NOTA: reset_token e reset_token_expires não existem na tabela users
    // Esta funcionalidade requer adicionar esses campos ao Supabase
    console.warn('⚠️ findByResetToken: campos reset_token não disponíveis no banco');
    // Retornar null para indicar token não encontrado
    return null;
  }

  async updatePassword(id, hashedPassword) {
    try {
      console.log('🔍 updatePassword - ID:', id);

      const { data, error } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Erro ao atualizar senha:', error);
        throw error;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Erro no updatePassword:', error);
      throw error;
    }
  }

  async findByRole(roleName) {
    try {
      console.log('🔍 Buscando usuários com role:', roleName);
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, email, name, is_active, created_at, cargo,
          roles!inner(name)
        `)
        .eq('roles.name', roleName)
        .eq('is_active', true);
      
      if (error) {
        console.error('❌ Erro ao buscar usuários por role:', error);
        throw error;
      }
      
      // Mapear os dados para formato compatível
      const users = (data || []).map(user => ({
        ...user,
        role_name: user.roles.name,
        roles: undefined
      }));
      
      return users;
    } catch (error) {
      console.error('❌ Erro no findByRole:', error);
      throw error;
    }
  }

  async findTeamMembers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, cargo, profile_picture_url, is_active
        `)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Erro ao buscar membros da equipe:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro no findTeamMembers:', error);
      return [];
    }
  }
}

class RoleModel {
  async findAll() {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Erro ao buscar roles:', error);
      return [];
    }
    
    return data || [];
  }

  async findByName(name) {
    console.log('🔍 Buscando role por nome:', name);
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar role:', error);
      return null;
    }
    
    return data;
  }
}

module.exports = {
  User: new UserModel(),
  Role: new RoleModel()
};