import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, FileRecord, Meeting, Resource } from '../types';
import { Card, Button, Input, Badge, ProgressBar } from '../components/ui';
import { Upload, Video, MessageCircle, FileText, Send, Star, MessageSquare, BookOpen, Download, Bell, X, Sparkles, Lightbulb, Image as ImageIcon, X as CloseIcon, PlayCircle, Award, Trophy, Medal, Inbox, Link as LinkIcon, ExternalLink, Rocket, Flame } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export default function TraineeDashboard({ user }: { user: User }) {
  const [trainer, setTrainer] = useState<User | undefined>(undefined);
  const [myFiles, setMyFiles] = useState<FileRecord[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<FileRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [resources, setResources] = useState<(Resource & { uploader_name?: string })[]>([]);
  
  // Upload Form
  const [desc, setDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiIdea, setAiIdea] = useState('');

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
    
    // 1. Files I sent (User ID matches mine, and I am the Sender or Sender is undefined)
    const sent = all.filter(f => f.user_id === user.id && (f.sender_id === user.id || !f.sender_id));
    
    // 2. Files I received (User ID matches mine, but sender is NOT me)
    const received = all.filter(f => f.user_id === user.id && f.sender_id && f.sender_id !== user.id);
    
    setMyFiles(sent);
    setReceivedFiles(received);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setSelectedFile(file);
          // Create preview for images
          if (file.type.startsWith('image/')) {
              const url = URL.createObjectURL(file);
              setPreviewUrl(url);
          } else if (file.type.startsWith('video/')) {
              const url = URL.createObjectURL(file);
              setPreviewUrl(url);
          } else {
              setPreviewUrl(null);
          }
      }
  };

  const clearFile = () => {
      setSelectedFile(null);
      setPreviewUrl(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (!db.isCloudConnected) {
        alert("عذراً، يجب أن تكون متصلاً بالإنترنت وقاعدة البيانات السحابية لرفع الملفات.");
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
        // Upload to specific Trainee Submissions folder
        const fileUrl = await db.uploadFileToCloud(selectedFile, 'Trainee_Assignments', (progress) => {
            setUploadProgress(progress);
        });

        await db.addFile(user.id, selectedFile.name, desc, fileUrl, user, false);
        alert(`تم إرسال الملف "${selectedFile.name}" بنجاح إلى مسئول المجموعة.`);
        setDesc('');
        clearFile();
        setUploadProgress(0);
    } catch (error: any) {
        alert("فشل رفع الملف: " + error.message);
        setUploadProgress(0);
    } finally {
        setIsUploading(false);
    }
  };

  const handleAiInspire = async () => {
      setIsAiLoading(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Give me a creative, unique bag design challenge idea (in Arabic) for a design student.
            Keep it short (1-2 sentences).
            Example: "Design a waterproof backpack for urban cyclists using recycled materials."
          `;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });
          if (response.text) {
              setAiIdea(response.text);
          }
      } catch (e) {
          console.error(e);
          alert("حدث خطأ في الـ AI");
      } finally {
          setIsAiLoading(false);
      }
  };

  // Helper to render media preview in list
  const renderMediaPreview = (f: FileRecord) => {
      if (!f.file_url) return null;
      const ext = f.filename.split('.').pop()?.toLowerCase() || '';
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          return (
              <div className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0 bg-gray-100 dark:bg-gray-900">
                  <img src={f.file_url} alt={f.filename} className="w-full h-full object-cover" />
              </div>
          );
      }
      if (['mp4', 'webm', 'ogg'].includes(ext)) {
        return (
            <div className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0 bg-black relative">
                <video src={f.file_url} className="w-full h-full object-cover opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center text-white">
                    <PlayCircle size={20} />
                </div>
            </div>
        );
      }
      return (
        <div className={`p-3 rounded-full h-12 w-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400`}>
            {f.is_link ? <LinkIcon size={20} /> : <FileText size={20} />}
        </div>
      );
  }

  // Calculate Progress (Simple Logic: each graded assignment adds 10%)
  const completedAssignments = myFiles.filter(f => f.status === 'graded').length;
  const progress = Math.min(100, completedAssignments * 20);

  // Gamification Logic
  const badges = [
      {
          id: 'first_upload',
          title: 'البداية القوية',
          icon: <Rocket />,
          color: 'bg-blue-500',
          condition: myFiles.length > 0
      },
      {
          id: 'perfect_score',
          title: 'المصمم المحترف',
          icon: <Star />,
          color: 'bg-yellow-500',
          condition: myFiles.some(f => f.score === 100)
      },
      {
          id: 'active_student',
          title: 'الطالب النشيط',
          icon: <Flame />,
          color: 'bg-orange-500',
          condition: myFiles.length >= 3
      },
      {
          id: 'master',
          title: 'خبير الحقائب',
          icon: <Trophy />,
          color: 'bg-purple-600',
          condition: completedAssignments >= 5
      }
  ];

  const earnedBadges = badges.filter(b => b.condition);

  return (
    <div className="space-y-6">
       
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

       {/* Progress Bar & Badges */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white border-0 shadow-xl">
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
                    يتم تحديث التقدم تلقائياً عند تصحيح واجباتك من قبل مسئول المجموعة. (أنجزت {completedAssignments} مهام)
                </p>
            </Card>

            <Card title="لوحة الإنجازات" className="md:col-span-1" action={<Medal size={20} className="text-yellow-500"/>}>
                <div className="flex flex-wrap gap-2 justify-center">
                    {earnedBadges.map(badge => (
                        <div key={badge.id} className="flex flex-col items-center p-2 animate-fadeIn" title={badge.title}>
                            <div className={`p-2 rounded-full text-white shadow-md ${badge.color}`}>
                                {badge.icon}
                            </div>
                            <span className="text-[10px] mt-1 font-bold text-gray-600 dark:text-gray-300">{badge.title}</span>
                        </div>
                    ))}
                    {earnedBadges.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">أكمل المهام لفتح الأوسمة!</p>
                    )}
                </div>
            </Card>
       </div>

       <div className="grid lg:grid-cols-3 gap-6">
           <div className="lg:col-span-1 space-y-6">
               <Card title="هل تحتاج إلى إلهام؟" className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-100 dark:border-indigo-800">
                    <div className="text-center">
                        <Lightbulb size={32} className="mx-auto text-yellow-500 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            استخدم الذكاء الاصطناعي للحصول على فكرة مشروع تصميم جديدة ومبتكرة.
                        </p>
                        <Button onClick={handleAiInspire} disabled={isAiLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Sparkles size={16} className={isAiLoading ? 'animate-spin' : ''} />
                            {isAiLoading ? 'جاري التوليد...' : '✨ اقترح فكرة تصميم'}
                        </Button>
                        {aiIdea && (
                            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-800 dark:text-gray-200 border border-indigo-200 dark:border-indigo-800 animate-fadeIn text-right">
                                "{aiIdea}"
                            </div>
                        )}
                    </div>
               </Card>

               <Card title="إرسال واجب / ملف">
                   <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                       الملفات التي تقوم برفعها هنا تظهر فوراً لمسئول مجموعتك ({trainer ? trainer.name : '...'}) وللإدارة.
                   </p>
                   <form onSubmit={handleUpload} className="space-y-4">
                       <div className="border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-6 text-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer relative group">
                           {!selectedFile ? (
                               <>
                                   <input 
                                    type="file" 
                                    id="file-upload"
                                    className="hidden" 
                                    accept="image/*,video/*,application/pdf,.doc,.docx"
                                    onChange={handleFileSelect}
                                   />
                                   <label htmlFor="file-upload" className="cursor-pointer block w-full h-full">
                                       <Upload className="mx-auto text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={32} />
                                       <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                                           اضغط لاختيار صورة / فيديو / ملف
                                       </span>
                                   </label>
                               </>
                           ) : (
                               <div className="relative">
                                   <button 
                                    type="button" 
                                    onClick={clearFile}
                                    className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                                   >
                                       <CloseIcon size={14} />
                                   </button>
                                   
                                   {previewUrl && selectedFile.type.startsWith('image/') && (
                                       <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                                   )}
                                   {previewUrl && selectedFile.type.startsWith('video/') && (
                                       <video src={previewUrl} className="w-full h-32 object-cover rounded-lg mb-2" controls />
                                   )}
                                   
                                   <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                                       <FileText size={16} />
                                       <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                                   </div>
                               </div>
                           )}
                       </div>
                       
                       <Input 
                        label="وصف الملف" 
                        value={desc} 
                        onChange={(e) => setDesc(e.target.value)} 
                        placeholder="مثال: الواجب الأول - تصميم حقيبة يد"
                        required
                       />
                       
                       {isUploading && (
                         <div className="animate-fadeIn">
                             <ProgressBar progress={uploadProgress} label="جاري الرفع إلى السحابة..." />
                         </div>
                       )}

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

           <div className="lg:col-span-2 space-y-6">
                
               {/* New Section: Received Files (Exchange) */}
               <Card title="الوارد (ملفات/روابط مرسلة لك)" action={<Badge color="orange">{receivedFiles.length} عنصر</Badge>} className="border-orange-200 dark:border-orange-800 shadow-orange-100 dark:shadow-none">
                   <div className="space-y-4">
                        {receivedFiles.map(f => (
                            <div key={f.id} className="border border-orange-100 dark:border-orange-900/50 rounded-xl p-4 hover:shadow-md transition-all bg-orange-50/30 dark:bg-gray-800">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-3">
                                        {/* Sender Avatar/Icon */}
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                                <Inbox size={20} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{f.sender_name}</span>
                                        </div>

                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                {f.is_link ? <LinkIcon size={14} className="text-blue-500" /> : <FileText size={14} className="text-gray-400" />}
                                                {f.filename}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{f.upload_date}</p>
                                        </div>
                                    </div>
                                    {f.is_link ? (
                                         <Badge color="blue">رابط</Badge>
                                    ) : (
                                         <Badge color="green">ملف</Badge>
                                    )}
                                </div>
                                
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 bg-white dark:bg-gray-900 p-3 rounded border border-gray-100 dark:border-gray-700 leading-relaxed">
                                    {f.description}
                                </p>
                                
                                {f.file_url && (
                                    <div className="mb-1">
                                         <a 
                                            href={f.file_url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
                                         >
                                             {f.is_link ? <ExternalLink size={16} /> : <Download size={16} />}
                                             {f.is_link ? 'فتح الرابط' : 'تحميل الملف'}
                                         </a>
                                    </div>
                                )}
                            </div>
                        ))}
                        {receivedFiles.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                <Inbox size={32} className="mx-auto mb-2 opacity-20" />
                                <p>صندوق الوارد فارغ. لم يتم إرسال أي ملفات لك بعد.</p>
                            </div>
                        )}
                   </div>
               </Card>

               <Card title="سجل ملفاتي المرسلة (الصادر)">
                   <div className="space-y-4">
                        {myFiles.map(f => (
                            <div key={f.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-sm transition-all bg-white dark:bg-gray-800">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-3">
                                        {/* Visual Preview for Trainee History */}
                                        {renderMediaPreview(f)}

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
                                
                                {f.file_url && (
                                    <div className="mb-3">
                                         <a 
                                            href={f.file_url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                         >
                                             <Download size={14} /> عرض / تحميل الملف
                                         </a>
                                    </div>
                                )}

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