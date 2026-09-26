import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 1. Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBmd6DEDPi_B4UQ7SMsgLccwygFvrMeHvE",
  authDomain: "studentp-attendance-management.firebaseapp.com",
  projectId: "studentp-attendance-management",
  storageBucket: "studentp-attendance-management.firebasestorage.app",
  messagingSenderId: "350484388983",
  appId: "1:350484388983:web:2f36c80f8edcdde927ba72"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Export Firebase Auth & Firestore functions
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification
};

// 3. Export Constants & Helpers
export const MIN_PERCENT = 75;

export function todayStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function monthOf(dateStr) {
  if (!dateStr) return todayStr().slice(0, 7);
  return dateStr.slice(0, 7);
}

export function timeNow(d = new Date()) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

export function prettyDate(dateStr) {
  return fmtDate(dateStr);
}

export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function percent(present, total) {
  if (!total || total <= 0) return 0;
  return Math.round((present / total) * 100);
}

export function isLow(presentCount, totalCount, minAttendance) {
  if (!totalCount || totalCount <= 0) return false;
  const threshold = (minAttendance !== undefined && minAttendance !== null && !isNaN(Number(minAttendance)))
    ? Number(minAttendance)
    : MIN_PERCENT;
  return percent(presentCount, totalCount) < threshold;
}

export function toast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
  toastEl.innerHTML = `<span>${esc(message)}</span>`;
  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toastEl.remove(), 300);
  }, 3500);
}

export function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return;
  
  let csvContent = "";
  if (Array.isArray(rows[0])) {
    csvContent = rows.map(e => e.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");
  } else {
    const headers = Object.keys(rows[0]);
    csvContent = headers.join(",") + "\n";
    csvContent += rows.map(row => {
      return headers.map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(",");
    }).join("\n");
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 4. Session Helpers using sessionStorage & localStorage
const SESSION_KEY = 'sam_session';

export function getSession() {
  try {
    const data = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to parse session", e);
    return null;
  }
}

export function setSession(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (e) {}
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

export function requireRole(role) {
  return new Promise((resolve) => {
    let resolved = false;

    // Safety timeout: if Firebase Auth is slow or unresponsive, fallback to cached session
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const cached = getSession();
        if (cached && (role === 'any' || cached.role === role)) {
          return resolve(cached);
        }
        const defaultTarget = role === 'teacher' ? 'teacher-login.html' : 'student-login.html';
        window.location.href = defaultTarget;
        resolve(null);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timer);
      if (resolved) return;
      
      const defaultTarget = role === 'teacher' ? 'teacher-login.html' : 'student-login.html';

      if (!user) {
        resolved = true;
        unsubscribe();
        clearSession();
        window.location.href = defaultTarget;
        return resolve(null);
      }

      resolved = true;
      unsubscribe();

      try {
        let actualRole = null;
        let userData = null;

        // 1. Check cached session first if valid
        const cachedSession = getSession();
        if (cachedSession && cachedSession.id === user.uid && cachedSession.role) {
          actualRole = cachedSession.role;
          userData = cachedSession;
          const colName = cachedSession.role === 'teacher' ? 'teachers' : 'students';
          try {
            const userSnap = await getDoc(doc(db, colName, user.uid));
            if (userSnap.exists()) {
              userData = userSnap.data();
            }
          } catch (e) {
            console.warn("Cached role doc lookup warning:", e);
          }
        }

        // 2. If not verified via cache, check students then teachers safely
        if (!actualRole) {
          try {
            const studentSnap = await getDoc(doc(db, 'students', user.uid));
            if (studentSnap.exists()) {
              actualRole = 'student';
              userData = studentSnap.data();
            }
          } catch (e) {
            console.warn("Student doc lookup warning:", e);
          }
        }

        if (!actualRole) {
          try {
            const teacherSnap = await getDoc(doc(db, 'teachers', user.uid));
            if (teacherSnap.exists()) {
              actualRole = 'teacher';
              userData = teacherSnap.data();
            }
          } catch (e) {
            console.warn("Teacher doc lookup warning:", e);
          }
        }

        // 3. Fallback to cached session if available
        if (!actualRole && cachedSession && cachedSession.id === user.uid) {
          actualRole = cachedSession.role;
          userData = cachedSession;
        }

        if (!actualRole) {
          await signOut(auth);
          clearSession();
          window.location.href = defaultTarget;
          return resolve(null);
        }

        if (role !== 'any' && role !== actualRole) {
          const target = role === 'teacher' ? 'teacher-login.html' : 'student-login.html';
          window.location.href = target;
          return resolve(null);
        }

        let sessionData = actualRole === 'teacher' ? {
          id: user.uid,
          role: 'teacher',
          name: (userData && userData.name) || 'Teacher',
          email: (userData && userData.email) || user.email || ''
        } : {
          id: user.uid,
          role: 'student',
          name: (userData && userData.name) || 'Student',
          email: (userData && userData.email) || user.email || '',
          rollNo: (userData && userData.rollNo) || '',
          class: (userData && userData.class) || '',
          division: (userData && userData.division) || ''
        };

        setSession(sessionData);

        if (!user.emailVerified) {
          window.location.href = 'verify-email.html';
          return resolve(null);
        }

        resolve(sessionData);
      } catch (err) {
        console.error("Error in requireRole:", err);
        clearSession();
        window.location.href = defaultTarget;
        resolve(null);
      }
    });
  });
}

