const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const bcrypt = require('bcrypt');
const sequelize = require('../src/config/database');
const es = require('../locales/es/translation.json');
const en = require('../locales/en/translation.json');

beforeAll(async () => {
  await sequelize.sync();
  // This option to set timeout in 30000 because some tests (send email) fails because async timeout error
  jest.setTimeout(30000);
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

afterAll(async () => {
  jest.setTimeout(5000);
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

const putUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;

  if (options.auth) {
    const response = await agent.post('/api/v1.0/auth/login').send(options.auth);
    token = response.body.token;
  }
  agent = request(app).put(`/api/v1.0/users/${id}`);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }

  return agent.send(body);
};

describe('User updates', () => {
  it('returns forbidden when request sent without basic authorization', async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });

  it.each([
    ['es', es.unauthorized_user_update],
    ['en', en.unauthorized_user_update],
  ])('when lang is set to %s it returns %s when user is not authorized', async (lang, message) => {
    const response = await putUser(7, null, { language: lang });
    expect(response.body.message).toBe(message);
  });

  it('returns proper error body when user not authorized', async () => {
    const nowInMillis = new Date().getTime();
    const response = await putUser(7, null);
    expect(response.body.path).toBe('/api/v1.0/users/7');
    expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
    expect(response.body.message).toBe(en.unauthorized_user_update);
  });

  it('returns forbidden when request is sent with incorrect email', async () => {
    await addUser();
    const response = await putUser(5, null, { auth: { email: 'user1000@mail.com', password: 'Password*123' } });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when request is sent with incorrect password', async () => {
    await addUser();
    const response = await putUser(5, null, { auth: { email: 'user1000@mail.com', password: 'Password*wrong3' } });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when request is sent with correct credentials but for different user', async () => {
    await addUser();
    const userToBeUpdated = await addUser({ ...validUser, username: 'username2', email: 'user2@email.com' });
    const response = await putUser(userToBeUpdated.id, null, {
      auth: { email: 'user1000@mail.com', password: 'Password*123' },
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when request is sent with correct credentials but for user without verified email', async () => {
    const inactive = await addUser({ ...validUser, email_verified: false });
    const response = await putUser(inactive.id, null, {
      auth: { email: 'user1000@mail.com', password: 'Password*123' },
    });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok when valid update request its sent from authorized user', async () => {
    const savedUser = await addUser();
    const response = await putUser(
      savedUser.id,
      { username: 'user1-updated' },
      { auth: { email: savedUser.email, password: 'Password*123' } }
    );
    expect(response.status).toBe(200);
  });

  it('update username in database when valid request its sent from authorized user', async () => {
    const savedUser = await addUser();
    await putUser(
      savedUser.id,
      { username: 'user1-updated' },
      { auth: { email: savedUser.email, password: 'Password*123' } }
    );
    const userInDb = await User.findOne({ where: { id: savedUser.id } });
    expect(userInDb.username).toBe('user1-updated');
  });
});
