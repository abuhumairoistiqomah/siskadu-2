/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  Search, 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  Users,
  BookOpen,
  Target,
  Calendar, 
  Filter, 
  Info, 
  X, 
  Check, 
  Copy, 
  ChevronRight, 
  BarChart2, 
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Lock,
  LogOut,
  UserCheck,
  Menu,
  LayoutDashboard,
  Edit
} from 'lucide-react';

// Interfaces for our Complaint schema matching the spreadsheet headers exactly
interface Complaint {
  timestamp: string;
  tanggalDiterima: string;
  media: string;
  namaPelapor: string;
  namaSiswa: string;
  kelas: string;
  tema: string;
  target: string;
  namaTarget: string;
  isi: string;
  urgensi: string;
  bukti: string;
  pic: string;
  status: string;
  tindakan: string;
  tanggalSelesai: string;
  beritaAcara: string;
}

const indonesianMonths = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const convertDDMMYYYYToYYYYMMDD = (dateStr: string): string => {
  if (!dateStr || dateStr === '-' || dateStr === 'Menunggu diselesaikan') return '';
  // If already YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.includes(' ')) {
      year = year.split(' ')[0];
    }
    return `${year}-${month}-${day}`;
  }
  return '';
};

const convertYYYYMMDDToDDMMYYYY = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatToIndonesianDate = (dateStr: string): string => {
  if (!dateStr || dateStr === '-') return '-';

  // If it's a timezone-aware ISO format or contains 'T', parse using Intl.DateTimeFormat in Asia/Jakarta timezone
  if (dateStr.includes('T') || (dateStr.includes('-') && dateStr.includes(':'))) {
    try {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        return new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta'
        }).format(dateObj);
      }
    } catch (e) {
      // Ignore and fallback
    }
  }
  
  // If it's already formatted as Indonesian month name (e.g. contains "Juni")
  const containsMonthName = indonesianMonths.some(m => dateStr.toLowerCase().includes(m.toLowerCase()));
  if (containsMonthName) {
    return dateStr;
  }
  
  // Try to parse DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12 && !isNaN(year)) {
      return `${day} ${indonesianMonths[monthIdx]} ${year}`;
    }
  }
  
  // Try to parse YYYY-MM-DD
  const dashParts = dateStr.split('-');
  if (dashParts.length === 3) {
    if (dashParts[0].length === 4) { // YYYY-MM-DD
      const year = parseInt(dashParts[0], 10);
      const monthIdx = parseInt(dashParts[1], 10) - 1;
      const dayPart = dashParts[2].split('T')[0]; // Extract only the numeric part of the day
      const day = parseInt(dayPart, 10);
      if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12 && !isNaN(year)) {
        return `${day} ${indonesianMonths[monthIdx]} ${year}`;
      }
    } else { // DD-MM-YYYY
      const day = parseInt(dashParts[0], 10);
      const monthIdx = parseInt(dashParts[1], 10) - 1;
      const year = parseInt(dashParts[2], 10);
      if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12 && !isNaN(year)) {
        return `${day} ${indonesianMonths[monthIdx]} ${year}`;
      }
    }
  }

  // Fallback: try JS Date
  try {
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
      }).format(dateObj);
    }
  } catch (e) {
    // Ignore and fallback
  }
  
  return dateStr;
};

const parseTimestamp = (ts: string, fallbackDate: string): number => {
  if (!ts) return 0;

  // Try parsing ISO or standard format directly
  try {
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) {
      return parsed;
    }
  } catch (e) {}

  // Format: "DD/MM/YYYY HH:mm" or similar
  const parts = ts.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '00:00';
  
  const dateParts = datePart.split('/');
  const timeParts = timePart.split(':');
  
  if (dateParts.length === 3) {
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    
    const hour = parseInt(timeParts[0] || '0', 10);
    const minute = parseInt(timeParts[1] || '0', 10);
    
    return new Date(year, month, day, hour, minute).getTime();
  }
  
  // If no timestamp but fallbackDate is DD/MM/YYYY
  const fallbackParts = fallbackDate.split('/');
  if (fallbackParts.length === 3) {
    const day = parseInt(fallbackParts[0], 10);
    const month = parseInt(fallbackParts[1], 10) - 1;
    const year = parseInt(fallbackParts[2], 10);
    return new Date(year, month, day, 0, 0).getTime();
  }

  // Try parsing fallback date directly
  try {
    const parsedFallback = Date.parse(fallbackDate);
    if (!isNaN(parsedFallback)) {
      return parsedFallback;
    }
  } catch (e) {}

  return 0;
};

const defaultSortComplaints = (list: Complaint[]): Complaint[] => {
  return [...list].sort((a, b) => {
    // 1. Status Priority Group: (on progress / open / baru) vs (selesai / resolved / solved)
    const getStatusGroup = (st: string): number => {
      const s = (st || '').toLowerCase();
      if (s === 'on progress' || s === 'diproses' || s === 'baru' || s === 'open') {
        return 1; // Prioritize active status
      }
      return 2; // Others (Selesai, Solved, Resolved, etc.)
    };

    const groupA = getStatusGroup(a.status);
    const groupB = getStatusGroup(b.status);

    if (groupA !== groupB) {
      return groupA - groupB; // 1 (Active) comes before 2 (Resolved)
    }

    // 2. Within the same status group, prioritize by Urgensi (Tinggi/Urgent > Sedang > Rendah)
    const getUrgencyScore = (urg: string): number => {
      const u = (urg || '').toLowerCase();
      if (u === 'tinggi' || u === 'urgent') return 3;
      if (u === 'sedang') return 2;
      if (u === 'rendah') return 1;
      return 0;
    };

    const urgScoreA = getUrgencyScore(a.urgensi);
    const urgScoreB = getUrgencyScore(b.urgensi);

    if (urgScoreA !== urgScoreB) {
      return urgScoreB - urgScoreA; // Higher score (e.g., Tinggi = 3) comes first
    }

    // 3. Within the same urgency score, prioritize by Date/Timestamp (Newest first)
    const timeA = parseTimestamp(a.timestamp, a.tanggalDiterima);
    const timeB = parseTimestamp(b.timestamp, b.tanggalDiterima);
    return timeB - timeA; // Newest first
  });
};

const cleanTargetName = (name: string): string => {
  if (!name) return '-';
  // Strip "Sekolah - ", "Sekolah-", "Guru - ", "Guru-", etc. prefix (case-insensitive)
  let cleaned = name.replace(/^(Sekolah\s*[-:]\s*|Guru\s*[-:]\s*|Siswa\s*[-:]\s*|Kantin\s*[-:]\s*)/i, '');
  return cleaned.trim() || name;
};

// Initial default database matching the user's provided screenshot and 6 additional high-fidelity cases
const DEFAULT_COMPLAINTS: Complaint[] = [
  {
    timestamp: "03/07/2026 00:04",
    tanggalDiterima: "27/06/2026",
    media: "Tatap Muka",
    namaPelapor: "Abu Aufa",
    namaSiswa: "Aufa",
    kelas: "2 Inter 1",
    tema: "Administrasi Sekolah",
    target: "Sekolah",
    namaTarget: "Al-Wildan 10 Jakarta",
    isi: "Tolong masalah waktu kepulangan, jadwal2 kegiatan penting, itu disampaikan jangan mepet2 H-1 atau pada hari H. Orang tua kerja, jadi susah untuk menyesuaikan waktu kerja mereka dengan waktu anak yang berubah-ubah.",
    urgensi: "Sedang",
    bukti: "-",
    pic: "Istiqomah",
    status: "On Progress",
    tindakan: "-",
    tanggalSelesai: "Menunggu diselesaikan",
    beritaAcara: "Tidak ada"
  },
  {
    timestamp: "04/07/2026 09:15",
    tanggalDiterima: "03/07/2026",
    media: "Form Online",
    namaPelapor: "Budi Santoso",
    namaSiswa: "Ahmad",
    kelas: "5 Inter 2",
    tema: "Fasilitas Sekolah",
    target: "Sekolah",
    namaTarget: "Al-Wildan 10 Jakarta",
    isi: "AC di kelas 5 Inter 2 kurang dingin dan sering mengeluarkan air (bocor). Anak-anak mengeluh gerah saat jam belajar siang, sehingga konsentrasi belajar menurun.",
    urgensi: "Tinggi",
    bukti: "-",
    pic: "Doni Kusuma",
    status: "On Progress",
    tindakan: "Teknisi AC sudah dijadwalkan untuk melakukan servis pada hari Sabtu besok.",
    tanggalSelesai: "Menunggu diselesaikan",
    beritaAcara: "Tidak ada"
  },
  {
    timestamp: "05/07/2026 14:22",
    tanggalDiterima: "04/07/2026",
    media: "Whatsapp",
    namaPelapor: "Siti Aminah",
    namaSiswa: "Salma",
    kelas: "3 Inter 1",
    tema: "Kurikulum & Pembelajaran",
    target: "Guru",
    namaTarget: "Ustadz Syarif",
    isi: "Materi tugas matematika untuk kelas 3 terlalu banyak dan waktu pengumpulannya sangat singkat (diberikan sore, harus dikumpul besok pagi jam 7). Mohon diberi kelonggaran waktu agar anak tidak kelelahan.",
    urgensi: "Sedang",
    bukti: "-",
    pic: "Ustadzah Fatimah",
    status: "Selesai",
    tindakan: "Sudah dikoordinasikan dengan Ustadz Syarif agar pemberian tugas maksimal 2 kali seminggu dengan tenggat minimal 3 hari.",
    tanggalSelesai: "06/07/2026",
    beritaAcara: "https://drive.google.com/file/d/ba_123"
  },
  {
    timestamp: "05/07/2026 16:40",
    tanggalDiterima: "05/07/2026",
    media: "Tatap Muka",
    namaPelapor: "Rendi Pratama",
    namaSiswa: "Rendi Pratama",
    kelas: "11 IPS 3",
    tema: "Kedisiplinan & Bullying",
    target: "Siswa",
    namaTarget: "Siswa Kelas 11",
    isi: "Terdapat aksi coret-coret loker di lorong kelas 11 IPS yang dilakukan beberapa siswa di luar jam pelajaran. Mohon CCTV lorong diperiksa untuk menegakkan kedisiplinan.",
    urgensi: "Rendah",
    bukti: "-",
    pic: "Irfan S. (Kesiswaan)",
    status: "Selesai",
    tindakan: "CCTV diperiksa, pelaku diidentifikasi dan diberikan teguran serta pembinaan tertulis. Loker telah dibersihkan kembali oleh petugas kebersihan.",
    tanggalSelesai: "07/07/2026",
    beritaAcara: "Tidak ada"
  },
  {
    timestamp: "06/07/2026 08:30",
    tanggalDiterima: "06/07/2026",
    media: "Whatsapp",
    namaPelapor: "Dewi Lestari",
    namaSiswa: "Zahra",
    kelas: "1 Inter 3",
    tema: "Kantin Sekolah",
    target: "Kantin",
    namaTarget: "Kantin Al-Wildan",
    isi: "Siswa kelas 1 mengeluhkan makanan di kantin kurang bervariasi dan porsinya terlalu sedikit untuk harga yang ditentukan. Mohon ada pengawasan kualitas menu makanan.",
    urgensi: "Sedang",
    bukti: "-",
    pic: "Humas Kantin",
    status: "Baru",
    tindakan: "-",
    tanggalSelesai: "Menunggu diselesaikan",
    beritaAcara: "Tidak ada"
  },
  {
    timestamp: "06/07/2026 11:20",
    tanggalDiterima: "05/07/2026",
    media: "Form Online",
    namaPelapor: "Irwan Kusuma",
    namaSiswa: "Farel",
    kelas: "12 IPA 1",
    tema: "Administrasi Sekolah",
    target: "Sekolah",
    namaTarget: "Keuangan Sekolah",
    isi: "Konfirmasi pembayaran SPP bulan Juli belum ter-update di portal siswa, meskipun bukti bayar sudah diunggah sejak 3 hari yang lalu. Mohon divalidasi bagian keuangan.",
    urgensi: "Sedang",
    bukti: "-",
    pic: "Siska (Keuangan)",
    status: "Selesai",
    tindakan: "Telah dilakukan verifikasi manual pada mutasi bank, data pembayaran telah di-update di portal keuangan siswa.",
    tanggalSelesai: "06/07/2026",
    beritaAcara: "Tidak ada"
  },
  {
    timestamp: "07/07/2026 10:11",
    tanggalDiterima: "07/07/2026",
    media: "Form Online",
    namaPelapor: "Ahmad Fauzi",
    namaSiswa: "Rayyan",
    kelas: "4 Inter 1",
    tema: "Keamanan & Parkir",
    target: "Sekolah",
    namaTarget: "Petugas Keamanan",
    isi: "Arus penjemputan anak sekolah saat jam pulang sangat semrawut di gerbang depan, mohon satpam lebih aktif mengatur lalu lintas agar tidak macet total di jalan raya.",
    urgensi: "Tinggi",
    bukti: "-",
    pic: "Hasan (Security)",
    status: "On Progress",
    tindakan: "Penambahan personel satpam di titik penjemputan utama serta pemasangan barikade kerucut lalu lintas sedang diuji coba.",
    tanggalSelesai: "Menunggu diselesaikan",
    beritaAcara: "Tidak ada"
  }
];

