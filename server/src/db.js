import sql from 'mssql';
import bcrypt from 'bcryptjs';

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || 'bpda_telemedicine',
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

export async function connectDb() {
  if (pool) return pool;
  pool = await sql.connect(config);
  await ensureSchema();
  return pool;
}

export function getPool() {
  if (!pool) throw new Error('Database not connected. Call connectDb() first.');
  return pool;
}

async function ensureSchema() {
  const request = pool.request();
  await request.query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
    CREATE TABLE users (
      id NVARCHAR(255) PRIMARY KEY,
      name NVARCHAR(255) NOT NULL,
      email NVARCHAR(255) NOT NULL UNIQUE,
      phone NVARCHAR(50) DEFAULT '',
      password_hash NVARCHAR(255) NOT NULL,
      role NVARCHAR(50) NOT NULL,
      approved BIT NOT NULL DEFAULT 0,
      doctor_id NVARCHAR(255),
      can_write BIT NOT NULL DEFAULT 0,
      prescription_copies INT DEFAULT 1,
      created_at BIGINT NOT NULL
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'medicines')
    CREATE TABLE medicines (
      name NVARCHAR(255) PRIMARY KEY,
      created_at BIGINT NOT NULL
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'prescriptions')
    CREATE TABLE prescriptions (
      id NVARCHAR(255) PRIMARY KEY,
      data NVARCHAR(MAX) NOT NULL,
      created_by NVARCHAR(255) NOT NULL,
      user_id NVARCHAR(255) NOT NULL,
      date NVARCHAR(50) NOT NULL,
      completed BIT NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      completed_at BIGINT
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'video_call_requests')
    CREATE TABLE video_call_requests (
      id NVARCHAR(255) PRIMARY KEY,
      requested_by NVARCHAR(255) NOT NULL,
      doctor_id NVARCHAR(255) NOT NULL,
      prescription_id NVARCHAR(255),
      status NVARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at BIGINT NOT NULL
    );
  `);
}

export const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const publicUser = (u) => u && ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  approved: !!u.approved,
  doctor_id: u.doctor_id,
  can_write: !!u.can_write,
  prescription_copies: u.prescription_copies,
  created_at: u.created_at,
});

export const parsePrescription = (row) => row && ({
  ...JSON.parse(row.data),
  completed: !!row.completed,
  completedAt: row.completed_at || undefined,
});

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@bpda.com';
  const existing = await pool.request()
    .input('email', sql.NVarChar, email)
    .query('SELECT id FROM users WHERE email = @email');
  if (existing.recordset.length > 0) return;

  await pool.request()
    .input('id', sql.NVarChar, 'admin_001')
    .input('name', sql.NVarChar, process.env.ADMIN_NAME || 'Admin')
    .input('email', sql.NVarChar, email)
    .input('password_hash', sql.NVarChar, bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 12))
    .input('created_at', sql.BigInt, Date.now())
    .query(`INSERT INTO users (id, name, email, phone, password_hash, role, approved, can_write, created_at)
            VALUES (@id, @name, @email, '', @password_hash, 'admin', 1, 1, @created_at)`);
}
