/* ═══════════════════════════════════════════════════
   ClinixAI — Clinical Multi-Agent System
   app.js — Full logic + Sarvam API integration
═══════════════════════════════════════════════════ */

'use strict';

// ── Sarvam Config ──────────────────────────────────────
const SARVAM_API_KEY = 'API_KEY';
const SARVAM_BASE    = 'https://api.sarvam.ai';

// ── App State ──────────────────────────────────────────
const STATE = {
  currentPatient: null,
  currentView: 'dashboard',
  labCharts: {},
  analysisRunning: false,
  logEntries: [],
  ttsAudio: null,
  ttsPlaying: false,
  mediaRecorder: null,
  isRecording: false,
  recordingChunks: [],
};

// ── Patient Data ────────────────────────────────────────
const PATIENTS = [
  {
    id: 'PX-30491', initials: 'SJ', name: 'Sarah Jenkins',
    dob: '05/12/1978', age: 47, gender: 'Female',
    dept: 'Cardiology — Emergency', color: 'linear-gradient(135deg,#00d4ff,#0093d0)',
    severity: 'high', admitTime: '14:18',
    chiefComplaint: 'Chest pain, dyspnoea since 3h',
    history: 'Hypertension (10y), T2DM, smoker (20 pack-year)',
    vitals: [
      { label:'Heart Rate', value:'88', unit:'bpm', status:'Normal', statusClass:'flag-norm', trend:'↑ 3%', trendClass:'trend-up', grad:'var(--grad-teal)', css: '--grad:var(--grad-teal)' },
      { label:'Blood Pressure', value:'138/92', unit:'mmHg', status:'High', statusClass:'flag-high', trend:'↑ 6%', trendClass:'trend-up', grad:'var(--grad-amber)', css:'--grad:var(--grad-amber)' },
      { label:'SpO₂', value:'96', unit:'%', status:'Normal', statusClass:'flag-norm', trend:'— stable', trendClass:'trend-ok', grad:'var(--grad-green)', css:'--grad:var(--grad-green)' },
      { label:'Resp Rate', value:'18', unit:'/min', status:'Normal', statusClass:'flag-norm', trend:'— stable', trendClass:'trend-ok', grad:'var(--grad-teal)', css:'--grad:var(--grad-teal)' },
    ],
    labs: [
      { name:'Troponin I',  value:'0.09', unit:'ng/mL', range:'<0.04', flag:'high',  color:'#ef4444', data:[0.02,0.02,0.03,0.04,0.06,0.07,0.08,0.09] },
      { name:'Hemoglobin',  value:'13.1', unit:'g/dL',  range:'12–16', flag:'norm',  color:'#8b5cf6', data:[13.5,13.4,13.3,13.3,13.2,13.1,13.1,13.1] },
      { name:'WBC Count',   value:'12.4', unit:'×10³/µL', range:'4–11', flag:'high', color:'#f59e0b', data:[8.0,8.2,9.1,10.2,11.0,11.8,12.1,12.4] },
      { name:'Potassium',   value:'4.2',  unit:'mmol/L', range:'3.5–5.1', flag:'norm', color:'#10b981', data:[4.1,4.2,4.1,4.3,4.2,4.1,4.2,4.2] },
    ],
    flowNodes: [
      { title:'🩺 Patient Intake', body:'Chief complaint: Chest pain + dyspnoea. History captured. Risk factors: HTN, T2DM, smoking.', tags:['Admitted 14:18','Risk score: HIGH'], state:'done', delay:0 },
      { title:'🔬 Lab Analysis', body:'Troponin I elevated (0.09 ng/mL). WBC raised. Serial ECG: ST-changes in V1-V4 leads.', tags:['Troponin ↑','WBC ↑','ECG changed'], state:'done', delay:200 },
      { title:'📚 Knowledge Retrieval', body:'Querying ACC/AHA NSTEMI guidelines, ESC 2023 ACS pathway. Cardiology evidence loaded.', tags:['ACC/AHA','ESC 2023','ACS pathway'], state:'done', delay:400 },
      { title:'🧠 Clinical Reasoning', body:'Bayesian inference across vitals, labs, ECG, and history. Differential generated.', tags:['Bayesian','Differential Dx','78% NSTEMI'], state:'active', delay:600 },
      { title:'📋 Documentation', body:'Discharge plan, SOAP note, and clinical summary pending physician sign-off.', tags:['Pending sign-off'], state:'pending', delay:800 },
    ],
    diagnoses: [
      { name:'NSTEMI', pct:78, label:'Primary', labelClass:'label-primary', color:'#00d4ff', primary:true },
      { name:'Unstable Angina', pct:14, label:'Differential', labelClass:'label-diff', color:'#f59e0b' },
      { name:'Pericarditis', pct:6, label:'Differential', labelClass:'label-diff', color:'#8b5cf6' },
      { name:'GERD / MSK', pct:2, label:'Excluded', labelClass:'label-excluded', color:'#4a6a8a' },
    ],
    diagnosisText: 'Patient presentation is consistent with NSTEMI (78% confidence). Elevated Troponin I at 0.09 ng/mL (2.25× ULN), ST-segment changes in V1-V4, hypertensive on admission, and classic risk profile (HTN, DM, smoking). Recommend urgent cardiology consult, dual antiplatelet therapy initiation, and consideration of early invasive strategy per ACC/AHA 2023 guidelines.',
    evidence: [
      { title:'ACC/AHA 2023 NSTEMI Guidelines', source:'American College of Cardiology', body:'Early invasive strategy recommended within 24h for high-risk NSTEMI. Dual antiplatelet therapy (Aspirin + P2Y12 inhibitor) indicated immediately upon diagnosis.' },
      { title:'ESC 2023 Acute Coronary Syndrome Pathway', source:'European Society of Cardiology', body:'Troponin >2× ULN with ischemic symptoms meets NSTEMI criteria. Serial ECG monitoring every 30 min for first 2 hours.' },
      { title:'Troponin I Kinetics in ACS', source:'NEJM Cardiology, 2022', body:'Rising troponin trajectory (0.02→0.09 over 6h) highly specific for myocardial injury. Delta change >50% considered diagnostic.' },
    ],
    logSeed: [
      { agent:'Patient Intake', color:'#10b981', msg:'Medical history confirmed. Allergies documented: Penicillin. Prior cardiac events: None.' },
      { agent:'Knowledge Retrieval', color:'#00d4ff', msg:'Sourced 3 clinical guidelines: ACC/AHA NSTEMI, ESC ACS, and NEJM troponin kinetics study.' },
      { agent:'Diagnostics', color:'#f59e0b', msg:'Troponin I flagged as 2.25× ULN. WBC elevated — possible systemic inflammatory component. ECG changes loaded.' },
      { agent:'Clinical Reasoning', color:'#8b5cf6', msg:'Differential Dx updated: NSTEMI probability 78%, Unstable Angina 14%, Pericarditis 6%. High-risk stratification complete.' },
      { agent:'Patient Intake', color:'#10b981', msg:'Family notified. Consent for procedures obtained. ICU bed request submitted.' },
    ],
    actions: [
      { icon:'💊', text:'Prescribe Aspirin 300mg + Ticagrelor 180mg loading dose', pri:'high' },
      { icon:'🏥', text:'Request urgent cardiology consult within 2 hours', pri:'high' },
      { icon:'🩺', text:'Repeat ECG in 30 minutes and serial troponin at 3h', pri:'med' },
      { icon:'📋', text:'Complete SOAP note and sign off on AI clinical summary', pri:'med' },
    ],
  },
  {
    id: 'PX-19872', initials: 'RK', name: 'Rajan Kumar',
    dob: '22/08/1965', age: 61, gender: 'Male',
    dept: 'Neurology — Ward', color: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    severity: 'med', admitTime: '10:42',
    chiefComplaint: 'Sudden onset weakness, left arm numbness, speech difficulty',
    history: 'AF (on warfarin), hypertension, dyslipidaemia',
    vitals: [
      { label:'Heart Rate', value:'72', unit:'bpm', status:'Normal', statusClass:'flag-norm', trend:'— stable', trendClass:'trend-ok', grad:'var(--grad-teal)' },
      { label:'Blood Pressure', value:'162/98', unit:'mmHg', status:'High', statusClass:'flag-high', trend:'↑ 4%', trendClass:'trend-up', grad:'var(--grad-amber)' },
      { label:'SpO₂', value:'98', unit:'%', status:'Normal', statusClass:'flag-norm', trend:'— stable', trendClass:'trend-ok', grad:'var(--grad-green)' },
      { label:'INR', value:'2.8', unit:'', status:'Therapeutic', statusClass:'flag-norm', trend:'↓ 0.2', trendClass:'trend-dn', grad:'var(--grad-purple)' },
    ],
    labs: [
      { name:'Blood Glucose', value:'142', unit:'mg/dL', range:'70–100', flag:'high', color:'#ef4444', data:[120,125,130,135,138,140,141,142] },
      { name:'INR', value:'2.8', unit:'', range:'2–3', flag:'norm', color:'#10b981', data:[2.5,2.6,2.7,2.7,2.8,2.8,2.8,2.8] },
      { name:'Platelets', value:'195', unit:'×10³/µL', range:'150–400', flag:'norm', color:'#8b5cf6', data:[200,198,197,196,195,195,195,195] },
      { name:'CRP', value:'8.2', unit:'mg/L', range:'<5', flag:'high', color:'#f59e0b', data:[3,4,5,6,7,7.5,8,8.2] },
    ],
    flowNodes: [
      { title:'🩺 Patient Intake', body:'Stroke onset time captured: 09:45. Last seen normal: 09:30. FAST score: +3.', tags:['FAST +3','Onset captured'], state:'done', delay:0 },
      { title:'🔬 Lab Analysis', body:'CT head: No haemorrhage. MRI DWI: Acute ischemic focus, right MCA territory.', tags:['CT clear','MRI ischemic'], state:'done', delay:200 },
      { title:'📚 Knowledge Retrieval', body:'AHA Stroke guidelines loaded. tPA eligibility criteria cross-referenced.', tags:['AHA Stroke 2023','tPA criteria'], state:'done', delay:400 },
      { title:'🧠 Clinical Reasoning', body:'Cardioembolic stroke from AF most likely. tPA window: borderline (3.5h). NIHSS score 8.', tags:['NIHSS:8','tPA borderline'], state:'active', delay:600 },
      { title:'📋 Documentation', body:'Stroke alert documentation in progress. Neurology handoff prepared.', tags:['Pending'], state:'pending', delay:800 },
    ],
    diagnoses: [
      { name:'Ischemic Stroke (AF)', pct:82, label:'Primary', labelClass:'label-primary', color:'#8b5cf6', primary:true },
      { name:'TIA', pct:11, label:'Differential', labelClass:'label-diff', color:'#f59e0b' },
      { name:'Todd\'s Paresis', pct:5, label:'Differential', labelClass:'label-diff', color:'#00d4ff' },
      { name:'Hypoglycaemia', pct:2, label:'Excluded', labelClass:'label-excluded', color:'#4a6a8a' },
    ],
    diagnosisText: 'Patient presentation consistent with acute ischemic stroke secondary to cardioembolic event (AF-related). NIHSS score 8. MRI DWI confirms right MCA territory ischemia. tPA window is borderline (3.5h). Recommend urgent neurology consultation, evaluate mechanical thrombectomy candidacy, and hold warfarin. Blood pressure target: <185/110 if thrombolysis considered.',
    evidence: [
      { title:'AHA/ASA 2023 Stroke Guidelines', source:'American Heart Association', body:'IV alteplase within 4.5h for eligible ischemic stroke. Hold anticoagulation for 24h post-tPA. BP management critical.' },
      { title:'DAWN Trial — Thrombectomy Window', source:'NEJM, 2018', body:'Mechanical thrombectomy beneficial up to 24h in select patients with clinical-imaging mismatch. NIHSS ≥6 indicates candidacy.' },
    ],
    logSeed: [
      { agent:'Patient Intake', color:'#10b981', msg:'Stroke alert activated. Code Stroke team notified. CT head requested STAT.' },
      { agent:'Diagnostics', color:'#f59e0b', msg:'CT head: no hemorrhage confirmed. MRI ordered. NIHSS assessed at 8.' },
      { agent:'Knowledge Retrieval', color:'#00d4ff', msg:'AHA 2023 stroke pathway and DAWN trial data loaded for thrombectomy eligibility.' },
      { agent:'Clinical Reasoning', color:'#8b5cf6', msg:'Cardioembolic stroke probability 82%. tPA borderline — neurology review required urgently.' },
    ],
    actions: [
      { icon:'🧠', text:'Neurology consult STAT — tPA decision required within 30 min', pri:'high' },
      { icon:'💉', text:'Hold warfarin. BP target <185/110 if tPA considered', pri:'high' },
      { icon:'🏥', text:'Prepare for mechanical thrombectomy evaluation (DAWN criteria)', pri:'med' },
    ],
  },
  {
    id: 'PX-44201', initials: 'PM', name: 'Priya Mehta',
    dob: '14/03/1992', age: 34, gender: 'Female',
    dept: 'Pulmonology — OPD', color: 'linear-gradient(135deg,#10b981,#059669)',
    severity: 'low', admitTime: '09:15',
    chiefComplaint: 'Worsening breathlessness, wheeze for 2 days',
    history: 'Asthma (10y), GERD, seasonal allergies',
    vitals: [
      { label:'Heart Rate', value:'94', unit:'bpm', status:'Mild ↑', statusClass:'flag-norm', trend:'↑ 2%', trendClass:'trend-up', grad:'var(--grad-teal)' },
      { label:'PEFR', value:'320', unit:'L/min', status:'Reduced', statusClass:'flag-high', trend:'↓ 18%', trendClass:'trend-up', grad:'var(--grad-amber)' },
      { label:'SpO₂', value:'95', unit:'%', status:'Borderline', statusClass:'flag-norm', trend:'— stable', trendClass:'trend-ok', grad:'var(--grad-green)' },
      { label:'Eosinophils', value:'640', unit:'/µL', status:'Elevated', statusClass:'flag-high', trend:'↑ 12%', trendClass:'trend-up', grad:'var(--grad-purple)' },
    ],
    labs: [
      { name:'IgE Total', value:'580', unit:'IU/mL', range:'<100', flag:'high', color:'#ef4444', data:[400,430,460,490,520,550,570,580] },
      { name:'PEFR', value:'320', unit:'L/min', range:'400+', flag:'high', color:'#f59e0b', data:[420,410,400,385,360,340,330,320] },
      { name:'SpO₂', value:'95', unit:'%', range:'>95', flag:'norm', color:'#10b981', data:[98,97,97,96,96,95,95,95] },
      { name:'CRP', value:'4.1', unit:'mg/L', range:'<5', flag:'norm', color:'#8b5cf6', data:[2,2.5,3,3.2,3.5,3.8,4,4.1] },
    ],
    flowNodes: [
      { title:'🩺 Patient Intake', body:'Asthma exacerbation trigger: suspected dust/mite allergen exposure during Diwali cleaning.', tags:['Allergen trigger','10yr asthma'], state:'done', delay:0 },
      { title:'🔬 Lab Analysis', body:'IgE markedly elevated. PEFR reduced to 80% predicted. Eosinophilia confirms allergic component.', tags:['IgE ↑↑','PEFR 80%'], state:'done', delay:200 },
      { title:'📚 Knowledge Retrieval', body:'GINA 2023 asthma step-up guidelines retrieved. Biologic therapy eligibility criteria loaded.', tags:['GINA 2023','Biologics'], state:'done', delay:400 },
      { title:'🧠 Clinical Reasoning', body:'Moderate-severe asthma exacerbation. Allergic phenotype — biologic (Dupilumab/Mepolizumab) candidate.', tags:['Biologic candidate','Step 4'], state:'active', delay:600 },
      { title:'📋 Documentation', body:'Outpatient action plan and follow-up schedule pending.', tags:['Pending'], state:'pending', delay:800 },
    ],
    diagnoses: [
      { name:'Asthma Exacerbation', pct:88, label:'Primary', labelClass:'label-primary', color:'#10b981', primary:true },
      { name:'AERD', pct:7, label:'Differential', labelClass:'label-diff', color:'#f59e0b' },
      { name:'COPD overlap', pct:3, label:'Differential', labelClass:'label-diff', color:'#00d4ff' },
      { name:'Vocal Cord Dysfunction', pct:2, label:'Excluded', labelClass:'label-excluded', color:'#4a6a8a' },
    ],
    diagnosisText: 'Moderate-severe allergic asthma exacerbation triggered by aeroallergen exposure. IgE markedly elevated (580 IU/mL), eosinophilia (640/µL), PEFR reduced to 80% predicted. Patient qualifies for biologic therapy assessment (GINA Step 4+). Initiate SABA nebulisation, systemic corticosteroids. Schedule pulmonology follow-up for Dupilumab/Mepolizumab evaluation.',
    evidence: [
      { title:'GINA 2023 Asthma Management Guidelines', source:'Global Initiative for Asthma', body:'Moderate exacerbation: SABA nebulisation, oral prednisolone 40mg for 5 days. Step 4 consideration if uncontrolled on ICS/LABA.' },
      { title:'Dupilumab in Moderate-Severe Asthma', source:'NEJM LIBERTY Trial, 2021', body:'Significant reduction in exacerbation rates in patients with IgE >300 and eosinophils >300/µL. Approved for add-on therapy.' },
    ],
    logSeed: [
      { agent:'Patient Intake', color:'#10b981', msg:'Allergen trigger identified: Diwali cleaning. Spirometry scheduled. Rescue inhaler use confirmed 4× in 2 days.' },
      { agent:'Diagnostics', color:'#f59e0b', msg:'IgE 580 IU/mL — severely elevated. Eosinophilia confirmed. PEFR reduced 18% from personal best.' },
      { agent:'Knowledge Retrieval', color:'#00d4ff', msg:'GINA 2023 and LIBERTY trial data loaded. Biologic eligibility criteria: patient qualifies on IgE and eosinophil criteria.' },
      { agent:'Clinical Reasoning', color:'#8b5cf6', msg:'Asthma exacerbation 88% confidence. Recommend step-up to GINA Step 4 + biologic assessment.' },
    ],
    actions: [
      { icon:'💊', text:'Salbutamol nebulisation 5mg every 20 min × 3, then hourly', pri:'high' },
      { icon:'💉', text:'Prednisolone 40mg oral × 5 days', pri:'med' },
      { icon:'🧬', text:'Biologic therapy referral — Dupilumab or Mepolizumab assessment', pri:'med' },
    ],
  },
];

