/* =========================================================
   ClassPilot — app.js (Firebase edition)
   Auth: Firebase Authentication (email/password)
   Data: Cloud Firestore, real-time via onSnapshot
   ========================================================= */

import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, where
} from "firebase/firestore";
import { firebaseConfig, TEACHER_ACCESS_CODE } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------------------------------------------------
   State
   --------------------------------------------------------- */
let profile = null;         // { uid, name, role, email, studentId?, subjectArea? }
let classesCache = [];
let studentsCache = [];
let unsubClasses = null;
let unsubStudents = null;
let currentPageId = null;

/* ---------------------------------------------------------
   Small helpers
   --------------------------------------------------------- */
function initials(name) {
  return (name || "?").split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}
function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso || "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
function sortedClasses() {
  return [...classesCache].sort((a, b) =>
    (a.subject || "").localeCompare(b.subject || "") || (a.lessonNumber || 0) - (b.lessonNumber || 0));
}
function friendlyAuthError(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
    "auth/invalid-email": "That email address doesn't look valid.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error — check your internet connection."
  };
  return map[code] || (err && err.message) || "Something went wrong. Please try again.";
}

/* ---------------------------------------------------------
   Toasts
   --------------------------------------------------------- */
function toast(msg, isErr) {
  const stack = document.getElementById("toastStack");
  const el = document.createElement("div");
  el.className = "toast" + (isErr ? " err" : "");
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ---------------------------------------------------------
   Auth-page (login/register) wiring
   --------------------------------------------------------- */
let regRole = "student";

function initAuthPage() {
  document.getElementById("showRegisterLink").addEventListener("click", () => switchAuthCard("register"));
  document.getElementById("showLoginLink").addEventListener("click", () => switchAuthCard("login"));

  document.getElementById("pwToggle").addEventListener("click", () => togglePw("loginPassword", "pwToggle"));
  document.getElementById("regPwToggle").addEventListener("click", () => togglePw("regPassword", "regPwToggle"));

  const roleBtns = document.querySelectorAll(".reg-role-toggle button");
  roleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      roleBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      regRole = btn.dataset.role;
      document.getElementById("regStudentField").classList.toggle("hidden", regRole !== "student");
      document.getElementById("regTeacherField").classList.toggle("hidden", regRole !== "teacher");
    });
  });

  document.getElementById("loginForm").addEventListener("submit", onLoginSubmit);
  document.getElementById("registerForm").addEventListener("submit", onRegisterSubmit);
}

function togglePw(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "Hide" : "Show";
}

function switchAuthCard(which) {
  document.getElementById("loginCard").classList.toggle("active", which === "login");
  document.getElementById("registerCard").classList.toggle("active", which === "register");
  document.getElementById("loginError").classList.remove("show");
  document.getElementById("registerError").classList.remove("show");
}

async function onLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errBox = document.getElementById("loginError");
  const submitBtn = e.target.querySelector("button[type=submit]");

  errBox.classList.remove("show");
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged picks it up from here
  } catch (err) {
    errBox.textContent = friendlyAuthError(err);
    errBox.classList.add("show");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log In";
  }
}

async function onRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const studentId = document.getElementById("regStudentId").value.trim();
  const teacherCode = document.getElementById("regTeacherCode").value.trim();
  const errBox = document.getElementById("registerError");
  const submitBtn = e.target.querySelector("button[type=submit]");

  errBox.classList.remove("show");

  if (regRole === "teacher" && teacherCode !== TEACHER_ACCESS_CODE) {
    errBox.textContent = "That teacher access code is incorrect.";
    errBox.classList.add("show");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userDoc = {
      name,
      email,
      role: regRole,
      createdAt: Date.now()
    };
    if (regRole === "student") {
      userDoc.studentId = studentId || ("CP-" + cred.user.uid.slice(0, 4).toUpperCase());
    } else {
      userDoc.subjectArea = "Teacher";
    }
    await setDoc(doc(db, "users", cred.user.uid), userDoc);
    // onAuthStateChanged picks it up from here
  } catch (err) {
    errBox.textContent = friendlyAuthError(err);
    errBox.classList.add("show");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  }
}

/* ---------------------------------------------------------
   Boot / auth state
   --------------------------------------------------------- */
function showLoading(show) {
  document.getElementById("loadingScreen").classList.toggle("hidden", !show);
}

