import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User } from '../types';
import { Button, Input, Select, Card } from '../components/ui';
import { GraduationCap, Mail, Lock, User as UserIcon, Phone, Briefcase, KeyRound, ArrowRight, UploadCloud, Database } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'restore'>('login');
  const [trainers, setTrainers] = useState<User[]>([]);

  // Login State
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  // Register State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<string | number>('');

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [newResetPass, setNewResetPass] = useState('');

  // Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  useEffect(() => {
    if (view === 'register') {
        setTrainers(db.getTrainers());
    }
  }, [view]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = db.login(email, pass);
    if (user) {
        alert(`مرحباً بك ${user.name}`);
        onLogin(user);
    } else {
        alert('بيانات الدخول غير صحيحة. تأكد من استعادة النسخة الاحتياطية إذا كنت تستخدم جهازاً جديداً.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) {
        alert('يجب اختيار مسئول المجموعة');
        return;
    }

    try {
        const newUser = db.saveUser({
            name: newName,
            email: newEmail,
            password: newPass,
            phone: newPhone,
            role: 'trainee',
            assigned_trainer_id: Number(selectedTrainer)
        });
        alert('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.');
        setView('login');
        // Pre-fill login
        setEmail(newEmail);
        setPass('');
    } catch (err: any) {
        alert(err.message);
    }
  };

  const handleResetCheck = (e: React.FormEvent) => {
      e.preventDefault();
      const users = db.getUsers();
      const userExists = users.find(u => u.email === resetEmail);
      
      if (userExists) {
          // Simulation of sending email
          alert(`تم إرسال رابط استعادة كلمة المرور إلى ${resetEmail}\n(محاكاة: يمكنك تعيين كلمة المرور الجديدة الآن)`);
          setResetStep(2);
      } else {
          alert('هذا البريد الإلكتروني غير مسجل لدينا.');
      }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const success = db.updatePassword(resetEmail, newResetPass);
      if (success) {
          alert('تم تغيير كلمة المرور بنجاح. يمكنك الدخول الآن.');
          setView('login');
          setResetStep(1);
          setResetEmail('');
          setNewResetPass('');
      } else {
          alert('حدث خطأ غير متوقع.');
      }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) {
        alert("يرجى اختيار ملف النسخة الاحتياطية (JSON)");
        return;
    }

    if (!window.confirm("تحذير: سيتم استبدال البيانات الموجودة في هذا المتصفح بالبيانات الموجودة في الملف. هل أنت متأكد؟")) {
        return;
    }

    const text = await restoreFile.text();
    const success = db.importDB(text);
    if (success) {
        alert("تم استعادة البيانات بنجاح! يمكنك الآن تسجيل الدخول بحساباتك المحفوظة.");
        window.location.reload();
    } else {
        alert("فشل في استعادة البيانات. الملف قد يكون تالفاً.");
    }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
             <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white mb-4 shadow-lg shadow-blue-200 dark:shadow-none">
                 <GraduationCap size={48} />
             </div>
             <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">منصة تدريب مصممي الحقائب</h1>
             <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">بوابتك لتعلم واحتراف تصميم الحقائب</p>
        </div>

        <Card className="shadow-xl border-0 ring-1 ring-gray-100 dark:ring-gray-700 relative overflow-hidden">
            {/* Database Sync Icon */}
            {view === 'login' && (
                <button 
                    onClick={() => setView('restore')}
                    className="absolute top-4 left-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="استعادة بيانات / نقل النظام"
                >
                    <Database size={20} />
                </button>
            )}

            {/* Tabs / Header */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 mb-6">
                <button 
                    className={`flex-1 py-3 text-center font-bold text-sm transition-colors relative ${view === 'login' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    onClick={() => setView('login')}
                >
                    تسجيل الدخول
                    {view === 'login' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>}
                </button>
                <button 
                    className={`flex-1 py-3 text-center font-bold text-sm transition-colors relative ${view === 'register' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    onClick={() => setView('register')}
                >
                    حساب متدرب جديد
                    {view === 'register' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>}
                </button>
            </div>

            {view === 'login' && (
                <form onSubmit={handleLogin} className="space-y-2">
                    <Input icon={Mail} label="البريد الإلكتروني" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" />
                    <Input icon={Lock} label="كلمة المرور" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required placeholder="******" />
                    
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setView('forgot')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            نسيت كلمة المرور؟
                        </button>
                    </div>

                    <Button type="submit" className="w-full text-lg py-3 mt-4">دخول</Button>
                </form>
            )}

            {view === 'register' && (
                <form onSubmit={handleRegister} className="space-y-2">
                    <Input icon={UserIcon} label="الاسم الثلاثي" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="الاسم كامل" />
                    <Input icon={Mail} label="البريد الإلكتروني" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required placeholder="name@example.com" />
                    <Input icon={Lock} label="كلمة المرور" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required placeholder="******" />
                    <Input icon={Phone} label="رقم الهاتف" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="01xxxxxxxxx" />
                    
                    <Select 
                        icon={Briefcase}
                        label="اختر مسئول المجموعة"
                        value={selectedTrainer}
                        onChange={(e) => setSelectedTrainer(e.target.value)}
                        options={trainers.map(t => ({ label: t.name, value: t.id }))}
                    />
                    
                    <Button type="submit" className="w-full text-lg py-3 mt-4">تسجيل حساب</Button>
                </form>
            )}

            {view === 'forgot' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="text-center mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-2">
                            <KeyRound size={24} />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">استعادة كلمة المرور</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">أدخل بريدك الإلكتروني لاستلام رابط إعادة التعيين</p>
                    </div>

                    {resetStep === 1 ? (
                        <form onSubmit={handleResetCheck} className="space-y-4">
                            <Input icon={Mail} label="البريد الإلكتروني" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required placeholder="name@example.com" />
                            <Button type="submit" className="w-full">إرسال رابط التحقق</Button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetSubmit} className="space-y-4">
                            <Input icon={Lock} label="كلمة المرور الجديدة" type="password" value={newResetPass} onChange={(e) => setNewResetPass(e.target.value)} required placeholder="******" />
                            <Button type="submit" variant="success" className="w-full">تغيير كلمة المرور</Button>
                        </form>
                    )}

                     <button 
                        type="button" 
                        onClick={() => { setView('login'); setResetStep(1); }}
                        className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mt-4 flex items-center justify-center gap-1"
                    >
                        <ArrowRight size={14} /> العودة لتسجيل الدخول
                    </button>
                </div>
            )}

            {view === 'restore' && (
                <div className="space-y-4 animate-fadeIn">
                     <div className="text-center mb-4">
                        <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-orange-600 dark:text-orange-400 mb-2">
                            <Database size={24} />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">نقل / استعادة النظام</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            استخدم هذه الميزة إذا كنت تدخل من جهاز جديد وترغب في استعادة حساباتك وبياناتك السابقة المحفوظة (من ملف Backup).
                        </p>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                         <input 
                            type="file" 
                            accept=".json"
                            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        />
                    </div>
                    
                    <Button onClick={handleRestoreBackup} className="w-full" disabled={!restoreFile}>
                        <UploadCloud size={18} /> استعادة البيانات الآن
                    </Button>

                    <button 
                        type="button" 
                        onClick={() => setView('login')}
                        className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mt-4 flex items-center justify-center gap-1"
                    >
                        <ArrowRight size={14} /> إلغاء والعودة
                    </button>
                </div>
            )}
        </Card>
      </div>
    </div>
  );
}