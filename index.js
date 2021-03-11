const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize.sync().then(() => console.log('Database connected'));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