// ── Agent definitions ─────────────────────────────────
const AGENTS = [
  { id:'intake',     name:'Patient Intake',      icon:'🩺', bg:'rgba(16,185,129,0.12)',  color:'#10b981', status:'active',  tasks:248, accuracy:97.2, desc:'Collects patient history, demographics, chief complaints, and vital signs using structured conversation flows. Handles multilingual Indic language inputs via Sarvam STT.' },
  { id:'reasoning',  name:'Clinical Reasoning',   icon:'🧠', bg:'rgba(139,92,246,0.12)', color:'#8b5cf6', status:'process', tasks:191, accuracy:94.8, desc:'Applies Bayesian inference across all clinical data to generate differential diagnoses, calculate risk stratification scores, and recommend evidence-based treatment pathways.' },
  { id:'knowledge',  name:'Knowledge Retrieval',  icon:'📚', bg:'rgba(0,212,255,0.12)',  color:'#00d4ff', status:'active',  tasks:312, accuracy:99.1, desc:'Retrieves and ranks relevant clinical guidelines, research papers, and protocol documents using RAG over a curated medical knowledge base.' },
  { id:'diagnostics',name:'Diagnostics',           icon:'🔬', bg:'rgba(245,158,11,0.12)', color:'#f59e0b', status:'active',  tasks:176, accuracy:96.3, desc:'Analyzes lab results, imaging reports, ECG data, and vitals trends. Flags critical values and generates structured diagnostic summaries with confidence scores.' },
  { id:'docs',       name:'Documentation',         icon:'📋', bg:'rgba(100,116,139,0.12)',color:'#64748b', status:'standby',tasks:89,  accuracy:98.5, desc:'Auto-generates SOAP notes, discharge summaries, referral letters, and clinical handoff documents. Obtains physician e-signatures and maintains audit trails.' },
];

