import { User, FileRecord, Meeting, UserRole, Resource, AttendanceRecord, LoginLog, FirebaseConfig } from '../types';
import { initializeApp, FirebaseApp, getApps, getApp, deleteApp } from 'firebase/app';
import { 
    getFirestore, 
    Firestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    setDoc, 
    query, 
    where, 
    getDocs
} from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

const STORAGE_KEYS = {
  USERS: 'bd_users',
  FILES: 'bd_files',
  MEETINGS: 'bd_meetings',
  RESOURCES: 'bd_resources',
  ATTENDANCE: 'bd_attendance',
  ANNOUNCEMENT: 'bd_announcement',
  LOGIN_LOGS: 'bd_login_logs',
  FIREBASE_CONFIG: 'bd_firebase_config'
};

// Hardcoded Config (Fixed Online Connection)
const HARDCODED_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBiWVgBKuRdCBI7QYaMG2c1YnJKZ3Cx9QY",
  authDomain: "training-app-cloud2.firebaseapp.com",
  projectId: "training-app-cloud2",
  storageBucket: "training-app-cloud2.firebasestorage.app",
  messagingSenderId: "643085445778",
  appId: "1:643085445778:web:bfca0990ec5d907420144b",
  measurementId: "G-LCR2L8KZZY"
};

