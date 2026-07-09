import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-f7e854ec/health", (c) => {
  return c.json({ status: "ok" });
});

// User Registration
app.post("/make-server-f7e854ec/register", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, phone, name, role } = body;

    console.log("Registration attempt:", email, role);

    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Check if user already exists
    const allUsers = await kv.getByPrefix('user:');
    const existingUser = allUsers.find((u: any) => u.email === email);
    
    if (existingUser) {
      console.log("User already exists:", existingUser);
      if (!existingUser.approved) {
        return c.json({ 
          error: "এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে। অনুগ্রহ করে Admin approval এর জন্য অপেক্ষা করুন।",
          status: "pending_approval"
        }, 400);
      }
      return c.json({ 
        error: "এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা আছে। অনুগ্রহ করে লগইন করুন।",
        status: "already_registered"
      }, 400);
    }

    // Create user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("Creating new user:", userId);

    // Store user info
    const newUser = {
      id: userId,
      email,
      password, // In production, this should be hashed!
      name,
      phone: phone || '',
      role,
      approved: false,
      doctor_id: null,
      can_write: false,
      created_at: Date.now()
    };

    await kv.set(`user:${userId}`, newUser);

    console.log("User created successfully:", userId);

    return c.json({ 
      success: true, 
      message: "Registration successful. Waiting for admin approval.",
      user_id: userId 
    });
  } catch (error) {
    console.error("Registration error:", error);
    return c.json({ error: "Registration failed: " + error.message }, 500);
  }
});

// User Login
app.post("/make-server-f7e854ec/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // Get all users
    const allUsers = await kv.getByPrefix('user:');
    const user = allUsers.find((u: any) => u.email === email && u.password === password);

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return c.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Login failed: " + error.message }, 500);
  }
});

// Get User Info
app.get("/make-server-f7e854ec/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:${userId}`);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    return c.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return c.json({ error: "Failed to get user" }, 500);
  }
});

// Get All Pending Users (Admin only)
app.get("/make-server-f7e854ec/users/pending", async (c) => {
  try {
    const allUsers = await kv.getByPrefix('user:');
    const pendingUsers = allUsers.filter((u: any) => !u.approved && u.role !== 'admin');
    return c.json({ users: pendingUsers });
  } catch (error) {
    console.error("Get pending users error:", error);
    return c.json({ error: "Failed to get pending users" }, 500);
  }
});

// Approve User (Admin only)
app.post("/make-server-f7e854ec/users/approve", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, doctorId, prescriptionCopies } = body;

    console.log("Approving user:", userId, "with doctor:", doctorId, "prescription copies:", prescriptionCopies);

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      console.error("User not found in KV store:", userId);
      return c.json({ error: "User not found" }, 404);
    }

    console.log("Found user in KV:", user);

    // Update user approval status
    const updatedUser = {
      ...user,
      approved: true,
      doctor_id: doctorId || null,
      can_write: true,
      prescription_copies: prescriptionCopies || 1 // Default 1 copy if not specified
    };

    await kv.set(`user:${userId}`, updatedUser);
    console.log("Updated user in KV store");

    // Try to update Supabase Auth metadata (optional)
    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user,
          approved: true,
          doctor_id: doctorId || null,
          can_write: true,
          prescription_copies: prescriptionCopies || 1
        }
      });
      console.log("Updated Supabase Auth metadata");
    } catch (authError) {
      console.log("Could not update Supabase Auth (user may not exist in auth):", authError.message);
      // Continue anyway since KV store is updated
    }

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Approve user error:", error);
    return c.json({ error: "Failed to approve user: " + error.message }, 500);
  }
});

// Get All Doctors
app.get("/make-server-f7e854ec/doctors", async (c) => {
  try {
    const allUsers = await kv.getByPrefix('user:');
    const doctors = allUsers.filter((u: any) => u.role === 'doctor' && u.approved);
    return c.json({ doctors });
  } catch (error) {
    console.error("Get doctors error:", error);
    return c.json({ error: "Failed to get doctors" }, 500);
  }
});

