import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { db, id, parsePrescription, publicUser, seedAdmin } from './db.js';
import { requireAdmin, requireAuth, signToken } from './auth.js';

seedAdmin();
const app = express();
const port = Number(process.env.PORT || 4000);
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '25mb' }));

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const allUsers = () => db.prepare('SELECT * FROM users ORDER BY created_at DESC').all().map(publicUser);
const allPrescriptions = () => db.prepare('SELECT * FROM prescriptions ORDER BY created_at DESC').all().map(parsePrescription);

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'sqlite', time: new Date().toISOString() }));

app.post('/api/register', asyncHandler(async (req, res) => {
  const { email, password, phone = '', name, role = 'polli-chikitsok' } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });
  if (!['doctor', 'polli-chikitsok'].includes(role)) return res.status(400).json({ error: 'Invalid registration role' });
  const exists = db.prepare('SELECT id, approved FROM users WHERE email=?').get(email);
  if (exists) return res.status(400).json({ error: exists.approved ? 'এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা আছে।' : 'এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে। Admin approval এর জন্য অপেক্ষা করুন।' });
  const user = { id: id('user'), name, email, phone, password_hash: await bcrypt.hash(password, 12), role, approved: 0, doctor_id: null, can_write: 0, prescription_copies: 1, created_at: Date.now() };
  db.prepare(`INSERT INTO users VALUES (@id,@name,@email,@phone,@password_hash,@role,@approved,@doctor_id,@can_write,@prescription_copies,@created_at)`).run(user);
  res.json({ success: true, message: 'Registration successful. Waiting for admin approval.', user_id: user.id });
}));

app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
  const safe = publicUser(user);
  res.json({ success: true, user: safe, token: signToken(safe) });
}));

app.get('/api/user/:userId', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

app.get('/api/users/pending', requireAdmin, (req, res) => res.json({ users: allUsers().filter(u => !u.approved && u.role !== 'admin') }));
app.get('/api/users', requireAdmin, (req, res) => res.json({ users: allUsers() }));
app.get('/api/doctors', requireAuth, (req, res) => res.json({ doctors: allUsers().filter(u => u.role === 'doctor' && u.approved) }));
app.get('/api/doctor/:doctorId/polli-chikitsok', requireAuth, (req, res) => res.json({ polli_chikitsok: allUsers().filter(u => u.role === 'polli-chikitsok' && u.doctor_id === req.params.doctorId) }));

app.post('/api/users/approve', requireAdmin, (req, res) => {
  const { userId, doctorId = null, prescriptionCopies = 1 } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET approved=1, doctor_id=?, can_write=1, prescription_copies=? WHERE id=?').run(doctorId, prescriptionCopies, userId);
  res.json({ success: true, user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(userId)) });
});
app.post('/api/users/update-copies', requireAdmin, (req, res) => {
  db.prepare('UPDATE users SET prescription_copies=? WHERE id=?').run(req.body.prescriptionCopies, req.body.userId);
  res.json({ success: true });
});
app.delete('/api/users/:userId', requireAdmin, (req, res) => { db.prepare('DELETE FROM users WHERE id=? AND role != \'admin\'').run(req.params.userId); res.json({ success: true }); });

app.get('/api/medicines', requireAuth, (req, res) => res.json({ medicines: db.prepare('SELECT name FROM medicines ORDER BY name').all().map(r => r.name) }));
app.post('/api/medicines', requireAdmin, (req, res) => {
  const medicines = Array.isArray(req.body.medicines) ? req.body.medicines : [];
  const tx = db.transaction(() => { db.prepare('DELETE FROM medicines').run(); for (const name of medicines.filter(Boolean)) db.prepare('INSERT OR IGNORE INTO medicines VALUES (?,?)').run(name, Date.now()); });
  tx(); res.json({ success: true, medicines });
});

