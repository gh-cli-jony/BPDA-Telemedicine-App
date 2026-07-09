import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DATABASE_PATH || './data/bpda.sqlite';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','doctor','polli-chikitsok')),
  approved INTEGER NOT NULL DEFAULT 0,
  doctor_id TEXT,
  can_write INTEGER NOT NULL DEFAULT 0,
  prescription_copies INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS medicines (name TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_by TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS video_call_requests (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  prescription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
`);

export const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
export const publicUser = (u) => u && ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  approved: !!u.approved, doctor_id: u.doctor_id, can_write: !!u.can_write,
  prescription_copies: u.prescription_copies, created_at: u.created_at
});
export const parsePrescription = (row) => row && ({ ...JSON.parse(row.data), completed: !!row.completed, completedAt: row.completed_at || undefined });

export function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@bpda.com';
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (exists) return;
  db.prepare(`INSERT INTO users (id,name,email,phone,password_hash,role,approved,can_write,created_at)
    VALUES (@id,@name,@email,'',@password_hash,'admin',1,1,@created_at)`).run({
    id: 'admin_001',
    name: process.env.ADMIN_NAME || 'Admin',
    email,
    password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 12),
    created_at: Date.now()
  });
}
