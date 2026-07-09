import React, { useState } from 'react';
import { ApiFetchError, apiFetch } from '../lib/api';

const GOOGLE_DRIVE_EMAIL = 'bpdatelemedicine@gmail.com';

const crcTable = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (view: DataView, offset: number, value: number) => {
  view.setUint16(offset, value, true);
};

const writeUint32 = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value, true);
};

const createZipBlob = (fileName: string, content: string) => {
  const encoder = new TextEncoder();
  const fileNameBytes = encoder.encode(fileName);
  const fileBytes = encoder.encode(content);
  const checksum = crc32(fileBytes);
  const localHeaderSize = 30 + fileNameBytes.length;
  const centralHeaderSize = 46 + fileNameBytes.length;
  const endRecordSize = 22;
  const totalSize = localHeaderSize + fileBytes.length + centralHeaderSize + endRecordSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  writeUint32(view, offset, 0x04034b50); offset += 4;
  writeUint16(view, offset, 20); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint32(view, offset, checksum); offset += 4;
  writeUint32(view, offset, fileBytes.length); offset += 4;
  writeUint32(view, offset, fileBytes.length); offset += 4;
  writeUint16(view, offset, fileNameBytes.length); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  bytes.set(fileNameBytes, offset); offset += fileNameBytes.length;
  bytes.set(fileBytes, offset); offset += fileBytes.length;

  const centralDirectoryOffset = offset;
  writeUint32(view, offset, 0x02014b50); offset += 4;
  writeUint16(view, offset, 20); offset += 2;
  writeUint16(view, offset, 20); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint32(view, offset, checksum); offset += 4;
  writeUint32(view, offset, fileBytes.length); offset += 4;
  writeUint32(view, offset, fileBytes.length); offset += 4;
  writeUint16(view, offset, fileNameBytes.length); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint32(view, offset, 0); offset += 4;
  writeUint32(view, offset, 0); offset += 4;
  bytes.set(fileNameBytes, offset); offset += fileNameBytes.length;

  const centralDirectorySize = offset - centralDirectoryOffset;
  writeUint32(view, offset, 0x06054b50); offset += 4;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 0); offset += 2;
  writeUint16(view, offset, 1); offset += 2;
  writeUint16(view, offset, 1); offset += 2;
  writeUint32(view, offset, centralDirectorySize); offset += 4;
  writeUint32(view, offset, centralDirectoryOffset); offset += 4;
  writeUint16(view, offset, 0);

  return new Blob([buffer], { type: 'application/zip' });
};

