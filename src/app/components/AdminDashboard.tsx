import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import logoImage from 'figma:asset/8c72cce425da67796bf83257bfbe8a39e8ba4e73.png';
import { ProfileManagement } from './ProfileManagement';
import { SystemInfo } from './SystemInfo';
import { DatabaseManagement } from './DatabaseManagement';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  approved: boolean;
  doctor_id?: string | null;
  can_write: boolean;
  prescription_copies?: number;
}

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'medicines' | 'users' | 'prescriptions' | 'profiles' | 'database' | 'system'>('pending');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allDoctors, setAllDoctors] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [medicines, setMedicines] = useState<string[]>([]);
  const [newMedicine, setNewMedicine] = useState('');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [completedPrescriptions, setCompletedPrescriptions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{ [key: string]: string }>({});
  const [prescriptionCopies, setPrescriptionCopies] = useState<{ [key: string]: number }>({});
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<User | null>(null);
  const [polliChikitsokList, setPolliChikitsokList] = useState<User[]>([]);
  const [selectedPolliProfile, setSelectedPolliProfile] = useState<User | null>(null);
  const [polliPrescriptions, setPolliPrescriptions] = useState<any[]>([]);
  const [archivedDates, setArchivedDates] = useState<string[]>([]);
  const [currentDatePrescriptions, setCurrentDatePrescriptions] = useState<any[]>([]);
  const [ccTemplates, setCCTemplates] = useState<string[]>([]);
  const [oeTemplates, setOETemplates] = useState<string[]>([]);
  const [adviceTemplates, setAdviceTemplates] = useState<string[]>([]);
  const [newCC, setNewCC] = useState('');
  const [newOE, setNewOE] = useState('');
  const [newAdvice, setNewAdvice] = useState('');

  useEffect(() => {
    loadPendingUsers();
    loadDoctors();
    loadAllUsers();
    loadMedicines();
    loadPrescriptions();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const response = await apiFetch('/users/pending', {
        headers: {
        }
      });
      const data = await response.json();
      console.log('Pending users loaded:', data.users);
      setPendingUsers(data.users || []);
    } catch (error) {
      console.error('Load pending users error:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await apiFetch('/doctors', {
        headers: {
        }
      });
      const data = await response.json();
      setAllDoctors(data.doctors || []);
    } catch (error) {
      console.error('Load doctors error:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await apiFetch('/users', {
        headers: {
        }
      });
      const data = await response.json();
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Load all users error:', error);
    }
  };

  const loadMedicines = async () => {
    try {
      const response = await apiFetch('/medicines', {
        headers: {
        }
      });
      const data = await response.json();
      setMedicines(data.medicines || []);
    } catch (error) {
      console.error('Load medicines error:', error);
    }
  };

  const loadPrescriptions = async () => {
    try {
      const response = await apiFetch('/prescriptions', {
        headers: {
        }
      });
      const data = await response.json();
      setPrescriptions(data.prescriptions || []);
    } catch (error) {
      console.error('Load prescriptions error:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই ইউজারকে মুছে ফেলতে চান?')) return;
    
    try {
      const response = await apiFetch(`/users/${userId}`, {
        method: 'DELETE',
        headers: {
        }
      });

      if (response.ok) {
        alert('ইউজার সফলভাবে মুছে ফেলা হয়েছে!');
        loadPendingUsers();
        loadAllUsers();
      } else {
        const data = await response.json();
        alert('ইউজার মুছতে ব্যর্থ: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('সার্ভার এরর: ' + error.message);
    }
  };

  const addMedicine = async () => {
    if (!newMedicine.trim()) return;
    
    const updatedMedicines = [...medicines, newMedicine.trim()];
    
    try {
      const response = await apiFetch('/medicines', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medicines: updatedMedicines })
      });

      if (response.ok) {
        setMedicines(updatedMedicines);
        setNewMedicine('');
      }
    } catch (error) {
      console.error('Add medicine error:', error);
    }
  };

  const removeMedicine = async (index: number) => {
    const updatedMedicines = medicines.filter((_, i) => i !== index);
    
    try {
      const response = await apiFetch('/medicines', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medicines: updatedMedicines })
      });

      if (response.ok) {
        setMedicines(updatedMedicines);
      }
    } catch (error) {
      console.error('Remove medicine error:', error);
    }
  };

  const approveUser = async (userId: string, doctorId: string | null) => {
    setLoading(true);
    console.log('Frontend approving user:', userId, 'doctorId:', doctorId);
    
    const copies = prescriptionCopies[userId] || 1;
    
    try {
      const response = await apiFetch('/users/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, doctorId, prescriptionCopies: copies })
      });

      const data = await response.json();
      console.log('Approve response:', data);

      if (response.ok) {
        alert('ইউজার সফলভাবে অনুমোদিত হয়েছে!');
        await loadPendingUsers();
        await loadAllUsers();
        await loadDoctors();
        // Clear selected doctor for this user
        setSelectedDoctor(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      } else {
        console.error('Approve error:', data);
        alert('অনুমোদন ব্যর্থ হয়েছে: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Approve user error:', error);
      alert('সার্ভার এরর: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
          <div className="flex items-center gap-4">
            <img src={logoImage} alt="Logo" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-blue-800 tracking-tight">BPDA Telemedicine - Admin Panel</h1>
              <p className="text-gray-500">স্বাগতম, {user.name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="bg-white border border-red-100 text-red-600 px-6 py-2.5 rounded-xl hover:bg-red-50"
          >
            লগ আউট
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 whitespace-nowrap ${activeTab === 'pending' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              অনুমোদনের অপেক্ষায় ({pendingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('medicines')}
              className={`flex-1 py-4 px-6 whitespace-nowrap ${activeTab === 'medicines' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              ঔষধের তালিকা ({medicines.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-4 px-6 whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              ডাক্তারদের তালিকা ({allDoctors.length})
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex-1 py-4 px-6 whitespace-nowrap ${activeTab === 'profiles' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              প্রোফাইল ও প্রেসক্রিপশন
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex-1 py-4 px-6 whitespace-nowrap ${activeTab === 'database' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              ডাটাবেস ম্যানেজমেন্ট
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 py-4 px-6 whitespace-nowrap ${activeTab === 'system' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              সিস্টেম ইনফো
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-gray-800 mb-4">নতুন রেজিস্ট্রেশন অনুমোদন</h2>
            {pendingUsers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">কোনো pending request নেই</p>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map(u => (
                  <div key={u.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="text-gray-800">{u.name}</p>
                      <p className="text-gray-500">{u.email}</p>
                      <p className="text-gray-500">{u.phone}</p>
                      <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {u.role === 'doctor' ? 'ডাক্তার' : 'পল্লি চিকিৎসক'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {u.role === 'polli-chikitsok' && (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedDoctor[u.id] || ''}
                            onChange={(e) => setSelectedDoctor(prev => ({
                              ...prev,
                              [u.id]: e.target.value
                            }))}
                            className="p-2 border rounded"
                          >
                            <option value="">ডাক্তার নির্বাচন করুন</option>
                            {allDoctors.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={prescriptionCopies[u.id] || 1}
                            onChange={(e) => setPrescriptionCopies(prev => ({
                              ...prev,
                              [u.id]: parseInt(e.target.value) || 1
                            }))}
                            placeholder="কপি সংখ্যা"
                            className="p-2 border rounded w-24"
                          />
                          <button
                            onClick={() => {
                              const doctorId = selectedDoctor[u.id];
                              if (!doctorId) {
                                alert('অনুগ্রহ করে একজন ডাক্তার নির্বাচন করুন');
                                return;
                              }
                              approveUser(u.id, doctorId);
                            }}
                            disabled={loading}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 whitespace-nowrap"
                          >
                            অনুমোদন করুন
                          </button>
                        </div>
                      )}
                      {u.role === 'doctor' && (
                        <button
                          onClick={() => approveUser(u.id, null)}
                          disabled={loading}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                        >
                          অনুমোদন করুন
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        মুছে ফেলুন
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'medicines' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-gray-800 mb-4">ঔষধের তালিকা ম্যানেজমেন্ট</h2>
            
            <div className="mb-6 flex gap-2">
              <input
                type="text"
                value={newMedicine}
                onChange={e => setNewMedicine(e.target.value)}
                placeholder="নতুন ঔষধের নাম লিখুন"
                className="flex-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={e => e.key === 'Enter' && addMedicine()}
              />
              <button
                onClick={addMedicine}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                যোগ করুন
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {medicines.map((med, index) => (
                <div key={index} className="border rounded-lg p-3 flex justify-between items-center">
                  <span className="text-gray-800">{med}</span>
                  <button
                    onClick={() => removeMedicine(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-gray-800 mb-4">অনুমোদিত ডাক্তারদের তালিকা</h2>
            {allDoctors.length === 0 ? (
              <p className="text-gray-400 text-center py-8">কোনো ডাক্তার নেই</p>
            ) : (
              <div className="space-y-4">
                {allDoctors.map(d => (
                  <div key={d.id} className="border rounded-lg p-4">
                    <p className="text-gray-800">{d.name}</p>
                    <p className="text-gray-500">{d.email}</p>
                    <p className="text-gray-500">{d.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profiles' && (
          <ProfileManagement allDoctors={allDoctors} allUsers={allUsers} />
        )}

        {activeTab === 'database' && (
          <DatabaseManagement />
        )}

        {activeTab === 'system' && (
          <SystemInfo />
        )}
      </div>
    </div>
  );
};