// ═══════════════════════════════════════════════════════
// ── INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderAgentSidebar();
  renderCaseList();
  animateQuickStats();
  loadPatient(PATIENTS[0]);
  renderPatientsView();
  renderInsightsView();
  renderAgentsView();
  injectVoiceInputBar();
  startLiveLogFeed();
  startAgentStatusBlink();
});

// ═══════════════════════════════════════════════════════
// ── VIEW SWITCHING
// ═══════════════════════════════════════════════════════
function switchView(view, el) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  if (el) el.classList.add('active');
  STATE.currentView = view;
}

// ═══════════════════════════════════════════════════════
// ── SIDEBAR
// ═══════════════════════════════════════════════════════
function renderAgentSidebar() {
  const list = document.getElementById('agent-list');
  list.innerHTML = AGENTS.map((a, i) => `
    <div class="agent-item ${i===0?'selected':''}" id="agent-sb-${a.id}" onclick="selectAgent('${a.id}', this)" style="animation-delay:${i*60}ms">
      <div class="agent-icon" style="background:${a.bg};">${a.icon}</div>
      <div class="agent-meta">
        <div class="agent-meta-name">${a.name}</div>
        <div class="agent-meta-sub">${a.tasks} tasks today</div>
      </div>
      <span class="status-pill ${pillClass(a.status)}" id="pill-${a.id}">${a.status}</span>
    </div>
  `).join('');
}

function pillClass(s) {
  return s==='active'?'pill-active': s==='process'?'pill-process': s==='error'?'pill-error':'pill-standby';
}

function selectAgent(id, el) {
  document.querySelectorAll('.agent-item').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  const a = AGENTS.find(x => x.id===id);
  showAgentModal(a);
}

function renderCaseList() {
  const list = document.getElementById('case-list');
  list.innerHTML = PATIENTS.map((p, i) => `
    <div class="case-item ${i===0?'active-case':''}" id="case-${p.id}" onclick="loadPatient(PATIENTS[${i}], this)">
      <div class="case-avatar" style="background:${p.color}">${p.initials}</div>
      <div class="case-info">
        <div class="case-name">${p.name}</div>
        <div class="case-dept">${p.dept.split('—')[0].trim()}</div>
      </div>
      <span class="case-sev sev-${p.severity}">${p.severity.toUpperCase()}</span>
    </div>
  `).join('');
}

function animateQuickStats() {
  setTimeout(() => {
    animateNum('stat-cases', 0, 47, 0);
    animateNum('stat-acc', 0, 96, 1, '%');
    animateNum('stat-pending', 0, 8, 0);
    animateNum('stat-handoffs', 0, 23, 0);
  }, 300);
}

function animateNum(id, from, to, decimals, suffix='') {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 1200, fps = 40, steps = dur/fps;
  let current = from, step = 0;
  const inc = (to - from) / steps;
  const iv = setInterval(() => {
    current += inc; step++;
    el.textContent = current.toFixed(decimals) + suffix;
    if (step >= steps) { el.textContent = to.toFixed(decimals) + suffix; clearInterval(iv); }
  }, fps);
}

// ═══════════════════════════════════════════════════════
// ── LOAD PATIENT
// ═══════════════════════════════════════════════════════
function loadPatient(p, caseEl) {
  STATE.currentPatient = p;
  // Update case list selection
  document.querySelectorAll('.case-item').forEach(e => e.classList.remove('active-case'));
  if (caseEl) caseEl.classList.add('active-case');
  else { const first = document.getElementById('case-' + p.id); if (first) first.classList.add('active-case'); }

  // Update patient header
  document.getElementById('patient-avatar').textContent = p.initials;
  document.getElementById('patient-avatar').style.background = p.color;
  document.getElementById('patient-name').textContent = p.name;
  document.getElementById('patient-dob').textContent = `DOB: ${p.dob}`;
  document.getElementById('patient-id').textContent = `ID: ${p.id}`;
  document.getElementById('patient-dept').textContent = p.dept;

  // Render sections
  renderVitals(p);
  renderLabs(p);
  renderFlow(p);
  renderDiagnosis(p);
  renderEvidence(p);
  renderActionQueue(p);
  renderConfidenceBars(p);

  // Seed activity log
  STATE.logEntries = [];
  const logEl = document.getElementById('activity-log');
  logEl.innerHTML = '';
  p.logSeed.forEach((entry, i) => {
    setTimeout(() => addLogEntry(entry.agent, entry.msg, entry.color), i * 400);
  });
}

function loadNewPatient() {
  const idx = (PATIENTS.indexOf(STATE.currentPatient) + 1) % PATIENTS.length;
  loadPatient(PATIENTS[idx]);
  showToast('info', '🔄 Case Switched', `Now viewing: ${PATIENTS[idx].name}`);
}

// ═══════════════════════════════════════════════════════
// ── VITALS
// ═══════════════════════════════════════════════════════
function renderVitals(p) {
  document.getElementById('vitals-grid').innerHTML = p.vitals.map(v => `
    <div class="vital-card" style="${v.css||''}">
      <div class="vital-label">${v.label}</div>
      <div><span class="vital-value" style="color:${vitalColor(v.statusClass)}">${v.value}</span><span class="vital-unit">${v.unit}</span></div>
      <div class="vital-footer">
        <span class="vital-status ${v.statusClass}" style="background:${vitalBg(v.statusClass)};color:${vitalColor(v.statusClass)}">${v.status}</span>
        <span class="vital-trend ${v.trendClass}">${v.trend}</span>
      </div>
    </div>
  `).join('');
}

function vitalColor(cls) { return cls==='flag-high'?'var(--red)': cls==='flag-low'?'var(--amber)': 'var(--green)'; }
function vitalBg(cls)    { return cls==='flag-high'?'var(--red-dim)': cls==='flag-low'?'var(--amber-dim)': 'var(--green-dim)'; }

// ═══════════════════════════════════════════════════════
// ── LABS (with mini Chart.js sparklines)
// ═══════════════════════════════════════════════════════
function renderLabs(p) {
  // Destroy old charts
  Object.values(STATE.labCharts).forEach(c => c.destroy());
  STATE.labCharts = {};

  document.getElementById('lab-list').innerHTML = p.labs.map(l => `
    <div class="lab-item">
      <div class="lab-header">
        <span class="lab-name">${l.name}</span>
        <span class="lab-value flag-${l.flag}">${l.value} <span class="lab-range">${l.unit}</span></span>
      </div>
      <div class="lab-range">Ref: ${l.range}</div>
      <div class="lab-chart-wrap"><canvas id="chart-${l.name.replace(/\s/g,'_').replace(/[^a-z0-9_]/gi,'')}" height="40"></canvas></div>
    </div>
  `).join('');

  p.labs.forEach(l => {
    const id = 'chart-' + l.name.replace(/\s/g,'_').replace(/[^a-z0-9_]/gi,'');
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    STATE.labCharts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['4h','8h','12h','16h','18h','20h','22h','Now'],
        datasets: [{
          data: l.data,
          borderColor: l.color,
          backgroundColor: l.color + '20',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display:false }, tooltip: { enabled:false } },
        scales: { x:{ display:false }, y:{ display:false } },
        animation: { duration: 800 },
      }
    });
  });
}

// ═══════════════════════════════════════════════════════
// ── REASONING FLOW
// ═══════════════════════════════════════════════════════
function renderFlow(p) {
  const el = document.getElementById('reasoning-flow');
  el.innerHTML = '';
  p.flowNodes.forEach((n, i) => {
    const node = document.createElement('div');
    node.className = `flow-node ${n.state}`;
    node.style.animationDelay = n.delay + 'ms';
    node.innerHTML = `
      <div class="flow-node-title">
        ${n.title}
        <span style="margin-left:auto;font-size:0.62rem;font-weight:700;color:${stateColor(n.state)}">${stateLabel(n.state)}</span>
      </div>
      <div class="flow-node-body">${n.body}</div>
      <div class="flow-node-tags">${n.tags.map(t=>`<span class="flow-tag ${n.state==='done'?'hot':''}">${t}</span>`).join('')}</div>
    `;
    el.appendChild(node);
    if (i < p.flowNodes.length - 1) {
      const arrow = document.createElement('div');
      arrow.className = 'flow-arrow';
      el.appendChild(arrow);
    }
  });
}

