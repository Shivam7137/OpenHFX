'use strict';

// Executable design reference only: no fetch, storage, geolocation, or external requests.
const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  tree: '<path d="m12 3-5 6h3l-6 7h6v5h4v-5h6l-6-7h3Z"/>',
  access: '<path d="M4 18h16M6 18V9h12v9M4 9h16M9 5h6"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4Z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m14 5-7 7 7 7M7 12h13"/>',
  camera: '<path d="m8 6 2-3h4l2 3h5v14H3V6Z"/><circle cx="12" cy="13" r="4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m2-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  inbox: '<path d="M3 4h18v16H3Zm0 9h5l2 3h4l2-3h5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-12 9h12m-8 3h4"/>'
};
document.querySelectorAll('[data-icon]').forEach(element => {
  element.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[element.dataset.icon] || icons.info}</svg>`;
});

function illustratedMap(compact) {
  const viewBox = compact ? '0 120 390 135' : '0 0 390 470';
  return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="390" height="470" fill="#C9E2E7"/>
    <path d="M0 0H306L295 38 310 68 286 92 292 126 272 153 279 181 259 208 263 235 242 260 247 296 229 318 238 341 212 365 205 398 184 414 173 470H0Z" fill="#E8EEEB"/>
    <path d="m368 0-22 57 6 25-19 41 4 42-16 30 12 26-12 29 9 35-19 39 12 38-7 35 24 32 3 41h47V0Z" fill="#E5ECE9"/>
    <path d="M19 110 86 89l33 51-71 27Zm35 147 66-22 28 54-70 20Zm-50 78 64-17 23 49-68 24Z" fill="#D1E0CB"/>
    <g fill="#DCE5E0"><path d="m151 87 67-16 19 47-66 19Zm-34 87 42-11 16 36-40 12Zm50 45 62-15 11 26-63 21Zm-7 106 40-10 2 35-51 17Z"/></g>
    <g fill="none" stroke="#CAD6D3" stroke-width="12"><path d="m-32 160 323-99M-12 220l294-89M-10 282l272-84M-10 346l254-81M-10 416l229-78"/><path d="M31-30 162 490M108-30l123 419M184-30l80 283"/></g>
    <g fill="none" stroke="#FFFFFF" stroke-width="8"><path d="m-32 160 323-99M-12 220l294-89M-10 282l272-84M-10 346l254-81M-10 416l229-78"/><path d="M31-30 162 490M108-30l123 419M184-30l80 283"/></g>
    <g fill="none" stroke="#FFFFFF" stroke-width="4"><path d="m-18 186 302-94M-12 249l283-88M-8 315l252-80M0 382l224-74"/><path d="M-8 25 114 488M67-30l141 502M146-30l91 347M230-30l50 207"/></g>
    <path d="m264 152 74 24" fill="none" stroke="#A9BFC4" stroke-width="9"/><path d="m264 152 74 24" fill="none" stroke="#FFFFFF" stroke-width="5"/>
    <path d="m292 311 17-8 7 17-9 16-18-6Z" fill="#D1E0CB" stroke="#BAD3CD" stroke-width="2"/>
    <path d="m286 342-14 40m9 18-10 36" stroke="#AED1D9" stroke-width="1.3" fill="none"/>
    <g fill="#627E88" font-family="Segoe UI,Arial,sans-serif" font-size="12"><text x="295" y="235" transform="rotate(77 295 235)" letter-spacing="1.5">Halifax Harbour</text><text x="47" y="125" font-size="10">Park</text></g>
  </svg>`;
}
document.querySelectorAll('[data-map]').forEach(element => {
  element.innerHTML = illustratedMap(element.dataset.map === 'small');
});

const steps = [
  {label:'Two organizations have accepted the issue.', action:'Teams mark en route', status:'Assigned', parks:'Assigned', streets:'Assigned', progress:1, next:'Harbour Parks and Street Response are coordinating the site visit.', event:'Response teams assigned', detail:'Harbour Parks is coordinating with Street Response.'},
  {label:'Canopy 2 has reported that it is en route.', action:'Teams mark on site', status:'In progress', parks:'En route', streets:'Assigned', progress:2, next:'Harbour Parks has published that its inspection team is en route.', event:'Inspection team en route', detail:'Harbour Parks published the team’s reported progress.'},
  {label:'Both teams have reported on site.', action:'Start inspection work', status:'In progress', parks:'On site', streets:'On site', progress:3, next:'The teams are on site. Inspection and access checks are next.', event:'Teams are on site', detail:'Both organizations published their teams’ arrival updates.'},
  {label:'Canopy 2 is inspecting and clearing the branch.', action:'Complete parks assignment', status:'In progress', parks:'Working', streets:'On site', progress:3, next:'Harbour Parks is inspecting the branch. Street Response is checking access.', event:'Inspection work started', detail:'Harbour Parks published that inspection work is underway.'},
  {label:'Parks work is complete. Street Response is still working.', action:'Complete streets assignment', status:'In progress', parks:'Complete', streets:'Working', progress:4, next:'The branch is cleared. Street Response is restoring accessible passage.', event:'Branch cleared; access work continues', detail:'Harbour Parks completed its assignment. The issue remains open.'},
  {label:'Both assignments are complete. The lead must confirm resolution.', action:'Lead resolves issue', status:'In progress', parks:'Complete', streets:'Complete', progress:4, next:'Both organizations have finished. The lead is reviewing the resolution.', event:'Required work is complete', detail:'Street Response has confirmed passage is restored.'},
  {label:'The lead confirmed resolution. Followers see the same outcome.', action:'Replay demo', status:'Resolved', parks:'Complete', streets:'Complete', progress:4, next:'The walkway is clear and accessible. Harbour Parks confirmed resolution.', event:'Walkway reopened', detail:'The lead resolved the issue after both required assignments were completed.'}
];
let currentStep = 0;
let evidenceCount = 2;
let isFollowing = true;
let reviewed = false;
let demoPhoto = false;
const announce = message => { document.getElementById('demo-announcement').textContent = message; };

