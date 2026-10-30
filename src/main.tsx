// Inisialisasi versi bersih produksi untuk menghapus semua cache localStorage sisa pengujian
const APP_VERSION = 'v4_clean_production';
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('kravent_app_version') !== APP_VERSION) {
      localStorage.clear();
      localStorage.setItem('kravent_app_version', APP_VERSION);
    }
  } catch {
    // ignore
  }
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