onAuthStateChanged(auth, async (user) => {
  showLoading(true);
  teardownListeners();

  if (!user) {
    profile = null;
    showApp(false);
    resetAuthForms();
    showLoading(false);
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      toast("Your profile could not be found. Please try registering again.", true);
      await signOut(auth);
      showLoading(false);
      return;
    }
    profile = { uid: user.uid, ...snap.data() };
    showApp(true);
    subscribeToClasses();
    if (profile.role === "teacher") subscribeToStudents();
    renderSidebar();
    renderTopbar();
    goTo(profile.role === "teacher" ? "t-home" : "s-home");
  } catch (err) {
    toast(friendlyAuthError(err), true);
  } finally {
    showLoading(false);
  }
});

function teardownListeners() {
  if (unsubClasses) { unsubClasses(); unsubClasses = null; }
  if (unsubStudents) { unsubStudents(); unsubStudents = null; }
}

function subscribeToClasses() {
  unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
    classesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (currentPageId) renderCurrentPage();
  }, (err) => toast(friendlyAuthError(err), true));
}

function subscribeToStudents() {
  const q = query(collection(db, "users"), where("role", "==", "student"));
  unsubStudents = onSnapshot(q, (snap) => {
    studentsCache = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    if (currentPageId === "t-home" || currentPageId === "t-students") renderCurrentPage();
  }, (err) => toast(friendlyAuthError(err), true));
}

function showApp(loggedIn) {
  document.getElementById("authPage").classList.toggle("hidden", loggedIn);
  document.getElementById("app").classList.toggle("hidden", !loggedIn);
}

function resetAuthForms() {
  document.getElementById("loginForm").reset();
  document.getElementById("registerForm").reset();
  document.getElementById("loginError").classList.remove("show");
  document.getElementById("registerError").classList.remove("show");
  switchAuthCard("login");
  document.getElementById("loginPassword").type = "password";
  document.getElementById("pwToggle").textContent = "Show";
  document.getElementById("regPassword").type = "password";
  document.getElementById("regPwToggle").textContent = "Show";
  regRole = "student";
  document.querySelectorAll(".reg-role-toggle button").forEach(b =>
    b.classList.toggle("active", b.dataset.role === "student"));
  document.getElementById("regStudentField").classList.remove("hidden");
  document.getElementById("regTeacherField").classList.add("hidden");

  // form.reset() only restores input values, not buttons we disabled/
  // relabelled via JS while a request was in flight — reset those too.
  const loginBtn = document.querySelector("#loginForm button[type=submit]");
  loginBtn.disabled = false;
  loginBtn.textContent = "Log In";
  const regBtn = document.querySelector("#registerForm button[type=submit]");
  regBtn.disabled = false;
  regBtn.textContent = "Create Account";
}

async function logout() {
  await signOut(auth);
}

/* ---------------------------------------------------------
   Sidebar / topbar / navigation
   --------------------------------------------------------- */
const TEACHER_NAV = [
  { id: "t-home", label: "Dashboard Home", icon: "home" },
  { id: "t-add", label: "Add Class", icon: "plus" },
  { id: "t-manage", label: "Manage Classes", icon: "list" },
  { id: "t-students", label: "Student List", icon: "users" },
  { id: "t-profile", label: "Profile", icon: "user" }
];
const STUDENT_NAV = [
  { id: "s-home", label: "Dashboard Home", icon: "home" },
  { id: "s-classes", label: "My Classes", icon: "list" },
  { id: "s-profile", label: "Profile", icon: "user" }
];
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 14.2c2.9.4 5 2.6 5 5.8"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'
};
function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}
function logoSvg() {
  return `<svg viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9.5" stroke="rgba(240,168,58,0.4)" stroke-width="1"/>
    <g class="needle"><path d="M12 4.5 L14.4 12 L12 19.5 L9.6 12 Z" fill="#F0A83A"/></g>
    <circle cx="12" cy="12" r="1.6" fill="#0A1220" stroke="#F0A83A" stroke-width="1"/>
  </svg>`;
}

