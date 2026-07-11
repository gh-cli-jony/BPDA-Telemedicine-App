import React, { useState, useEffect } from 'react';
import { apiFetch, clearAuthToken, setAuthToken } from './lib/api';
import logoImage from 'figma:asset/8c72cce425da67796bf83257bfbe8a39e8ba4e73.png';
import { RegisterForm } from './components/RegisterForm';
import { AdminDashboard } from './components/AdminDashboard';

interface Prescription {
  id: string;
  patientName: string;
  gender: string;
  age: string;
  drName: string;
  hoCode: string;
  date: string;
  cc: string;
  oe: string;
  advice: string;
  rx: string;
  nextVisit: string;
  status: string;
  createdAt: number;
  createdBy: string;
  completed?: boolean;
  completedAt?: number;
  userId: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  approved: boolean;
  doctor_id?: string | null;
  can_write: boolean;
}

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [activePrescription, setActivePrescription] = useState<Prescription | null>(null);
  const [view, setView] = useState('dashboard');
  const [medicines, setMedicines] = useState<string[]>([]);
  const [showVideoCallRequest, setShowVideoCallRequest] = useState(false);

  useEffect(() => {
    if (isLoggedIn && currentUser?.role !== 'admin') {
      loadPrescriptions();
      loadMedicines();
    }
  }, [isLoggedIn, currentUser]);

  const loadPrescriptions = async () => {
    try {
      const response = await apiFetch('/prescriptions', {
        headers: {
        }
      });
      const data = await response.json();
      
      let userPrescriptions = data.prescriptions || [];
      
      // Filter based on role
      if (currentUser?.role === 'polli-chikitsok') {
        userPrescriptions = userPrescriptions.filter((p: Prescription) => p.createdBy === currentUser.id);
      } else if (currentUser?.role === 'doctor') {
        // Show prescriptions from assigned polli chikitsok
        const response = await apiFetch(`/doctor/${currentUser.id}/polli-chikitsok`);
        const polliData = await response.json();
        const polliIds = polliData.polli_chikitsok.map((p: User) => p.id);
        userPrescriptions = userPrescriptions.filter((p: Prescription) => 
          polliIds.includes(p.createdBy) || p.createdBy === currentUser.id
        );
      }
      
      setPrescriptions(userPrescriptions.sort((a: Prescription, b: Prescription) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Load prescriptions error:', error);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password } = loginData;

    console.log('Login attempt:', email);

    // Check credentials with dedicated backend server
    try {
      const response = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok && data.user) {
        if (!data.user.approved && data.user.role !== 'admin') {
          alert('আপনার অ্যাকাউন্ট এখনো অনুমোদিত হয়নি। অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।');
          return;
        }
        console.log('Login successful for user:', data.user.name);
        if (data.token) setAuthToken(data.token);
        setCurrentUser(data.user);
        setIsLoggedIn(true);
      } else {
        alert('ভুল ইমেইল অথবা পাসওয়ার্ড!');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('লগইন করতে সমস্যা হয়েছে!');
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setView('dashboard');
    setPrescriptions([]);
    setActivePrescription(null);
  };

  const createNewPrescription = async () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const newPrescription: Prescription = {
      id: `presc_${Date.now()}`,
      patientName: "",
      gender: "",
      age: "",
      drName: currentUser?.name || "",
      hoCode: "",
      date: formattedDate,
      cc: "",
      oe: "",
      advice: "",
      rx: "",
      nextVisit: "",
      status: 'pending',
      createdAt: Date.now(),
      createdBy: currentUser?.id || '',
      userId: currentUser?.id || ''
    };

    try {
      const response = await apiFetch('/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrescription)
      });

      if (response.ok) {
        await loadPrescriptions();
        setActivePrescription(newPrescription);
        setView('editor');
      }
    } catch (error) {
      console.error('Create prescription error:', error);
    }
  };

  const updateField = async (id: string, field: string, value: string) => {
    try {
      const response = await apiFetch(`/prescription/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        await loadPrescriptions();
        if (activePrescription?.id === id) {
          setActivePrescription({ ...activePrescription, [field]: value });
        }
      }
    } catch (error) {
      console.error('Update field error:', error);
    }
  };

  const requestVideoCall = async () => {
    if (!currentUser?.doctor_id) {
      alert('আপনার কোনো ডাক্তার নির্ধারিত নেই!');
      return;
    }

    try {
      const response = await apiFetch('/video-call-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: currentUser.doctor_id,
          prescriptionId: activePrescription?.id
        })
      });

      if (response.ok) {
        alert('ভিডিও কলের অনুরোধ পাঠানো হয়েছে!');
        setShowVideoCallRequest(false);
      }
    } catch (error) {
      console.error('Video call request error:', error);
    }
  };

  const completePrescription = async () => {
    if (!activePrescription) return;

    if (!activePrescription.patientName || !activePrescription.rx) {
      alert('রোগীর নাম এবং ঔষধ লেখা আবশ্যক!');
      return;
    }

    try {
      const response = await apiFetch(`/prescription/${activePrescription.id}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        alert('প্রেসক্রিপশন সম্পূর্ণ হয়েছে! রাত ১২টার পর এটি ডাটাবেসে সংরক্ষিত হবে।');
        await loadPrescriptions();
        setView('dashboard');
      }
    } catch (error) {
      console.error('Complete prescription error:', error);
    }
  };

  // Show registration form
  if (showRegister) {
    return (
      <RegisterForm
        onBackToLogin={() => setShowRegister(false)}
        onRegisterSuccess={() => setShowRegister(false)}
      />
    );
  }

  // Show login form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-600 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <img src={logoImage} alt="BPDA Logo" className="h-24 object-contain" />
          </div>
          <h1 className="text-blue-700 mb-2 tracking-tight">BPDA Telemedicine</h1>
          <p className="text-gray-500 mb-6">অ্যাকাউন্টে লগইন করুন</p>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="text-gray-400 uppercase">ইমেইল</label>
              <input
                type="email"
                required
                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mt-1"
                onChange={e => setLoginData({ ...loginData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-gray-400 uppercase">পাসওয়ার্ড</label>
              <input
                type="password"
                required
                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mt-1"
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition shadow-lg mt-4">
              প্রবেশ করুন
            </button>
          </form>
          
          <div className="mt-6">
            <button
              onClick={() => setShowRegister(true)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              নতুন অ্যাকাউন্ট তৈরি করুন
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-2">Test Credentials:</p>
            <p className="text-gray-700"><strong>Admin:</strong> admin@bpda.com / admin123</p>
          </div>
        </div>
      </div>
    );
  }

  // Show Admin Dashboard
  if (currentUser?.role === 'admin') {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
  }

  const Dashboard = () => (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm gap-4 border border-blue-100">
          <div className="flex items-center gap-4">
            <img src={logoImage} alt="Logo" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-blue-800 tracking-tight">BPDA Telemedicine</h1>
              <p className="text-gray-500 mt-2">স্বাগতম, {currentUser?.name}</p>
              <p className="text-gray-400">
                {currentUser?.role === 'doctor' ? 'ডাক্তার' : 'পল্লি চিকিৎসক'}
                {!currentUser?.can_write && <span className="text-red-600 ml-2">(লেখার অনুমতি বন্ধ)</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {currentUser?.can_write && (
              <button
                onClick={createNewPrescription}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-100"
              >
                + নতুন রোগী
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-white border border-red-100 text-red-600 px-6 py-2.5 rounded-xl hover:bg-red-50"
            >
              লগ আউট
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prescriptions.map(p => (
            <div
              key={p.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 transition-all cursor-pointer group"
              onClick={() => {
                setActivePrescription(p);
                setView('editor');
              }}
            >
              <h3 className="text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                {p.patientName || 'নামহীন রোগী'}
              </h3>
              <p className="text-gray-400 mb-2">তারিখ: {p.date}</p>
              <p className="text-gray-500">লিখেছেন: {p.drName || 'অজানা'}</p>
              <span className="text-blue-600 mt-2 inline-block">বিস্তারিত তথ্য দেখুন →</span>
            </div>
          ))}
          {prescriptions.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 italic">
              কোনো ডাটা পাওয়া যায়নি
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const PrescriptionEditor = () => {
    if (!activePrescription) return null;
    
    const canEditPatientInfo = currentUser?.can_write && 
      (currentUser?.role === 'doctor' || activePrescription.createdBy === currentUser?.id);
    const canEditRx = currentUser?.can_write && 
      (currentUser?.role === 'doctor' || activePrescription.createdBy === currentUser?.id);

    return (
      <div className="bg-gray-200 min-h-screen p-2 md:p-8">
        <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
          <button
            onClick={() => setView('dashboard')}
            className="bg-white px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
          >
            <span>←</span> ড্যাশবোর্ড
          </button>
          <div className="flex gap-2">
            {canEditRx && !activePrescription.completed && (
              <button
                onClick={completePrescription}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                ✓ সম্পূর্ণ করুন
              </button>
            )}
            {currentUser?.role === 'polli-chikitsok' && currentUser.doctor_id && (
              <button
                onClick={() => setShowVideoCallRequest(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                📞 ডাক্তারকে কল করুন
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700"
            >
              প্রিন্ট করুন
            </button>
          </div>
        </div>

        {/* Video Call Request Modal */}
        {showVideoCallRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
            <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4">
              <h3 className="text-gray-800 mb-4">ভিডিও কলের জন্য অনুরোধ পাঠান?</h3>
              <p className="text-gray-600 mb-6">আপনার নির্ধারিত ডাক্তারকে ভিডিও কলের জন্য অনুরোধ পাঠানো হবে।</p>
              <div className="flex gap-3">
                <button
                  onClick={requestVideoCall}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  অনুরোধ পাঠান
                </button>
                <button
                  onClick={() => setShowVideoCallRequest(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="prescription-page max-w-[210mm] mx-auto bg-white relative min-h-[297mm] p-[10mm] shadow-2xl print:shadow-none print:p-0 print:m-0 overflow-hidden">
          {/* WATERMARK */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
            <img src={logoImage} alt="Watermark" className="w-[500px] rotate-[-30deg]" />
          </div>

          {/* HEADER */}
          <header className="border-b-2 border-red-600 pb-2 mb-4 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <img src={logoImage} alt="BPDA Logo" className="h-20 w-20 object-contain" />
              <div className="text-center flex-1 mx-2">
                <h1 className="text-red-600 uppercase tracking-tight">BPDA Telemedicine Center</h1>
                <p className="text-gray-700 leading-tight">(It is a member institution of BPDA Health Education Training and Technology)</p>
                <p className="text-gray-600 mt-1">Tele Phone: 02-588809221, Phone: 01713290422, Website: www.bpda.com.bd</p>
              </div>
              <div className="w-20"></div>
            </div>

            <div className="text-gray-800 leading-relaxed border-t border-gray-200 pt-2 grid grid-cols-2 gap-4">
              <div className="text-left">
                <p><span className="text-blue-700">Physician Name:</span> Dr. Manna Chakravarty MBBS(GU), BMDC Reg.A-81025</p>
                <p>RMO SFGHL, Co-Ordinator Of GP Center (Bangladesh)</p>
              </div>
              <div className="text-right">
                <p className="text-red-600">BPDA Md. Sarowar Alam DMF(Dhaka)PDT(Medicine)</p>
                <p>Sub-Assistant Community Medical Officer(SACMO)</p>
              </div>
            </div>

            <div className="text-gray-600 mt-2 flex justify-between border-t border-gray-100 pt-1">
              <p><span>Place:</span> Polly Mongol Shabaloy, Tepa Madhupur, Kaunia (CBHIP)</p>
              <p><span>Contact:</span> 01762811105</p>
            </div>
          </header>

          {/* PATIENT INFO TABLE */}
          <table className="w-full border-collapse border border-black mb-4 relative z-10">
            <tbody>
              <tr>
                <td className="border border-black p-2 w-16">Name:</td>
                <td className="border border-black p-2 bg-[#f0f9f9]">
                  <input
                    disabled={!canEditPatientInfo}
                    className="w-full bg-transparent outline-none text-gray-900"
                    defaultValue={activePrescription.patientName}
                    onBlur={e => updateField(activePrescription.id, 'patientName', e.target.value)}
                  />
                </td>
                <td className="border border-black p-2 w-16">Gender:</td>
                <td className="border border-black p-2 bg-[#f0f9f9] w-20">
                  <input
                    disabled={!canEditPatientInfo}
                    className="w-full bg-transparent outline-none text-center"
                    defaultValue={activePrescription.gender}
                    onBlur={e => updateField(activePrescription.id, 'gender', e.target.value)}
                  />
                </td>
                <td className="border border-black p-2 w-12">Age:</td>
                <td className="border border-black p-2 bg-[#f0f9f9] w-16">
                  <input
                    disabled={!canEditPatientInfo}
                    className="w-full bg-transparent outline-none text-center"
                    defaultValue={activePrescription.age}
                    onBlur={e => updateField(activePrescription.id, 'age', e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2">Ho Code:</td>
                <td className="border border-black p-2 bg-[#f0f9f9]">
                  <input
                    disabled={!canEditPatientInfo}
                    className="w-full bg-transparent outline-none text-blue-800"
                    defaultValue={activePrescription.hoCode}
                    onBlur={e => updateField(activePrescription.id, 'hoCode', e.target.value)}
                  />
                </td>
                <td className="border border-black p-2">Date:</td>
                <td colSpan={3} className="border border-black p-2 bg-[#f0f9f9]">
                  <input
                    type="date"
                    disabled={!canEditPatientInfo}
                    className="w-full bg-transparent outline-none"
                    value={activePrescription.date}
                    onChange={e => {
                      updateField(activePrescription.id, 'date', e.target.value);
                      setActivePrescription({...activePrescription, date: e.target.value});
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* MAIN CONTENT AREA */}
          <div className="flex border border-black min-h-[620px] mb-4 relative z-10 bg-white/40">
            <div className="w-[28%] border-r border-black p-3 bg-[#fbfbfb]/90 flex flex-col gap-5">
              <div>
                <p className="underline mb-2 uppercase text-gray-700">C/C</p>
                <textarea
                  disabled={!canEditPatientInfo}
                  className="w-full h-28 bg-transparent resize-none outline-none leading-relaxed"
                  defaultValue={activePrescription.cc}
                  onBlur={e => updateField(activePrescription.id, 'cc', e.target.value)}
                />
              </div>
              <div>
                <p className="underline mb-2 uppercase text-gray-700">O/E</p>
                <textarea
                  disabled={!canEditRx}
                  className="w-full h-28 bg-transparent resize-none outline-none leading-relaxed"
                  defaultValue={activePrescription.oe}
                  onBlur={e => updateField(activePrescription.id, 'oe', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <p className="underline mb-2 uppercase text-gray-700">Advice</p>
                <textarea
                  disabled={!canEditRx}
                  className="w-full h-40 bg-transparent resize-none outline-none leading-relaxed italic"
                  defaultValue={activePrescription.advice}
                  onBlur={e => updateField(activePrescription.id, 'advice', e.target.value)}
                />
              </div>
            </div>

            <div className="w-[72%] p-6 relative flex flex-col">
              <p className="font-serif italic text-gray-800 select-none" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>Rx</p>
              
              {canEditRx && medicines.length > 0 && (
                <div className="mb-4 print:hidden">
                  <select
                    className="w-full p-2 border rounded"
                    onChange={(e) => {
                      const currentRx = activePrescription.rx || '';
                      const newRx = currentRx ? `${currentRx}\n${e.target.value}` : e.target.value;
                      updateField(activePrescription.id, 'rx', newRx);
                      setActivePrescription({ ...activePrescription, rx: newRx });
                    }}
                  >
                    <option value="">ঔষধ নির্বাচন করুন...</option>
                    {medicines.map((med, i) => (
                      <option key={i} value={med}>{med}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <textarea
                disabled={!canEditRx}
                className="w-full flex-1 bg-transparent resize-none outline-none font-serif tracking-wide"
                style={{ fontSize: '18px', lineHeight: '2' }}
                placeholder={canEditRx ? "ঔষধের নাম ও সেবনবিধি লিখুন..." : ""}
                value={activePrescription.rx}
                onChange={e => {
                  setActivePrescription({ ...activePrescription, rx: e.target.value });
                }}
                onBlur={e => updateField(activePrescription.id, 'rx', e.target.value)}
              />
              <div className="mt-8 self-end text-center border-t border-black pt-1 min-w-[220px]">
                <p className="text-gray-500 uppercase">Authorized Signature</p>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <footer className="bg-[#fff7e6] p-4 text-center border border-orange-100 rounded-sm relative z-10 print:bg-transparent print:border-none">
            <p>
              <input
                disabled={!canEditRx}
                className="bg-transparent border-b border-black border-dotted text-center w-32 outline-none text-red-700"
                placeholder="……দিন/সপ্তাহ"
                defaultValue={activePrescription.nextVisit}
                onBlur={e => updateField(activePrescription.id, 'nextVisit', e.target.value)}
              />
              পর আসবেন। পরবর্তী সাক্ষাতের সময় ব্যবস্থাপত্র নিয়ে আসবেন।
            </p>
          </footer>
        </div>
      </div>
    );
  };

  return isLoggedIn ? (view === 'dashboard' ? <Dashboard /> : <PrescriptionEditor />) : null;
};

export default App;