// Seed Data (Admins)
const DEFAULT_ADMINS: User[] = [
  {
    id: 1,
    email: 'Sayedjica2016@gmail.com',
    password: '123',
    role: 'admin',
    name: 'DR El Sayed Hamed',
    phone: '0000000000',
  },
  {
    id: 2,
    email: 'peterfathi2020@gmail.com',
    password: 'pepo_1759',
    role: 'admin',
    name: 'Peter Fathi',
    phone: '0000000000',
  }
];

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
          // Handle HMR (Hot Module Replacement) scenarios
          if (getApps().length > 0) {
              try {
                  const currentApp = getApp();
                  await deleteApp(currentApp);
                  console.log("Deleted existing Firebase App for HMR refresh.");
              } catch (e) {
                  console.warn("Failed to delete existing app:", e);
              }
          }

          this.firebaseApp = initializeApp(config);

          if (this.firebaseApp) {
              this.firestore = getFirestore(this.firebaseApp);
              this.storage = getStorage(this.firebaseApp);
              this.isCloudConnected = true;
              console.log("✅ 🔥 Firebase Core Services Initialized!");
              
              this.setupRealtimeListeners();
              console.log("✅ 🔥 Firebase Realtime Sync Connected!");
          } else {
              throw new Error("Failed to resolve Firebase App instance.");
          }
      } catch (e) {
          console.error("❌ Firebase Connection Failed:", e);
          this.fallbackToLocal();
      }
  }

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
          console.error("Local storage load failed", e);
      }
  }

  private ensureAdminExists() {
      DEFAULT_ADMINS.forEach(admin => {
        const existingAdminIndex = this._users.findIndex(u => u.email === admin.email);
        
        if (existingAdminIndex === -1) {
            this._users.push(admin);
            if (this.isCloudConnected && this.firestore) {
                setDoc(doc(this.firestore, 'users', String(admin.id)), admin).catch(console.error);
            } else {
                this.saveToLocalStorage();
            }
        } else {
            // Force update admin details if they differ from code
            const current = this._users[existingAdminIndex];
            const needsUpdate = current.password !== admin.password || 
                                current.name !== admin.name || 
                                current.role !== admin.role ||
                                current.id !== admin.id;

            if (needsUpdate) {
               const updated = { ...current, ...admin }; // Enforce seed values
               this._users[existingAdminIndex] = updated;
               if (this.isCloudConnected && this.firestore) {
                   setDoc(doc(this.firestore, 'users', String(updated.id)), updated, { merge: true }).catch(console.error);
               } else {
                   this.saveToLocalStorage();
               }
               console.log(`Admin credentials for ${admin.email} synced.`);
            }
        }
      });
  }

  private safeStringify(obj: any): string {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
          if (typeof value === "object" && value !== null) {
              if (seen.has(value)) {
                  return; // Remove circular reference
              }
              seen.add(value);
          }
          return value;
      });
  }

  private saveToLocalStorage() {
      try {
          localStorage.setItem(STORAGE_KEYS.USERS, this.safeStringify(this._users));
          localStorage.setItem(STORAGE_KEYS.FILES, this.safeStringify(this._files));
          localStorage.setItem(STORAGE_KEYS.MEETINGS, this.safeStringify(this._meetings));
          localStorage.setItem(STORAGE_KEYS.RESOURCES, this.safeStringify(this._resources));
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, this.safeStringify(this._attendance));
          localStorage.setItem(STORAGE_KEYS.LOGIN_LOGS, this.safeStringify(this._loginLogs));
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENT, this._announcement);
      } catch (e) {
          console.error("Failed to save to local storage (potential circular structure):", e);
      }
  }

  private fallbackToLocal() {
      this.isCloudConnected = false;
      this.loadFromLocalStorage();
      this.ensureAdminExists();
      console.log("📂 System running in Local Storage Mode (Offline)");
      this.notifyListeners();
  }

  // --- Cloud Setup ---
  
  public saveCloudConfig(config: FirebaseConfig) {
      try {
        const cleanConfig = {
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId,
            measurementId: config.measurementId
        };
        localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(cleanConfig));
        window.location.reload(); 
      } catch (e) {
        console.error("Failed to save cloud config:", e);
      }
  }

  public disconnectCloud() {
      localStorage.removeItem(STORAGE_KEYS.FIREBASE_CONFIG);
      window.location.reload();
  }

  // --- File Upload Logic ---
  public async uploadFileToCloud(file: File, folder: string = 'files', onProgress?: (p: number) => void): Promise<string> {
      if (!this.isCloudConnected || !this.storage) {
          throw new Error("يجب الاتصال بالإنترنت وقاعدة البيانات السحابية لرفع الملفات.");
      }
      
      const storageRef = ref(this.storage, `${folder}/${Date.now()}_${file.name}`);
      const metadata = {
          contentType: file.type,
      };

      if (onProgress) {
        return new Promise((resolve, reject) => {
            if (!this.storage) return reject(new Error("Storage unavailable"));
            const uploadTask = uploadBytesResumable(storageRef, file, metadata);
            
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(progress);
                },
                (error) => {
                    console.error("Upload Error:", error);
                    reject(new Error("فشل رفع الملف: " + error.message));
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    } catch (e: any) {
                        reject(new Error("Failed to get download URL: " + e.message));
                    }
                }
            );
        });
      }
      
      try {
          const snapshot = await uploadBytes(storageRef, file, metadata);
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

      // Meetings Listener
      onSnapshot(collection(this.firestore, 'meetings'), (snapshot) => {
          this._meetings = snapshot.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) } as Meeting));
          this.notifyListeners();
      });

      // Resources Listener
      onSnapshot(collection(this.firestore, 'resources'), (snapshot) => {
          this._resources = snapshot.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) } as Resource));
          this.notifyListeners();
      });

      // Announcement Listener
      onSnapshot(collection(this.firestore, 'settings'), (snapshot) => {
          const announcementDoc = snapshot.docs.find(d => d.id === 'announcement');
          if (announcementDoc) {
              this._announcement = announcementDoc.data().text || '';
              this.notifyListeners();
          }
      });

      // Logs Listener
      onSnapshot(collection(this.firestore, 'logs'), (snapshot) => {
          this._loginLogs = snapshot.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) } as LoginLog))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.notifyListeners();
      });
  }

  // --- Data Access & Mutation Methods ---

  getUsers() { return this._users; }
  getTrainers() { return this._users.filter(u => u.role === 'trainer'); }
  getUserById(id: number) { return this._users.find(u => u.id === id); }
  getTraineesByTrainer(trainerId: number) { return this._users.filter(u => u.role === 'trainee' && u.assigned_trainer_id === trainerId); }

  async saveUser(userData: Omit<User, 'id'>) {
      const id = Date.now();
      const user = { ...userData, id };
      if (this.isCloudConnected && this.firestore) {
          await setDoc(doc(this.firestore, 'users', String(id)), user);
      } else {
          this._users.push(user);
          this.saveToLocalStorage();
          this.notifyListeners();
      }
      return user;
  }

  async updateUser(id: number, updates: Partial<User>) {
      if (this.isCloudConnected && this.firestore) {
          await updateDoc(doc(this.firestore, 'users', String(id)), updates as any);
      } else {
          const idx = this._users.findIndex(u => u.id === id);
          if (idx !== -1) {
              this._users[idx] = { ...this._users[idx], ...updates };
              this.saveToLocalStorage();
              this.notifyListeners();
          }
      }
  }

  async deleteUser(id: number) {
      if (this.isCloudConnected && this.firestore) {
          await deleteDoc(doc(this.firestore, 'users', String(id)));
      } else {
          this._users = this._users.filter(u => u.id !== id);
          this.saveToLocalStorage();
          this.notifyListeners();
      }
  }

  login(email: string, pass: string): User | null {
      const user = this._users.find(u => u.email === email && u.password === pass);
      if (user) {
          const log: LoginLog = {
              id: Date.now(),
              user_id: user.id,
              user_name: user.name,
              role: user.role,
              timestamp: new Date().toLocaleString('ar-EG')
          };
          if (this.isCloudConnected && this.firestore) {
              addDoc(collection(this.firestore, 'logs'), log);
          } else {
              this._loginLogs.unshift(log);
              this.saveToLocalStorage();
          }
          return user;
      }
      return null;
  }

  getFiles() { return this._files; }
  
  /**
   * Universal Add File/Link Method
   * @param targetUserId Who is receiving this file?
   * @param filename Name of file or Link Title
   * @param description 
   * @param url Cloud URL or External Link
   * @param sender The user sending the file (for exchange logic)
   * @param isLink Is this just a link (text) or a file?
   */
  async addFile(
      targetUserId: number, 
      filename: string, 
      description: string, 
      url: string | undefined, 
      sender: User,
      isLink: boolean = false
    ) {
      const recipient = this.getUserById(targetUserId);
      const id = Date.now();
      const file: FileRecord = {
          id,
          user_id: targetUserId, // Recipient
          filename,
          file_url: url,
          upload_date: new Date().toLocaleDateString('ar-EG'),
          description,
          user_name: recipient?.name || 'مستخدم', // Name of the owner (Recipient)
          
          // Exchange Details
          sender_id: sender.id,
          sender_name: sender.name,
          sender_role: sender.role,
          is_link: isLink,
          
          status: 'pending'
      };

      if (this.isCloudConnected && this.firestore) {
          await setDoc(doc(this.firestore, 'files', String(id)), file);
      } else {
          this._files.unshift(file);
          this.saveToLocalStorage();
          this.notifyListeners();
      }
  }

  async gradeFile(fileId: number, score: number, feedback: string) {
      if (this.isCloudConnected && this.firestore) {
          await updateDoc(doc(this.firestore, 'files', String(fileId)), { score, feedback, status: 'graded' });
      } else {
          const idx = this._files.findIndex(f => f.id === fileId);
          if (idx !== -1) {
              this._files[idx] = { ...this._files[idx], score, feedback, status: 'graded' };
              this.saveToLocalStorage();
              this.notifyListeners();
          }
      }
  }

  getMeetings() { return this._meetings; }
  async addMeeting(meetingData: Omit<Meeting, 'id' | 'created_at'>) {
      const id = Date.now();
      const meeting = { ...meetingData, id, created_at: new Date().toISOString() };
      if (this.isCloudConnected && this.firestore) {
          await setDoc(doc(this.firestore, 'meetings', String(id)), meeting);
      } else {
          this._meetings.push(meeting);
          this.saveToLocalStorage();
          this.notifyListeners();
      }
  }

  getResources() { return this._resources; }
  async addResource(resourceData: Omit<Resource, 'id' | 'created_at'>) {
      const id = Date.now();
      const resource = { ...resourceData, id, created_at: new Date().toISOString() };
      if (this.isCloudConnected && this.firestore) {
          await setDoc(doc(this.firestore, 'resources', String(id)), resource);
      } else {
          this._resources.push(resource);
          this.saveToLocalStorage();
          this.notifyListeners();
      }
  }

  async deleteResource(id: number) {
      if (this.isCloudConnected && this.firestore) {
          await deleteDoc(doc(this.firestore, 'resources', String(id)));
      } else {
          this._resources = this._resources.filter(r => r.id !== id);
          this.saveToLocalStorage();
          this.notifyListeners();
      }
  }

  getAnnouncement() { return this._announcement; }
  async setAnnouncement(text: string) {
      if (this.isCloudConnected && this.firestore) {
          await setDoc(doc(this.firestore, 'settings', 'announcement'), { text });
      } else {
          this._announcement = text;
          this.saveToLocalStorage();
          this.notifyListeners();
      }
  }

  getAttendance(trainerId: number, date: string) {
      return this._attendance.filter(a => a.trainer_id === trainerId && a.date === date);
  }

  async saveAttendance(records: Omit<AttendanceRecord, 'id'>[]) {
      if (this.isCloudConnected && this.firestore) {
          // Simplification: just add new ones
          for (const r of records) {
              await addDoc(collection(this.firestore, 'attendance'), { ...r, id: Date.now() });
          }
      } else {
          records.forEach(r => this._attendance.push({ ...r, id: Date.now() }));
          this.saveToLocalStorage();
          this.notifyListeners();
      }
  }

  async updateUserProfile(userId: number, updates: Partial<User>) {
      await this.updateUser(userId, updates);
  }

  async updatePassword(email: string, newPass: string) {
      const user = this._users.find(u => u.email === email);
      if (user) {
          await this.updateUser(user.id, { password: newPass });
          return true;
      }
      return false;
  }

  getLoginLogs() { return this._loginLogs; }

  exportDB() {
    try {
        const data = {
            users: this._users,
            files: this._files,
            meetings: this._meetings,
            resources: this._resources,
            attendance: this._attendance,
            announcement: this._announcement,
            logs: this._loginLogs
        };
        const blob = new Blob([this.safeStringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    } catch (e) {
        console.error("Export Failed:", e);
        alert("فشل تصدير البيانات. قد تكون هناك مشكلة في بنية البيانات.");
    }
  }

  importDB(json: string): boolean {
    try {
        const data = JSON.parse(json);
        this._users = data.users || [];
        this._files = data.files || [];
        this._meetings = data.meetings || [];
        this._resources = data.resources || [];
        this._attendance = data.attendance || [];
        this._announcement = data.announcement || '';
        this._loginLogs = data.logs || [];
        this.saveToLocalStorage();
        this.notifyListeners();
        return true;
    } catch (e) {
        return false;
    }
  }

  exportUsersToCSV() {
      const headers = "الاسم,البريد,الدور,الهاتف\n";
      const rows = this._users.map(u => `${u.name},${u.email},${u.role},${u.phone || ''}`).join("\n");
      const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "users_report.csv";
      a.click();
  }
}

// Fix: Exported the db instance
export const db = new DatabaseService();
