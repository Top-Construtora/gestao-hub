const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const activityTracker = require('../middleware/activityTracker');

// Auth por rota (o router é montado em '/api', que também serve rotas públicas).
const protect = [authMiddleware, activityTracker];

// Empreendimentos
router.get('/empreendimentos', protect, dashboardController.empreendimentos);

// Dashboards
router.get('/dashboard/executivo', protect, dashboardController.executivo);
router.get('/dashboard/home', protect, dashboardController.home);

// Financeiro
router.get('/financeiro', protect, dashboardController.financeiro);
router.get('/fluxo-caixa', protect, dashboardController.fluxoCaixa);

// Obra
router.get('/obras', protect, dashboardController.obraEmpreendimentos);
router.get('/obras/:empreendimentoId', protect, dashboardController.obra);

// Indicadores
router.get('/indicadores', protect, dashboardController.indicadores);

module.exports = router;
