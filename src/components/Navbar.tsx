import React, { useState, useEffect } from 'react';
import {
  Bike,
  ShieldCheck,
  UserCheck,
  User,
  LayoutDashboard,
  CalendarCheck,
  Layers,
  PieChart,
  RotateCcw,
  Sparkles,
  Lock,
  LogOut,
  Share2,
  Copy,
  Check,
  X,
  QrCode,
  Printer,
  Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import ukswLogo from '../assets/logo-uksw.svg';
import { PinAuthModal } from './PinAuthModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentRole, setCurrentRole, resetToDefaults, bikesOutToday, activeBookingsCount } = useApp();
  const [pinModalTarget, setPinModalTarget] = useState<'admin' | 'karyawan' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTab, setShareTab] = useState<'qr' | 'links'>('qr');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const applyRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    // If switching to customer and current tab was admin-only, switch to catalog
    if (role === 'customer' && (activeTab === 'dashboard' || activeTab === 'bookings' || activeTab === 'fleet' || activeTab === 'finance')) {
      setActiveTab('catalog');
    } else if (role === 'karyawan' && activeTab === 'finance') {
      setActiveTab('dashboard');
    }
  };

  const handleRoleButtonClick = (role: UserRole) => {
    if (role === currentRole) return;

    if (role === 'customer') {
      applyRoleChange('customer');
      return;
    }

    if (role === 'admin' || role === 'karyawan') {
      setPinModalTarget(role);
    }
  };

  // Dengarkan hash URL seperti #admin, #karyawan, #katalog
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') {
        if (currentRole !== 'admin') {
          setPinModalTarget('admin');
        }
      } else if (hash === '#karyawan') {
        if (currentRole !== 'karyawan') {
          setPinModalTarget('karyawan');
        }
      } else if (hash === '#katalog' || hash === '#customer') {
        applyRoleChange('customer');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [currentRole]);

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}`;
    }
    return '';
  };

  const customerCatalogUrl = `${getBaseUrl()}#katalog`;
  const qrStandImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(customerCatalogUrl)}&color=0f172a&bgcolor=ffffff&qzone=2&format=png`;

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePrintQrStand = () => {
    const printWindow = window.open('', '_blank', 'width=700,height=850');
    if (!printWindow) {
      alert('Izinkan pop-up di browser untuk mencetak Stand Meja Kasir');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stand Meja Kasir - Kravent Bike UKSW</title>
          <style>
            @page { size: A5 portrait; margin: 10mm; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 20px;
              color: #0f172a;
              background: #ffffff;
            }
            .card {
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 28px 20px;
              max-width: 440px;
              margin: 0 auto;
              box-shadow: 0 10px 25px rgba(0,0,0,0.06);
            }
            .badge {
              display: inline-block;
              background: #059669;
              color: white;
              padding: 6px 14px;
              border-radius: 999px;
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            h1 {
              font-size: 26px;
              margin: 0 0 6px 0;
              font-weight: 900;
              color: #0f172a;
            }
            p.sub {
              font-size: 14px;
              color: #475569;
              margin: 0 0 18px 0;
            }
            .qr-box {
              background: #ffffff;
              padding: 16px;
              border: 2px dashed #94a3b8;
              border-radius: 18px;
              display: inline-block;
              margin-bottom: 18px;
            }
            .qr-box img {
              width: 230px;
              height: 230px;
              display: block;
            }
            .callout {
              background: #f1f5f9;
              border-radius: 14px;
              padding: 12px;
              font-size: 13px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 14px;
              line-height: 1.4;
            }
            .footer-info {
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Official UKSW Salatiga</div>
            <h1>Kravent Bike</h1>
            <p class="sub">Rental Sepeda Kampus Salatiga</p>

            <div class="qr-box">
              <img src="${qrStandImageUrl}" alt="QR Code Katalog Kravent Bike" />
            </div>

            <div class="callout">
              📷 Arahkan Kamera HP ke QR Code di atas<br/>
              untuk lihat stok sepeda ready & tarif sewa!
            </div>

            <div class="footer-info">
              Jam Buka: 06:00 - 23:00 WIB<br/>
              WhatsApp Pos Rental: 0896-4712-3671
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isStaffMode = currentRole === 'admin' || currentRole === 'karyawan';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner Staf: HANYA tampil jika sedang login sebagai Karyawan atau Admin */}
      {isStaffMode && (
        <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-2.5 w-2.5 rounded-full animate-pulse ${
                currentRole === 'admin' ? 'bg-amber-400' : 'bg-sky-400'
              }`}
            ></span>
            <span className="font-semibold text-slate-200">
              {currentRole === 'admin' ? 'Akses Admin (Owner)' : 'Akses Karyawan (Kasir)'} •
            </span>
            <span className="text-slate-300 hidden sm:inline">
              {bikesOutToday} Sepeda Keluar Hari Ini ({activeBookingsCount} Sedang di Luar)
            </span>
          </div>

          {/* Right side controls: Bagikan Link/QR & Role Switcher */}
          <div className="flex items-center gap-2">
            {/* Tombol Bagikan Link & QR Stand */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] font-semibold transition-all cursor-pointer"
              title="Lihat QR Code Meja Kasir & Salin Link"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>QR & Link</span>
            </button>

            {/* Role Switcher Pill Bar dengan Proteksi PIN */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => handleRoleButtonClick('admin')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                  currentRole === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Akses Admin: Finansial bagi hasil & armada (PIN: 8888)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-current" />
                <span>Admin</span>
              </button>

              <button
                onClick={() => handleRoleButtonClick('karyawan')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                  currentRole === 'karyawan'
                    ? 'bg-sky-500 text-white font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="Akses Karyawan: Kasir & booking (PIN: 1234)"
              >
                <UserCheck className="w-3.5 h-3.5 text-current" />
                <span>Kasir</span>
              </button>

              {/* Tombol Kunci / Keluar ke Mode Pelanggan */}
              <button
                onClick={() => applyRoleChange('customer')}
                title="Kunci sesi & kembali ke tampilan katalog publik pelanggan"
                className="ml-1 px-2 py-1 rounded-md bg-rose-950/70 text-rose-300 hover:text-white hover:bg-rose-900 border border-rose-800/60 text-[11px] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Kunci (Mode Publik)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link & QR Stand Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Pusat Akses & QR Meja Kasir
                  </h3>
                  <p className="text-xs text-slate-400">
                    Opsi paling efisien untuk melayani pelanggan di lapangan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-slate-200 bg-slate-100/70 p-1">
              <button
                onClick={() => setShareTab('qr')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  shareTab === 'qr'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Stand QR Meja Kasir (Paling Efisien)</span>
              </button>
              <button
                onClick={() => setShareTab('links')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  shareTab === 'links'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Share2 className="w-4 h-4 text-slate-600" />
                <span>Salin Link URL Manual</span>
              </button>
            </div>

            <div className="p-6">
              {shareTab === 'qr' ? (
                /* TAB 1: QR MEJA KASIR (PALING PRAKTIS) */
                <div className="space-y-4 text-center">
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed text-left">
                    💡 <strong>Cara Paling Praktis di Pos Rental:</strong> Cetak QR Code ini dan taruh di meja kasir / stand akrilik. Pelanggan datang tinggal buka kamera HP & scan, langsung melihat katalog sepeda dan tarif tanpa perlu mengeja URL web!
                  </div>

                  {/* QR Stand Preview Card */}
                  <div className="p-6 rounded-2xl border-2 border-slate-200 bg-linear-to-b from-slate-50 to-white flex flex-col items-center justify-center shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 p-0.5 shadow-2xs">
                        <img src={ukswLogo} alt="Logo UKSW" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-extrabold text-sm text-slate-900">
                        Kravent Bike UKSW
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-4">
                      Scan untuk Lihat Stok Sepeda & Booking Cepat
                    </p>

                    <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
                      <img
                        src={qrStandImageUrl}
                        alt="QR Code Meja Kasir"
                        className="w-48 h-48 object-contain"
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Link Terhubung: <strong>{customerCatalogUrl}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handlePrintQrStand}
                      className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Printer className="w-4 h-4 text-emerald-400" />
                      <span>Cetak Stand Meja (A5)</span>
                    </button>

                    <button
                      onClick={() => handleCopy('customer-qr', customerCatalogUrl)}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {copiedKey === 'customer-qr' ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Salin Link Web</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 2: LINK LENGKAP */
                <div className="space-y-3.5">
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    💡 <strong>1 Link Utama:</strong> Anda cukup menyebarkan link utama ke publik (Bio IG/WA). Pelanggan otomatis melihat katalog bersih, dan fitur rahasia staf terkunci aman di balik PIN.
                  </div>

                  {/* Link 1: Pelanggan (Publik) */}
                  <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                          1
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          Link Pelanggan (Katalog Publik)
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy('customer', customerCatalogUrl)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                      >
                        {copiedKey === 'customer' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'customer' ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Bagikan ke pelanggan. Hanya menampilkan katalog tanpa menu kasir/finansial.
                    </p>
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-600 truncate select-all">
                      {customerCatalogUrl}
                    </div>
                  </div>

                  {/* Link 2: Karyawan (Staff Kasir) */}
                  <div className="p-3.5 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center text-xs font-bold">
                          2
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          Link Kasir (Operasional Serah Terima)
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">
                          PIN 1234
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy('karyawan', `${getBaseUrl()}#karyawan`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
                      >
                        {copiedKey === 'karyawan' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'karyawan' ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-600 truncate select-all">
                      {getBaseUrl()}#karyawan
                    </div>
                  </div>

                  {/* Link 3: Admin (Pemilik Usaha) */}
                  <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">
                          3
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          Link Admin (Owner Finansial & Bagi Hasil)
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                          PIN 8888
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy('admin', `${getBaseUrl()}#admin`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer"
                      >
                        {copiedKey === 'admin' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'admin' ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-600 truncate select-all">
                      {getBaseUrl()}#admin
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Authentication Modal */}
      {pinModalTarget && (
        <PinAuthModal
          targetRole={pinModalTarget}
          onSuccess={(grantedRole) => {
            applyRoleChange(grantedRole);
            setPinModalTarget(null);
          }}
          onClose={() => setPinModalTarget(null)}
        />
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab(currentRole === 'customer' ? 'catalog' : 'dashboard')}
          >
            <div className="relative w-11 h-11 rounded-2xl bg-white p-1 flex items-center justify-center shadow-md shadow-slate-200/90 ring-1 ring-slate-200 group-hover:scale-105 transition-all overflow-hidden shrink-0">
              <img
                src={ukswLogo}
                alt="Logo UKSW"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-blue-800 transition-colors">
                  Kravent Bike
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
                  UKSW
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Rental Sepeda Kampus Salatiga</p>
            </div>
          </div>

          {/* Navigation Links based on Current Role */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {/* Admin Tabs */}
            {currentRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard & Grafik</span>
                </button>

                <button
                  onClick={() => setActiveTab('catalog')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'catalog'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>Katalog Sepeda</span>
                </button>

                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap relative cursor-pointer ${
                    activeTab === 'bookings'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Kelola Booking</span>
                  {activeBookingsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[11px] font-bold bg-amber-500 text-white rounded-full">
                      {activeBookingsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('fleet')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'fleet'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Armada Sepeda</span>
                </button>

                <button
                  onClick={() => setActiveTab('finance')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'finance'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <span className="flex items-center gap-1">
                    Bagi Hasil & Biaya
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1 rounded">60/40</span>
                  </span>
                </button>
              </>
            )}

            {/* Karyawan Tabs */}
            {currentRole === 'karyawan' && (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard Harian</span>
                </button>

                <button
                  onClick={() => setActiveTab('catalog')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'catalog'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>Katalog Sepeda</span>
                </button>

                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap relative cursor-pointer ${
                    activeTab === 'bookings'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Serah Terima & Kasir</span>
                  {activeBookingsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[11px] font-bold bg-sky-600 text-white rounded-full">
                      {activeBookingsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('fleet')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'fleet'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Status Armada</span>
                </button>
              </>
            )}

            {/* Customer Tabs: Tampilan 100% Bersih & Profesional */}
            {currentRole === 'customer' && (
              <>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white shadow-xs whitespace-nowrap cursor-pointer"
                >
                  <Bike className="w-4 h-4" />
                  <span>Katalog Sepeda</span>
                </button>

                <a
                  href="https://wa.me/6289647123671?text=Halo%20Admin%20Kravent%20Bike,%20saya%20ingin%20tanya%20sewa%20sepeda"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors whitespace-nowrap border border-emerald-200"
                >
                  <span>Chat WA CS (089647123671)</span>
                </a>
              </>
            )}
          </nav>

          {/* Right Action: Akses Staf (jika customer) atau Tombol Reset (khusus admin) */}
          <div className="flex items-center gap-2">
            {currentRole === 'customer' ? (
              <button
                onClick={() => setPinModalTarget('karyawan')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                title="Akses Kasir / Admin Toko dengan PIN"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Akses Staf</span>
              </button>
            ) : currentRole === 'admin' ? (
              <button
                onClick={() => {
                  if (window.confirm('Reset data ke kondisi awal demo?')) {
                    resetToDefaults();
                  }
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Reset Data Demo (Khusus Admin)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
