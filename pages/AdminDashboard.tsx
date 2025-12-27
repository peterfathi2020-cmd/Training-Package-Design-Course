import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, FileRecord, Resource, Meeting, LoginLog } from '../types';
import { Button, Input, Select, Card, Badge, ProgressBar } from '../components/ui';
import { Users, FileText, Video, ShieldAlert, Download, UploadCloud, Mail, Lock, Phone, User as UserIcon, Link as LinkIcon, Type, Briefcase, BarChart, Library, BookOpen, AlignLeft, MessageCircle, ExternalLink, Calendar, Upload, Send, FileSpreadsheet, Megaphone, Activity, CheckCircle, Trash2, Edit, X, Cloud, Database, RefreshCw, Share2, Copy, Wifi, WifiOff, Globe, Sparkles, Image as ImageIcon, PlayCircle, ChevronDown, ChevronUp, Maximize2, MessageSquare, TrendingUp, PieChart } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export default function AdminDashboard({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState(0);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [allFiles, setAllFiles] = useState<FileRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [isCloud, setIsCloud] = useState(db.isCloudConnected);
  
  // Expanded Row State
  const [expandedFileId, setExpandedFileId] = useState<number | null>(null);

  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmailState, setEditEmailState] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editTrainerId, setEditTrainerId] = useState<string>('');

  // Trainer Form (Add)
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState('');
  const [tPhone, setTPhone] = useState('');

  // Trainee Form (Add)
  const [trName, setTrName] = useState('');
  const [trEmail, setTrEmail] = useState('');
  const [trPass, setTrPass] = useState('');
  const [trPhone, setTrPhone] = useState('');
  const [trTrainerId, setTrTrainerId] = useState('');

  // Meeting Form
  const [mLink, setMLink] = useState('');
  const [mTopic, setMTopic] = useState('');
  const [mTarget, setMTarget] = useState<'all' | 'trainers' | 'group'>('all');
  const [mGroupId, setMGroupId] = useState<string>('');
  
  // WhatsApp Recipient Toggle State
  const [expandedMeetingId, setExpandedMeetingId] = useState<number | null>(null);

  // Resource Form
  const [rTitle, setRTitle] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rLink, setRLink] = useState('');
  const [rType, setRType] = useState<'pdf' | 'video' | 'link'>('pdf');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Announcement
  const [announcementText, setAnnouncementText] = useState('');

  // Restore
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Upload for Trainee (Admin)
  const [uploadTraineeId, setUploadTraineeId] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadLink, setUploadLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  useEffect(() => {
    refreshData();
    // Real-time listener for multi-tab sync
    const unsubscribe = db.subscribe(() => {
        refreshData();
    });
    return () => unsubscribe();
  }, []);

  const refreshData = () => {
    setTrainers(db.getTrainers());
    setAllFiles(db.getFiles());
    setUsers(db.getUsers());
    setResources(db.getResources());
    setMeetings(db.getMeetings().reverse()); // Show newest first
    setAnnouncementText(db.getAnnouncement());
    setLoginLogs(db.getLoginLogs());
    setIsCloud(db.isCloudConnected);
  };

  const handleAddTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (tName && tEmail && tPass) {
        try {
            db.saveUser({
                name: tName,
                email: tEmail,
                password: tPass,
                phone: tPhone,
                role: 'trainer'
            });
            alert(`تم إنشاء حساب مسئول المجموعة '${tName}' بنجاح!`);
            setTName(''); setTEmail(''); setTPass(''); setTPhone('');
            // refreshData called automatically via db subscription
        } catch (err: any) {
            alert("خطأ: " + err.message);
        }
    } else {
        alert("الرجاء ملء جميع الحقول المطلوبة.");
    }
  };

  const handleAddTrainee = (e: React.FormEvent) => {
      e.preventDefault();
      if (!trTrainerId) {
          alert("يجب تحديد مسئول المجموعة");
          return;
      }
      try {
          db.saveUser({
              name: trName,
              email: trEmail,
              password: trPass,
              phone: trPhone,
              role: 'trainee',
              assigned_trainer_id: Number(trTrainerId)
          });
          alert(`تم إضافة المتدرب '${trName}' بنجاح!`);
          setTrName(''); setTrEmail(''); setTrPass(''); setTrPhone(''); setTrTrainerId('');
      } catch (err: any) {
          alert("خطأ: " + err.message);
      }
  }

  const handleDeleteUser = (id: number, name: string) => {
      if (window.confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
          try {
              db.deleteUser(id);
              alert("تم الحذف بنجاح.");
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  const openEditModal = (user: User) => {
      setEditingUser(user);
      setEditName(user.name);
      setEditEmailState(user.email);
      setEditPhone(user.phone || '');
      setEditPassword(user.password || '');
      setEditTrainerId(user.assigned_trainer_id ? String(user.assigned_trainer_id) : '');
  };

  const handleUpdateUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;

      const updates: Partial<User> = {
          name: editName,
          email: editEmailState,
          phone: editPhone,
          password: editPassword,
      };

      if (editingUser.role === 'trainee') {
          updates.assigned_trainer_id = editTrainerId ? Number(editTrainerId) : null;
      }

      db.updateUser(editingUser.id, updates);
      alert("تم تحديث البيانات بنجاح");
      setEditingUser(null);
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (mTarget === 'group' && !mGroupId) {
        alert('يرجى اختيار مجموعة');
        return;
    }

    db.addMeeting({
      link: mLink,
      topic: mTopic,
      target_audience: mTarget,
      target_group_id: mTarget === 'group' ? Number(mGroupId) : undefined
    });
    alert('تم نشر الاجتماع');
    setMLink(''); setMTopic(''); setMTarget('all'); setMGroupId('');
  };

  const handleAddResource = (e: React.FormEvent) => {
      e.preventDefault();
      db.addResource({
          title: rTitle,
          description: rDesc,
          link: rLink,
          type: rType,
          uploaded_by: 1, // Admin ID
          target_audience: 'all'
      });
      alert('تمت إضافة المصدر للمكتبة');
      setRTitle(''); setRDesc(''); setRLink(''); setRType('pdf');
  }

  const handleAiResourceDesc = async () => {
      if (!rTitle) {
          alert("يرجى كتابة العنوان أولاً");
          return;
      }
      setIsAiLoading(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Write a short, engaging description (in Arabic, max 20 words) for a bag design learning resource.
            Title: ${rTitle}
            Type: ${rType}
            
            The description should encourage trainees to view the content.
          `;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });
          if (response.text) {
              setRDesc(response.text.trim());
          }
      } catch (e) {
          console.error(e);
          alert("حدث خطأ في الـ AI");
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleUpdateAnnouncement = () => {
      db.setAnnouncement(announcementText);
      alert('تم تحديث التنبيه العام. سيظهر لجميع المستخدمين.');
      if(!isCloud) window.location.reload(); 
  }

  const handleRestoreBackup = async () => {
      if (isCloud) {
          alert("لا يمكن استعادة نسخة احتياطية محلية أثناء الاتصال بقاعدة بيانات سحابية. يرجى قطع الاتصال أولاً.");
          return;
      }
      if (!restoreFile) {
          alert("يرجى اختيار ملف النسخة الاحتياطية (JSON)");
          return;
      }

      if (!window.confirm("تحذير: استعادة النسخة الاحتياطية سيقوم بحذف جميع البيانات الحالية واستبدالها. هل أنت متأكد؟")) {
          return;
      }

      const text = await restoreFile.text();
      const success = db.importDB(text);
      if (success) {
          alert("تم استعادة النسخة الاحتياطية بنجاح! سيتم إعادة تحميل الصفحة.");
          window.location.reload();
      } else {
          alert("فشل في استعادة البيانات. الملف قد يكون تالفاً أو غير صالح.");
      }
  }
  
  const handleCopyLink = () => {
      const url = 'https://training-package-design-course.vercel.app/';
      navigator.clipboard.writeText(url).then(() => {
          alert('تم نسخ رابط المنصة بنجاح!');
      });
  };

  const handleShareWhatsapp = () => {
      const url = 'https://training-package-design-course.vercel.app/';
      const text = `ندعوكم للتسجيل في منصة تدريب مصممي الحقائب التدريبية.\nرابط الدخول: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleUploadForTrainee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!uploadTraineeId || (!uploadFile && !uploadLink)) {
          alert('يرجى اختيار المتدرب وملف أو رابط');
          return;
      }
      
      if (uploadFile && !db.isCloudConnected) {
          alert("عذراً، يجب أن تكون متصلاً بالإنترنت لرفع الملفات إلى السحابة.");
          return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      try {
        let fileUrl = uploadLink || undefined;
        if (uploadFile && db.isCloudConnected) {
            // Upload to the specific Peter Fathi Admin Folder
             fileUrl = await db.uploadFileToCloud(uploadFile, 'Admin_Uploads', (progress) => {
                 setUploadProgress(progress);
             });
        }

        const isLink = !!uploadLink && !uploadFile;

        await db.addFile(
            Number(uploadTraineeId), 
            uploadFile ? uploadFile.name : 'رابط مرسل من الإدارة', 
            uploadDesc || 'ملف تم رفعه بواسطة الإدارة',
            fileUrl,
            user, // Pass Admin as Sender
            isLink
        );
        alert('تم إرسال الملف/الرابط للمتدرب بنجاح وتفعيله لحظياً ✅');
        setUploadFile(null);
        setUploadDesc('');
        setUploadLink('');
        setUploadTraineeId('');
        setUploadProgress(0);
      } catch (error: any) {
         alert("خطأ في الرفع: " + error.message);
      } finally {
        setIsUploading(false);
      }
  }

  // Helper to format phone for WhatsApp
  const formatPhoneForWhatsapp = (phone: string) => {
      let p = phone.trim();
      if (p.startsWith('01')) {
          p = '20' + p.substring(1);
      }
      return p;
  };

  const sendWhatsapp = (phone: string, name: string, topic: string, link: string) => {
      if (!phone) {
          alert('هذا المستخدم لم يسجل رقم هاتف');
          return;
      }
      const formattedPhone = formatPhoneForWhatsapp(phone);
      const text = `مرحباً ${name}،\nندعوك للانضمام لاجتماع زووم بعنوان: *${topic}*\n\nرابط الاجتماع:\n${link}\n\nتحياتنا،\nإدارة المنصة`;
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  const getMeetingRecipients = (m: Meeting) => {
      if (m.target_audience === 'all') return users.filter(u => u.phone);
      if (m.target_audience === 'trainers') return trainers.filter(u => u.phone);
      if (m.target_audience === 'group' && m.target_group_id) {
          const targetTrainer = trainers.find(t => t.id === m.target_group_id);
          const trainees = users.filter(u => u.assigned_trainer_id === m.target_group_id);
          const list = [...trainees];
          if (targetTrainer) list.push(targetTrainer);
          return list.filter(u => u.phone);
      }
      return [];
  };

  // Helper function to render file preview
  const renderFilePreview = (f: FileRecord) => {
    if (!f.file_url) return null;
    const ext = f.filename.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 group-hover:scale-105 transition-transform">
                <img src={f.file_url} alt={f.filename} className="w-full h-full object-cover" />
            </div>
        );
    }
    if (['mp4', 'webm', 'ogg'].includes(ext)) {
        return (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-black">
                <video src={f.file_url} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center text-white">
                    <PlayCircle size={20} />
                </div>
            </div>
        );
    }
    return (
        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <FileText size={24} />
        </div>
    );
  };

  // Helper to check file type
  const isImage = (filename: string) => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(filename.split('.').pop()?.toLowerCase() || '');
  const isVideo = (filename: string) => ['mp4', 'webm', 'ogg', 'mov'].includes(filename.split('.').pop()?.toLowerCase() || '');

  const toggleFileRow = (id: number) => {
      setExpandedFileId(expandedFileId === id ? null : id);
  };

  // Analytics Helpers
  const traineesCount = users.filter(u => u.role === 'trainee').length;
  const gradedFilesCount = allFiles.filter(f => f.status === 'graded').length;
  const traineesList = users.filter(u => u.role === 'trainee');

  // Advanced Stats Calculation
  const trainerStats = trainers.map(t => {
      const myTrainees = users.filter(u => u.assigned_trainer_id === t.id).map(u => u.id);
      const fileCount = allFiles.filter(f => myTrainees.includes(f.user_id)).length;
      return {
          name: t.name,
          files: fileCount,
          trainees: myTrainees.length
      };
  }).sort((a, b) => b.files - a.files); // Sort by most active

  const maxFiles = Math.max(...trainerStats.map(t => t.files), 1);

  const tabs = [
    { name: 'التحليلات والسحابة', icon: <TrendingUp size={18} /> },
    { name: 'مسئولي المجموعات', icon: <Users size={18} /> },
    { name: 'متابعة المتدربين', icon: <FileText size={18} /> },
    { name: 'المكتبة والمصادر', icon: <Library size={18} /> },
    { name: 'الاجتماعات', icon: <Video size={18} /> },
    { name: 'الإعدادات والبيانات', icon: <Database size={18} /> },
  ];

  const roleLabels: Record<string, string> = {
    admin: 'مسؤول النظام',
    trainer: 'مسئول المجموعة',
    trainee: 'متدرب'
  };

  return (
    <div className="space-y-6">
      {/* Edit User Modal */}
      {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
                  <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <h3 className="font-bold text-lg text-navy dark:text-white flex items-center gap-2">
                          <Edit size={18} /> تعديل بيانات: {editingUser.name}
                      </h3>
                      <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                      <Input label="الاسم" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                      <Input label="البريد الإلكتروني" value={editEmailState} onChange={(e) => setEditEmailState(e.target.value)} required />
                      <Input label="الهاتف" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                      <Input label="كلمة المرور" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                      
                      {editingUser.role === 'trainee' && (
                          <Select 
                            label="مسئول المجموعة"
                            value={editTrainerId}
                            onChange={(e) => setEditTrainerId(e.target.value)}
                            options={trainers.map(t => ({ label: t.name, value: t.id }))}
                          />
                      )}

                      <div className="flex gap-3 mt-6">
                          <Button type="submit" variant="success" className="flex-1">حفظ التعديلات</Button>
                          <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>إلغاء</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 whitespace-nowrap transition-all duration-200 ${
              activeTab === idx
                ? 'border-primary dark:border-blue-400 text-primary dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/10'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
          <div className="space-y-6">
            
            {/* Cloud Status Panel */}
            <div className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-all duration-500 ${isCloud ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-red-600 to-red-700'}`}>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full backdrop-blur-sm ${isCloud ? 'bg-green-400/20' : 'bg-white/20'}`}>
                            {isCloud ? <Wifi size={32} className="text-green-300" /> : <WifiOff size={32} className="text-white" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                {isCloud ? 'متصل بقاعدة البيانات العالمية' : 'اتصال منقطع (Offline)'}
                                {isCloud && <span className="bg-green-400 text-green-900 text-xs px-2 py-0.5 rounded-full font-bold">Live</span>}
                            </h2>
                            <p className="text-blue-100 text-sm">
                                {isCloud 
                                    ? 'يتم الآن مزامنة جميع البيانات لحظياً وتخزينها في السحابة المركزية (PeterFathi_Official_Cloud).'
                                    : 'جاري محاولة الاتصال... تأكد من اتصالك بالإنترنت.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Platform Panel */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                        <Share2 size={32} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">مشاركة رابط المنصة</h2>
                        <p className="text-emerald-100 text-sm">
                            قم بدعوة المسئولين والمتدربين للتسجيل والدخول عبر مشاركة الرابط المباشر.
                        </p>
                    </div>
                </div>
                <div className="relative z-10 flex gap-3">
                     <button 
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold transition-all border border-white/30"
                    >
                        <Copy size={18} />
                        نسخ الرابط
                    </button>
                    <button 
                        onClick={handleShareWhatsapp}
                        className="flex items-center gap-2 bg-white text-emerald-700 px-5 py-2 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-sm"
                    >
                        <MessageCircle size={18} />
                        إرسال عبر واتساب
                    </button>
                </div>
            </div>
            
            {/* Stats Cards ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card onClick={() => setActiveTab(2)} className="text-center flex flex-col items-center justify-center p-6 transition-transform hover:-translate-y-1">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400 mb-4 inline-flex shadow-sm">
                        <Users size={28} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">عدد المتدربين</p>
                    <h2 className="text-4xl font-extrabold text-navy dark:text-blue-400">{traineesCount}</h2>
                    <span className="text-xs text-green-600 font-bold bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-2 inline-block">نشط</span>
                </Card>
                <Card onClick={() => setActiveTab(1)} className="text-center flex flex-col items-center justify-center p-6 transition-transform hover:-translate-y-1">
                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full text-green-600 dark:text-green-400 mb-4 inline-flex shadow-sm">
                        <Briefcase size={28} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">مسئولي المجموعات</p>
                    <h2 className="text-4xl font-extrabold text-navy dark:text-green-400">{trainers.length}</h2>
                    <span className="text-xs text-blue-600 font-bold bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full mt-2 inline-block">مشرف</span>
                </Card>
                <Card onClick={() => setActiveTab(2)} className="text-center flex flex-col items-center justify-center p-6 transition-transform hover:-translate-y-1">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-full text-orange-600 dark:text-orange-400 mb-4 inline-flex shadow-sm">
                        <FileText size={28} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">إجمالي الملفات</p>
                    <h2 className="text-4xl font-extrabold text-navy dark:text-orange-400">{allFiles.length}</h2>
                    <span className="text-xs text-orange-600 font-bold bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full mt-2 inline-block">سحابي</span>
                </Card>
                <Card onClick={() => setActiveTab(2)} className="text-center flex flex-col items-center justify-center p-6 transition-transform hover:-translate-y-1">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full text-purple-600 dark:text-purple-400 mb-4 inline-flex shadow-sm">
                        <CheckCircle size={28} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">نسبة التصحيح</p>
                    <h2 className="text-4xl font-extrabold text-navy dark:text-purple-400">
                        {allFiles.length > 0 ? Math.round((gradedFilesCount / allFiles.length) * 100) : 0}%
                    </h2>
                    <span className="text-xs text-purple-600 font-bold bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full mt-2 inline-block">إنجاز</span>
                </Card>
            </div>
             
             {/* Charts */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="تحليل أداء المجموعات (Visual Analytics)" className="overflow-hidden">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                            <span>المدرب</span>
                            <span>عدد الملفات (النشاط)</span>
                        </div>
                        {trainerStats.map((stat, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="font-bold text-navy dark:text-gray-200">{stat.name}</span>
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                        {stat.files} ملف / {stat.trainees} طالب
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 group-hover:from-blue-400 group-hover:to-indigo-500 transition-all duration-500 rounded-full relative"
                                        style={{ width: `${(stat.files / maxFiles) * 100}%` }}
                                    >
                                        {stat.files > 0 && (
                                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 animate-pulse"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {trainerStats.length === 0 && <p className="text-center text-gray-400 py-4">لا يوجد بيانات للتحليل</p>}
                    </div>
                </Card>

                <Card title="سجل دخول المستخدمين (آخر الأنشطة)">
                    <div className="overflow-x-auto max-h-80">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold">المستخدم</th>
                                    <th className="p-3 font-semibold">الدور</th>
                                    <th className="p-3 font-semibold">وقت الدخول</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loginLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                                        <td className="p-3 font-medium text-navy dark:text-gray-200 flex items-center gap-2">
                                            <Activity size={12} className="text-green-500" />
                                            {log.user_name}
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400">
                                            <Badge color={log.role === 'admin' ? 'red' : log.role === 'trainer' ? 'blue' : 'green'}>
                                                {roleLabels[log.role]}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400 text-xs" dir="ltr">{log.timestamp}</td>
                                    </tr>
                                ))}
                                {loginLogs.length === 0 && (
                                    <tr><td colSpan={3} className="p-6 text-center text-gray-400">لا يوجد سجلات دخول حتى الآن.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

          </div>
      )}
      
      {activeTab === 1 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="إضافة حساب مسئول مجموعة جديد">
             <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl mb-6 text-sm border border-blue-100 dark:border-blue-800 flex items-start gap-2">
                 <div className="mt-0.5"><ShieldAlert size={16} /></div>
                 <span>قم بإدخال بيانات مسئول المجموعة هنا. سيتمكن من الدخول للموقع وتحميل ملفات طلابه.</span>
             </div>
            <form onSubmit={handleAddTrainer}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1">
                     <Input icon={UserIcon} label="الاسم الثلاثي" value={tName} onChange={(e) => setTName(e.target.value)} required placeholder="الاسم كامل" />
                  </div>
                   <div className="col-span-1">
                     <Input icon={Phone} label="رقم الهاتف" value={tPhone} onChange={(e) => setTPhone(e.target.value)} placeholder="01xxxxxxxxx" />
                   </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1">
                      <Input icon={Mail} label="البريد الإلكتروني" value={tEmail} onChange={(e) => setTEmail(e.target.value)} required type="email" placeholder="example@domain.com" />
                  </div>
                   <div className="col-span-1">
                      <Input icon={Lock} label="كلمة المرور" value={tPass} onChange={(e) => setTPass(e.target.value)} required type="password" placeholder="******" />
                   </div>
              </div>
              
              <Button type="submit" className="w-full">تسجيل المسئول</Button>
            </form>
          </Card>
          <Card title="قائمة مسئولي المجموعات الحاليين">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
                  <tr>
                    <th className="p-4 font-semibold">الاسم</th>
                    <th className="p-4 font-semibold">الهاتف</th>
                    <th className="p-4 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {trainers.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4 font-medium text-navy dark:text-gray-200">
                          {t.name}
                          <div className="text-xs text-gray-400">{t.email}</div>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400">{t.phone}</td>
                      <td className="p-4 flex gap-2">
                          <button onClick={() => openEditModal(t)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400" title="تعديل"><Edit size={16} /></button>
                          {/* Deleted trash button as requested */}
                      </td>
                    </tr>
                  ))}
                  {trainers.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-gray-400">لا يوجد مسئولين مسجلين بعد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      
      {activeTab === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <Card title="إضافة متدرب جديد">
                    <form onSubmit={handleAddTrainee} className="space-y-4">
                        <Input icon={UserIcon} label="الاسم" value={trName} onChange={(e) => setTrName(e.target.value)} required placeholder="اسم المتدرب" />
                        <Input icon={Mail} label="البريد" value={trEmail} onChange={(e) => setTrEmail(e.target.value)} required type="email" placeholder="email@example.com" />
                        <Input icon={Phone} label="الهاتف" value={trPhone} onChange={(e) => setTrPhone(e.target.value)} placeholder="01xxxx" />
                        <Input icon={Lock} label="كلمة المرور" value={trPass} onChange={(e) => setTrPass(e.target.value)} required type="password" />
                        <Select 
                            label="مسئول المجموعة"
                            value={trTrainerId}
                            onChange={(e) => setTrTrainerId(e.target.value)}
                            options={trainers.map(t => ({ label: t.name, value: t.id }))}
                            icon={Briefcase}
                        />
                        <Button type="submit" variant="success" className="w-full">إضافة المتدرب</Button>
                    </form>
                </Card>

                <Card title="إرسال ملف/رابط لمتدرب (Exchange)">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800">
                        سيظهر الملف أو الرابط فوراً في لوحة تحكم المتدرب في قسم "الوارد".
                    </div>
                    <form onSubmit={handleUploadForTrainee} className="space-y-4">
                        <Select 
                            label="اختر المتدرب المستلم"
                            value={uploadTraineeId}
                            onChange={(e) => setUploadTraineeId(e.target.value)}
                            options={traineesList.map(t => ({ label: `${t.name}`, value: t.id }))}
                            icon={UserIcon}
                        />
                         <div className="border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-4 text-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer relative group">
                           <input 
                            type="file" 
                            id="admin-file-upload"
                            className="hidden" 
                            accept="image/*,video/*,application/pdf,.doc,.docx"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                           />
                           <label htmlFor="admin-file-upload" className="cursor-pointer block w-full h-full">
                               <UploadCloud className="mx-auto text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={24} />
                               <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                                   {uploadFile ? uploadFile.name : 'اختر صورة/فيديو/ملف'}
                               </span>
                           </label>
                       </div>
                       <div className="relative flex items-center gap-2">
                           <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                           <span className="text-xs text-gray-400 font-bold">أو</span>
                           <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                       </div>
                       <Input 
                         label="رابط خارجي (Drive/Dropbox/Youtube)"
                         value={uploadLink}
                         onChange={(e) => setUploadLink(e.target.value)}
                         placeholder="https://..."
                         icon={LinkIcon}
                       />
                       <Input 
                        label="رسالة للمتدرب" 
                        value={uploadDesc} 
                        onChange={(e) => setUploadDesc(e.target.value)} 
                        placeholder="مثال: يرجى مراجعة هذا الملف..."
                       />
                       
                       {isUploading && (
                         <div className="animate-fadeIn">
                             <ProgressBar progress={uploadProgress} label="جاري الإرسال..." />
                         </div>
                       )}

                       <Button type="submit" className="w-full" disabled={!uploadTraineeId || (!uploadFile && !uploadLink) || isUploading} isLoading={isUploading}>
                           <Send size={16} /> {isUploading ? 'جاري الإرسال...' : 'إرسال للمتدرب'}
                       </Button>
                    </form>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
                 {/* Trainee List & Files List */}
                 {/* ... (Existing code) ... */}
                 <Card title="إدارة المتدربين المسجلين" action={<Badge color="green">{traineesList.length} متدرب</Badge>}>
                     <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold">الاسم</th>
                                    <th className="p-3 font-semibold">المسئول</th>
                                    <th className="p-3 font-semibold">الهاتف</th>
                                    <th className="p-3 font-semibold">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {traineesList.map(u => {
                                    const trainer = trainers.find(t => t.id === u.assigned_trainer_id);
                                    return (
                                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="p-3 font-medium text-navy dark:text-gray-200">
                                                {u.name}
                                                <div className="text-xs text-gray-400">{u.email}</div>
                                            </td>
                                            <td className="p-3 text-gray-500 dark:text-gray-400">
                                                {trainer ? trainer.name : <span className="text-red-400">غير معين</span>}
                                            </td>
                                            <td className="p-3 text-gray-500 dark:text-gray-400">{u.phone}</td>
                                            <td className="p-3 flex gap-2">
                                                <button onClick={() => openEditModal(u)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"><Edit size={14}/></button>
                                                <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {traineesList.length === <tr><td colSpan={4} className="p-4 text-center text-gray-400">لا يوجد متدربين</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card title="سجل الملفات المتبادلة (Cloud)" action={<div className="text-xs text-gray-400 flex items-center gap-1"><Maximize2 size={12}/> اضغط على الصف للتفاصيل</div>}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
                        <tr>
                        <th className="p-4 font-semibold">المرسل/المستلم</th>
                        <th className="p-4 font-semibold">المحتوى</th>
                        <th className="p-4 font-semibold">الحالة</th>
                        <th className="p-4 font-semibold">الدرجة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {allFiles.map((f) => {
                            const isSenderTrainee = f.sender_role === 'trainee' || !f.sender_role;
                            return (
                        <React.Fragment key={f.id}>
                            <tr 
                                onClick={() => toggleFileRow(f.id)} 
                                className={`hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer ${expandedFileId === f.id ? 'bg-blue-50/50 dark:bg-gray-700/50' : ''}`}
                            >
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-navy dark:text-white">إلى: {f.user_name}</span>
                                        <span className="text-xs text-gray-400">من: {f.sender_name || 'غير معروف'}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-start gap-3 text-navy dark:text-gray-200">
                                        {renderFilePreview(f)}
                                        <div className="flex flex-col justify-center">
                                            <span className="font-bold flex items-center gap-2">
                                                {f.is_link ? <LinkIcon size={14} className="text-blue-500"/> : null}
                                                {f.filename}
                                                {expandedFileId === f.id ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"/>}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{f.description}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Badge color={f.status === 'graded' ? 'green' : 'yellow'}>
                                        {f.status === 'graded' ? 'تم التصحيح' : 'قيد الانتظار'}
                                    </Badge>
                                </td>
                                <td className="p-4 font-bold text-navy dark:text-gray-200">{f.score ? `${f.score}/100` : '-'}</td>
                            </tr>
                            
                            {/* Expanded Details Row */}
                            {expandedFileId === f.id && (
                                <tr className="bg-gray-50 dark:bg-gray-800/50 animate-fadeIn">
                                    <td colSpan={4} className="p-4 border-b border-gray-100 dark:border-gray-700">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Media Preview Section - Large */}
                                            {f.file_url && (isImage(f.filename) || isVideo(f.filename)) && (
                                                <div className="w-full md:w-1/3 flex-shrink-0">
                                                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-black shadow-sm">
                                                        {isImage(f.filename) ? (
                                                            <img src={f.file_url} alt={f.filename} className="w-full h-auto object-contain max-h-64" />
                                                        ) : (
                                                            <video src={f.file_url} controls className="w-full h-auto max-h-64" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Details Section */}
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-1">وصف الملف/الرسالة:</h5>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                                                        {f.description}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400 block text-xs">تاريخ الإرسال:</span>
                                                        <span className="font-medium">{f.upload_date}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400 block text-xs">المرسل:</span>
                                                        <span className="font-medium">{f.sender_name} ({f.sender_role})</span>
                                                    </div>
                                                </div>

                                                {f.file_url && (
                                                    <div className="pt-2">
                                                        <a 
                                                            href={f.file_url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-bold transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {f.is_link ? <LinkIcon size={16}/> : <Download size={16}/>} 
                                                            {f.is_link ? 'فتح الرابط' : 'تحميل الملف'}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                        );
                        })}
                        {allFiles.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد ملفات مرفوعة حتى الآن</td></tr>
                        )}
                    </tbody>
                    </table>
                </div>
                </Card>
            </div>
        </div>
      )}
      
      {activeTab === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <Card title="إضافة مصدر تعليمي جديد">
                    <form onSubmit={handleAddResource} className="space-y-4">
                        <Input icon={BookOpen} label="عنوان المصدر" value={rTitle} onChange={(e) => setRTitle(e.target.value)} required placeholder="اسم الكتاب / الفيديو" />
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">نوع المصدر</label>
                            <select 
                                value={rType} 
                                onChange={(e) => setRType(e.target.value as any)}
                                className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="pdf">ملف PDF</option>
                                <option value="video">فيديو</option>
                                <option value="link">رابط خارجي</option>
                            </select>
                        </div>
                        <Input icon={LinkIcon} label="رابط المصدر" value={rLink} onChange={(e) => setRLink(e.target.value)} required placeholder="https://..." />
                        
                        <div>
                            <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">وصف المصدر</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={rDesc}
                                    onChange={(e) => setRDesc(e.target.value)}
                                    placeholder="وصف قصير للمحتوى..."
                                />
                                <button 
                                    type="button"
                                    onClick={handleAiResourceDesc}
                                    disabled={isAiLoading || !rTitle}
                                    className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 p-2.5 rounded-xl transition-colors"
                                    title="توليد وصف بالذكاء الاصطناعي"
                                >
                                    <Sparkles size={20} className={isAiLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full">
                            <Upload size={18} /> نشر في المكتبة
                        </Button>
                    </form>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card title="محتوى المكتبة والمصادر" action={<Badge color="purple">{resources.length} عنصر</Badge>}>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {resources.map((res) => (
                            <div key={res.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl group hover:shadow-md transition-all">
                                <div className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-purple-600 dark:text-purple-400">
                                    {res.type === 'pdf' ? <BookOpen size={24} /> : res.type === 'video' ? <Video size={24} /> : <LinkIcon size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-navy dark:text-white text-lg">{res.title}</h4>
                                        <button 
                                            onClick={() => {
                                                if(window.confirm('حذف هذا المصدر؟')) db.deleteResource(res.id);
                                            }}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{res.description}</p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <a 
                                            href={res.link} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink size={14} /> فتح الرابط
                                        </a>
                                        <span className="text-xs text-gray-400">{new Date(res.created_at).toLocaleDateString('ar-EG')}</span>
                                        <Badge color={res.target_audience === 'all' ? 'yellow' : 'blue'}>
                                            {res.target_audience === 'all' ? 'عام للجميع' : 'مخصص'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {resources.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <Library size={48} className="mx-auto mb-4 opacity-20" />
                                <p>المكتبة فارغة حالياً. قم بإضافة مصادر جديدة.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
      )}

      {activeTab === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <Card title="جدولة اجتماع جديد">
                    <form onSubmit={handleAddMeeting} className="space-y-4">
                        <Input icon={Video} label="عنوان الاجتماع / الموضوع" value={mTopic} onChange={(e) => setMTopic(e.target.value)} required placeholder="ورشة عمل..." />
                        <Input icon={LinkIcon} label="رابط الاجتماع (Zoom/Teams)" value={mLink} onChange={(e) => setMLink(e.target.value)} required placeholder="https://zoom.us/j/..." />
                        
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">الجمهور المستهدف</label>
                            <select 
                                value={mTarget} 
                                onChange={(e) => setMTarget(e.target.value as any)}
                                className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">جميع المستخدمين</option>
                                <option value="trainers">مسئولي المجموعات فقط</option>
                                <option value="group">مجموعة محددة</option>
                            </select>
                        </div>

                        {mTarget === 'group' && (
                            <Select 
                                label="اختر المجموعة"
                                value={mGroupId}
                                onChange={(e) => setMGroupId(e.target.value)}
                                options={trainers.map(t => ({ label: `مجموعة: ${t.name}`, value: t.id }))}
                            />
                        )}

                        <Button type="submit" className="w-full">
                            <Calendar size={18} /> نشر الاجتماع
                        </Button>
                    </form>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card title="الاجتماعات المجدولة" action={<Badge color="blue">{meetings.length} اجتماع</Badge>}>
                    <div className="space-y-4">
                        {meetings.map((m) => (
                            <div key={m.id} className="border border-blue-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-white dark:bg-gray-800">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                            <Video size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-navy dark:text-white">{m.topic}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                تم النشر: {new Date(m.created_at).toLocaleDateString('ar-EG')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge color={m.target_audience === 'all' ? 'green' : m.target_audience === 'trainers' ? 'purple' : 'orange'}>
                                            {m.target_audience === 'all' ? 'للجميع' : m.target_audience === 'trainers' ? 'للمسئولين' : 'لمجموعة محددة'}
                                        </Badge>
                                        <a href={m.link} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">
                                            انضمام
                                        </a>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button 
                                        onClick={() => setExpandedMeetingId(expandedMeetingId === m.id ? null : m.id)}
                                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors w-full"
                                    >
                                        <MessageCircle size={16} />
                                        <span>إرسال تذكير واتساب للمدعوين</span>
                                        {expandedMeetingId === m.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                    
                                    {expandedMeetingId === m.id && (
                                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 animate-fadeIn max-h-40 overflow-y-auto">
                                            {getMeetingRecipients(m).map(u => (
                                                <button 
                                                    key={u.id}
                                                    onClick={() => sendWhatsapp(u.phone || '', u.name, m.topic, m.link)}
                                                    className="flex items-center gap-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-2 rounded hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800 transition-colors text-left"
                                                >
                                                    <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 p-1 rounded-full">
                                                        <MessageCircle size={12} />
                                                    </div>
                                                    <span className="truncate">{u.name}</span>
                                                </button>
                                            ))}
                                            {getMeetingRecipients(m).length === 0 && (
                                                <p className="col-span-full text-center text-xs text-gray-400">لا توجد أرقام هاتف مسجلة لهؤلاء المستخدمين.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {meetings.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                                <p>لا توجد اجتماعات مجدولة.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
      )}

      {activeTab === 5 && (
          <div className="space-y-6">
              <Card title="إدارة الإعلانات العامة">
                  <div className="flex gap-4 items-start">
                      <div className="flex-1">
                          <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">نص الإعلان (يظهر في الشريط العلوي لجميع المستخدمين)</label>
                          <textarea 
                              value={announcementText}
                              onChange={(e) => setAnnouncementText(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="اكتب تنبيهاً هاماً..."
                          ></textarea>
                      </div>
                      <Button onClick={handleUpdateAnnouncement} className="mt-8 h-fit">
                          <Megaphone size={18} /> تحديث
                      </Button>
                  </div>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                  <Card title="النسخ الاحتياطي (Backup)">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          قم بتحميل نسخة كاملة من قاعدة البيانات (users, files, meetings) بصيغة JSON لاستعادتها لاحقاً.
                      </p>
                      <div className="flex flex-col gap-4">
                          <Button onClick={() => db.exportDB()} variant="secondary" className="w-full justify-between">
                              <span>تصدير البيانات (Download)</span>
                              <Download size={18} />
                          </Button>
                          
                          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                              <p className="text-xs font-bold text-navy dark:text-gray-300 mb-2">استعادة نسخة سابقة:</p>
                              <div className="flex gap-2">
                                  <input 
                                      type="file" 
                                      accept=".json"
                                      onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                  />
                                  <Button onClick={handleRestoreBackup} disabled={!restoreFile} className="whitespace-nowrap px-3">
                                      <RefreshCw size={16} /> استعادة
                                  </Button>
                              </div>
                          </div>
                      </div>
                  </Card>

                  <Card title="التقارير والبيانات">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          تصدير بيانات المستخدمين (المتدربين والمدربين) إلى ملف Excel/CSV.
                      </p>
                      <Button onClick={() => db.exportUsersToCSV()} variant="secondary" className="w-full justify-between mb-4">
                          <span>تصدير قائمة المستخدمين (CSV)</span>
                          <FileSpreadsheet size={18} />
                      </Button>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                          <h4 className="font-bold mb-1 flex items-center gap-1"><Database size={14}/> حالة النظام:</h4>
                          <p>عدد المستخدمين: {users.length}</p>
                          <p>عدد الملفات: {allFiles.length}</p>
                          <p>حجم التخزين المحلي: {JSON.stringify(localStorage).length} bytes</p>
                      </div>
                  </Card>
              </div>
          </div>
      )}
    </div>
  );
}