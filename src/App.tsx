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
  const { currentRole } = useApp();
  const [activeTab, setActiveTab] = useState<string>(
    currentRole === 'customer' ? 'catalog' : 'dashboard'
  );

  useEffect(() => {
    document.title = 'Kravent Bike';
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col md:flex-row font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
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
