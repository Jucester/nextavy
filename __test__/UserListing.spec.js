const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');

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

const getUsers = (options = {}) => {
  const agent = request(app).get('/api/v1.0/users');

  if (options.auth) {
    const { email, password } = options.auth;
    agent.auth(email, password);
  }
  return agent.send();
};

const addUsers = async (activesCount, inactivesCount = 0) => {
  const hash = await bcrypt.hash('Ps123456*', 10);
  for (let i = 0; i <= activesCount + inactivesCount; i++) {
    await User.create({
      username: `user${i}`,
      email: `user${i}@test.com`,
      password: hash,
      email_verified: i < activesCount,
    });
  }
};

describe('Listing users', () => {
  it('returns 200 ok when there are no user in database', async () => {
    const response = await getUsers();

    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getUsers();

    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 users in page content when there are more than 10 users in database', async () => {
    await addUsers(11);
    const response = await getUsers();
    expect(response.body.content.length).toBe(10);
  });

  it('returns 6 users in page content when there are active 6 users and inactive 5 users in database', async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });

  it('returns only id, username and email in content array for each user', async () => {
    await addUsers(11);
    const response = await getUsers();
    const user = response.body.content[0];
    expect(Object.keys(user)).toEqual(['id', 'username', 'email']);
  });

  it('returns 2 as totalPages when there are 15 active users and 7 inactive', async () => {
    await addUsers(15, 7);
    const response = await getUsers();
    expect(response.body.totalPages).toBe(2);
  });

  it('returns seconnd page users and page indicator when page is set as 1 in request paramenter', async () => {
    await addUsers(12);
    const response = await getUsers().query({ page: 1 });

    expect(response.body.content[0].username).toBe('user10');
    expect(response.body.page).toBe(1);
  });

  it('returns first page when page is set as 0 in request paramenter', async () => {
    await addUsers(12);
    const response = await getUsers().query({ page: -5 });

    expect(response.body.page).toBe(0);
  });

  it('returns 5 users and corresponding size indicator when size is set as 5 in request parameter', async () => {
    await addUsers(12);
    const response = await getUsers().query({ size: 5 });

    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 users and corresponding size indicator when size is set as 1000 in request parameter', async () => {
    await addUsers(12);
    const response = await getUsers().query({ size: 1000 });

    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 users and corresponding size indicator when size is set as 0 in request parameter', async () => {
    await addUsers(12);
    const response = await getUsers().query({ size: 0 });

    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns page as 0 and size as 10 when non numeric query params are provided for both', async () => {
    await addUsers(12);
    const response = await getUsers().query({ size: 'size', page: 'page' });

    expect(response.body.page).toBe(0);
    expect(response.body.size).toBe(10);
  });

  it('returns user page without logged in user when request has valid authorization', async () => {
    await addUsers(11);
    const response = await getUsers({ auth: { email: 'user1@test.com', password: 'Ps123456*' } });
    expect(response.body.totalPages).toBe(1);
  });
});

describe('Get individual user', () => {
  const getUser = (id = 5) => {
    return request(app).get('/api/v1.0/users/' + id);
  };

  it('returns 404 when user not found', async () => {
    const response = await getUser();
    expect(response.status).toBe(404);
  });

  it.each([
    ['es', 'Usuario no encontrado'],
    ['en', 'User not found'],
  ])('when language is set to %s it returns %s when user not found', async (lang, message) => {
    const response = await getUser().set('Accept-Language', lang).send();
    expect(response.body.message).toBe(message);
  });

  it('returns proper error body when user not found', async () => {
    const nowInMillis = new Date().getTime();
    const response = await getUser();
    const errors = response.body;

    expect(errors.path).toBe('/api/v1.0/users/5');
    expect(errors.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(errors)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns 200 ok when active user is found', async () => {
    const user = await User.create({
      username: `user1`,
      email: `user1@test.com`,
      password: `Ps123456*`,
      email_verified: true,
    });
    const response = await getUser(user.id);
    expect(response.status).toBe(200);
  });

  it('returns id, username and email in response body user when active user is found', async () => {
    const user = await User.create({
      username: `user1`,
      email: `user1@test.com`,
      password: `Ps123456*`,
      email_verified: true,
    });
    const response = await getUser(user.id);
    expect(Object.keys(response.body.user)).toEqual(['id', 'username', 'email']);
  });

  it('returns 404 when user has not verified his email yet', async () => {
    const user = await User.create({
      username: `user1`,
      email: `user1@test.com`,
      password: `Ps123456*`,
      email_verified: false,
    });
    const response = await getUser(user.id);
    expect(response.status).toBe(404);
  });
});
