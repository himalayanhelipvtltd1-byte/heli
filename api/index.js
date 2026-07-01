const app = require('../server/app');

// Required for multipart payment uploads on Vercel
module.exports = app;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
