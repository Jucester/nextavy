const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const bcrypt = require('bcrypt');
const sequelize = require('../src/config/database');

// This option to set timeout in 30000 because some tests (send email) fails because async timeout error
jest.setTimeout(30000);

beforeAll(async () => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

const addUser = async () => {
  const user = {
    username: 'user1',
    email: 'user1@test.com',
    password: 'Password*123',
    email_verified: true,
  };

  const hashed = await bcrypt.hash(user.password, 10);
  user.password = hashed;

  return await User.create(user);
};

const postAuth = async (credentials) => {
  return await request(app).post('/api/v1.0/auth/login').send(credentials);
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
    console.log(error);
    expect(error.path).toBe('/api/v1.0/auth/login');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns token when credentials are correct', async () => {
    await addUser();
    const res = await postAuth({ email: 'user1@test.com', password: 'Password*123' });
    expect(res.body.token).not.toBeUndefined();
  });

 
});
