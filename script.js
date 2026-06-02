// Contentful Configuration
const SPACE_ID = 'rfov9c1xrame';
const ACCESS_TOKEN = 'tSR9ILdi6a7ZFXlS-_ShSpNFsM__ma3ygFmvisPrI4U';
const CONTENT_TYPE_ID = 'members';
const API_URL = `https://preview.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=${CONTENT_TYPE_ID}&order=sys.createdAt`;

// ─── Birthday Helpers ────────────────────────────────────────────────────────

/**
 * Given a date string (YYYY-MM-DD or similar), return how many days until the
 * NEXT occurrence of that birthday (0 = today, negative = already passed this year).
 */
/**
 * Parse a birthday string in any of these formats:
 *   "January 12th", "12th January", "Jan 12", "1995-08-12", "August 12, 1995"
 * Returns a { month, day } object (0-indexed month), or null if unparseable.
 */
function parseBirthday(dobString) {
  if (!dobString) return null;

  const MONTHS = {
    january:0, february:1, march:2, april:3, may:4, june:5,
    july:6, august:7, september:8, october:9, november:10, december:11,
    jan:0, feb:1, mar:2, apr:3, jun:5, jul:6, aug:7,
    sep:8, sept:8, oct:9, nov:10, dec:11
  };

  // Strip ordinal suffixes: 12th → 12, 1st → 1, 3rd → 3
  const clean = dobString.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();

  // Try native Date parse first (handles ISO and "Month Day, Year")
  const native = new Date(clean);
  if (!isNaN(native)) {
    return { month: native.getMonth(), day: native.getDate() };
  }

  // Try "Month Day" or "Day Month" (no year)
  const parts = clean.split(/[\s,]+/).filter(Boolean);
  let month = null, day = null;

  for (const part of parts) {
    const asNum = parseInt(part, 10);
    if (!isNaN(asNum) && asNum >= 1 && asNum <= 31) {
      day = asNum;
    } else if (MONTHS[part.toLowerCase()] !== undefined) {
      month = MONTHS[part.toLowerCase()];
    }
  }

  if (month !== null && day !== null) return { month, day };
  return null;
}

