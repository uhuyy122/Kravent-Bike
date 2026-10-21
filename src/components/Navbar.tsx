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
  Lock,
  LogOut,
  Share2,
  Copy,
  Check,
  X,
  QrCode,
  Printer,
  Smartphone,
  Menu,
  MessageCircle,
  ChevronRight,
  Sparkles
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const applyRoleChange = (role: UserRole) => {
    setCurrentRole(role);
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

  // Tutup drawer mobile saat ukuran layar berubah ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Item navigasi berdasarkan role aktif
  const navItems = [
    ...(currentRole === 'admin' || currentRole === 'karyawan'
      ? [
          {
            id: 'dashboard',
            label: currentRole === 'admin' ? 'Dashboard & Grafik' : 'Dashboard Harian',
            icon: LayoutDashboard,
            badge: null,
          },
        ]
      : []),
    {
      id: 'catalog',
      label: 'Katalog Sepeda',
      icon: Bike,
      badge: null,
    },
    ...(currentRole === 'admin' || currentRole === 'karyawan'
      ? [
          {
            id: 'bookings',
            label: currentRole === 'admin' ? 'Kelola Booking' : 'Serah Terima & Kasir',
            icon: CalendarCheck,
            badge: activeBookingsCount > 0 ? `${activeBookingsCount} aktif` : null,
            badgeColor: currentRole === 'admin' ? 'bg-amber-500' : 'bg-sky-600',
          },
          {
            id: 'fleet',
            label: currentRole === 'admin' ? 'Armada Sepeda' : 'Status Armada',
            icon: Layers,
            badge: null,
          },
        ]
      : []),
    ...(currentRole === 'admin'
      ? [
          {
            id: 'finance',
            label: 'Bagi Hasil & Finansial',
            icon: PieChart,
            badge: '60/40',
            badgeColor: 'bg-emerald-600',
          },
        ]
      : []),
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. TOP BAR KHUSUS MOBILE & TABLET (< lg)                      */}
      {/* ============================================================== */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        {/* Banner Status Staf jika sedang login */}
        {isStaffMode && (
          <div className="bg-slate-900 text-white text-[11px] px-3 py-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`flex h-2 w-2 rounded-full animate-pulse shrink-0 ${
                  currentRole === 'admin' ? 'bg-amber-400' : 'bg-sky-400'
                }`}
              ></span>
              <span className="font-semibold truncate">
                {currentRole === 'admin' ? 'Admin' : 'Kasir'} • {bikesOutToday} Unit Keluar
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowShareModal(true)}
                className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3 text-emerald-400" />
                <span>QR</span>
              </button>
              <button
                onClick={() => applyRoleChange('customer')}
                className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Kunci sesi"
              >
                <LogOut className="w-3 h-3" />
                <span>Kunci</span>
              </button>
            </div>
          </div>
        )}

        {/* Bar Utama Mobile */}
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
          {/* Tombol Buka Menu Sidebar (Hamburger) */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 -ml-1 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5 text-slate-800" />
            <span className="text-xs font-bold text-slate-700 sm:inline hidden">Menu</span>
          </button>

          {/* Logo & Judul Brand */}
          <div
            className="flex items-center gap-2 cursor-pointer flex-1 truncate"
            onClick={() => handleNavClick(currentRole === 'customer' ? 'catalog' : 'dashboard')}
          >
            <div className="w-8 h-8 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-xs border border-slate-200 shrink-0">
              <img src={ukswLogo} alt="Logo UKSW" className="w-full h-full object-contain" />
            </div>
            <div className="truncate">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1">
                Kravent Bike
                <span className="text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-800 uppercase">
                  UKSW
                </span>
              </span>
              <p className="text-[10px] text-slate-500 truncate">Rental Sepeda Kampus</p>
            </div>
          </div>

          {/* Aksi Kanan Mobile */}
          <div className="flex items-center gap-1.5 shrink-0">
            {currentRole === 'customer' ? (
              <button
                onClick={() => setPinModalTarget('karyawan')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Akses Staf / Admin"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Staf</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DRAWER SIDEBAR SLIDE-OVER KHUSUS MOBILE & TABLET (< lg)     */}
      {/* ============================================================== */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Panel Drawer */}
          <aside className="relative w-72 sm:w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 z-10">
            <div>
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs border border-slate-200 shrink-0">
                    <img src={ukswLogo} alt="Logo UKSW" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1">
                      Kravent Bike
                      <span className="text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-800 uppercase">
                        UKSW
                      </span>
                    </span>
                    <p className="text-[10px] text-slate-500">Menu Navigasi</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Tutup Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Switcher Role di Drawer */}
              <div className="p-3 bg-slate-900 text-white m-3 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-300">Mode Akses:</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                      currentRole === 'admin'
                        ? 'bg-amber-400 text-slate-950'
                        : currentRole === 'karyawan'
                        ? 'bg-sky-400 text-slate-950'
                        : 'bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {currentRole}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      handleRoleButtonClick('karyawan');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      currentRole === 'karyawan'
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Kasir</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      handleRoleButtonClick('admin');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      currentRole === 'admin'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin</span>
                  </button>
                </div>

                {isStaffMode && (
                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      applyRoleChange('customer');
                    }}
                    className="w-full mt-2 py-1 px-2 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-800/60 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Kunci / Kembali ke Mode Publik</span>
                  </button>
                )}
              </div>

              {/* Daftar Menu Vertikal */}
              <div className="px-3 py-2 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1 block">
                  Menu Utama
                </span>
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs font-extrabold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded text-white ${item.badgeColor || 'bg-slate-700'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Fitur Pintas di Drawer */}
              <div className="px-3 py-2 space-y-1.5 border-t border-slate-100 mx-3 pt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Pintasan Cepat
                </span>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setShowShareModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Stand QR Meja Kasir</span>
                </button>

                <a
                  href="https://wa.me/6289647123671?text=Halo%20Admin%20Kravent%20Bike,%20saya%20ingin%20tanya%20sewa%20sepeda"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp CS (089647123671)</span>
                </a>

                {currentRole === 'admin' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Reset data ke kondisi awal demo?')) {
                        resetToDefaults();
                        setIsMobileDrawerOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-400" />
                    <span>Reset Data Demo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer Drawer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
              <p className="font-semibold text-slate-700">Kravent Bike UKSW Salatiga</p>
              <p className="text-[10px] text-slate-400">Jam Operasional: 06:00 - 23:00 WIB</p>
            </div>
          </aside>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. BOTTOM NAVIGATION BAR UNTUK HP (< lg)                        */}
      {/* ============================================================== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1 px-2 flex justify-around items-center shadow-lg">
        {isStaffMode ? (
          <>
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'dashboard' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Dashboard</span>
            </button>

            <button
              onClick={() => handleNavClick('catalog')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'catalog' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Bike className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Katalog</span>
            </button>

            <button
              onClick={() => handleNavClick('bookings')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl relative transition-colors cursor-pointer ${
                activeTab === 'bookings' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Booking</span>
              {activeBookingsCount > 0 && (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Menu className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Menu</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleNavClick('catalog')}
              className="flex flex-col items-center justify-center py-1 px-3 text-emerald-700 font-extrabold cursor-pointer"
            >
              <Bike className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Katalog Sepeda</span>
            </button>

            <a
              href="https://wa.me/6289647123671?text=Halo%20Admin%20Kravent%20Bike,%20saya%20ingin%20tanya%20sewa%20sepeda"
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center py-1 px-3 text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <MessageCircle className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Chat WA</span>
            </a>

            <button
              onClick={() => setPinModalTarget('karyawan')}
              className="flex flex-col items-center justify-center py-1 px-3 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <Lock className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Akses Staf</span>
            </button>
          </>
        )}
      </nav>

      {/* ============================================================== */}
      {/* 4. SIDEBAR PERMANEN KHUSUS DESKTOP & LAYAR LEBAR (>= lg)       */}
      {/* ============================================================== */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-screen flex-col justify-between sticky top-0 h-screen overflow-y-auto z-30">
        <div>
          {/* Logo & Brand Header Desktop */}
          <div
            className="p-5 border-b border-slate-100 flex items-center gap-3 cursor-pointer group"
            onClick={() => handleNavClick(currentRole === 'customer' ? 'catalog' : 'dashboard')}
          >
            <div className="w-11 h-11 rounded-2xl bg-white p-1 flex items-center justify-center shadow-md shadow-slate-200/90 ring-1 ring-slate-200 group-hover:scale-105 transition-all shrink-0">
              <img src={ukswLogo} alt="Logo UKSW" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-blue-800 transition-colors">
                  Kravent Bike
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
                  UKSW
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Rental Sepeda Salatiga</p>
            </div>
          </div>

          {/* Kartu Status Role di Sidebar Desktop */}
          <div className="p-3 m-3 rounded-2xl bg-slate-900 text-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    currentRole === 'admin'
                      ? 'bg-amber-400'
                      : currentRole === 'karyawan'
                      ? 'bg-sky-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-xs font-bold text-slate-200 capitalize">
                  Mode {currentRole}
                </span>
              </div>

              {isStaffMode && (
                <button
                  onClick={() => applyRoleChange('customer')}
                  title="Kunci sesi & kembali ke tampilan publik"
                  className="p-1 rounded-md text-rose-300 hover:text-white hover:bg-rose-900/60 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isStaffMode ? (
              <div className="text-[11px] text-slate-300 font-medium pt-1 border-t border-slate-800 flex items-center justify-between">
                <span>Unit di luar:</span>
                <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                  {bikesOutToday} ({activeBookingsCount} jalan)
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 leading-tight">
                Katalog publik sepeda mahasiswa & civitas UKSW
              </p>
            )}

            {/* Tombol switch role */}
            <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleRoleButtonClick('karyawan')}
                className={`py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  currentRole === 'karyawan'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Akses Karyawan"
              >
                <UserCheck className="w-3 h-3" />
                <span>Kasir</span>
              </button>

              <button
                onClick={() => handleRoleButtonClick('admin')}
                className={`py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  currentRole === 'admin'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Akses Admin"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Navigasi Vertikal Desktop */}
          <nav className="px-3 py-2 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Menu Navigasi
            </span>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded text-white ${item.badgeColor || 'bg-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bagian Bawah Sidebar Desktop */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
          <button
            onClick={() => setShowShareModal(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
            title="Buka QR Meja Kasir & Salin Link"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stand QR Kasir</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <a
            href="https://wa.me/6289647123671?text=Halo%20Admin%20Kravent%20Bike,%20saya%20ingin%20tanya%20sewa%20sepeda"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WA Admin CS</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold">Chat</span>
          </a>

          {currentRole === 'admin' && (
            <button
              onClick={() => {
                if (window.confirm('Reset data ke kondisi awal demo?')) {
                  resetToDefaults();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Reset Data Demo"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo</span>
            </button>
          )}

          <div className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-200/60">
            Kravent Bike UKSW • Buka 06:00-23:00
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 5. MODAL SHARE LINK & STAND QR MEJA KASIR                      */}
      {/* ============================================================== */}
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
                          Akses Staf
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
                          Akses Owner
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

      {/* ============================================================== */}
      {/* 6. PIN AUTHENTICATION FULLSCREEN MODAL                         */}
      {/* ============================================================== */}
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
    </>
  );
};