// Helper to map auth errors
function mapAuthError(code, defaultMsg) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email is already in use.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many requests. Please wait a moment before trying again.';
    default:
      return defaultMsg;
  }
}

// 5. Login User
export async function loginUser(role, email, password) {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    
    if (!cleanEmail || !cleanPass) {
      return { ok: false, error: "Please enter all required fields." };
    }

    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    const user = userCredential.user;
    const uid = user.uid;

    const colName = role === 'teacher' ? 'teachers' : 'students';
    const userSnap = await getDoc(doc(db, colName, uid));

    if (!userSnap.exists()) {
      await signOut(auth);
      clearSession();
      return { ok: false, error: `No ${role} account found for this email.` };
    }

    const userData = userSnap.data();
    let sessionData = null;

    if (role === 'teacher') {
      sessionData = {
        id: uid,
        role: 'teacher',
        name: userData.name || 'Teacher',
        email: userData.email || cleanEmail
      };
    } else {
      sessionData = {
        id: uid,
        role: 'student',
        name: userData.name || 'Student',
        email: userData.email || cleanEmail,
        rollNo: userData.rollNo || '',
        class: userData.class || '',
        division: userData.division || ''
      };
    }

    setSession(sessionData);

    if (!user.emailVerified) {
      return { ok: true, session: sessionData, needsVerification: true };
    }

    return { ok: true, session: sessionData };
  } catch (err) {
    console.error("Login error:", err);
    const mapped = mapAuthError(err.code, "An unexpected error occurred during login.");
    return { ok: false, error: mapped };
  }
}

// 6. Mount Shell (Navigation, Topbar & Drawer)
export async function mountShell(role, activePage) {
  // 1. Render immediately to eliminate blank screen & missing sidebar
  const cached = getSession();
  if (cached) {
    renderShellUI(cached, activePage);
  } else {
    // Initial immediate render while auth verifies
    const fallbackRole = role === 'student' ? 'student' : 'teacher';
    renderShellUI({ role: fallbackRole, name: 'User' }, activePage);
  }

  // 2. Validate auth & role asynchronously
  const session = await requireRole(role);
  if (!session) return null;

  // 3. Update shell UI with confirmed session
  renderShellUI(session, activePage);
  return session;
}

