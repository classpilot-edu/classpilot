/* =========================================================
   ClassPilot — script.js
   All app logic: seed data, auth, navigation, CRUD.
   Storage: localStorage only (no backend), keys prefixed cp_
   ========================================================= */

const CP_KEYS = {
  users: 'cp_users',
  classes: 'cp_classes',
  session: 'cp_session'
};

/* ---------------------------------------------------------
   1. SEED DATA — created once, on first load only
   --------------------------------------------------------- */
function seedIfNeeded() {
  if (!localStorage.getItem(CP_KEYS.users)) {
    const users = [
      { id: 'u-teacher', username: 'teacher', password: 'teacher123', role: 'teacher',
        name: 'Dr. Amara Fernando', subjectArea: 'Computer Science Faculty', email: 'amara.fernando@classpilot.edu' },
      { id: 'u1', username: 'student1', password: 'student123', role: 'student', name: 'Nadeesha Perera', studentId: 'CP-101', email: 'nadeesha.p@classpilot.edu' },
      { id: 'u2', username: 'student2', password: 'student123', role: 'student', name: 'Kavindu Silva', studentId: 'CP-102', email: 'kavindu.s@classpilot.edu' },
      { id: 'u3', username: 'student3', password: 'student123', role: 'student', name: 'Thareendya Jayasuriya', studentId: 'CP-103', email: 'thareendya.j@classpilot.edu' },
      { id: 'u4', username: 'student4', password: 'student123', role: 'student', name: 'Ishara Wickramasinghe', studentId: 'CP-104', email: 'ishara.w@classpilot.edu' },
      { id: 'u5', username: 'student5', password: 'student123', role: 'student', name: 'Ruwanthika Dias', studentId: 'CP-105', email: 'ruwanthika.d@classpilot.edu' },
      { id: 'u6', username: 'student6', password: 'student123', role: 'student', name: 'Sahan Gunawardena', studentId: 'CP-106', email: 'sahan.g@classpilot.edu' },
      { id: 'u7', username: 'student7', password: 'student123', role: 'student', name: 'Dilki Rathnayake', studentId: 'CP-107', email: 'dilki.r@classpilot.edu' },
      { id: 'u8', username: 'student8', password: 'student123', role: 'student', name: 'Chamod Weerasinghe', studentId: 'CP-108', email: 'chamod.w@classpilot.edu' },
      { id: 'u9', username: 'student9', password: 'student123', role: 'student', name: 'Yasodha Bandara', studentId: 'CP-109', email: 'yasodha.b@classpilot.edu' },
      { id: 'u10', username: 'student10', password: 'student123', role: 'student', name: 'Malith Karunaratne', studentId: 'CP-110', email: 'malith.k@classpilot.edu' }
    ];
    localStorage.setItem(CP_KEYS.users, JSON.stringify(users));
  }

  if (!localStorage.getItem(CP_KEYS.classes)) {
    const classes = [
      { id: 'c1', lessonNumber: 1, title: 'Introduction to Databases', subject: 'Database Systems',
        description: 'Overview of relational databases, keys, and basic SQL syntax.',
        driveLink: 'https://drive.google.com/file/d/EXAMPLE_ID_1/view?usp=sharing', date: '2026-07-01' },
      { id: 'c2', lessonNumber: 2, title: 'Normalization Deep Dive', subject: 'Database Systems',
        description: 'Working through 1NF, 2NF, and 3NF with worked examples.',
        driveLink: 'https://drive.google.com/file/d/EXAMPLE_ID_2/view?usp=sharing', date: '2026-07-08' },
      { id: 'c3', lessonNumber: 1, title: 'OOP Fundamentals in Python', subject: 'Object Oriented Programming',
        description: 'Classes, objects, constructors, and encapsulation basics.',
        driveLink: 'https://drive.google.com/file/d/EXAMPLE_ID_3/view?usp=sharing', date: '2026-07-03' },
      { id: 'c4', lessonNumber: 2, title: 'Inheritance and Polymorphism', subject: 'Object Oriented Programming',
        description: 'How subclasses extend behaviour, with a mini case study.',
        driveLink: 'https://drive.google.com/file/d/EXAMPLE_ID_4/view?usp=sharing', date: '2026-07-10' },
      { id: 'c5', lessonNumber: 1, title: 'Estimation with Function Points', subject: 'Software Project Management',
        description: 'Counting function points and converting to effort estimates.',
        driveLink: 'https://drive.google.com/file/d/EXAMPLE_ID_5/view?usp=sharing', date: '2026-07-05' }
    ];
    localStorage.setItem(CP_KEYS.classes, JSON.stringify(classes));
  }
}