function renderSidebar() {
  const nav = profile.role === "teacher" ? TEACHER_NAV : STUDENT_NAV;
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = `
    <div class="brand">
      <span class="mark">${logoSvg()}</span>
      <div><div class="brand-name">ClassPilot</div><div class="brand-tag">Learn. Connect. Progress.</div></div>
    </div>
    <div class="nav-group">
      <div class="nav-label">${profile.role === "teacher" ? "Teacher Panel" : "Student Panel"}</div>
      ${nav.map(n => `<button class="nav-item" data-target="${n.id}">${iconSvg(n.icon)}<span>${n.label}</span></button>`).join("")}
    </div>
    <div class="sidebar-foot">
      <div class="sidebar-user">
        <div class="avatar">${initials(profile.name)}</div>
        <div class="sidebar-user-info">
          <b>${escapeHtml(profile.name)}</b>
          <span>${profile.role === "teacher" ? "Teacher" : escapeHtml(profile.studentId || "Student")}</span>
        </div>
      </div>
      <button class="nav-item" id="logoutBtn" style="margin-top:8px;">${iconSvg("logout")}<span>Log Out</span></button>
    </div>
  `;
  sidebar.querySelectorAll(".nav-item[data-target]").forEach(btn => {
    btn.addEventListener("click", () => { goTo(btn.dataset.target); closeMobileSidebar(); });
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);
}

function renderTopbar() {
  document.getElementById("topbarBadge").innerHTML =
    `<span class="badge ${profile.role === "teacher" ? "badge-teacher" : "badge-student"}">${profile.role}</span>`;
}

const PAGE_META = {
  "t-home": { title: "Dashboard", sub: "A quick look at your classroom activity." },
  "t-add": { title: "Add Class", sub: "Publish a new class video for your students." },
  "t-manage": { title: "Manage Classes", sub: "Edit or remove classes you have published." },
  "t-students": { title: "Student List", sub: "All students registered on ClassPilot." },
  "t-profile": { title: "My Profile", sub: "Your teacher account details." },
  "s-home": { title: "Dashboard", sub: "Welcome back — here is what is new." },
  "s-classes": { title: "My Classes", sub: "Every class currently available to you." },
  "s-profile": { title: "My Profile", sub: "Your student account details." }
};

function goTo(pageId, param) {
  if (!profile) return;
  const isTeacherPage = pageId.startsWith("t-");
  const isStudentPage = pageId.startsWith("s-");
  if (isTeacherPage && profile.role !== "teacher") { toast("That section is for teachers only.", true); return goTo("s-home"); }
  if (isStudentPage && profile.role !== "student") { toast("That section is for students only.", true); return goTo("t-home"); }

  currentPageId = pageId;
  currentPageParam = param;

  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.getElementById(pageId)?.classList.add("active");
  document.querySelectorAll(".nav-item[data-target]").forEach(b => b.classList.toggle("active", b.dataset.target === pageId));

  const meta = PAGE_META[pageId] || { title: "ClassPilot", sub: "" };
  document.getElementById("topbarTitle").textContent = meta.title;
  document.getElementById("topbarSub").textContent = meta.sub;

  renderCurrentPage();
}

let currentPageParam = null;

function renderCurrentPage() {
  const renderers = {
    "t-home": renderTeacherHome, "t-add": renderAddClassForm, "t-manage": renderManageClasses,
    "t-students": renderStudentList, "t-profile": renderTeacherProfile,
    "s-home": renderStudentHome, "s-classes": renderStudentClasses, "s-profile": renderStudentProfile
  };
  if (renderers[currentPageId]) renderers[currentPageId](currentPageParam);
}

/* ---------------------------------------------------------
   Teacher views
   --------------------------------------------------------- */
function renderTeacherHome() {
  const classes = sortedClasses();
  const recent = [...classes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  document.getElementById("t-home").innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><b>${studentsCache.length}</b><span>Total Students</span></div>
      <div class="stat-card"><b>${classes.length}</b><span>Total Classes</span></div>
      <div class="stat-card"><b>${new Set(classes.map(c => c.subject)).size}</b><span>Subjects</span></div>
      <div class="stat-card"><b>${recent.length ? formatDate(recent[0].date) : "—"}</b><span>Last Published</span></div>
    </div>
    <div class="section-head">
      <div><h2>Recently added classes</h2><p>The last classes published, most recent first.</p></div>
      <button class="btn btn-primary btn-sm" id="quickAddBtn">${iconSvg("plus")}Add Class</button>
    </div>
    ${classCardGrid(recent, "teacher")}
  `;
  document.getElementById("quickAddBtn")?.addEventListener("click", () => goTo("t-add"));
  bindClassCardActions("t-home");
}

function renderAddClassForm(editId) {
  const editing = editId ? classesCache.find(c => c.id === editId) : null;
  document.getElementById("t-add").innerHTML = `
    <div class="form-card">
      <h2 style="font-size:16px; margin-bottom:4px;">${editing ? "Edit Class" : "Add a New Class"}</h2>
      <p style="font-size:13px; color:var(--ink-500); margin-bottom:20px;">
        ${editing ? "Update the details or Google Drive link below." : "Fill in the details, paste the Google Drive link, and save."}
      </p>
      <form id="classForm">
        <div class="form-grid">
          <div class="field"><label>Lesson Number</label><input type="number" min="1" id="f-lesson" required value="${editing ? editing.lessonNumber : ""}"></div>
          <div class="field"><label>Date</label><input type="date" id="f-date" required value="${editing ? editing.date : ""}"></div>
          <div class="field full"><label>Class Title</label><input type="text" id="f-title" placeholder="e.g. Introduction to Normal Forms" required value="${editing ? escapeHtml(editing.title) : ""}"></div>
          <div class="field full"><label>Subject</label><input type="text" id="f-subject" placeholder="e.g. Database Systems" required value="${editing ? escapeHtml(editing.subject) : ""}"></div>
          <div class="field full"><label>Short Description</label><textarea id="f-desc" placeholder="What will students learn in this class?" required>${editing ? escapeHtml(editing.description) : ""}</textarea></div>
          <div class="field full"><label>Google Drive Video Link</label><input type="url" id="f-link" placeholder="https://drive.google.com/file/d/..." required value="${editing ? escapeHtml(editing.driveLink) : ""}"></div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editing ? "Save Changes" : "Save Class"}</button>
          <button type="button" class="btn btn-ghost" id="cancelFormBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById("cancelFormBtn").addEventListener("click", () => goTo(editing ? "t-manage" : "t-home"));
  document.getElementById("classForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button[type=submit]");
    const data = {
      lessonNumber: parseInt(document.getElementById("f-lesson").value, 10),
      date: document.getElementById("f-date").value,
      title: document.getElementById("f-title").value.trim(),
      subject: document.getElementById("f-subject").value.trim(),
      description: document.getElementById("f-desc").value.trim(),
      driveLink: document.getElementById("f-link").value.trim()
    };
    submitBtn.disabled = true;
    try {
      if (editing) {
        await updateDoc(doc(db, "classes", editing.id), data);
        toast("Class updated successfully.");
      } else {
        data.createdBy = profile.uid;
        data.createdAt = Date.now();
        await addDoc(collection(db, "classes"), data);
        toast("Class added successfully.");
      }
      goTo("t-manage");
    } catch (err) {
      toast(friendlyAuthError(err), true);
      submitBtn.disabled = false;
    }
  });
}

