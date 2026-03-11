process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-with-minimum-length-123456';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/mybarber_test?schema=public';
process.env.JWT_REFRESH_EXPIRES_DAYS = '30';

jest.mock('../src/models/User');
jest.mock('../src/services/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ skipped: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ skipped: false }),
  sendBookingConfirmationEmail: jest.fn().mockResolvedValue({ skipped: false }),
  sendBookingCancellationEmail: jest.fn().mockResolvedValue({ skipped: false }),
}));
jest.mock('../src/services/socialAuthService', () => {
  class SocialAuthError extends Error {
    constructor(code, message, status = 400) {
      super(message);
      this.name = 'SocialAuthError';
      this.code = code;
      this.status = status;
    }
  }

  return {
    verifySocialIdentity: jest.fn(),
    SocialAuthError,
  };
});

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const {
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
} = require('../src/services/emailService');
const { verifySocialIdentity, SocialAuthError } = require('../src/services/socialAuthService');

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

describe('Auth routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a client user with valid payload', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post('/api/auth/register').send({
      name: 'Mario Rossi',
      email: 'Mario@Mail.com',
      password: 'abc12345',
      role: 'client',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('mario@mail.com');
    expect(response.body.user.role).toBe('client');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'mario@mail.com' });
  });

  it('blocks duplicate emails on register', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing-user' });

    const response = await request(app).post('/api/auth/register').send({
      name: 'Mario Rossi',
      email: 'mario@mail.com',
      password: 'abc12345',
      role: 'client',
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('logs in with correct credentials and returns access + refresh tokens', async () => {
    const hashedPassword = await bcrypt.hash('abc12345', 10);
    const mockedUser = {
      _id: 'user-1',
      name: 'Mario Rossi',
      email: 'mario@mail.com',
      role: 'client',
      password: hashedPassword,
      loginCount: 0,
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockedUser);

    const response = await request(app).post('/api/auth/login').send({
      email: 'mario@mail.com',
      password: 'abc12345',
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
    expect(mockedUser.save).toHaveBeenCalled();
  });

  it('rejects login with invalid credentials', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post('/api/auth/login').send({
      email: 'missing@mail.com',
      password: 'abc12345',
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('logs in with google social token and links provider id', async () => {
    verifySocialIdentity.mockResolvedValue({
      provider: 'google',
      providerUserId: 'google-sub-123',
      email: 'mario@mail.com',
      name: 'Mario Rossi',
      emailVerified: true,
    });

    const mockedUser = {
      _id: 'user-1',
      name: 'Mario Rossi',
      email: 'mario@mail.com',
      role: 'client',
      password: 'hashed-password',
      googleSub: undefined,
      emailVerified: false,
      loginCount: 0,
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockedUser);

    const response = await request(app).post('/api/auth/social-login').send({
      provider: 'google',
      idToken: 'google-id-token',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('mario@mail.com');
    expect(response.body.user.role).toBe('client');
    expect(mockedUser.googleSub).toBe('google-sub-123');
    expect(mockedUser.save).toHaveBeenCalled();
  });

  it('logs in with apple social token and links provider id', async () => {
    verifySocialIdentity.mockResolvedValue({
      provider: 'apple',
      providerUserId: 'apple-sub-123',
      email: 'mario@mail.com',
      name: 'Mario Rossi',
      emailVerified: true,
    });

    const mockedUser = {
      _id: 'user-1',
      name: 'Mario Rossi',
      email: 'mario@mail.com',
      role: 'client',
      password: 'hashed-password',
      appleSub: undefined,
      emailVerified: false,
      loginCount: 0,
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockedUser);

    const response = await request(app).post('/api/auth/social-login').send({
      provider: 'apple',
      identityToken: 'apple-identity-token',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('mario@mail.com');
    expect(response.body.user.role).toBe('client');
    expect(mockedUser.appleSub).toBe('apple-sub-123');
    expect(mockedUser.save).toHaveBeenCalled();
  });

  it('creates a new user with facebook social login when email is not registered', async () => {
    verifySocialIdentity.mockResolvedValue({
      provider: 'facebook',
      providerUserId: 'facebook-id-123',
      email: 'new@mail.com',
      name: 'Nuovo Cliente',
      emailVerified: true,
      avatarUri: 'https://example.com/avatar.jpg',
    });

    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const response = await request(app).post('/api/auth/social-login').send({
      provider: 'facebook',
      accessToken: 'facebook-access-token',
    });

    expect(response.status).toBe(200);
    expect(response.body.isNewUser).toBe(true);
    expect(response.body.user.email).toBe('new@mail.com');
    expect(response.body.user.role).toBe('client');
    expect(User).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nuovo Cliente',
        email: 'new@mail.com',
        role: 'client',
        emailVerified: true,
        avatarUri: 'https://example.com/avatar.jpg',
      })
    );
  });

  it('returns social token error on invalid provider token', async () => {
    verifySocialIdentity.mockRejectedValue(
      new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Token social non valido.', 401)
    );

    const response = await request(app).post('/api/auth/social-login').send({
      provider: 'google',
      idToken: 'invalid-token',
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('SOCIAL_TOKEN_INVALID');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('rejects protected /me without access token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });

  it('sends password reset email when account exists', async () => {
    const mockedUser = {
      _id: 'user-1',
      name: 'Mario Rossi',
      email: 'mario@mail.com',
      save: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockResolvedValue(mockedUser);

    const response = await request(app).post('/api/auth/forgot-password').send({
      email: 'mario@mail.com',
    });

    expect(response.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'mario@mail.com',
        name: 'Mario Rossi',
      })
    );
    expect(mockedUser.save).toHaveBeenCalled();
  });

  it('does not reveal if account does not exist on forgot password', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post('/api/auth/forgot-password').send({
      email: 'missing@mail.com',
    });

    expect(response.status).toBe(200);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('sends booking confirmation email for authenticated users', async () => {
    const token = signToken({
      sub: 'user-1',
      email: 'mario@mail.com',
      role: 'client',
    });

    User.findById.mockResolvedValue({
      _id: 'user-1',
      name: 'Mario Rossi',
      email: 'mario@mail.com',
      role: 'client',
    });

    const response = await request(app)
      .post('/api/auth/booking-confirmation-email')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId: 'MB-4321',
        shopName: 'Golden Cut Barber',
        shopAddress: 'Via Torino 18',
        shopCity: 'Milano',
        barberName: 'Andrea',
        serviceName: 'Taglio Uomo',
        startAt: Date.now(),
        endAt: Date.now() + 30 * 60 * 1000,
        durationMin: 30,
        price: 15,
      });

    expect(response.status).toBe(200);
    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'mario@mail.com',
        name: 'Mario Rossi',
        bookingId: 'MB-4321',
        shopName: 'Golden Cut Barber',
        barberName: 'Andrea',
        serviceName: 'Taglio Uomo',
        durationMin: 30,
        price: 15,
      })
    );
  });

  it('sends booking cancellation email for authenticated users', async () => {
    const token = signToken({
      sub: 'user-1',
      email: 'mario@mail.com',
      role: 'client',
    });

    User.findById.mockResolvedValue({
      _id: 'user-1',
      name: 'Mario Rossi',
      email: 'mario@mail.com',
      role: 'client',
    });

    const response = await request(app)
      .post('/api/auth/booking-cancellation-email')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId: 'MB-4321',
        shopName: 'Golden Cut Barber',
        shopAddress: 'Via Torino 18',
        shopCity: 'Milano',
        barberName: 'Andrea',
        serviceName: 'Taglio Uomo',
        startAt: Date.now(),
        endAt: Date.now() + 30 * 60 * 1000,
        durationMin: 30,
        price: 15,
        cancelledReason: 'Imprevisto',
        cancelledAt: Date.now(),
      });

    expect(response.status).toBe(200);
    expect(sendBookingCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'mario@mail.com',
        name: 'Mario Rossi',
        bookingId: 'MB-4321',
        shopName: 'Golden Cut Barber',
        barberName: 'Andrea',
        serviceName: 'Taglio Uomo',
        cancelledReason: 'Imprevisto',
      })
    );
  });
});
