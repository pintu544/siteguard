/**
 * SiteGuard API server + policy engine — Stage I proposal prototype.
 *
 * The policy engine is the "agent": a deterministic perceive -> reason -> act
 * loop. It is RULE-BASED in Stage I (no LLM planner — stated honestly in the
 * README and deck). LLM-based incident summarization is a Stage II item.
 *
 * Endpoints:
 *   POST /api/detections  { frameId, ts, persons: [{ bbox, hardHat, confidence, method, trackId }] }
 *   POST /api/frames       { frameId, jpegBase64 }
 *   GET  /api/incidents    -> persisted incident array
 *   POST /api/incidents/:id/ack -> mark acknowledged
 *
 * Socket.IO (server -> client): frame, alert, incident, stats
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
// Overridable for tests so they don't touch the real incident log.
const DATA_DIR = process.env.SITEGUARD_DATA_DIR || path.join(__dirname, '..', 'data');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');
const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots');

// Policy knobs (env-overridable).
const CONFIRM_FRAMES = parseInt(process.env.CONFIRM_FRAMES || '5', 10); // consecutive violation frames to OPEN an incident
const CLEAR_FRAMES = parseInt(process.env.CLEAR_FRAMES || '20', 10);    // consecutive clean frames to CLOSE the episode
const ESCALATE_ALERT_FRAMES = parseInt(process.env.ESCALATE_ALERT_FRAMES || '15', 10);       // cumulative violation frames -> alert
const ESCALATE_CRITICAL_FRAMES = parseInt(process.env.ESCALATE_CRITICAL_FRAMES || '30', 10); // cumulative violation frames -> critical

// Detection provenance label — shown verbatim in the dashboard (honesty rule).
const DETECTION_PROVENANCE =
  'Person + hard-hat detection: third-party pretrained model ' +
  'Hansung-Cho/yolov8-ppe-detection; third-party terms apply. ' +
  'Policy loop: rule-based (Stage I).';

fs.mkdirSync(path.dirname(INCIDENTS_FILE), { recursive: true });
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

function loadIncidents() {
  try {
    // The log starts empty and fills only from real pipeline runs.
    return JSON.parse(fs.readFileSync(INCIDENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function saveIncidents(list) {
  fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(list, null, 2));
}

let incidents = loadIncidents();
let nextId = incidents.reduce((m, i) => Math.max(m, i.id || 0), 0) + 1;

// Per-zone episode state (single logical "Zone A" for Stage I).
// Episodes are keyed by person trackId: one continuous violation by the SAME
// person = ONE episode = ONE incident. The incident escalates in place as
// the violation persists, and the episode closes only after that person's
// violation genuinely clears. A different person violating later opens their
// own incident. Episode state is in-memory; the incident log persists.
const zoneState = {
  name: 'Zone A',
  episodes: {}, // trackId -> { violationFrames, clearStreak, incidentId }
};

function severityFor(violationFrames) {
  if (violationFrames >= ESCALATE_CRITICAL_FRAMES) return 'critical';
  if (violationFrames >= ESCALATE_ALERT_FRAMES) return 'alert';
  return 'warning';
}

function appendTransition(incident, event, at = new Date().toISOString()) {
  if (!Array.isArray(incident.transitions)) incident.transitions = [];
  incident.transitions.push({
    at,
    event,
    status: incident.status,
    severity: incident.severity,
  });
}

// Episode counters live in memory and cannot be reconstructed safely from the
// audit log. If the server restarts mid-violation, close the prior session's
// active records as "interrupted" instead of presenting them as currently
// active or falsely claiming the hazard was observed to clear.
function reconcileInterruptedIncidents() {
  const interruptedAt = new Date().toISOString();
  let changed = false;
  for (const incident of incidents) {
    if (incident.status !== 'open' && incident.status !== 'acknowledged') continue;
    incident.status = 'interrupted';
    incident.interruptedAt = interruptedAt;
    incident.interruptionReason = 'server_restart';
    appendTransition(incident, 'session_interrupted', interruptedAt);
    changed = true;
  }
  if (changed) saveIncidents(incidents);
}

reconcileInterruptedIncidents();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'dashboard')));
app.use('/snapshots', express.static(SNAPSHOT_DIR));

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 10 * 1024 * 1024 });

// Latest frame + stats for new dashboard connections.
let latestFrame = null;
let stats = { fps: 0, persons: 0, frames: 0, startedAt: Date.now() };

app.get('/api/incidents', (req, res) => res.json(incidents));

// One-click audit export: the incident log as CSV (opens in Excel/Sheets).
app.get('/api/incidents/export', (req, res) => {
  const cols = [
    'id', 'timestamp', 'zone', 'type', 'trackId', 'severity', 'status',
    'acknowledgedAt', 'resolvedAt', 'interruptedAt', 'transitions',
  ];
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const i of incidents) {
    lines.push([
      i.id, i.ts, i.zone, i.type, i.trackId, i.severity, i.status,
      i.acknowledgedAt, i.resolvedAt, i.interruptedAt,
      JSON.stringify(i.transitions || []),
    ].map(esc).join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="siteguard-incidents.csv"');
  res.send(lines.join('\n'));
});

app.post('/api/incidents/:id/ack', (req, res) => {
  const inc = incidents.find(i => i.id === Number(req.params.id));
  if (!inc) return res.status(404).json({ error: 'not found' });
  if (inc.status !== 'open' && inc.status !== 'acknowledged') {
    return res.status(409).json({ error: 'incident is not active' });
  }
  const acknowledgedAt = inc.acknowledgedAt || new Date().toISOString();
  inc.acknowledgedAt = acknowledgedAt;
  if (inc.status !== 'acknowledged') {
    inc.status = 'acknowledged';
    appendTransition(inc, 'acknowledged', acknowledgedAt);
  }
  saveIncidents(incidents);
  io.emit('incident', inc); // rebroadcast updated incident
  res.json(inc);
});

// Provenance endpoint so the dashboard can render the honesty label.
app.get('/api/provenance', (req, res) => res.json({ detection: DETECTION_PROVENANCE }));

/**
 * PERCEIVE -> REASON -> ACT (per tracked person).
 * One continuous violation by the SAME person (stable trackId from the
 * worker's lightweight tracker) opens exactly ONE incident, after
 * CONFIRM_FRAMES consecutive frames — single-frame flicker never raises an
 * alert. While that person's violation persists, the SAME incident escalates
 * warning -> alert -> critical. The episode closes after CLEAR_FRAMES
 * consecutive frames without that person violating, marking the incident
 * resolved. A different person (or the same person, later) violating anew
 * opens a new incident.
 */