// Get All Users (Admin only)
app.get("/make-server-f7e854ec/users", async (c) => {
  try {
    const allUsers = await kv.getByPrefix('user:');
    return c.json({ users: allUsers });
  } catch (error) {
    console.error("Get all users error:", error);
    return c.json({ error: "Failed to get users" }, 500);
  }
});

// Get Polli Chikitsok for a Doctor
app.get("/make-server-f7e854ec/doctor/:doctorId/polli-chikitsok", async (c) => {
  try {
    const doctorId = c.req.param('doctorId');
    const allUsers = await kv.getByPrefix('user:');
    const polliChikitsok = allUsers.filter((u: any) => u.doctor_id === doctorId && u.role === 'polli-chikitsok');
    return c.json({ polli_chikitsok: polliChikitsok });
  } catch (error) {
    console.error("Get polli chikitsok error:", error);
    return c.json({ error: "Failed to get polli chikitsok" }, 500);
  }
});

// Medicine Management
app.get("/make-server-f7e854ec/medicines", async (c) => {
  try {
    const medicines = await kv.get('medicines_list') || [];
    return c.json({ medicines });
  } catch (error) {
    console.error("Get medicines error:", error);
    return c.json({ error: "Failed to get medicines" }, 500);
  }
});

app.post("/make-server-f7e854ec/medicines", async (c) => {
  try {
    const body = await c.req.json();
    const { medicines } = body;
    
    await kv.set('medicines_list', medicines);
    return c.json({ success: true, medicines });
  } catch (error) {
    console.error("Update medicines error:", error);
    return c.json({ error: "Failed to update medicines" }, 500);
  }
});

// Prescription Management
app.post("/make-server-f7e854ec/prescription", async (c) => {
  try {
    const body = await c.req.json();
    const prescription = {
      ...body,
      id: body.id || `presc_${Date.now()}`,
      created_at: body.created_at || Date.now()
    };

    await kv.set(`prescription:${prescription.id}`, prescription);
    return c.json({ success: true, prescription });
  } catch (error) {
    console.error("Create prescription error:", error);
    return c.json({ error: "Failed to create prescription" }, 500);
  }
});

app.get("/make-server-f7e854ec/prescriptions", async (c) => {
  try {
    const prescriptions = await kv.getByPrefix('prescription:');
    return c.json({ prescriptions });
  } catch (error) {
    console.error("Get prescriptions error:", error);
    return c.json({ error: "Failed to get prescriptions" }, 500);
  }
});

app.put("/make-server-f7e854ec/prescription/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existing = await kv.get(`prescription:${id}`);
    const updated = { ...existing, ...body };
    
    await kv.set(`prescription:${id}`, updated);
    return c.json({ success: true, prescription: updated });
  } catch (error) {
    console.error("Update prescription error:", error);
    return c.json({ error: "Failed to update prescription" }, 500);
  }
});

// Complete Prescription (marks for database archival after midnight)
app.post("/make-server-f7e854ec/prescription/:id/complete", async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await kv.get(`prescription:${id}`);
    
    if (!existing) {
      return c.json({ error: "Prescription not found" }, 404);
    }

    const completed = {
      ...existing,
      completed: true,
      completedAt: Date.now(),
      status: 'completed'
    };
    
    await kv.set(`prescription:${id}`, completed);
    
    // Also save to completed database (will be moved to archive after midnight)
    await kv.set(`completed_prescription:${id}`, completed);
    
    return c.json({ success: true, prescription: completed });
  } catch (error) {
    console.error("Complete prescription error:", error);
    return c.json({ error: "Failed to complete prescription" }, 500);
  }
});

// Video Call Requests
app.post("/make-server-f7e854ec/video-call-request", async (c) => {
  try {
    const body = await c.req.json();
    const request = {
      ...body,
      id: `vcr_${Date.now()}`,
      created_at: Date.now(),
      status: 'pending'
    };

    await kv.set(`video_call_request:${request.id}`, request);
    return c.json({ success: true, request });
  } catch (error) {
    console.error("Video call request error:", error);
    return c.json({ error: "Failed to create video call request" }, 500);
  }
});

