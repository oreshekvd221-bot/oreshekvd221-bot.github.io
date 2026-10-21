// Mocked auth: CLAUDE.md says login is mocked with localStorage, no backend.
// Any email/password that passes basic validation "succeeds" — there is
// nothing to check it against. Two localStorage keys, like a tiny database
// plus a session pointer, so logging back out and in with the same email
// restores the same profile instead of losing it:
//   wanderloop:users   — { [email]: { firstName, lastName, email, phone } }
//   wanderloop:session — the signed-in user's email, or absent if signed out
const USERS_KEY = 'wanderloop:users';
const SESSION_KEY = 'wanderloop:session';
const EVENT = 'wanderloop:auth-change';

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeUser(user) {
  const users = readUsers();
  users[user.email.toLowerCase()] = user;
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // localStorage unavailable (private browsing) — the session just won't persist.
  }
}

function setSession(email) {
  try {
    localStorage.setItem(SESSION_KEY, email.toLowerCase());
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getCurrentUser() {
  let email;
  try {
    email = localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!email) return null;
  return readUsers()[email] || null;
}

export function signUp({ firstName, lastName, email, phone }) {
  const user = { firstName, lastName, email, phone };
  writeUser(user);
  setSession(email);
}

export function logIn({ email }) {
  const users = readUsers();
  const existing = users[email.toLowerCase()];
  if (!existing) {
    // No account on file for this email in this mock: sign them in with just
    // what they gave us, same as a real "first login creates the profile" flow.
    writeUser({ firstName: '', lastName: '', email, phone: '' });
  }
  setSession(email);
}

export function updateProfile(fields) {
  const current = getCurrentUser();
  if (!current) return;
  const updated = { ...current, ...fields };
  writeUser(updated);
  if (updated.email.toLowerCase() !== current.email.toLowerCase()) {
    setSession(updated.email);
  } else {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function initials(user) {
  const a = (user.firstName || user.email || '?')[0] || '?';
  const b = (user.lastName || '')[0] || '';
  return (a + b).toUpperCase();
}

export function displayName(user) {
  if (user.firstName) return `${user.firstName} ${(user.lastName || '')[0] ? user.lastName[0] + '.' : ''}`.trim();
  return user.email;
}

export function onAuthChange(callback) {
  window.addEventListener(EVENT, callback);
}
