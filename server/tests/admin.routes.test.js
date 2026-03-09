process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-with-minimum-length-123456';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/mybarber_test?schema=public';
process.env.JWT_REFRESH_EXPIRES_DAYS = '30';

jest.mock('../src/models/User');
jest.mock('../src/models/AuditLog');

const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');

const signToken = (payload) =>
  jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

describe('Admin routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects admin overview without token', async () => {
    const response = await request(app).get('/api/admin/overview');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });

  it('rejects admin overview for non-admin role', async () => {
    const token = signToken({
      sub: 'user-1',
      email: 'client@mail.com',
      role: 'client',
    });

    User.findById.mockResolvedValue({
      _id: 'user-1',
      email: 'client@mail.com',
      role: 'client',
      isBlocked: false,
    });

    const response = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('returns admin overview for admin role', async () => {
    const token = signToken({
      sub: 'admin-1',
      email: 'admin@mail.com',
      role: 'admin',
    });

    User.findById.mockResolvedValue({
      _id: 'admin-1',
      email: 'admin@mail.com',
      role: 'admin',
      isBlocked: false,
    });

    User.countDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(8);

    const response = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.totalUsers).toBe(10);
    expect(response.body.stats.totalAdmins).toBe(2);
  });
});