function stateColor(s) { return s==='done'?'var(--green)': s==='active'?'var(--teal)': 'var(--text-muted)'; }
function stateLabel(s) { return s==='done'?'✓ Done': s==='active'?'● Live': '○ Pending'; }

// ═══════════════════════════════════════════════════════
// ── DIAGNOSIS
// ═══════════════════════════════════════════════════════
function renderDiagnosis(p) {
  const conf = p.diagnoses[0].pct;
  document.getElementById('conf-badge').textContent = conf + '% confidence';
  document.getElementById('conf-badge').style.background = conf>=75 ? 'var(--green-dim)' : 'var(--amber-dim)';
  document.getElementById('conf-badge').style.color = conf>=75 ? 'var(--green)' : 'var(--amber)';

  document.getElementById('diagnosis-content').innerHTML = `
    ${p.diagnoses.map(d => `
      <div class="diag-hypothesis${d.primary?' primary':''}">
        <div class="diag-name">${d.name}</div>
        <div class="diag-prob-bar"><div class="diag-prob-fill" style="width:0%;background:${d.color}" data-target="${d.pct}"></div></div>
        <div class="diag-pct" style="color:${d.color}">${d.pct}%</div>
        <span class="diag-label ${d.labelClass}">${d.label}</span>
      </div>
    `).join('')}
    <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;padding:0.75rem 0.9rem;margin-top:0.25rem;">
      <div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.07em;">AI Reasoning Summary</div>
      <div style="font-size:0.77rem;color:var(--text-secondary);line-height:1.55">${p.diagnosisText}</div>
    </div>
    <div class="diag-actions">
      <button class="btn-tts" id="btn-tts-diag" onclick="speakDiagnosis()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        Read Aloud (Bulbul TTS)
      </button>
      <button class="btn-ghost" onclick="translateDiagnosis()">🌐 Translate to Hindi</button>
      <button class="btn-primary" onclick="approveDiagnosis()">✓ Sign Off</button>
    </div>
  `;

  // Animate progress bars
  setTimeout(() => {
    document.querySelectorAll('.diag-prob-fill').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 100);
}

function renderEvidence(p) {
  document.getElementById('evidence-list').innerHTML = p.evidence.map(e => `
    <div class="evidence-item">
      <div class="ev-title">${e.title}</div>
      <div class="ev-source">📖 ${e.source}</div>
      <div class="ev-body">${e.body}</div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════
// ── ACTIVITY LOG
// ═══════════════════════════════════════════════════════
function addLogEntry(agent, msg, color) {
  const now = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const el  = document.getElementById('activity-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry new';
  entry.innerHTML = `
    <div class="log-time">${now}</div>
    <div class="log-agent" style="color:${color}">${agent}</div>
    <div class="log-msg">${msg}</div>
  `;
  el.prepend(entry);
  setTimeout(() => entry.classList.remove('new'), 2000);
  STATE.logEntries.unshift({ agent, msg, color, time: now });
  // cap log at 30
  while (el.children.length > 30) el.removeChild(el.lastChild);
}

function startLiveLogFeed() {
  const feeds = [
    { agent:'Diagnostics',        color:'#f59e0b', msgs:['Vital signs updated across all active cases.','Lab values auto-refreshed from HIS integration.','Flagged 2 critical troponin values for urgent review.'] },
    { agent:'Knowledge Retrieval', color:'#00d4ff', msgs:['Guidelines cache refreshed — 847 documents indexed.','New Lancet cardiology study ingested and chunked.','RAG retrieval latency: 124ms average.'] },
    { agent:'Clinical Reasoning',  color:'#8b5cf6', msgs:['Bayesian model updated with latest lab deltas.','Risk score recalculated: PX-30491 remains HIGH.','Confidence intervals recalibrated across 3 active cases.'] },
    { agent:'Patient Intake',      color:'#10b981', msgs:['New patient registered: OPD queue intake complete.','Family contact updated for PX-19872.','Allergy verification completed for PX-44201.'] },
    { agent:'Documentation',       color:'#64748b', msgs:['SOAP note draft generated for physician review.','Referral letter sent to Cardiology — Dr. Mehta.','Audit trail updated with agent handoff timestamps.'] },
  ];

  setInterval(() => {
    if (STATE.currentView !== 'dashboard' && STATE.currentView !== '') return;
    const f   = feeds[Math.floor(Math.random() * feeds.length)];
    const msg = f.msgs[Math.floor(Math.random() * f.msgs.length)];
    addLogEntry(f.agent, msg, f.color);
  }, 6000);
}

function startAgentStatusBlink() {
  setInterval(() => {
    // Random agent transitions
    const transitions = [
      ['reasoning', 'process'], ['reasoning', 'active'],
      ['diagnostics', 'active'], ['intake', 'process'], ['intake', 'active'],
    ];
    const [id, status] = transitions[Math.floor(Math.random() * transitions.length)];
    const pill = document.getElementById('pill-' + id);
    if (pill) {
      pill.className = `status-pill ${pillClass(status)}`;
      pill.textContent = status;
    }
    const agent = AGENTS.find(a => a.id === id);
    if (agent) agent.status = status;
  }, 8000);
}

// ═══════════════════════════════════════════════════════
// ── RIGHT PANEL
// ═══════════════════════════════════════════════════════
function renderActionQueue(p) {
  document.getElementById('pending-count').textContent = p.actions.length;
  document.getElementById('action-queue').innerHTML = p.actions.map(a => `
    <div class="action-item">
      <div class="action-icon">${a.icon}</div>
      <div>
        <div class="action-pri ${a.pri}">${a.pri.toUpperCase()} PRIORITY</div>
        <div class="action-text">${a.text}</div>
      </div>
    </div>
  `).join('');
}

function renderConfidenceBars(p) {
  const agentConf = [
    { name:'Patient Intake',     pct:97, color:'var(--green)'  },
    { name:'Knowledge Retrieval',pct:99, color:'var(--teal)'   },
    { name:'Diagnostics',        pct:94, color:'var(--amber)'  },
    { name:'Clinical Reasoning', pct:p.diagnoses[0].pct, color:'var(--purple)' },
    { name:'Documentation',      pct:88, color:'#64748b'        },
  ];
  document.getElementById('confidence-bars').innerHTML = agentConf.map(a => `
    <div class="conf-item">
      <div class="conf-header">
        <span class="conf-name">${a.name}</span>
        <span class="conf-pct" style="color:${a.color}">${a.pct}%</span>
      </div>
      <div class="conf-track">
        <div class="conf-fill" style="width:0%;background:${a.color}" data-target="${a.pct}"></div>
      </div>
    </div>
  `).join('');
  setTimeout(() => {
    document.querySelectorAll('.conf-fill').forEach(b => b.style.width = b.dataset.target + '%');
  }, 200);
}

function clearNotes() { document.getElementById('clinical-notes').value = ''; }

// ═══════════════════════════════════════════════════════
// ── VOICE INPUT BAR (Saaras STT)
// ═══════════════════════════════════════════════════════
function injectVoiceInputBar() {
  const header = document.getElementById('patient-header');
  const bar = document.createElement('div');
  bar.className = 'voice-input-bar';
  bar.id = 'voice-input-bar';
  bar.innerHTML = `
    <button class="mic-btn" id="mic-btn" onclick="toggleRecording()" title="Record voice note (Sarvam Saaras STT)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    </button>
    <input type="text" class="voice-input-text" id="voice-input-text" placeholder="Speak or type a clinical query — Sarvam Saaras STT active..." />
    <select class="lang-select" id="lang-select">
      <option value="en-IN">English</option>
      <option value="hi-IN">Hindi</option>
      <option value="ta-IN">Tamil</option>
      <option value="te-IN">Telugu</option>
      <option value="kn-IN">Kannada</option>
      <option value="mr-IN">Marathi</option>
      <option value="bn-IN">Bengali</option>
      <option value="gu-IN">Gujarati</option>
    </select>
    <button class="btn-primary" onclick="submitVoiceQuery()" style="white-space:nowrap;">
      Ask Sarvam AI
    </button>
  `;
  header.insertAdjacentElement('afterend', bar);
}

async function toggleRecording() {
  if (STATE.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    STATE.recordingChunks = [];
    STATE.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    STATE.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) STATE.recordingChunks.push(e.data); };
    STATE.mediaRecorder.onstop = () => transcribeAudio(stream);
    STATE.mediaRecorder.start();
    STATE.isRecording = true;
    const btn = document.getElementById('mic-btn');
    btn.classList.add('recording');
    btn.title = 'Recording… click to stop';
    document.getElementById('voice-input-text').placeholder = '🔴 Recording… speak your clinical query…';
    showToast('info','🎙️ Recording Started','Speak your clinical observation. Click the mic to stop.');
  } catch (err) {
    showToast('error','🎙️ Microphone Error', 'Could not access microphone: ' + err.message);
  }
}

function stopRecording() {
  if (STATE.mediaRecorder && STATE.mediaRecorder.state !== 'inactive') {
    STATE.mediaRecorder.stop();
    STATE.isRecording = false;
    const btn = document.getElementById('mic-btn');
    btn.classList.remove('recording');
    btn.title = 'Record voice note';
    document.getElementById('voice-input-text').placeholder = 'Transcribing with Sarvam Saaras…';
  }
}

async function transcribeAudio(stream) {
  try {
    showToast('info','⏳ Transcribing','Sarvam Saaras STT processing audio…');
    stream.getTracks().forEach(t => t.stop());

    const blob = new Blob(STATE.recordingChunks, { type: 'audio/webm' });
    const lang = document.getElementById('lang-select').value;

    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('language_code', lang);
    formData.append('model', 'saaras:v3');

    const resp = await fetch(`${SARVAM_BASE}/speech-to-text`, {
      method: 'POST',
      headers: { 'api-subscription-key': SARVAM_API_KEY },
      body: formData,
    });

    if (!resp.ok) {
      let errMsg = `STT error: ${resp.status}`;
      try {
        const errJson = await resp.json();
        if (errJson?.error?.message) errMsg = errJson.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }
    const data = await resp.json();
    const transcript = data.transcript || data.text || '';
    document.getElementById('voice-input-text').value = transcript;
    document.getElementById('voice-input-text').placeholder = 'Speak or type a clinical query…';
    showToast('success','✅ Transcription Complete','Saaras STT: "' + transcript.substring(0,60) + (transcript.length>60?'…':'') + '"');

    if (transcript.trim()) setTimeout(() => submitVoiceQuery(), 300);
  } catch (err) {
    document.getElementById('voice-input-text').placeholder = 'Speak or type a clinical query…';
    showToast('error','STT Failed', err.message + '. Check API key & network.');
    console.error(err);
  }
}

// ═══════════════════════════════════════════════════════
// ── SARVAM-105B CLINICAL QUERY
// ═══════════════════════════════════════════════════════
async function submitVoiceQuery() {
  const query = document.getElementById('voice-input-text').value.trim();
  if (!query) { showToast('warn','Empty Query','Please type or speak a clinical query.'); return; }

  const p = STATE.currentPatient;
  const systemPrompt = `You are a specialized clinical AI agent in a multi-agent system called ClinixAI. 
You have access to the following patient context:
- Patient: ${p.name}, Age ${p.age}, ${p.gender}
- Dept: ${p.dept}
- Chief Complaint: ${p.chiefComplaint}
- History: ${p.history}
- Key Labs: ${p.labs.map(l=>`${l.name}: ${l.value} ${l.unit} (${l.flag==='high'?'HIGH':'Normal'})`).join(', ')}
- Primary diagnosis: ${p.diagnoses[0].name} (${p.diagnoses[0].pct}% confidence)

Answer clinically, concisely and accurately. Use evidence-based reasoning. Respond in 2-4 sentences maximum.`;

  showToast('info','🧠 Sarvam-105B','Processing clinical query…');
  addLogEntry('Clinical Reasoning', `New query received: "${query.substring(0,50)}…"`, '#8b5cf6');
  document.getElementById('voice-input-text').value = '';

  try {
    const resp = await fetch(`${SARVAM_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sarvam-105b-conversations',
        messages: [
          { role:'system', content: systemPrompt },
          { role:'user',   content: query },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      let errMsg = `LLM error: ${resp.status}`;
      try {
        const errJson = await resp.json();
        if (errJson?.error?.message) errMsg = errJson.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }
    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || 'No response.';

    addLogEntry('Clinical Reasoning', answer, '#8b5cf6');
    openQueryModal(query, answer);
  } catch (err) {
    showToast('error','LLM Error', err.message);
    addLogEntry('Clinical Reasoning', 'Query failed: ' + err.message, '#ef4444');
    console.error(err);
  }
}

function openQueryModal(query, answer) {
  document.getElementById('modal-title').textContent = '🧠 Sarvam-105B Clinical Response';
  document.getElementById('modal-body').innerHTML = `
    <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;padding:0.8rem 1rem;">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:0.35rem">Query</div>
      <div style="font-size:0.82rem;color:var(--text-secondary)">"${query}"</div>
    </div>
    <div style="background:var(--teal-dim);border:1px solid rgba(0,212,255,0.25);border-radius:9px;padding:0.9rem 1rem;">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--teal);margin-bottom:0.4rem">🧠 ClinixAI Response (Sarvam-105B)</div>
      <div style="font-size:0.85rem;line-height:1.6;color:var(--text-primary)">${answer}</div>
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:0.25rem;">
      <button class="btn-tts" onclick="speakText('${escapeAttr(answer)}','en-IN')" style="flex:1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        Read via Bulbul TTS
      </button>
      <button class="btn-ghost" onclick="translateAndShowModal('${escapeAttr(answer)}')">🌐 Translate</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

// ═══════════════════════════════════════════════════════
// ── BULBUL TTS
// ═══════════════════════════════════════════════════════
async function speakDiagnosis() {
  const p = STATE.currentPatient;
  const text = `Diagnosis for ${p.name}: ${p.diagnosisText}`;
  await speakText(text, 'en-IN');
}

async function speakText(text, lang) {
  if (STATE.ttsPlaying) {
    if (STATE.ttsAudio) { STATE.ttsAudio.pause(); STATE.ttsAudio = null; }
    STATE.ttsPlaying = false;
    const btn = document.getElementById('btn-tts-diag');
    if (btn) { btn.classList.remove('playing'); btn.innerHTML = btn.innerHTML.replace('Stop','Read Aloud (Bulbul TTS)'); }
    return;
  }

  const btn = document.getElementById('btn-tts-diag');
  if (btn) btn.classList.add('playing');
  showToast('info','🔊 Bulbul TTS','Generating audio with Sarvam Bulbul…');

  try {
    // Clean text — strip HTML entities
    const cleanText = text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").substring(0, 500);

    const resp = await fetch(`${SARVAM_BASE}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [cleanText],
        target_language_code: lang || 'en-IN',
        speaker: 'priya',
        model: 'bulbul:v3',
        enable_preprocessing: true,
      }),
    });

    if (!resp.ok) {
      let errMsg = `TTS error: ${resp.status}`;
      try {
        const errJson = await resp.json();
        if (errJson?.error?.message) errMsg = errJson.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }
    const data = await resp.json();
    const b64  = data.audios?.[0];
    if (!b64) throw new Error('No audio returned');

    const binary = atob(b64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url  = URL.createObjectURL(blob);

    STATE.ttsAudio = new Audio(url);
    STATE.ttsPlaying = true;
    STATE.ttsAudio.play();
    showToast('success','🔊 Playing','Bulbul TTS audio ready');

    STATE.ttsAudio.onended = () => {
      STATE.ttsPlaying = false;
      if (btn) btn.classList.remove('playing');
      URL.revokeObjectURL(url);
    };
  } catch (err) {
    STATE.ttsPlaying = false;
    if (btn) btn.classList.remove('playing');
    showToast('error','TTS Failed', err.message);
    console.error(err);
  }
}

