const app = require('./src/app');
const sequelize = require('./src/config/database');

// { force : true } just in dev mode, so the changes we made in the models are reflected in the database models
sequelize.sync({ force: true }).then(() => console.log('Database connected'));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
