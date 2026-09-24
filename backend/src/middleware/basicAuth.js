import crypto from 'node:crypto';

// Shared-password gate for test deployments. Active only when PORTAL_USER and PORTAL_PASSWORD are
// set; the browser shows its own sign-in box. /api/health stays open for the host's health check.
const same = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

export function basicAuth() {
  const user = process.env.PORTAL_USER;
  const pass = process.env.PORTAL_PASSWORD;
  if (!user || !pass) return (req, res, next) => next();

  return (req, res, next) => {
    if (req.path === '/api/health') return next();
    const [scheme, encoded] = (req.headers.authorization || '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString();
      const i = decoded.indexOf(':');
      if (i > 0 && same(decoded.slice(0, i), user) && same(decoded.slice(i + 1), pass)) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="TrustLab Smart Report", charset="UTF-8"');
    res.status(401).json({ message: 'Sign in required' });
  };
}