function renderManageClasses() {
  const classes = sortedClasses();
  document.getElementById("t-manage").innerHTML = `
    <div class="steps-card">
      <h3>How to publish a class in 4 steps</h3>
      <p class="lead">Videos stay in Google Drive — ClassPilot only stores the link.</p>
      <div class="steps-list">
        <div class="step-item"><span class="step-num">01</span><p>Upload the class recording to Google Drive.</p></div>
        <div class="step-item"><span class="step-num">02</span><p>Set sharing to "Anyone with the link — Viewer".</p></div>
        <div class="step-item"><span class="step-num">03</span><p>Copy the sharing link from Drive.</p></div>
        <div class="step-item"><span class="step-num">04</span><p>Paste it into Add Class and save.</p></div>
      </div>
    </div>
    <div class="section-head">
      <div><h2>All classes (${classes.length})</h2><p>Organised by subject, then lesson number.</p></div>
      <button class="btn btn-primary btn-sm" id="mAddBtn">${iconSvg("plus")}Add Class</button>
    </div>
    ${classes.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Lesson</th><th>Class</th><th>Subject</th><th>Date</th><th>Drive Link</th><th></th></tr></thead>
        <tbody>
          ${classes.map(c => `
            <tr>
              <td style="font-family:var(--font-mono);">#${c.lessonNumber}</td>
              <td>
                <div class="cell-title">${escapeHtml(c.title)}</div>
                <div class="cell-sub">${escapeHtml((c.description || "").slice(0, 60))}${(c.description || "").length > 60 ? "…" : ""}</div>
              </td>
              <td><span class="subject-chip">${escapeHtml(c.subject)}</span></td>
              <td>${formatDate(c.date)}</td>
              <td><a href="${escapeHtml(c.driveLink)}" target="_blank" rel="noopener" style="color:var(--sky-500); font-size:12.5px;">Open link ↗</a></td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost btn-sm" data-view="${c.id}">View</button>
                  <button class="btn btn-ghost btn-sm" data-edit="${c.id}">Edit</button>
                  <button class="btn btn-danger btn-sm" data-del="${c.id}">Delete</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>` : emptyState("No classes yet", "Add your first class to see it listed here.")}
  `;
  document.getElementById("mAddBtn").addEventListener("click", () => goTo("t-add"));
  document.getElementById("t-manage").querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => goTo("t-add", b.dataset.edit)));
  document.getElementById("t-manage").querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => showClassDetails(b.dataset.view)));
  document.getElementById("t-manage").querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => confirmDeleteClass(b.dataset.del)));
}