app.post('/api/detections', (req, res) => {
  const { frameId, persons = [] } = req.body || {};
  const violators = persons.filter(p => p.hardHat === false);
  stats.persons = persons.length;
  stats.frames += 1;

  const seenTracks = new Set();
  for (const v of violators) {
    const tid = v.trackId != null ? String(v.trackId) : '?';
    seenTracks.add(tid);
    let ep = zoneState.episodes[tid];
    if (!ep) ep = zoneState.episodes[tid] = { violationFrames: 0, clearStreak: 0, incidentId: null };
    ep.violationFrames += 1;
    ep.clearStreak = 0;

    if (!ep.incidentId && ep.violationFrames >= CONFIRM_FRAMES) {
      const openedAt = new Date().toISOString();
      const incident = {
        id: nextId++,
        ts: openedAt,
        zone: zoneState.name,
        type: 'missing_hard_hat',
        trackId: v.trackId != null ? v.trackId : null,
        frames: CONFIRM_FRAMES,
        violators: 1,
        severity: 'warning',
        snapshotPath: null, // attached by /api/frames when the frame arrives
        status: 'open',
        provenance: 'rule-based policy engine (Stage I)',
        transitions: [{
          at: openedAt,
          event: 'opened',
          status: 'open',
          severity: 'warning',
        }],
      };
      incidents.push(incident);
      saveIncidents(incidents);
      ep.incidentId = incident.id;
      io.emit('incident', incident);
      io.emit('alert', {
        incidentId: incident.id,
        severity: 'warning',
        message: `Person #${incident.trackId} without hard hat in ${zoneState.name} — WARNING (incident #${incident.id})`,
      });
      console.log(`[policy] incident #${incident.id} opened (warning) — person #${incident.trackId}`);
    } else if (ep.incidentId) {
      const inc = incidents.find(i => i.id === ep.incidentId);
      const sev = severityFor(ep.violationFrames);
      if (inc && sev !== inc.severity) {
        const escalatedAt = new Date().toISOString();
        inc.severity = sev;
        inc.escalatedAt = escalatedAt;
        appendTransition(inc, 'severity_changed', escalatedAt);
        saveIncidents(incidents);
        io.emit('incident', inc);
        io.emit('alert', {
          incidentId: inc.id,
          severity: sev,
          message: `Incident #${inc.id} escalated to ${sev.toUpperCase()} — person #${inc.trackId} still without hard hat in ${zoneState.name}`,
        });
        console.log(`[policy] incident #${inc.id} escalated to ${sev}`);
      }
    }
  }

  // Episodes whose person did not violate in this frame accumulate clear
  // streak; a genuinely cleared violation resolves its incident.
  for (const tid of Object.keys(zoneState.episodes)) {
    if (seenTracks.has(tid)) continue;
    const ep = zoneState.episodes[tid];
    // Confirmation is deliberately consecutive: any non-violation frame
    // breaks an unconfirmed streak instead of carrying it across a gap.
    if (!ep.incidentId) ep.violationFrames = 0;
    ep.clearStreak += 1;
    if (ep.clearStreak >= CLEAR_FRAMES) {
      const inc = incidents.find(i => i.id === ep.incidentId);
      if (inc && (inc.status === 'open' || inc.status === 'acknowledged')) {
        const resolvedAt = new Date().toISOString();
        inc.status = 'resolved';
        inc.resolvedAt = resolvedAt;
        appendTransition(inc, 'resolved', resolvedAt);
        saveIncidents(incidents);
        io.emit('incident', inc);
        console.log(`[policy] incident #${inc.id} resolved — violation cleared`);
      }
      delete zoneState.episodes[tid];
    }
  }

  res.status(202).json({ ok: true, frameId });
});

