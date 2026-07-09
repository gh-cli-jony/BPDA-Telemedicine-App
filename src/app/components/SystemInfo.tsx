import React from 'react';

export const SystemInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Data Storage Information */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-gray-800 mb-4">📊 ডাটা স্টোরেজ তথ্য</h2>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-800 mb-2">বর্তমান স্টোরেজ সিস্টেম:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Supabase KV Store:</strong> রিয়েল-টাইম ডাটা স্টোরেজ</li>
              <li><strong>ক্যাপাসিটি:</strong> Unlimited (Supabase free tier: 500MB)</li>
              <li><strong>ব্যবহার:</strong> Users, Prescriptions, Medicines, Video Call Requests</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 mb-2">💾 Google Drive Backup Setup:</h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> bpdatelemedicine@gmail.com</p>
              <p><strong>Storage:</strong> 15 GB Free (Google Drive)</p>
              <p className="mt-2">আপনার সিস্টেমে এখন <strong>ডাটাবেস ম্যানেজমেন্ট</strong> tab আছে যেখানে থেকে:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>সম্পূর্ণ database export করতে পারবেন (JSON format)</li>
                <li>Download করা file manually Google Drive এ upload করুন</li>
                <li>প্রতি সপ্তাহে automatic backup নিশ্চিত করুন</li>
                <li>Admin সব data delete করতে পারবে (সতর্কতার সাথে!)</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 mb-2">ডাটা ব্যাকআপ সুপারিশ:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Google Drive:</strong> নিয়মিত CSV/JSON export করে Google Drive এ save করুন</li>
              <li><strong>Dropbox:</strong> Automatic backup এর জন্য Dropbox API integrate করা যেতে পারে</li>
              <li><strong>Local Backup:</strong> মাসিক/সাপ্তাহিক ডাটাবেস ডাউনলোড করুন</li>
              <li><strong>External Hard Drive:</strong> Critical data এর জন্য physical backup রাখুন</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 mb-2">⚠️ গুরুত্বপূর্ণ সতর্কতা:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>প্রতি সপ্তাহে অন্তত একবার সম্পূর্ণ ডাটাবেস ডাউনলোড করুন</li>
              <li>২-৩ টি আলাদা জায়গায় backup রাখুন (Cloud + Local)</li>
              <li>রাত ১২টার পর completed prescriptions archive হবে - এটি নিশ্চিত করুন</li>
              <li>Patient data highly sensitive - security maintain করুন</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Play Store Publishing Requirements */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-gray-800 mb-4">📱 Play Store এ Publish করার জন্য প্রয়োজনীয় বিষয়:</h2>
        
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-purple-800 mb-2">১. প্রযুক্তিগত প্রস্তুতি:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>React Native/Capacitor:</strong> এই web app কে mobile app এ convert করতে হবে</li>
              <li><strong>APK/AAB Build:</strong> Android App Bundle তৈরি করতে হবে</li>
              <li><strong>App Signing:</strong> Google Play App Signing সেটআপ করতে হবে</li>
              <li><strong>Min SDK Version:</strong> Android 5.0 (API level 21) বা তার উপরে</li>
              <li><strong>Target SDK:</strong> Latest Android version (currently API 34)</li>
            </ul>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="text-indigo-800 mb-2">২. Google Play Console Account:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>One-time Fee:</strong> $25 USD (প্রায় ৩০০০ টাকা)</li>
              <li><strong>Developer Account:</strong> Individual বা Organization</li>
              <li><strong>Payment Method:</strong> Credit/Debit Card প্রয়োজন</li>
              <li><strong>Verification:</strong> Email এবং phone number verify করতে হবে</li>
            </ul>
          </div>

          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
            <h3 className="text-pink-800 mb-2">৩. App Store Listing Assets:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>App Icon:</strong> 512x512 PNG (high resolution)</li>
              <li><strong>Feature Graphic:</strong> 1024x500 PNG</li>
              <li><strong>Screenshots:</strong> কমপক্ষে ২টি (phone এবং tablet এর জন্য)</li>
              <li><strong>App Description:</strong> বাংলা + ইংরেজি</li>
              <li><strong>Privacy Policy:</strong> Web link এ host করতে হবে</li>
              <li><strong>Category:</strong> Medical (Medical এর জন্য extra verification লাগতে পারে)</li>
            </ul>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 mb-2">৪. Medical App এর জন্য বিশেষ Requirements:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Medical Disclaimer:</strong> App এ disclaimer যোগ করতে হবে</li>
              <li><strong>Doctor Verification:</strong> যেসব ডাক্তার আছেন তাদের license verify করতে হবে</li>
              <li><strong>Data Privacy:</strong> Patient data encryption এবং security</li>
              <li><strong>Terms of Service:</strong> Legal terms and conditions</li>
              <li><strong>BMDC Approval:</strong> Bangladesh Medical & Dental Council থেকে approval লাগতে পারে</li>
            </ul>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <h3 className="text-teal-800 mb-2">৫. Testing Requirements:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Closed Testing:</strong> Internal testing with limited users</li>
              <li><strong>Open Testing:</strong> Public beta testing (optional কিন্তু recommended)</li>
              <li><strong>App Review:</strong> Google review করবে (1-3 দিন সময় নিতে পারে)</li>
              <li><strong>Bug Fixes:</strong> Review feedback অনুযায়ী bugs fix করতে হবে</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-gray-800 mb-2">৬. আনুমানিক খরচ:</h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>Google Play Developer Account:</strong> $25 USD (one-time)</p>
              <p><strong>App Development (React Native conversion):</strong> ৳10,000 - ৳30,000</p>
              <p><strong>Graphics/Design Assets:</strong> ৳3,000 - ৳10,000</p>
              <p><strong>Legal Documents (Privacy Policy, Terms):</strong> ৳5,000 - ৳15,000</p>
              <p><strong>Testing & QA:</strong> ৳5,000 - ৳10,000</p>
              <p className="border-t border-gray-300 pt-2 mt-2">
                <strong>মোট আনুমানিক:</strong> ৳25,000 - ৳70,000 (প্রথমবার)
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 mb-2">৭. Alternative Options:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>PWA (Progressive Web App):</strong> App Store ছাড়াই mobile এ install করা যায়</li>
              <li><strong>Direct APK Distribution:</strong> নিজের website থেকে APK download</li>
              <li><strong>Firebase App Distribution:</strong> Testing এর জন্য free</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
        <h2 className="text-white mb-4">💡 আমাদের সুপারিশ:</h2>
        <div className="space-y-2">
          <p>১. <strong>প্রথমে PWA হিসেবে deploy করুন</strong> - কোনো খরচ নেই, সরাসরি mobile এ install করা যায়</p>
          <p>২. <strong>Supabase storage free tier ব্যবহার করুন</strong> এবং weekly backup নিন</p>
          <p>৩. <strong>User feedback নিয়ে app improve করুন</strong></p>
          <p>৪. <strong>যখন ১০০+ active users হবে, তখন Play Store এ publish করুন</strong></p>
          <p>৫. <strong>BMDC এবং legal requirements পূরণ করুন</strong> medical app হওয়ায়</p>
        </div>
      </div>
    </div>
  );
};