/* ---------------------------------------------------------
   2. Storage helpers
   --------------------------------------------------------- */
const getUsers = () => JSON.parse(localStorage.getItem(CP_KEYS.users) || '[]');
const saveUsers = (u) => localStorage.setItem(CP_KEYS.users, JSON.stringify(u));
const getClasses = () => JSON.parse(localStorage.getItem(CP_KEYS.classes) || '[]')
  .sort((a, b) => a.subject.localeCompare(b.subject) || a.lessonNumber - b.lessonNumber);
const saveClasses = (c) => localStorage.setItem(CP_KEYS.classes, JSON.stringify(c));
const getSession = () => JSON.parse(localStorage.getItem(CP_KEYS.session) || 'null');
const setSession = (s) => localStorage.setItem(CP_KEYS.session, JSON.stringify(s));
const clearSession = () => localStorage.removeItem(CP_KEYS.session);

function currentUser() {
  const s = getSession();
  if (!s) return null;
  return getUsers().find(u => u.id === s.userId) || null;
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* ---------------------------------------------------------
   3. Toasts
   --------------------------------------------------------- */
function toast(msg, isErr) {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ---------------------------------------------------------
   4. AUTH
   --------------------------------------------------------- */
let selectedRole = 'student';

function initLoginPage() {
  const roleBtns = document.querySelectorAll('.role-toggle button');
  roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      roleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRole = btn.dataset.role;
    });
  });

  document.getElementById('pwToggle').addEventListener('click', () => {
    const input = document.getElementById('loginPassword');
    const btn = document.getElementById('pwToggle');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
  });

  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const errBox = document.getElementById('loginError');

    const user = getUsers().find(u => u.username.toLowerCase() === username && u.password === password);

    if (!user) {
      errBox.textContent = 'Incorrect username or password. Please try again.';
      errBox.classList.add('show');
      return;
    }
    if (user.role !== selectedRole) {
      errBox.textContent = `That account is registered as a ${user.role}. Switch the tab above to "${user.role === 'teacher' ? 'Teacher' : 'Student'}" and sign in again.`;
      errBox.classList.add('show');
      return;
    }
    errBox.classList.remove('show');
    setSession({ userId: user.id, role: user.role });
    boot();
  });
}

function logout() {
  clearSession();
  boot();
}

/* ---------------------------------------------------------
   5. APP SHELL RENDER
   --------------------------------------------------------- */
function boot() {
  const user = currentUser();
  const loginPage = document.getElementById('loginPage');
  const app = document.getElementById('app');

  if (!user) {
    app.classList.add('hidden');
    loginPage.classList.remove('hidden');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.remove('show');
    document.getElementById('loginPassword').type = 'password';
    document.getElementById('pwToggle').textContent = 'Show';
    selectedRole = 'student';
    document.querySelectorAll('.role-toggle button').forEach(b =>
      b.classList.toggle('active', b.dataset.role === 'student'));
    return;
  }

  loginPage.classList.add('hidden');
  app.classList.remove('hidden');

  renderSidebar(user);
  renderTopbar(user);

  if (user.role === 'teacher') {
    goTo('t-home');
  } else {
    goTo('s-home');
  }
}

