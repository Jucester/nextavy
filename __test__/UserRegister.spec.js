const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const sequelize = require('../src/config/database');
// const nodemailer_stub = require('nodemailer-stub');
// const EmailService = require('../src/services/email/EmailService');
const SMTPServer = require('smtp-server').SMTPServer;

// This option to set timeout in 30000 because some tests (send email) fails because async timeout error
jest.setTimeout(30000);

// Variables for the email sending test cases using SMTPServer instead of nodemailer_stub
let lastMail, server;
let simulateSmtpFaiulre = false;

beforeAll(async () => {
  // Initialization of the SMTPServer for email tests cases
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFaiulre) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });
  await server.listen(8587, 'localhost');

  return await sequelize.sync();
});

afterAll(async () => {
  // Closing the SMTP server
  await server.close();
});

beforeEach( async () => {
  simulateSmtpFaiulre = false;
  return await User.destroy({ truncate: true });
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

  const email_sending_error = 'Error sending email. Try again.';

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

  it('creates user with email_verified in false', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.email_verified).toBe(false);
  });
  /*
  it('creates user with email_verified in false', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.email_verified).toBe(false);
  });*/

  it('creates an activation_token for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activation_token).toBeTruthy();
  });

  it('send an Account activtion email with activation_token', async () => {
    await postUser();

    //const lastMail = nodemailer_stub.interactsWithMail.lastMail();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user1@test.com');
    expect(lastMail).toContain(savedUser.activation_token);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    /*
    const mockSendActivation = jest
      .spyOn(EmailService, 'sendActivationEmail')
      .mockRejectedValue({ message: 'Something went wrong' });
    */
    simulateSmtpFaiulre = true;
    const response = await postUser();

    expect(response.status).toBe(502);
    //mockSendActivation.mockRestore();
  });

  it(`returns ${email_sending_error} failure message when sending email fails`, async () => {
    /*
    const mockSendActivation = jest
      .spyOn(EmailService, 'sendActivationEmail')
      .mockRejectedValue({ message: 'Something went wrong' });
    */

    simulateSmtpFaiulre = true;
    const response = await postUser();

    expect(response.body.message).toBe(email_sending_error);
    //mockSendActivation.mockRestore();
  });

  it('does not save user to database if activation email fails', async () => {
    /*
    const mockSendActivation = jest
      .spyOn(EmailService, 'sendActivationEmail')
      .mockRejectedValue({ message: 'Something went wrong' });
    */
    simulateSmtpFaiulre = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
    //mockSendActivation.mockRestore();
  });

  it('returns Validation Failure message in error response body when validation fails', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@test.com',
      password: 'Ps123456',
    });

    expect(response.body.message).toBe('Validation Failure');
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
  const email_sending_error = 'Error al enviar el correo. Intentalo de nuevo.';

  const validation_failure = 'Error en la validación';

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

  it(`returns ${email_sending_error} message when sending email fails`, async () => {
    /*
    const mockSendActivation = jest
      .spyOn(EmailService, 'sendActivationEmail')
      .mockRejectedValue({ message: 'Something went wrong' });
    */
    simulateSmtpFaiulre = true;
    const response = await postUser({ ...validUser }, { language: 'es' });

    expect(response.body.message).toBe(email_sending_error);
    //mockSendActivation.mockRestore();
  });

  it(`returns ${validation_failure} in error response body when validation fails and lang is set to es`, async () => {
    const response = await postUser(
      {
        username: null,
        email: 'user1@test.com',
        password: 'Ps123456',
      },
      {
        language: 'es',
      }
    );
    expect(response.body.message).toBe(validation_failure);
  });
});

describe('Account Activation', () => {
  it('activates the user account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activation_token;

    await request(app)
      .post('/api/v1.0/users/token/' + token)
      .send();

    users = await User.findAll();
    expect(users[0].email_verified).toBe(true);
  });

  it('removes the token from user table after successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activation_token;

    await request(app)
      .post('/api/v1.0/users/token/' + token)
      .send();

    users = await User.findAll();
    expect(users[0].activation_token).toBeFalsy();
  });

  it('does not activate the account when token is wrong', async () => {
    await postUser();
    let users = await User.findAll();
    const token = 'wrong-token-that-not-exists';

    await request(app)
      .post('/api/v1.0/users/token/' + token)
      .send();

    users = await User.findAll();
    expect(users[0].email_verified).toBe(false);
  });

  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'wrong-token-that-not-exists';

    const response = await request(app)
      .post('/api/v1.0/users/token/' + token)
      .send();

    expect(response.status).toBe(400);
  });

  it.each([
    ['es', 'wrong', 'La cuenta ya esta activada o el token es invalido'],
    ['en', 'wrong', 'This account is either active or the token is invalid'],
    ['es', 'correct', 'Email verificado exitosamente'],
    ['en', 'correct', 'Email verified succesfully'],
  ])(
    'when language is set to %s and token is %s returns %s when token is wrong',
    async (lang, tokenStatus, message) => {
      await postUser();
      let token = 'wrong-token-that-not-exists';
      if (tokenStatus === 'correct') {
        let users = await User.findAll();
        token = users[0].activation_token;
      }
      const response = await request(app)
        .post('/api/v1.0/users/token/' + token)
        .set('Accept-Language', lang)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error model', () => {
  it('returns path, timestamp, message and validationErrors in response when validation failure is throw', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });
  it('returns path, timestamp and message in response when request fails in another error', async () => {
    const token = 'wrong-token-that-not-exists';
    const response = await request(app)
      .post('/api/v1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns path in error body', async () => {
    const token = 'wrong-token-that-not-exists';
    const response = await request(app)
      .post('/api/v1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(body.path).toEqual('/api/v1.0/users/token/' + token);
  });

  it('returns timestamp in milliseconds within 5 seconds value in error body', async () => {
    const nowInMIllis = new Date().getTime();
    const fiveSecondsLater = nowInMIllis + 5 * 1000;
    const token = 'wrong-token-that-not-exists';
    const response = await request(app)
      .post('/api/v1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(body.timestamp).toBeGreaterThan(nowInMIllis);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
