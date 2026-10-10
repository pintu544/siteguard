/**
 * SiteGuard API server + policy engine — Stage I proposal prototype.
 *
 * The policy engine is the "agent": a deterministic perceive -> reason -> act
 * loop. It is RULE-BASED in Stage I (no LLM planner — stated honestly in the
 * README and deck). LLM-based incident summarization is a Stage II item.
 *
 * Endpoints:
 *   POST /api/detections  { frameId, ts, persons: [{ bbox, hardHat, confidence, method }] }
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
const DATA_DIR = path.join(__dirname, '..', 'data');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');
const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots');

// Policy knobs (env-overridable).
const CONFIRM_FRAMES = parseInt(process.env.CONFIRM_FRAMES || '5', 10); // consecutive violation frames to OPEN an incident
const CLEAR_FRAMES = parseInt(process.env.CLEAR_FRAMES || '10', 10);    // consecutive clean frames to CLOSE the episode
const ESCALATE_ALERT_FRAMES = parseInt(process.env.ESCALATE_ALERT_FRAMES || '15', 10);       // cumulative violation frames -> alert
const ESCALATE_CRITICAL_FRAMES = parseInt(process.env.ESCALATE_CRITICAL_FRAMES || '30', 10); // cumulative violation frames -> critical

// Detection provenance label — shown verbatim in the dashboard (honesty rule).
const DETECTION_PROVENANCE =
  'Person + hard-hat detection: third-party pretrained model ' +
  'Hansung-Cho/yolov8-ppe-detection (MIT). Policy loop: rule-based (Stage I).';

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
// One continuous violation = ONE episode = ONE incident. The incident
// escalates in place as the violation persists, and the episode closes only
// after the violation genuinely clears. A later, separate violation opens a
// new incident. Episode state is in-memory; the incident log persists.
const zoneState = {
  name: 'Zone A',
  episode: null, // { violationFrames, clearStreak, incidentId } | null
};

function severityFor(violationFrames) {
  if (violationFrames >= ESCALATE_CRITICAL_FRAMES) return 'critical';
  if (violationFrames >= ESCALATE_ALERT_FRAMES) return 'alert';
  return 'warning';
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'dashboard')));

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 10 * 1024 * 1024 });

// Latest frame + stats for new dashboard connections.
let latestFrame = null;
let stats = { fps: 0, persons: 0, frames: 0, startedAt: Date.now() };

app.get('/api/incidents', (req, res) => res.json(incidents));

app.post('/api/incidents/:id/ack', (req, res) => {
  const inc = incidents.find(i => i.id === Number(req.params.id));
  if (!inc) return res.status(404).json({ error: 'not found' });
  inc.status = 'acknowledged';
  saveIncidents(incidents);
  io.emit('incident', inc); // rebroadcast updated incident
  res.json(inc);
});

// Provenance endpoint so the dashboard can render the honesty label.
app.get('/api/provenance', (req, res) => res.json({ detection: DETECTION_PROVENANCE }));

/**
 * PERCEIVE -> REASON -> ACT.
 * One continuous violation opens exactly ONE incident (after CONFIRM_FRAMES
 * consecutive violation frames — single-frame flicker never raises an alert).
 * While the violation persists, the SAME incident escalates warning -> alert
 * -> critical. The episode closes after CLEAR_FRAMES consecutive clean
 * frames, marking the incident resolved. A later, separate violation opens a
 * new incident.
 */
app.post('/api/detections', (req, res) => {
  const { frameId, persons = [] } = req.body || {};
  const violators = persons.filter(p => p.hardHat === false);
  stats.persons = persons.length;
  stats.frames += 1;

  let ep = zoneState.episode;
  if (violators.length > 0) {
    if (!ep) ep = zoneState.episode = { violationFrames: 0, clearStreak: 0, incidentId: null };
    ep.violationFrames += 1;
    ep.clearStreak = 0;

    if (!ep.incidentId && ep.violationFrames >= CONFIRM_FRAMES) {
      const incident = {
        id: nextId++,
        ts: new Date().toISOString(),
        zone: zoneState.name,
        type: 'missing_hard_hat',
        frames: CONFIRM_FRAMES,
        violators: violators.length,
        severity: 'warning',
        snapshotPath: null, // attached by /api/frames when the frame arrives
        status: 'open',
        provenance: 'rule-based policy engine (Stage I)',
      };
      incidents.push(incident);
      saveIncidents(incidents);
      ep.incidentId = incident.id;
      io.emit('incident', incident);
      io.emit('alert', {
        incidentId: incident.id,
        severity: 'warning',
        message: `${violators.length} person(s) without hard hat in ${zoneState.name} — WARNING (incident #${incident.id})`,
      });
      console.log(`[policy] incident #${incident.id} opened (warning) — ${violators.length} violator(s)`);
    } else if (ep.incidentId) {
      const inc = incidents.find(i => i.id === ep.incidentId);
      const sev = severityFor(ep.violationFrames);
      if (inc && sev !== inc.severity) {
        inc.severity = sev;
        inc.escalatedAt = new Date().toISOString();
        saveIncidents(incidents);
        io.emit('incident', inc);
        io.emit('alert', {
          incidentId: inc.id,
          severity: sev,
          message: `Incident #${inc.id} escalated to ${sev.toUpperCase()} — violation persists in ${zoneState.name}`,
        });
        console.log(`[policy] incident #${inc.id} escalated to ${sev}`);
      }
    }
  } else if (ep) {
    ep.clearStreak += 1;
    if (ep.clearStreak >= CLEAR_FRAMES) {
      const inc = incidents.find(i => i.id === ep.incidentId);
      if (inc && inc.status === 'open') {
        inc.status = 'resolved';
        inc.resolvedAt = new Date().toISOString();
        saveIncidents(incidents);
        io.emit('incident', inc);
        console.log(`[policy] incident #${inc.id} resolved — violation cleared`);
      }
      zoneState.episode = null;
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
  const pending = incidents.find(i => i.status === 'open' && !i.snapshotPath);
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
