// Accolai landing page: the download buttons know what you are on.
// Detects Windows, macOS or Linux, asks GitHub for the latest release, and points every download
// control at the installer for that system. With no script, no network, or no build for the
// visitor's system, the Windows installer stays as the fallback, and the page says so.
(() => {
  const REPO = 'ketevan614/accolai-downloads';
  const KNOWN = { version: '0.4.0', windows: { url: `https://github.com/${REPO}/releases/download/v0.4.0/Accolai-Setup.exe`, size: 223184896 } };
  const NAME = { windows: 'Windows', mac: 'Mac', linux: 'Linux' };

  function detect() {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    const ua = navigator.userAgent || '';
    const s = (p + ' ' + ua).toLowerCase();
    if (/iphone|ipad|ipod|android/.test(s)) return null; // a phone: no desktop app to install
    if (/win/.test(s)) return 'windows';
    if (/mac/.test(s)) return 'mac';
    if (/linux|x11|cros/.test(s)) return 'linux';
    return null;
  }
  const mb = (n) => (n ? Math.round(n / 1048576) + ' MB' : '');

  // which installer is for which system, by file name
  function sort(release) {
    const out = { version: (release.tag_name || '').replace(/^v/, ''), notes: release.html_url };
    for (const a of release.assets || []) {
      const n = a.name.toLowerCase(); const item = { url: a.browser_download_url, size: a.size, name: a.name };
      if (n.endsWith('.exe') || n.endsWith('.msi')) out.windows = out.windows || item;
      else if (n.endsWith('.dmg')) out.mac = item;                                   // a dmg beats a zip
      else if (n.endsWith('.zip') && /darwin|mac|osx/.test(n)) out.mac = out.mac || item;
      else if (n.endsWith('.appimage')) out.linux = item;                            // an AppImage beats a deb
      else if (n.endsWith('.deb')) out.linux = out.linux || item;
    }
    return out;
  }

  function apply(rel, os) {
    const have = os && rel[os] ? os : 'windows';
    const item = rel[have] || KNOWN.windows; if (!item) return;
    const miss = os && os !== have; // the visitor's system has no build yet
    const label = 'Download for ' + NAME[have];
    for (const el of document.querySelectorAll('[data-dl="link"]')) { el.href = item.url; }
    for (const el of document.querySelectorAll('[data-dl="label"]')) { el.textContent = label; }
    for (const el of document.querySelectorAll('[data-dl="note"]')) {
      el.textContent = miss ? `${NAME[os]} build coming soon. ${NAME[have]} · ${rel.version || KNOWN.version}` : `${NAME[have]} · ${rel.version || KNOWN.version}${item.size ? ' · ' + mb(item.size) : ''}`;
    }
    for (const el of document.querySelectorAll('[data-dl="meta"]')) {
      el.textContent = `Free · ${NAME[have]} · ${rel.version || KNOWN.version}${item.size ? ' · ' + mb(item.size) : ''}`;
    }
    // every other build we have, as a small line under the hero button and in the footer
    const others = ['windows', 'mac', 'linux'].filter((k) => k !== have && rel[k]);
    for (const el of document.querySelectorAll('[data-dl="others"]')) {
      el.innerHTML = '';
      if (!others.length) { el.hidden = true; continue; }
      el.hidden = false; el.append('Also for ');
      others.forEach((k, i) => { const a = document.createElement('a'); a.href = rel[k].url; a.textContent = NAME[k]; el.append(a); if (i < others.length - 1) el.append(' and '); });
      el.append('.');
    }
    for (const el of document.querySelectorAll('[data-dl="notes"]')) { if (rel.notes) el.href = rel.notes; }
    document.documentElement.dataset.os = have;
  }

  const os = detect();
  apply({ ...KNOWN }, os);
  // then the real list from GitHub, so a Mac or Linux build appears here the moment it is released
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((rel) => { if (rel) apply(sort(rel), os); })
    .catch(() => {});
})();