// ═══════════════════════════════════════════════════════
// ── SARVAM TRANSLATE
// ═══════════════════════════════════════════════════════
async function translateDiagnosis() {
  const p = STATE.currentPatient;
  await translateAndShowModal(p.diagnosisText);
}

async function translateAndShowModal(text) {
  closeModal();
  showToast('info','🌐 Translating','Sarvam Translate processing…');
  try {
    const resp = await fetch(`${SARVAM_BASE}/translate`, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.substring(0, 1000),
        source_language_code: 'en-IN',
        target_language_code: 'hi-IN',
        model: 'mayura:v1',
        enable_preprocessing: false,
      }),
    });
    if (!resp.ok) {
      let errMsg = `Translate error: ${resp.status}`;
      try {
        const errJson = await resp.json();
        if (errJson?.error?.message) errMsg = errJson.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }
    const data = await resp.json();
    const translated = data.translated_text || 'Translation unavailable.';

    document.getElementById('modal-title').textContent = '🌐 Hindi Translation (Sarvam Mayura)';
    document.getElementById('modal-body').innerHTML = `
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;padding:0.8rem 1rem;">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:0.35rem">Original (English)</div>
        <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.5">${text.substring(0,300)}…</div>
      </div>
      <div style="background:var(--purple-dim);border:1px solid rgba(139,92,246,0.3);border-radius:9px;padding:0.9rem 1rem;">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--purple);margin-bottom:0.4rem">हिन्दी अनुवाद (Sarvam Mayura)</div>
        <div style="font-size:0.9rem;line-height:1.7;color:var(--text-primary);font-family:'Noto Sans Devanagari',sans-serif">${translated}</div>
      </div>
      <button class="btn-tts" onclick="speakText('${escapeAttr(translated)}','hi-IN')" style="width:100%">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        हिंदी में सुनें — Bulbul TTS
      </button>
    `;
    document.getElementById('modal-overlay').classList.add('open');
    showToast('success','✅ Translation Complete','Hindi output ready — powered by Sarvam Mayura');
  } catch (err) {
    showToast('error','Translation Failed', err.message);
    console.error(err);
  }
}