function renderShellUI(session, activePage) {
  const userRole = session.role;

  const teacherNav = [
    { title: 'Dashboard', href: 'teacher-dashboard.html', key: 'dashboard', icon: '📊' },
    { title: 'Subjects', href: 'teacher-subjects.html', key: 'subjects', icon: '📚' },
    { title: 'Students', href: 'teacher-students.html', key: 'students', icon: '👥' },
    { title: 'Start Lecture', href: 'teacher-start-lecture.html', key: 'start-lecture', icon: '▶️' },
    { title: 'Live Attendance', href: 'attendance.html', key: 'live-attendance', icon: '📡' },
    { title: 'Daily Report', href: 'teacher-daily-report.html', key: 'daily-report', icon: '📅' },
    { title: 'Monthly Report', href: 'monthly-report.html', key: 'monthly-report', icon: '📈' },
    { title: 'Defaulters', href: 'defaulters.html', key: 'defaulters', icon: '⚠️' },
    { title: 'Profile', href: 'teacher-profile.html', key: 'profile', icon: '👤' }
  ];

  const studentNav = [
    { title: 'Dashboard', href: 'student-dashboard.html', key: 'dashboard', icon: '📊' },
    { title: 'Mark Attendance', href: 'attendance.html', key: 'mark-attendance', icon: '✅' },
    { title: 'Attendance History', href: 'student-attendance-history.html', key: 'attendance-history', icon: '📋' },
    { title: 'Monthly Attendance', href: 'monthly-report.html', key: 'monthly-attendance', icon: '📅' },
    { title: 'Profile', href: 'student-profile.html', key: 'profile', icon: '👤' }
  ];

  const navItems = userRole === 'teacher' ? teacherNav : studentNav;

  const isMonthlyReport = activePage === 'monthly-report' || activePage === 'monthly-attendance';
  const isAttendance = activePage === 'live-attendance' || activePage === 'mark-attendance';
  const isDailyReport = activePage === 'daily-report';
  const isDefaulters = activePage === 'defaulters';

  const isItemActive = (itemKey) => {
    if (activePage === itemKey) return true;
    if (isMonthlyReport && (itemKey === 'monthly-report' || itemKey === 'monthly-attendance')) return true;
    if (isAttendance && (itemKey === 'live-attendance' || itemKey === 'mark-attendance')) return true;
    if (isDailyReport && itemKey === 'daily-report') return true;
    if (isDefaulters && itemKey === 'defaulters') return true;
    return false;
  };

  // Mount Sidebar
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    sidebarEl.className = 'sidebar';
    sidebarEl.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-brand">
          🎓 Student<span class="accent">AMS</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(item => `
          <a href="${item.href}" class="nav-item ${isItemActive(item.key) ? 'active' : ''}">
            <span>${item.icon}</span>
            <span>${esc(item.title)}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <button id="logout-btn" class="btn btn-ghost btn-block" style="color: #cbd5e1; justify-content: flex-start; gap: 0.75rem;">
          <span>🚪</span> Logout
        </button>
      </div>
    `;

    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
      } catch (err) {
        console.error("SignOut error:", err);
      }
      clearSession();
      const loginUrl = userRole === 'teacher' ? 'teacher-login.html' : 'student-login.html';
      window.location.href = loginUrl;
    });
  }

  // Create overlay if not existing
  let overlayEl = document.querySelector('.sidebar-overlay');
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.className = 'sidebar-overlay';
    document.body.appendChild(overlayEl);
  }

  // Mount Topbar
  const topbarEl = document.getElementById('topbar');
  if (topbarEl) {
    topbarEl.className = 'topbar';
    topbarEl.innerHTML = `
      <div class="topbar-left">
        <button id="menu-toggle-btn" class="menu-toggle-btn" aria-label="Toggle Sidebar">
          ☰
        </button>
        <h1 class="topbar-title">Student Attendance Management System</h1>
      </div>
      <div class="topbar-user">
        <div class="user-badge">
          <span class="user-name">${esc(session.name)}</span>
          <span class="user-role">${esc(session.role)}</span>
        </div>
        <div class="avatar-circle">
          ${esc((session.name || 'U').charAt(0).toUpperCase())}
        </div>
      </div>
    `;

    const toggleBtn = document.getElementById('menu-toggle-btn');
    const closeDrawer = () => {
      sidebarEl?.classList.remove('open');
      overlayEl?.classList.remove('open');
    };

    toggleBtn?.addEventListener('click', () => {
      sidebarEl?.classList.toggle('open');
      overlayEl?.classList.toggle('open');
    });

    overlayEl?.addEventListener('click', closeDrawer);
  }
}

