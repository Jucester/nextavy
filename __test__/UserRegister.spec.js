const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

describe('User Registration', () => {
  const postValidUser = () => {
    return request(app).post('/api/v1.0/users').send({
      username: 'user1',
      email: 'user1@test.com',
      password: '123456',
    });
  };

  it('Returns 200 when singup request is valid', async () => {
    const res = await postValidUser();
    expect(res.status).toBe(200);
  });

  it('Returns success mesage when singup request is valid', async () => {
    const res = await postValidUser();
    expect(res.body.message).toBe('User created successfully');
  });

  it('Saves the user to the database', async () => {
    await postValidUser();

    const users = await User.findAll();
    expect(users.length).toBe(1);
  });

  it('Saves the username and email to database', async () => {
    await postValidUser();

    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@test.com');
  });

  it('Hashes the password in database', async () => {
    await postValidUser();

    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.password).not.toBe('123456');
  });
});
