# Student Attendance Management System (Student AMS)

A modern, multi-page **Student Attendance Management System** built with **Plain HTML5, CSS3, Vanilla JavaScript (ES Modules)**, and **Firebase Firestore (v10.12.2 CDN)**.

No build step, framework, or `npm` installation is required.

---

## 🚀 Features

- **Dual Roles & Self-Registration**:
  - **Self-Registration Portal (`register.html`)**: Allows students and teachers to self-register. Students select Class/Year (FE, SE, TE, BE), Division (A, B, C, D), and credentials without assigning subjects. Teachers register with name, email, password, and a mandatory access code (`TEACH2026`).
  - **Teacher Portal**: Manage subjects (with Class/Year & Division dropdowns), assign registered students to subjects with multi-select checkboxes and Class/Division filters, launch live lecture sessions, monitor attendance in real time, lock lectures, and export daily & monthly reports.
  - **Student Portal**: View enrolled subjects, mark live lecture attendance with a single click, monitor attendance percentage, and track historical attendance records.


- **Real-Time Live Attendance**:
  - Uses Firestore `onSnapshot` listeners to stream live student attendance updates to the teacher's console instantly.
  - Students see active live lectures in real-time on their dashboard and attendance screen.
- **Transaction & Concurrency Control**:
  - `markPresent()` utilizes Firestore `runTransaction()` to atomically verify active lecture status, subject enrollment, and prevent duplicate marking.
  - Lecture status locking ensures no student can mark attendance once a lecture is stopped.
  - Automatically batch-records `absent` status for unmarked enrolled students when a lecture is stopped.
- **Reports & Data Export**:
  - **Daily Report**: Filter by date, class, division, subject, and status with instant CSV downloads.
  - **Monthly Report**: Subject-wise cumulative attendance calculations, average attendance metrics, low attendance highlighting (<75%), and CSV downloads.
- **Responsive College UI**:
  - College-style navy design with Bitter serif headers, Public Sans typography, stat cards, alerts, toasts, and slide-in navigation drawer for mobile screens (tested at 375px+).

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom CSS Properties / Design System), ES Modules (`import`/`export`).
- **Database**: Firebase Firestore loaded directly from the official CDN:
  - `https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js`
  - `https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js`

---

## ⚙️ How to Run the Application

Because this application uses native JavaScript ES Modules (`type="module"`), it must be served over an HTTP server (not opened via `file://`).

### Option 1: VS Code Live Server Extension (Recommended)
1. Open the project folder (`Attendance_management_system`) in VS Code.
2. Install the **Live Server** extension by Rita Wickramasinghe (if not already installed).
3. Right-click on `index.html` and select **Open with Live Server** (or click **Go Live** at the bottom status bar).
4. The web application will launch in your browser at `http://127.0.0.1:5500/index.html`.

### Option 2: Any Local HTTP Server
Alternatively, use Python, Node, or PHP local HTTP server:
```bash
# Using Python 3
python -m http.server 8000

# Or using npx serve
npx serve .
```
Then navigate to `http://localhost:8000/index.html`.

---

## 🌱 Loading Demo / Sample Data

The application includes a built-in one-time database setup generator (`seed.html`):

1. Open `http://localhost:8000/seed.html` (or click **Database Setup & Demo Data Generator** on the home page).
2. Click **▶️ Seed Users & Subjects** (Step 1):
   - Creates Teacher: **Prof. Anjali Sharma** (`email: teacher@college.edu`, `username: anjali`, `password: teacher123`).
   - Creates 10 Students: **Roll Nos 101 to 110** (`password: pass123`).
   - Creates 2 Subjects: **Data Structures** (10 students enrolled) and **Database Management** (8 students enrolled).
3. Click **▶️ Seed Lectures & Attendance Data** (Step 2):
   - Creates 12 closed past lectures across the last 12 days.
   - Populates attendance records where students `109` & `110` have low attendance (<75%) for testing warnings and reports.

---

## 🔐 Credentials

| Role | Username / Email / Roll No | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Teacher** | `teacher@college.edu` *or* `anjali` | `teacher123` | Professor Anjali Sharma |
| **Student** | `101` (Roll No) *or* `student101` | `pass123` | Aarav Sharma (Good Attendance) |
| **Student** | `109` (Roll No) *or* `student109` | `pass123` | Isha Roy (Low Attendance <75%) |
| **Student** | `110` (Roll No) *or* `student110` | `pass123` | Jay Malhotra (Low Attendance <75%) |

---

## 🐛 Bugs Found & Fixed During Review

1. **Session Isolation across Dual Tabs**:
   - *Issue*: Logging in as a teacher in one tab and a student in another tab could overwrite single `localStorage` session state.
   - *Fix*: Switched session management in `app.js` to `sessionStorage` (`getSession()`, `setSession()`). Now teacher and student sessions can be opened simultaneously in different browser tabs/windows.
2. **Firestore Composite Index Prevention**:
   - *Issue*: Combining inequalities with sorting (e.g. `where('date', '>=', start)` with `orderBy('date')`) triggers composite index requirements in Firestore.
   - *Fix*: Audited all queries across all files to strictly use equality (`==`) or `array-contains` filters. All date, numeric roll number, and timestamp sorting are performed deterministically in memory via JavaScript.
3. **Mobile Screen Width Overflow (375px)**:
   - *Issue*: Long topbar titles and data tables could expand the viewport horizontally on small screens.
   - *Fix*: Added `overflow-x: hidden` to root layout containers, applied text truncation (`text-overflow: ellipsis`) to `topbar-title`, and wrapped all data tables inside `.table-responsive` containers.
4. **Duplicate Attendance Marking Prevention**:
   - *Issue*: Rapid clicking or network latency could allow double marking before button state updated.
   - *Fix*: Implemented fixed attendance document IDs (`{lectureId}_{studentId}`) inside a Firestore `runTransaction()` check. Attempting duplicate writes triggers a controlled error that is displayed gracefully as a toast.
5. **Absentee Batch Recording**:
   - *Issue*: Unmarked students remained unrecorded when a lecture ended.
   - *Fix*: Updated `stopLecture()` to first lock the lecture status to `closed`, then query unmarked enrolled students, and execute a `writeBatch()` recording status `absent` for all missing students.