function confirmDeleteClass(classId) {
  const cls = classesCache.find(c => c.id === classId);
  if (!cls) return;
  showModal({
    title: "Delete this class?",
    body: `"${escapeHtml(cls.title)}" will be permanently removed and students will no longer see it. This cannot be undone.`,
    confirmLabel: "Delete Class",
    danger: true,
    onConfirm: async () => {
      try {
        await deleteDoc(doc(db, "classes", classId));
        toast("Class deleted.");
        goTo("t-manage");
      } catch (err) {
        toast(friendlyAuthError(err), true);
      }
    }
  });
}

function renderStudentList() {
  const students = [...studentsCache].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  document.getElementById("t-students").innerHTML = `
    <div class="section-head"><div><h2>Registered students (${students.length})</h2><p>Everyone who has signed up as a student.</p></div></div>
    ${students.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Student</th><th>Student ID</th><th>Email</th></tr></thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td style="display:flex; align-items:center; gap:10px;">
                <div class="avatar" style="width:28px;height:28px;font-size:11px;">${initials(s.name)}</div>
                <span class="cell-title">${escapeHtml(s.name)}</span>
              </td>
              <td style="font-family:var(--font-mono);">${escapeHtml(s.studentId || "—")}</td>
              <td>${escapeHtml(s.email)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>` : emptyState("No students yet", "Students will appear here once they register.")}
  `;
}

function renderTeacherProfile() {
  document.getElementById("t-profile").innerHTML = `
    <div class="profile-card">
      <div class="profile-head">
        <div class="avatar-lg">${initials(profile.name)}</div>
        <div><h2 style="font-size:18px;">${escapeHtml(profile.name)}</h2><span class="badge badge-teacher" style="margin-top:6px;">Teacher</span></div>
      </div>
      <div class="profile-row"><span>Email</span><span>${escapeHtml(profile.email)}</span></div>
      <div class="profile-row"><span>Classes published</span><span>${classesCache.length}</span></div>
      <div class="profile-row"><span>Registered students</span><span>${studentsCache.length}</span></div>
    </div>
  `;
}

/* ---------------------------------------------------------
   Student views
   --------------------------------------------------------- */
function renderStudentHome() {
  const classes = sortedClasses();
  const recent = [...classes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  document.getElementById("s-home").innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><b>${classes.length}</b><span>Available Classes</span></div>
      <div class="stat-card"><b>${new Set(classes.map(c => c.subject)).size}</b><span>Subjects</span></div>
      <div class="stat-card"><b>${recent.length ? formatDate(recent[0].date) : "—"}</b><span>Newest Upload</span></div>
    </div>
    <div class="section-head"><div><h2>Welcome back, ${escapeHtml((profile.name || "").split(" ")[0])} 👋</h2><p>Here are the most recently added classes.</p></div></div>
    ${classCardGrid(recent, "student")}
  `;
  bindClassCardActions("s-home");
}

function renderStudentClasses() {
  const classes = sortedClasses();
  document.getElementById("s-classes").innerHTML = `
    <div class="section-head"><div><h2>All classes (${classes.length})</h2><p>Grouped by subject and lesson order.</p></div></div>
    ${classCardGrid(classes, "student")}
  `;
  bindClassCardActions("s-classes");
}