function daysUntilNextBirthday(dobString) {
  const parsed = parseBirthday(dobString);
  if (!parsed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(today.getFullYear(), parsed.month, parsed.day);
  if (next < today) {
    next = new Date(today.getFullYear() + 1, parsed.month, parsed.day);
  }

  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

/**
 * Build a Google Calendar "add event" URL for an annual birthday reminder.
 * Recurs yearly. Reminder set 1 day before.
 */
function buildGCalUrl(name, dobString) {
  const parsed = parseBirthday(dobString);
  if (!parsed) return '#';
  const year = new Date().getFullYear();

  let eventDate = new Date(year, parsed.month, parsed.day);
  if (eventDate < new Date()) {
    eventDate = new Date(year + 1, parsed.month, parsed.day);
  }

  const pad = (n) => String(n).padStart(2, '0');
  const dateStr =
    eventDate.getFullYear().toString() +
    pad(eventDate.getMonth() + 1) +
    pad(eventDate.getDate());

  const title = encodeURIComponent(`🎂 ${name}'s Birthday`);
  const details = encodeURIComponent(`Today is ${name}'s birthday! Wishing them a blessed day. 🙏`);

  // All-day event, repeating yearly
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}&recur=RRULE:FREQ%3DYEARLY`;
}

/**
 * Return a label + colour for a birthday countdown.
 */
function getBirthdayBadge(days) {
  if (days === 0) return { label: '🎉 Today!', color: '#c0392b' };
  if (days === 1) return { label: '🎂 Tomorrow!', color: '#d68910' };
  if (days <= 7)  return { label: `🎈 In ${days} days`, color: '#c9a84c' };
  if (days <= 30) return { label: `📅 In ${days} days`, color: '#1e8449' };
  return null; // Not upcoming — no badge
}

// ─── Render Members ──────────────────────────────────────────────────────────

async function fetchMembers() {
  const container = document.getElementById('members-grid');

  container.innerHTML = `
    <div class="state-box">
      <div style="display:inline-block;width:36px;height:36px;border:2px solid rgba(201,168,76,0.2);border-radius:50%;border-top-color:#c9a84c;animation:spin 0.9s linear infinite;margin-bottom:1rem;"></div>
      <p style="font-family:'Jost',sans-serif;font-size:0.85rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,240,232,0.4);">Loading members...</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    container.innerHTML = '';

    if (!data.items || data.items.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <span style="font-size:2.5rem;display:block;margin-bottom:1rem;">🕊️</span>
          <p style="font-family:'Jost',sans-serif;font-size:0.85rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,240,232,0.4);">No members yet — add some in Contentful</p>
        </div>`;
      return;
    }

    // Build asset map
    const assets = {};
    if (data.includes && data.includes.Asset) {
      data.includes.Asset.forEach(asset => {
        assets[asset.sys.id] = asset.fields.file.url;
      });
    }

    // Collect members with upcoming birthdays for the reminder button
    const upcomingBirthdays = [];

    data.items.forEach(item => {
      const member = item.fields;

      let imageUrl = 'assets/placeholder.jpeg';
      if (member.image && member.image.sys && assets[member.image.sys.id]) {
        imageUrl = 'https:' + assets[member.image.sys.id];
      }

      const name       = member.name       || 'Unknown Member';
      const bio        = member.bio        || '';
      const location   = member.location   || 'Unknown Location';
      const profession = member.profession || 'Unknown Profession';
      const birthday   = member.birthday   || null;

      // Birthday badge — admin only
      const days  = IS_ADMIN ? daysUntilNextBirthday(birthday) : null;
      const badge = days !== null ? getBirthdayBadge(days) : null;

      if (IS_ADMIN && birthday && days !== null && days <= 30) {
        upcomingBirthdays.push({ name, birthday });
      }

      // Format display date (e.g. "12 August")
      let birthdayDisplay = 'Unknown Birthday';
      if (birthday) {
        const parsed = parseBirthday(birthday);
        if (parsed) {
          const d = new Date(2000, parsed.month, parsed.day);
          birthdayDisplay = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
        }
      }

      const article = document.createElement('article');
      article.className = 'project-card';

      article.innerHTML = `
        <div class="image-container">
          <img src="${imageUrl}" alt="${name}" />
        </div>
        <div class="project-info">
          <h3>${name}</h3>
          ${badge ? `<div class="birthday-badge" style="background:${badge.color};">${badge.label}</div>` : ''}
          <p>${bio}</p>
          <div class="project-meta">
            <span>📍 ${location}</span>
            <span>💼 ${profession}</span>
            <span>🎂 ${birthdayDisplay}</span>
            ${IS_ADMIN && birthday ? `<a class="gcal-link" href="${buildGCalUrl(name, birthday)}" target="_blank" rel="noopener" title="Add ${name}'s birthday to Google Calendar">📆 Add to Calendar</a>` : ''}
          </div>
        </div>`;

      container.appendChild(article);
    });

    // Update member count label
    const countEl = document.getElementById('member-count');
    if (countEl) countEl.textContent = `${data.items.length} member${data.items.length !== 1 ? 's' : ''}`;

    // Insert the "Add ALL upcoming birthdays" banner if any are within 30 days (admin only)
    if (IS_ADMIN) renderUpcomingBirthdaysBanner(upcomingBirthdays);

  } catch (error) {
    console.error('Error fetching members from Contentful:', error);
    container.innerHTML = `
      <div class="state-box">
        <span style="font-size:2rem;display:block;margin-bottom:1rem;">⚠️</span>
        <p style="font-family:'Jost',sans-serif;font-size:0.85rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,240,232,0.4);">Couldn't load members — check your API keys or connection.</p>
      </div>`;
  }
}

// ─── Upcoming Birthdays Banner ───────────────────────────────────────────────

function renderUpcomingBirthdaysBanner(members) {
  if (!members.length) return;

  const section = document.querySelector('.projects-section');
  if (!section) return;

  // Avoid duplicates on re-render
  const existing = document.getElementById('birthday-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'birthday-banner';
  banner.innerHTML = `
    <div class="birthday-banner-inner">
      <div class="birthday-banner-icon">🎂</div>
      <div class="birthday-banner-text">
        <strong>Upcoming Birthdays (next 30 days)</strong>
        <ul class="birthday-list">
          ${members.map(m => {
            const days = daysUntilNextBirthday(m.birthday);
            const p = parseBirthday(m.birthday);
            const d = p ? new Date(2000, p.month, p.day) : null;
            const dateStr = d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : m.birthday;
            const daysLabel = days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `in ${days} days`;
            return `
              <li>
                <span><strong>${m.name}</strong> — ${dateStr} <em>(${daysLabel})</em></span>
                <a href="${buildGCalUrl(m.name, m.birthday)}" target="_blank" rel="noopener" class="banner-gcal-btn">
                  📆 Remind me
                </a>
              </li>`;
          }).join('')}
        </ul>
      </div>
    </div>`;

  // Insert before the grid
  const grid = document.getElementById('members-grid');
  section.insertBefore(banner, grid);
}

// ─── Admin Check ─────────────────────────────────────────────────────────────

// Birthday features are only visible when ?admin=true is in the URL.
// Visit: yourdomain.com/?admin=true  — share the plain URL with everyone else.
const IS_ADMIN = new URLSearchParams(window.location.search).get('admin') === 'true';

// ─── Boot ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', fetchMembers);