export const DatabaseManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string>('');

  // Export all data and download as JSON
  const exportAndDownload = async () => {
    setLoading(true);
    setBackupStatus('ডাটা export হচ্ছে...');

    try {
      const response = await apiFetch(
        '/admin/export-all',
        {
          headers: {
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        // Create JSON file
        const jsonString = JSON.stringify(result.data, null, 2);
        const dateStamp = new Date().toISOString().split('T')[0];
        const jsonFileName = `bpda-telemedicine-backup-${dateStamp}.json`;
        const zipBlob = createZipBlob(jsonFileName, jsonString);
        const url = URL.createObjectURL(zipBlob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `bpda-telemedicine-backup-${dateStamp}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setBackupStatus(
          `✅ সফল! ${result.data.metadata.total_users} users, ${result.data.metadata.total_prescriptions} prescriptions export হয়েছে`
        );

        setTimeout(() => setBackupStatus(''), 5000);
      } else {
        setBackupStatus(`❌ Export ব্যর্থ হয়েছে: ${result.error || 'Unknown server error'}`);
      }
    } catch (error) {
      const message = error instanceof ApiFetchError
        ? error.message
        : 'Network error. Supabase Edge Function reachable কিনা যাচাই করুন।';

      setBackupStatus(`❌ Export ব্যর্থ হয়েছে: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete all users (except admins)
  const deleteAllUsers = async () => {
    if (!confirm('⚠️ সতর্কতা! সব user delete হয়ে যাবে (admin ছাড়া)। নিশ্চিত?')) return;
    if (!confirm('এটি ফিরিয়ে আনা যাবে না! আপনি কি সম্পূর্ণ নিশ্চিত?')) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        '/admin/delete-all-users',
        {
          method: 'DELETE',
          headers: {
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert(`✅ ${data.deleted} জন user delete করা হয়েছে!`);
        window.location.reload();
      } else {
        alert('❌ Delete ব্যর্থ হয়েছে!');
      }
    } catch (error) {
      console.error('Delete users error:', error);
      alert('❌ সার্ভার এরর!');
    } finally {
      setLoading(false);
    }
  };

  // Delete all prescriptions
  const deleteAllPrescriptions = async () => {
    if (!confirm('⚠️ সতর্কতা! সব active prescription delete হয়ে যাবে। নিশ্চিত?')) return;
    if (!confirm('এটি ফিরিয়ে আনা যাবে না! আপনি কি সম্পূর্ণ নিশ্চিত?')) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        '/admin/delete-all-prescriptions',
        {
          method: 'DELETE',
          headers: {
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert(`✅ ${data.deleted} টি prescription delete করা হয়েছে!`);
        window.location.reload();
      } else {
        alert('❌ Delete ব্যর্থ হয়েছে!');
      }
    } catch (error) {
      console.error('Delete prescriptions error:', error);
      alert('❌ সার্ভার এরর!');
    } finally {
      setLoading(false);
    }
  };

  // Delete all archived prescriptions
  const deleteAllArchived = async () => {
    if (!confirm('⚠️ সতর্কতা! সব archived prescription delete হয়ে যাবে। নিশ্চিত?')) return;
    if (!confirm('এটি ফিরিয়ে আনা যাবে না! আপনি কি সম্পূর্ণ নিশ্চিত?')) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        '/admin/delete-all-archived',
        {
          method: 'DELETE',
          headers: {
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert(`✅ ${data.deleted} টি archived prescription delete করা হয়েছে!`);
        window.location.reload();
      } else {
        alert('❌ Delete ব্যর্থ হয়েছে!');
      }
    } catch (error) {
      console.error('Delete archived error:', error);
      alert('❌ সার্ভার এরর!');
    } finally {
      setLoading(false);
    }
  };

  // Wipe entire database (NUCLEAR OPTION)
  const wipeDatabaseCompletely = async () => {
    if (!confirm('🚨 EXTREME WARNING! সম্পূর্ণ database মুছে যাবে! নিশ্চিত?')) return;
    if (!confirm('আপনি সব কিছু হারাবেন! আপনি কি BACKUP নিয়েছেন?')) return;
    if (!confirm('FINAL WARNING: এটি ফিরিয়ে আনা যাবে না! Continue?')) return;

    // Ask for confirmation text
    const confirmText = prompt(
      'নিশ্চিত করতে "DELETE ALL" লিখুন (বড় হাতের অক্ষরে):'
    );
    if (confirmText !== 'DELETE ALL') {
      alert('Cancel করা হয়েছে।');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(
        '/admin/wipe-database',
        {
          method: 'DELETE',
          headers: {
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert(
          `🗑️ Database সম্পূর্ণ মুছে ফেলা হয়েছে!\nUsers: ${data.deleted.users}\nPrescriptions: ${data.deleted.prescriptions}\nArchived: ${data.deleted.archived}`
        );
        window.location.reload();
      } else {
        alert('❌ Database wipe ব্যর্থ হয়েছে!');
      }
    } catch (error) {
      console.error('Wipe database error:', error);
      alert('❌ সার্ভার এরর!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-gray-800 mb-4">💾 Database Backup (Google Drive)</h2>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-blue-800 mb-2">📧 Backup Email:</h3>
          <p className="text-blue-700 font-mono">{GOOGLE_DRIVE_EMAIL}</p>
          <p className="text-gray-600 text-sm mt-2">
            সব backup এই email এর Google Drive এ সংরক্ষিত থাকবে।
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={exportAndDownload}
            disabled={loading}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {loading ? '⏳ Export হচ্ছে...' : '📦 সম্পূর্ণ Database Export করুন (ZIP)'}
          </button>

          {backupStatus && (
            <div
              className={`p-3 rounded-lg ${
                backupStatus.startsWith('✅')
                  ? 'bg-green-50 text-green-700'
                  : backupStatus.startsWith('⏳')
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {backupStatus}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-yellow-800 font-medium mb-2">📋 Manual Google Drive Upload:</h4>
            <ol className="text-yellow-700 text-sm space-y-1 list-decimal list-inside">
              <li>উপরের button এ click করে ZIP backup file download করুন</li>
              <li>
                Google Drive এ যান:{' '}
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  drive.google.com
                </a>
              </li>
              <li>{GOOGLE_DRIVE_EMAIL} email দিয়ে login করুন</li>
              <li>Download করা ZIP file upload করুন</li>
              <li>একটি "BPDA Backups" folder তৈরি করুন এবং সব backup সেখানে রাখুন</li>
            </ol>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-purple-800 font-medium mb-2">🔄 Automatic Backup (Future):</h4>
            <p className="text-purple-700 text-sm">
              ভবিষ্যতে Google Drive API integration করে automatic daily backup setup করা যাবে।
              এর জন্য Google Cloud Console এ OAuth2 credentials তৈরি করতে হবে।
            </p>
          </div>
        </div>
      </div>

      {/* Delete Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-red-200">
        <h2 className="text-red-600 mb-4">🗑️ Delete Operations (সতর্কতার সাথে!)</h2>

        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
          <h3 className="text-red-800 font-medium mb-2">⚠️ সতর্কতা!</h3>
          <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
            <li>Delete করার আগে অবশ্যই backup নিন!</li>
            <li>Delete করা data ফিরিয়ে আনা যাবে না!</li>
            <li>শুধুমাত্র admin এই operations করতে পারবে</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={deleteAllUsers}
            disabled={loading}
            className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
          >
            🧑 সব Users Delete করুন (admin ছাড়া)
          </button>

          <button
            onClick={deleteAllPrescriptions}
            disabled={loading}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            📄 সব Active Prescriptions Delete করুন
          </button>

          <button
            onClick={deleteAllArchived}
            disabled={loading}
            className="w-full bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 disabled:bg-gray-400"
          >
            📦 সব Archived Prescriptions Delete করুন
          </button>

          <div className="border-t-4 border-red-400 pt-4 mt-4">
            <button
              onClick={wipeDatabaseCompletely}
              disabled={loading}
              className="w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 disabled:bg-gray-400 font-bold"
            >
              🚨 সম্পূর্ণ Database মুছে ফেলুন (NUCLEAR OPTION)
            </button>
            <p className="text-red-600 text-sm text-center mt-2">
              এই button শুধুমাত্র emergency situation এ ব্যবহার করুন!
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
        <h2 className="text-white mb-4">💡 সুপারিশ:</h2>
        <div className="space-y-2 text-sm">
          <p>✅ প্রতি সপ্তাহে অন্তত একবার backup নিন</p>
          <p>✅ গুরুত্বপূর্ণ কাজের আগে backup নিন</p>
          <p>✅ Delete করার আগে ২-৩ বার ভেবে নিন</p>
          <p>✅ Backup file গুলো ২-৩ টি আলাদা জায়গায় রাখুন</p>
          <p>✅ Google Drive + Local Computer + External Hard Drive</p>
        </div>
      </div>
    </div>
  );
};
