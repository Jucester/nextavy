const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const bcrypt = require('bcrypt');
const sequelize = require('../src/config/database');
//const es = require('../locales/es/translation.json');
//const en = require('../locales/en/translation.json');

// This option to set timeout in 30000 because some tests (send email) fails because async timeout error
jest.setTimeout(30000);

beforeAll(async () => {
  return await sequelize.sync();
});

beforeEach(async () => {
  return await User.destroy({ truncate: true });
});

const validUser = {
  username: 'user1',
  email: 'user1@test.com',
  password: 'Password*123',
  email_verified: true,
};

const addUser = async (user = { ...validUser }) => {
  const hashed = await bcrypt.hash(user.password, 10);
  user.password = hashed;

  return await User.create(user);
};

const postAuth = async (credentials, options = {}) => {
  let agent = request(app).post('/api/v1.0/auth/login');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send(credentials);
};

describe('Authentication', () => {
  it('returns 200 when credentials are correct', async () => {
    await addUser();
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' });
    expect(res.status).toBe(200);
  });

  it('returns only user id and username when login success', async () => {
    const user = await addUser();
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' });
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.username).toBe(user.username);
    expect(Object.keys(res.body.user)).toEqual(['id', 'username', 'email']);
  });

  it('returns 401 when user doest not exists', async () => {
    const res = await postAuth({ email: 'user@test.com', password: 'Password*123' });
    expect(res.status).toBe(401);
  });

  it('returns proper error fields when credentials are incorrect', async () => {
    const nowInMillis = new Date().getTime();
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' });
    const error = res.body;
    expect(error.path).toBe('/api/v1.0/auth/login');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns token when credentials are correct', async () => {
    await addUser();
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' });
    expect(res.body.token).not.toBeUndefined();
  });

  it.each([
    ['es', 'Credenciales incorrectas'],
    ['en', 'Incorrect credentials'],
  ])('when language is set to %s it returns %s when credentials are invalid', async (lang, message) => {
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' }, { language: lang });
    expect(res.body.message).toBe(message);
  });

  it('returns 401 when password is wrong', async () => {
    await addUser();
    const res = await postAuth({ email: 'user1@test.com', password: 'Wrong*123' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when trying to logging with an user without verified email', async () => {
    await addUser({ ...validUser, email_verified: false });
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' });
    expect(res.status).toBe(403);
  });

  it('returns proper error fields when authentication fails because email is not verified', async () => {
    await addUser({ ...validUser, email_verified: false });
    const nowInMillis = new Date().getTime();
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' });
    const error = res.body;
    expect(error.path).toBe('/api/v1.0/auth/login');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each([
    ['es', 'Cuenta inactiva. El email no esta vericiado'],
    ['en', 'Inactive account. Email is not verified'],
  ])('when language is set to %s it returns %s when credentials are invalid', async (lang, message) => {
    await addUser({ ...validUser, email_verified: false });
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' }, { language: lang });
    expect(res.body.message).toBe(message);
  });

  it('returns 401 when e-mail is not valid', async () => {
    const res = await postAuth({ password: 'Password*123' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when password is not valid', async () => {
    const res = await postAuth({ email: 'user1@test.com' });
    expect(res.status).toBe(401);
  });
});