// 7. Lecture & Attendance Operations

export async function startLecture(subject, teacher) {
  const activeQ = query(
    collection(db, 'lectures'),
    where('teacherId', '==', teacher.id),
    where('status', '==', 'active')
  );
  const activeSnap = await getDocs(activeQ);
  if (!activeSnap.empty) {
    throw new Error("You already have an active lecture session running.");
  }

  const dateNow = todayStr();
  const timeStr = timeNow();
  const docRef = await addDoc(collection(db, 'lectures'), {
    subjectId: subject.id,
    subjectName: subject.name,
    class: subject.class || '',
    division: subject.division || '',
    teacherId: teacher.id,
    teacherName: teacher.name,
    date: dateNow,
    month: monthOf(dateNow),
    startTime: timeStr,
    endTime: null,
    startedAtMs: Date.now(),
    endedAtMs: null,
    status: "active",
    totalStudents: (subject.studentIds || []).length
  });

  return docRef.id;
}

export async function markPresent(lectureId, student) {
  return await runTransaction(db, async (transaction) => {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureSnap = await transaction.get(lectureRef);

    if (!lectureSnap.exists() || lectureSnap.data().status !== 'active') {
      throw new Error("This lecture is closed. Attendance can no longer be marked.");
    }
    const lectureData = lectureSnap.data();

    const subjectRef = doc(db, 'subjects', lectureData.subjectId);
    const subjectSnap = await transaction.get(subjectRef);

    if (!subjectSnap.exists()) {
      throw new Error("Subject not found.");
    }

    const subjectData = subjectSnap.data();
    const enrolledIds = subjectData.studentIds || [];
    if (!enrolledIds.includes(student.id)) {
      throw new Error("You are not enrolled in this subject.");
    }

    const attDocId = `${lectureId}_${student.id}`;
    const attRef = doc(db, 'attendance', attDocId);
    const attSnap = await transaction.get(attRef);

    if (attSnap.exists()) {
      throw new Error("You have already marked attendance for this lecture.");
    }

    const timeStr = timeNow();
    transaction.set(attRef, {
      lectureId: lectureId,
      subjectId: lectureData.subjectId,
      subjectName: lectureData.subjectName,
      teacherName: lectureData.teacherName,
      studentId: student.id,
      rollNo: student.rollNo || '',
      studentName: student.name || '',
      date: lectureData.date,
      month: lectureData.month,
      startTime: lectureData.startTime,
      status: "present",
      markedAt: timeStr,
      markedAtMs: Date.now()
    });
  });
}

export async function stopLecture(lecture) {
  const lectureRef = doc(db, 'lectures', lecture.id);
  const timeStr = timeNow();
  const endMs = Date.now();

  // 1. FIRST updateDoc to status "closed" to lock immediately
  await updateDoc(lectureRef, {
    status: "closed",
    endTime: timeStr,
    endedAtMs: endMs
  });

  // 2. Read subject's studentIds
  const subjectSnap = await getDoc(doc(db, 'subjects', lecture.subjectId));
  const studentIds = subjectSnap.exists() ? (subjectSnap.data().studentIds || []) : [];

  // 3. Read existing attendance for this lecture
  const attQ = query(collection(db, 'attendance'), where('lectureId', '==', lecture.id));
  const attSnap = await getDocs(attQ);
  
  const markedStudentIds = new Set();
  attSnap.forEach(d => {
    const data = d.data();
    if (data.studentId) markedStudentIds.add(data.studentId);
  });

  const missingStudentIds = studentIds.filter(id => !markedStudentIds.has(id));
  if (missingStudentIds.length === 0) return;

  // 4. Fetch missing students info
  const studentDocs = await Promise.all(missingStudentIds.map(id => getDoc(doc(db, 'students', id))));

  const batch = writeBatch(db);
  studentDocs.forEach(stSnap => {
    if (!stSnap.exists()) return;
    const stData = stSnap.data();
    const attDocId = `${lecture.id}_${stSnap.id}`;
    const attRef = doc(db, 'attendance', attDocId);

    batch.set(attRef, {
      lectureId: lecture.id,
      subjectId: lecture.subjectId,
      subjectName: lecture.subjectName,
      teacherName: lecture.teacherName,
      studentId: stSnap.id,
      rollNo: stData.rollNo || '',
      studentName: stData.name || '',
      date: lecture.date,
      month: lecture.month,
      startTime: lecture.startTime,
      status: "absent",
      markedAt: timeStr,
      markedAtMs: endMs
    });
  });

  await batch.commit();
}