app.post('/api/frames', (req, res) => {
  const { frameId, jpegBase64 } = req.body || {};
  if (!jpegBase64) return res.status(400).json({ error: 'missing jpegBase64' });
  latestFrame = { frameId, jpegBase64, ts: Date.now() };

  // Attach a snapshot to the oldest open incident lacking one (oldest-first
  // so bursts don't starve earlier incidents).
  const pending = incidents.find(i =>
    (i.status === 'open' || i.status === 'acknowledged') && !i.snapshotPath);
  if (pending) {
    const snapPath = `data/snapshots/incident-${pending.id}.jpg`;
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `incident-${pending.id}.jpg`),
      Buffer.from(jpegBase64, 'base64'));
    pending.snapshotPath = snapPath;
    saveIncidents(incidents);
    io.emit('incident', pending);
  }

  io.emit('frame', latestFrame);
  res.status(202).json({ ok: true, frameId });
});

io.on('connection', (socket) => {
  socket.emit('provenance', { detection: DETECTION_PROVENANCE });
  socket.emit('incidents', incidents);
  if (latestFrame) socket.emit('frame', latestFrame);
});

// Stats ticker.
setInterval(() => {
  const elapsed = (Date.now() - stats.startedAt) / 1000;
  stats.fps = elapsed > 0 ? +(stats.frames / elapsed).toFixed(1) : 0;
  io.emit('stats', { fps: stats.fps, persons: stats.persons, zone: zoneState.name });
}, 1000);

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] confirm-frames=${CONFIRM_FRAMES} clear-frames=${CLEAR_FRAMES} escalate=${ESCALATE_ALERT_FRAMES}/${ESCALATE_CRITICAL_FRAMES}`);
});