// ═══════════════════════════════════════════════════════
// ── RUN FULL ANALYSIS (simulate multi-agent orchestration)
// ═══════════════════════════════════════════════════════
async function runFullAnalysis() {
  if (STATE.analysisRunning) return;
  STATE.analysisRunning = true;
  const p = STATE.currentPatient;
  showToast('info','🤖 Analysis Started','All 5 clinical agents mobilized for ' + p.name);

  const steps = [
    { delay:0,    agent:'Patient Intake',      color:'#10b981', msg:`Patient data verified. Risk profile computed. ${p.chiefComplaint}.` },
    { delay:1200, agent:'Knowledge Retrieval', color:'#00d4ff', msg:`Retrieved 5 clinical guidelines. RAG confidence: 98.4%. Evidence ranked.` },
    { delay:2400, agent:'Diagnostics',         color:'#f59e0b', msg:`Lab trends analyzed. ${p.labs.filter(l=>l.flag==='high').map(l=>l.name+' elevated').join(', ')}. Critical flags raised.` },
    { delay:3600, agent:'Clinical Reasoning',  color:'#8b5cf6', msg:`Bayesian inference complete. Primary: ${p.diagnoses[0].name} (${p.diagnoses[0].pct}%). Confidence interval: ±4%.` },
    { delay:4800, agent:'Documentation',       color:'#64748b', msg:`SOAP note generated. Discharge plan drafted. Physician sign-off requested.` },
  ];

  steps.forEach(s => {
    setTimeout(() => {
      addLogEntry(s.agent, s.msg, s.color);
      if (s.delay === 4800) {
        STATE.analysisRunning = false;
        showToast('success','✅ Analysis Complete',`Multi-agent analysis complete for ${p.name}. Confidence: ${p.diagnoses[0].pct}%`);
      }
    }, s.delay);
  });
}

function approveDiagnosis() {
  showToast('success','✅ Signed Off', `Diagnosis approved by Dr. Elara Vance at ${new Date().toLocaleTimeString('en-IN')}`);
  addLogEntry('Documentation', 'Physician sign-off recorded. Case status updated to REVIEWED.', '#64748b');
}

function loadEvidence() {
  renderEvidence(STATE.currentPatient);
  showToast('info','📖 Evidence Refreshed', 'Knowledge base queried. Citations up to date.');
}

// ═══════════════════════════════════════════════════════
// ── PATIENTS VIEW
// ═══════════════════════════════════════════════════════
function renderPatientsView() {
  document.getElementById('patients-grid').innerHTML = PATIENTS.map((p, i) => `
    <div class="patient-card" onclick="loadPatient(PATIENTS[${i}]);switchView('dashboard',document.querySelector('[data-view=dashboard]'))">
      <div class="pc-header">
        <div class="user-avatar" style="width:44px;height:44px;font-size:0.85rem;background:${p.color}">${p.initials}</div>
        <div>
          <div style="font-weight:700;font-size:0.9rem">${p.name}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary)">${p.id} · Age ${p.age}, ${p.gender}</div>
        </div>
        <span class="case-sev sev-${p.severity}" style="margin-left:auto">${p.severity.toUpperCase()}</span>
      </div>
      <div class="pc-body">
        <div class="pc-row"><span class="pc-label">Department</span><span class="pc-value" style="font-size:0.72rem">${p.dept}</span></div>
        <div class="pc-row"><span class="pc-label">Admitted</span><span class="pc-value">${p.admitTime}</span></div>
        <div class="pc-row"><span class="pc-label">Chief Complaint</span><span class="pc-value" style="font-size:0.7rem;text-align:right;max-width:160px">${p.chiefComplaint}</span></div>
        <div class="pc-row"><span class="pc-label">Primary Dx</span><span class="pc-value" style="color:var(--teal)">${p.diagnoses[0].name}</span></div>
        <div class="pc-row"><span class="pc-label">AI Confidence</span><span class="pc-value" style="color:var(--green)">${p.diagnoses[0].pct}%</span></div>
      </div>
      <div class="pc-footer">
        ${p.flowNodes.filter(n=>n.state==='done').map(n=>`<span class="flow-tag hot" style="font-size:0.62rem">${n.title.split(' ').slice(1).join(' ')}: ✓</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════
// ── INSIGHTS VIEW (Chart.js)
// ═══════════════════════════════════════════════════════
function renderInsightsView() {
  document.getElementById('insights-grid').innerHTML = `
    <div class="panel insight-chart-panel">
      <div class="panel-header"><h2 class="panel-title">Agent Accuracy Trends</h2><span class="panel-badge">7 days</span></div>
      <div class="chart-wrap"><canvas id="chart-accuracy"></canvas></div>
    </div>
    <div class="panel insight-chart-panel">
      <div class="panel-header"><h2 class="panel-title">Case Volume by Department</h2><span class="panel-badge">Today</span></div>
      <div class="chart-wrap"><canvas id="chart-volume"></canvas></div>
    </div>
    <div class="panel insight-chart-panel">
      <div class="panel-header"><h2 class="panel-title">Diagnosis Confidence Distribution</h2><span class="panel-badge">All cases</span></div>
      <div class="chart-wrap"><canvas id="chart-confidence"></canvas></div>
    </div>
    <div class="panel insight-chart-panel">
      <div class="panel-header"><h2 class="panel-title">Agent Handoffs per Hour</h2><span class="panel-badge">Live</span></div>
      <div class="chart-wrap"><canvas id="chart-handoffs"></canvas></div>
    </div>
  `;

  setTimeout(() => {
    const grid = ['rgb(0,212,255)','rgb(139,92,246)','rgb(16,185,129)','rgb(245,158,11)','rgb(100,116,139)'];

    // Accuracy
    new Chart(document.getElementById('chart-accuracy'), {
      type:'line',
      data:{
        labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: AGENTS.map((a,i)=>({
          label: a.name, borderColor: grid[i], backgroundColor: grid[i]+'18',
          data: Array.from({length:7},()=>90+Math.random()*9),
          borderWidth:2, tension:0.4, pointRadius:3, fill:false
        }))
      },
      options: insightOptions('Accuracy (%)', 85, 100)
    });

    // Volume (bar)
    new Chart(document.getElementById('chart-volume'), {
      type:'bar',
      data:{
        labels:['Cardiology','Neurology','Pulmonology','Oncology','Ortho','General'],
        datasets:[{
          label:'Cases',
          data:[14,9,12,7,5,8],
          backgroundColor: ['#00d4ff33','#8b5cf633','#10b98133','#f59e0b33','#ef444433','#64748b33'],
          borderColor:     ['#00d4ff','#8b5cf6','#10b981','#f59e0b','#ef4444','#64748b'],
          borderWidth:1.5, borderRadius:6,
        }]
      },
      options: insightOptions('Cases', 0, 20)
    });

    // Confidence doughnut
    new Chart(document.getElementById('chart-confidence'), {
      type:'doughnut',
      data:{
        labels:['90-100%','75-90%','60-75%','<60%'],
        datasets:[{
          data:[42,28,18,12],
          backgroundColor:['#00d4ff40','#10b98140','#f59e0b40','#ef444440'],
          borderColor:    ['#00d4ff','#10b981','#f59e0b','#ef4444'],
          borderWidth:2,
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ color:'#7a9cc0', font:{size:11}, boxWidth:12 } } },
        cutout:'65%',
      }
    });

    // Handoffs (bar)
    const hours = Array.from({length:12},(_,i)=>`${8+i}:00`);
    new Chart(document.getElementById('chart-handoffs'), {
      type:'bar',
      data:{
        labels: hours,
        datasets:[{
          label:'Handoffs',
          data: hours.map(()=>Math.floor(2+Math.random()*8)),
          backgroundColor:'#8b5cf640', borderColor:'#8b5cf6', borderWidth:1.5, borderRadius:4,
        }]
      },
      options: insightOptions('Handoffs/hr', 0, 12)
    });
  }, 100);
}

function insightOptions(ylabel, min, max) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:'#7a9cc0', font:{size:10}, boxWidth:10 } } },
    scales:{
      x:{ grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#4a6a8a', font:{size:10} } },
      y:{ min, max, grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#4a6a8a', font:{size:10} } }
    }
  };
}

// ═══════════════════════════════════════════════════════
// ── AGENTS VIEW
// ═══════════════════════════════════════════════════════
function renderAgentsView() {
  document.getElementById('agents-control-grid').innerHTML = AGENTS.map((a,i) => `
    <div class="agent-control-card" id="ac-${a.id}">
      <div class="ac-header">
        <div class="ac-icon" style="background:${a.bg}">${a.icon}</div>
        <div>
          <div class="ac-name">${a.name}</div>
          <span class="status-pill ${pillClass(a.status)}" id="ac-pill-${a.id}">${a.status}</span>
        </div>
      </div>
      <div class="ac-desc">${a.desc}</div>
      <div class="ac-stats">
        <div class="ac-stat"><div class="ac-stat-val" style="color:${a.color}">${a.tasks}</div><div class="ac-stat-lbl">Tasks Today</div></div>
        <div class="ac-stat"><div class="ac-stat-val" style="color:var(--green)">${a.accuracy}%</div><div class="ac-stat-lbl">Accuracy</div></div>
        <div class="ac-stat"><div class="ac-stat-val" style="color:var(--amber)">${Math.floor(80+Math.random()*200)}ms</div><div class="ac-stat-lbl">Avg Latency</div></div>
        <div class="ac-stat"><div class="ac-stat-val" style="color:var(--purple)">${Math.floor(1+Math.random()*5)}</div><div class="ac-stat-lbl">Active Cases</div></div>
      </div>
      <div class="ac-actions">
        <button class="btn-agent-toggle ${a.status!=='standby'?'active':''}" id="ac-toggle-${a.id}" onclick="toggleAgent('${a.id}')">
          ${a.status!=='standby'?'Pause Agent':'Activate'}
        </button>
        <button class="btn-ghost-sm" onclick="showAgentModal(AGENTS.find(x=>x.id==='${a.id}'))">Details</button>
      </div>
    </div>
  `).join('');
}