app.get('/api/prescriptions', requireAuth, (req, res) => res.json({ prescriptions: allPrescriptions() }));
app.get('/api/prescriptions/current', requireAuth, (req, res) => res.json({ prescriptions: allPrescriptions().filter(p => !p.completed) }));
app.post('/api/prescription', requireAuth, (req, res) => {
  const prescription = { ...req.body, id: req.body.id || id('presc'), createdBy: req.user.id, userId: req.user.id, createdAt: Date.now() };
  db.prepare('INSERT INTO prescriptions VALUES (?,?,?,?,?,?,?,?)').run(prescription.id, JSON.stringify(prescription), prescription.createdBy, prescription.userId, prescription.date || new Date().toISOString().slice(0,10), 0, prescription.createdAt, null);
  res.json({ success: true, prescription });
});
app.put('/api/prescription/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Prescription not found' });
  const data = { ...parsePrescription(row), ...req.body, id: req.params.id };
  db.prepare('UPDATE prescriptions SET data=?, date=? WHERE id=?').run(JSON.stringify(data), data.date, req.params.id);
  res.json({ success: true, prescription: data });
});
app.delete('/api/prescription/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM prescriptions WHERE id=?').run(req.params.id); res.json({ success: true }); });
app.post('/api/prescription/:id/complete', requireAuth, (req, res) => { db.prepare('UPDATE prescriptions SET completed=1, completed_at=? WHERE id=?').run(Date.now(), req.params.id); res.json({ success: true }); });
app.get('/api/prescriptions/archive/:userId/dates', requireAuth, (req, res) => res.json({ dates: [...new Set(allPrescriptions().filter(p => p.userId === req.params.userId || p.createdBy === req.params.userId).map(p => p.date))].sort().reverse() }));
app.get('/api/prescriptions/archive/:userId/:date', requireAuth, (req, res) => res.json({ prescriptions: allPrescriptions().filter(p => (p.userId === req.params.userId || p.createdBy === req.params.userId) && p.date === req.params.date) }));

app.post('/api/video-call-request', requireAuth, (req, res) => { const v = { id: id('vcr'), requested_by: req.user.id, doctor_id: req.body.doctorId, prescription_id: req.body.prescriptionId || null, status: 'pending', created_at: Date.now() }; db.prepare('INSERT INTO video_call_requests VALUES (@id,@requested_by,@doctor_id,@prescription_id,@status,@created_at)').run(v); res.json({ success: true, request: v }); });
app.get('/api/video-call-requests/:doctorId', requireAuth, (req, res) => res.json({ requests: db.prepare('SELECT * FROM video_call_requests WHERE doctor_id=? ORDER BY created_at DESC').all(req.params.doctorId) }));
app.post('/api/video-call-request/:id/status', requireAuth, (req, res) => { db.prepare('UPDATE video_call_requests SET status=? WHERE id=?').run(req.body.status, req.params.id); res.json({ success: true }); });

app.get('/api/admin/export-all', requireAdmin, (req, res) => {
  const data = { export_date: new Date().toISOString(), export_timestamp: Date.now(), users: allUsers(), prescriptions: allPrescriptions(), medicines: db.prepare('SELECT name FROM medicines ORDER BY name').all().map(r=>r.name), video_call_requests: db.prepare('SELECT * FROM video_call_requests').all(), archived_prescriptions: allPrescriptions().filter(p=>p.completed) };
  data.metadata = { total_users: data.users.length, total_prescriptions: data.prescriptions.length, total_medicines: data.medicines.length, total_video_requests: data.video_call_requests.length, total_archived: data.archived_prescriptions.length };
  res.json({ success: true, data });
});
app.delete('/api/admin/delete-all-users', requireAdmin, (req, res) => { const r = db.prepare('DELETE FROM users WHERE role != \'admin\'').run(); res.json({ success: true, deleted: r.changes }); });
app.delete('/api/admin/delete-all-prescriptions', requireAdmin, (req, res) => { const r = db.prepare('DELETE FROM prescriptions').run(); res.json({ success: true, deleted: r.changes }); });
app.delete('/api/admin/delete-all-archived', requireAdmin, (req, res) => { const r = db.prepare('DELETE FROM prescriptions WHERE completed=1').run(); res.json({ success: true, deleted: r.changes }); });
app.delete('/api/admin/wipe-database', requireAdmin, (req, res) => { const users = db.prepare('DELETE FROM users WHERE role != \'admin\'').run().changes; const prescriptions = db.prepare('DELETE FROM prescriptions').run().changes; const archived = 0; db.prepare('DELETE FROM medicines').run(); db.prepare('DELETE FROM video_call_requests').run(); res.json({ success: true, deleted: { users, prescriptions, archived } }); });

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message || 'Server error' }); });
app.listen(port, () => console.log(`BPDA Telemedicine server running on http://localhost:${port}`));
