import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, FileRecord, Meeting, Resource } from '../types';
import { Card, Badge, Button, Input, Select, ProgressBar } from '../components/ui';
import { Users, File, Video, MessageSquare, CheckCircle, Upload, Link as LinkIcon, BookOpen, Library, AlignLeft, Send, Download, Calendar, Save, Settings, Lock, Phone, Trash2, FileText, Cloud, FolderOpen, Sparkles, X, Image as ImageIcon, PlayCircle, Bell, Clock, EyeOff, ExternalLink } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export default function TrainerDashboard({ user }: { user: User }) {
  const [trainees, setTrainees] = useState<User[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  // Notifications State (Local dismissal)
  const [dismissedFileIds, setDismissedFileIds] = useState<number[]>([]);

  // Grading State
  const [editingFile, setEditingFile] = useState<number | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Resource State
  const [rTitle, setRTitle] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rLink, setRLink] = useState('');
  const [rType, setRType] = useState<'pdf' | 'video' | 'link'>('pdf');

  // Upload for Trainee (Trainer)
  const [uploadTraineeId, setUploadTraineeId] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Attendance State
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attData, setAttData] = useState<Record<number, boolean>>({});

  // Profile Settings
  const [myPhone, setMyPhone] = useState(user.phone || '');
  const [myPass, setMyPass] = useState(user.password || '');

  useEffect(() => {
    refreshData();
    // Subscribe to DB changes (e.g. if a trainee registers in another tab)
    const unsubscribe = db.subscribe(() => {
        refreshData();
    });
    return () => unsubscribe();
  }, [user.id]);

  // Specific effect for loading attendance when date changes
  useEffect(() => {
      const records = db.getAttendance(user.id, attDate);
      const map: Record<number, boolean> = {};
      
      if (trainees.length > 0) {
        trainees.forEach(t => {
            const record = records.find(r => r.trainee_id === t.id);
            if (record) {
                map[t.id] = record.status === 'present';
            } else {
                map[t.id] = false;
            }
        });
        setAttData(map);
      }
  }, [attDate, trainees, user.id]);

  const refreshData = () => {
    const myTrainees = db.getTraineesByTrainer(user.id);
    setTrainees(myTrainees);

    const allFiles = db.getFiles();
    const myTraineesIds = myTrainees.map(t => t.id);
    // Show files where (User is my trainee AND sender is trainee) OR (User is my trainee AND sender is ME)
    // Actually, Trainer wants to see files sent BY trainees.
    const relevantFiles = allFiles.filter(f => myTraineesIds.includes(f.user_id) && f.sender_id !== user.id);
    // Sort by newest first
    relevantFiles.sort((a, b) => b.id - a.id);
    setFiles(relevantFiles);

    // Meetings
    const allMeetings = db.getMeetings();
    const relevantMeetings = allMeetings
        .filter(m => 
            m.target_audience === 'all' || 
            m.target_audience === 'trainers' || 
            (m.target_audience === 'group' && m.target_group_id === user.id)
        )
        .sort((a, b) => b.id - a.id);
    setMeetings(relevantMeetings);

    // Resources (My group + Global)
    const allResources = db.getResources();
    const relevantResources = allResources.filter(r => 
        r.target_audience === 'all' || (r.uploaded_by === user.id)
    );
    setResources(relevantResources);
  };

  const handleGrade = (fileId: number) => {
      db.gradeFile(fileId, Number(score), feedback);
      
      setEditingFile(null);
      setScore('');
      setFeedback('');
  }

  const startGrading = (file: FileRecord) => {
      setEditingFile(file.id);
      setScore(file.score?.toString() || '');
      setFeedback(file.feedback || '');
      
      // Scroll to the file card
      const element = document.getElementById(`file-card-${file.id}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }

  const handleDismissNotification = (id: number) => {
      setDismissedFileIds(prev => [...prev, id]);
  };

  const handleAiGrade = async (file: FileRecord) => {
      if (!process.env.API_KEY) {
          alert("مفتاح API غير متوفر");
          return;
      }
      setIsAiLoading(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Act as a supportive but professional design trainer.
            A trainee submitted a file named "${file.filename}" with the description: "${file.description}".
            
            Based on this context:
            1. Write a constructive feedback message in Arabic (approx 20-30 words) focusing on bag design quality and creativity.
            2. Suggest a score from 0 to 100.
            
            Return strictly JSON format: { "feedback": string, "score": number }
          `;
          
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
          });
          
          if (response.text) {
              const result = JSON.parse(response.text);
              setScore(String(result.score));
              setFeedback(result.feedback);
          }
      } catch (e) {
          console.error(e);
          alert("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي");
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleAddResource = (e: React.FormEvent) => {
      e.preventDefault();
      db.addResource({
          title: rTitle,
          description: rDesc,
          link: rLink,
          type: rType,
          uploaded_by: user.id,
          target_audience: 'group'
      });
      alert('تم إضافة المصدر لمكتبة المتدربين');
      setRTitle('');
      setRDesc('');
      setRLink('');
      setRType('pdf');
  }

  const handleDeleteResource = (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذا المصدر؟')) {
          db.deleteResource(id);
      }
  }

  const handleUploadForTrainee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!uploadTraineeId || !uploadFile) {
          alert('يرجى اختيار المتدرب والملف');
          return;
      }

      if (!db.isCloudConnected) {
          alert("عذراً، يجب أن تكون متصلاً بالإنترنت لرفع الملفات إلى السحابة.");
          return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      try {
        const fileUrl = await db.uploadFileToCloud(uploadFile, 'trainer_uploads', (progress) => {
            setUploadProgress(progress);
        });

        await db.addFile(
            Number(uploadTraineeId), 
            uploadFile.name, 
            uploadDesc || 'ملف من مسئول المجموعة', 
            fileUrl,
            user, // Send Trainer as Sender
            false
        );
        alert('تم إرسال الملف للمتدرب بنجاح ✅');
        setUploadFile(null);
        setUploadDesc('');
        setUploadTraineeId('');
        setUploadProgress(0);
      } catch (error: any) {
        alert("فشل الرفع: " + error.message);
      } finally {
        setIsUploading(false);
      }
  }

  const handleDownloadFile = (file: FileRecord) => {
      if (file.file_url) {
          window.open(file.file_url, '_blank');
      } else {
          alert(`هذا الملف غير متوفر سحابياً.`);
      }
  };

  const handleAttendanceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const recordsToSave = Object.entries(attData).map(([traineeId, isPresent]) => ({
          trainee_id: Number(traineeId),
          trainer_id: user.id,
          date: attDate,
          status: isPresent ? 'present' as const : 'absent' as const
      }));
      
      db.saveAttendance(recordsToSave);
      alert('تم حفظ سجل الحضور بنجاح.');
  }

  const handleUpdateProfile = () => {
      db.updateUserProfile(user.id, { phone: myPhone, password: myPass });
      alert('تم تحديث بياناتك بنجاح');
  }

  const getMeetingLabel = (m: Meeting) => {
      if (m.target_audience === 'all') return 'للجميع';
      if (m.target_audience === 'trainers') return 'لمسئولي المجموعات';
      return 'لمجموعتي';
  }

  const getFileIcon = (filename: string) => {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <ImageIcon size={14} />;
      if (['mp4', 'mov', 'avi'].includes(ext || '')) return <PlayCircle size={14} />;
      return <File size={14} />;
  }

  // Helper to render media preview in cards
  const renderMediaPreview = (f: FileRecord, small = true) => {
      if (!f.file_url) return null;
      const ext = f.filename.split('.').pop()?.toLowerCase() || '';
      const sizeClass = small ? "h-16 w-16" : "h-32 w-full";
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          return (
              <div className={`${sizeClass} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 mb-2 flex-shrink-0 bg-gray-100 dark:bg-gray-900`}>
                  <img src={f.file_url} alt={f.filename} className="w-full h-full object-cover" />
              </div>
          );
      }
      if (['mp4', 'webm', 'ogg'].includes(ext)) {
        return (
            <div className={`${sizeClass} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 mb-2 flex-shrink-0 bg-black relative`}>
                <video src={f.file_url} className="w-full h-full object-cover opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center text-white">
                    <PlayCircle size={small ? 20 : 32} />
                </div>
            </div>
        );
      }
      return null;
  }

  // Derived state for notifications
  const pendingFiles = files.filter(f => f.status === 'pending' && !dismissedFileIds.includes(f.id));

  return (
    <div className="space-y-6">
      
      {/* 🔔 Real-time Notifications Section */}
      {pendingFiles.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-orange-100 dark:border-orange-900/50 relative overflow-hidden animate-fadeIn">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-navy dark:text-white flex items-center gap-2">
                      <div className="relative">
                          <Bell className="text-orange-500 fill-orange-100 dark:fill-orange-900/30" size={24} />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                      </div>
                      تنبيهات: ملفات جديدة بانتظار المراجعة ({pendingFiles.length})
                  </h3>
              </div>
              
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {pendingFiles.slice(0, 6).map(f => (
                      <div key={f.id} className="group bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all flex flex-col justify-between">
                          <div>
                              <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full mb-2 inline-block">
                                      {f.user_name}
                                  </span>
                                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                      <Clock size={10} /> {f.upload_date}
                                  </span>
                              </div>
                              <div className="flex gap-2">
                                  {renderMediaPreview(f, true)}
                                  <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-bold text-navy dark:text-gray-200 mb-1 flex items-center gap-1 truncate">
                                          {getFileIcon(f.filename)} {f.filename}
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{f.description}</p>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                              <button 
                                  onClick={() => startGrading(f)}
                                  className="flex-1 bg-primary text-white text-xs py-1.5 rounded-lg hover:bg-primary-dark transition flex items-center justify-center gap-1 font-bold shadow-sm"
                              >
                                  <CheckCircle size={12} /> تصحيح
                              </button>
                              <button 
                                  onClick={() => handleDismissNotification(f.id)}
                                  className="px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="إخفاء التنبيه"
                              >
                                  <EyeOff size={16} />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
              {pendingFiles.length > 6 && (
                  <p className="text-center text-xs text-gray-400 mt-3">... وهناك {pendingFiles.length - 6} ملفات أخرى</p>
              )}
          </div>
      )}

      {/* Meetings Alert */}
      {meetings.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 dark:border-blue-500 p-4 rounded shadow-sm flex justify-between items-center">
              <div>
                  <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <Video size={18} />
                      اجتماع جديد: {meetings[0].topic}
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">الموجه لهم: {getMeetingLabel(meetings[0])}</p>
              </div>
              <a 
                href={meetings[0].link} 
                target="_blank" 
                rel="noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-bold"
              >
                  انضمام
              </a>
          </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Sidebar: Trainees & Add Resource & Upload */}
        <div className="lg:col-span-1 space-y-6">
           <Card title="تحديث بياناتي (إعدادات الحساب)">
               <div className="space-y-4">
                   <Input icon={Lock} label="كلمة المرور الجديدة" type="password" value={myPass} onChange={(e) => setMyPass(e.target.value)} placeholder="******" />
                   <Input icon={Phone} label="تحديث رقم الهاتف" value={myPhone} onChange={(e) => setMyPhone(e.target.value)} placeholder="01xxxxx" />
                   <Button onClick={handleUpdateProfile} variant="secondary" className="w-full">
                       <Save size={16} /> حفظ التغييرات
                   </Button>
               </div>
           </Card>

           <Card title="المتدربين التابعين لي" action={<Badge color="green">{trainees.length}</Badge>}>
             <div className="space-y-4 max-h-60 overflow-y-auto">
                {trainees.map(t => {
                    const traineeFiles = files.filter(f => f.user_id === t.id);
                    const gradedCount = traineeFiles.filter(f => f.status === 'graded').length;
                    const totalCount = traineeFiles.length;
                    const progress = totalCount > 0 ? (gradedCount / totalCount) * 100 : 0;

                    return (
                        <div key={t.id} className="p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200">{t.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t.email}</div>
                                </div>
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                    {gradedCount}/{totalCount}
                                </span>
                            </div>
                            
                            {/* Mini Progress Bar */}
                            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                <div 
                                    className="bg-green-500 h-1.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
                {trainees.length === 0 && <p className="text-gray-400 text-center">لا يوجد متدربين</p>}
             </div>
           </Card>

           <Card title="رفع ملف لمتدرب (Exchange)">
                <form onSubmit={handleUploadForTrainee} className="space-y-4">
                     <Select 
                        label="اختر المتدرب"
                        value={uploadTraineeId}
                        onChange={(e) => setUploadTraineeId(e.target.value)}
                        options={trainees.map(t => ({ label: t.name, value: t.id }))}
                        icon={Users}
                    />
                    <div className="border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-3 text-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer relative group">
                        <input 
                        type="file" 
                        id="trainer-file-upload"
                        className="hidden" 
                        accept="image/*,video/*,application/pdf,.doc,.docx"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                        <label htmlFor="trainer-file-upload" className="cursor-pointer block w-full h-full">
                            <Cloud className="mx-auto text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
                            <span className="text-xs text-blue-800 dark:text-blue-300 font-medium truncate block">
                                {uploadFile ? uploadFile.name : 'اختر صورة/فيديو/ملف'}
                            </span>
                        </label>
                    </div>
                    <Input 
                    label="رسالة للمتدرب" 
                    value={uploadDesc} 
                    onChange={(e) => setUploadDesc(e.target.value)} 
                    placeholder="مثال: تصحيح الواجب..."
                    />

                    {isUploading && (
                         <div className="animate-fadeIn">
                             <ProgressBar progress={uploadProgress} label="جاري الإرسال..." />
                         </div>
                    )}

                    <Button type="submit" className="w-full text-sm" disabled={!uploadFile || !uploadTraineeId || isUploading} isLoading={isUploading}>
                        <Send size={14} /> {isUploading ? 'جاري الإرسال...' : 'إرسال للمتدرب'}
                    </Button>
                </form>
           </Card>

           <Card title="إضافة مصدر لمجموعتي">
               <form onSubmit={handleAddResource}>
                   <Input icon={BookOpen} label="العنوان" value={rTitle} onChange={(e) => setRTitle(e.target.value)} required placeholder="مرجع هام..." />
                   
                   <div className="mb-4">
                       <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">نوع المصدر</label>
                       <select 
                           value={rType} 
                           onChange={(e) => setRType(e.target.value as any)}
                           className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                       >
                           <option value="pdf">ملف PDF</option>
                           <option value="video">فيديو</option>
                           <option value="link">رابط</option>
                       </select>
                   </div>

                   <Input icon={AlignLeft} label="الوصف" value={rDesc} onChange={(e) => setRDesc(e.target.value)} placeholder="وصف قصير..." />
                   <Input icon={LinkIcon} label="الرابط" value={rLink} onChange={(e) => setRLink(e.target.value)} required placeholder="https://..." />
                   <Button type="submit" variant="secondary" className="w-full">نشر للمجموعة</Button>
               </form>
           </Card>
        </div>

        {/* Main Content: Attendance & Grading */}
        <div className="lg:col-span-2 space-y-6">
            <Card title="تسجيل الحضور والغياب" action={<Badge color="blue">اليومي</Badge>}>
                <form onSubmit={handleAttendanceSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-navy dark:text-gray-300 mb-2">تاريخ المحاضرة</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                <Calendar size={18} />
                            </div>
                            <input 
                                type="date" 
                                value={attDate}
                                onChange={(e) => setAttDate(e.target.value)}
                                className="w-full pr-10 pl-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto">
                        {trainees.map(t => (
                            <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors select-none">
                                <input 
                                    type="checkbox" 
                                    checked={!!attData[t.id]}
                                    onChange={(e) => setAttData(prev => ({ ...prev, [t.id]: e.target.checked }))}
                                    className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                                />
                                <span className={`font-medium ${attData[t.id] ? 'text-primary dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {attData[t.id] ? 'حاضر:' : 'غائب:'} {t.name}
                                </span>
                            </label>
                        ))}
                        {trainees.length === 0 && <p className="text-gray-400 text-center">لا يوجد متدربين</p>}
                    </div>

                    <Button type="submit" className="w-full">حفظ سجل الحضور</Button>
                </form>
            </Card>

            <Card title="مدير ملفات المتدربين (السحابة)" action={<Badge color="purple">{files.length} ملف</Badge>}>
                <div className="space-y-6">
                    {files.map(f => (
                        <div key={f.id} id={`file-card-${f.id}`} className={`border rounded-xl p-4 transition-all ${f.status === 'graded' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">{f.user_name}</h4>
                                        <Badge color={f.status === 'graded' ? 'green' : 'yellow'}>
                                            {f.status === 'graded' ? 'تم التصحيح' : 'قيد الانتظار'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        {getFileIcon(f.filename)} {f.filename}
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        {f.upload_date}
                                    </p>
                                    <p className="text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded text-sm italic">"{f.description}"</p>
                                    
                                    {/* Media Preview in Main List */}
                                    <div className="mt-3">
                                        {renderMediaPreview(f, false)}
                                    </div>
                                    
                                    {f.file_url && (
                                        <div className="flex gap-2 mt-3">
                                            <button 
                                                onClick={() => handleDownloadFile(f)}
                                                className="text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 px-3 py-1 rounded flex items-center gap-2 transition-colors"
                                            >
                                                <Download size={14} /> تحميل/عرض كامل
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {f.status === 'graded' && !editingFile && (
                                    <div className="text-left">
                                        <span className="block text-2xl font-bold text-green-600 dark:text-green-400">{f.score}/100</span>
                                        <button onClick={() => startGrading(f)} className="text-xs text-blue-600 dark:text-blue-400 underline">تعديل</button>
                                    </div>
                                )}
                                {f.status !== 'graded' && !editingFile && (
                                    <Button onClick={() => startGrading(f)} variant="primary" className="text-sm px-3 py-1">
                                        <CheckCircle size={16} /> تصحيح
                                    </Button>
                                )}
                            </div>

                            {editingFile === f.id && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
                                    <button 
                                        onClick={() => handleAiGrade(f)}
                                        disabled={isAiLoading}
                                        className="w-full mb-4 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/20 text-purple-700 dark:text-purple-300 p-2 rounded-lg text-sm font-bold border border-purple-200 dark:border-purple-800 hover:from-purple-200 hover:to-purple-100 transition-all"
                                    >
                                        <Sparkles size={16} className={isAiLoading ? 'animate-spin' : ''} />
                                        {isAiLoading ? 'جاري تحليل الملف بالذكاء الاصطناعي...' : 'اقتراح تقييم تلقائي (Gemini AI)'}
                                    </button>
                                    <div className="grid grid-cols-4 gap-4 mb-3">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">الدرجة</label>
                                            <input 
                                                type="number" 
                                                max="100"
                                                min="0"
                                                value={score} 
                                                onChange={(e) => setScore(e.target.value)}
                                                className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                placeholder="0-100"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">ملاحظات مسئول المجموعة (Feedback)</label>
                                            <input 
                                                type="text" 
                                                value={feedback} 
                                                onChange={(e) => setFeedback(e.target.value)}
                                                className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                placeholder="أحسنت، ولكن يرجى الانتباه لـ..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button onClick={() => setEditingFile(null)} variant="secondary" className="text-xs px-3 py-1">إلغاء</Button>
                                        <Button onClick={() => handleGrade(f.id)} variant="success" className="text-xs px-3 py-1">حفظ التقييم</Button>
                                    </div>
                                </div>
                            )}

                            {f.status === 'graded' && !editingFile && f.feedback && (
                                <div className="mt-2 text-sm text-green-800 dark:text-green-300 bg-green-100/50 dark:bg-green-900/20 p-2 rounded flex items-start gap-2">
                                    <MessageSquare size={14} className="mt-1 flex-shrink-0" />
                                    <span>ملاحظاتك: {f.feedback}</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {files.length === 0 && (
                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <FolderOpen size={48} className="mx-auto mb-4 opacity-20" />
                            <p>لا توجد ملفات مرفوعة من طلابك بعد.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}