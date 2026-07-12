const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`SafeStock Analytics API listening on port ${PORT}`);
});
