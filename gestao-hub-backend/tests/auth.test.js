require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');

describe('Health check', () => {
  it('GET /health responde 200 com status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET / responde com informações da API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('HUB CRM API');
  });
});

describe('Rotas inexistentes', () => {
  it('GET /api/rota-inexistente responde 404', async () => {
    const res = await request(app).get('/api/rota-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Rota não encontrada');
  });
});

describe('Autenticação', () => {
  it('login sem email responde 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'qualquer-senha' });
    expect(res.status).toBe(400);
  });

  it('login com email mal formado responde 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nao-e-um-email', password: 'qualquer-senha' });
    expect(res.status).toBe(400);
  });

  it('login com credenciais inválidas responde 401 sem vazar detalhes', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usuario-inexistente@teste.com', password: 'senha-errada-123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Credenciais inválidas');
  });

  it('rota protegida sem token responde 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('rota protegida com token inválido responde 401', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });

  it('/api/auth/me sem token responde 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