app.get("/make-server-f7e854ec/video-call-requests/:doctorId", async (c) => {
  try {
    const doctorId = c.req.param('doctorId');
    const allRequests = await kv.getByPrefix('video_call_request:');
    const requests = allRequests.filter((r: any) => r.doctor_id === doctorId);
    return c.json({ requests });
  } catch (error) {
    console.error("Get video call requests error:", error);
    return c.json({ error: "Failed to get video call requests" }, 500);
  }
});

// Toggle User Write Permission (Admin only)
app.post("/make-server-f7e854ec/users/toggle-write", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, canWrite } = body;

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const updatedUser = { ...user, can_write: canWrite };
    await kv.set(`user:${userId}`, updatedUser);

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Toggle write permission error:", error);
    return c.json({ error: "Failed to toggle write permission" }, 500);
  }
});

// Delete User (Admin only)
app.delete("/make-server-f7e854ec/users/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    console.log("Deleting user:", userId);

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    await kv.del(`user:${userId}`);
    
    console.log("User deleted successfully:", userId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return c.json({ error: "Failed to delete user: " + error.message }, 500);
  }
});

// Get prescriptions by user (polli chikitsok) and date
app.get("/make-server-f7e854ec/prescriptions/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const allPrescriptions = await kv.getByPrefix('prescription:');
    const userPrescriptions = allPrescriptions.filter((p: any) => p.userId === userId);
    
    // Group by date
    const grouped: any = {};
    userPrescriptions.forEach((p: any) => {
      const date = p.date || new Date(p.created_at).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(p);
    });
    
    return c.json({ prescriptions: userPrescriptions, grouped });
  } catch (error) {
    console.error("Get user prescriptions error:", error);
    return c.json({ error: "Failed to get user prescriptions" }, 500);
  }
});

// Get current date prescriptions (not completed)
app.get("/make-server-f7e854ec/prescriptions/current", async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const allPrescriptions = await kv.getByPrefix('prescription:');
    
    if (!Array.isArray(allPrescriptions)) {
      console.log("No prescriptions found or invalid data");
      return c.json({ prescriptions: [] });
    }
    
    const currentPrescriptions = allPrescriptions.filter((p: any) => {
      if (!p) return false;
      const prescDate = p.date || new Date(p.created_at || Date.now()).toISOString().split('T')[0];
      return prescDate === today && !p.completed;
    });
    
    return c.json({ prescriptions: currentPrescriptions });
  } catch (error) {
    console.error("Get current prescriptions error:", error);
    return c.json({ error: "Failed to get current prescriptions", prescriptions: [] }, 500);
  }
});

// Archive prescriptions (move to date-wise database) - called automatically at midnight or manually by admin
app.post("/make-server-f7e854ec/prescriptions/archive", async (c) => {
  try {
    const allPrescriptions = await kv.getByPrefix('prescription:');
    const completedPrescriptions = allPrescriptions.filter((p: any) => p.completed);
    
    // Archive each completed prescription
    for (const prescription of completedPrescriptions) {
      const userId = prescription.userId;
      const date = prescription.date || new Date(prescription.created_at).toISOString().split('T')[0];
      const archiveKey = `archive:${userId}:${date}:${prescription.id}`;
      
      await kv.set(archiveKey, prescription);
      
      // Remove from active prescriptions
      await kv.del(`prescription:${prescription.id}`);
    }
    
    return c.json({ success: true, archived: completedPrescriptions.length });
  } catch (error) {
    console.error("Archive prescriptions error:", error);
    return c.json({ error: "Failed to archive prescriptions" }, 500);
  }
});

