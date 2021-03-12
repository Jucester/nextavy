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

const validUser = {
  username: 'user1',
  email: 'user1@test.com',
  password: 'Ps123456',
};

const postUser = (user = validUser) => {
  return request(app).post('/api/v1.0/users').send(user);
};

describe('User Registration', () => {
  it('Returns 200 when singup request is valid', async () => {
    const res = await postUser();
    expect(res.status).toBe(200);
  });

  it('Returns success mesage when singup request is valid', async () => {
    const res = await postUser();
    expect(res.body.message).toBe('User created successfully');
  });

  it('Saves the user to the database', async () => {
    await postUser();

    const users = await User.findAll();
    expect(users.length).toBe(1);
  });

  it('Saves the username and email to database', async () => {
    await postUser();

    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@test.com');
  });

  it('Hashes the password in database', async () => {
    await postUser();

    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.password).not.toBe('123456');
  });

  it('Returns 400 when username is null', async () => {
    const res = await postUser({
      username: null,
      email: 'user1@test.com',
      password: 'Ps123456',
    });
    expect(res.status).toBe(400);
  });

  it('Returns validationErrors field in response body when validation errors occurs', async () => {
    const res = await postUser({
      username: null,
      email: 'user1@test.com',
      password: 'Ps123456',
    });

    const body = res.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('Returns errors for both username and email is null', async () => {
    const res = await postUser({
      username: null,
      email: null,
      password: 'Ps123456',
    });

    const body = res.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  // Dynamic testing fields
  it.each([
    ['username', null, 'Username cannot be null'],
    ['username', 'us', 'Unsername must have min 3 and max 20 characters'],
    ['username', 'u'.repeat(21), 'Unsername must have min 3 and max 20 characters'],
    ['email', null, 'Email cannot be null'],
    ['email', 'mail.com', 'You entered and invalid email'],
    ['email', 'user.mail.com', 'You entered and invalid email'],
    ['email', 'user@mail', 'You entered and invalid email'],
    ['password', null, 'Password cannot be null'],
    ['password', '1234', 'Password must be at least 8 characters'],
    ['password', 'alllower', 'Password must have at least 1 uppercase letter and 1 number'],
    ['password', 'ALLUPPER', 'Password must have at least 1 uppercase letter and 1 number'],
    ['password', '12345678', 'Password must have at least 1 uppercase letter and 1 number'],
    ['password', 'lowerUPPER', 'Password must have at least 1 uppercase letter and 1 number'],
    ['password', 'lower1234', 'Password must have at least 1 uppercase letter and 1 number'],
    ['password', 'UPPER1234', 'Password must have at least 1 uppercase letter and 1 number'],
  ])('when %s is %s, %s is received', async (field, value, expectedMsg) => {
    const user = {
      username: 'user1',
      email: 'user1@test.com',
      password: 'Ps123456',
    };

    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMsg);
  });

  it('returns Email already exists when user try to register with an email already in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe('Email already exists');
  });

  it('returns errors for username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: 'user1@test.com',
      password: 'Ps123456',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });
});
