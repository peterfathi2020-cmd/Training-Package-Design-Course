import { User, FileRecord, Meeting, UserRole, Resource, AttendanceRecord, LoginLog, FirebaseConfig } from '../types';
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, getDocs, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const STORAGE_KEYS = {
  USERS: 'bd_users',
  FILES: 'bd_files',
  MEETINGS: 'bd_meetings',
  RESOURCES: 'bd_resources',
  ATTENDANCE: 'bd_announcement',
  ANNOUNCEMENT: 'bd_announcement',
  LOGIN_LOGS: 'bd_login_logs',
  FIREBASE_CONFIG: 'bd_firebase_config'
};

// Hardcoded Config (Fixed Online Connection)
const HARDCODED_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBt5pBiY3TWVJzj8FMz7l7m9RMIbmhOxpo",
  authDomain: "training-app-cloud.firebaseapp.com",
  projectId: "training-app-cloud",
  storageBucket: "training-app-cloud.firebasestorage.app",
  messagingSenderId: "93857700118",
  appId: "1:93857700118:web:131af4b7b347a4a5bd9837",
  measurementId: "G-60ZST0YJ6P"
};

// Seed Data
const DEFAULT_ADMIN: User = {
  id: 1,
  email: 'peterfathi2020@gmail.com',
  password: 'pepo_1759',
  role: 'admin',
  name: 'المدير العام',
  phone: '0000000000',
};

class DatabaseService {
  // In-Memory Cache (Synced with Cloud)
  private _users: User[] = [];
  private _files: FileRecord[] = [];
  private _meetings: Meeting[] = [];
  private _resources: Resource[] = [];
  private _attendance: AttendanceRecord[] = [];
  private _loginLogs: LoginLog[] = [];
  private _announcement: string = '';

  // Cloud State
  private firebaseApp: FirebaseApp | null = null;
  private firestore: Firestore | null = null;
  private storage: FirebaseStorage | null = null;
  public isCloudConnected: boolean = false;

  // Listeners
  private _listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  // Subscribe to changes (UI Updates)
  subscribe(callback: () => void) {
      this._listeners.push(callback);
      return () => {
          this._listeners = this._listeners.filter(cb => cb !== callback);
      };
  }

  private notifyListeners() {
      this._listeners.forEach(cb => cb());
  }

  private async init() {
    console.log("🚀 Initializing Database Service...");

    // ALWAYS use the hardcoded config provided to ensure the app is online
    console.log("🔌 Connecting to Firebase Cloud (Hardcoded)...");
    await this.initializeFirebase(HARDCODED_FIREBASE_CONFIG);
  }

  private async initializeFirebase(config: FirebaseConfig) {
      try {
          // Check if app already initialized to avoid errors in dev HMR
          if (getApps().length === 0) {
              this.firebaseApp = initializeApp(config);
          } else {
              this.firebaseApp = getApp();
          }

          this.firestore = getFirestore(this.firebaseApp);
          this.storage = getStorage(this.firebaseApp);
          
          this.isCloudConnected = true;
          this.setupRealtimeListeners();
          console.log("✅ 🔥 Firebase Connected Successfully!");
      } catch (e) {
          console.error("❌ Firebase Connection Failed:", e);
          // Only fallback if connection completely fails
          this.fallbackToLocal();
      }
  }

  private fallbackToLocal() {
      this.isCloudConnected = false;
      this.loadFromLocalStorage();
      this.ensureAdminExists();
      console.log("📂 System running in Local Storage Mode (Offline)");
  }

  // --- Cloud Setup ---
  
  public saveCloudConfig(config: FirebaseConfig) {
      // Kept for compatibility, but hardcoded config takes precedence in init()
      localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
      window.location.reload(); 
  }

  public disconnectCloud() {
      localStorage.removeItem(STORAGE_KEYS.FIREBASE_CONFIG);
      // Note: Since config is hardcoded, reloading will just reconnect. 
      // To truly disconnect, one would need to be offline or remove the hardcoded config in code.
      window.location.reload();
  }

  // --- File Upload Logic ---
  public async uploadFileToCloud(file: File, folder: string = 'files'): Promise<string> {
      if (!this.isCloudConnected || !this.storage) {
          throw new Error("يجب الاتصال بالإنترنت وقاعدة البيانات السحابية لرفع الملفات.");
      }
      
      try {
          // Create a reference
          const storageRef = ref(this.storage, `${folder}/${Date.now()}_${file.name}`);
          // Upload
          const snapshot = await uploadBytes(storageRef, file);
          // Get URL
          const downloadURL = await getDownloadURL(snapshot.ref);
          return downloadURL;
      } catch (error: any) {
          console.error("Upload Error:", error);
          throw new Error("فشل رفع الملف: " + error.message);
      }
  }