export default function App() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('siskadu_logged_in') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem('siskadu_current_user') || '';
  });
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Local Database and config states
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem('siskadu_complaints');
    return saved ? JSON.parse(saved) : DEFAULT_COMPLAINTS;
  });

  // Filter complaints so if a user ID contains "dirpen", they only see complaints with PIC containing "dirpen"
  const viewableComplaints = useMemo(() => {
    const isDirpenUser = currentUser && currentUser.toLowerCase().includes('dirpen');
    if (isDirpenUser) {
      return complaints.filter(c => c.pic && c.pic.toLowerCase().includes('dirpen'));
    }
    return complaints;
  }, [complaints, currentUser]);

  const [gasUrl, setGasUrl] = useState<string>(() => {
    const saved = localStorage.getItem('siskadu_gas_url');
    const oldDefault = 'https://script.google.com/macros/s/AKfycbzAhwycom_h0E8AtHeOM2v1jCATZRiK8sylZAcHb2mwf3BTwrNH8brT8jEOcXe4L7QC5w/exec';
    const newDefault = 'https://script.google.com/macros/s/AKfycbz55xOhfeFfwMzauCxd1_vkvOAU91rSZb07Vo99TUSYmgF5SFN9DDcKo54cBwRlVCWkww/exec';
    
    if (!saved || saved === oldDefault) {
      return newDefault;
    }
    return saved;
  });

  // UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'historis' | 'analisis_kelas' | 'analisis_tema' | 'analisis_target' | 'analisis_siswa' | 'analisis_pic'>('dashboard');
  const [selectedAnalysisClass, setSelectedAnalysisClass] = useState<string | null>(null);
  const [selectedAnalysisTema, setSelectedAnalysisTema] = useState<string | null>(null);
  const [selectedAnalysisTarget, setSelectedAnalysisTarget] = useState<string | null>(null);
  const [selectedAnalysisSiswa, setSelectedAnalysisSiswa] = useState<string | null>(null);
  const [selectedAnalysisPic, setSelectedAnalysisPic] = useState<string | null>(null);
  const [isAnalysisDropdownOpen, setIsAnalysisDropdownOpen] = useState(false);
  const [isMobileFeaturesOpen, setIsMobileFeaturesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTema, setFilterTema] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterUrgensi, setFilterUrgensi] = useState('Semua');
  
  // Advanced 14-column filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterTanggalDiterima, setFilterTanggalDiterima] = useState('Semua');
  const [filterMedia, setFilterMedia] = useState('Semua');
  const [filterNamaPelapor, setFilterNamaPelapor] = useState('');
  const [filterNamaSiswa, setFilterNamaSiswa] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterTarget, setFilterTarget] = useState('Semua');
  const [filterNamaTarget, setFilterNamaTarget] = useState('');
  const [filterIsi, setFilterIsi] = useState('');
  const [filterPic, setFilterPic] = useState('Semua');
  const [filterTindakan, setFilterTindakan] = useState('');
  const [filterTanggalSelesai, setFilterTanggalSelesai] = useState('Semua');
  
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  // New Add/Edit modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formComplaint, setFormComplaint] = useState<Complaint | null>(null);
  const [isFormSaving, setIsFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form states for resolving / editing complaint actions
  const [editAction, setEditAction] = useState({
    status: 'Baru',
    pic: '',
    tindakan: '',
    tanggalSelesai: '',
    beritaAcara: ''
  });

  // Save database to localStorage on changes
  useEffect(() => {
    localStorage.setItem('siskadu_complaints', JSON.stringify(complaints));
  }, [complaints]);

  // Save GAS URL to localStorage
  useEffect(() => {
    localStorage.setItem('siskadu_gas_url', gasUrl);
  }, [gasUrl]);

  // Sorting state
  const [sortField, setSortField] = useState<string>(''); // empty by default = use defaultSortComplaints (Requirement 6)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sync / Fetch data from Google Sheet Web App
  const fetchFromGoogleSheet = async (urlToUse = gasUrl) => {
    if (!urlToUse) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      // Append random query param to prevent caching
      const response = await fetch(`${urlToUse}?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      
      const result = await response.json();
      
      if (result && result.status === 'success' && Array.isArray(result.data)) {
        // Map keys if the headers returned are exactly matching
        const mappedData: Complaint[] = result.data.map((row: any) => ({
          timestamp: row["Timestamp"] || row["timestamp"] || new Date().toLocaleString('id-ID'),
          tanggalDiterima: row["Tanggal Laporan Diterima"] || row["tanggalDiterima"] || "",
          media: row["Media Pelaporan"] || row["media"] || "Tatap Muka",
          namaPelapor: row["Nama Pelapor"] || row["namaPelapor"] || "",
          namaSiswa: row["Nama Siswa Terkait"] || row["namaSiswa"] || "",
          kelas: row["Kelas"] || row["kelas"] || "",
          tema: row["Tema Pelaporan"] || row["tema"] || "Fasilitas Sekolah",
          target: row["Target yang Dilaporkan"] || row["target"] || "Sekolah",
          namaTarget: row["Nama Pihak yang Dilaporkan"] || row["Nama Target yang Dilaporkan"] || row["namaTarget"] || "",
          isi: row["Isi Laporan"] || row["isi"] || "",
          urgensi: row["Tingkat Urgensi"] || row["urgensi"] || "Sedang",
          bukti: row["Upload bukti pengaduan"] || row["bukti"] || "-",
          pic: row["PIC Resolusi Masalah"] || row["pic"] || "",
          status: row["Status Pelaporan"] || row["status"] || "Baru",
          tindakan: row["Tindakan Diambil"] || row["tindakan"] || "-",
          tanggalSelesai: row["Tanggal Selesai"] || row["tanggalSelesai"] || "Menunggu diselesaikan",
          beritaAcara: row["Link File Berita Acara"] || row["beritaAcara"] || "Tidak ada"
        }));

        if (mappedData.length > 0) {
          setComplaints(mappedData);
          setSyncSuccess(true);
          setTimeout(() => setSyncSuccess(false), 3000);
        } else {
          setSyncError("Data Google Sheet terbaca kosong. Pastikan header kolom baris pertama diisi dengan benar.");
        }
      } else {
        setSyncError("Format JSON tidak sesuai. Gunakan kode Apps Script yang kami sediakan.");
      }
    } catch (err: any) {
      console.error(err);
      setSyncError("Gagal terhubung ke Google Apps Script. Pastikan URL sudah benar, CORS diizinkan, dan setelan akses diatur ke 'Anyone' (Siapa Saja).");
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync data every 5 minutes
  useEffect(() => {
    if (!gasUrl) return;

    // Fetch immediately on mount or when url changes
    fetchFromGoogleSheet();

    const intervalId = setInterval(() => {
      fetchFromGoogleSheet();
    }, 5 * 60 * 1000); // 5 minutes in ms

    return () => clearInterval(intervalId);
  }, [gasUrl]);

  // Google Apps Script source code template for users to copy
  const appsScriptCode = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var isAccountRequest = (e.parameter && e.parameter.tab === "Akun") || (e.parameter && e.parameter.action === "accounts");
  
  if (isAccountRequest) {
    var sheet = ss.getSheetByName("Akun");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Tab 'Akun' tidak ditemukan di Spreadsheet Anda."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = sheet.getDataRange().getValues();
    var accounts = [];
    // Kolom A: ID (index 0), Kolom B: Password (index 1)
    for (var i = 1; i < data.length; i++) {
      var idVal = data[i][0] ? data[i][0].toString().trim() : "";
      var pwVal = data[i][1] ? data[i][1].toString().trim() : "";
      if (idVal) {
        accounts.push({ id: idVal, password: pwVal });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      type: "accounts",
      data: accounts
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var jsonArray = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j].toString().trim();
      var cellValue = row[j];
      
      // Memformat tanggal secara aman agar rapi di dashboard
      if (cellValue instanceof Date) {
        record[headerName] = Utilities.formatDate(cellValue, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
      } else {
        record[headerName] = cellValue;
      }
    }
    jsonArray.push(record);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    data: jsonArray
  }))
  .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var params;
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      params = e.parameter;
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    var action = params.action || "create";
    
    if (action === "edit" || action === "update") {
      var targetTimestamp = params.timestamp || params.Timestamp || "";
      if (targetTimestamp) {
        var data = sheet.getDataRange().getValues();
        var rowIndex = -1;
        
        for (var i = 1; i < data.length; i++) {
          var rowTimestamp;
          if (data[i][0] instanceof Date) {
            rowTimestamp = Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
          } else {
            rowTimestamp = data[i][0] ? data[i][0].toString().trim() : "";
          }
          
          if (rowTimestamp === targetTimestamp.toString().trim()) {
            rowIndex = i + 1;
            break;
          }
        }
        
        if (rowIndex !== -1) {
          for (var j = 0; j < headers.length; j++) {
            var header = headers[j].toString().trim();
            if (header === "Tanggal Laporan Diterima") {
              sheet.getRange(rowIndex, j + 1).setValue(params.tanggalDiterima || params["Tanggal Laporan Diterima"] || "");
            } else if (header === "Media Pelaporan") {
              sheet.getRange(rowIndex, j + 1).setValue(params.media || params["Media Pelaporan"] || "Form Online");
            } else if (header === "Nama Pelapor") {
              sheet.getRange(rowIndex, j + 1).setValue(params.namaPelapor || params["Nama Pelapor"] || "");
            } else if (header === "Nama Siswa Terkait") {
              sheet.getRange(rowIndex, j + 1).setValue(params.namaSiswa || params["Nama Siswa Terkait"] || "");
            } else if (header === "Kelas") {
              sheet.getRange(rowIndex, j + 1).setValue(params.kelas || params["Kelas"] || "");
            } else if (header === "Tema Pelaporan") {
              sheet.getRange(rowIndex, j + 1).setValue(params.tema || params["Tema Pelaporan"] || "");
            } else if (header === "Target yang Dilaporkan") {
              sheet.getRange(rowIndex, j + 1).setValue(params.target || params["Target yang Dilaporkan"] || "");
            } else if (header === "Nama Target yang Dilaporkan") {
              sheet.getRange(rowIndex, j + 1).setValue(params.namaTarget || params["Nama Target yang Dilaporkan"] || "");
            } else if (header === "Isi Laporan") {
              sheet.getRange(rowIndex, j + 1).setValue(params.isi || params["Isi Laporan"] || "");
            } else if (header === "Tingkat Urgensi") {
              sheet.getRange(rowIndex, j + 1).setValue(params.urgensi || params["Tingkat Urgensi"] || "Sedang");
            } else if (header === "Upload bukti pengaduan") {
              sheet.getRange(rowIndex, j + 1).setValue(params.bukti || params["Upload bukti pengaduan"] || "-");
            } else if (header === "PIC Resolusi Masalah") {
              sheet.getRange(rowIndex, j + 1).setValue(params.pic || params["PIC Resolusi Masalah"] || "-");
            } else if (header === "Status Pelaporan") {
              sheet.getRange(rowIndex, j + 1).setValue(params.status || params["Status Pelaporan"] || "Baru");
            } else if (header === "Tindakan Diambil") {
              sheet.getRange(rowIndex, j + 1).setValue(params.tindakan || params["Tindakan Diambil"] || "-");
            } else if (header === "Tanggal Selesai") {
              sheet.getRange(rowIndex, j + 1).setValue(params.tanggalSelesai || params["Tanggal Selesai"] || "Menunggu diselesaikan");
            } else if (header === "Link File Berita Acara") {
              sheet.getRange(rowIndex, j + 1).setValue(params.beritaAcara || params["Link File Berita Acara"] || "Tidak ada");
            }
          }
          return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "edit" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      action = "create";
    }
    
    if (action === "create") {
      var newRow = [];
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i].toString().trim();
        
        if (header === "Timestamp") {
          newRow.push(params.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"));
        } else if (header === "Tanggal Laporan Diterima") {
          newRow.push(params.tanggalDiterima || params["Tanggal Laporan Diterima"] || "");
        } else if (header === "Media Pelaporan") {
          newRow.push(params.media || params["Media Pelaporan"] || "Form Online");
        } else if (header === "Nama Pelapor") {
          newRow.push(params.namaPelapor || params["Nama Pelapor"] || "");
        } else if (header === "Nama Siswa Terkait") {
          newRow.push(params.namaSiswa || params["Nama Siswa Terkait"] || "");
        } else if (header === "Kelas") {
          newRow.push(params.kelas || params["Kelas"] || "");
        } else if (header === "Tema Pelaporan") {
          newRow.push(params.tema || params["Tema Pelaporan"] || "");
        } else if (header === "Target yang Dilaporkan") {
          newRow.push(params.target || params["Target yang Dilaporkan"] || "");
        } else if (header === "Nama Target yang Dilaporkan") {
          newRow.push(params.namaTarget || params["Nama Target yang Dilaporkan"] || "");
        } else if (header === "Isi Laporan") {
          newRow.push(params.isi || params["Isi Laporan"] || "");
        } else if (header === "Tingkat Urgensi") {
          newRow.push(params.urgensi || params["Tingkat Urgensi"] || "Sedang");
        } else if (header === "Upload bukti pengaduan") {
          newRow.push(params.bukti || params["Upload bukti pengaduan"] || "-");
        } else if (header === "PIC Resolusi Masalah") {
          newRow.push(params.pic || params["PIC Resolusi Masalah"] || "-");
        } else if (header === "Status Pelaporan") {
          newRow.push(params.status || params["Status Pelaporan"] || "Baru");
        } else if (header === "Tindakan Diambil") {
          newRow.push(params.tindakan || params["Tindakan Diambil"] || "-");
        } else if (header === "Tanggal Selesai") {
          newRow.push(params.tanggalSelesai || params["Tanggal Selesai"] || "Menunggu diselesaikan");
        } else if (header === "Link File Berita Acara") {
          newRow.push(params.beritaAcara || params["Link File Berita Acara"] || "Tidak ada");
        } else {
          newRow.push("");
        }
      }
      
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "create" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  // Copy code utility
  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Reset to static mock data
  const handleResetData = () => {
    if (window.confirm("Apakah Anda yakin ingin memulihkan database bawaan? Semua perubahan lokal akan terhapus.")) {
      setComplaints(DEFAULT_COMPLAINTS);
      setGasUrl('');
      localStorage.removeItem('siskadu_gas_url');
      localStorage.setItem('siskadu_complaints', JSON.stringify(DEFAULT_COMPLAINTS));
    }
  };

  // Filter unique categories/tema list dynamically
  const uniqueTemas = useMemo(() => {
    const list = viewableComplaints.map(c => c.tema);
    return ['Semua', ...Array.from(new Set(list))];
  }, [viewableComplaints]);

  // Filter unique statuses
  const uniqueStatuses = useMemo(() => {
    const list = viewableComplaints.map(c => c.status);
    return ['Semua', ...Array.from(new Set(list))];
  }, [viewableComplaints]);

  // Dynamic lists for advanced filters
  const uniqueDates = useMemo(() => {
    const list = viewableComplaints.map(c => c.tanggalDiterima).filter(Boolean);
    return ['Semua', ...Array.from(new Set(list))];
  }, [viewableComplaints]);

  const uniqueMedias = useMemo(() => {
    const list = viewableComplaints.map(c => c.media).filter(Boolean);
    return ['Semua', ...Array.from(new Set(list))];
  }, [viewableComplaints]);

  const uniqueClasses = useMemo(() => {
    const list = viewableComplaints.map(c => c.kelas).filter(Boolean);
    return ['Semua', ...Array.from(new Set(list))];
  }, [viewableComplaints]);

  const uniqueTargets = useMemo(() => {
    const list = viewableComplaints.map(c => c.target).filter(Boolean);
    return ['Semua', ...Array.from(new Set(list))];
  }, [viewableComplaints]);

  const uniquePics = useMemo(() => {
    const list = viewableComplaints.map(c => c.pic).filter(Boolean);
    return ['Semua', ...Array.from(new Set(list))];
  }, [viewableComplaints]);

  const uniqueFinishDates = useMemo(() => {
    const list = viewableComplaints.map(c => c.tanggalSelesai).filter(Boolean);
    return ['Semua', ...Array.from(new Set(list))];
  }, [viewableComplaints]);

  // Filter complaints based on Search query & Dropdown selections (covers 14 columns)
  const filteredComplaints = useMemo(() => {
    return viewableComplaints.filter(c => {
      // General search query matches several text columns
      const matchSearch = 
        searchQuery === '' ||
        (c.namaPelapor?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.namaSiswa?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.isi?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.namaTarget?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchTema = filterTema === 'Semua' || c.tema === filterTema;
      const matchStatus = filterStatus === 'Semua' || c.status === filterStatus;
      const matchUrgensi = filterUrgensi === 'Semua' || c.urgensi === filterUrgensi;

      // New columns filters
      const matchTanggalDiterima = filterTanggalDiterima === 'Semua' || c.tanggalDiterima === filterTanggalDiterima;
      const matchMedia = filterMedia === 'Semua' || c.media === filterMedia;
      const matchNamaPelapor = filterNamaPelapor === '' || (c.namaPelapor?.toLowerCase() || '').includes(filterNamaPelapor.toLowerCase());
      const matchNamaSiswa = filterNamaSiswa === '' || (c.namaSiswa?.toLowerCase() || '').includes(filterNamaSiswa.toLowerCase());
      const matchKelas = filterKelas === 'Semua' || c.kelas === filterKelas;
      const matchTarget = filterTarget === 'Semua' || c.target === filterTarget;
      const matchNamaTarget = filterNamaTarget === '' || (c.namaTarget?.toLowerCase() || '').includes(filterNamaTarget.toLowerCase());
      const matchIsi = filterIsi === '' || (c.isi?.toLowerCase() || '').includes(filterIsi.toLowerCase());
      const matchPic = filterPic === 'Semua' || c.pic === filterPic;
      const matchTindakan = filterTindakan === '' || (c.tindakan?.toLowerCase() || '').includes(filterTindakan.toLowerCase());
      const matchTanggalSelesai = filterTanggalSelesai === 'Semua' || c.tanggalSelesai === filterTanggalSelesai;

      return matchSearch && matchTema && matchStatus && matchUrgensi &&
             matchTanggalDiterima && matchMedia && matchNamaPelapor && matchNamaSiswa &&
             matchKelas && matchTarget && matchNamaTarget && matchIsi &&
             matchPic && matchTindakan && matchTanggalSelesai;
    });
  }, [
    viewableComplaints, searchQuery, filterTema, filterStatus, filterUrgensi,
    filterTanggalDiterima, filterMedia, filterNamaPelapor, filterNamaSiswa,
    filterKelas, filterTarget, filterNamaTarget, filterIsi,
    filterPic, filterTindakan, filterTanggalSelesai
  ]);

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        // Reset to default sorting order
        setSortField('');
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered and sorted complaints to render on the tables
  const filteredAndSortedComplaints = useMemo(() => {
    let result = [...filteredComplaints];

    if (!sortField) {
      // Default Sort (Requirement 6)
      return defaultSortComplaints(result);
    }

    // Explicit sorting when column is clicked (Requirement 5)
    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'tanggal':
          valA = parseTimestamp(a.timestamp, a.tanggalDiterima);
          valB = parseTimestamp(b.timestamp, b.tanggalDiterima);
          break;
        case 'media':
          valA = (a.media || '').toLowerCase();
          valB = (b.media || '').toLowerCase();
          break;
        case 'pelapor':
          valA = (a.namaPelapor || '').toLowerCase();
          valB = (b.namaPelapor || '').toLowerCase();
          break;
        case 'siswa':
          valA = (a.namaSiswa || '').toLowerCase();
          valB = (b.namaSiswa || '').toLowerCase();
          break;
        case 'target':
          valA = (a.target || '').toLowerCase() + ' ' + (a.namaTarget || '').toLowerCase();
          valB = (b.target || '').toLowerCase() + ' ' + (b.namaTarget || '').toLowerCase();
          break;
        case 'urgensi':
          const getUrgencyScore = (urg: string): number => {
            const u = (urg || '').toLowerCase();
            if (u === 'tinggi' || u === 'urgent') return 3;
            if (u === 'sedang') return 2;
            if (u === 'rendah') return 1;
            return 0;
          };
          valA = getUrgencyScore(a.urgensi);
          valB = getUrgencyScore(b.urgensi);
          break;
        case 'pic':
          valA = (a.pic || '').toLowerCase();
          valB = (b.pic || '').toLowerCase();
          break;
        case 'status':
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
          break;
        case 'tindakan':
          valA = (a.tindakan || '').toLowerCase();
          valB = (b.tindakan || '').toLowerCase();
          break;
        default:
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredComplaints, sortField, sortOrder]);

  // Calculate high-density KPI metrics from current active (filtered) data vs all data
  const metrics = useMemo(() => {
    const total = viewableComplaints.length;
    const onProgress = viewableComplaints.filter(c => {
      const st = (c.status || '').toLowerCase();
      return st === 'on progress' || st === 'diproses' || st === 'baru' || st === 'open';
    }).length;
    
    // Resolved metrics includes Selesai, Solved, and Resolved (Requirement 3)
    const resolved = viewableComplaints.filter(c => {
      const st = (c.status || '').toLowerCase();
      return st === 'selesai' || st === 'solved' || st === 'resolved';
    }).length;

    const highUrgency = viewableComplaints.filter(c => {
      const urg = (c.urgensi || '').toLowerCase();
      const st = (c.status || '').toLowerCase();
      const isHigh = urg === 'tinggi' || urg === 'urgent';
      const isActive = st === 'on progress' || st === 'diproses' || st === 'baru' || st === 'open';
      return isHigh && isActive;
    }).length;
    const resolveRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : "0.0";
    
    return {
      total,
      onProgress,
      resolved,
      highUrgency,
      resolveRate
    };
  }, [viewableComplaints]);

  // Calculate dynamic theme categories distributions for Sidebar progress bars
  const categoryStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    viewableComplaints.forEach(c => {
      counts[c.tema] = (counts[c.tema] || 0) + 1;
    });

    const total = viewableComplaints.length || 1;
    return Object.entries(counts).map(([name, count]) => {
      const percentage = Math.round((count / total) * 100);
      return { name, count, percentage };
    }).sort((a, b) => b.count - a.count);
  }, [viewableComplaints]);

  // Calculate reporting media distribution for custom visual bars
  const mediaStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    viewableComplaints.forEach(c => {
      counts[c.media] = (counts[c.media] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [viewableComplaints]);

  // Calculate monthly trend of reports based on received date
  const trendStats = useMemo(() => {
    const groups: { [key: string]: { label: string; count: number; sortKey: string } } = {};
    
    viewableComplaints.forEach(c => {
      let label = 'Lainnya';
      let sortKey = '0000-00';
      
      const dateStr = c.tanggalDiterima;
      if (dateStr && dateStr !== '-') {
        // Try split by '/' (DD/MM/YYYY)
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          const year = parts[2].trim();
          if (monthIdx >= 0 && monthIdx < 12) {
            label = `${indonesianMonths[monthIdx]} ${year}`;
            const mStr = (monthIdx + 1).toString().padStart(2, '0');
            sortKey = `${year}-${mStr}`;
          }
        } else {
          // Try split by '-' (YYYY-MM-DD or DD-MM-YYYY)
          const dashParts = dateStr.split('-');
          if (dashParts.length === 3) {
            if (dashParts[0].length === 4) { // YYYY-MM-DD
              const year = dashParts[0];
              const monthIdx = parseInt(dashParts[1], 10) - 1;
              if (monthIdx >= 0 && monthIdx < 12) {
                label = `${indonesianMonths[monthIdx]} ${year}`;
                const mStr = (monthIdx + 1).toString().padStart(2, '0');
                sortKey = `${year}-${mStr}`;
              }
            } else { // DD-MM-YYYY
              const monthIdx = parseInt(dashParts[1], 10) - 1;
              const year = dashParts[2].split('T')[0];
              if (monthIdx >= 0 && monthIdx < 12) {
                label = `${indonesianMonths[monthIdx]} ${year}`;
                const mStr = (monthIdx + 1).toString().padStart(2, '0');
                sortKey = `${year}-${mStr}`;
              }
            }
          } else {
            // Try standard Date parsing as fallback
            try {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                label = `${indonesianMonths[d.getMonth()]} ${d.getFullYear()}`;
                const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
                sortKey = `${d.getFullYear()}-${mStr}`;
              }
            } catch(e) {}
          }
        }
      }
      
      if (!groups[sortKey]) {
        groups[sortKey] = { label, count: 0, sortKey };
      }
      groups[sortKey].count += 1;
    });

    // Sort chronologically by sortKey
    return Object.values(groups)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(g => ({ date: g.label, count: g.count }))
      .slice(-7); // Keep last 7 months
  }, [viewableComplaints]);

  // Aggregated data for class analysis page
  const classAnalysisStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    viewableComplaints.forEach(c => {
      const key = c.kelas || 'Tanpa Kelas';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = viewableComplaints.length || 1;
    return Object.entries(counts).map(([name, count]) => {
      const percentage = Math.round((count / total) * 100);
      return { name, count, percentage };
    }).sort((a, b) => b.count - a.count);
  }, [viewableComplaints]);

  // Aggregated data for theme analysis page
  const temaAnalysisStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    viewableComplaints.forEach(c => {
      const key = c.tema || 'Tanpa Tema';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = viewableComplaints.length || 1;
    return Object.entries(counts).map(([name, count]) => {
      const percentage = Math.round((count / total) * 100);
      return { name, count, percentage };
    }).sort((a, b) => b.count - a.count);
  }, [viewableComplaints]);

  // Aggregated data for target analysis page
  const targetAnalysisStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    viewableComplaints.forEach(c => {
      const key = cleanTargetName(c.namaTarget || c.target);
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = viewableComplaints.length || 1;
    return Object.entries(counts).map(([name, count]) => {
      const percentage = Math.round((count / total) * 100);
      return { name, count, percentage };
    }).sort((a, b) => b.count - a.count);
  }, [viewableComplaints]);

  // Aggregated data for student analysis page
  const siswaAnalysisStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    viewableComplaints.forEach(c => {
      const key = c.namaSiswa || 'Tanpa Nama Siswa';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = viewableComplaints.length || 1;
    return Object.entries(counts).map(([name, count]) => {
      const percentage = Math.round((count / total) * 100);
      return { name, count, percentage };
    }).sort((a, b) => b.count - a.count);
  }, [viewableComplaints]);

  // Aggregated data for PIC analysis page
  const picAnalysisStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    viewableComplaints.forEach(c => {
      const key = c.pic && c.pic !== '-' ? c.pic : 'Belum Ditentukan';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = viewableComplaints.length || 1;
    return Object.entries(counts).map(([name, count]) => {
      const percentage = Math.round((count / total) * 100);
      return { name, count, percentage };
    }).sort((a, b) => b.count - a.count);
  }, [viewableComplaints]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = loginId.trim();
    const passwordClean = loginPassword;

    if (!idClean || !passwordClean) {
      setLoginError('Harap masukkan ID dan Password.');
      return;
    }

    if (gasUrl) {
      setIsLoggingIn(true);
      setLoginError('');
      try {
        // COR-safe: No custom headers are sent to completely prevent preflight OPTIONS requests, which often fail in Google Apps Script.
        const response = await fetch(`${gasUrl}?action=accounts&_t=${Date.now()}`, {
          method: 'GET',
          mode: 'cors'
        });
        
        const result = await response.json();
        
        // 1. Success: Accounts list was retrieved correctly
        if (result && result.status === 'success' && result.type === 'accounts' && Array.isArray(result.data)) {
          const match = result.data.find((acc: any) => {
            return acc && acc.id && acc.password &&
                   acc.id.toString().trim().toLowerCase() === idClean.toLowerCase() &&
                   acc.password.toString().trim() === passwordClean;
          });

          if (match) {
            setIsLoggedIn(true);
            setCurrentUser(idClean);
            localStorage.setItem('siskadu_logged_in', 'true');
            localStorage.setItem('siskadu_current_user', idClean);
            setLoginError('');
            setIsLoggingIn(false);
            return;
          } else {
            setLoginError('ID atau Password salah. (Divalidasi menggunakan data Google Sheets tab "Akun").');
            setIsLoggingIn(false);
            return;
          }
        } 
        
        // 2. Apps Script returned error (e.g. missing "Akun" sheet)
        if (result && result.status === 'error') {
          setLoginError(`Gagal Login: ${result.message || 'Terjadi kesalahan pada Google Sheets.'} (Pastikan tab bernama "Akun" sudah dibuat)`);
          setIsLoggingIn(false);
          return;
        }

        // 3. Old Apps Script is running (it returns success with the complaints list data but type is not "accounts")
        const isOldScript = result && result.status === 'success' && result.type !== 'accounts';
        if (isOldScript) {
          setLoginError('Google Apps Script Anda terdeteksi menggunakan VERSI LAMA. Harap buka menu integrasi (ikon sheet hijau di kanan atas), salin kode Apps Script terbaru, dan lakukan "Deploy Ulang" (pilih New Deployment / Penerapan Baru) di Google Sheets agar tab "Akun" dapat dibaca.');
          setIsLoggingIn(false);
          return;
        }

        // 4. Fallback for any other unexpected response format
        setLoginError('Gagal memproses data akun dari Google Sheets. Silakan pastikan Anda telah memasang Apps Script terbaru dan menyebarkannya.');
        setIsLoggingIn(false);
        return;

      } catch (err) {
        console.error("Login verification fetch error", err);
        setLoginError('Koneksi gagal atau Spreadsheet tidak dapat diakses (CORS / Salah URL). Pastikan perangkat Anda terhubung ke internet untuk dapat melakukan login.');
        setIsLoggingIn(false);
        return;
      }
    } else {
      setLoginError('Sistem belum terhubung to Google Sheets. Silakan hubungkan Google Sheets terlebih dahulu.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser('');
    localStorage.removeItem('siskadu_logged_in');
    localStorage.removeItem('siskadu_current_user');
    setLoginId('');
    setLoginPassword('');
  };

  // Select complaint and pre-populate edit states
  const handleSelectComplaint = (comp: Complaint) => {
    setSelectedComplaint(comp);
    setEditAction({
      status: comp.status,
      pic: comp.pic !== '-' ? comp.pic : '',
      tindakan: comp.tindakan !== '-' ? comp.tindakan : '',
      tanggalSelesai: comp.tanggalSelesai !== 'Menunggu diselesaikan' ? comp.tanggalSelesai : '',
      beritaAcara: comp.beritaAcara !== 'Tidak ada' ? comp.beritaAcara : ''
    });
  };

  // Save resolution/edit state update
  const handleUpdateComplaintStatus = () => {
    if (!selectedComplaint) return;

    const updated = complaints.map(c => {
      if (c.timestamp === selectedComplaint.timestamp && c.namaPelapor === selectedComplaint.namaPelapor) {
        const isSelesai = editAction.status === 'Selesai';
        const todayStr = new Date().toLocaleDateString('id-ID');
        return {
          ...c,
          status: editAction.status,
          pic: editAction.pic || 'Admin Utama',
          tindakan: editAction.tindakan || '-',
          tanggalSelesai: isSelesai ? (editAction.tanggalSelesai || todayStr) : 'Menunggu diselesaikan',
          beritaAcara: editAction.beritaAcara || 'Tidak ada'
        };
      }
      return c;
    });

    setComplaints(updated);
    
    // Close modal / refresh active selected
    const refreshed = updated.find(c => c.timestamp === selectedComplaint.timestamp && c.namaPelapor === selectedComplaint.namaPelapor);
    setSelectedComplaint(refreshed || null);
  };

  const handleOpenAddModal = () => {
    setFormMode('add');
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    setFormComplaint({
      timestamp: `${formattedDate} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`,
      tanggalDiterima: formattedDate,
      media: 'Form Online',
      namaPelapor: '',
      namaSiswa: '',
      kelas: '',
      tema: 'Fasilitas Sekolah',
      target: 'Sekolah',
      namaTarget: '',
      isi: '',
      urgensi: 'Sedang',
      bukti: '-',
      pic: '',
      status: 'Baru',
      tindakan: '-',
      tanggalSelesai: 'Menunggu diselesaikan',
      beritaAcara: 'Tidak ada'
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (comp: Complaint) => {
    setFormMode('edit');
    setFormComplaint({ ...comp });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComplaint) return;

    setIsFormSaving(true);
    setFormError(null);

    try {
      let updatedComplaints = [...complaints];
      
      // Validation
      if (!formComplaint.namaPelapor.trim()) {
        throw new Error("Nama Pelapor tidak boleh kosong.");
      }
      if (!formComplaint.namaSiswa.trim()) {
        throw new Error("Nama Siswa tidak boleh kosong.");
      }
      if (!formComplaint.isi.trim()) {
        throw new Error("Isi Laporan tidak boleh kosong.");
      }

      const savedData = { ...formComplaint };
      if (formMode === 'add') {
        updatedComplaints = [savedData, ...updatedComplaints];
      } else {
        updatedComplaints = updatedComplaints.map(c => 
          c.timestamp === savedData.timestamp ? savedData : c
        );
      }

      setComplaints(updatedComplaints);
      localStorage.setItem('siskadu_complaints', JSON.stringify(updatedComplaints));

      if (gasUrl) {
        const payload = {
          ...savedData,
          action: formMode === 'add' ? 'create' : 'edit'
        };

        // Call background endpoint
        await fetch(gasUrl, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          }
        });

        // Trigger a fresh fetch in background to make sure local matches sheet
        setTimeout(() => {
          fetchFromGoogleSheet();
        }, 1500);
      }

      setIsFormOpen(false);
      setFormComplaint(null);
      
      if (selectedComplaint && selectedComplaint.timestamp === savedData.timestamp) {
        setSelectedComplaint(savedData);
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Gagal sinkronisasi Google Sheet, tetapi data telah disimpan secara lokal.");
    } finally {
      setIsFormSaving(false);
    }
  };

  // Helper styles for Urgency level badge
  const getUrgencyStyles = (urg: string) => {
    switch (urg.toLowerCase()) {
      case 'tinggi':
      case 'urgent':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'sedang':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'rendah':
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  // Helper styles for Status level badge (Requirement 3)
  const getStatusDot = (st: string) => {
    switch (st.toLowerCase()) {
      case 'selesai':
      case 'solved':
      case 'resolved':
        return 'bg-emerald-500';
      case 'on progress':
      case 'diproses':
      case 'baru':
      case 'open':
      default:
        return 'bg-amber-500';
    }
  };

  if (!isLoggedIn) {
    return (
      <div id="login-page" className="flex items-center justify-center min-h-screen w-full bg-slate-900 font-sans p-4">
        <div className="w-full max-w-md bg-slate-800 text-white p-8 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden">
          {/* Decorative ambient gradient */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">SISKADU</h2>
            <p className="text-xs text-slate-400">Sistem Informasi Keluhan Terpadu v2.2</p>
            <p className="text-xs text-slate-400 font-medium">Al-Wildan 10 Jakarta</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">ID Pengguna</label>
              <input
                type="text"
                required
                placeholder="Masukkan ID Pengguna..."
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="Masukkan Password..."
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {loginError && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-200 text-xs py-2.5 px-3 rounded-lg text-center font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className={`w-full text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center gap-2 mt-2 ${isLoggingIn ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Memverifikasi Akun...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Masuk ke Dashboard
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
            <span className="text-[10px] text-slate-500 font-medium block">
              Dikelola oleh Tim Manajemen Al-Wildan 10 Jakarta
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="siskadu-app" className="flex flex-col h-screen w-full bg-slate-50 font-sans overflow-hidden">
      
      {/* Top Navigation Header */}
      <header id="app-header" className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-extrabold shadow-sm">S</div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-800 leading-none">SISKADU <span className="text-slate-400 font-normal text-xs ml-1">| Sistem Keluhan Terpadu v2.2</span></h1>
            <p className="text-[10px] text-slate-500 leading-normal hidden md:block">Dashboard Pemantauan & Analisis Pengaduan Sekolah</p>
          </div>
        </div>

        {/* Action Buttons & Integration Indicators */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Input Laporan Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] md:text-xs font-bold transition-all shadow-xs cursor-pointer border border-blue-500/10 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 animate-pulse" />
            <span>Input Laporan</span>
          </button>

          {/* Connection Status Badge */}
          <button 
            id="connection-badge-btn"
            onClick={() => setIsSetupOpen(true)}
            className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
              gasUrl 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${gasUrl ? 'bg-emerald-500' : 'bg-rose-500'}`} title={gasUrl ? 'Live: Google Sheets' : 'Offline: Local Database'}></div>
            <span className="text-[10px] md:text-xs hidden md:inline">
              {gasUrl ? 'Live: Google Sheets' : 'Offline: Local Database'}
            </span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
          </button>

          {/* Quick Setup Trigger */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2 md:pl-4">
            <button
              id="setup-gas-btn"
              onClick={() => setIsSetupOpen(true)}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 title-setup cursor-pointer"
              title="Hubungkan Google Sheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              id="refresh-btn"
              disabled={isSyncing || !gasUrl}
              onClick={() => fetchFromGoogleSheet()}
              className={`p-1.5 hover:bg-slate-100 rounded text-slate-600 cursor-pointer ${isSyncing ? 'animate-spin' : ''} ${!gasUrl ? 'opacity-40 cursor-not-allowed' : ''}`}
              title="Refresh / Sync Data"
            >
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-header */}
      <div id="sub-header-nav" className="bg-slate-800 text-white flex items-center px-4 md:px-6 shrink-0 h-11 border-b border-slate-700 justify-between z-20 overflow-visible">
        
        {/* Mobile View: Features Dropdown + Logout */}
        <div className="flex md:hidden items-center justify-between gap-2.5 w-full">
          {currentUser && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded border border-slate-600/40 text-[10px] font-bold text-slate-300 max-w-[80px]" title={`User: ${currentUser}`}>
              <User className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">{currentUser}</span>
            </div>
          )}
          <div className="relative flex-1">
            <button
              onClick={() => setIsMobileFeaturesOpen(!isMobileFeaturesOpen)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-md flex items-center justify-between text-xs font-bold transition-all border border-slate-600 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Menu className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate">
                  Features: {
                    activeTab === 'dashboard' ? 'Dashboard' :
                    activeTab === 'historis' ? 'Historis & Filter' :
                    activeTab === 'analisis_kelas' ? 'Analisis Kelas' :
                    activeTab === 'analisis_tema' ? 'Analisis Tema' :
                    activeTab === 'analisis_target' ? 'Analisis Target' :
                    activeTab === 'analisis_siswa' ? 'Analisis Siswa' :
                    activeTab === 'analisis_pic' ? 'Analisis PIC' : 'Menu'
                  }
                </span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isMobileFeaturesOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMobileFeaturesOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsMobileFeaturesOpen(false)}
                />
                <div className="absolute top-[100%] left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-80 overflow-y-auto">
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsMobileFeaturesOpen(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-left transition-colors cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-sky-400" />
                    <span>Dashboard Pemantauan</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('historis');
                      setIsMobileFeaturesOpen(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-left transition-colors cursor-pointer ${
                      activeTab === 'historis'
                        ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Historis Pengaduan ({viewableComplaints.length})</span>
                  </button>

                  <div className="border-t border-slate-800 my-1"></div>
                  <div className="px-4 py-1 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Analisis Detail
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('analisis_kelas');
                      setIsMobileFeaturesOpen(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-left transition-colors cursor-pointer pl-6 ${
                      activeTab === 'analisis_kelas'
                        ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Analisis Kelas</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('analisis_tema');
                      setIsMobileFeaturesOpen(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-left transition-colors cursor-pointer pl-6 ${
                      activeTab === 'analisis_tema'
                        ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>Analisis Tema</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('analisis_target');
                      setIsMobileFeaturesOpen(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-left transition-colors cursor-pointer pl-6 ${
                      activeTab === 'analisis_target'
                        ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Target className="w-4 h-4 text-rose-400" />
                    <span>Analisis Target</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('analisis_siswa');
                      setIsMobileFeaturesOpen(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-left transition-colors cursor-pointer pl-6 ${
                      activeTab === 'analisis_siswa'
                        ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-400" />
                    <span>Analisis Siswa</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('analisis_pic');
                      setIsMobileFeaturesOpen(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-left transition-colors cursor-pointer pl-6 ${
                      activeTab === 'analisis_pic'
                        ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>Analisis PIC</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 text-xs font-bold rounded-md transition-colors border border-red-500/20 cursor-pointer shrink-0"
            title="Keluar dari Sistem"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>

        {/* Desktop View: Full horizontal navigation & dropdown */}
        <div className="hidden md:flex gap-1 h-full items-end min-w-max">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 h-full flex items-center gap-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-blue-400 text-blue-400 bg-slate-700/50'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Dashboard Pemantauan
          </button>
          <button
            onClick={() => setActiveTab('historis')}
            className={`px-4 h-full flex items-center gap-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'historis'
                ? 'border-blue-400 text-blue-400 bg-slate-700/50'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <Clock className="w-4 h-4" />
            Historis Pengaduan & Filter ({viewableComplaints.length})
          </button>
          {/* Dropdown Halaman Analisis */}
          <div className="relative h-full flex items-center">
            <button
              onClick={() => setIsAnalysisDropdownOpen(!isAnalysisDropdownOpen)}
              className={`px-4 h-full flex items-center gap-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                ['analisis_kelas', 'analisis_tema', 'analisis_target', 'analisis_siswa', 'analisis_pic'].includes(activeTab)
                  ? 'border-blue-400 text-blue-400 bg-slate-700/50'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <span>
                  {activeTab === 'analisis_kelas' && 'Analisis Kelas'}
                  {activeTab === 'analisis_tema' && 'Analisis Tema'}
                  {activeTab === 'analisis_target' && 'Analisis Target'}
                  {activeTab === 'analisis_siswa' && 'Analisis Siswa'}
                  {activeTab === 'analisis_pic' && 'Analisis PIC'}
                  {!['analisis_kelas', 'analisis_tema', 'analisis_target', 'analisis_siswa', 'analisis_pic'].includes(activeTab) && 'Halaman Analisis'}
                </span>
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isAnalysisDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
 
             {isAnalysisDropdownOpen && (
               <>
                 <div 
                   className="fixed inset-0 z-40 cursor-default" 
                   onClick={() => setIsAnalysisDropdownOpen(false)}
                 />
                 <div className="absolute top-[100%] left-0 mt-1 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                   <button
                     onClick={() => {
                       setActiveTab('analisis_kelas');
                       setIsAnalysisDropdownOpen(false);
                     }}
                     className={`w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                       activeTab === 'analisis_kelas'
                         ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                         : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                     }`}
                   >
                     <Users className="w-4 h-4 text-emerald-400" />
                     <span>Analisis Kelas</span>
                   </button>
                   <button
                     onClick={() => {
                       setActiveTab('analisis_tema');
                       setIsAnalysisDropdownOpen(false);
                     }}
                     className={`w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                       activeTab === 'analisis_tema'
                         ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                         : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                     }`}
                   >
                     <BookOpen className="w-4 h-4 text-purple-400" />
                     <span>Analisis Tema</span>
                   </button>
                   <button
                     onClick={() => {
                       setActiveTab('analisis_target');
                       setIsAnalysisDropdownOpen(false);
                     }}
                     className={`w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                       activeTab === 'analisis_target'
                         ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                         : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                     }`}
                   >
                     <Target className="w-4 h-4 text-rose-400" />
                     <span>Analisis Target</span>
                   </button>
                   <button
                     onClick={() => {
                       setActiveTab('analisis_siswa');
                       setIsAnalysisDropdownOpen(false);
                     }}
                     className={`w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                       activeTab === 'analisis_siswa'
                         ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                         : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                     }`}
                   >
                     <User className="w-4 h-4 text-amber-400" />
                     <span>Analisis Siswa</span>
                   </button>
                   <button
                     onClick={() => {
                       setActiveTab('analisis_pic');
                       setIsAnalysisDropdownOpen(false);
                     }}
                     className={`w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                       activeTab === 'analisis_pic'
                         ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-400'
                         : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                     }`}
                   >
                     <UserCheck className="w-4 h-4 text-cyan-400" />
                     <span>Analisis PIC</span>
                   </button>
                 </div>
               </>
             )}
           </div>
         </div>
         
         <div className="hidden md:flex items-center justify-end gap-4">
           {currentUser && (
             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded text-slate-700 text-xs font-bold border border-slate-200 shadow-3xs" title={`User: ${currentUser}`}>
               <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
               <span className="truncate max-w-[120px]">{currentUser}</span>
             </div>
           )}
           <div className="text-[10px] text-slate-400 hidden lg:block">
             Sistem Informasi Sekolah Terintegrasi (Google Form & Sheet)
           </div>
           <button
             onClick={handleLogout}
             className="flex items-center justify-center gap-1.5 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 text-[11px] font-bold rounded-md transition-colors border border-red-500/20 cursor-pointer"
             title="Keluar dari Sistem"
           >
             <LogOut className="w-3.5 h-3.5" />
             <span>Keluar</span>
           </button>
         </div>
       </div>

      {/* Main Container Area */}
      <main id="main-content" className="flex-1 p-4 md:p-5 gap-4 md:gap-5 flex flex-col min-h-0 overflow-y-auto">
        
        {activeTab === 'dashboard' ? (
          <>
            {/* KPI Scorecard Grid */}
            <div id="kpi-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 shrink-0">
              
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Pengaduan</p>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800">{metrics.total}</h2>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500">Semua Masukan</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">Aktif</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dalam Proses</p>
                  <h2 className="text-xl md:text-2xl font-black text-amber-600">{metrics.onProgress}</h2>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500">Kapasitas Selesaikan</span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">Tindak Lanjut</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resolved (Selesai)</p>
                  <h2 className="text-xl md:text-2xl font-black text-emerald-600">{metrics.resolved}</h2>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500">Rasio Penyelesaian</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">{metrics.resolveRate}% Rate</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Urgensi Tinggi</p>
                  <h2 className="text-xl md:text-2xl font-black text-red-600">{metrics.highUrgency}</h2>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500">Harus Prioritas</span>
                  <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded">Atensi Khusus</span>
                </div>
              </div>
              
            </div>

            {/* Dashboard Split View: Left Recent Complaints & Right Analytics Sidebar */}
            <div id="content-body" className="flex flex-col lg:flex-row gap-4 md:gap-5 flex-1 min-h-0">
              
              {/* LEFT: Recent Complaints Summary */}
              <div className="flex-[2] bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-700 text-xs md:text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    Atensi Utama & Pengaduan Terbaru (5 Teratas)
                  </h3>
                  <button
                    onClick={() => setActiveTab('historis')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    Buka Historis Lengkap
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                      <tr className="text-slate-500 font-bold">
                        <th className="px-4 py-2.5 font-semibold">TANGGAL LAPORAN</th>
                        <th className="px-4 py-2.5 font-semibold">PELAPOR</th>
                        <th className="px-4 py-2.5 font-semibold">SISWA (KELAS)</th>
                        <th className="px-4 py-2.5 font-semibold">TEMA & TARGET</th>
                        <th className="px-4 py-2.5 font-semibold text-center">URGENSI</th>
                        <th className="px-4 py-2.5 font-semibold">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {complaints.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            Tidak ada data pengaduan ditemukan.
                          </td>
                        </tr>
                      ) : (
                        defaultSortComplaints(complaints).slice(0, 5).map((comp, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => handleSelectComplaint(comp)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-700">{formatToIndonesianDate(comp.tanggalDiterima)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{comp.namaPelapor}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{comp.namaSiswa}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{comp.kelas}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-700 truncate max-w-[150px]">{comp.tema}</p>
                              <p className="text-[9px] text-slate-500 font-bold truncate" title={comp.namaTarget || comp.target}>
                                {cleanTargetName(comp.namaTarget || comp.target)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getUrgencyStyles(comp.urgensi)}`}>
                                {comp.urgensi}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${getStatusDot(comp.status)}`}></span>
                                <span className="font-bold text-slate-700">{comp.status}</span>
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
                  <span>Klik pada pengaduan untuk melihat rincian detail penanganan pengaduan.</span>
                </div>
              </div>

              {/* RIGHT: Stats & Charts Breakdown Sidebar */}
              <div className="flex-1 flex flex-col gap-4 md:gap-5 shrink-0 lg:w-[320px]">
                
                {/* Category Distribution (Tema Pelaporan) */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Distribusi Kategori</h3>
                  <div className="space-y-2.5">
                    {categoryStats.length === 0 ? (
                      <p className="text-xs text-slate-400">Tidak ada data distribusi</p>
                    ) : (
                      categoryStats.slice(0, 4).map((cat, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-600 font-medium truncate max-w-[180px]">{cat.name}</span>
                            <span className="font-bold text-slate-800">{cat.count} ({cat.percentage}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${cat.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Visual Media Reporting Channels */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Media Pelaporan</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {mediaStats.map((ms, idx) => {
                      const maxCount = Math.max(...mediaStats.map(m => m.count)) || 1;
                      const pct = Math.max(15, Math.round((ms.count / maxCount) * 100));
                      return (
                        <div key={idx} className="flex flex-col items-center justify-end bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="w-full h-12 flex items-end justify-center mb-1 bg-white rounded border border-slate-100 overflow-hidden relative">
                            <div 
                              className="bg-amber-500 w-6 rounded-t transition-all duration-500"
                              style={{ height: `${pct}%` }}
                            ></div>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-800">
                              {ms.count}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 truncate w-full uppercase">
                            {ms.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weekly Reporting Trend */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex-1 flex flex-col">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Tren Bulan Laporan</h3>
                  
                  <div className="flex-1 flex items-end justify-between gap-1.5 h-[110px] mt-2 px-1">
                    {trendStats.map((tr, idx) => {
                      const maxCount = Math.max(...trendStats.map(t => t.count)) || 1;
                      const pct = Math.max(10, Math.round((tr.count / maxCount) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Static number clearly visible above the bar */}
                          <span className="text-[10px] font-black text-blue-600 transition-colors group-hover:text-blue-800">
                            {tr.count}
                          </span>
                          <div className="w-full bg-slate-100 rounded-t-sm h-14 flex items-end justify-center">
                            <div 
                              className="bg-blue-600 rounded-t-sm w-full transition-all duration-500 hover:bg-blue-700" 
                              style={{ height: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 mt-1 whitespace-nowrap">
                            {tr.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 text-center italic font-medium">
                    Statistik sebaran pengaduan dari seluruh kanal.
                  </p>
                </div>

              </div>

            </div>
          </>
        ) : activeTab === 'historis' ? (
          /* HISTORIS PENGADUAN VIEW (Contains filters and full historical table list) */
          <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
            
            {/* Table Header with Search and Multi-Filters */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-slate-700 text-xs md:text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Penyaringan Historis Pengaduan ({filteredComplaints.length} dari {complaints.length})
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button 
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`px-2.5 py-1 text-[10px] font-bold border rounded transition flex items-center gap-1 cursor-pointer ${showAdvancedFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    <Filter className="w-3 h-3 text-blue-600" />
                    {showAdvancedFilters ? 'Sembunyikan Filter Lanjutan' : 'Tampilkan 14 Filter Lanjutan'}
                  </button>
                  <button 
                    onClick={handleResetData}
                    className="px-2.5 py-1 text-[10px] font-bold text-slate-500 border border-slate-200 rounded hover:bg-slate-100 transition cursor-pointer"
                  >
                    Reset Lokal
                  </button>
                  {gasUrl && (
                    <button 
                      onClick={() => fetchFromGoogleSheet()}
                      className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Ambil Ulang Sheet
                    </button>
                  )}
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                
                {/* Search Bar */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari Pelapor, Siswa, Laporan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                {/* Filter Urgensi */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2">
                  <AlertTriangle className="w-3 h-3 text-slate-400 shrink-0" />
                  <select
                    value={filterUrgensi}
                    onChange={(e) => setFilterUrgensi(e.target.value)}
                    className="w-full bg-transparent py-1.5 focus:outline-hidden text-xs text-slate-700 cursor-pointer"
                  >
                    <option value="Semua">Urgensi: Semua</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>

              </div>

              {/* Advanced Filters Panel (Covers 14 specific columns) */}
              {showAdvancedFilters && (
                <div className="p-3 bg-slate-100 rounded border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] transition-all">
                  
                  {/* Tanggal Laporan Diterima */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Diterima</label>
                    <select
                      value={filterTanggalDiterima}
                      onChange={(e) => setFilterTanggalDiterima(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      {uniqueDates.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Media Pelaporan */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Media Pelaporan</label>
                    <select
                      value={filterMedia}
                      onChange={(e) => setFilterMedia(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      {uniqueMedias.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nama Pelapor */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Pelapor</label>
                    <input
                      type="text"
                      placeholder="Filter nama pelapor..."
                      value={filterNamaPelapor}
                      onChange={(e) => setFilterNamaPelapor(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>

                  {/* Nama Siswa Terkait */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Siswa Terkait</label>
                    <input
                      type="text"
                      placeholder="Filter nama siswa..."
                      value={filterNamaSiswa}
                      onChange={(e) => setFilterNamaSiswa(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>

                  {/* Kelas */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kelas</label>
                    <select
                      value={filterKelas}
                      onChange={(e) => setFilterKelas(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      {uniqueClasses.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tema Pelaporan */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tema Pelaporan</label>
                    <select
                      value={filterTema}
                      onChange={(e) => setFilterTema(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      {uniqueTemas.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target yang Dilaporkan */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Dilaporkan</label>
                    <select
                      value={filterTarget}
                      onChange={(e) => setFilterTarget(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      {uniqueTargets.map(tg => (
                        <option key={tg} value={tg}>{tg}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nama Target yang Dilaporkan */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Target Dilaporkan</label>
                    <input
                      type="text"
                      placeholder="Filter nama target..."
                      value={filterNamaTarget}
                      onChange={(e) => setFilterNamaTarget(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>

                  {/* Isi Laporan */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Isi Laporan</label>
                    <input
                      type="text"
                      placeholder="Cari kata kunci isi..."
                      value={filterIsi}
                      onChange={(e) => setFilterIsi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>

                  {/* Tingkat Urgensi */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tingkat Urgensi</label>
                    <select
                      value={filterUrgensi}
                      onChange={(e) => setFilterUrgensi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      <option value="Semua">Semua Urgensi</option>
                      <option value="Tinggi">Tinggi</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Rendah">Rendah</option>
                    </select>
                  </div>

                  {/* PIC Resolusi Masalah */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PIC Resolusi Masalah</label>
                    <select
                      value={filterPic}
                      onChange={(e) => setFilterPic(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      {uniquePics.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Pelaporan */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Pelaporan</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      {uniqueStatuses.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tindakan Realisasi Masalah */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tindakan Realisasi Masalah</label>
                    <input
                      type="text"
                      placeholder="Cari kata kunci tindakan realisasi..."
                      value={filterTindakan}
                      onChange={(e) => setFilterTindakan(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>

                  {/* Tanggal Selesai */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Selesai</label>
                    <select
                      value={filterTanggalSelesai}
                      onChange={(e) => setFilterTanggalSelesai(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      {uniqueFinishDates.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reset All Filters Button */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterTanggalDiterima('Semua');
                        setFilterMedia('Semua');
                        setFilterNamaPelapor('');
                        setFilterNamaSiswa('');
                        setFilterKelas('Semua');
                        setFilterTema('Semua');
                        setFilterTarget('Semua');
                        setFilterNamaTarget('');
                        setFilterIsi('');
                        setFilterUrgensi('Semua');
                        setFilterPic('Semua');
                        setFilterStatus('Semua');
                        setFilterTindakan('');
                        setFilterTanggalSelesai('Semua');
                      }}
                      className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition text-center cursor-pointer text-[10px]"
                    >
                      Bersihkan Semua Filter
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Main Table Responsive Wrap */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 shadow-2xs z-10">
                  <tr className="text-slate-500 font-bold select-none">
                    <th 
                      onClick={() => handleSort('tanggal')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>TANGGAL LAPORAN</span>
                        {sortField === 'tanggal' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('media')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>MEDIA</span>
                        {sortField === 'media' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('pelapor')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>PELAPOR</span>
                        {sortField === 'pelapor' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('siswa')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>SISWA (KELAS)</span>
                        {sortField === 'siswa' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('target')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>TEMA & TARGET</span>
                        {sortField === 'target' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold">ISI LAPORAN</th>
                    <th 
                      onClick={() => handleSort('urgensi')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-center group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>URGENSI</span>
                        {sortField === 'urgensi' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('pic')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>PIC</span>
                        {sortField === 'pic' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('tindakan')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>TINDAKAN REALISASI MASALAH</span>
                        {sortField === 'tindakan' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('status')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>STATUS</span>
                        {sortField === 'status' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-500 text-xs">Tidak ada data pengaduan ditemukan</p>
                          <p className="text-[10px] text-slate-400">Ubah filter pencarian atau sinkronisasi ulang.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedComplaints.map((comp, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => handleSelectComplaint(comp)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {/* Received Date & Timestamp */}
                        <td className="px-4 py-3 shrink-0">
                          <p className="font-bold text-slate-700">{formatToIndonesianDate(comp.tanggalDiterima)}</p>
                        </td>

                        {/* Media */}
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-medium text-[10px]">
                            {comp.media}
                          </span>
                        </td>

                        {/* Pelapor */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{comp.namaPelapor}</p>
                          <p className="text-[10px] text-slate-400">Orang Tua / Wali</p>
                        </td>

                        {/* Siswa & Kelas */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{comp.namaSiswa}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{comp.kelas}</p>
                        </td>

                        {/* Tema & Target */}
                        <td className="px-4 py-3 max-w-[140px] truncate">
                          <p className="font-medium text-slate-700 truncate">{comp.tema}</p>
                          <p className="text-[10px] text-slate-500 font-bold truncate" title={comp.namaTarget || comp.target}>
                            {cleanTargetName(comp.namaTarget || comp.target)}
                          </p>
                        </td>

                        {/* Isi Laporan */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-slate-600 line-clamp-2 leading-tight">
                            {comp.isi}
                          </p>
                        </td>

                        {/* Urgensi */}
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyStyles(comp.urgensi)}`}>
                            {comp.urgensi}
                          </span>
                        </td>

                        {/* PIC */}
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {comp.pic || '-'}
                        </td>

                        {/* Tindakan Realisasi Masalah */}
                        <td className="px-4 py-3 max-w-[200px] truncate" title={comp.tindakan}>
                          <p className="text-slate-600 truncate italic">
                            {comp.tindakan || '-'}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${getStatusDot(comp.status)}`}></span>
                            <span className="font-bold text-slate-700">{comp.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Menampilkan {filteredAndSortedComplaints.length} baris data</span>
              <span>Klik pada baris data untuk melihat rincian pengaduan.</span>
            </div>

          </div>
        ) : activeTab === 'analisis_kelas' ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
            {/* Left: Diagram */}
            <div className="flex-1 lg:max-w-md bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Grafik Keluhan per Kelas
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Klik pada baris kelas untuk menyaring daftar keluhan di sebelah kanan.
                </p>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                <button
                  onClick={() => setSelectedAnalysisClass(null)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                    selectedAnalysisClass === null
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xs'
                      : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua Kelas</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{complaints.length}</span>
                </button>
                
                <div className="space-y-2.5 pt-2">
                  {classAnalysisStats.map((item, idx) => {
                    const maxCount = Math.max(...classAnalysisStats.map(c => c.count)) || 1;
                    const barWidth = Math.max(5, (item.count / maxCount) * 100);
                    const isSelected = selectedAnalysisClass === item.name;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setSelectedAnalysisClass(item.name)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-emerald-50/50 border-emerald-300 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-slate-700 group-hover:text-emerald-700 transition-colors">{item.name}</span>
                          <span className="text-slate-500 font-extrabold">{item.count} Keluhan ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isSelected ? 'bg-emerald-600' : 'bg-emerald-500 group-hover:bg-emerald-600'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: List */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    Daftar Keluhan {selectedAnalysisClass ? `Kelas: ${selectedAnalysisClass}` : '(Semua Kelas)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Menampilkan {
                      complaints.filter(c => !selectedAnalysisClass || (c.kelas || 'Tanpa Kelas') === selectedAnalysisClass).length
                    } keluhan.
                  </p>
                </div>
                {selectedAnalysisClass && (
                  <button 
                    onClick={() => setSelectedAnalysisClass(null)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md transition-colors border border-emerald-200 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {defaultSortComplaints(
                  complaints.filter(c => !selectedAnalysisClass || (c.kelas || 'Tanpa Kelas') === selectedAnalysisClass)
                ).map((comp, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectComplaint(comp)}
                      className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{formatToIndonesianDate(comp.tanggalDiterima)}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getUrgencyStyles(comp.urgensi)}`}>{comp.urgensi}</span>
                          <span className="text-xs font-bold text-blue-600">{comp.tema}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{comp.namaSiswa} <span className="text-slate-400 font-semibold text-xs">({comp.kelas})</span></p>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{comp.isi}</p>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Pelapor: {comp.namaPelapor} • Target: <span className="font-bold text-slate-600">{cleanTargetName(comp.namaTarget || comp.target)}</span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(comp.status)}`}></span>
                          <span className="font-bold text-slate-700">{comp.status}</span>
                        </span>
                        {comp.pic && comp.pic !== '-' && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                            PIC: {comp.pic}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'analisis_tema' ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
            {/* Left: Diagram */}
            <div className="flex-1 lg:max-w-md bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Grafik Keluhan per Tema
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Klik pada baris tema untuk menyaring daftar keluhan di sebelah kanan.
                </p>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                <button
                  onClick={() => setSelectedAnalysisTema(null)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                    selectedAnalysisTema === null
                      ? 'bg-purple-50 border-purple-200 text-purple-800 shadow-xs'
                      : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua Tema</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{complaints.length}</span>
                </button>
                
                <div className="space-y-2.5 pt-2">
                  {temaAnalysisStats.map((item, idx) => {
                    const maxCount = Math.max(...temaAnalysisStats.map(c => c.count)) || 1;
                    const barWidth = Math.max(5, (item.count / maxCount) * 100);
                    const isSelected = selectedAnalysisTema === item.name;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setSelectedAnalysisTema(item.name)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-purple-50/50 border-purple-300 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-slate-700 group-hover:text-purple-700 transition-colors">{item.name}</span>
                          <span className="text-slate-500 font-extrabold">{item.count} Keluhan ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isSelected ? 'bg-purple-600' : 'bg-purple-500 group-hover:bg-purple-600'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: List */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    Daftar Keluhan {selectedAnalysisTema ? `Tema: ${selectedAnalysisTema}` : '(Semua Tema)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Menampilkan {
                      complaints.filter(c => !selectedAnalysisTema || (c.tema || 'Tanpa Tema') === selectedAnalysisTema).length
                    } keluhan.
                  </p>
                </div>
                {selectedAnalysisTema && (
                  <button 
                    onClick={() => setSelectedAnalysisTema(null)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-md transition-colors border border-purple-200 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {defaultSortComplaints(
                  complaints.filter(c => !selectedAnalysisTema || (c.tema || 'Tanpa Tema') === selectedAnalysisTema)
                ).map((comp, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectComplaint(comp)}
                      className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{formatToIndonesianDate(comp.tanggalDiterima)}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getUrgencyStyles(comp.urgensi)}`}>{comp.urgensi}</span>
                          <span className="text-xs font-bold text-purple-600">{comp.tema}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{comp.namaSiswa} <span className="text-slate-400 font-semibold text-xs">({comp.kelas})</span></p>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{comp.isi}</p>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Pelapor: {comp.namaPelapor} • Target: <span className="font-bold text-slate-600">{cleanTargetName(comp.namaTarget || comp.target)}</span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(comp.status)}`}></span>
                          <span className="font-bold text-slate-700">{comp.status}</span>
                        </span>
                        {comp.pic && comp.pic !== '-' && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                            PIC: {comp.pic}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'analisis_target' ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
            {/* Left: Diagram */}
            <div className="flex-1 lg:max-w-md bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-600" />
                  Grafik Keluhan per Target
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Klik pada baris target untuk menyaring daftar keluhan di sebelah kanan.
                </p>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                <button
                  onClick={() => setSelectedAnalysisTarget(null)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                    selectedAnalysisTarget === null
                      ? 'bg-rose-50 border-rose-200 text-rose-800 shadow-xs'
                      : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua Target</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{complaints.length}</span>
                </button>
                
                <div className="space-y-2.5 pt-2">
                  {targetAnalysisStats.map((item, idx) => {
                    const maxCount = Math.max(...targetAnalysisStats.map(c => c.count)) || 1;
                    const barWidth = Math.max(5, (item.count / maxCount) * 100);
                    const isSelected = selectedAnalysisTarget === item.name;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setSelectedAnalysisTarget(item.name)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-rose-50/50 border-rose-300 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-slate-700 group-hover:text-rose-700 transition-colors">{item.name}</span>
                          <span className="text-slate-500 font-extrabold">{item.count} Keluhan ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isSelected ? 'bg-rose-600' : 'bg-rose-500 group-hover:bg-rose-600'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: List */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    Daftar Keluhan {selectedAnalysisTarget ? `Target: ${selectedAnalysisTarget}` : '(Semua Target)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Menampilkan {
                      complaints.filter(c => !selectedAnalysisTarget || cleanTargetName(c.namaTarget || c.target) === selectedAnalysisTarget).length
                    } keluhan.
                  </p>
                </div>
                {selectedAnalysisTarget && (
                  <button 
                    onClick={() => setSelectedAnalysisTarget(null)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-md transition-colors border border-rose-200 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {defaultSortComplaints(
                  complaints.filter(c => !selectedAnalysisTarget || cleanTargetName(c.namaTarget || c.target) === selectedAnalysisTarget)
                ).map((comp, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectComplaint(comp)}
                      className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{formatToIndonesianDate(comp.tanggalDiterima)}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getUrgencyStyles(comp.urgensi)}`}>{comp.urgensi}</span>
                          <span className="text-xs font-bold text-rose-600">{comp.tema}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{comp.namaSiswa} <span className="text-slate-400 font-semibold text-xs">({comp.kelas})</span></p>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{comp.isi}</p>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Pelapor: {comp.namaPelapor} • Target: <span className="font-bold text-slate-600">{cleanTargetName(comp.namaTarget || comp.target)}</span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(comp.status)}`}></span>
                          <span className="font-bold text-slate-700">{comp.status}</span>
                        </span>
                        {comp.pic && comp.pic !== '-' && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                            PIC: {comp.pic}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'analisis_siswa' ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
            {/* Left: Diagram */}
            <div className="flex-1 lg:max-w-md bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  Grafik Keluhan per Siswa
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Klik pada nama siswa untuk menyaring daftar keluhan di sebelah kanan.
                </p>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                <button
                  onClick={() => setSelectedAnalysisSiswa(null)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                    selectedAnalysisSiswa === null
                      ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-xs'
                      : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua Siswa</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{complaints.length}</span>
                </button>
                
                <div className="space-y-2.5 pt-2">
                  {siswaAnalysisStats.map((item, idx) => {
                    const maxCount = Math.max(...siswaAnalysisStats.map(c => c.count)) || 1;
                    const barWidth = Math.max(5, (item.count / maxCount) * 100);
                    const isSelected = selectedAnalysisSiswa === item.name;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setSelectedAnalysisSiswa(item.name)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-amber-50/50 border-amber-300 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-slate-700 group-hover:text-amber-700 transition-colors">{item.name}</span>
                          <span className="text-slate-500 font-extrabold">{item.count} Keluhan ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isSelected ? 'bg-amber-600' : 'bg-amber-500 group-hover:bg-amber-600'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: List */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    Daftar Keluhan {selectedAnalysisSiswa ? `Siswa: ${selectedAnalysisSiswa}` : '(Semua Siswa)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Menampilkan {
                      complaints.filter(c => !selectedAnalysisSiswa || (c.namaSiswa || 'Tanpa Nama Siswa') === selectedAnalysisSiswa).length
                    } keluhan.
                  </p>
                </div>
                {selectedAnalysisSiswa && (
                  <button 
                    onClick={() => setSelectedAnalysisSiswa(null)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-md transition-colors border border-amber-200 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {defaultSortComplaints(
                  complaints.filter(c => !selectedAnalysisSiswa || (c.namaSiswa || 'Tanpa Nama Siswa') === selectedAnalysisSiswa)
                ).map((comp, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectComplaint(comp)}
                      className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{formatToIndonesianDate(comp.tanggalDiterima)}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getUrgencyStyles(comp.urgensi)}`}>{comp.urgensi}</span>
                          <span className="text-xs font-bold text-amber-600">{comp.tema}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{comp.namaSiswa} <span className="text-slate-400 font-semibold text-xs">({comp.kelas})</span></p>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{comp.isi}</p>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Pelapor: {comp.namaPelapor} • Target: <span className="font-bold text-slate-600">{cleanTargetName(comp.namaTarget || comp.target)}</span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(comp.status)}`}></span>
                          <span className="font-bold text-slate-700">{comp.status}</span>
                        </span>
                        {comp.pic && comp.pic !== '-' && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                            PIC: {comp.pic}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'analisis_pic' ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
            {/* Left: Diagram */}
            <div className="flex-1 lg:max-w-md bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-600" />
                  Grafik Keluhan per PIC Resolusi
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Klik pada nama PIC untuk menyaring daftar keluhan di sebelah kanan.
                </p>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                <button
                  onClick={() => setSelectedAnalysisPic(null)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                    selectedAnalysisPic === null
                      ? 'bg-cyan-50 border-cyan-200 text-cyan-800 shadow-xs'
                      : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua PIC</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{complaints.length}</span>
                </button>
                
                <div className="space-y-2.5 pt-2">
                  {picAnalysisStats.map((item, idx) => {
                    const maxCount = Math.max(...picAnalysisStats.map(c => c.count)) || 1;
                    const barWidth = Math.max(5, (item.count / maxCount) * 100);
                    const isSelected = selectedAnalysisPic === item.name;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setSelectedAnalysisPic(item.name)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-cyan-50/50 border-cyan-300 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-slate-700 group-hover:text-cyan-700 transition-colors">{item.name}</span>
                          <span className="text-slate-500 font-extrabold">{item.count} Keluhan ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isSelected ? 'bg-cyan-600' : 'bg-cyan-500 group-hover:bg-cyan-600'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: List */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    Daftar Keluhan PIC {selectedAnalysisPic ? `PIC: ${selectedAnalysisPic}` : '(Semua PIC)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Menampilkan {
                      complaints.filter(c => !selectedAnalysisPic || (c.pic && c.pic !== '-' ? c.pic : 'Belum Ditentukan') === selectedAnalysisPic).length
                    } keluhan.
                  </p>
                </div>
                {selectedAnalysisPic && (
                  <button 
                    onClick={() => setSelectedAnalysisPic(null)}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-bold bg-cyan-50 px-2.5 py-1 rounded-md transition-colors border border-cyan-200 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {defaultSortComplaints(
                  complaints.filter(c => !selectedAnalysisPic || (c.pic && c.pic !== '-' ? c.pic : 'Belum Ditentukan') === selectedAnalysisPic)
                ).map((comp, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectComplaint(comp)}
                      className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{formatToIndonesianDate(comp.tanggalDiterima)}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getUrgencyStyles(comp.urgensi)}`}>{comp.urgensi}</span>
                          <span className="text-xs font-bold text-cyan-600">{comp.tema}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{comp.namaSiswa} <span className="text-slate-400 font-semibold text-xs">({comp.kelas})</span></p>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{comp.isi}</p>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Pelapor: {comp.namaPelapor} • Target: <span className="font-bold text-slate-600">{cleanTargetName(comp.namaTarget || comp.target)}</span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(comp.status)}`}></span>
                          <span className="font-bold text-slate-700">{comp.status}</span>
                        </span>
                        {comp.pic && comp.pic !== '-' && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                            PIC: {comp.pic}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : null}

      </main>

      {/* Bottom Status Bar Footer */}
      <footer id="app-footer" className="h-8 bg-slate-800 text-slate-400 flex items-center px-6 justify-between text-[10px] shrink-0 z-10">
        <div>
          <span>SISKADU - Sistem Informasi Keluhan Terpadu v2.2</span>
        </div>
        <div>
          <span>Last Sync: {new Date().toLocaleDateString('id-ID')} | Sistem Aktif</span>
        </div>
      </footer>

      {/* MODAL 1: Detail Complaint / Actions Side Drawer */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-end z-50 animate-fade-in" onClick={() => setSelectedComplaint(null)}>
          <div 
            className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl relative overflow-hidden animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Rincian Pengaduan</span>
                <h4 className="text-sm font-bold text-slate-800 leading-tight">Pengaduan dari {selectedComplaint.namaPelapor}</h4>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)} 
                className="p-1.5 hover:bg-slate-200 rounded-full transition text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Details Content Scroll */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Top Meta info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Tanggal Terima</p>
                  <p className="font-bold text-slate-700">{formatToIndonesianDate(selectedComplaint.tanggalDiterima)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Media Pelaporan</p>
                  <p className="font-bold text-slate-700">{selectedComplaint.media}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-2">Nama Siswa Terkait</p>
                  <p className="font-bold text-slate-700">{selectedComplaint.namaSiswa} ({selectedComplaint.kelas})</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-2">Tingkat Urgensi</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${getUrgencyStyles(selectedComplaint.urgensi)}`}>
                    {selectedComplaint.urgensi}
                  </span>
                </div>
              </div>

              {/* Tema, Target and Target Name */}
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Tema / Kategori Pelaporan</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedComplaint.tema}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Target yang Dilaporkan</p>
                  <p className="font-bold text-blue-700 text-sm">{cleanTargetName(selectedComplaint.namaTarget || selectedComplaint.target)}</p>
                </div>
              </div>

              {/* Isi Laporan Textarea-styled box */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Isi Laporan Pengaduan</p>
                <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-slate-700 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                  {selectedComplaint.isi}
                </div>
              </div>

              {/* Uploaded Bukti */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">File Bukti Pengaduan:</span>
                <span className="font-bold text-slate-700">{selectedComplaint.bukti}</span>
              </div>

              {/* PIC & Action / Tindakan taken */}
              <div className="bg-blue-50/50 p-3.5 rounded border border-blue-100 space-y-2.5">
                <h5 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                  Status & Tindak Lanjut Sekolah
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">PIC Penanggung Jawab</span>
                    <p className="font-semibold text-slate-800">{selectedComplaint.pic || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Tanggal Selesai</span>
                    <p className="font-semibold text-slate-800">{formatToIndonesianDate(selectedComplaint.tanggalSelesai)}</p>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Tindakan Realisasi Masalah</span>
                  <p className="text-slate-700 italic bg-white p-2.5 rounded border border-slate-200 font-sans mt-0.5">
                    {selectedComplaint.tindakan}
                  </p>
                </div>
                {selectedComplaint.beritaAcara && selectedComplaint.beritaAcara !== 'Tidak ada' && (
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <a href={selectedComplaint.beritaAcara} target="_blank" rel="noopener noreferrer">
                      Buka Dokumen Berita Acara
                    </a>
                  </div>
                )}
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => {
                  handleOpenEditModal(selectedComplaint);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs border border-blue-500/10"
              >
                <Edit className="w-3.5 h-3.5 animate-pulse" />
                <span>Edit Data Pengaduan</span>
              </button>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-300 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Setup Google Sheets & Apps Script Integration */}
      {isSetupOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={() => setIsSetupOpen(false)}>
          <div 
            className="bg-white rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Integrasi Sumber Data Google Sheets
              </h4>
              <button 
                onClick={() => setIsSetupOpen(false)} 
                className="p-1 hover:bg-slate-200 rounded-full transition cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              
              <div className="space-y-1.5 text-slate-600">
                <p className="font-semibold text-slate-800">Bagaimana menghubungkan Google Sheet Anda ke Dashboard?</p>
                <p>Ikuti langkah mudah di bawah ini untuk mengaktifkan sinkronisasi otomatis dua arah menggunakan Google Apps Script.</p>
              </div>

              {/* Steps Accordion / Guide */}
              <div className="border border-slate-200 rounded divide-y divide-slate-100 bg-slate-50/50">
                
                <div className="p-3">
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Persiapkan Spreadsheet Google Anda
                  </p>
                  <p className="pl-6 text-slate-600 mt-1">
                    Buat spreadsheet baru di Google Drive Anda, lalu beri nama kolom baris pertama (header) persis seperti di bawah ini secara berturut-turut:
                  </p>
                  <div className="pl-6 mt-2">
                    <code className="block bg-white p-2 border border-slate-200 rounded text-[9px] font-mono whitespace-nowrap overflow-x-auto text-slate-700">
                      Timestamp | Tanggal Laporan Diterima | Media Pelaporan | Nama Pelapor | Nama Siswa Terkait | Kelas | Tema Pelaporan | Target yang Dilaporkan | Nama Target yang Dilaporkan | Isi Laporan | Tingkat Urgensi | Upload bukti pengaduan | PIC Resolusi Masalah | Status Pelaporan | Tindakan Diambil | Tanggal Selesai | Link File Berita Acara
                    </code>
                  </div>
                </div>

                <div className="p-3">
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px]">2</span>
                    Pasang Google Apps Script
                  </p>
                  <p className="pl-6 text-slate-600 mt-1">
                    Masuk ke menu <strong className="text-slate-800">Ekstensi &gt; Apps Script</strong> di Google Sheet Anda. Hapus semua kode bawaan, lalu salin dan tempel kode lengkap di bawah ini:
                  </p>
                  
                  {/* Code box */}
                  <div className="pl-6 mt-2 relative">
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="absolute top-4 right-6 bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded text-[10px] flex items-center gap-1 transition"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Disalin!' : 'Salin Kode'}
                    </button>
                    <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-[9px] overflow-x-auto max-h-[160px] leading-relaxed select-all">
                      {appsScriptCode}
                    </pre>
                  </div>
                </div>

                <div className="p-3">
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px]">3</span>
                    Deploy Sebagai Web App (Aplikasi Web)
                  </p>
                  <p className="pl-6 text-slate-600 mt-1">
                    Klik tombol <strong className="text-slate-800">Penerapan &gt; Penerapan Baru (Deploy &gt; New Deployment)</strong> di kanan atas halaman Apps Script. Pilih tipe <strong className="text-slate-800">Aplikasi Web (Web App)</strong>. Atur "Siapa yang memiliki akses" menjadi <strong className="text-emerald-700 font-bold">Siapa Saja (Anyone)</strong>, lalu klik Terapkan. Setujui izin akun Google Anda dan salin <strong className="text-slate-800">URL Web App</strong> yang dihasilkan.
                  </p>
                </div>

              </div>

              {/* Connection URL Input Form */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Database className="w-4 h-4 text-blue-600" />
                  Konfigurasi URL Aplikasi Web
                </h5>
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">URL Google Apps Script Anda</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={gasUrl}
                      onChange={(e) => setGasUrl(e.target.value)}
                      className="flex-1 p-2 border border-slate-300 rounded text-xs bg-white text-slate-700 placeholder-slate-400 focus:outline-hidden"
                    />
                    {gasUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setGasUrl('');
                          localStorage.removeItem('siskadu_gas_url');
                        }}
                        className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold transition"
                      >
                        Reset URL
                      </button>
                    )}
                  </div>
                </div>

                {/* Connection verification info */}
                {syncError && (
                  <div className="p-2.5 bg-red-100/80 text-red-800 rounded text-[11px] font-medium border border-red-200 flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{syncError}</span>
                  </div>
                )}

                {syncSuccess && (
                  <div className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded text-[11px] font-medium border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Sukses! Data Google Sheet berhasil disinkronkan ke dashboard Anda.</span>
                  </div>
                )}

                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    disabled={isSyncing || !gasUrl}
                    onClick={() => fetchFromGoogleSheet()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Sedang Sinkronisasi...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Uji & Sinkronisasi Sekarang
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsSetupOpen(false)}
                className="px-5 py-2 bg-slate-800 text-white font-bold text-xs rounded hover:bg-slate-900 transition cursor-pointer"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: Form Input / Edit Complaint */}
      {isFormOpen && formComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setIsFormOpen(false)}>
          <div 
            className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <span>{formMode === 'add' ? 'Input Laporan Pengaduan Baru' : 'Edit Data Pengaduan'}</span>
              </h4>
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)} 
                className="p-1.5 hover:bg-slate-200 rounded-full transition cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Action Container */}
            <form onSubmit={handleSaveComplaint} className="flex-1 flex flex-col overflow-hidden">
              
              {/* Scrollable Form Body */}
              <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-5 text-xs">
                
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section 1: Identitas Pelapor & Siswa */}
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-700 border-b border-slate-100 pb-1 uppercase tracking-wider text-[10px]">1. Informasi Pelapor & Siswa</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Terima *</label>
                      <input 
                        type="date"
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                        value={convertDDMMYYYYToYYYYMMDD(formComplaint.tanggalDiterima)}
                        onChange={(e) => {
                          setFormComplaint({
                            ...formComplaint,
                            tanggalDiterima: convertYYYYMMDDToDDMMYYYY(e.target.value)
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Media Pelaporan *</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
                        value={formComplaint.media}
                        onChange={(e) => setFormComplaint({ ...formComplaint, media: e.target.value })}
                      >
                        <option value="Form Online">Form Online</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Tatap Muka">Tatap Muka</option>
                        <option value="Email">Email</option>
                        <option value="Telepon">Telepon</option>
                        <option value="Surat">Surat</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Pelapor *</label>
                      <input 
                        type="text"
                        required
                        placeholder="Contoh: Bpk. Ahmad"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                        value={formComplaint.namaPelapor}
                        onChange={(e) => setFormComplaint({ ...formComplaint, namaPelapor: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Siswa Terkait *</label>
                      <input 
                        type="text"
                        required
                        placeholder="Contoh: Muhammad Ali"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                        value={formComplaint.namaSiswa}
                        onChange={(e) => setFormComplaint({ ...formComplaint, namaSiswa: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kelas *</label>
                      <input 
                        type="text"
                        required
                        placeholder="Contoh: 7-A, 8-B, 10-A, dll."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                        value={formComplaint.kelas}
                        onChange={(e) => setFormComplaint({ ...formComplaint, kelas: e.target.value })}
                      />
                    </div>

                  </div>
                </div>

                {/* Section 2: Detail Keluhan */}
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-700 border-b border-slate-100 pb-1 uppercase tracking-wider text-[10px]">2. Substansi Laporan & Keluhan</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tema / Kategori Pelaporan *</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
                        value={formComplaint.tema}
                        onChange={(e) => setFormComplaint({ ...formComplaint, tema: e.target.value })}
                      >
                        <option value="Fasilitas Sekolah">Fasilitas Sekolah</option>
                        <option value="Kurikulum">Kurikulum</option>
                        <option value="Kedisiplinan">Kedisiplinan</option>
                        <option value="Keuangan">Keuangan</option>
                        <option value="Pelayanan">Pelayanan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target yang Dilaporkan *</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
                        value={formComplaint.target}
                        onChange={(e) => setFormComplaint({ ...formComplaint, target: e.target.value })}
                      >
                        <option value="Sekolah">Sekolah / Yayasan</option>
                        <option value="Guru">Guru / Tenaga Pengajar</option>
                        <option value="Staf">Staf / Administrasi</option>
                        <option value="Siswa">Siswa Lain</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Pihak / Objek Laporan</label>
                      <input 
                        type="text"
                        placeholder="Contoh: Gedung Olahraga, Ustadz Salman, dll."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                        value={formComplaint.namaTarget}
                        onChange={(e) => setFormComplaint({ ...formComplaint, namaTarget: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tingkat Urgensi *</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
                        value={formComplaint.urgensi}
                        onChange={(e) => setFormComplaint({ ...formComplaint, urgensi: e.target.value })}
                      >
                        <option value="Rendah">Rendah (Bisa ditunda)</option>
                        <option value="Sedang">Sedang (Butuh perhatian)</option>
                        <option value="Tinggi">Tinggi (Mendesak / Urgent)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Isi Laporan Pengaduan *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tuliskan isi laporan secara rinci di sini..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-mono"
                        value={formComplaint.isi}
                        onChange={(e) => setFormComplaint({ ...formComplaint, isi: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Link / File Bukti Pengaduan</label>
                      <input 
                        type="text"
                        placeholder="Contoh: link_gdrive_bukti.jpg atau '-'"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                        value={formComplaint.bukti}
                        onChange={(e) => setFormComplaint({ ...formComplaint, bukti: e.target.value })}
                      />
                    </div>

                  </div>
                </div>

                {/* Section 3: PIC Resolusi & Status */}
                <div className="space-y-3">
                  <h5 className="font-bold text-blue-900 border-b border-blue-50 pb-1 uppercase tracking-wider text-[10px]">3. PIC Penanggung Jawab & Tindak Lanjut</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/20 p-4 rounded-xl border border-blue-100/30">
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PIC Penanggung Jawab</label>
                      <input 
                        type="text"
                        placeholder="Contoh: Dirpen, Humas, dll."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                        value={formComplaint.pic}
                        onChange={(e) => setFormComplaint({ ...formComplaint, pic: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Laporan</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
                        value={formComplaint.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          const isSelesai = newStatus === 'Selesai';
                          setFormComplaint({
                            ...formComplaint,
                            status: newStatus,
                            tanggalSelesai: isSelesai 
                              ? (formComplaint.tanggalSelesai === 'Menunggu diselesaikan' ? convertYYYYMMDDToDDMMYYYY(new Date().toISOString().split('T')[0]) : formComplaint.tanggalSelesai) 
                              : 'Menunggu diselesaikan'
                          });
                        }}
                      >
                        <option value="Baru">Baru</option>
                        <option value="Diproses">Diproses</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tindakan Diambil</label>
                      <textarea
                        rows={2}
                        placeholder="Tuliskan realisasi atau tindakan penyelesaian masalah di sini..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-sans"
                        value={formComplaint.tindakan}
                        onChange={(e) => setFormComplaint({ ...formComplaint, tindakan: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Selesai</label>
                      <input 
                        type={formComplaint.status === 'Selesai' ? 'date' : 'text'}
                        disabled={formComplaint.status !== 'Selesai'}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                        value={formComplaint.status === 'Selesai' ? convertDDMMYYYYToYYYYMMDD(formComplaint.tanggalSelesai) : 'Menunggu diselesaikan'}
                        onChange={(e) => {
                          if (formComplaint.status === 'Selesai') {
                            setFormComplaint({
                              ...formComplaint,
                              tanggalSelesai: convertYYYYMMDDToDDMMYYYY(e.target.value)
                            });
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Link File Berita Acara</label>
                      <input 
                        type="text"
                        placeholder="Contoh: https://link_berita_acara.pdf atau 'Tidak ada'"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                        value={formComplaint.beritaAcara}
                        onChange={(e) => setFormComplaint({ ...formComplaint, beritaAcara: e.target.value })}
                      />
                    </div>

                  </div>
                </div>

              </div>

              {/* Form Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300 transition cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isFormSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFormSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Laporan</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

