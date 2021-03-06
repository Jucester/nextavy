const app = require('./src/app');
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();

const addUsers = async (activesCount, inactivesCount = 0) => {
  const hash = await bcrypt.hash('Ps123456*', 10);
  for (let i = 1; i <= activesCount + inactivesCount; i++) {
    await User.create({
      username: `user${i}`,
      email: `user${i}@test.com`,
      password: hash,
      email_verified: i < activesCount,
    });
  }
};

// { force : true } just in dev mode, so the changes we made in the models are reflected in the database models
sequelize.sync({ force: true }).then(async () => {
  console.log('Database connected');
  addUsers(25);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