  private setupRealtimeListeners() {
      if (!this.firestore) return;

      // Users Listener
      onSnapshot(collection(this.firestore, 'users'), (snapshot) => {
          this._users = snapshot.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) } as User));
          this.ensureAdminExists(); 
          this.notifyListeners();
      }, (error) => {
          console.error("Auth Listener Error:", error);
      });

      // Files Listener
      onSnapshot(collection(this.firestore, 'files'), (snapshot) => {
          this._files = snapshot.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) } as FileRecord));
          this.notifyListeners();
      });

      // Resources Listener
      onSnapshot(collection(this.firestore, 'resources'), (snapshot) => {
          this._resources = snapshot.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) } as Resource));
          this.notifyListeners();
      });

       // Meetings Listener
       onSnapshot(collection(this.firestore, 'meetings'), (snapshot) => {
        this._meetings = snapshot.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) } as Meeting));
        this.notifyListeners();
       });

       // Announcement Listener
       onSnapshot(collection(this.firestore, 'settings'), (snapshot) => {
           const data = snapshot.docs.find(d => d.id === 'announcement')?.data();
           if (data) {
               this._announcement = data.text || '';
               this.notifyListeners();
           }
       });
       
       // Attendance Listener
       onSnapshot(collection(this.firestore, 'attendance'), (snapshot) => {
           this._attendance = snapshot.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) } as AttendanceRecord));
           this.notifyListeners();
       });
  }

  // --- Local Storage Fallback ---

  private loadFromLocalStorage() {
      try {
        this._users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        this._files = JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES) || '[]');
        this._meetings = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEETINGS) || '[]');
        this._resources = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESOURCES) || '[]');
        this._attendance = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
        this._loginLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGIN_LOGS) || '[]');
        this._announcement = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENT) || '';
    } catch (e) {
        this._users = [];
    }
  }

  private saveToStorage(key: string, data: any) {
      if (this.isCloudConnected) return; // Don't overwrite local if using cloud
      if (typeof data === 'string') {
          localStorage.setItem(key, data);
      } else {
          localStorage.setItem(key, JSON.stringify(data));
      }
      this.notifyListeners();
  }

  private ensureAdminExists() {
      const adminIndex = this._users.findIndex(u => u.role === 'admin' && u.id === 1);
      if (adminIndex === -1) {
          if (this.isCloudConnected && this.firestore) {
              // Create default admin in cloud if not exists
              setDoc(doc(this.firestore, 'users', '1'), DEFAULT_ADMIN).catch(console.error);
          } else {
              this._users.push(DEFAULT_ADMIN);
          }
      }
  }

  // --- Users ---

  getUsers(): User[] {
    return this._users;
  }

  async saveUser(user: Omit<User, 'id'>): Promise<User> {
    if (this._users.find((u) => u.email === user.email)) {
      throw new Error('البريد الإلكتروني مسجل مسبقاً');
    }
    const newId = Date.now();
    const newUser = { ...user, id: newId };

    if (this.isCloudConnected && this.firestore) {
        await setDoc(doc(this.firestore, 'users', String(newId)), newUser);
    } else {
        this._users.push(newUser);
        this.saveToStorage(STORAGE_KEYS.USERS, this._users);
    }
    return newUser;
  }

  async updatePassword(email: string, newPass: string) {
    const user = this._users.find((u) => u.email === email);
    if (user) {
        if (this.isCloudConnected && this.firestore) {
            await updateDoc(doc(this.firestore, 'users', String(user.id)), { password: newPass });
        } else {
            user.password = newPass;
            this.saveToStorage(STORAGE_KEYS.USERS, this._users);
        }
        return true;
    }
    return false;
  }
  
  async updateUserProfile(id: number, updates: { phone?: string; password?: string }) {
      const user = this._users.find((u) => u.id === id);
      if (user) {
          if (this.isCloudConnected && this.firestore) {
             await updateDoc(doc(this.firestore, 'users', String(id)), updates);
          } else {
             if (updates.phone) user.phone = updates.phone;
             if (updates.password) user.password = updates.password;
             this.saveToStorage(STORAGE_KEYS.USERS, this._users);
          }
          return true;
      }
      return false;
  }

  async updateUser(id: number, data: Partial<User>) {
      const user = this._users.find((u) => u.id === id);
      if (user) {
          if (this.isCloudConnected && this.firestore) {
             await updateDoc(doc(this.firestore, 'users', String(id)), data);
          } else {
             const index = this._users.findIndex(u => u.id === id);
             this._users[index] = { ...this._users[index], ...data };
             this.saveToStorage(STORAGE_KEYS.USERS, this._users);
          }
          return true;
      }
      return false;
  }

  async deleteUser(id: number) {
      if (id === 1) throw new Error("لا يمكن حذف المدير العام الرئيسي");
      
      if (this.isCloudConnected && this.firestore) {
          await deleteDoc(doc(this.firestore, 'users', String(id)));
      } else {
          this._users = this._users.filter(u => u.id !== id);
          this.saveToStorage(STORAGE_KEYS.USERS, this._users);
      }
  }

  login(email: string, pass: string): User | null {
    // For login, we rely on the synced _users array
    const user = this._users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass) || null;
    if (user) this.logLogin(user);
    return user;
  }

  private logLogin(user: User) {
      const newLog: LoginLog = {
          id: Date.now(),
          user_id: user.id,
          user_name: user.name,
          role: user.role,
          timestamp: new Date().toLocaleString('ar-EG')
      };
      // Keep only local logs for simplicity or add 'login_logs' collection in cloud if needed
      this._loginLogs = [newLog, ...this._loginLogs].slice(0, 500);
      this.saveToStorage(STORAGE_KEYS.LOGIN_LOGS, this._loginLogs); 
  }

  getLoginLogs(): LoginLog[] {
      return this._loginLogs;
  }

  getTrainers(): User[] {
    return this._users.filter((u) => u.role === 'trainer');
  }

  getTraineesByTrainer(trainerId: number): User[] {
    return this._users.filter((u) => u.assigned_trainer_id === trainerId);
  }
  
  getUserById(id: number): User | undefined {
      return this._users.find(u => u.id === id);
  }

  // --- Files ---

  getFiles(): FileRecord[] {
    const userMap = new Map<number, User>();
    this._users.forEach(u => userMap.set(u.id, u));

    return this._files.map((f: FileRecord) => {
      const uploader = userMap.get(f.user_id);
      const trainer = uploader?.assigned_trainer_id 
        ? userMap.get(uploader.assigned_trainer_id) 
        : null;

      return {
        ...f,
        user_name: uploader?.name || 'مستخدم محذوف',
        trainer_name: trainer?.name || 'غير معين'
      };
    });
  }

  async addFile(userId: number, filename: string, description: string, fileUrl?: string) {
    const newId = Date.now();
    const newFile: FileRecord = {
      id: newId,
      user_id: userId,
      filename,
      description,
      file_url: fileUrl,
      upload_date: new Date().toLocaleString('ar-EG'),
      status: 'pending'
    };

    if (this.isCloudConnected && this.firestore) {
        await setDoc(doc(this.firestore, 'files', String(newId)), newFile);
    } else {
        this._files.push(newFile);
        this.saveToStorage(STORAGE_KEYS.FILES, this._files);
    }
  }

  async gradeFile(fileId: number, score: number, feedback: string) {
      if (this.isCloudConnected && this.firestore) {
          await updateDoc(doc(this.firestore, 'files', String(fileId)), {
              score, feedback, status: 'graded'
          });
      } else {
          const index = this._files.findIndex((f) => f.id === fileId);
          if (index !== -1) {
              this._files[index].score = score;
              this._files[index].feedback = feedback;
              this._files[index].status = 'graded';
              this.saveToStorage(STORAGE_KEYS.FILES, this._files);
          }
      }
  }

  // --- Resources ---

  getResources(): Resource[] {
      return this._resources;
  }

  async addResource(resource: Omit<Resource, 'id' | 'created_at'>) {
      const newId = Date.now();
      const newResource = {
          ...resource,
          id: newId,
          created_at: new Date().toLocaleString('ar-EG')
      };

      if (this.isCloudConnected && this.firestore) {
          await setDoc(doc(this.firestore, 'resources', String(newId)), newResource);
      } else {
          this._resources.push(newResource);
          this.saveToStorage(STORAGE_KEYS.RESOURCES, this._resources);
      }
  }

  async deleteResource(id: number) {
      if (this.isCloudConnected && this.firestore) {
          await deleteDoc(doc(this.firestore, 'resources', String(id)));
      } else {
          this._resources = this._resources.filter(r => r.id !== id);
          this.saveToStorage(STORAGE_KEYS.RESOURCES, this._resources);
      }
  }

  // --- Meetings ---

  getMeetings(): Meeting[] {
    return this._meetings;
  }

  async addMeeting(meeting: Omit<Meeting, 'id' | 'created_at'>) {
    const newId = Date.now();
    const newMeeting = {
      ...meeting,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (this.isCloudConnected && this.firestore) {
        await setDoc(doc(this.firestore, 'meetings', String(newId)), newMeeting);
    } else {
        this._meetings.push(newMeeting);
        this.saveToStorage(STORAGE_KEYS.MEETINGS, this._meetings);
    }
  }
  
  // --- Attendance ---

  getAttendance(trainerId: number, date: string): AttendanceRecord[] {
      return this._attendance.filter((r) => r.trainer_id === trainerId && r.date === date);
  }

  async saveAttendance(records: Omit<AttendanceRecord, 'id'>[]) {
    // In local mode, we replace. In Cloud mode, we should ideally upsert.
    // Simplifying for hybrid: add new records
    
    if (this.isCloudConnected && this.firestore) {
        records.forEach(async r => {
            const id = Number(`${r.trainee_id}${r.date.replace(/-/g, '')}`);
            await setDoc(doc(this.firestore!, 'attendance', String(id)), { ...r, id });
        });
    } else {
        const keysToRemove = new Set(records.map(r => `${r.trainee_id}_${r.date}`));
        const kept = this._attendance.filter((r) => !keysToRemove.has(`${r.trainee_id}_${r.date}`));
        const newRecords = records.map(r => ({ ...r, id: Date.now() + Math.random() }));
        this._attendance = [...kept, ...newRecords];
        this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this._attendance);
    }
  }

  // --- Announcement ---

  getAnnouncement(): string {
      return this._announcement;
  }

  async setAnnouncement(text: string) {
      if (this.isCloudConnected && this.firestore) {
          await setDoc(doc(this.firestore, 'settings', 'announcement'), { text });
      } else {
          this._announcement = text;
          this.saveToStorage(STORAGE_KEYS.ANNOUNCEMENT, text);
      }
  }

  // --- Backup & Export ---

  exportDB() {
      const data = {
          users: this._users,
          files: this._files,
          meetings: this._meetings,
          resources: this._resources,
          attendance: this._attendance,
          loginLogs: this._loginLogs,
          version: '1.2',
          exported_at: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_FULL_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  }

  exportUsersToCSV() {
      const userMap = new Map<number, User>();
      this._users.forEach(u => userMap.set(u.id, u));

      let csvContent = "المعرف,الاسم,البريد الإلكتروني,كلمة المرور,الدور,الهاتف,اسم مسئول المجموعة\n";
      
      this._users.forEach(u => {
          let trainerName = '-';
          if (u.assigned_trainer_id) {
              const trainer = userMap.get(u.assigned_trainer_id);
              trainerName = trainer ? trainer.name : '-';
          }

          const roleAr = u.role === 'admin' ? 'مدير' : u.role === 'trainer' ? 'مسئول مجموعة' : 'متدرب';
          const cleanName = u.name.replace(/"/g, '""');
          const cleanPhone = u.phone ? `'${u.phone}` : ''; 

          const row = [
              u.id,
              `"${cleanName}"`,
              `"${u.email}"`,
              `"${u.password || ''}"`,
              roleAr,
              `"${cleanPhone}"`,
              `"${trainerName}"`
          ].join(",");
          
          csvContent += row + "\n";
      });

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_data_excel_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
  }

  importDB(jsonString: string): boolean {
      try {
          const data = JSON.parse(jsonString);
          if (!data.users || !Array.isArray(data.users)) {
              throw new Error("Invalid Backup Format: Missing users");
          }

          if (this.isCloudConnected) {
              alert("تحذير: أنت متصل بالسحابة. لا يمكن استيراد بيانات محلية فوق قاعدة بيانات سحابية مباشرة.");
              return false;
          }

          this._users = data.users;
          this._files = data.files || [];
          this._meetings = data.meetings || [];
          this._resources = data.resources || [];
          this._attendance = data.attendance || [];
          this._loginLogs = data.loginLogs || [];

          this.saveToStorage(STORAGE_KEYS.USERS, this._users);
          this.saveToStorage(STORAGE_KEYS.FILES, this._files);
          this.saveToStorage(STORAGE_KEYS.MEETINGS, this._meetings);
          this.saveToStorage(STORAGE_KEYS.RESOURCES, this._resources);
          this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this._attendance);
          this.saveToStorage(STORAGE_KEYS.LOGIN_LOGS, this._loginLogs);
          
          return true;
      } catch (error) {
          console.error("Import Failed:", error);
          return false;
      }
  }
}

export const db = new DatabaseService();