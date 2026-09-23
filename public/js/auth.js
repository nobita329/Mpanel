// Mpanel Authentication Controller
class AuthController {
  showLoginModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;
    if (document.getElementById('login-modal')) return;

    const activeTheme = localStorage.getItem('mpanel_active_theme') || 'arix';
    const isPterox = activeTheme === 'pterox';
    const brandName = isPterox ? (localStorage.getItem('pterox_brand_name') || 'PteroX') : 'Mpanel';
    const loginLogo = isPterox ? (localStorage.getItem('pterox_login_logo') || '/images/pterox-login-logo.webp') : null;

    modalContainer.innerHTML = `
      <div id="login-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md ${isPterox ? 'theme-pterox' : ''}">
        <div class="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/15 shadow-2xl relative">
          <div class="text-center space-y-2 mb-6">
            ${isPterox && loginLogo ? `
              <div class="flex justify-center mb-2">
                <img src="${loginLogo}" alt="${brandName}" class="h-10 object-contain drop-shadow max-w-[200px]" onerror="this.src='/images/meta/Logo.png'">
              </div>
            ` : `
              <div class="flex justify-center mb-2">
                <img src="/images/meta/Logo.png" alt="Logo" class="h-12 w-auto object-contain drop-shadow" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400\\'><i data-lucide=\\'lock\\' class=\\'w-6 h-6\\'></i></div>'; if(window.lucide) lucide.createIcons();">
              </div>
            `}
            <h3 class="text-xl font-extrabold text-white">Sign In to ${brandName}</h3>
            <p class="text-xs text-slate-400">Enter your credentials to access your servers</p>
          </div>

          <form onsubmit="auth.handleLogin(event)" class="space-y-4">
            <div id="login-error-alert" class="hidden p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2.5">
              <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 mt-0.5"></i>
              <span id="login-error-text"></span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Username or Email</label>
              <input type="text" id="login-username" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs" placeholder="admin or admin@mpanel.local" autocapitalize="none" autocorrect="off" autocomplete="username" required autofocus>
            </div>
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-xs font-semibold text-slate-300">Password</label>
                <a href="javascript:void(0)" onclick="auth.showForgotPassword()" class="text-[11px] text-cyan-400 hover:underline">Forgot password?</a>
              </div>
              <input type="password" id="login-password" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs" placeholder="••••••••" autocomplete="current-password" required>
            </div>

            <!-- 2FA Input (Shown only when required) -->
            <div id="login-2fa-container" class="hidden space-y-1 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/30">
              <label class="block text-xs font-bold text-cyan-300">Two-Factor Authenticator Code</label>
              <input type="text" id="login-2fa-code" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono tracking-widest text-center" placeholder="123456" maxlength="6">
            </div>

            <button type="submit" id="login-submit-btn" class="btn-cyber w-full py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2">
              <span>Sign In</span>
            </button>
          </form>

          <div id="social-auth-section" class="hidden mt-4 pt-3 border-t border-white/10">
            <div class="relative flex py-1 items-center mb-2.5">
              <div class="flex-grow border-t border-white/10"></div>
              <span class="flex-shrink mx-3 text-[10px] uppercase tracking-wider font-semibold text-slate-400">Or continue with</span>
              <div class="flex-grow border-t border-white/10"></div>
            </div>
            <div id="social-auth-buttons" class="grid grid-cols-1 sm:grid-cols-2 gap-2"></div>
          </div>

          <div class="mt-6 text-center pt-4 border-t border-white/10 text-xs text-slate-400">
            Don't have an account? 
            <a href="javascript:void(0)" onclick="auth.showRegisterModal()" class="text-cyan-400 font-semibold hover:underline">Create Account</a>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    this.loadSocialButtons();
  }

  showRegisterModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const activeTheme = localStorage.getItem('mpanel_active_theme') || 'arix';
    const isPterox = activeTheme === 'pterox';
    const brandName = isPterox ? (localStorage.getItem('pterox_brand_name') || 'PteroX') : 'Mpanel';
    const loginLogo = isPterox ? (localStorage.getItem('pterox_login_logo') || '/images/pterox-login-logo.webp') : null;

    modalContainer.innerHTML = `
      <div id="register-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md ${isPterox ? 'theme-pterox' : ''}">
        <div class="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/15 shadow-2xl relative">
          <div class="text-center space-y-2 mb-6">
            ${isPterox && loginLogo ? `
              <div class="flex justify-center mb-2">
                <img src="${loginLogo}" alt="${brandName}" class="h-10 object-contain drop-shadow max-w-[200px]" onerror="this.src='/images/meta/Logo.png'">
              </div>
            ` : `
              <div class="flex justify-center mb-2">
                <img src="/images/meta/Logo.png" alt="Logo" class="h-12 w-auto object-contain drop-shadow" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400\\'><i data-lucide=\\'user-plus\\' class=\\'w-6 h-6\\'></i></div>'; if(window.lucide) lucide.createIcons();">
              </div>
            `}
            <h3 class="text-xl font-extrabold text-white">Create ${brandName} Account</h3>
            <p class="text-xs text-slate-400">Join and start deploying game & app servers</p>
          </div>