// Get archived prescriptions by user and date
app.get("/make-server-f7e854ec/prescriptions/archive/:userId/:date", async (c) => {
  try {
    const userId = c.req.param('userId');
    const date = c.req.param('date');
    const prefix = `archive:${userId}:${date}:`;
    const archivedPrescriptions = await kv.getByPrefix(prefix);
    
    if (!Array.isArray(archivedPrescriptions)) {
      return c.json({ prescriptions: [] });
    }
    
    return c.json({ prescriptions: archivedPrescriptions });
  } catch (error) {
    console.error("Get archived prescriptions error:", error);
    return c.json({ error: "Failed to get archived prescriptions", prescriptions: [] }, 500);
  }
});

// Get all archived dates for a user
app.get("/make-server-f7e854ec/prescriptions/archive/:userId/dates", async (c) => {
  try {
    const userId = c.req.param('userId');
    const prefix = `archive:${userId}:`;
    const allArchived = await kv.getByPrefix(prefix);
    
    if (!Array.isArray(allArchived)) {
      console.log("No archived prescriptions found");
      return c.json({ dates: [] });
    }
    
    // Extract unique dates
    const dates = new Set<string>();
    allArchived.forEach((p: any) => {
      if (!p) return;
      const date = p.date || new Date(p.created_at || Date.now()).toISOString().split('T')[0];
      dates.add(date);
    });
    
    return c.json({ dates: Array.from(dates).sort().reverse() });
  } catch (error) {
    console.error("Get archived dates error:", error);
    return c.json({ error: "Failed to get archived dates", dates: [] }, 500);
  }
});

// Update prescription copy limit for a user (Admin only)
app.post("/make-server-f7e854ec/users/update-copies", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, prescriptionCopies } = body;

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const updatedUser = { ...user, prescription_copies: prescriptionCopies };
    await kv.set(`user:${userId}`, updatedUser);

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update prescription copies error:", error);
    return c.json({ error: "Failed to update prescription copies" }, 500);
  }
});

// Export all data (for backup)
app.get("/make-server-f7e854ec/admin/export-all", async (c) => {
  try {
    console.log("Exporting all data for backup...");

    const [users, prescriptions, medicines, videoCallRequests, archivedPrescriptions] = await Promise.all([
      kv.getByPrefix('user:'),
      kv.getByPrefix('prescription:'),
      kv.get('medicines_list'),
      kv.getByPrefix('video_call_request:'),
      kv.getByPrefix('archive:')
    ]);

    const exportData = {
      export_date: new Date().toISOString(),
      export_timestamp: Date.now(),
      users: users || [],
      prescriptions: prescriptions || [],
      medicines: medicines || [],
      video_call_requests: videoCallRequests || [],
      archived_prescriptions: archivedPrescriptions || [],
      metadata: {
        total_users: (users || []).length,
        total_prescriptions: (prescriptions || []).length,
        total_medicines: (medicines || []).length,
        total_video_requests: (videoCallRequests || []).length,
        total_archived: (archivedPrescriptions || []).length
      }
    };

    console.log("Export completed:", exportData.metadata);

    return c.json({ success: true, data: exportData });
  } catch (error) {
    console.error("Export all data error:", error);
    return c.json({ error: "Failed to export data: " + error.message }, 500);
  }
});

// Delete all users (Admin only - DANGEROUS)
app.delete("/make-server-f7e854ec/admin/delete-all-users", async (c) => {
  try {
    console.log("ADMIN ACTION: Deleting all users...");
    const allUsers = await kv.getByPrefix('user:');

    for (const user of allUsers) {
      if (user.role !== 'admin') {
        await kv.del(`user:${user.id}`);
      }
    }

    console.log(`Deleted ${allUsers.length} users (excluding admins)`);
    return c.json({ success: true, deleted: allUsers.length });
  } catch (error) {
    console.error("Delete all users error:", error);
    return c.json({ error: "Failed to delete users: " + error.message }, 500);
  }
});

