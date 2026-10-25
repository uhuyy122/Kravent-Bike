import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  UserCheck,
  X,
  CheckCircle2,
  AlertCircle,
  Delete,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import ukswLogo from '../assets/logo-uksw.svg';

interface PinAuthModalProps {
  targetRole: 'admin' | 'karyawan';
  onSuccess: (grantedRole: 'admin' | 'karyawan') => void;
  onClose: () => void;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  targetRole: initialTargetRole,
  onSuccess,
  onClose,
}) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'karyawan'>(initialTargetRole);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successRole, setSuccessRole] = useState<'admin' | 'karyawan'>(initialTargetRole);

  const roleTitle = selectedRole === 'admin' ? 'Admin (Pemilik Usaha)' : 'Karyawan (Staff Kasir)';
  const roleDesc =
    selectedRole === 'admin'
      ? 'Akses penuh ke data finansial bagi hasil 60/40, laba bersih, dan manajemen armada.'
      : 'Akses operasional toko untuk mencatat booking keluar/masuk, serah terima unit, dan denda.';

  const handleVerify = (inputPin: string) => {
    // Verifikasi PIN rahasia tanpa membocorkan kodenya di tampilan UI
    if (inputPin === '8888') {
      setErrorMsg('');
      setIsSuccess(true);
      setSuccessRole('admin');
      setTimeout(() => {
        onSuccess('admin');
      }, 450);
    } else if (inputPin === '1234') {
      setErrorMsg('');
      setIsSuccess(true);
      setSuccessRole('karyawan');
      setTimeout(() => {
        onSuccess('karyawan');
      }, 450);
    } else {
      setErrorMsg('PIN yang Anda masukkan salah. Silakan coba lagi.');
      setPin('');
    }
  };

  useEffect(() => {
    // Global keyboard listener untuk desktop/laptop tanpa memicu keyboard bawaan di HP
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setPin(prev => prev.slice(0, -1));
        setErrorMsg('');
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPin(prev => {
          if (prev.length < 4) {
            const next = prev + e.key;
            if (next.length === 4) {
              handleVerify(next);
            }
            return next;
          }
          return prev;
        });
        setErrorMsg('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSuccess, selectedRole]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        handleVerify(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto w-full animate-in fade-in duration-200 select-none flex flex-col">
      {/* Top Header Bar - Sticky di bagian atas agar selalu terlihat dan tidak pernah terpotong di HP */}
      <header className="sticky top-0 z-30 w-full px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Kembali ke Katalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white p-0.5 flex items-center justify-center shadow-xs shrink-0">
            <img src={ukswLogo} alt="Logo UKSW" className="w-full h-full object-contain" />
          </div>
          <div className="truncate">
            <span className="font-extrabold text-xs sm:text-sm text-white tracking-tight flex items-center gap-1">
              Kravent Bike
              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                UKSW
              </span>
            </span>
            <p className="text-[10px] text-slate-400 hidden sm:block">Akses Staf & Admin</p>
          </div>
        </div>

        {/* Role Toggle Pill Bar (Tanpa Membocorkan Kode PIN) */}
        <div className="flex items-center bg-slate-800/90 p-0.5 sm:p-1 rounded-xl border border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('karyawan');
              setPin('');
              setErrorMsg('');
            }}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedRole === 'karyawan'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Kasir</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin');
              setPin('');
              setErrorMsg('');
            }}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer shrink-0"
          title="Batal & Kembali (ESC)"
        >
          <X className="w-4 h-4" />
          <span className="hidden md:inline">Batal</span>
        </button>
      </header>

      {/* Center Focus Area - Ditata agar pas di layar HP tanpa overflow dan dapat di-scroll penuh sampai atas */}
      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center py-4 px-3 sm:px-6 w-full max-w-xs sm:max-w-md mx-auto text-center space-y-2.5 sm:space-y-3.5">
        {/* Glow Badge */}
        <div className="relative">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold shadow-lg transition-all ${
              selectedRole === 'admin'
                ? 'bg-amber-400 text-slate-950 shadow-amber-500/20 ring-4 ring-amber-400/20'
                : 'bg-sky-400 text-slate-950 shadow-sky-500/20 ring-4 ring-sky-400/20'
            }`}
          >
            {selectedRole === 'admin' ? (
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] sm:text-[11px] font-semibold text-slate-300 mb-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Verifikasi Keamanan Akses</span>
          </div>
          <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
            Masuk {roleTitle}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto mt-0.5 leading-relaxed">
            {roleDesc}
          </p>
        </div>

        {/* 4 Digit Visual Boxes (Langsung terlihat rapi tanpa keyboard HP) */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 py-0.5">
          {[0, 1, 2, 3].map(idx => {
            const filled = idx < pin.length;
            const isActive = idx === pin.length && !isSuccess;
            return (
              <div
                key={idx}
                className={`w-11 h-13 sm:w-13 sm:h-15 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-mono transition-all border-2 relative ${
                  isSuccess
                    ? 'border-emerald-500 bg-emerald-950/80 text-emerald-400 scale-105 shadow-lg shadow-emerald-500/30'
                    : errorMsg
                    ? 'border-rose-500 bg-rose-950/60 text-rose-300'
                    : filled
                    ? selectedRole === 'admin'
                      ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-md shadow-amber-500/20'
                      : 'border-sky-400 bg-sky-400/20 text-sky-300 shadow-md shadow-sky-500/20'
                    : isActive
                    ? selectedRole === 'admin'
                      ? 'border-amber-400/80 bg-slate-900 ring-4 ring-amber-400/20 text-amber-400'
                      : 'border-sky-400/80 bg-slate-900 ring-4 ring-sky-400/20 text-sky-400'
                    : 'border-slate-800 bg-slate-900/60 text-slate-600'
                }`}
              >
                {filled ? (
                  '•'
                ) : isActive ? (
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {errorMsg ? (
          <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 flex items-center justify-center gap-1.5 text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : isSuccess ? (
          <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 flex items-center justify-center gap-1.5 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              PIN Benar! Membuka akses {successRole === 'admin' ? 'Admin' : 'Karyawan'}...
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Ketik 4-digit PIN rahasia Anda melalui tombol numerik di bawah
          </p>
        )}

        {/* Virtual Keypad (Murni tombol numerik sentuh, keyboard HP tidak akan muncul) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full pt-0.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 text-white font-extrabold text-lg sm:text-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            title="Bersihkan Input"
            className="py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900/60 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs sm:text-sm border border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 text-white font-extrabold text-lg sm:text-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900/60 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-slate-400 font-bold text-xs border border-slate-800 transition-all cursor-pointer flex items-center justify-center active:scale-95"
            title="Hapus Digit"
          >
            <Delete className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Footer Info (Tanpa Menampilkan Angka PIN) */}
      <footer className="w-full px-4 sm:px-8 py-2.5 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0 mt-auto">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400 text-[11px] sm:text-xs">
            Akses Terbatas: Khusus staf operasional & pengelola resmi Kravent Bike
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer text-[11px]"
        >
          Kembali ke Mode Publik
        </button>
      </footer>
    </div>
  );
};
