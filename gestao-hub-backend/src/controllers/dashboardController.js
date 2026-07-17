const dashboardData = require('../services/dashboardDataService');

class DashboardController {
  async empreendimentos(req, res, next) {
    try {
      res.json({ empreendimentos: await dashboardData.listEmpreendimentos() });
    } catch (error) {
      next(error);
    }
  }

  async executivo(req, res, next) {
    try {
      res.json(await dashboardData.getDashboardExecutivo());
    } catch (error) {
      next(error);
    }
  }

  async home(req, res, next) {
    try {
      res.json(await dashboardData.getHomeDashboard());
    } catch (error) {
      next(error);
    }
  }

  async financeiro(req, res, next) {
    try {
      res.json(await dashboardData.getFinanceiro());
    } catch (error) {
      next(error);
    }
  }

  async fluxoCaixa(req, res, next) {
    try {
      res.json(await dashboardData.getFluxoCaixa());
    } catch (error) {
      next(error);
    }
  }

  async obraEmpreendimentos(req, res, next) {
    try {
      res.json({ empreendimentos: await dashboardData.getObraEmpreendimentos() });
    } catch (error) {
      next(error);
    }
  }

  async obra(req, res, next) {
    try {
      res.json(await dashboardData.getObra(req.params.empreendimentoId));
    } catch (error) {
      next(error);
    }
  }

  async indicadores(req, res, next) {
    try {
      res.json(await dashboardData.getIndicadores());
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