const TEACHER_NAV = [
  { id: 't-home', label: 'Dashboard Home', icon: 'home' },
  { id: 't-add', label: 'Add Class', icon: 'plus' },
  { id: 't-manage', label: 'Manage Classes', icon: 'list' },
  { id: 't-students', label: 'Student List', icon: 'users' },
  { id: 't-profile', label: 'Profile', icon: 'user' }
];
const STUDENT_NAV = [
  { id: 's-home', label: 'Dashboard Home', icon: 'home' },
  { id: 's-classes', label: 'My Classes', icon: 'list' },
  { id: 's-profile', label: 'Profile', icon: 'user' }
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
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

function renderSidebar(user) {
  const nav = user.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="brand">
      <span class="mark">${logoSvg()}</span>
      <div>
        <div class="brand-name">ClassPilot</div>
        <div class="brand-tag">Learn. Connect. Progress.</div>
      </div>
    </div>
    <div class="nav-group">
      <div class="nav-label">${user.role === 'teacher' ? 'Teacher Panel' : 'Student Panel'}</div>
      ${nav.map(n => `
        <button class="nav-item" data-target="${n.id}">
          ${iconSvg(n.icon)}<span>${n.label}</span>
        </button>`).join('')}
    </div>
    <div class="sidebar-foot">
      <div class="sidebar-user">
        <div class="avatar">${initials(user.name)}</div>
        <div class="sidebar-user-info">
          <b>${escapeHtml(user.name)}</b>
          <span>${user.role === 'teacher' ? 'Teacher' : escapeHtml(user.studentId || 'Student')}</span>
        </div>
      </div>
      <button class="nav-item" id="logoutBtn" style="margin-top:8px;">
        ${iconSvg('logout')}<span>Log Out</span>
      </button>
    </div>
  `;
  sidebar.querySelectorAll('.nav-item[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      goTo(btn.dataset.target);
      closeMobileSidebar();
    });
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

function logoSvg() {
  return `<svg viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9.5" stroke="rgba(240,168,58,0.4)" stroke-width="1"/>
    <g class="needle">
      <path d="M12 4.5 L14.4 12 L12 19.5 L9.6 12 Z" fill="#F0A83A"/>
    </g>
    <circle cx="12" cy="12" r="1.6" fill="#0A1220" stroke="#F0A83A" stroke-width="1"/>
  </svg>`;
}

const PAGE_META = {
  't-home': { title: 'Dashboard', sub: 'A quick look at your classroom activity.' },
  't-add': { title: 'Add Class', sub: 'Publish a new class video for your students.' },
  't-manage': { title: 'Manage Classes', sub: 'Edit or remove classes you have published.' },
  't-students': { title: 'Student List', sub: 'All students enrolled on ClassPilot.' },
  't-profile': { title: 'My Profile', sub: 'Your teacher account details.' },
  's-home': { title: 'Dashboard', sub: 'Welcome back — here is what is new.' },
  's-classes': { title: 'My Classes', sub: 'Every class currently available to you.' },
  's-profile': { title: 'My Profile', sub: 'Your student account details.' }
};

function renderTopbar(user) {
  document.getElementById('topbarBadge').innerHTML =
    `<span class="badge ${user.role === 'teacher' ? 'badge-teacher' : 'badge-student'}">${user.role}</span>`;
}

/* ---------------------------------------------------------
   6. NAVIGATION / ROLE GUARD
   --------------------------------------------------------- */
function goTo(pageId, param) {
  const user = currentUser();
  if (!user) return boot();

  const isTeacherPage = pageId.startsWith('t-');
  const isStudentPage = pageId.startsWith('s-');

  // Frontend role-based access control: redirect if not permitted
  if (isTeacherPage && user.role !== 'teacher') {
    toast('That section is for teachers only.', true);
    return goTo('s-home');
  }
  if (isStudentPage && user.role !== 'student') {
    toast('That section is for students only.', true);
    return goTo('t-home');
  }

  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item[data-target]').forEach(b => {
    b.classList.toggle('active', b.dataset.target === pageId);
  });

  const meta = PAGE_META[pageId] || { title: 'ClassPilot', sub: '' };
  document.getElementById('topbarTitle').textContent = meta.title;
  document.getElementById('topbarSub').textContent = meta.sub;

  const renderers = {
    't-home': renderTeacherHome, 't-add': renderAddClassForm, 't-manage': renderManageClasses,
    't-students': renderStudentList, 't-profile': renderTeacherProfile,
    's-home': renderStudentHome, 's-classes': renderStudentClasses, 's-profile': renderStudentProfile
  };
  if (renderers[pageId]) renderers[pageId](user, param);
}

/* ---------------------------------------------------------
   7. TEACHER VIEWS
   --------------------------------------------------------- */
function renderTeacherHome(user) {
  const classes = getClasses();
  const students = getUsers().filter(u => u.role === 'student');
  const recent = [...classes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

  document.getElementById('t-home').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><b>${students.length}</b><span>Total Students</span></div>
      <div class="stat-card"><b>${classes.length}</b><span>Total Classes</span></div>
      <div class="stat-card"><b>${new Set(classes.map(c => c.subject)).size}</b><span>Subjects</span></div>
      <div class="stat-card"><b>${recent.length ? formatDate(recent[0].date) : '—'}</b><span>Last Published</span></div>
    </div>
    <div class="section-head">
      <div><h2>Recently added classes</h2><p>The last classes you published, most recent first.</p></div>
      <button class="btn btn-primary btn-sm" id="quickAddBtn">${iconSvg('plus')}Add Class</button>
    </div>
    ${classCardGrid(recent, 'teacher')}
  `;
  document.getElementById('quickAddBtn')?.addEventListener('click', () => goTo('t-add'));
  bindClassCardActions('t-home', user);
}

function renderAddClassForm(user, editId) {
  const editing = editId ? getClasses().find(c => c.id === editId) : null;
  document.getElementById('t-add').innerHTML = `
    <div class="form-card">
      <h2 style="font-size:16px; margin-bottom:4px;">${editing ? 'Edit Class' : 'Add a New Class'}</h2>
      <p style="font-size:13px; color:var(--ink-500); margin-bottom:20px;">
        ${editing ? 'Update the details or Google Drive link below.' : 'Fill in the details, paste the Google Drive link, and save.'}
      </p>
      <form id="classForm">
        <div class="form-grid">
          <div class="field"><label>Lesson Number</label><input type="number" min="1" id="f-lesson" required value="${editing ? editing.lessonNumber : ''}"></div>
          <div class="field"><label>Date</label><input type="date" id="f-date" required value="${editing ? editing.date : ''}"></div>
          <div class="field full"><label>Class Title</label><input type="text" id="f-title" placeholder="e.g. Introduction to Normal Forms" required value="${editing ? escapeHtml(editing.title) : ''}"></div>
          <div class="field full"><label>Subject</label><input type="text" id="f-subject" placeholder="e.g. Database Systems" required value="${editing ? escapeHtml(editing.subject) : ''}"></div>
          <div class="field full"><label>Short Description</label><textarea id="f-desc" placeholder="What will students learn in this class?" required>${editing ? escapeHtml(editing.description) : ''}</textarea></div>
          <div class="field full"><label>Google Drive Video Link</label><input type="url" id="f-link" placeholder="https://drive.google.com/file/d/..." required value="${editing ? escapeHtml(editing.driveLink) : ''}"></div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Save Class'}</button>
          <button type="button" class="btn btn-ghost" id="cancelFormBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('cancelFormBtn').addEventListener('click', () => goTo(editing ? 't-manage' : 't-home'));
  document.getElementById('classForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      lessonNumber: parseInt(document.getElementById('f-lesson').value, 10),
      date: document.getElementById('f-date').value,
      title: document.getElementById('f-title').value.trim(),
      subject: document.getElementById('f-subject').value.trim(),
      description: document.getElementById('f-desc').value.trim(),
      driveLink: document.getElementById('f-link').value.trim()
    };
    const classes = getClasses();
    if (editing) {
      const idx = classes.findIndex(c => c.id === editing.id);
      classes[idx] = { ...classes[idx], ...data };
      saveClasses(classes);
      toast('Class updated successfully.');
      goTo('t-manage');
    } else {
      classes.push({ id: 'c-' + Date.now(), ...data });
      saveClasses(classes);
      toast('Class added successfully.');
      document.getElementById('classForm').reset();
      goTo('t-manage');
    }
  });
}

function renderManageClasses(user) {
  const classes = getClasses();
  document.getElementById('t-manage').innerHTML = `
    <div class="section-head">
      <div><h2>All classes (${classes.length})</h2><p>Organised by subject, then lesson number.</p></div>
      <button class="btn btn-primary btn-sm" id="mAddBtn">${iconSvg('plus')}Add Class</button>
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
                <div class="cell-sub">${escapeHtml(c.description).slice(0, 60)}${c.description.length > 60 ? '…' : ''}</div>
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
          `).join('')}
        </tbody>
      </table>
    </div>` : emptyState('No classes yet', 'Add your first class to see it listed here.')}
  `;
  document.getElementById('mAddBtn').addEventListener('click', () => goTo('t-add'));
  document.getElementById('t-manage').querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => goTo('t-add', b.dataset.edit)));
  document.getElementById('t-manage').querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => showClassDetails(b.dataset.view, user)));
  document.getElementById('t-manage').querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => confirmDeleteClass(b.dataset.del)));
}

function confirmDeleteClass(classId) {
  const cls = getClasses().find(c => c.id === classId);
  if (!cls) return;
  showModal({
    title: 'Delete this class?',
    body: `"${cls.title}" will be permanently removed and students will no longer see it. This cannot be undone.`,
    confirmLabel: 'Delete Class',
    danger: true,
    onConfirm: () => {
      saveClasses(getClasses().filter(c => c.id !== classId));
      toast('Class deleted.');
      goTo('t-manage');
    }
  });
}

function renderStudentList(user) {
  const students = getUsers().filter(u => u.role === 'student');
  document.getElementById('t-students').innerHTML = `
    <div class="section-head"><div><h2>Enrolled students (${students.length})</h2><p>Read-only roster for this class group.</p></div></div>
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
              <td style="font-family:var(--font-mono);">${escapeHtml(s.studentId)}</td>
              <td>${escapeHtml(s.email)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTeacherProfile(user) {
  document.getElementById('t-profile').innerHTML = `
    <div class="profile-card">
      <div class="profile-head">
        <div class="avatar-lg">${initials(user.name)}</div>
        <div>
          <h2 style="font-size:18px;">${escapeHtml(user.name)}</h2>
          <span class="badge badge-teacher" style="margin-top:6px;">Teacher</span>
        </div>
      </div>
      <div class="profile-row"><span>Username</span><span>${escapeHtml(user.username)}</span></div>
      <div class="profile-row"><span>Faculty</span><span>${escapeHtml(user.subjectArea)}</span></div>
      <div class="profile-row"><span>Email</span><span>${escapeHtml(user.email)}</span></div>
      <div class="profile-row"><span>Classes published</span><span>${getClasses().length}</span></div>
    </div>
  `;
}

/* ---------------------------------------------------------
   8. STUDENT VIEWS
   --------------------------------------------------------- */
function renderStudentHome(user) {
  const classes = getClasses();
  const recent = [...classes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  document.getElementById('s-home').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><b>${classes.length}</b><span>Available Classes</span></div>
      <div class="stat-card"><b>${new Set(classes.map(c => c.subject)).size}</b><span>Subjects</span></div>
      <div class="stat-card"><b>${recent.length ? formatDate(recent[0].date) : '—'}</b><span>Newest Upload</span></div>
    </div>
    <div class="section-head"><div><h2>Welcome back, ${escapeHtml(user.name.split(' ')[0])} 👋</h2><p>Here are your most recently added classes.</p></div></div>
    ${classCardGrid(recent, 'student')}
  `;
  bindClassCardActions('s-home', user);
}

function renderStudentClasses(user) {
  const classes = getClasses();
  document.getElementById('s-classes').innerHTML = `
    <div class="section-head"><div><h2>All classes (${classes.length})</h2><p>Grouped by subject and lesson order.</p></div></div>
    ${classCardGrid(classes, 'student')}
  `;
  bindClassCardActions('s-classes', user);
}

function renderStudentProfile(user) {
  document.getElementById('s-profile').innerHTML = `
    <div class="profile-card">
      <div class="profile-head">
        <div class="avatar-lg">${initials(user.name)}</div>
        <div>
          <h2 style="font-size:18px;">${escapeHtml(user.name)}</h2>
          <span class="badge badge-student" style="margin-top:6px;">Student</span>
        </div>
      </div>
      <div class="profile-row"><span>Username</span><span>${escapeHtml(user.username)}</span></div>
      <div class="profile-row"><span>Student ID</span><span>${escapeHtml(user.studentId)}</span></div>
      <div class="profile-row"><span>Email</span><span>${escapeHtml(user.email)}</span></div>
      <div class="profile-row"><span>Classes available</span><span>${getClasses().length}</span></div>
    </div>
  `;
}

/* ---------------------------------------------------------
   9. Shared: class card grid + details modal
   --------------------------------------------------------- */
function classCardGrid(classes, role) {
  if (!classes.length) return emptyState('No classes yet', role === 'teacher' ? 'Add your first class to get started.' : 'Your teacher has not published any classes yet.');
  return `<div class="class-grid">
    ${classes.map(c => `
      <div class="class-card">
        <div class="class-card-top">
          <span class="lesson-tag">LESSON ${String(c.lessonNumber).padStart(2, '0')}</span>
          <span class="lesson-tag">${formatDate(c.date)}</span>
        </div>
        <div class="class-card-body">
          <span class="subject-chip">${escapeHtml(c.subject)}</span>
          <h3>${escapeHtml(c.title)}</h3>
          <p class="class-desc">${escapeHtml(c.description)}</p>
        </div>
        <div class="class-card-foot">
          ${role === 'teacher' ? `
            <button class="btn btn-ghost btn-sm" data-view="${c.id}">Details</button>
            <button class="btn btn-ghost btn-sm" data-edit="${c.id}">Edit</button>
          ` : `
            <button class="btn btn-primary btn-sm" data-watch="${c.id}">▶ Watch Class</button>
          `}
        </div>
      </div>
    `).join('')}
  </div>`;
}

function emptyState(title, sub) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>
    <p><strong>${title}</strong></p><p>${sub}</p>
  </div>`;
}

function bindClassCardActions(containerId, user) {
  const root = document.getElementById(containerId);
  root.querySelectorAll('[data-watch]').forEach(b => b.addEventListener('click', () => watchClass(b.dataset.watch)));
  root.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showClassDetails(b.dataset.view, user)));
  root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => goTo('t-add', b.dataset.edit)));
}

