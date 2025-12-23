import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, FileRecord, Resource, Meeting, LoginLog } from '../types';
import { Button, Input, Select, Card, Badge } from '../components/ui';
import { Users, FileText, Video, ShieldAlert, Download, UploadCloud, Mail, Lock, Phone, User as UserIcon, Link as LinkIcon, Type, Briefcase, BarChart, Library, BookOpen, AlignLeft, MessageCircle, ExternalLink, Calendar, Upload, Send, FileSpreadsheet, Megaphone, Activity, CheckCircle, Trash2, Edit, X } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [allFiles, setAllFiles] = useState<FileRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  
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

  // Announcement
  const [announcementText, setAnnouncementText] = useState('');

  // Restore
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Upload for Trainee (Admin)
  const [uploadTraineeId, setUploadTraineeId] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setTrainers(db.getTrainers());
    setAllFiles(db.getFiles());
    setUsers(db.getUsers());
    setResources(db.getResources());
    setMeetings(db.getMeetings().reverse()); // Show newest first
    setAnnouncementText(db.getAnnouncement());
    setLoginLogs(db.getLoginLogs());
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
            refreshData();
        } catch (err: any) {
            alert("خطأ: هذا البريد الإلكتروني مسجل مسبقاً لمستخدم آخر.");
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
          refreshData();
      } catch (err: any) {
          alert("خطأ: البريد الإلكتروني مسجل مسبقاً");
      }
  }

  const handleDeleteUser = (id: number, name: string) => {
      if (window.confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
          try {
              db.deleteUser(id);
              alert("تم الحذف بنجاح.");
              refreshData();
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
      refreshData();
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
    refreshData();
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
      refreshData();
  }

  const handleUpdateAnnouncement = () => {
      db.setAnnouncement(announcementText);
      alert('تم تحديث التنبيه العام. سيظهر لجميع المستخدمين.');
      window.location.reload(); // To see it immediately in layout
  }

  const handleRestoreBackup = async () => {
      if (!restoreFile) {
          alert("يرجى اختيار ملف النسخة الاحتياطية (JSON)");
          return;
      }

      if (!window.confirm("تحذير: استعادة النسخة الاحتياطية سيقوم بحذف جميع البيانات الحالية واستبدالها بالبيانات الموجودة في الملف. هل أنت متأكد؟")) {
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

  const handleUploadForTrainee = (e: React.FormEvent) => {
      e.preventDefault();
      if (!uploadTraineeId || !uploadFile) {
          alert('يرجى اختيار المتدرب والملف');
          return;
      }
      db.addFile(Number(uploadTraineeId), uploadFile.name, uploadDesc || 'ملف تم رفعه بواسطة الإدارة');
      alert('تم رفع الملف للمتدرب بنجاح');
      setUploadFile(null);
      setUploadDesc('');
      setUploadTraineeId('');
      refreshData();
  }

  // Helper to format phone for WhatsApp (Simple Egyptian formatting assumption)
  const formatPhoneForWhatsapp = (phone: string) => {
      let p = phone.trim();
      // Replace leading 0 with 20 (Egypt code) if it looks like a local mobile number
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
          // Get the trainer and his trainees
          const targetTrainer = trainers.find(t => t.id === m.target_group_id);
          const trainees = users.filter(u => u.assigned_trainer_id === m.target_group_id);
          const list = [...trainees];
          if (targetTrainer) list.push(targetTrainer);
          return list.filter(u => u.phone);
      }
      return [];
  };

  // Analytics Helpers
  const traineesCount = users.filter(u => u.role === 'trainee').length;
  const gradedFilesCount = allFiles.filter(f => f.status === 'graded').length;
  const activeTrainers = trainers.filter(t => users.some(u => u.assigned_trainer_id === t.id));

  // Get only trainees for the dropdown
  const traineesList = users.filter(u => u.role === 'trainee');

  const tabs = [
    { name: 'لوحة التحليلات', icon: <BarChart size={18} /> },
    { name: 'مسئولي المجموعات', icon: <Users size={18} /> },
    { name: 'متابعة المتدربين', icon: <FileText size={18} /> },
    { name: 'المكتبة والمصادر', icon: <Library size={18} /> },
    { name: 'الاجتماعات', icon: <Video size={18} /> },
    { name: 'الإعدادات والبيانات', icon: <ShieldAlert size={18} /> },
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="text-center flex flex-col items-center justify-center p-6 transition-transform hover:-translate-y-1">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400 mb-4 inline-flex shadow-sm">
                        <Users size={28} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">عدد المتدربين</p>
                    <h2 className="text-4xl font-extrabold text-navy dark:text-blue-400">{traineesCount}</h2>
                    <span className="text-xs text-green-600 font-bold bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-2 inline-block">نشط</span>
                </Card>
                <Card className="text-center flex flex-col items-center justify-center p-6 transition-transform hover:-translate-y-1">
                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full text-green-600 dark:text-green-400 mb-4 inline-flex shadow-sm">
                        <Briefcase size={28} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">مسئولي المجموعات</p>
                    <h2 className="text-4xl font-extrabold text-navy dark:text-green-400">{trainers.length}</h2>
                    <span className="text-xs text-blue-600 font-bold bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full mt-2 inline-block">مشرف</span>
                </Card>
                <Card className="text-center flex flex-col items-center justify-center p-6 transition-transform hover:-translate-y-1">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-full text-orange-600 dark:text-orange-400 mb-4 inline-flex shadow-sm">
                        <FileText size={28} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">إجمالي الملفات</p>
                    <h2 className="text-4xl font-extrabold text-navy dark:text-orange-400">{allFiles.length}</h2>
                    <span className="text-xs text-orange-600 font-bold bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full mt-2 inline-block">تم الرفع</span>
                </Card>
                <Card className="text-center flex flex-col items-center justify-center p-6 transition-transform hover:-translate-y-1">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="نشاط مسئولي المجموعات">
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                        {trainers.map(t => {
                            const trainerTrainees = users.filter(u => u.assigned_trainer_id === t.id);
                            return (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full text-primary dark:text-blue-400"><UserIcon size={16}/></div>
                                        <div>
                                            <p className="font-bold text-navy dark:text-white">{t.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{trainerTrainees.length} متدرب</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
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
                 <span>قم بإدخال بيانات مسئول المجموعة هنا. سيمكنه استخدام هذا الإيميل وكلمة المرور للدخول فوراً.</span>
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
                          <button onClick={() => handleDeleteUser(t.id, t.name)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400" title="حذف"><Trash2 size={16} /></button>
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

                <Card title="رفع ملف لمتدرب (نيابة عنه)">
                    <form onSubmit={handleUploadForTrainee} className="space-y-4">
                        <Select 
                            label="اختر المتدرب"
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
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                           />
                           <label htmlFor="admin-file-upload" className="cursor-pointer block w-full h-full">
                               <Upload className="mx-auto text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={24} />
                               <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                                   {uploadFile ? uploadFile.name : 'اختر الملف'}
                               </span>
                           </label>
                       </div>
                       <Input 
                        label="وصف الملف" 
                        value={uploadDesc} 
                        onChange={(e) => setUploadDesc(e.target.value)} 
                        placeholder="مثال: تعيين إضافي..."
                       />
                       <Button type="submit" className="w-full" disabled={!uploadFile || !uploadTraineeId}>
                           <Send size={16} /> رفع
                       </Button>
                    </form>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
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
                                {traineesList.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">لا يوجد متدربين</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card title="سجل الملفات المرفوعة">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
                        <tr>
                        <th className="p-4 font-semibold">المتدرب</th>
                        <th className="p-4 font-semibold">الملف</th>
                        <th className="p-4 font-semibold">الحالة</th>
                        <th className="p-4 font-semibold">الدرجة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {allFiles.map((f) => (
                        <tr key={f.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors group">
                            <td className="p-4 font-bold text-primary dark:text-blue-400">{f.user_name}</td>
                            <td className="p-4">
                                <div className="flex items-center gap-2 text-navy dark:text-gray-200">
                                    <div className="bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 p-1.5 rounded">
                                        <FileText size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span>{f.filename}</span>
                                        <span className="text-[10px] text-gray-400">{f.description}</span>
                                    </div>
                                </div>
                                <button className="text-xs text-blue-600 hover:underline mt-1 mr-8 flex items-center gap-1">
                                    <Download size={12} /> تحميل
                                </button>
                            </td>
                            <td className="p-4">
                                <Badge color={f.status === 'graded' ? 'green' : 'yellow'}>
                                    {f.status === 'graded' ? 'تم التصحيح' : 'قيد الانتظار'}
                                </Badge>
                            </td>
                            <td className="p-4 font-bold text-navy dark:text-gray-200">{f.score ? `${f.score}/100` : '-'}</td>
                        </tr>
                        ))}
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
        <div className="grid lg:grid-cols-2 gap-6">
            <Card title="إضافة مصدر تعليمي">
                <form onSubmit={handleAddResource}>
                    <Input icon={BookOpen} label="عنوان المصدر" value={rTitle} onChange={(e) => setRTitle(e.target.value)} required placeholder="مثال: أساسيات التصميم (PDF)" />
                    <Input icon={AlignLeft} label="وصف المصدر" value={rDesc} onChange={(e) => setRDesc(e.target.value)} placeholder="وصف مختصر لمحتوى الملف..." />
                    <Input icon={LinkIcon} label="رابط التحميل / المشاهدة" value={rLink} onChange={(e) => setRLink(e.target.value)} required placeholder="https://..." />
                    
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">نوع الملف</label>
                        <select 
                            value={rType} 
                            onChange={(e) => setRType(e.target.value as any)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl"
                        >
                            <option value="pdf">ملف PDF</option>
                            <option value="video">فيديو</option>
                            <option value="link">رابط خارجي</option>
                        </select>
                    </div>
                    <Button type="submit" className="w-full">نشر للمكتبة العامة</Button>
                </form>
            </Card>
            <Card title="المصادر الحالية">
                <div className="space-y-3">
                    {resources.map(r => (
                        <div key={r.id} className="flex flex-col p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 p-2 rounded">
                                        {r.type === 'pdf' ? <FileText size={18}/> : r.type === 'video' ? <Video size={18}/> : <LinkIcon size={18}/>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-navy dark:text-gray-200">{r.title}</p>
                                        <p className="text-xs text-gray-400">{r.created_at}</p>
                                    </div>
                                </div>
                                <a href={r.link} target="_blank" rel="noreferrer" className="text-primary dark:text-blue-400 text-sm font-bold hover:underline">عرض</a>
                            </div>
                            {r.description && <p className="text-xs text-gray-500 mt-2 mr-10">{r.description}</p>}
                        </div>
                    ))}
                     {resources.length === 0 && <p className="text-gray-400 text-center py-4">المكتبة فارغة</p>}
                </div>
            </Card>
        </div>
      )}

      {activeTab === 4 && (
        <div className="space-y-6">
            <Card title="إعداد اجتماع Zoom">
            <form onSubmit={handleAddMeeting}>
                <Input icon={LinkIcon} label="رابط الاجتماع" value={mLink} onChange={(e) => setMLink(e.target.value)} required placeholder="https://zoom.us/j/..." />
                <Input icon={Type} label="موضوع الاجتماع" value={mTopic} onChange={(e) => setMTopic(e.target.value)} required placeholder="مناقشة التصاميم..." />
                
                <div className="mb-4">
                <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">الموجه لهم</label>
                <div className="relative group">
                    <Users className="absolute right-3 top-3 text-gray-400 pointer-events-none group-focus-within:text-primary" size={18} />
                    <select 
                        value={mTarget} 
                        onChange={(e) => setMTarget(e.target.value as any)}
                        className="w-full pr-10 pl-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none shadow-sm text-gray-900 dark:text-white"
                    >
                        <option value="all">الجميع</option>
                        <option value="trainers">مسئولي المجموعات فقط</option>
                        <option value="group">مجموعة محددة</option>
                    </select>
                </div>
                </div>

                {mTarget === 'group' && (
                    <div className="mb-4 animate-fadeIn">
                        <Select 
                            icon={Briefcase}
                            label="اختر مسئول المجموعة"
                            value={mGroupId}
                            onChange={(e) => setMGroupId(e.target.value)}
                            options={trainers.map(t => ({ label: `مجموعة: ${t.name}`, value: t.id }))}
                        />
                    </div>
                )}

                <Button type="submit" className="w-full">نشر الاجتماع</Button>
            </form>
            </Card>

            {meetings.length > 0 && (
                <div className="grid gap-4">
                    <h3 className="text-xl font-bold text-navy dark:text-gray-200 px-2">الاجتماعات النشطة</h3>
                    {meetings.map(m => {
                        const recipients = getMeetingRecipients(m);
                        const isExpanded = expandedMeetingId === m.id;
                        
                        return (
                            <Card key={m.id} className="border-l-4 border-l-blue-500">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge color="blue">
                                                {m.target_audience === 'all' ? 'للجميع' : m.target_audience === 'trainers' ? 'للمسئولين' : 'مجموعة خاصة'}
                                            </Badge>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Calendar size={12} /> {new Date(m.created_at).toLocaleDateString('ar-EG')}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-lg text-navy dark:text-white">{m.topic}</h4>
                                        <a href={m.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1">
                                            <LinkIcon size={14} /> {m.link}
                                        </a>
                                    </div>
                                    <div className="flex gap-2">
                                         <Button 
                                            variant="secondary" 
                                            onClick={() => setExpandedMeetingId(isExpanded ? null : m.id)}
                                            className="text-sm"
                                        >
                                            <MessageCircle size={16} /> 
                                            إرسال عبر واتساب ({recipients.length})
                                        </Button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
                                        <h5 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">اختر مستخدم لإرسال الرابط له:</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                                            {recipients.map(u => (
                                                <div key={u.id} className="flex items-center justify-between p-2 rounded border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-1.5 rounded-full">
                                                            <UserIcon size={14} />
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                                                            <p className="text-[10px] text-gray-500">{u.phone}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => sendWhatsapp(u.phone || '', u.name, m.topic, m.link)}
                                                        className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 p-1.5 rounded-lg transition-colors"
                                                        title="إرسال عبر واتساب"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {recipients.length === 0 && (
                                                <p className="text-sm text-gray-400 col-span-full text-center py-2">لا توجد أرقام هواتف مسجلة لهذه الفئة.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
      )}

      {activeTab === 5 && (
        <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card title="إدارة التنبيهات العامة">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        النص المكتوب هنا سيظهر لجميع المستخدمين في أعلى الصفحة (باللون الأحمر).
                    </p>
                    <textarea 
                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm h-24 mb-4"
                        placeholder="أدخل نص التنبيه هنا..."
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                    ></textarea>
                    <div className="flex gap-2">
                         <Button onClick={handleUpdateAnnouncement} variant="primary" className="flex-1">
                            <Megaphone size={16} /> نشر التنبيه
                        </Button>
                         <Button onClick={() => { setAnnouncementText(''); db.setAnnouncement(''); window.location.reload(); }} variant="secondary">
                            مسح
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="space-y-6">
                 {/* Data Portability Section - Addresses "Access from any browser" */}
                <Card title="نسخ احتياطي كامل (System Backup)">
                    <p className="mb-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        استخدم هذا الخيار لنقل النظام بالكامل (المدربين، المتدربين، الملفات) إلى جهاز آخر أو متصفح جديد.
                    </p>
                    <div className="flex gap-3">
                         <Button onClick={() => db.exportDB()} className="flex-1 bg-navy hover:bg-gray-800 text-white">
                            <Download size={18} /> تحميل النسخة الكاملة (JSON)
                        </Button>
                    </div>
                </Card>

                {/* Excel Export Section */}
                <Card title="تصدير التقارير (Excel)">
                    <p className="mb-4 text-gray-600 dark:text-gray-300 text-sm">
                        تصدير بيانات مسئولي المجموعات والمتدربين إلى ملف Excel (CSV) للمراجعة والحفظ الخارجي.
                    </p>
                    <Button onClick={() => db.exportUsersToCSV()} variant="success" className="w-full">
                        <FileSpreadsheet size={18} /> تصدير بيانات المستخدمين (Excel)
                    </Button>
                </Card>

                <Card title="استعادة البيانات (Import / Restore)">
                    <p className="mb-4 text-red-600 dark:text-red-400 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded flex items-start gap-2">
                        <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                        تحذير: استعادة النسخة ستقوم بحذف البيانات الحالية واستبدالها! استخدم هذا الخيار عند الانتقال لجهاز جديد.
                    </p>
                    <div className="mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                         <input 
                            type="file" 
                            accept=".json"
                            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                        />
                    </div>
                    <Button onClick={handleRestoreBackup} className="w-full" disabled={!restoreFile}>
                        <UploadCloud size={18} /> استعادة النسخة الآن
                    </Button>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}