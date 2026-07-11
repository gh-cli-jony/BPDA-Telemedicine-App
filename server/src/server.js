import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import { connectDb, getPool, id, parsePrescription, publicUser, seedAdmin } from './db.js';
import { requireAdmin, requireAuth, signToken } from './auth.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '25mb' }));

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const allUsers = async () => {
  const result = await getPool().request().query('SELECT * FROM users ORDER BY created_at DESC');
  return result.recordset.map(publicUser);
};

const allPrescriptions = async () => {
  const result = await getPool().request().query('SELECT * FROM prescriptions ORDER BY created_at DESC');
  return result.recordset.map(parsePrescription);
};

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'mssql', time: new Date().toISOString() }));

app.post('/api/register', asyncHandler(async (req, res) => {
  const { email, password, phone = '', name, role = 'polli-chikitsok' } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });
  if (!['doctor', 'polli-chikitsok'].includes(role)) return res.status(400).json({ error: 'Invalid registration role' });

  const existing = await getPool().request()
    .input('email', sql.NVarChar, email)
    .query('SELECT id, approved FROM users WHERE email = @email');
  if (existing.recordset.length > 0) {
    const exists = existing.recordset[0];
    return res.status(400).json({ error: exists.approved ? 'এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা আছে।' : 'এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে। Admin approval এর জন্য অপেক্ষা করুন।' });
  }

  const userId = id('user');
  await getPool().request()
    .input('id', sql.NVarChar, userId)
    .input('name', sql.NVarChar, name)
    .input('email', sql.NVarChar, email)
    .input('phone', sql.NVarChar, phone)
    .input('password_hash', sql.NVarChar, await bcrypt.hash(password, 12))
    .input('role', sql.NVarChar, role)
    .input('created_at', sql.BigInt, Date.now())
    .query(`INSERT INTO users (id, name, email, phone, password_hash, role, approved, doctor_id, can_write, prescription_copies, created_at)
            VALUES (@id, @name, @email, @phone, @password_hash, @role, 0, NULL, 0, 1, @created_at)`);

  res.json({ success: true, message: 'Registration successful. Waiting for admin approval.', user_id: userId });
}));

app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await getPool().request()
    .input('email', sql.NVarChar, email)
    .query('SELECT * FROM users WHERE email = @email');
  const user = result.recordset[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
  const safe = publicUser(user);
  res.json({ success: true, user: safe, token: signToken(safe) });
}));

app.get('/api/user/:userId', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  const result = await getPool().request()
    .input('id', sql.NVarChar, req.params.userId)
    .query('SELECT * FROM users WHERE id = @id');
  if (result.recordset.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(result.recordset[0]) });
}));

app.get('/api/users/pending', requireAdmin, asyncHandler(async (req, res) => {
  const users = await allUsers();
  res.json({ users: users.filter(u => !u.approved && u.role !== 'admin') });
}));

app.get('/api/users', requireAdmin, asyncHandler(async (req, res) => {
  res.json({ users: await allUsers() });
}));

app.get('/api/doctors', requireAuth, asyncHandler(async (req, res) => {
  const users = await allUsers();
  res.json({ doctors: users.filter(u => u.role === 'doctor' && u.approved) });
}));

app.get('/api/doctor/:doctorId/polli-chikitsok', requireAuth, asyncHandler(async (req, res) => {
  const users = await allUsers();
  res.json({ polli_chikitsok: users.filter(u => u.role === 'polli-chikitsok' && u.doctor_id === req.params.doctorId) });
}));

app.post('/api/users/approve', requireAdmin, asyncHandler(async (req, res) => {
  const { userId, doctorId = null, prescriptionCopies = 1 } = req.body;
  const result = await getPool().request()
    .input('id', sql.NVarChar, userId)
    .query('SELECT * FROM users WHERE id = @id');
  if (result.recordset.length === 0) return res.status(404).json({ error: 'User not found' });

  await getPool().request()
    .input('doctor_id', sql.NVarChar, doctorId)
    .input('prescription_copies', sql.Int, prescriptionCopies)
    .input('id', sql.NVarChar, userId)
    .query('UPDATE users SET approved = 1, doctor_id = @doctor_id, can_write = 1, prescription_copies = @prescription_copies WHERE id = @id');

  const updated = await getPool().request()
    .input('id', sql.NVarChar, userId)
    .query('SELECT * FROM users WHERE id = @id');
  res.json({ success: true, user: publicUser(updated.recordset[0]) });
}));