function watchClass(classId) {
  const c = getClasses().find(x => x.id === classId);
  if (!c) return;
  window.open(c.driveLink, '_blank', 'noopener');
  toast(`Opening "${c.title}" in a new tab…`);
}

function showClassDetails(classId, user) {
  const c = getClasses().find(x => x.id === classId);
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
    confirmLabel: user.role === 'student' ? 'Watch Class' : 'Close',
    onConfirm: user.role === 'student' ? () => watchClass(c.id) : null
  });
}

/* ---------------------------------------------------------
   10. Modal
   --------------------------------------------------------- */
function showModal({ title, body, confirmLabel, cancelLabel = 'Cancel', danger = false, onConfirm }) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${title}</h3>
      <div style="margin-bottom:20px;">${typeof body === 'string' ? `<p>${body}</p>` : ''}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="modalCancel">${cancelLabel}</button>
        ${confirmLabel ? `<button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" id="modalConfirm">${confirmLabel}</button>` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modalCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  const confirmBtn = overlay.querySelector('#modalConfirm');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      overlay.remove();
      if (onConfirm) onConfirm();
    });
  }
}

/* ---------------------------------------------------------
   11. Mobile sidebar toggle
   --------------------------------------------------------- */
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarScrim').classList.remove('show');
}
function initMobileNav() {
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarScrim').classList.add('show');
  });
  document.getElementById('sidebarScrim').addEventListener('click', closeMobileSidebar);
}

/* ---------------------------------------------------------
   12. INIT
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  seedIfNeeded();
  initLoginPage();
  initMobileNav();
  boot();
});
