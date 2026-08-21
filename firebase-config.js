// ==========================================================
// ClassPilot — Firebase configuration
// ==========================================================
// Filled in from Firebase Console → Project settings → General
// → Your apps → classpilot-web (Web app config).
// ==========================================================

export const firebaseConfig = {
  apiKey: "AIzaSyBDqXG2PWPmRofILIse2qatF5bKGDrM_-g",
  authDomain: "classpilot-1950d.firebaseapp.com",
  projectId: "classpilot-1950d",
  storageBucket: "classpilot-1950d.firebasestorage.app",
  messagingSenderId: "118589078842",
  appId: "1:118589078842:web:6a1978f05046ae80572403"
};

// A simple gate so random visitors can't register themselves as
// "teacher". Anyone signing up as Teacher must type this code.
// Change it to your own secret before you deploy the site.
// (Note: this is a basic classroom-level safeguard, not real
// security — anyone who reads the source code can see it.)
export const TEACHER_ACCESS_CODE = "SLTC-TEACHER-2026";
