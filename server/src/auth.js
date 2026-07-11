import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { getPool, publicUser } from './db.js';

const secret = process.env.JWT_SECRET || 'development-secret-change-me';
export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '12h' });

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, secret);
    const result = await getPool().request()
      .input('id', sql.NVarChar, payload.sub)
      .query('SELECT * FROM users WHERE id = @id');
    const user = result.recordset[0];
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = publicUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
export const requireAdmin = [requireAuth, (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin permission required' })];
