import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  ShieldCheck,
  UserCheck,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Delete,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { UserRole } from '../types';
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
  const inputRef = useRef<HTMLInputElement>(null);

  const roleTitle = selectedRole === 'admin' ? 'Admin (Pemilik Usaha)' : 'Karyawan (Staff Kasir)';
  const roleDesc =
    selectedRole === 'admin'
      ? 'Akses penuh ke data finansial bagi hasil 60/40, laba bersih, manajemen armada, dan setelan persentase bisnis.'
      : 'Akses operasional toko untuk mencatat booking keluar/masuk, serah terima unit, dan perhitungan denda.';

  useEffect(() => {
    // Auto focus ke input PIN saat modal dibuka
    inputRef.current?.focus();

    // Global keyboard listener agar user langsung fokus mengetik PIN dari keyboard
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

  const handleVerify = (inputPin: string) => {
    // Cek kecocokan PIN: 8888 untuk Admin, 1234 untuk Karyawan
    if (inputPin === '8888') {
      setErrorMsg('');
      setIsSuccess(true);
      setSuccessRole('admin');
      setTimeout(() => {
        onSuccess('admin');
      }, 500);
    } else if (inputPin === '1234') {
      setErrorMsg('');
      setIsSuccess(true);
      setSuccessRole('karyawan');
      setTimeout(() => {
        onSuccess('karyawan');
      }, 500);
    } else {
      setErrorMsg('PIN salah! Masukkan 1234 (Karyawan) atau 8888 (Admin).');
      setPin('');
      inputRef.current?.focus();
    }
  };

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
    inputRef.current?.focus();
  };

  const handleQuickDemoPin = () => {
    const demoPin = selectedRole === 'admin' ? '8888' : '1234';
    setPin(demoPin);
    handleVerify(demoPin);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-y-auto min-h-screen w-full animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <header className="w-full px-4 sm:px-8 py-3.5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer mr-1"
            title="Kembali ke Katalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shrink-0">
            <img src={ukswLogo} alt="Logo UKSW" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
              Kravent Bike
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                UKSW
              </span>
            </span>
            <p className="text-[11px] text-slate-400 hidden sm:block">Gerbang Keamanan Akses Staf & Admin</p>
          </div>
        </div>

        {/* Role Toggle Pill Bar */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('karyawan');
              setPin('');
              setErrorMsg('');
              inputRef.current?.focus();
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedRole === 'karyawan'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Kasir (1234)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin');
              setPin('');
              setErrorMsg('');
              inputRef.current?.focus();
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin (8888)</span>
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          title="Batal & Kembali ke Katalog (ESC)"
        >
          <X className="w-4 h-4" />
          <span className="hidden md:inline">Batal (ESC)</span>
        </button>
      </header>

      {/* Center Focus Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-md mx-auto my-auto text-center space-y-4">
        {/* Glow Badge */}
        <div className="relative">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold shadow-2xl transition-all ${
              selectedRole === 'admin'
                ? 'bg-amber-400 text-slate-950 shadow-amber-500/20 ring-4 ring-amber-400/20'
                : 'bg-sky-400 text-slate-950 shadow-sky-500/20 ring-4 ring-sky-400/20'
            }`}
          >
            {selectedRole === 'admin' ? (
              <ShieldCheck className="w-8 h-8" />
            ) : (
              <UserCheck className="w-8 h-8" />
            )}
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300 mb-1.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Mode Layar Penuh Fokus PIN</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Masuk {roleTitle}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
            {roleDesc}
          </p>
        </div>

        {/* Hidden real input for physical keyboard support */}
        <input
          ref={inputRef}
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(val);
            setErrorMsg('');
            if (val.length === 4) {
              handleVerify(val);
            }
          }}
          className="opacity-0 absolute -z-10 w-0 h-0"
          autoFocus
        />

        {/* 4 Digit Visual Boxes with active pulse indicator */}
        <div
          className="flex items-center justify-center gap-3 cursor-pointer py-1"
          onClick={() => inputRef.current?.focus()}
        >
          {[0, 1, 2, 3].map(idx => {
            const filled = idx < pin.length;
            const isActive = idx === pin.length && !isSuccess;
            return (
              <div
                key={idx}
                className={`w-14 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold font-mono transition-all border-2 relative ${
                  isSuccess
                    ? 'border-emerald-500 bg-emerald-950/80 text-emerald-400 scale-105 shadow-lg shadow-emerald-500/30'
                    : errorMsg
                    ? 'border-rose-500 bg-rose-950/60 text-rose-300 animate-shake'
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
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-ping" />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {errorMsg ? (
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 flex items-center justify-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : isSuccess ? (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              PIN Benar! Membuka akses {successRole === 'admin' ? 'Admin' : 'Karyawan'}...
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Ketik langsung angka di keyboard fisik Anda atau gunakan tombol di bawah
          </p>
        )}

        {/* Virtual Keypad (High-tech full screen layout) */}
        <div className="grid grid-cols-3 gap-2.5 w-full pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="py-3 sm:py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 text-white font-extrabold text-lg sm:text-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleQuickDemoPin}
            title={`Isi PIN Otomatis (${selectedRole === 'admin' ? '8888' : '1234'})`}
            className="py-3 sm:py-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Auto PIN</span>
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 sm:py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 text-white font-extrabold text-lg sm:text-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-3 sm:py-3.5 rounded-2xl bg-slate-900/90 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-slate-400 font-bold text-xs border border-slate-800 transition-all cursor-pointer flex items-center justify-center active:scale-95"
            title="Hapus Digit"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <footer className="w-full px-4 sm:px-8 py-3 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            PIN Cepat: Karyawan <strong>1234</strong> • Admin <strong>8888</strong> (Ketik salah satu langsung otomatis terdeteksi)
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer text-[11px]"
        >
          Kembali ke Mode Katalog Publik
        </button>
      </footer>
    </div>
  );
};
