import streamlit as st
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import uuid
from datetime import datetime

# --- إعداد الصفحة ---
st.set_page_config(page_title="منصة التدريب", layout="wide", initial_sidebar_state="expanded")

# --- دالة الاتصال بجوجل شيت (مهمة جداً) ---
# هذه الدالة تستخدم "السر" المخزن في Streamlit Secrets للاتصال
@st.cache_resource
def get_gsheet_connection():
    # تحديد النطاق (Scope) للصلاحيات
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    
    # جلب بيانات الاعتماد من Secrets
    # تأكد أنك وضعت البيانات في Streamlit Secrets تحت اسم [gcp_service_account]
    creds_dict = st.secrets["gcp_service_account"]
    
    creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    client = gspread.authorize(creds)
    
    # فتح ملف الشيت بالاسم
    sh = client.open("Training_Platform_DB")
    return sh

# --- دوال التعامل مع البيانات ---

def get_data(sheet_name):
    sh = get_gsheet_connection()
    worksheet = sh.worksheet(sheet_name)
    data = worksheet.get_all_records()
    return pd.DataFrame(data)

def add_row(sheet_name, row_data):
    sh = get_gsheet_connection()
    worksheet = sh.worksheet(sheet_name)
    worksheet.append_row(row_data)

def update_grade(file_id, new_score, new_feedback):
    sh = get_gsheet_connection()
    worksheet = sh.worksheet("files")
    
    # البحث عن الصف الذي يحتوي على ID الملف
    try:
        cell = worksheet.find(file_id)
        if cell:
            # تحديث الدرجة (العمود 6) والملاحظات (العمود 7) والحالة (العمود 8)
            # ملاحظة: أرقام الأعمدة تقريبية، تأكد من ترتيب أعمدتك في الشيت
            # (id, user_id, filename, description, upload_date, score, feedback, status, student_name)
            # score هو العمود F (رقم 6)، feedback هو G (رقم 7)، status هو H (رقم 8)
            
            worksheet.update_cell(cell.row, 6, new_score)     # Score
            worksheet.update_cell(cell.row, 7, new_feedback)  # Feedback
            worksheet.update_cell(cell.row, 8, "تم التقييم")   # Status
            return True
    except gspread.exceptions.CellNotFound:
        return False
    return False

# --- واجهة تسجيل الدخول والتسجيل ---

def login_page():
    st.header("تسجيل الدخول")
    email = st.text_input("البريد الإلكتروني")
    password = st.text_input("كلمة المرور", type="password")
    
    if st.button("دخول"):
        if not email or not password:
            st.warning("يرجى ملء جميع الحقول")
            return
            
        try:
            df_users = get_data("users")
            # التأكد من أن الأعمدة موجودة كـ String للمقارنة
            df_users['email'] = df_users['email'].astype(str)
            df_users['password'] = df_users['password'].astype(str)
            
            user = df_users[(df_users['email'] == email) & (df_users['password'] == password)]
            
            if not user.empty:
                st.success(f"مرحباً {user.iloc[0]['name']}")
                st.session_state['logged_in'] = True
                st.session_state['user_info'] = user.iloc[0].to_dict()
                st.rerun()
            else:
                st.error("البريد الإلكتروني أو كلمة المرور غير صحيحة")
        except Exception as e:
            st.error(f"حدث خطأ في الاتصال بقاعدة البيانات: {e}")

def register_page():
    st.header("إنشاء حساب جديد")
    name = st.text_input("الاسم الثلاثي")
    email = st.text_input("البريد الإلكتروني للتسجيل")
    phone = st.text_input("رقم الهاتف")
    password = st.text_input("كلمة المرور الجديدة", type="password")
    role = st.selectbox("نوع الحساب", ["متدرب", "مدرب"])
    
    if st.button("إنشاء الحساب"):
        if name and email and password:
            try:
                new_id = str(uuid.uuid4())
                # ترتيب البيانات كما في الشيت: id, name, email, password, phone, role, assigned_trainer_id
                row = [new_id, name, email, password, phone, role, ""]
                add_row("users", row)
                st.success("تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.")
            except Exception as e:
                st.error(f"حدث خطأ: {e}")
        else:
            st.warning("يرجى ملء كافة البيانات")