export async function getStudents(ids) {
  if (!ids || !ids.length) return [];
  const snaps = await Promise.all(ids.map(id => getDoc(doc(db, 'students', id))));
  const list = snaps
    .filter(snap => snap.exists())
    .map(snap => ({ id: snap.id, ...snap.data() }));

  list.sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true }));
  return list;
}

export async function getTeacherSubjects(teacherId) {
  if (!teacherId) return [];
  const q = query(collection(db, 'subjects'), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getActiveLectures(subjectIds) {
  if (!subjectIds || !subjectIds.length) return [];
  
  const results = [];
  for (const id of subjectIds) {
    const q = query(
      collection(db, 'lectures'),
      where('subjectId', '==', id),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      results.push({ id: d.id, ...d.data() });
    });
  }
  return results;
}

export const TEACHER_CODE = "TEACH2026";

export async function registerStudent(data) {
  try {
    const rollNo = (data.rollNo || '').trim();
    const name = (data.name || '').trim();
    const className = (data.class || '').trim();
    const division = (data.division || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const password = (data.password || '').trim();

    if (!rollNo || !name || !className || !division || !email || !password) {
      return { ok: false, error: "Please fill in all required fields." };
    }

    if (password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters long." };
    }

    // 1. Create Firebase Auth user first (populates auth.currentUser so request.auth != null)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Send verification email
    try {
      await sendEmailVerification(userCredential.user);
    } catch (verr) {
      console.warn("Failed to send verification email:", verr);
    }

    // 2. Check if roll number is already used by another student document
    try {
      const rollQ = query(collection(db, 'students'), where('rollNo', '==', rollNo));
      const rollSnap = await getDocs(rollQ);
      const existsOther = rollSnap.docs.some(d => d.id !== uid);
      if (existsOther) {
        await userCredential.user.delete();
        await signOut(auth);
        clearSession();
        return { ok: false, error: "This roll number is already registered." };
      }
    } catch (rollErr) {
      console.warn("Roll number check error:", rollErr);
    }

    // 3. Save student profile document in Firestore (no password)
    await setDoc(doc(db, 'students', uid), {
      rollNo,
      name,
      class: className,
      division,
      email
    });

    const sessionData = {
      id: uid,
      role: 'student',
      name,
      email,
      rollNo,
      class: className,
      division
    };

    setSession(sessionData);
    return { ok: true, session: sessionData, needsVerification: true };
  } catch (err) {
    console.error("Student registration error:", err);
    const mapped = mapAuthError(err.code, err.message || "Registration failed.");
    return { ok: false, error: mapped };
  }
}

export async function registerTeacher(data) {
  try {
    const name = (data.name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const password = (data.password || '').trim();
    const accessCode = (data.accessCode || '').trim();

    if (!name || !email || !password) {
      return { ok: false, error: "Please fill in all required fields." };
    }

    if (accessCode.toUpperCase() !== TEACHER_CODE.toUpperCase()) {
      return { ok: false, error: "Invalid teacher access code." };
    }

    if (password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters long." };
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Send verification email
    try {
      await sendEmailVerification(userCredential.user);
    } catch (verr) {
      console.warn("Failed to send verification email:", verr);
    }

    // Save teacher profile document in Firestore (no password)
    await setDoc(doc(db, 'teachers', uid), {
      name,
      email
    });

    const sessionData = {
      id: uid,
      role: 'teacher',
      name,
      email
    };

    setSession(sessionData);
    return { ok: true, session: sessionData, needsVerification: true };
  } catch (err) {
    console.error("Teacher registration error:", err);
    const mapped = mapAuthError(err.code, err.message || "Registration failed.");
    return { ok: false, error: mapped };
  }
}




