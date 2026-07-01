require('dotenv').config();

const app = require('./app');

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`Trans Bharat Aviation running at http://localhost:${PORT}`);
  console.log(`API health: http://localhost:${PORT}/api/health`);
});