# --- لوحة تحكم المتدرب ---
def trainee_dashboard():
    user = st.session_state['user_info']
    st.title(f"لوحة المتدرب: {user['name']}")
    
    st.subheader("رفع مهمة جديدة")
    
    # ملاحظة: لرفع ملفات حقيقية (PDF) وحفظها نحتاج Google Drive API المعقدة
    # هنا سنقوم بمحاكاة الرفع بتسجيل بيانات الملف، ويمكن للمتدرب وضع رابط للملف (Google Drive link)
    
    task_name = st.text_input("اسم المهمة / عنوان الملف")
    task_desc = st.text_area("وصف المهمة أو رابط الملف (Google Drive Link)")
    
    uploaded_file = st.file_uploader("اختر ملف (للعلم فقط سيتم حفظ اسمه وتاريخه)", type=['pdf', 'docx', 'png', 'jpg'])
    
    if st.button("إرسال المهمة"):
        if task_name and uploaded_file:
            file_id = str(uuid.uuid4())
            date_now = datetime.now().strftime("%Y-%m-%d %H:%M")
            filename = uploaded_file.name
            
            # (id, user_id, filename, description, upload_date, score, feedback, status, student_name)
            row = [file_id, user['id'], filename, task_desc, date_now, "", "", "قيد المراجعة", user['name']]
            
            add_row("files", row)
            st.success("تم إرسال بيانات المهمة للمدرب بنجاح!")
        else:
            st.warning("يرجى إدخال اسم المهمة ورفع الملف")

    st.divider()
    st.subheader("حالة مهامي السابقة")
    try:
        df_files = get_data("files")
        if not df_files.empty:
            # فلترة الملفات الخاصة بهذا المستخدم فقط
            # تحويل user_id إلى string لضمان تطابق المقارنة
            df_files['user_id'] = df_files['user_id'].astype(str)
            my_files = df_files[df_files['user_id'] == str(user['id'])]
            
            if not my_files.empty:
                # عرض جدول مبسط
                st.table(my_files[['filename', 'upload_date', 'status', 'score', 'feedback']])
            else:
                st.info("لم تقم برفع أي مهام بعد.")
        else:
            st.info("لم تقم برفع أي مهام بعد.")
    except Exception as e:
        st.error("جاري تجهيز قاعدة البيانات...")

# --- لوحة تحكم المدرب ---
def trainer_dashboard():
    user = st.session_state['user_info']
    st.title(f"لوحة المدرب: {user['name']}")
    
    st.subheader("متابعة مهام المتدربين")
    
    try:
        df_files = get_data("files")
        
        if not df_files.empty:
            # عرض المهام التي تحتاج مراجعة أولاً
            st.dataframe(df_files[['student_name', 'filename', 'upload_date', 'status', 'score', 'feedback']])
            
            st.divider()
            st.write("### تقييم مهمة")
            
            # اختيار مهمة للتقييم
            task_options = df_files['id'].tolist()
            # إنشاء قائمة منسدلة تعرض اسم الطالب واسم الملف لتسهيل الاختيار
            options_display = {row['id']: f"{row['student_name']} - {row['filename']}" for index, row in df_files.iterrows()}
            
            selected_task_id = st.selectbox("اختر المهمة للتقييم", options=task_options, format_func=lambda x: options_display.get(x, x))
            
            col1, col2 = st.columns(2)
            with col1:
                new_score = st.text_input("الدرجة (من 100)")
            with col2:
                new_feedback = st.text_input("ملاحظات للمتدرب")
                
            if st.button("حفظ التقييم"):
                if update_grade(selected_task_id, new_score, new_feedback):
                    st.success("تم تحديث النتيجة في قاعدة البيانات!")
                    st.rerun() # تحديث الصفحة لرؤية التغييرات
                else:
                    st.error("حدث خطأ أثناء التحديث.")
        else:
            st.info("لا توجد مهام مرفوعة حتى الآن.")
            
    except Exception as e:
        st.error(f"خطأ في جلب البيانات: {e}")

# --- الهيكل الرئيسي للتطبيق ---

def main():
    if 'logged_in' not in st.session_state:
        st.session_state['logged_in'] = False

    if not st.session_state['logged_in']:
        menu = st.sidebar.selectbox("القائمة", ["تسجيل الدخول", "إنشاء حساب جديد"])
        if menu == "تسجيل الدخول":
            login_page()
        else:
            register_page()
    else:
        st.sidebar.button("تسجيل الخروج", on_click=lambda: st.session_state.clear())
        
        user = st.session_state['user_info']
        if user['role'] == "مدرب":
            trainer_dashboard()
        else:
            trainee_dashboard()

if __name__ == '__main__':
    main()