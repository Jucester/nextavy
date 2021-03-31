const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const bcrypt = require('bcrypt');
const sequelize = require('../src/config/database');
const es = require('../locales/es/translation.json');
const en = require('../locales/en/translation.json');

// This option to set timeout in 30000 because some tests (send email) fails because async timeout error
jest.setTimeout(30000);

beforeAll(async () => {
  return await sequelize.sync();
});

beforeEach(async () => {
  return await User.destroy({ truncate: true });
});

describe('User updates', () => {
  it('returns forbidden when request sent without basic authorization', async () => {
    const response = await request(app).put('/api/v1.0/users/7').send();
    expect(response.status).toBe(403);
  });

  it.each([
    ['es', es.unauthorized_user_update],
    ['en', en.unauthorized_user_update],
  ])('when lang is set to %s it returns %s when user is not authorized', async (lang, message) => {
    const response = await request(app).put('/api/v1.0/users/7').set('Accept-Language', lang).send();
    expect(response.body.message).toBe(message);
  });

  it('returns proper error body when user not authorized', async () => {
    const nowInMillis = new Date().getTime();
    const response = await request(app).put('/api/v1.0/users/7').send();
    expect(response.body.path).toBe('/api/v1.0/users/7');
    expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
    expect(response.body.message).toBe(en.unauthorized_user_update);
  });
});