          <form onsubmit="auth.handleRegister(event)" class="space-y-4">
            <div id="register-error-alert" class="hidden p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2.5">
              <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 mt-0.5"></i>
              <span id="register-error-text"></span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Username</label>
              <input type="text" id="reg-username" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs" placeholder="e.g. shadow_player" autocapitalize="none" autocorrect="off" autocomplete="username" required minlength="3">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input type="email" id="reg-email" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs" placeholder="you@example.com" autocapitalize="none" autocorrect="off" autocomplete="email" required>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input type="password" id="reg-password" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs" placeholder="••••••••" autocomplete="new-password" required minlength="6">
            </div>

            <button type="submit" id="reg-submit-btn" class="btn-cyber-purple w-full py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2">
              <span>Create Account</span>
            </button>
          </form>

          <div id="social-auth-section" class="hidden mt-4 pt-3 border-t border-white/10">
            <div class="relative flex py-1 items-center mb-2.5">
              <div class="flex-grow border-t border-white/10"></div>
              <span class="flex-shrink mx-3 text-[10px] uppercase tracking-wider font-semibold text-slate-400">Or continue with</span>
              <div class="flex-grow border-t border-white/10"></div>
            </div>
            <div id="social-auth-buttons" class="grid grid-cols-1 sm:grid-cols-2 gap-2"></div>
          </div>

