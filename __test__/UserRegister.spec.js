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

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/v1.0/users');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send(user);
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

  const username_null = 'Username cannot be null';
  const username_size = 'Unsername must have min 3 and max 20 characters';
  const email_null = 'Email cannot be null';
  const email_invalid = 'You entered and invalid email';
  const email_in_use = 'Email already exists';
  const password_null = 'Password cannot be null';
  const password_must_min = 'Password must be at least 8 characters';
  const password_must = 'Password must have at least 1 uppercase letter and 1 number';

  // Dynamic testing fields
  it.each([
    ['username', null, username_null],
    ['username', 'us', username_size],
    ['username', 'u'.repeat(21), username_size],
    ['email', null, email_null],
    ['email', 'mail.com', email_invalid],
    ['email', 'user.mail.com', email_invalid],
    ['email', 'user@mail', email_invalid],
    ['password', null, password_null],
    ['password', '1234', password_must_min],
    ['password', 'alllower', password_must],
    ['password', 'ALLUPPER', password_must],
    ['password', '12345678', password_must],
    ['password', 'lowerUPPER', password_must],
    ['password', 'lower1234', password_must],
    ['password', 'UPPER1234', password_must],
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

  it(`returns ${email_in_use} when user try to register with an email already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_in_use);
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

describe('Internationalization', () => {
  const postUser = (user = validUser) => {
    return request(app).post('/api/v1.0/users').set('Accept-Language', 'es').send(user);
  };

  const username_null = 'El nombre de usuario no puede estar vacio';
  const username_size = 'El nombre de usuario debe tener minimo 3 caracteres y máximo 20';
  const email_null = 'El email no puede estar vacío';
  const email_invalid = 'Email invalido';
  const email_in_use = 'El email ya existe';
  const password_null = 'La contraseña no puede estar vacía';
  const password_must_min = 'La contraseña debe tener mínimo 8 caracteres';
  const password_must = 'La contraseña debe tener al menos una letra mayúscula y un número';

  const user_created = 'Usuario creado satisfactoriamente';

  // Dynamic testing fields
  it.each([
    ['username', null, username_null],
    ['username', 'us', username_size],
    ['username', 'u'.repeat(21), username_size],
    ['email', null, email_null],
    ['email', 'mail.com', email_invalid],
    ['email', 'user.mail.com', email_invalid],
    ['email', 'user@mail', email_invalid],
    ['password', null, password_null],
    ['password', '1234', password_must_min],
    ['password', 'alllower', password_must],
    ['password', 'ALLUPPER', password_must],
    ['password', '12345678', password_must],
    ['password', 'lowerUPPER', password_must],
    ['password', 'lower1234', password_must],
    ['password', 'UPPER1234', password_must],
  ])('when %s is %s, %s is received when language is set as Spanish', async (field, value, expectedMsg) => {
    const user = {
      username: 'user1',
      email: 'user1@test.com',
      password: 'Ps123456',
    };

    user[field] = value;
    const response = await postUser(user, { language: 'es' });
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMsg);
  });

  it(`returns ${email_in_use} when user try to register with an email already in use when language is set as Spanish`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: 'es' });
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_in_use);
  });

  it(`Returns ${user_created} mesage when singup request is valid and language is set as Spanish`, async () => {
    const res = await postUser();
    expect(res.body.message).toBe(user_created);
  });
});