function renderStudentProfile() {
  document.getElementById("s-profile").innerHTML = `
    <div class="profile-card">
      <div class="profile-head">
        <div class="avatar-lg">${initials(profile.name)}</div>
        <div><h2 style="font-size:18px;">${escapeHtml(profile.name)}</h2><span class="badge badge-student" style="margin-top:6px;">Student</span></div>
      </div>
      <div class="profile-row"><span>Student ID</span><span>${escapeHtml(profile.studentId || "—")}</span></div>
      <div class="profile-row"><span>Email</span><span>${escapeHtml(profile.email)}</span></div>
      <div class="profile-row"><span>Classes available</span><span>${classesCache.length}</span></div>
    </div>
  `;
}

/* ---------------------------------------------------------
   Shared: class cards + modal
   --------------------------------------------------------- */
function classCardGrid(classes, role) {
  if (!classes.length) return emptyState("No classes yet", role === "teacher" ? "Add your first class to get started." : "Your teacher has not published any classes yet.");
  return `<div class="class-grid">
    ${classes.map(c => `
      <div class="class-card">
        <div class="class-card-top">
          <span class="lesson-tag">LESSON ${String(c.lessonNumber).padStart(2, "0")}</span>
          <span class="lesson-tag">${formatDate(c.date)}</span>
        </div>
        <div class="class-card-body">
          <span class="subject-chip">${escapeHtml(c.subject)}</span>
          <h3>${escapeHtml(c.title)}</h3>
          <p class="class-desc">${escapeHtml(c.description)}</p>
        </div>
        <div class="class-card-foot">
          ${role === "teacher" ? `
            <button class="btn btn-ghost btn-sm" data-view="${c.id}">Details</button>
            <button class="btn btn-ghost btn-sm" data-edit="${c.id}">Edit</button>
          ` : `<button class="btn btn-primary btn-sm" data-watch="${c.id}">▶ Watch Class</button>`}
        </div>
      </div>
    `).join("")}
  </div>`;
}
function emptyState(title, sub) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>
    <p><strong>${title}</strong></p><p>${sub}</p>
  </div>`;
}
function bindClassCardActions(containerId) {
  const root = document.getElementById(containerId);
  root.querySelectorAll("[data-watch]").forEach(b => b.addEventListener("click", () => watchClass(b.dataset.watch)));
  root.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => showClassDetails(b.dataset.view)));
  root.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => goTo("t-add", b.dataset.edit)));
}
function watchClass(classId) {
  const c = classesCache.find(x => x.id === classId);
  if (!c) return;
  window.open(c.driveLink, "_blank", "noopener");
  toast(`Opening "${c.title}" in a new tab…`);
}
function showClassDetails(classId) {
  const c = classesCache.find(x => x.id === classId);
  if (!c) return;
  showModal({
    title: c.title,
    body: `
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:6px;">
        <div class="profile-row"><span>Lesson</span><span>#${c.lessonNumber}</span></div>
        <div class="profile-row"><span>Subject</span><span>${escapeHtml(c.subject)}</span></div>
        <div class="profile-row"><span>Date</span><span>${formatDate(c.date)}</span></div>
        <div class="profile-row" style="border-bottom:none;"><span>Description</span><span style="text-align:right; max-width:220px;">${escapeHtml(c.description)}</span></div>
      </div>`,
    confirmLabel: profile.role === "student" ? "Watch Class" : "Close",
    onConfirm: profile.role === "student" ? () => watchClass(c.id) : null
  });
}
function showModal({ title, body, confirmLabel, cancelLabel = "Cancel", danger = false, onConfirm }) {
  document.querySelector(".modal-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h3>${title}</h3>
      <div style="margin-bottom:20px;">${typeof body === "string" ? `<p>${body}</p>` : ""}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modalCancel">${cancelLabel}</button>
        ${confirmLabel ? `<button class="btn ${danger ? "btn-danger" : "btn-primary"} btn-sm" id="modalConfirm">${confirmLabel}</button>` : ""}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector("#modalConfirm")?.addEventListener("click", () => { overlay.remove(); onConfirm && onConfirm(); });
}

/* ---------------------------------------------------------
   Mobile sidebar
   --------------------------------------------------------- */
function closeMobileSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarScrim").classList.remove("show");
}
function initMobileNav() {
  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebarScrim").classList.add("show");
  });
  document.getElementById("sidebarScrim").addEventListener("click", closeMobileSidebar);
}

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initAuthPage();
  initMobileNav();
});
