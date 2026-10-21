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
import ukswLogo from './assets/logo-uksw.svg';

function MainApp() {
  const { currentRole } = useApp();
  const [activeTab, setActiveTab] = useState<string>(
    currentRole === 'customer' ? 'catalog' : 'dashboard'
  );

  useEffect(() => {
    document.title = 'Kravent Bike';
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
      <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-0.5 shadow-xs shrink-0">
              <img src={ukswLogo} alt="Logo UKSW" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-slate-800">Kravent Bike • UKSW</span>
            <span>• Rental Sepeda Kampus & Finansial Bisnis Bagi Hasil (60/40)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Role Aktif: <strong className="text-slate-700 capitalize">{currentRole}</strong></span>
            <span>•</span>
            <span>WhatsApp CS: 0896-4712-3671</span>
          </div>
        </div>
      </footer>
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
