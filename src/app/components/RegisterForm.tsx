import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import logoImage from 'figma:asset/8c72cce425da67796bf83257bfbe8a39e8ba4e73.png';

interface RegisterFormProps {
  onBackToLogin: () => void;
  onRegisterSuccess: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onBackToLogin, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'polli-chikitsok'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setMessage('❌ পাসওয়ার্ড মিলছে না!');
      return;
    }

    if (formData.password.length < 6) {
      setMessage('❌ পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const requestBody = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role
      };

      console.log('📤 Sending registration request:', requestBody);

      const response = await apiFetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok && data.success) {
        setMessage('✅ রেজিস্ট্রেশন সফল হয়েছে! অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করুন।');
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          role: 'polli-chikitsok'
        });
        setTimeout(() => {
          onRegisterSuccess();
        }, 3000);
      } else {
        const errorMsg = data.error || data.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে!';
        console.error('❌ Registration failed:', errorMsg);
        setMessage('❌ ' + errorMsg);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setMessage(`❌ সার্ভার এ সমস্যা হয়েছে! Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-600 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src={logoImage} alt="BPDA Logo" className="h-20 object-contain" />
        </div>
        <h1 className="text-blue-700 mb-2 tracking-tight text-center">নতুন অ্যাকাউন্ট তৈরি করুন</h1>
        <p className="text-gray-500 mb-6 text-center">BPDA Telemedicine</p>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-center">✨ Console logs দেখার জন্য F12 চাপুন</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 uppercase">নাম</label>
            <input
              type="text"
              required
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mt-1"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-400 uppercase">ইমেইল</label>
            <input
              type="email"
              required
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mt-1"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-400 uppercase">ফোন নাম্বার</label>
            <input
              type="tel"
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mt-1"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01XXXXXXXXX"
            />
          </div>

          <div>
            <label className="text-gray-400 uppercase">পদবী</label>
            <select
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mt-1"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="polli-chikitsok">পল্লি চিকিৎসক</option>
              <option value="doctor">ডাক্তার</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 uppercase">পাসওয়ার্ড</label>
            <input
              type="password"
              required
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mt-1"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-400 uppercase">পাসওয়ার্ড নিশ্চিত করুন</label>
            <input
              type="password"
              required
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 mt-1"
              value={formData.confirmPassword}
              onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-center ${message.includes('সফল') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition shadow-lg disabled:bg-gray-400"
          >
            {loading ? 'অপেক্ষা করুন...' : 'রেজিস্টার করুন'}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition"
          >
            লগইন পেজে ফিরে যান
          </button>
        </form>
      </div>
    </div>
  );
};