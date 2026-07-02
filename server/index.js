require('dotenv').config();

const app = require('./app');
const { getAppUrl } = require('./lib/app-url');

const PORT = Number(process.env.PORT || 3000);
const appUrl = getAppUrl();

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`APP_URL (email links): ${appUrl}`);
  if (!process.env.APP_URL) {
    console.log('Set APP_URL in .env when deploying so confirmation emails use your live domain.');
  }
});