function toggleAgent(id) {
  const a = AGENTS.find(x=>x.id===id);
  if (!a) return;
  const wasActive = a.status !== 'standby';
  a.status = wasActive ? 'standby' : 'active';
  const pill = document.getElementById('ac-pill-' + id);
  const toggle = document.getElementById('ac-toggle-' + id);
  const sbPill = document.getElementById('pill-' + id);
  if (pill) { pill.className = `status-pill ${pillClass(a.status)}`; pill.textContent = a.status; }
  if (toggle) { toggle.textContent = a.status==='standby'?'Activate':'Pause Agent'; toggle.classList.toggle('active', a.status!=='standby'); }
  if (sbPill) { sbPill.className = `status-pill ${pillClass(a.status)}`; sbPill.textContent = a.status; }
  showToast(a.status==='active'?'success':'warn', a.status==='active'?'✅ Agent Activated':'⏸️ Agent Paused', `${a.name} is now ${a.status}.`);
}

// ═══════════════════════════════════════════════════════
// ── AGENT MODAL
// ═══════════════════════════════════════════════════════
function showAgentModal(a) {
  if (!a) return;
  document.getElementById('modal-title').textContent = `${a.icon} ${a.name}`;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--bg-card2);border-radius:9px;border:1px solid var(--border)">
      <div style="width:50px;height:50px;border-radius:12px;background:${a.bg};display:grid;place-items:center;font-size:1.5rem">${a.icon}</div>
      <div>
        <div style="font-weight:700;font-size:1rem">${a.name}</div>
        <span class="status-pill ${pillClass(a.status)}" style="display:inline-block;margin-top:4px">${a.status}</span>
      </div>
    </div>
    <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;padding:0.8rem 1rem;">
      <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:0.4rem">Description</div>
      <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.55">${a.desc}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;padding:0.7rem;">
        <div style="font-size:1.2rem;font-weight:800;color:${a.color}">${a.tasks}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">Tasks Today</div>
      </div>
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;padding:0.7rem;">
        <div style="font-size:1.2rem;font-weight:800;color:var(--green)">${a.accuracy}%</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">Accuracy</div>
      </div>
    </div>
    <div style="background:var(--teal-dim);border:1px solid rgba(0,212,255,0.2);border-radius:9px;padding:0.75rem;">
      <div style="font-size:0.7rem;color:var(--teal);font-weight:700;margin-bottom:0.3rem">Sarvam API Integration</div>
      <div style="font-size:0.75rem;color:var(--text-secondary)">
        ${a.id==='intake'     ? '🎙️ Saaras v3 STT — Multilingual voice capture<br>🌐 Sarvam Mayura — Translation for Indic languages' : ''}
        ${a.id==='reasoning'  ? '🧠 Sarvam-105B LLM — Bayesian differential diagnosis<br>📊 Chain-of-thought clinical reasoning pipeline' : ''}
        ${a.id==='knowledge'  ? '📚 Sarvam-105B RAG — Evidence retrieval & ranking<br>🔍 Semantic search over medical knowledge base' : ''}
        ${a.id==='diagnostics'? '🔬 Sarvam-105B — Lab trend analysis & flag detection<br>📈 Statistical anomaly detection over vitals' : ''}
        ${a.id==='docs'       ? '📋 Sarvam-105B — SOAP note generation<br>🔊 Bulbul v3 TTS — Dictation readback for physicians' : ''}
      </div>
    </div>
    <button class="btn-primary" style="width:100%" onclick="toggleAgent('${a.id}');closeModal()">
      ${a.status==='standby'?'Activate Agent':'Pause Agent'}
    </button>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

// ═══════════════════════════════════════════════════════
// ── MODAL
// ═══════════════════════════════════════════════════════
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════
// ── TOAST
// ═══════════════════════════════════════════════════════
function showToast(type, title, msg) {
  const icons = { success:'✅', error:'❌', info:'💡', warn:'⚠️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]||'ℹ️'}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

// ═══════════════════════════════════════════════════════
// ── UTILS
// ═══════════════════════════════════════════════════════
function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g,'&quot;').replace(/\n/g,' ');
}

// ═══════════════════════════════════════════════════════
// ── SPLASH SCREEN
// ═══════════════════════════════════════════════════════
const SPLASH_STEPS = [
  'Connecting to Sarvam AI APIs…',
  'Loading Saaras STT engine…',
  'Initializing Bulbul TTS voices…',
  'Bootstrapping clinical knowledge base…',
  'Activating 5 specialized agents…',
  'Ready. Welcome to ClinixAI.',
];
const SPLASH_AGENT_NAMES = ['Patient Intake','Knowledge Retrieval','Diagnostics','Clinical Reasoning','Documentation'];

function runSplash() {
  const row = document.getElementById('splash-agents-row');
  const prog = document.getElementById('splash-progress');
  const loadText = document.getElementById('splash-loading-text');

  // Render agent chips
  row.innerHTML = SPLASH_AGENT_NAMES.map((n,i) =>
    `<div class="splash-agent-chip" id="sc-${i}"><span class="chip-dot"></span>${n}</div>`
  ).join('');

  let step = 0;
  function tick() {
    if (step >= SPLASH_STEPS.length) {
      setTimeout(hideSplash, 400);
      return;
    }
    loadText.textContent = SPLASH_STEPS[step];
    prog.style.width = ((step + 1) / SPLASH_STEPS.length * 100) + '%';
    // Light up corresponding agent chip
    const chipEl = document.getElementById('sc-' + (step - 1));
    if (chipEl) chipEl.classList.add('loaded');
    step++;
    setTimeout(tick, step === SPLASH_STEPS.length ? 200 : 480);
  }
  setTimeout(tick, 200);
}

function hideSplash() {
  // Light up all remaining chips
  SPLASH_AGENT_NAMES.forEach((_,i) => {
    const c = document.getElementById('sc-' + i);
    if (c) c.classList.add('loaded');
  });
  const overlay = document.getElementById('splash-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 700);
  }
}

// ═══════════════════════════════════════════════════════
// ── LIVE ECG WAVEFORM
// ═══════════════════════════════════════════════════════
let ECG_ANIM_ID = null;

function startECG(bpm) {
  const canvas = document.getElementById('ecg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Match display size
  canvas.width = canvas.offsetWidth * window.devicePixelRatio || 800;
  canvas.height = 80 * window.devicePixelRatio || 80;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const W = canvas.offsetWidth || 800;
  const H = 80;
  const cycleLen = Math.floor(W / 2.5);

  // ECG waveform shape (normalized 0→1 fraction of cycle)
  function ecgY(t) {
    const x = (t % cycleLen) / cycleLen;
    if (x < 0.10) return 0;
    if (x < 0.14) return -0.08 * Math.sin((x - 0.10) / 0.04 * Math.PI); // P wave
    if (x < 0.22) return 0;
    if (x < 0.24) return -0.15; // Q dip
    if (x < 0.26) return 1.0;   // R spike
    if (x < 0.28) return -0.25; // S dip
    if (x < 0.32) return 0;
    if (x < 0.42) return 0.08 * Math.sin((x - 0.32) / 0.10 * Math.PI); // T wave
    return 0;
  }

  let offset = 0;
  const speed = Math.round(bpm / 60 * 2) || 2;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,212,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // ECG line
    const grad = ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0, 'rgba(0,212,255,0)');
    grad.addColorStop(0.15, '#00d4ff');
    grad.addColorStop(0.85, '#00d4ff');
    grad.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let px = 0; px < W; px++) {
      const t = (px + offset) % (cycleLen * 2);
      const amp = ecgY(t);
      const py = H / 2 - amp * (H * 0.38);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    offset = (offset + speed) % (cycleLen * 2);
    ECG_ANIM_ID = requestAnimationFrame(draw);
  }

  if (ECG_ANIM_ID) cancelAnimationFrame(ECG_ANIM_ID);
  draw();
}

// ═══════════════════════════════════════════════════════
// ── KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const nav = (view) => {
    const el = document.querySelector(`[data-view="${view}"]`);
    switchView(view, el);
  };

  switch (e.key) {
    case '1': nav('dashboard'); break;
    case '2': nav('patients');  break;
    case '3': nav('insights');  break;
    case '4': nav('agents');    break;
    case 'r': case 'R': runFullAnalysis(); break;
    case 'n': case 'N': loadNewPatient(); break;
    case 't': case 'T': translateDiagnosis(); break;
    case 'd': case 'D': startDemo(); break;
    case 'e': case 'E': exportReport(); break;
    case ' ': e.preventDefault(); speakDiagnosis(); break;
    case '?': showShortcuts(); break;
    case 'Escape':
      closeModal();
      closeShortcuts();
      stopDemo();
      break;
  }
});

function showShortcuts() { document.getElementById('shortcuts-overlay').classList.add('open'); }
function closeShortcuts() { document.getElementById('shortcuts-overlay').classList.remove('open'); }

// ═══════════════════════════════════════════════════════
// ── DEMO MODE
// ═══════════════════════════════════════════════════════
let DEMO_TIMERS = [];
let DEMO_RUNNING = false;