function renderTimeline() {
  const list = document.getElementById('public-timeline');
  list.replaceChildren();
  const step = steps[currentStep];
  const entries = [
    {title:step.event, body:step.detail, time:`Demo event · 10:${String(12 + currentStep * 3).padStart(2,'0')}`},
    {title:evidenceCount > 2 ? 'New evidence added in this reference' : 'More detail from a neighbour', body:evidenceCount > 2 ? 'A demo resident added another observation of the walkway.' : '“The remaining path is too narrow for a wheelchair.”', time:'Demo evidence · ' + evidenceCount + ' contributions', evidence:true}
  ];
  for (const entry of entries) {
    const item = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'timeline-dot' + (entry.evidence ? ' evidence-dot' : '');
    const text = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = entry.title;
    const body = document.createElement('p'); body.textContent = entry.body;
    const time = document.createElement('span'); time.className = 'meta'; time.textContent = entry.time;
    text.append(title, body, time); item.append(dot, text); list.append(item);
  }
}

function render() {
  const step = steps[currentStep];
  document.getElementById('scenario-label').textContent = step.label;
  document.getElementById('advance').textContent = step.action;
  document.querySelectorAll('[data-issue-status]').forEach(element => {
    element.textContent = step.status;
    element.classList.toggle('resolved', step.status === 'Resolved');
  });
  document.getElementById('main-marker').classList.toggle('resolved', step.status === 'Resolved');
  document.getElementById('parks-status').textContent = step.parks;
  document.getElementById('streets-status').textContent = step.streets;
  document.getElementById('parks-reported').textContent = currentStep ? 'Reported in this demo event' : 'Accepted in this demo';
  document.getElementById('streets-reported').textContent = currentStep > 1 ? 'Reported in this demo event' : 'Accepted in this demo';
  document.querySelectorAll('#parks-track i').forEach((element,index) => element.classList.toggle('active',index < step.progress));
  document.getElementById('next-step-text').textContent = step.next;
  document.querySelector('[data-public-next]').textContent = step.next;
  document.querySelector('.issue-list-row[data-open-main] span').textContent = step.status;
  document.getElementById('resolution-rule').textContent = currentStep === 6 ? 'Resolved by the lead after both required assignments completed.' : currentStep === 5 ? 'Both required assignments are complete. The lead can now confirm resolution.' : 'Both assignments must be complete before this issue can be resolved.';
  document.getElementById('authority-evidence-count').textContent = String(evidenceCount);
  renderTimeline();
}