app.post('/api/users/update-copies', requireAdmin, asyncHandler(async (req, res) => {
  await getPool().request()
    .input('prescription_copies', sql.Int, req.body.prescriptionCopies)
    .input('id', sql.NVarChar, req.body.userId)
    .query('UPDATE users SET prescription_copies = @prescription_copies WHERE id = @id');
  res.json({ success: true });
}));

app.delete('/api/users/:userId', requireAdmin, asyncHandler(async (req, res) => {
  await getPool().request()
    .input('id', sql.NVarChar, req.params.userId)
    .query("DELETE FROM users WHERE id = @id AND role != 'admin'");
  res.json({ success: true });
}));

app.get('/api/medicines', requireAuth, asyncHandler(async (req, res) => {
  const result = await getPool().request().query('SELECT name FROM medicines ORDER BY name');
  res.json({ medicines: result.recordset.map(r => r.name) });
}));

app.post('/api/medicines', requireAdmin, asyncHandler(async (req, res) => {
  const medicines = Array.isArray(req.body.medicines) ? req.body.medicines : [];
  const pool = getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await transaction.request().query('DELETE FROM medicines');
    for (const name of medicines.filter(Boolean)) {
      await transaction.request()
        .input('name', sql.NVarChar, name)
        .input('created_at', sql.BigInt, Date.now())
        .query('INSERT INTO medicines (name, created_at) VALUES (@name, @created_at)');
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
  res.json({ success: true, medicines });
}));

app.get('/api/prescriptions', requireAuth, asyncHandler(async (req, res) => {
  res.json({ prescriptions: await allPrescriptions() });
}));

app.get('/api/prescriptions/current', requireAuth, asyncHandler(async (req, res) => {
  const prescriptions = await allPrescriptions();
  res.json({ prescriptions: prescriptions.filter(p => !p.completed) });
}));

app.post('/api/prescription', requireAuth, asyncHandler(async (req, res) => {
  const prescription = { ...req.body, id: req.body.id || id('presc'), createdBy: req.user.id, userId: req.user.id, createdAt: Date.now() };
  await getPool().request()
    .input('id', sql.NVarChar, prescription.id)
    .input('data', sql.NVarChar, JSON.stringify(prescription))
    .input('created_by', sql.NVarChar, prescription.createdBy)
    .input('user_id', sql.NVarChar, prescription.userId)
    .input('date', sql.NVarChar, prescription.date || new Date().toISOString().slice(0, 10))
    .input('created_at', sql.BigInt, prescription.createdAt)
    .query('INSERT INTO prescriptions (id, data, created_by, user_id, date, completed, created_at, completed_at) VALUES (@id, @data, @created_by, @user_id, @date, 0, @created_at, NULL)');
  res.json({ success: true, prescription });
}));

app.put('/api/prescription/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await getPool().request()
    .input('id', sql.NVarChar, req.params.id)
    .query('SELECT * FROM prescriptions WHERE id = @id');
  if (result.recordset.length === 0) return res.status(404).json({ error: 'Prescription not found' });
  const data = { ...parsePrescription(result.recordset[0]), ...req.body, id: req.params.id };
  await getPool().request()
    .input('data', sql.NVarChar, JSON.stringify(data))
    .input('date', sql.NVarChar, data.date)
    .input('id', sql.NVarChar, req.params.id)
    .query('UPDATE prescriptions SET data = @data, date = @date WHERE id = @id');
  res.json({ success: true, prescription: data });
}));

app.delete('/api/prescription/:id', requireAuth, asyncHandler(async (req, res) => {
  await getPool().request()
    .input('id', sql.NVarChar, req.params.id)
    .query('DELETE FROM prescriptions WHERE id = @id');
  res.json({ success: true });
}));

app.post('/api/prescription/:id/complete', requireAuth, asyncHandler(async (req, res) => {
  await getPool().request()
    .input('completed_at', sql.BigInt, Date.now())
    .input('id', sql.NVarChar, req.params.id)
    .query('UPDATE prescriptions SET completed = 1, completed_at = @completed_at WHERE id = @id');
  res.json({ success: true });
}));

app.get('/api/prescriptions/archive/:userId/dates', requireAuth, asyncHandler(async (req, res) => {
  const prescriptions = await allPrescriptions();
  const dates = [...new Set(prescriptions
    .filter(p => p.userId === req.params.userId || p.createdBy === req.params.userId)
    .map(p => p.date))].sort().reverse();
  res.json({ dates });
}));

