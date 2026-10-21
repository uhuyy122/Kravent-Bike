import React, { useState } from 'react';
import {
  Bike,
  Plus,
  Edit,
  Trash2,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Layers,
  Search,
  Sliders,
  DollarSign,
  Tag,
  Upload,
  Camera,
  ImageIcon,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Bike as BikeType, BikeCategory, BikeStatus } from '../types';
import { formatRupiah, getCategoryLabel, getBikeStatusBadge } from '../utils/formatters';
import { compressImageFile, CompressionResult } from '../utils/imageCompressor';

export const FleetManager: React.FC = () => {
  const { bikes, addBike, updateBike, deleteBike, updateBikeStatus, currentRole } = useApp();

  const isAdmin = currentRole === 'admin';
  const isStaffOrAdmin = currentRole === 'admin' || currentRole === 'karyawan';

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal form for adding/editing bike
  const [showModal, setShowModal] = useState(false);
  const [editingBike, setEditingBike] = useState<BikeType | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Polygon');
  const [category, setCategory] = useState<BikeCategory>('road');
  const [frameSize, setFrameSize] = useState('Size M (165-175cm)');
  const [color, setColor] = useState('Black / Cyan');
  const [pricePerHour, setPricePerHour] = useState('8000');
  const [pricePerDay, setPricePerDay] = useState('50000');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80');
  const [description, setDescription] = useState('');
  const [gearSystem, setGearSystem] = useState('Shimano 2x9 Speed');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [depositRequired, setDepositRequired] = useState('50000');
  const [status, setStatus] = useState<BikeStatus>('tersedia');

  // Device upload state
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<CompressionResult | null>(null);
  const [photoSourceMode, setPhotoSourceMode] = useState<'upload' | 'url'>('upload');

  const handleOpenAdd = () => {
    setEditingBike(null);
    setName('');
    setBrand('Polygon');
    setCategory('road');
    setFrameSize('Size M (165-175cm)');
    setColor('Black Metallic');
    setPricePerHour('8000');
    setPricePerDay('50000');
    setImageUrl('https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80');
    setDescription('Sepeda balap performa tinggi siap sewa santai maupun olahraga.');
    setGearSystem('Shimano Sora 2x9 Speed');
    setLicenseNumber(`KB-${String(bikes.length + 1).padStart(2, '0')}`);
    setDepositRequired('50000');
    setStatus('tersedia');
    setCompressionStats(null);
    setPhotoSourceMode('upload');
    setShowModal(true);
  };

  const handleOpenEdit = (bike: BikeType) => {
    setEditingBike(bike);
    setName(bike.name);
    setBrand(bike.brand);
    setCategory(bike.category);
    setFrameSize(bike.frameSize);
    setColor(bike.color);
    setPricePerHour(bike.pricePerHour.toString());
    setPricePerDay(bike.pricePerDay.toString());
    setImageUrl(bike.imageUrl);
    setDescription(bike.description);
    setGearSystem(bike.gearSystem);
    setLicenseNumber(bike.licenseNumber);
    setDepositRequired(bike.depositRequired.toString());
    setStatus(bike.status);
    setCompressionStats(null);
    setPhotoSourceMode('upload');
    setShowModal(true);
  };

  // Handler kompresi foto dari device (kamera / galeri)
  const handleDeviceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      // Kompres otomatis ke WebP/JPEG ringan (~35 - 50 KB)
      const result = await compressImageFile(file, 900, 700, 0.72);
      setImageUrl(result.dataUrl);
      setCompressionStats(result);
    } catch (err) {
      alert('Gagal memproses gambar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSaveBike = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!name.trim() || !licenseNumber.trim()) {
      alert('Mohon isi nama sepeda dan kode unit');
      return;
    }

    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      frameSize: frameSize.trim(),
      color: color.trim(),
      pricePerHour: parseInt(pricePerHour, 10) || 8000,
      pricePerDay: parseInt(pricePerDay, 10) || 50000,
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80',
      description: description.trim(),
      gearSystem: gearSystem.trim(),
      licenseNumber: licenseNumber.trim(),
      depositRequired: parseInt(depositRequired, 10) || 50000,
      status,
    };

    if (editingBike) {
      updateBike(editingBike.id, payload);
    } else {
      addBike(payload);
    }

    setShowModal(false);
  };

  const filteredBikes = bikes.filter(b => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.brand.toLowerCase().includes(search.toLowerCase()) ||
      b.licenseNumber.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      filterCategory === 'all' || b.category === filterCategory;

    const matchesStatus =
      filterStatus === 'all' || b.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Manajemen Armada Sepeda
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
              {bikes.length} Total Unit
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Kelola inventaris sepeda rental, atur tarif sewa per jam/hari, dan pantau status servis (mentenest).
          </p>
        </div>

        {isStaffOrAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sepeda Baru</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama sepeda, nomor unit (KB-...), atau merk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-emerald-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
          >
            <option value="all">Semua Kategori</option>
            <option value="road">Road Bike</option>
            <option value="mtb">MTB</option>
            <option value="folding">Sepeda Lipat</option>
            <option value="ebike">E-Bike</option>
            <option value="city">City Cruiser</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="tersedia">Tersedia</option>
            <option value="disewa">Sedang Disewa</option>
            <option value="maintenance">Mentenest</option>
          </select>
        </div>
      </div>

      {/* Bikes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBikes.map(b => {
          const badge = getBikeStatusBadge(b.status);

          return (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                  <img
                    src={b.imageUrl}
                    alt={b.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white/90 text-slate-900 shadow-xs">
                    {b.licenseNumber}
                  </span>
                  <span
                    className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs flex items-center gap-1 ${badge.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                    {badge.label}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{b.brand} • {getCategoryLabel(b.category)}</span>
                    <span className="font-semibold text-slate-600">{b.totalRentedCount}x disewa</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{b.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{b.description}</p>

                  <div className="pt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px] font-medium">Hari Biasa (Weekday):</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[11px]">
                        Rp 8.000 /jam
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px] font-medium">Sabtu, Minggu & Libur:</span>
                      <span className="font-extrabold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded text-[11px]">
                        Rp 10.000 /jam
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span>Paket Harian Penuh:</span>
                      <span className="font-semibold text-slate-700">{formatRupiah(b.pricePerDay)}/hari</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Toggle & Actions */}
              <div className="p-4 pt-0 space-y-2 border-t border-slate-100 mt-2">
                <div className="pt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Ubah Status:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateBikeStatus(b.id, 'tersedia')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                        b.status === 'tersedia'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tersedia
                    </button>
                    <button
                      onClick={() => updateBikeStatus(b.id, 'disewa')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                        b.status === 'disewa'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Disewa
                    </button>
                    <button
                      onClick={() => updateBikeStatus(b.id, 'maintenance')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                        b.status === 'maintenance'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Kirim ke Bengkel/Mentenest"
                    >
                      Mentenest
                    </button>
                  </div>
                </div>

                {isStaffOrAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="px-2.5 py-1 text-xs text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit Nama & Data Sepeda"
                    >
                      <Edit className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Edit Unit</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Hapus sepeda ${b.name} (${b.licenseNumber}) dari armada?`)) {
                            deleteBike(b.id);
                          }
                        }}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Hapus Unit dari Sistem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingBike ? 'Edit Informasi Sepeda' : 'Tambah Sepeda ke Armada'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBike} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama / Tipe Sepeda *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Polygon Strattos S4 Disc"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kode Unit (Plat) *
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={e => setLicenseNumber(e.target.value)}
                    placeholder="KB-09"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Merk
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="Polygon / United / Trek"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as BikeCategory)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-semibold"
                  >
                    <option value="road">Road Bike (Balap)</option>
                    <option value="mtb">MTB (Gunung)</option>
                    <option value="folding">Sepeda Lipat</option>
                    <option value="ebike">E-Bike (Listrik)</option>
                    <option value="city">City Cruiser</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Status Unit
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as BikeStatus)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-semibold"
                  >
                    <option value="tersedia">Tersedia</option>
                    <option value="disewa">Sedang Disewa</option>
                    <option value="maintenance">Mentenest</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Tarif Sewa / Jam (Rp)
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      Standar 8rb
                    </span>
                  </div>
                  <input
                    type="number"
                    value={pricePerHour}
                    onChange={e => setPricePerHour(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-bold text-emerald-700"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Hari Biasa: Rp 8.000 / jam. Weekend & Libur otomatis Rp 10.000 / jam.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Harga Sewa / Hari (Rp)
                  </label>
                  <input
                    type="number"
                    value={pricePerDay}
                    onChange={e => setPricePerDay(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-bold text-slate-800"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tarif paket harian sewa seharian penuh.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Deposit Jaminan (Rp)
                  </label>
                  <input
                    type="number"
                    value={depositRequired}
                    onChange={e => setDepositRequired(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Jaminan uang/identitas penyewa.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ukuran Frame
                  </label>
                  <input
                    type="text"
                    value={frameSize}
                    onChange={e => setFrameSize(e.target.value)}
                    placeholder="Size M (165 - 175 cm)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Sistem Gear / Groupset
                  </label>
                  <input
                    type="text"
                    value={gearSystem}
                    onChange={e => setGearSystem(e.target.value)}
                    placeholder="Shimano Claris 2x8 Speed"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* FOTO SEPEDA: UPLOAD DARI DEVICE DENGAN KOMPRESI OTOMATIS */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Foto Unit Sepeda (Bisa Upload Langsung Dari HP / Perangkat)
                    </span>
                  </div>

                  {/* Switch Tab: Upload vs URL */}
                  <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setPhotoSourceMode('upload')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        photoSourceMode === 'upload'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload Device
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoSourceMode('url')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        photoSourceMode === 'url'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Link URL
                    </button>
                  </div>
                </div>

                {photoSourceMode === 'upload' ? (
                  <div className="space-y-2">
                    <label
                      className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        isCompressing
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDeviceFileUpload}
                        className="hidden"
                        disabled={isCompressing}
                      />
                      {isCompressing ? (
                        <div className="flex flex-col items-center gap-2 py-2 text-emerald-700">
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          <span className="text-xs font-bold">Mengompresi & mengoptimalkan foto...</span>
                          <span className="text-[10px] text-slate-500">Membuat ukuran foto super ringan tanpa mengurangi ketajaman</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-center py-1">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                            <Upload className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            Klik untuk Pilih Foto dari HP / Komputer / Kamera
                          </span>
                          <span className="text-[11px] text-slate-500">
                            JPG, PNG, WEBP (Otomatis diringankan menjadi ~35-50 KB agar web tidak lemot)
                          </span>
                        </div>
                      )}
                    </label>

                    {/* Info optimasi hemat kapasitas */}
                    {compressionStats && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Foto Terkompresi:</strong> Ukuran asli {compressionStats.originalSizeKb} KB ➔ <strong>{compressionStats.compressedSizeKb} KB</strong> (Hemat {compressionStats.savedPercentage}%!)
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full shrink-0">
                          Super Cepat
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={e => {
                        setImageUrl(e.target.value);
                        setCompressionStats(null);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tempel tautan gambar sepeda langsung dari internet.
                    </p>
                  </div>
                )}

                {/* Preview Foto */}
                {imageUrl && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="font-bold text-slate-800 block truncate">
                        Preview Tampilan Unit
                      </span>
                      <span className="text-[10px] text-emerald-700 block truncate">
                        {imageUrl.startsWith('data:') ? '✅ Foto dari Perangkat (Siap Digunakan)' : '✅ Link Gambar Valid'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl('https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80')}
                      className="text-[11px] text-slate-500 hover:text-rose-600 px-2 py-1 rounded"
                    >
                      Reset Default
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Deskripsi Sepeda
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Kelebihan dan karakteristik sepeda..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Simpan ke Armada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