function advance() {
  if (document.body.classList.contains('offline')) {
    announce('Offline simulation is active. Restore the demo connection to advance shared progress.');
    document.getElementById('scenario-label').textContent = 'Offline snapshot. Restore the demo connection to continue.';
    return;
  }
  currentStep = (currentStep + 1) % steps.length;
  render(); announce(steps[currentStep].label);
}
document.getElementById('advance').addEventListener('click',advance);
document.getElementById('authority-action').addEventListener('click',advance);
document.getElementById('connection').addEventListener('click',event => {
  const offline = document.body.classList.toggle('offline');
  event.currentTarget.textContent = offline ? 'Restore demo connection' : 'Show offline state';
  event.currentTarget.setAttribute('aria-pressed',String(offline));
  document.querySelector('[data-connection]').textContent = offline ? 'Offline · showing demo snapshot' : 'Demo updates';
  if (!offline) render();
  announce(offline ? 'Offline snapshot shown. This is a simulated connection state.' : 'Demo connection restored.');
});
function openShared() { document.getElementById('shared-screen').scrollIntoView({behavior:'auto',block:'start'}); }
document.getElementById('main-marker').addEventListener('click',openShared);
document.querySelector('[data-open-main]').addEventListener('click',openShared);
document.querySelector('.marker-secondary').addEventListener('click',() => {
  document.getElementById('map-list').hidden = false;
  document.getElementById('map-selection').hidden = true;
  document.getElementById('show-list').textContent = 'View selected';
  announce('Demo access issue shown in the nearby list.');
});
document.getElementById('show-list').addEventListener('click',event => {
  if (document.querySelector('[data-filter="access"]').getAttribute('aria-pressed') === 'true') {
    document.querySelector('[data-filter="all"]').click();
    return;
  }
  const list = document.getElementById('map-list');
  list.hidden = !list.hidden;
  document.getElementById('map-selection').hidden = !list.hidden;
  event.currentTarget.textContent = list.hidden ? 'View list' : 'View selected';
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',() => {
  document.querySelectorAll('[data-filter]').forEach(item => {
    item.classList.toggle('active',item === button);
    item.setAttribute('aria-pressed',String(item === button));
  });
  document.querySelectorAll('[data-category]').forEach(marker => {
    marker.hidden = button.dataset.filter !== 'all' && marker.dataset.category !== button.dataset.filter;
  });
  document.querySelector('.map-cluster').hidden = button.dataset.filter !== 'all';
  document.querySelectorAll('[data-list-category]').forEach(row => {
    row.hidden = button.dataset.filter !== 'all' && row.dataset.listCategory !== button.dataset.filter;
  });
  document.getElementById('map-list').hidden = button.dataset.filter !== 'access';
  document.getElementById('map-selection').hidden = button.dataset.filter === 'access';
  document.getElementById('show-list').textContent = button.dataset.filter === 'access' ? 'View all' : 'View list';
  announce('Demo map filter: ' + button.textContent.trim());
}));
const description = document.getElementById('description');
function updateCount() { document.getElementById('char-count').textContent = `${description.value.length} / 2,000`; }
description.addEventListener('input',updateCount);
document.getElementById('photo-button').addEventListener('click',event => {
  demoPhoto = !demoPhoto;
  event.currentTarget.classList.toggle('attached',demoPhoto);
  document.getElementById('photo-label').textContent = demoPhoto ? 'Demo photo selected · remove' : 'Add a demo photo';
  announce(demoPhoto ? 'Illustrative photo attachment selected; no file was uploaded.' : 'Demo attachment removed.');
});
document.getElementById('report-form').addEventListener('submit',event => {
  event.preventDefault();
  if (description.value.trim().length < 20) {
    description.setCustomValidity('Describe the problem in at least 20 characters.');
    description.reportValidity(); return;
  }
  description.setCustomValidity('');
  if (!reviewed) {
    reviewed = true;
    document.getElementById('review-fields').hidden = false;
    document.getElementById('suggestion-panel').hidden = true;
    document.getElementById('report-action').textContent = 'Apply to this design example';
    document.getElementById('report-result').textContent = 'Review the editable fixture suggestion. This does not submit a real report.';
    document.getElementById('suggested-title').focus();
  } else {
    const title = document.getElementById('suggested-title').value.trim();
    if (title.length < 8) return;
    document.querySelectorAll('[data-issue-title]').forEach(element => { element.textContent = title; });
    document.getElementById('report-result').textContent = 'Example title updated across the screens. Nothing was sent or saved outside this page.';
    announce('Example title updated across the four-screen reference.');
  }
});
description.addEventListener('input',() => description.setCustomValidity(''));
document.getElementById('follow-button').addEventListener('click',event => {
  isFollowing = !isFollowing;
  event.currentTarget.setAttribute('aria-pressed',String(isFollowing));
  event.currentTarget.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons.bookmark}</svg>${isFollowing ? 'Following' : 'Follow'}`;
  announce(isFollowing ? 'Following this demo issue.' : 'No longer following this demo issue.');
});
document.getElementById('evidence-button').addEventListener('click',() => {
  evidenceCount += 1; render();
  announce('Demo evidence added. ' + evidenceCount + ' contributions in this reference.');
});
document.getElementById('reset').addEventListener('click',() => {
  currentStep = 0; evidenceCount = 2;
  reviewed = false; demoPhoto = false; isFollowing = true;
  document.getElementById('report-form').reset();
  description.setCustomValidity('');
  document.getElementById('review-fields').hidden = true;
  document.getElementById('suggestion-panel').hidden = false;
  document.getElementById('report-action').textContent = 'Review demo report';
  document.getElementById('report-result').textContent = '';
  document.getElementById('photo-button').classList.remove('attached');
  document.getElementById('photo-label').textContent = 'Add a demo photo';
  document.getElementById('follow-button').setAttribute('aria-pressed','true');
  document.getElementById('follow-button').innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons.bookmark}</svg>Following`;
  document.querySelector('[data-filter="all"]').click();
  document.body.classList.remove('offline');
  document.getElementById('connection').textContent = 'Show offline state';
  document.getElementById('connection').setAttribute('aria-pressed','false');
  document.querySelector('[data-connection]').textContent = 'Demo updates';
  document.querySelectorAll('[data-issue-title]').forEach(element => { element.textContent = 'Branch blocking the walkway'; });
  document.querySelectorAll('.phone-scroll').forEach(element => { element.scrollTop = 0; });
  updateCount(); render(); announce('All demo inputs, progress, and evidence reset.');
});
updateCount(); render();