app.get('/api/prescriptions/archive/:userId/:date', requireAuth, asyncHandler(async (req, res) => {
  const prescriptions = await allPrescriptions();
  res.json({ prescriptions: prescriptions.filter(p => (p.userId === req.params.userId || p.createdBy === req.params.userId) && p.date === req.params.date) });
}));

app.post('/api/video-call-request', requireAuth, asyncHandler(async (req, res) => {
  const v = {
    id: id('vcr'),
    requested_by: req.user.id,
    doctor_id: req.body.doctorId,
    prescription_id: req.body.prescriptionId || null,
    status: 'pending',
    created_at: Date.now(),
  };
  await getPool().request()
    .input('id', sql.NVarChar, v.id)
    .input('requested_by', sql.NVarChar, v.requested_by)
    .input('doctor_id', sql.NVarChar, v.doctor_id)
    .input('prescription_id', sql.NVarChar, v.prescription_id)
    .input('status', sql.NVarChar, v.status)
    .input('created_at', sql.BigInt, v.created_at)
    .query('INSERT INTO video_call_requests (id, requested_by, doctor_id, prescription_id, status, created_at) VALUES (@id, @requested_by, @doctor_id, @prescription_id, @status, @created_at)');
  res.json({ success: true, request: v });
}));

app.get('/api/video-call-requests/:doctorId', requireAuth, asyncHandler(async (req, res) => {
  const result = await getPool().request()
    .input('doctor_id', sql.NVarChar, req.params.doctorId)
    .query('SELECT * FROM video_call_requests WHERE doctor_id = @doctor_id ORDER BY created_at DESC');
  res.json({ requests: result.recordset });
}));

app.post('/api/video-call-request/:id/status', requireAuth, asyncHandler(async (req, res) => {
  await getPool().request()
    .input('status', sql.NVarChar, req.body.status)
    .input('id', sql.NVarChar, req.params.id)
    .query('UPDATE video_call_requests SET status = @status WHERE id = @id');
  res.json({ success: true });
}));

app.get('/api/admin/export-all', requireAdmin, asyncHandler(async (req, res) => {
  const users = await allUsers();
  const prescriptions = await allPrescriptions();
  const medicinesResult = await getPool().request().query('SELECT name FROM medicines ORDER BY name');
  const videoCallRequests = await getPool().request().query('SELECT * FROM video_call_requests');
  const data = {
    export_date: new Date().toISOString(),
    export_timestamp: Date.now(),
    users,
    prescriptions,
    medicines: medicinesResult.recordset.map(r => r.name),
    video_call_requests: videoCallRequests.recordset,
    archived_prescriptions: prescriptions.filter(p => p.completed),
  };
  data.metadata = {
    total_users: data.users.length,
    total_prescriptions: data.prescriptions.length,
    total_medicines: data.medicines.length,
    total_video_requests: data.video_call_requests.length,
    total_archived: data.archived_prescriptions.length,
  };
  res.json({ success: true, data });
}));

app.delete('/api/admin/delete-all-users', requireAdmin, asyncHandler(async (req, res) => {
  const result = await getPool().request().query("DELETE FROM users WHERE role != 'admin'; SELECT @@ROWCOUNT AS changes");
  res.json({ success: true, deleted: result.recordset[0].changes });
}));

app.delete('/api/admin/delete-all-prescriptions', requireAdmin, asyncHandler(async (req, res) => {
  const result = await getPool().request().query('DELETE FROM prescriptions; SELECT @@ROWCOUNT AS changes');
  res.json({ success: true, deleted: result.recordset[0].changes });
}));

app.delete('/api/admin/delete-all-archived', requireAdmin, asyncHandler(async (req, res) => {
  const result = await getPool().request().query('DELETE FROM prescriptions WHERE completed = 1; SELECT @@ROWCOUNT AS changes');
  res.json({ success: true, deleted: result.recordset[0].changes });
}));

app.delete('/api/admin/wipe-database', requireAdmin, asyncHandler(async (req, res) => {
  const usersResult = await getPool().request().query("DELETE FROM users WHERE role != 'admin'; SELECT @@ROWCOUNT AS changes");
  const prescriptionsResult = await getPool().request().query('DELETE FROM prescriptions; SELECT @@ROWCOUNT AS changes');
  await getPool().request().query('DELETE FROM medicines');
  await getPool().request().query('DELETE FROM video_call_requests');
  res.json({ success: true, deleted: { users: usersResult.recordset[0].changes, prescriptions: prescriptionsResult.recordset[0].changes, archived: 0 } });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

async function start() {
  await connectDb();
  await seedAdmin();
  app.listen(port, () => console.log(`BPDA Telemedicine server running on http://localhost:${port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
