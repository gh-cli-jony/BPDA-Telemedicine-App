# 📋 BPDA Telemedicine - Backup & Delete Guide

## 🎯 নতুন Features যুক্ত করা হয়েছে

### ✅ 1. Google Drive Backup System
- **Email:** bpdatelemedicine@gmail.com
- **Storage:** 15 GB Free

### ✅ 2. Complete Database Management
- Export সম্পূর্ণ database (JSON format)
- Delete individual categories
- Complete database wipe option

---

## 💾 Backup কিভাবে নিবেন

### Method 1: Manual Backup (Recommended)

1. **Admin Panel এ যান**
   - Email: admin@bpda.com
   - Password: admin123

2. **"ডাটাবেস ম্যানেজমেন্ট" tab এ click করুন**

3. **"📥 সম্পূর্ণ Database Export করুন" button এ click করুন**
   - একটি JSON file download হবে
   - File name: `bpda-telemedicine-backup-2026-04-09.json`

4. **Google Drive এ Upload করুন**
   - https://drive.google.com এ যান
   - bpdatelemedicine@gmail.com দিয়ে login করুন
   - একটি "BPDA Backups" folder তৈরি করুন
   - Download করা JSON file upload করুন

5. **Backup Schedule:**
   - প্রতি সপ্তাহে ১ বার
   - গুরুত্বপূর্ণ কাজের আগে
   - Major changes এর আগে

---

## 🗑️ Delete Operations

### ⚠️ IMPORTANT: Delete করার আগে অবশ্যই Backup নিন!

Admin Panel → ডাটাবেস ম্যানেজমেন্ট tab এ যান:

### 1. সব Users Delete (admin ছাড়া)
- Button: "🧑 সব Users Delete করুন"
- ২ বার confirmation চাইবে
- শুধুমাত্র admin থাকবে, বাকি সব user মুছে যাবে

### 2. সব Active Prescriptions Delete
- Button: "📄 সব Active Prescriptions Delete করুন"
- চলমান সব prescription মুছে যাবে
- Archived prescriptions থাকবে

### 3. সব Archived Prescriptions Delete
- Button: "📦 সব Archived Prescriptions Delete করুন"
- Date-wise archive করা সব prescription মুছে যাবে

### 4. Complete Database Wipe (NUCLEAR OPTION)
- Button: "🚨 সম্পূর্ণ Database মুছে ফেলুন"
- ৩ বার confirmation + text verification
- সব কিছু মুছে যাবে (শুধু admin থাকবে)
- **শুধুমাত্র emergency situation এ ব্যবহার করুন!**

---

## 📊 Export File Structure

```json
{
  "export_date": "2026-04-09T10:30:00.000Z",
  "export_timestamp": 1744369800000,
  "users": [...],
  "prescriptions": [...],
  "medicines": [...],
  "video_call_requests": [...],
  "archived_prescriptions": [...],
  "metadata": {
    "total_users": 285,
    "total_prescriptions": 1243,
    "total_medicines": 150,
    "total_video_requests": 45,
    "total_archived": 3421
  }
}
```

---

## 🔧 Backend API Endpoints (New)

### Export All Data
```
GET /make-server-f7e854ec/admin/export-all
```

### Delete All Users (except admins)
```
DELETE /make-server-f7e854ec/admin/delete-all-users
```

### Delete All Prescriptions
```
DELETE /make-server-f7e854ec/admin/delete-all-prescriptions
```

### Delete All Archived
```
DELETE /make-server-f7e854ec/admin/delete-all-archived
```

### Wipe Database
```
DELETE /make-server-f7e854ec/admin/wipe-database
```

---

## 📱 Admin Panel New Tabs

1. **অনুমোদনের অপেক্ষায়** - Pending user approvals
2. **ঔষধের তালিকা** - Medicine management
3. **ডাক্তারদের তালিকা** - Doctor list
4. **প্রোফাইল ও প্রেসক্রিপশন** - User profiles & prescriptions
5. **ডাটাবেস ম্যানেজমেন্ট** ⭐ NEW - Backup & Delete
6. **সিস্টেম ইনফো** - System information & Play Store guide

---

## 💡 Best Practices

### ✅ DO:
- প্রতি সপ্তাহে backup নিন
- Delete করার আগে backup verify করুন
- ২-৩ টি জায়গায় backup রাখুন (Google Drive + Local + External HD)
- Test করুন যে backup file ঠিকমতো download হয়েছে কিনা

### ❌ DON'T:
- Backup ছাড়া delete করবেন না
- "Complete Database Wipe" button casual ভাবে ব্যবহার করবেন না
- Backup file গুলো public share করবেন না (patient data আছে)
- Single backup এ depend করবেন না

---

## 🚨 Emergency Recovery

যদি ভুলবশত সব কিছু delete হয়ে যায়:

1. **সবচেয়ে recent backup file খুঁজে বের করুন**
   - Google Drive থেকে
   - Local computer থেকে
   - External hard drive থেকে

2. **Manual import করতে হবে**
   - Backend developer কে contact করুন
   - Backup JSON file provide করুন
   - Database manually restore করা হবে

3. **ভবিষ্যতে এড়াতে:**
   - Auto backup system setup করুন
   - Multiple backup locations maintain করুন
   - Delete operations এ extra careful থাকুন

---

## 📞 Support

যদি কোনো সমস্যা হয়:
1. GitHub issues: https://github.com/anthropics/claude-code/issues
2. Backup file check করুন: Download করা file open করে verify করুন
3. Browser console check করুন: F12 press করে errors দেখুন

---

## ✨ Summary

আপনার BPDA Telemedicine সিস্টেমে এখন:
- ✅ Complete backup functionality
- ✅ Google Drive integration guide
- ✅ Granular delete operations
- ✅ Complete database wipe option
- ✅ Admin has full control

**Remember:** Backup নেওয়া খুবই জরুরি! Patient data sensitive এবং valuable।

---

Last Updated: 2026-04-09
Version: 2.0
