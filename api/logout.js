const { clearSessionCookie } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.setHeader('Location', '/admin/login');
  res.status(302).send('');
};
