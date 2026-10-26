import React, { useState, useEffect } from 'react';
import {
  Bike,
  ShieldCheck,
  UserCheck,
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
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Cloud,
  Aperture,
  User
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
  const {
    currentRole,
    setCurrentRole,
    resetToDefaults,
    bikesOutToday,
    activeBookingsCount,
    forceSyncCloud,
    isCloudSyncing,
    lastCloudSyncTime,
  } = useApp();
  const [pinModalTarget, setPinModalTarget] = useState<'admin' | 'karyawan' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTab, setShareTab] = useState<'qr' | 'links'>('qr');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showRoleSwitcherPopup, setShowRoleSwitcherPopup] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSync = async () => {
    const res = await forceSyncCloud();
    setSyncNotice(res.message);
    setTimeout(() => setSyncNotice(null), 3500);
  };

  const applyRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setShowRoleSwitcherPopup(false);
    if (role === 'customer' && (activeTab === 'dashboard' || activeTab === 'bookings' || activeTab === 'fleet' || activeTab === 'finance')) {
      setActiveTab('catalog');
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
      setShowRoleSwitcherPopup(false);
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

  // Tutup drawer mobile saat ukuran layar berubah ke tablet/desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
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
            .logo-wrap {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              margin-bottom: 8px;
            }
            .logo {
              width: 32px;
              height: 32px;
            }
            h1 {
              font-size: 22px;
              margin: 0;
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              margin: 4px 0 18px 0;
            }
            .qr-box {
              background: #ffffff;
              padding: 16px;
              border-radius: 20px;
              display: inline-block;
              border: 2px dashed #0f172a;
              margin: 8px 0 16px 0;
            }
            .qr-img {
              width: 240px;
              height: 240px;
              display: block;
            }
            .instructions {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 12px;
              font-size: 11px;
              color: #334155;
              text-align: left;
              margin-top: 14px;
              line-height: 1.5;
            }
            .instructions ol {
              margin: 4px 0 0 18px;
              padding: 0;
            }
            .footer-tag {
              margin-top: 18px;
              font-size: 10px;
              color: #94a3b8;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo-wrap">
              <h1>KRAVENT BIKE</h1>
            </div>
            <div class="subtitle">Pos Rental Sepeda Resmi • UKSW Salatiga</div>

            <div class="qr-box">
              <img src="${qrStandImageUrl}" class="qr-img" alt="QR Code Katalog" />
            </div>

            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px;">
              📲 SCAN UNTUK CEK SEPEDA & BOOKING
            </div>

            <div class="instructions">
              <strong>Panduan Praktis Pelanggan:</strong>
              <ol>
                <li>Buka aplikasi <strong>Kamera</strong> di HP Anda.</li>
                <li>Arahkan kamera ke QR Code di atas.</li>
                <li>Klik link yang muncul untuk melihat katalog armada, cek ketersediaan jam kosong, dan booking cepat!</li>
              </ol>
            </div>

            <div class="footer-tag">
              KRAVENT BIKE • OPERASIONAL: 06:00 - 23:00 WIB
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

  // Item Navigasi Utama
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
            label: currentRole === 'admin' ? 'Kelola Booking' : 'Daftar Booking (Lihat Saja)',
            icon: CalendarCheck,
            badge: activeBookingsCount > 0 ? `${activeBookingsCount} aktif` : null,
            badgeColor: 'bg-blue-600',
          },
          {
            id: 'fleet',
            label: currentRole === 'admin' ? 'Armada Sepeda' : 'Status Armada (Lihat Saja)',
            icon: Layers,
            badge: null,
          },
          {
            id: 'finance',
            label: currentRole === 'admin' ? 'Bagi Hasil & Finansial' : 'Hasil Keuangan (Lihat Saja)',
            icon: PieChart,
            badge: currentRole === 'admin' ? '60/40' : null,
            badgeColor: 'bg-emerald-600',
          },
        ]
      : []),
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileDrawerOpen(false);
  };

  // Avatar & Profile Data
  const profileData = {
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    name: currentRole === 'admin' ? 'Admin Kravent' : currentRole === 'karyawan' ? 'Staff Toko' : 'Pelanggan Tamu',
    subtitle: currentRole === 'admin' ? 'Owner • Salatiga' : currentRole === 'karyawan' ? 'Mode Lihat Saja' : 'Tamu UKSW',
    roleTag: currentRole === 'admin' ? 'Owner' : currentRole === 'karyawan' ? 'Lihat Saja' : 'Publik',
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. TOP HEADER KHUSUS HP (< md)                                 */}
      {/* ============================================================== */}
      <div className="md:hidden sticky top-0 z-40 bg-[#18191c] text-white border-b border-white/10 shadow-md">
        {/* Banner Status Staf jika sedang login */}
        {isStaffMode && (
          <div className="bg-[#121315] text-zinc-300 text-[11px] px-3 py-1 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`flex h-2 w-2 rounded-full animate-pulse shrink-0 ${
                  currentRole === 'admin' ? 'bg-amber-400' : 'bg-[#2f80ed]'
                }`}
              />
              <span className="font-semibold truncate">
                {currentRole === 'admin' ? 'Admin Owner' : 'Staff Kasir'} • {bikesOutToday} Unit Keluar
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleSync}
                disabled={isCloudSyncing}
                className="px-2 py-0.5 rounded bg-white/10 text-emerald-400 border border-white/10 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Sinkronkan data online real-time"
              >
                <RefreshCw className={`w-3 h-3 text-emerald-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'Sync...' : 'Sync'}</span>
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="px-2 py-0.5 rounded bg-white/10 text-sky-300 border border-white/10 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3 text-[#2f80ed]" />
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
          {/* Tombol Buka Menu Sidebar (Drawer) */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 -ml-1.5 rounded-xl text-white hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer border border-white/10"
            aria-label="Buka Menu Sidebar"
          >
            <Menu className="w-5 h-5 text-white" />
            <span className="text-xs font-bold text-white">Menu</span>
          </button>

          {/* Logo & Judul Brand */}
          <div
            className="flex items-center gap-2 cursor-pointer flex-1 justify-center truncate"
            onClick={() => handleNavClick(currentRole === 'customer' ? 'catalog' : 'dashboard')}
          >
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
              <Aperture className="w-4 h-4 text-white" />
            </div>
            <div className="truncate text-left">
              <span className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                Kravent Bike
                <span className="text-[9px] font-bold px-1 rounded bg-[#2f80ed] text-white uppercase">
                  UKSW
                </span>
              </span>
            </div>
          </div>

          {/* Aksi Kanan Mobile */}
          <div className="flex items-center gap-1 shrink-0">
            {currentRole === 'customer' ? (
              <button
                onClick={() => setPinModalTarget('karyawan')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/15 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer bg-white/5"
                title="Akses Staf & Admin"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Staf</span>
              </button>
            ) : (
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-xl text-sky-400 bg-white/10 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                title="Stand QR Kasir"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DRAWER SIDEBAR SLIDE-OVER KHUSUS HP (< md)                   */}
      {/* ============================================================== */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Panel Drawer Sidebar (Sleek Dark Card Style) */}
          <aside className="relative w-72 sm:w-80 max-w-[85vw] bg-[#18191c] text-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 z-10 border-r border-white/10 p-3">
            <div>
              {/* Drawer Header */}
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                    <Aperture className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                      Kravent Bike
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#2f80ed] text-white uppercase">
                        UKSW
                      </span>
                    </span>
                    <p className="text-[10px] text-zinc-400">Pos Rental & Finansial</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Tutup Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Switcher Role di Drawer */}
              <div className="p-3 bg-[#1e1f23] text-white my-3 rounded-2xl border border-white/10 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-zinc-400">Mode Akses:</span>
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

                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      handleRoleButtonClick('karyawan');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      currentRole === 'karyawan'
                        ? 'bg-[#2f80ed] text-white'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Staff Kasir</span>
                  </button>

                  <button
                    onClick={() => {
                      handleRoleButtonClick('admin');
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      currentRole === 'admin'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin Owner</span>
                  </button>
                </div>
              </div>

              {/* Navigasi Utama Mobile Drawer */}
              <nav className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 mb-1 block">
                  Menu Utama
                </span>
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#2f80ed] text-white font-extrabold shadow-md shadow-blue-500/25'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-white shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Divider */}
              <hr className="border-t border-white/10 my-3" />

              {/* Menu Sekunder Mobile */}
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setShowShareModal(true);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="w-4 h-4 text-[#2f80ed]" />
                    <span>Stand QR Meja Kasir</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                </button>

                <a
                  href="https://wa.me/6289647123671?text=Halo%20Admin%20Kravent%20Bike,%20saya%20ingin%20tanya%20sewa%20sepeda"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>Chat WA Admin CS</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Chat</span>
                </a>

                {isStaffMode && (
                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      applyRoleChange('customer');
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Kunci Sesi (Kembali Publik)</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer User Profile Footer */}
            <div className="p-3 border-t border-white/10 mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={profileData.avatar}
                  alt={profileData.name}
                  className="w-8 h-8 rounded-full object-cover border border-white/20"
                />
                <div>
                  <span className="font-bold text-xs text-white block">{profileData.name}</span>
                  <span className="text-[10px] text-zinc-400">{profileData.subtitle}</span>
                </div>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 uppercase">
                {profileData.roleTag}
              </span>
            </div>
          </aside>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. BOTTOM NAVIGATION BAR UNTUK HP (< md)                       */}
      {/* ============================================================== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#18191c]/95 backdrop-blur-md border-t border-white/10 py-1 px-2 flex justify-around items-center shadow-2xl">
        {isStaffMode ? (
          <>
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'dashboard' ? 'text-[#2f80ed] font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Dashboard</span>
            </button>

            <button
              onClick={() => handleNavClick('catalog')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'catalog' ? 'text-[#2f80ed] font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bike className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Katalog</span>
            </button>

            <button
              onClick={() => handleNavClick('bookings')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl relative transition-colors cursor-pointer ${
                activeTab === 'bookings' ? 'text-[#2f80ed] font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CalendarCheck className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Booking</span>
              {activeBookingsCount > 0 && (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-[#2f80ed] animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-zinc-300 hover:text-white transition-colors cursor-pointer font-bold"
            >
              <Menu className="w-4 h-4 mb-0.5 text-zinc-300" />
              <span className="text-[10px]">Sidebar</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleNavClick('catalog')}
              className="flex flex-col items-center justify-center py-1 px-3 text-[#2f80ed] font-extrabold cursor-pointer"
            >
              <Bike className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Katalog</span>
            </button>

            <a
              href="https://wa.me/6289647123671?text=Halo%20Admin%20Kravent%20Bike,%20saya%20ingin%20tanya%20sewa%20sepeda"
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center py-1 px-3 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <MessageCircle className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Chat WA</span>
            </a>

            <button
              onClick={() => setPinModalTarget('karyawan')}
              className="flex flex-col items-center justify-center py-1 px-3 text-zinc-400 hover:text-white cursor-pointer"
            >
              <Lock className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Akses Staf</span>
            </button>
          </>
        )}
      </nav>

      {/* ============================================================== */}
      {/* 4. SLEEK FLOATING SIDEBAR KHUSUS DESKTOP (>= md)               */}
      {/* Terinspirasi dari desain referensi user (Sport Live Sidebar)    */}
      {/* ============================================================== */}
      <aside
        className={`hidden md:flex shrink-0 sticky top-0 h-screen p-3 z-30 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-[96px]' : 'w-64 lg:w-72'
        }`}
      >
        {/* Floating Rounded Panel Container */}
        <div className="w-full h-full bg-[#18191c] text-white rounded-[28px] shadow-2xl border border-white/10 flex flex-col justify-between p-3.5 overflow-hidden transition-all duration-300">
          
          {/* BAGIAN ATAS: HEADER & NAVIGASI */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col">
            
            {/* 1. BRAND HEADER DENGAN APERTURE ICON */}
            <div
              className={`flex items-center gap-3 cursor-pointer group pb-3 border-b border-white/10 ${
                isSidebarCollapsed ? 'justify-center' : 'justify-between'
              }`}
              onClick={() => handleNavClick(currentRole === 'customer' ? 'catalog' : 'dashboard')}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Aperture className="w-5 h-5 text-white" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="truncate">
                    <span className="font-extrabold text-[15px] tracking-tight text-white block group-hover:text-blue-400 transition-colors">
                      Kravent Bike
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium block -mt-0.5">
                      UKSW Salatiga
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. MENU UTAMA (PRIMARY NAVIGATION GROUP) */}
            <div className="pt-3">
              {!isSidebarCollapsed && (
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 mb-1.5 block">
                  Menu Utama
                </span>
              )}

              <nav className="space-y-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center ${
                          isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                        } rounded-xl text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#2f80ed] text-white font-extrabold shadow-md shadow-blue-500/25'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`} />
                          {!isSidebarCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>

                        {!isSidebarCollapsed && item.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-white shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {/* Tooltip pada mode Collapsed (seperti di referensi gambar) */}
                      {isSidebarCollapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#18191c] text-white text-xs font-semibold rounded-lg shadow-2xl border border-white/15 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#2f80ed] text-white font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* SEPARATOR DIVIDER (MIRIP REFERENSI GAMBAR) */}
            <hr className="border-t border-white/10 my-3" />

            {/* 3. SECONDARY MENU ITEMS (STAND QR, CHAT, SINKRONISASI) */}
            <div className="space-y-1">
              {/* Stand QR Kasir */}
              <div className="relative group">
                <button
                  onClick={() => setShowShareModal(true)}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
                  } rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <QrCode className="w-4 h-4 shrink-0 text-[#2f80ed]" />
                    {!isSidebarCollapsed && <span>Stand QR Kasir</span>}
                  </div>
                  {!isSidebarCollapsed && <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
                </button>

                {isSidebarCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#18191c] text-white text-xs font-semibold rounded-lg shadow-2xl border border-white/15 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    Stand QR Kasir
                  </div>
                )}
              </div>

              {/* Chat WhatsApp CS */}
              <div className="relative group">
                <a
                  href="https://wa.me/6289647123671?text=Halo%20Admin%20Kravent%20Bike,%20saya%20ingin%20tanya%20sewa%20sepeda"
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
                  } rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isSidebarCollapsed && <span>WA Admin CS</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">
                      Chat
                    </span>
                  )}
                </a>

                {isSidebarCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#18191c] text-white text-xs font-semibold rounded-lg shadow-2xl border border-white/15 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    WA Admin CS
                  </div>
                )}
              </div>

              {/* Cloud Sync Status */}
              <div className="relative group">
                <button
                  onClick={handleSync}
                  disabled={isCloudSyncing}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
                  } rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <RefreshCw className={`w-4 h-4 shrink-0 text-emerald-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    {!isSidebarCollapsed && (
                      <span className="flex items-center gap-1.5 truncate">
                        <span>Cloud Database</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      </span>
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {isCloudSyncing ? 'Sync...' : 'Online'}
                    </span>
                  )}
                </button>

                {isSidebarCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#18191c] text-white text-xs font-semibold rounded-lg shadow-2xl border border-white/15 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {isCloudSyncing ? 'Syncing...' : 'Cloud DB: Online (Klik Sync)'}
                  </div>
                )}
              </div>

              {/* Tombol Kunci Sesi (Jika Staff) */}
              {isStaffMode && (
                <div className="relative group">
                  <button
                    onClick={() => applyRoleChange('customer')}
                    className={`w-full flex items-center ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
                    } rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors cursor-pointer`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
                      {!isSidebarCollapsed && <span>Kunci Sesi</span>}
                    </div>
                  </button>

                  {isSidebarCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#18191c] text-white text-xs font-semibold rounded-lg shadow-2xl border border-white/15 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      Kunci Sesi Staf
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BAGIAN BAWAH: TOGGLE COLLAPSE & USER PROFILE */}
          <div className="pt-2 shrink-0">
            {/* 4. TOGGLE COLLAPSE BUTTON [|] (PERSIS SEPERTI GAMBAR REFERENSI DI ATAS AVATAR) */}
            <div className={`flex ${isSidebarCollapsed ? 'justify-center' : 'justify-end'} pb-2`}>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(prev => !prev)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isSidebarCollapsed ? 'Perlebar Sidebar' : 'Persempit Sidebar'}
                >
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="w-4 h-4" />
                  ) : (
                    <PanelLeftClose className="w-4 h-4" />
                  )}
                </button>

                {isSidebarCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-[#18191c] text-white text-[11px] font-semibold rounded-lg shadow-2xl border border-white/15 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    Buka Sidebar
                  </div>
                )}
              </div>
            </div>

            {/* SEPARATOR DIVIDER */}
            <hr className="border-t border-white/10 mb-2.5" />

            {/* 5. USER PROFILE ITEM DENGAN AVATAR CIRCLE (SEPERTI 'TIMO' PADA GAMBAR) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleSwitcherPopup(prev => !prev)}
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } p-1.5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <img
                      src={profileData.avatar}
                      alt={profileData.name}
                      className="w-9 h-9 rounded-full object-cover border border-white/20 group-hover:border-white/40 transition-colors shrink-0 shadow-xs"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#18191c] ${
                        currentRole === 'admin'
                          ? 'bg-amber-400'
                          : currentRole === 'karyawan'
                          ? 'bg-[#2f80ed]'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>

                  {!isSidebarCollapsed && (
                    <div className="text-left truncate">
                      <span className="font-bold text-xs text-white block truncate leading-tight group-hover:text-blue-400 transition-colors">
                        {profileData.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate block">
                        {profileData.subtitle}
                      </span>
                    </div>
                  )}
                </div>

                {!isSidebarCollapsed && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 uppercase shrink-0">
                    {profileData.roleTag}
                  </span>
                )}
              </button>

              {/* Tooltip pada Collapsed Avatar */}
              {isSidebarCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#18191c] text-white text-xs font-semibold rounded-lg shadow-2xl border border-white/15 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {profileData.name} ({profileData.roleTag})
                </div>
              )}

              {/* Role Switcher Popover */}
              {showRoleSwitcherPopup && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1e1f23] text-white rounded-2xl shadow-2xl border border-white/15 p-2.5 z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-2 mb-1">
                    Ganti Mode Akses:
                  </span>

                  <button
                    onClick={() => handleRoleButtonClick('customer')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      currentRole === 'customer'
                        ? 'bg-[#2f80ed] text-white font-bold'
                        : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span>Mode Pelanggan (Publik)</span>
                    {currentRole === 'customer' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleRoleButtonClick('karyawan')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      currentRole === 'karyawan'
                        ? 'bg-[#2f80ed] text-white font-bold'
                        : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span>Mode Staff Kasir</span>
                    {currentRole === 'karyawan' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleRoleButtonClick('admin')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      currentRole === 'admin'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span>Mode Admin Owner</span>
                    {currentRole === 'admin' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
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
                    💡 <strong>Cara Paling Praktis di Pos Rental:</strong> Cetak QR Code ini dan letakkan di meja kasir / stand akrilik. Pelanggan datang tinggal buka kamera HP & scan, langsung melihat katalog sepeda dan tarif tanpa perlu mengetik URL!
                  </div>

                  {/* QR Stand Preview Card */}
                  <div className="p-6 rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center shadow-xs">
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
                    💡 <strong>1 Link Utama:</strong> Cukup sebarkan link utama ke publik (Bio IG/WA). Pelanggan otomatis melihat katalog bersih, dan akses staf terkunci aman di balik PIN.
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

      {/* TOAST PEMBERITAHUAN SINKRONISASI CLOUD */}
      {syncNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/60 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}
    </>
  );
};