          <div class="mt-6 text-center pt-4 border-t border-white/10 text-xs text-slate-400">
            Already have an account? 
            <a href="javascript:void(0)" onclick="auth.showLoginModal()" class="text-cyan-400 font-semibold hover:underline">Sign In</a>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    this.loadSocialButtons();
  }

  async loadSocialButtons() {
    try {
      const res = await fetch('/api/auth/social/providers');
      const data = await res.json();
      const container = document.getElementById('social-auth-section');
      const buttonsDiv = document.getElementById('social-auth-buttons');
      if (!container || !buttonsDiv) return;

      if (data.success && Array.isArray(data.providers) && data.providers.length > 0) {
        container.classList.remove('hidden');
        buttonsDiv.innerHTML = data.providers.map(p => {
          let iconSvg = '';
          const short = (p.short_name || '').toLowerCase();
          if (short === 'discord') {
            iconSvg = `<svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;
          } else if (short === 'google') {
            iconSvg = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;
          } else if (short === 'github') {
            iconSvg = `<svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`;
          } else {
            iconSvg = `<i data-lucide="${p.icon || 'share-2'}" class="w-4 h-4"></i>`;
          }

          const btnBg = p.brandColor || '#3b82f6';
          const btnText = p.textColor || '#ffffff';

          return `
            <a href="/api/auth/social/redirect/${p.short_name}" class="px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-95 border border-white/10" style="background-color: ${btnBg}; color: ${btnText};">
              ${iconSvg}
              <span>${p.name}</span>
            </a>
          `;
        }).join('');
        if (window.lucide) lucide.createIcons();
      }
    } catch (e) {
      console.warn('Could not load social login buttons:', e);
    }
  }


  async handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const twoFaInput = document.getElementById('login-2fa-code');
    const twoFactorCode = twoFaInput ? twoFaInput.value.trim() : null;
    const submitBtn = document.getElementById('login-submit-btn');
    const errAlert = document.getElementById('login-error-alert');
    const errText = document.getElementById('login-error-text');

    if (errAlert) errAlert.classList.add('hidden');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i><span>Signing In...</span>';
      if (window.lucide) lucide.createIcons();
    }

    try {
      const data = await app.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, twoFactorCode })
      });

      if (data.requires2FA) {
        document.getElementById('login-2fa-container').classList.remove('hidden');
        document.getElementById('login-2fa-code').focus();
        app.toast('Please enter your 6-digit 2FA code.', 'info');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Verify & Sign In</span>';
        }
        return;
      }

      if (data.success && data.token) {
        localStorage.setItem('mpanel_token', data.token);
        app.token = data.token;
        app.user = data.user;
        app.updateAuthUI(data.user);
        document.getElementById('modal-container').innerHTML = '';
        app.toast(`Welcome back, ${data.user.username}!`, 'success');
        app.navigate('user-overview');
        await app.handleRoute();
      }
    } catch (err) {
      if (errAlert && errText) {
        errText.innerText = err.message || 'Login failed. Please check your credentials.';
        errAlert.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
      }
      app.toast(err.message, 'error');
    } finally {
      if (submitBtn && (!app.token || document.getElementById('login-modal'))) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign In</span>';
      }
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('reg-username');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const submitBtn = document.getElementById('reg-submit-btn');
    const errAlert = document.getElementById('register-error-alert');
    const errText = document.getElementById('register-error-text');

    if (errAlert) errAlert.classList.add('hidden');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i><span>Creating Account...</span>';
      if (window.lucide) lucide.createIcons();
    }

    try {
      const data = await app.api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });

      if (data.success && data.token) {
        localStorage.setItem('mpanel_token', data.token);
        app.token = data.token;
        app.user = data.user;
        app.updateAuthUI(data.user);
        document.getElementById('modal-container').innerHTML = '';
        app.toast(`Account created! Welcome, ${data.user.username}`, 'success');
        app.navigate('user-overview');
        await app.handleRoute();
      }
    } catch (err) {
      if (errAlert && errText) {
        errText.innerText = err.message || 'Registration failed.';
        errAlert.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
      }
      app.toast(err.message, 'error');
    } finally {
      if (submitBtn && (!app.token || document.getElementById('register-modal'))) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Account</span>';
      }
    }
  }

  async handleProfileUpdate(e) {
    e.preventDefault();
    const username = document.getElementById('prof-username').value.trim();
    const email = document.getElementById('prof-email').value.trim();
    const currentPassword = document.getElementById('prof-current-pass').value;
    const newPassword = document.getElementById('prof-new-pass').value;

    try {
      const data = await app.api('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ username, email, currentPassword, newPassword })
      });

      if (data.success) {
        app.user = data.user;
        app.updateAuthUI(data.user);
        app.toast('Profile updated successfully!', 'success');
        app.renderUserProfile();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async start2FASetup() {
    try {
      const data = await app.api('/api/auth/2fa/setup', { method: 'POST' });
      const box = document.getElementById('2fa-setup-box');
      if (box && data.qrCodeUrl) {
        box.classList.remove('hidden');
        box.innerHTML = `
          <div class="text-center space-y-3">
            <p class="text-xs text-slate-300 font-semibold">1. Scan this QR code with Google Authenticator or Authy:</p>
            <div class="bg-white p-2 rounded-xl inline-block shadow">
              <img src="${data.qrCodeUrl}" alt="2FA QR Code" class="w-40 h-40">
            </div>
            <p class="text-[11px] font-mono text-cyan-400 select-all">Secret: ${data.secret}</p>
            <p class="text-xs text-slate-300 font-semibold">2. Enter the 6-digit code to verify:</p>
            <div class="flex gap-2">
              <input type="text" id="verify-2fa-code" placeholder="123456" maxlength="6" class="glass-input flex-1 px-3 py-2 rounded-xl text-center font-mono text-xs">
              <button onclick="auth.confirm2FA()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold">Verify & Enable</button>
            </div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async confirm2FA() {
    const code = document.getElementById('verify-2fa-code').value.trim();
    if (!code) {
      app.toast('Please enter 6-digit verification code.', 'warning');
      return;
    }

    try {
      const data = await app.api('/api/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code })
      });

      if (data.success) {
        app.toast('Two-Factor Authentication is now ENABLED!', 'success');
        app.user.two_factor_enabled = true;
        app.renderUserProfile();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  showDisable2FAModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-sm p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="shield-alert" class="w-5 h-5 text-rose-400"></i> Disable Two-Factor Auth
          </h3>
          <p class="text-xs text-slate-300">Enter your account password to confirm disabling 2FA:</p>
          <input type="password" id="disable-2fa-pass" placeholder="Account password" class="w-full glass-input px-3 py-2 rounded-xl text-xs">
          <div class="flex gap-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="auth.disable2FA()" class="flex-1 py-2 rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold">Disable 2FA</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async disable2FA() {
    const password = document.getElementById('disable-2fa-pass').value;
    try {
      const data = await app.api('/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (data.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Two-Factor Authentication disabled.', 'info');
        app.user.two_factor_enabled = false;
        app.renderUserProfile();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  showForgotPassword() {
    app.toast('Please contact your administrator to reset your password or run "npm run createuser".', 'info');
  }

  logout() {
    app.logout();
  }
}

window.auth = new AuthController();

