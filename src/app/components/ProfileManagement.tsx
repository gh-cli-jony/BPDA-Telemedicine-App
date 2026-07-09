import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

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

interface Prescription {
  id: string;
  userId: string;
  patientName: string;
  age: string;
  gender: string;
  date: string;
  hoCode: string;
  drName: string;
  cc: string;
  rx: string;
  oe: string;
  advice: string;
  completed: boolean;
  created_at: number;
}

interface ProfileManagementProps {
  allDoctors: User[];
  allUsers: User[];
}

export const ProfileManagement: React.FC<ProfileManagementProps> = ({ allDoctors, allUsers }) => {
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
  const [polliChikitsokList, setPolliChikitsokList] = useState<User[]>([]);
  const [selectedPolli, setSelectedPolli] = useState<User | null>(null);
  const [archivedDates, setArchivedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [datePrescriptions, setDatePrescriptions] = useState<Prescription[]>([]);
  const [currentPrescriptions, setCurrentPrescriptions] = useState<Prescription[]>([]);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [showCurrentDate, setShowCurrentDate] = useState(true);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [viewMode, setViewMode] = useState<'menu' | 'all-prescriptions' | 'profiles'>('menu');

  // Load Polli Chikitsok for selected doctor
  useEffect(() => {
    if (selectedDoctor) {
      loadPolliChikitsok(selectedDoctor.id);
    }
  }, [selectedDoctor]);

  // Load archived dates and current prescriptions for selected polli
  useEffect(() => {
    if (selectedPolli) {
      loadArchivedDates(selectedPolli.id);
      loadCurrentPrescriptions(selectedPolli.id);
    }
  }, [selectedPolli]);

  // Load prescriptions for selected date
  useEffect(() => {
    if (selectedPolli && selectedDate) {
      loadDatePrescriptions(selectedPolli.id, selectedDate);
    }
  }, [selectedPolli, selectedDate]);

  // Load all prescriptions
  useEffect(() => {
    if (viewMode === 'all-prescriptions') {
      loadAllPrescriptions();
    }
  }, [viewMode]);

  const loadPolliChikitsok = async (doctorId: string) => {
    try {
      const response = await apiFetch(`/doctor/${doctorId}/polli-chikitsok`, {
        headers: {
        }
      });
      const data = await response.json();
      setPolliChikitsokList(data.polli_chikitsok || []);
    } catch (error) {
      console.error('Load polli chikitsok error:', error);
    }
  };

  const loadArchivedDates = async (userId: string) => {
    try {
      const response = await apiFetch(`/prescriptions/archive/${userId}/dates`, {
        headers: {
        }
      });
      
      if (!response.ok) {
        console.log('Response not OK:', response.status);
        setArchivedDates([]);
        return;
      }
      
      const data = await response.json();
      setArchivedDates(data.dates || []);
    } catch (error) {
      console.error('Load archived dates error:', error);
      setArchivedDates([]);
    }
  };

  const loadCurrentPrescriptions = async (userId: string) => {
    try {
      const response = await apiFetch('/prescriptions/current', {
        headers: {
        }
      });
      
      if (!response.ok) {
        console.log('Response not OK:', response.status);
        setCurrentPrescriptions([]);
        return;
      }
      
      const data = await response.json();
      const userPrescriptions = (data.prescriptions || []).filter((p: Prescription) => p.userId === userId);
      setCurrentPrescriptions(userPrescriptions);
    } catch (error) {
      console.error('Load current prescriptions error:', error);
      setCurrentPrescriptions([]);
    }
  };

  const loadDatePrescriptions = async (userId: string, date: string) => {
    try {
      const response = await apiFetch(`/prescriptions/archive/${userId}/${date}`, {
        headers: {
        }
      });
      
      if (!response.ok) {
        console.log('Response not OK:', response.status);
        setDatePrescriptions([]);
        return;
      }
      
      const data = await response.json();
      setDatePrescriptions(data.prescriptions || []);
    } catch (error) {
      console.error('Load date prescriptions error:', error);
      setDatePrescriptions([]);
    }
  };

  const loadAllPrescriptions = async () => {
    try {
      const response = await apiFetch('/prescriptions', {
        headers: {
        }
      });
      const data = await response.json();
      setAllPrescriptions(data.prescriptions || []);
    } catch (error) {
      console.error('Load all prescriptions error:', error);
    }
  };

  const updatePrescription = async (prescription: Prescription) => {
    try {
      const response = await apiFetch(`/prescription/${prescription.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prescription)
      });

      if (response.ok) {
        alert('প্রেসক্রিপশন সফলভাবে আপডেট হয়েছে!');
        setEditingPrescription(null);
        if (selectedPolli) {
          loadCurrentPrescriptions(selectedPolli.id);
        }
      } else {
        alert('প্রেসক্রিপশন আপডেট ব্যর্থ!');
      }
    } catch (error) {
      console.error('Update prescription error:', error);
      alert('সার্ভার এরর!');
    }
  };

  const renderPrescriptionCard = (p: Prescription, isEditable: boolean = false) => (
    <div key={p.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <h3 className="text-gray-800 mb-2">{p.patientName || 'নামহীন রোগী'}</h3>
      <div className="text-gray-600 space-y-1">
        <p><span className="text-gray-400">বয়স:</span> {p.age || 'N/A'}</p>
        <p><span className="text-gray-400">লিঙ্গ:</span> {p.gender || 'N/A'}</p>
        <p><span className="text-gray-400">তারিখ:</span> {p.date}</p>
        <p><span className="text-gray-400">Ho Code:</span> {p.hoCode || 'N/A'}</p>
        <p><span className="text-gray-400">লিখেছেন:</span> {p.drName || 'অজানা'}</p>
      </div>
      <div className="mt-3 pt-3 border-t">
        <p className="text-gray-400">C/C:</p>
        <p className="text-gray-700">{p.cc || 'নেই'}</p>
      </div>
      {p.rx && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-gray-400">Rx:</p>
          <p className="text-gray-700 whitespace-pre-wrap">{p.rx}</p>
        </div>
      )}
      {p.oe && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-gray-400">O/E:</p>
          <p className="text-gray-700">{p.oe}</p>
        </div>
      )}
      {p.advice && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-gray-400">Advice:</p>
          <p className="text-gray-700">{p.advice}</p>
        </div>
      )}
      {isEditable && (
        <button
          onClick={() => setEditingPrescription(p)}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        >
          এডিট করুন
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main Menu */}
      {viewMode === 'menu' && !selectedDoctor && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-gray-800 mb-6">প্রোফাইল ও প্রেসক্রিপশন ম্যানেজমেন্ট</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setViewMode('all-prescriptions')}
              className="border-2 border-blue-300 rounded-xl p-8 hover:bg-blue-50 hover:border-blue-500 transition-colors text-left"
            >
              <div className="text-blue-600 text-3xl mb-3">📋</div>
              <h3 className="text-gray-800 text-xl mb-2">সকল প্রেসক্রিপশন</h3>
              <p className="text-gray-500">সব পল্লি চিকিৎসকদের সকল প্রেসক্রিপশন দেখুন</p>
            </button>
            
            <button
              onClick={() => setViewMode('profiles')}
              className="border-2 border-green-300 rounded-xl p-8 hover:bg-green-50 hover:border-green-500 transition-colors text-left"
            >
              <div className="text-green-600 text-3xl mb-3">👨‍⚕️</div>
              <h3 className="text-gray-800 text-xl mb-2">ডাক্তার প্রোফাইল</h3>
              <p className="text-gray-500">ডাক্তার অনুযায়ী পল্লি চিকিৎসক ও প্রেসক্রিপশন দেখুন</p>
            </button>
          </div>
        </div>
      )}

      {/* All Prescriptions View */}
      {viewMode === 'all-prescriptions' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-800">সকল প্রেসক্রিপশন ({allPrescriptions.length})</h2>
            <button
              onClick={() => setViewMode('menu')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← মূল মেনু
            </button>
          </div>
          {allPrescriptions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">কোনো প্রেসক্রিপশন নেই</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allPrescriptions.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).map(p => renderPrescriptionCard(p, false))}
            </div>
          )}
        </div>
      )}

      {/* Doctor Profile View */}
      {viewMode === 'profiles' && !selectedDoctor && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-800">ডাক্তার নির্বাচন করুন</h2>
            <button
              onClick={() => setViewMode('menu')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← মূল মেনু
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allDoctors.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDoctor(d)}
                className="border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              >
                <p className="text-gray-800">{d.name}</p>
                <p className="text-gray-500">{d.email}</p>
                <p className="text-gray-500">{d.phone}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Polli Chikitsok List */}
      {selectedDoctor && !selectedPolli && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-800">ডাঃ {selectedDoctor.name} এর পল্লি চিকিৎসকগণ</h2>
            <button
              onClick={() => setSelectedDoctor(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ← ফিরে যান
            </button>
          </div>
          {polliChikitsokList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">কোনো পল্লি চিকিৎসক নেই</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {polliChikitsokList.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPolli(p)}
                  className="border rounded-lg p-4 hover:bg-green-50 hover:border-green-300 transition-colors text-left"
                >
                  <p className="text-gray-800">{p.name}</p>
                  <p className="text-gray-500">{p.email}</p>
                  <p className="text-gray-500">{p.phone}</p>
                  <p className="text-gray-600 mt-2">
                    <span className="text-gray-400">কপি সংখ্যা:</span> {p.prescription_copies || 1}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prescription Dates */}
      {selectedPolli && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-800">{selectedPolli.name} এর প্রেসক্রিপশন</h2>
            <button
              onClick={() => {
                setSelectedPolli(null);
                setSelectedDate('');
                setShowCurrentDate(true);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              ← ফিরে যান
            </button>
          </div>

          {/* Toggle between current and archived */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setShowCurrentDate(true);
                setSelectedDate('');
              }}
              className={`px-4 py-2 rounded ${showCurrentDate ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              আজকের প্রেসক্রিপশন ({currentPrescriptions.length})
            </button>
            <button
              onClick={() => setShowCurrentDate(false)}
              className={`px-4 py-2 rounded ${!showCurrentDate ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              পূর্বের প্রেসক্রিপশন
            </button>
          </div>

          {/* Current Date Prescriptions */}
          {showCurrentDate && (
            <div>
              <h3 className="text-gray-700 mb-3">আজকের তারিখের প্রেসক্রিপশন (এডিট করা যাবে)</h3>
              {currentPrescriptions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">কোনো প্রেসক্রিপশন নেই</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentPrescriptions.map(p => renderPrescriptionCard(p, true))}
                </div>
              )}
            </div>
          )}

          {/* Archived Dates */}
          {!showCurrentDate && (
            <div>
              <h3 className="text-gray-700 mb-3">তারিখ নির্বাচন করুন</h3>
              {archivedDates.length === 0 ? (
                <p className="text-gray-400 text-center py-8">কোনো সংরক্ষিত প্রেসক্রিপশন নেই</p>
              ) : (
                <div className="mb-4">
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">তারিখ নির্বাচন করুন</option>
                    {archivedDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Prescriptions */}
              {selectedDate && (
                <div>
                  <h3 className="text-gray-700 mb-3">{selectedDate} তারিখের প্রেসক্রিপশন</h3>
                  {datePrescriptions.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">কোনো প্রেসক্রিপশন নেই</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {datePrescriptions.map(p => renderPrescriptionCard(p, false))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-gray-800 mb-4">প্রেসক্রিপশন এডিট করুন</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1">রোগীর নাম</label>
                <input
                  type="text"
                  value={editingPrescription.patientName}
                  onChange={(e) => setEditingPrescription({...editingPrescription, patientName: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">বয়স</label>
                  <input
                    type="text"
                    value={editingPrescription.age}
                    onChange={(e) => setEditingPrescription({...editingPrescription, age: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">লিঙ্গ</label>
                  <select
                    value={editingPrescription.gender}
                    onChange={(e) => setEditingPrescription({...editingPrescription, gender: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="পুরুষ">পুরুষ</option>
                    <option value="মহিলা">মহিলা</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">C/C (Chief Complaints)</label>
                <textarea
                  value={editingPrescription.cc}
                  onChange={(e) => setEditingPrescription({...editingPrescription, cc: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1">O/E (On Examination)</label>
                <textarea
                  value={editingPrescription.oe}
                  onChange={(e) => setEditingPrescription({...editingPrescription, oe: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Rx (Prescription)</label>
                <textarea
                  value={editingPrescription.rx}
                  onChange={(e) => setEditingPrescription({...editingPrescription, rx: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={5}
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Advice</label>
                <textarea
                  value={editingPrescription.advice}
                  onChange={(e) => setEditingPrescription({...editingPrescription, advice: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => updatePrescription(editingPrescription)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  সেভ করুন
                </button>
                <button
                  onClick={() => setEditingPrescription(null)}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};