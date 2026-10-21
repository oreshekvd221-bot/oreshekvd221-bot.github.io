// Profile page: mocked auth gate + edit (src/scripts/auth.js).
import { getCurrentUser, updateProfile, initials, onAuthChange } from './auth.js';
import { toast } from './toast.js';

const root = document.querySelector('[data-profile-root]');
if (root) {
  function fillForm(user) {
    document.getElementById('profile-first').value = user.firstName || '';
    document.getElementById('profile-last').value = user.lastName || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.querySelector('[data-profile-initials]').textContent = initials(user);
    document.querySelector('[data-profile-name]').textContent = `${user.firstName} ${user.lastName}`.trim() || user.email;
    document.querySelector('[data-profile-email-sub]').textContent = user.email;
  }

  function updateGate() {
    const user = getCurrentUser();
    document.querySelector('[data-signed-out-prompt]').hidden = Boolean(user);
    document.querySelector('[data-profile-content]').hidden = !user;
    if (user) fillForm(user);
  }

  document.querySelector('[data-prompt-login]')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('wanderloop:open-auth', { detail: { mode: 'login' } }));
  });

  document.querySelector('[data-profile-form]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    updateProfile({
      firstName: document.getElementById('profile-first').value.trim(),
      lastName: document.getElementById('profile-last').value.trim(),
      email: document.getElementById('profile-email').value.trim(),
      phone: document.getElementById('profile-phone').value.trim(),
    });
    toast('Profile updated.');
    fillForm(getCurrentUser());
  });

  onAuthChange(updateGate);
  updateGate();
}