function startDemo() {
  if (DEMO_RUNNING) { stopDemo(); return; }
  DEMO_RUNNING = true;

  const btn = document.getElementById('btn-demo');
  if (btn) { btn.classList.add('running'); btn.textContent = '⏹ Stop Demo'; }

  // Show banner
  let banner = document.getElementById('demo-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'demo-banner'; banner.id = 'demo-banner';
    banner.innerHTML = '<span>🎬 Demo Mode — Auto-walking through all ClinixAI features</span><button class="demo-stop" onclick="stopDemo()">Stop</button>';
    document.body.appendChild(banner);
  }

  const steps = [
    { t:0,    fn: () => { nav('dashboard'); showToast('info','🎬 Demo Started','Navigating to Dashboard…'); } },
    { t:1500, fn: () => runFullAnalysis() },
    { t:8000, fn: () => { showToast('info','🎙️ Demo','Simulating Saaras STT voice input…'); document.getElementById('voice-input-text').value = 'What is the risk of acute MI given the elevated troponin trend?'; } },
    { t:10000,fn: () => submitVoiceQuery() },
    { t:15000,fn: () => { closeModal(); speakDiagnosis(); showToast('info','🔊 Demo','Playing Bulbul TTS diagnosis readout…'); } },
    { t:21000,fn: () => { if (STATE.ttsAudio) { STATE.ttsAudio.pause(); STATE.ttsPlaying=false; } translateDiagnosis(); } },
    { t:27000,fn: () => { closeModal(); nav('patients'); showToast('info','👥 Demo','Viewing Patient Registry…'); } },
    { t:29000,fn: () => { nav('insights'); showToast('info','📊 Demo','Viewing Clinical Insights…'); } },
    { t:31000,fn: () => { nav('agents'); showToast('info','🤖 Demo','Viewing Agent Control Center…'); } },
    { t:34000,fn: () => { nav('dashboard'); loadNewPatient(); showToast('info','🔄 Demo','Loading next patient case…'); } },
    { t:37000,fn: () => { stopDemo(); showToast('success','✅ Demo Complete','ClinixAI feature walkthrough finished!'); } },
  ];

  DEMO_TIMERS = steps.map(s => setTimeout(s.fn, s.t));

  function nav(v) {
    const el = document.querySelector(`[data-view="${v}"]`);
    switchView(v, el);
  }
}

function stopDemo() {
  DEMO_RUNNING = false;
  DEMO_TIMERS.forEach(t => clearTimeout(t));
  DEMO_TIMERS = [];
  const btn = document.getElementById('btn-demo');
  if (btn) { btn.classList.remove('running'); btn.textContent = '▶ Demo'; }
  const banner = document.getElementById('demo-banner');
  if (banner) banner.remove();
}

// ═══════════════════════════════════════════════════════
// ── EXPORT REPORT
// ═══════════════════════════════════════════════════════
function exportReport() {
  const p = STATE.currentPatient;
  if (!p) return;

  const now = new Date().toLocaleString('en-IN');
  const notes = document.getElementById('clinical-notes').value || 'None';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>ClinixAI Clinical Report — ${p.name}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#111}
  h1{color:#0369a1;border-bottom:2px solid #0369a1;padding-bottom:8px}
  h2{color:#0369a1;font-size:1rem;margin-top:1.5rem}
  table{width:100%;border-collapse:collapse;margin-top:0.5rem}
  td,th{border:1px solid #ddd;padding:8px 12px;font-size:0.85rem}
  th{background:#f0f9ff;font-weight:700}
  .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:700}
  .high{background:#fee2e2;color:#991b1b}
  .primary{background:#e0f2fe;color:#075985}
  .footer{margin-top:2rem;font-size:0.75rem;color:#999;border-top:1px solid #eee;padding-top:1rem}
</style>
</head>
<body>
<h1>&#127973; ClinixAI Clinical Report</h1>
<p><strong>Generated:</strong> ${now} &nbsp;|&nbsp; <strong>Physician:</strong> Dr. Elara Vance &nbsp;|&nbsp; <strong>Powered by:</strong> Sarvam AI</p>

<h2>Patient Information</h2>
<table>
  <tr><th>Name</th><td>${p.name}</td><th>ID</th><td>${p.id}</td></tr>
  <tr><th>DOB</th><td>${p.dob}</td><th>Age/Gender</th><td>${p.age}y, ${p.gender}</td></tr>
  <tr><th>Department</th><td colspan="3">${p.dept}</td></tr>
  <tr><th>Chief Complaint</th><td colspan="3">${p.chiefComplaint}</td></tr>
  <tr><th>History</th><td colspan="3">${p.history}</td></tr>
</table>

<h2>Vitals</h2>
<table>
  <tr>${p.vitals.map(v=>`<th>${v.label}</th>`).join('')}</tr>
  <tr>${p.vitals.map(v=>`<td><strong>${v.value}</strong> ${v.unit} <span class="badge ${v.statusClass==='flag-high'?'high':''}">${v.status}</span></td>`).join('')}</tr>
</table>

<h2>Lab Results</h2>
<table>
  <tr><th>Test</th><th>Value</th><th>Unit</th><th>Reference</th><th>Flag</th></tr>
  ${p.labs.map(l=>`<tr><td>${l.name}</td><td><strong>${l.value}</strong></td><td>${l.unit}</td><td>${l.range}</td><td class="badge ${l.flag==='high'?'high':''}">${l.flag.toUpperCase()}</td></tr>`).join('')}
</table>

<h2>AI Diagnosis (Sarvam-105B)</h2>
<table>
  <tr><th>Diagnosis</th><th>Probability</th><th>Label</th></tr>
  ${p.diagnoses.map(d=>`<tr><td>${d.name}</td><td><strong>${d.pct}%</strong></td><td>${d.label}</td></tr>`).join('')}
</table>
<p style="margin-top:1rem;background:#f0f9ff;padding:12px;border-radius:8px;font-size:0.85rem">${p.diagnosisText}</p>

<h2>Evidence &amp; Guidelines</h2>
${p.evidence.map(e=>`<p><strong>${e.title}</strong> (${e.source})<br><small>${e.body}</small></p>`).join('')}

<h2>Clinical Notes</h2>
<p style="background:#fffbeb;padding:12px;border-radius:8px;font-size:0.85rem">${notes || 'None added'}</p>

<h2>Pending Actions</h2>
<ul>${p.actions.map(a=>`<li><strong>[${a.pri.toUpperCase()}]</strong> ${a.text}</li>`).join('')}</ul>

<div class="footer">
  Generated by ClinixAI &mdash; Clinical Multi-Agent System<br>
  Powered by Sarvam AI (Saaras STT &bull; Bulbul TTS &bull; Sarvam-105B LLM &bull; Mayura Translate)<br>
  Built at Sarvam AI Hackathon @ IIIT Hyderabad &nbsp;&#127470;&#127475;
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `ClinixAI_Report_${p.id}_${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('success','📄 Report Exported',`Clinical report for ${p.name} downloaded.`);
}

// ═══════════════════════════════════════════════════════
// ── ALERTS PANEL
// ═══════════════════════════════════════════════════════
function showAlerts() {
  document.getElementById('modal-title').textContent = '🔴 Critical Alerts';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.6rem">
      <div style="background:var(--red-dim);border:1px solid rgba(239,68,68,0.4);border-radius:9px;padding:0.75rem 1rem">
        <div style="font-size:0.72rem;font-weight:700;color:var(--red)">CRITICAL — PX-30491</div>
        <div style="font-size:0.8rem;margin-top:0.2rem">Troponin I trending up: 0.02 → 0.09 ng/mL over 6h. NSTEMI probability: 78%</div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.2rem">Flagged by Diagnostics Agent · 14:32</div>
      </div>
      <div style="background:var(--amber-dim);border:1px solid rgba(245,158,11,0.4);border-radius:9px;padding:0.75rem 1rem">
        <div style="font-size:0.72rem;font-weight:700;color:var(--amber)">HIGH — PX-19872</div>
        <div style="font-size:0.8rem;margin-top:0.2rem">tPA decision window closing — 30 min remaining. Neurology consult pending.</div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.2rem">Flagged by Clinical Reasoning Agent · 14:28</div>
      </div>
      <div style="background:var(--amber-dim);border:1px solid rgba(245,158,11,0.4);border-radius:9px;padding:0.75rem 1rem">
        <div style="font-size:0.72rem;font-weight:700;color:var(--amber)">MEDIUM — PX-44201</div>
        <div style="font-size:0.8rem;margin-top:0.2rem">PEFR reduced to 80% predicted. IgE 580 IU/mL — biologic evaluation overdue.</div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.2rem">Flagged by Patient Intake Agent · 09:22</div>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('open');
}

// ═══════════════════════════════════════════════════════
// ── API LATENCY SIMULATOR (right panel)
// ═══════════════════════════════════════════════════════
function startApiPingSimulator() {
  const pings = [
    { id:'ping-stt', base:160, label:'Saaras STT' },
    { id:'ping-tts', base:220, label:'Bulbul TTS' },
    { id:'ping-llm', base:580, label:'Sarvam-105B' },
    { id:'ping-tr',  base:290, label:'Mayura'    },
  ];
  setInterval(() => {
    pings.forEach(p => {
      const el = document.getElementById(p.id);
      if (!el) return;
      const val = p.base + Math.floor(Math.random() * 80 - 20);
      el.textContent = '~' + val + 'ms';
    });
  }, 3500);
}

// ═══════════════════════════════════════════════════════
// ── PATCH INIT — call new features on DOM ready
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  runSplash();
  startApiPingSimulator();
  // Start ECG after splash
  setTimeout(() => startECG(88), 3200);
  // Re-start ECG on patient change (wrapped in original loadPatient)
  const _origLoad = loadPatient;
  window.loadPatient = function(p, caseEl) {
    _origLoad(p, caseEl);
    const bpm = parseInt(p.vitals[0].value) || 72;
    document.getElementById('ecg-bpm-label').textContent = bpm + ' bpm';
    startECG(bpm);
  };
});
