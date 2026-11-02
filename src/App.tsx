/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { Catalog } from './components/Catalog';
import { BookingList } from './components/BookingList';
import { FleetManager } from './components/FleetManager';
import { FinanceManager } from './components/FinanceManager';
import { Bike, Shield, User, HeartHandshake } from 'lucide-react';
import kraventLogo from './assets/kravent-logo.svg';

function MainApp() {
  const { currentRole, setCurrentRole } = useApp();
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin' || hash === '#transaksi') return 'bookings';
      if (hash === '#sewa' || hash === '#katalog' || hash === '#customer') return 'catalog';
    }
    return currentRole === 'customer' ? 'catalog' : 'bookings';
  });

  useEffect(() => {
    document.title = 'Kravent Bike Salatiga - Rental Sepeda';
    const handleUrlState = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');

      if (hash === '#sewa' || hash === '#katalog' || hash === '#customer' || mode === 'customer' || mode === 'sewa') {
        setCurrentRole('customer');
        setActiveTab('catalog');
      } else if (hash === '#admin' || hash === '#staff' || hash === '#transaksi' || mode === 'admin') {
        setActiveTab('bookings');
      }
    };

    handleUrlState();
    window.addEventListener('hashchange', handleUrlState);
    return () => window.removeEventListener('hashchange', handleUrlState);
  }, [setCurrentRole]);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const getBaseOrigin = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}`;
    }
    return '';
  };

  const customerLink = `${getBaseOrigin()}#sewa`;
  const adminLink = `${getBaseOrigin()}#admin`;

  const handleCopyLink = (name: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(name);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col md:flex-row font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* ============================================================== */}
        {/* 🔗 DUA LINK UTAMA KRAVENT BIKE (HANYA MUNCUL DI ADMIN & STAF)   */}
        {/* ============================================================== */}
        {currentRole !== 'customer' && (
          <div className="bg-slate-900 text-white px-3 sm:px-6 py-2.5 border-b border-slate-800 text-xs shadow-xs">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-extrabold text-xs text-slate-100">
                  Panel Admin &amp; Staf Toko:
                </span>
                <span className="hidden lg:inline text-slate-400 text-[11px]">
                  (Salin Link Sewa Customer untuk dikirim ke chat WhatsApp pelanggan)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Tombol Salin Link 1: Customer */}
                <button
                  type="button"
                  onClick={() => handleCopyLink('customer', customerLink)}
                  title="Salin Link Sewa Customer (Kirim ke Chat WhatsApp Pelanggan)"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] transition-all cursor-pointer shadow-xs"
                >
                  <span>🚲 Salin Link Customer:</span>
                  <span className="font-mono text-emerald-200">#sewa</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/20 text-white text-[10px]">
                    {copiedLink === 'customer' ? '✓ Tersalin!' : 'Salin'}
                  </span>
                </button>

                {/* Tombol Salin Link 2: Admin & Staf */}
                <button
                  type="button"
                  onClick={() => handleCopyLink('admin', adminLink)}
                  title="Salin Link Admin & Staf (Kelola Transaksi - PIN 3110 / 3131)"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-[11px] border border-amber-400/30 transition-all cursor-pointer shadow-xs"
                >
                  <span>🔐 Salin Link Admin/Staf:</span>
                  <span className="font-mono text-amber-200">#admin</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/30 text-amber-300 text-[10px]">
                    {copiedLink === 'admin' ? '✓ Tersalin!' : 'Salin'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-20 md:pb-8">
          {/* TAB ROUTING */}
          {activeTab === 'dashboard' && (
            <Dashboard
              onNavigateTab={tab => setActiveTab(tab)}
              onOpenBooking={() => setActiveTab('catalog')}
            />
          )}

          {(activeTab === 'catalog' || currentRole === 'customer') && <Catalog />}

          {activeTab === 'bookings' && <BookingList />}

          {activeTab === 'fleet' && <FleetManager />}

          {activeTab === 'finance' && <FinanceManager />}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mb-14 md:mb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center p-0.5 shadow-2xs shrink-0">
                <img src={kraventLogo} alt="Logo Kravent Bike" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-slate-800">Kravent Bike • Salatiga</span>
              <span className="hidden sm:inline text-slate-400">• Rental Sepeda & Manajemen Toko</span>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <span>Mode: <strong className="text-slate-700 capitalize">{currentRole}</strong></span>
              <span>•</span>
              <a
                href="https://wa.me/6289647123671"
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-700 transition-colors"
              >
                WA: 0896-4712-3671
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