// Delete all prescriptions (Admin only - DANGEROUS)
app.delete("/make-server-f7e854ec/admin/delete-all-prescriptions", async (c) => {
  try {
    console.log("ADMIN ACTION: Deleting all prescriptions...");
    const allPrescriptions = await kv.getByPrefix('prescription:');

    for (const prescription of allPrescriptions) {
      await kv.del(`prescription:${prescription.id}`);
    }

    console.log(`Deleted ${allPrescriptions.length} prescriptions`);
    return c.json({ success: true, deleted: allPrescriptions.length });
  } catch (error) {
    console.error("Delete all prescriptions error:", error);
    return c.json({ error: "Failed to delete prescriptions: " + error.message }, 500);
  }
});

// Delete all archived prescriptions (Admin only - DANGEROUS)
app.delete("/make-server-f7e854ec/admin/delete-all-archived", async (c) => {
  try {
    console.log("ADMIN ACTION: Deleting all archived prescriptions...");
    const allArchived = await kv.getByPrefix('archive:');

    // Extract all keys to delete
    for (const archived of allArchived) {
      const archiveKeys = await kv.getByPrefix('archive:');
      for (const key of archiveKeys) {
        // We need to construct the key properly
        const userId = key.userId;
        const date = key.date;
        const id = key.id;
        await kv.del(`archive:${userId}:${date}:${id}`);
      }
      break; // Just delete all with prefix
    }

    // Alternative: delete by reconstructing keys
    const allArchivedData = await kv.getByPrefix('archive:');
    let deletedCount = 0;
    for (const item of allArchivedData) {
      try {
        const userId = item.userId;
        const date = item.date || new Date(item.created_at).toISOString().split('T')[0];
        const archiveKey = `archive:${userId}:${date}:${item.id}`;
        await kv.del(archiveKey);
        deletedCount++;
      } catch (err) {
        console.error("Error deleting archived item:", err);
      }
    }

    console.log(`Deleted ${deletedCount} archived prescriptions`);
    return c.json({ success: true, deleted: deletedCount });
  } catch (error) {
    console.error("Delete all archived error:", error);
    return c.json({ error: "Failed to delete archived prescriptions: " + error.message }, 500);
  }
});

// Delete ALL data (Admin only - EXTREMELY DANGEROUS - Complete Database Wipe)
app.delete("/make-server-f7e854ec/admin/wipe-database", async (c) => {
  try {
    console.log("⚠️ ADMIN ACTION: WIPING ENTIRE DATABASE ⚠️");

    // Delete all users (except admins)
    const allUsers = await kv.getByPrefix('user:');
    for (const user of allUsers) {
      if (user.role !== 'admin') {
        await kv.del(`user:${user.id}`);
      }
    }

    // Delete all prescriptions
    const allPrescriptions = await kv.getByPrefix('prescription:');
    for (const prescription of allPrescriptions) {
      await kv.del(`prescription:${prescription.id}`);
    }

    // Delete all archived prescriptions
    const allArchived = await kv.getByPrefix('archive:');
    for (const item of allArchived) {
      try {
        const userId = item.userId;
        const date = item.date || new Date(item.created_at).toISOString().split('T')[0];
        await kv.del(`archive:${userId}:${date}:${item.id}`);
      } catch (err) {
        console.error("Error deleting archived item during wipe:", err);
      }
    }

    // Delete all video call requests
    const allVideoRequests = await kv.getByPrefix('video_call_request:');
    for (const request of allVideoRequests) {
      await kv.del(`video_call_request:${request.id}`);
    }

    // Clear medicines list
    await kv.set('medicines_list', []);

    console.log("⚠️ DATABASE WIPE COMPLETED ⚠️");

    return c.json({
      success: true,
      message: "Database wiped successfully",
      deleted: {
        users: allUsers.length,
        prescriptions: allPrescriptions.length,
        archived: allArchived.length,
        video_requests: allVideoRequests.length
      }
    });
  } catch (error) {
    console.error("Database wipe error:", error);
    return c.json({ error: "Failed to wipe database: " + error.message }, 500);
  }
});

Deno.serve(app.fetch);