import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, FileRecord, Meeting, Resource } from '../types';
import { Card, Button, Input, Badge, ProgressBar } from '../components/ui';
import { Upload, Video, MessageCircle, FileText, Send, Star, MessageSquare, BookOpen, Download, Bell, X } from 'lucide-react';

export default function TraineeDashboard({ user }: { user: User }) {
  const [trainer, setTrainer] = useState<User | undefined>(undefined);
  const [myFiles, setMyFiles] = useState<FileRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [resources, setResources] = useState<(Resource & { uploader_name?: string })[]>([]);
  
  // Upload Form
  const [desc, setDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<FileRecord[]>([]);

  useEffect(() => {
    if (user.assigned_trainer_id) {
        setTrainer(db.getUserById(user.assigned_trainer_id));
    }
    refreshData();
    // Subscribe to DB changes (e.g. grading updates from trainer)
    const unsubscribe = db.subscribe(() => {
        refreshData();
    });
    return () => unsubscribe();
  }, [user]);

  const refreshData = () => {
    // Files
    const all = db.getFiles();
    const my = all.filter(f => f.user_id === user.id);
    setMyFiles(my);

    // Notification Logic: Check for graded files not yet seen
    const seenIds = JSON.parse(localStorage.getItem(`seen_notifications_${user.id}`) || '[]');
    const newGradedFiles = my.filter(f => f.status === 'graded' && !seenIds.includes(f.id));
    setNotifications(newGradedFiles);

    // Meetings
    const allMeetings = db.getMeetings();
    const relevantMeetings = allMeetings.filter(m => 
        m.target_audience === 'all' || 
        (m.target_audience === 'group' && m.target_group_id === user.assigned_trainer_id)
    ).sort((a,b) => b.id - a.id);
    setMeetings(relevantMeetings);

    // Resources
    const allResources = db.getResources();
    const allUsers = db.getUsers();
    
    const relevantResources = allResources
        .filter(r => 
            r.target_audience === 'all' || 
            (r.target_audience === 'group' && r.uploaded_by === user.assigned_trainer_id)
        )
        .map(r => {
            const uploader = allUsers.find(u => u.id === r.uploaded_by);
            return {
                ...r,
                uploader_name: uploader?.name || 'Unknown'
            };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Sort by date descending

    setResources(relevantResources);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
        let fileUrl = undefined;
        if (db.isCloudConnected) {
            fileUrl = await db.uploadFileToCloud(selectedFile, 'trainee_uploads');
        }

        await db.addFile(user.id, selectedFile.name, desc, fileUrl);
        alert(`تم إرسال الملف "${selectedFile.name}" بنجاح إلى مسئول المجموعة ${trainer ? trainer.name : ''}`);
        setDesc('');
        setSelectedFile(null);
    } catch (error: any) {
        alert("فشل رفع الملف: " + error.message);
    } finally {
        setIsUploading(false);
    }
  };

  const dismissNotification = (fileId: number) => {
      const seenIds = JSON.parse(localStorage.getItem(`seen_notifications_${user.id}`) || '[]');
      if (!seenIds.includes(fileId)) {
          const updatedSeenIds = [...seenIds, fileId];
          localStorage.setItem(`seen_notifications_${user.id}`, JSON.stringify(updatedSeenIds));
      }
      setNotifications(prev => prev.filter(n => n.id !== fileId));
  };

  // Calculate Progress (Simple Logic: each graded assignment adds 10%)
  const progress = Math.min(100, myFiles.filter(f => f.status === 'graded').length * 20);

  return (
    <div className="space-y-6">
       
       {/* Notifications Section */}
       {notifications.length > 0 && (
            <div className="space-y-3 animate-pulse">
                {notifications.map(n => (
                    <div key={n.id} className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-xl shadow-md flex justify-between items-start transition-all transform hover:scale-[1.01]">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded-full text-yellow-600 dark:text-yellow-400">
                                    <Bell size={20} />
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg">تم تصحيح واجب: {n.filename}</h4>
                            </div>
                            <div className="mr-10">
                                <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
                                    حصلت على درجة: <span className={`font-bold text-lg ${n.score && n.score >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{n.score}/100</span>
                                </p>
                                {n.feedback && (
                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30 text-gray-700 dark:text-gray-300 text-sm">
                                        <div className="flex items-center gap-2 mb-1 text-yellow-600 dark:text-yellow-500 font-bold">
                                            <MessageSquare size={14} />
                                            <span>ملاحظات:</span>
                                        </div>
                                        {n.feedback}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => dismissNotification(n.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                            title="إخفاء التنبيه"
                        >
                            <X size={20} />
                        </button>
                    </div>
                ))}
            </div>
       )}

       {/* Info & Progress Section */}
       <div className="grid md:grid-cols-2 gap-4">
           {trainer && (
               <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center justify-between">
                   <div>
                       <h3 className="font-bold text-green-900 dark:text-green-300">مسئول المجموعة</h3>
                       <p className="text-green-800 dark:text-green-400">{trainer.name}</p>
                   </div>
                   {trainer.phone && (
                       <a 
                        href={`https://wa.me/2${trainer.phone.replace(/^0+/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                       >
                           <MessageCircle size={18} />
                           تواصل واتساب
                       </a>
                   )}
               </div>
           )}

            {meetings.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2"><Video size={16}/> اجتماع جديد</h3>
                        <p className="text-blue-800 dark:text-blue-400 text-sm">{meetings[0].topic}</p>
                    </div>
                    <a 
                        href={meetings[0].link}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"
                    >
                        انضمام
                    </a>
                </div>
            )}
       </div>

       {/* Progress Bar */}
       <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white border-0 shadow-xl">
           <div className="flex items-center gap-4 mb-2">
               <Star className="text-yellow-400 fill-yellow-400" />
               <h3 className="font-bold text-lg text-white">مسار تقدمك التعليمي</h3>
           </div>
           {/* Custom lighter background for progress bar track inside this dark card */}
           <div className="w-full">
                <div className="w-full bg-gray-600/50 rounded-full h-2.5">
                    <div 
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    ></div>
                </div>
            </div>
           <p className="text-xs text-gray-400 mt-2">
               يتم تحديث التقدم تلقائياً عند تصحيح واجباتك من قبل مسئول المجموعة. (أنجزت {myFiles.filter(f => f.status === 'graded').length} مهام)
           </p>
       </Card>

       <div className="grid lg:grid-cols-3 gap-6">
           <div className="lg:col-span-1 space-y-6">
               <Card title="إرسال واجب / ملف">
                   <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                       الملفات التي تقوم برفعها هنا تظهر فوراً لمسئول مجموعتك ({trainer ? trainer.name : '...'}) وللإدارة.
                   </p>
                   <form onSubmit={handleUpload} className="space-y-4">
                       <div className="border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-6 text-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer relative group">
                           <input 
                            type="file" 
                            id="file-upload"
                            className="hidden" 
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                           />
                           <label htmlFor="file-upload" className="cursor-pointer block w-full h-full">
                               <Upload className="mx-auto text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={32} />
                               <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                                   {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف'}
                               </span>
                           </label>
                       </div>
                       <Input 
                        label="وصف الملف" 
                        value={desc} 
                        onChange={(e) => setDesc(e.target.value)} 
                        placeholder="مثال: الواجب الأول - تصميم حقيبة يد"
                        required
                       />
                       <Button type="submit" className="w-full" disabled={!selectedFile || isUploading} isLoading={isUploading}>
                           <Send size={16} />
                           {isUploading ? 'جاري الرفع...' : 'رفع وإرسال'}
                       </Button>
                   </form>
               </Card>

               <Card title="مكتبة المصادر" action={<Badge color="purple">{resources.length}</Badge>}>
                   <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                       {resources.map(r => (
                           <div key={r.id} className="block p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:shadow-md transition-all bg-white dark:bg-gray-800/50">
                               <div className="mb-2">
                                   <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{r.title}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.uploaded_by === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                            {r.uploaded_by === 1 ? '👑 مادة عامة (إدارة)' : `👨‍🏫 خاص بمجموعتك (${r.uploader_name})`}
                                        </span>
                                   </div>
                                   <p className="text-[10px] text-gray-400 mt-1">{r.created_at}</p>
                               </div>
                               
                               {r.description && (
                                   <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                                       {r.description}
                                   </p>
                               )}

                               <a 
                                href={r.link} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex items-center justify-center gap-2 w-full py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg transition-colors"
                               >
                                   <Download size={14} />
                                   تحميل الحقيبة
                               </a>
                           </div>
                       ))}
                       {resources.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد مصادر حالياً</p>}
                   </div>
               </Card>
           </div>

           <div className="lg:col-span-2">
               <Card title="سجل ملفاتي وتقييمات مسئول المجموعة" className="h-full">
                   <div className="space-y-4">
                        {myFiles.map(f => (
                            <div key={f.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-sm transition-all bg-white dark:bg-gray-800">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-full ${f.status === 'graded' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200">{f.filename}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{f.upload_date}</p>
                                        </div>
                                    </div>
                                    <Badge color={f.status === 'graded' ? 'green' : 'yellow'}>
                                        {f.status === 'graded' ? `${f.score}/100` : 'قيد المراجعة'}
                                    </Badge>
                                </div>
                                
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                    {f.description}
                                </p>

                                {f.status === 'graded' && f.feedback && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
                                        <div className="flex gap-2">
                                            <MessageSquare size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                                            <div>
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">ملاحظات مسئول المجموعة:</span>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{f.feedback}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {myFiles.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <Upload size={48} className="mx-auto mb-4 opacity-20" />
                                <p>لم تقم برفع أي ملفات بعد</p>
                            </div>
                        )}
                   </div>
               </Card>
           </div>
       </div>
    </div>
  );
}