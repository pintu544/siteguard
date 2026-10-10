/**
 * Policy-engine tests (Stage I). Run: `npm test` from server/.
 *
 * Covers: flicker rejection, per-person confirmation, one-incident-per-
 * continuous-violation, in-place escalation, resolution on clear, new
 * incident for a genuinely repeated event, and acknowledgement.
 *
 * These are integration tests: they drive the real Express policy engine
 * over HTTP with a hermetic data dir (SITEGUARD_DATA_DIR), so what passes
 * here is what runs in the demo.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let server;
let dataDir;
let base;
let serverOutput = '';
let spawnError;
const testDir = path.dirname(fileURLToPath(import.meta.url));

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('could not determine a free test port'));
        return;
      }
      probe.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

const persons = (tracks) =>
  tracks.map(([trackId, hardHat]) => ({
    bbox: [0, 0, 10, 10], hardHat, confidence: 0.9, trackId, method: 'test',
  }));

async function postDetections(tracks) {
  const r = await fetch(`${base}/api/detections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frameId: 1, ts: Date.now(), persons: persons(tracks) }),
  });
  assert.equal(r.status, 202);
}

async function frames(n, tracks) {
  for (let i = 0; i < n; i++) await postDetections(tracks);
}

async function incidents() {
  return (await fetch(`${base}/api/incidents`)).json();
}

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'siteguard-test-'));
  const port = await getFreePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(testDir, '..'),
    env: { ...process.env, PORT: String(port), SITEGUARD_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => { serverOutput += chunk; });
  server.stderr.on('data', (chunk) => { serverOutput += chunk; });
  server.once('error', (error) => { spawnError = error; });

  for (let i = 0; i < 50; i++) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(`test server exited before readiness\n${serverOutput}`);
    }
    let response;
    try {
      response = await fetch(`${base}/api/incidents`);
    } catch { /* not up yet */ }
    if (response?.ok && serverOutput.includes(`[server] listening on http://localhost:${port}`)) {
      // Require both our child's readiness log and an HTTP response, then
      // verify it stayed alive. A stale process cannot satisfy this check.
      await delay(50);
      assert.equal(server.exitCode, null, `spawned test server exited\n${serverOutput}`);
      assert.equal(server.signalCode, null, `spawned test server was killed\n${serverOutput}`);
      return;
    }
    await delay(200);
  }
  throw new Error(`test server did not start\n${serverOutput}`);
});

after(async () => {
  if (server && server.exitCode === null && server.signalCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve));
    server.kill();
    await Promise.race([exited, delay(2000)]);
  }
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
});

test('flicker: 4 violation frames open no incident', async () => {
  await frames(4, [[1, false]]);
  assert.equal((await incidents()).length, 0);
  await frames(20, [[1, true]]); // clean break
});

test('confirmation streak resets after a clean frame', async () => {
  const before = (await incidents()).length;
  await frames(4, [[2, false]]);
  await frames(1, [[2, true]]);
  await frames(1, [[2, false]]);
  assert.equal((await incidents()).length, before,
    '4 bad + clean + bad must not count as 5 consecutive violations');
  await frames(20, []);
});

test('confirmation: 5 consecutive frames by the same person open one incident', async () => {
  await frames(5, [[7, false]]);
  const inc = await incidents();
  assert.equal(inc.length, 1);
  assert.equal(inc[0].severity, 'warning');
  assert.equal(inc[0].status, 'open');
  assert.equal(inc[0].trackId, 7);
  await frames(20, []); // resolve
});

test('one continuous violation stays one incident and escalates in place', async () => {
  await frames(5, [[3, false]]);
  let inc = await incidents();
  const id = inc[inc.length - 1].id;
  assert.equal(inc[inc.length - 1].severity, 'warning');
  await frames(10, [[3, false]]); // 15 cumulative
  inc = await incidents();
  assert.equal(inc.find((i) => i.id === id).severity, 'alert');
  await frames(15, [[3, false]]); // 30 cumulative
  inc = await incidents();
  const escalated = inc.find((i) => i.id === id);
  assert.equal(escalated.severity, 'critical');
  const persisted = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'incidents.json'), 'utf8'),
  ).find((i) => i.id === id);
  assert.deepEqual(
    persisted.transitions.map((transition) => transition.severity),
    ['warning', 'alert', 'critical'],
    'warning -> alert -> critical transition history must be preserved',
  );
  assert.deepEqual(
    persisted.transitions.map((transition) => transition.event),
    ['opened', 'severity_changed', 'severity_changed'],
  );
  await frames(5, [[3, false]]);
  inc = await incidents();
  assert.equal(inc.filter((i) => i.trackId === 3).length, 1, 'still exactly one incident for track 3');
  await frames(20, []);
  inc = await incidents();
  assert.equal(inc.find((i) => i.id === id).status, 'resolved');
});

test('different people violating open separate incidents', async () => {
  await frames(5, [[11, false], [12, false]]);
  const inc = await incidents();
  const mine = inc.filter((i) => i.trackId === 11 || i.trackId === 12);
  assert.equal(mine.length, 2);
  assert.ok(mine.every((i) => i.severity === 'warning'));
  await frames(20, []);
});

test('a genuinely repeated event opens a new incident', async () => {
  await frames(5, [[21, false]]);
  let inc = await incidents();
  const first = inc[inc.length - 1].id;
  await frames(20, []); // cleared -> resolved
  inc = await incidents();
  assert.equal(inc.find((i) => i.id === first).status, 'resolved');
  await frames(5, [[21, false]]); // same person violates again later
  inc = await incidents();
  const second = inc[inc.length - 1].id;
  assert.notEqual(second, first);
  assert.equal(inc.find((i) => i.id === second).severity, 'warning');
  await frames(20, []);
});

test('acknowledged active incident resolves while retaining acknowledgement', async () => {
  await frames(5, [[31, false]]);
  let inc = await incidents();
  const id = inc[inc.length - 1].id;
  const r = await fetch(`${base}/api/incidents/${id}/ack`, { method: 'POST' });
  assert.equal(r.status, 200);
  inc = await incidents();
  const acknowledged = inc.find((i) => i.id === id);
  assert.equal(acknowledged.status, 'acknowledged');
  assert.ok(acknowledged.acknowledgedAt);
  const acknowledgedAt = acknowledged.acknowledgedAt;
  await frames(20, []);
  inc = await incidents();
  const resolved = inc.find((i) => i.id === id);
  assert.equal(resolved.status, 'resolved');
  assert.ok(resolved.resolvedAt);
  assert.equal(resolved.acknowledgedAt, acknowledgedAt);
  assert.deepEqual(
    resolved.transitions.map((transition) => transition.event),
    ['opened', 'acknowledged', 'resolved'],
  );
  const lateAck = await fetch(`${base}/api/incidents/${id}/ack`, { method: 'POST' });
  assert.equal(lateAck.status, 409, 'a resolved incident must not become active again');
  const csv = await fetch(`${base}/api/incidents/export`).then((response) => response.text());
  assert.match(csv, /acknowledgedAt,resolvedAt,interruptedAt,transitions/);
  assert.match(csv, /acknowledged/);
});

test('restart marks prior active incidents interrupted instead of leaving stale alerts', async () => {
  const restartDir = fs.mkdtempSync(path.join(os.tmpdir(), 'siteguard-restart-test-'));
  const seededAt = new Date(Date.now() - 60_000).toISOString();
  const seeded = [
    {
      id: 1,
      ts: seededAt,
      zone: 'Zone A',
      type: 'missing_hard_hat',
      trackId: 41,
      severity: 'warning',
      status: 'open',
      transitions: [{ at: seededAt, event: 'opened', status: 'open', severity: 'warning' }],
    },
    {
      id: 2,
      ts: seededAt,
      zone: 'Zone A',
      type: 'missing_hard_hat',
      trackId: 42,
      severity: 'alert',
      status: 'acknowledged',
      acknowledgedAt: seededAt,
      transitions: [
        { at: seededAt, event: 'opened', status: 'open', severity: 'warning' },
        { at: seededAt, event: 'acknowledged', status: 'acknowledged', severity: 'alert' },
      ],
    },
  ];
  fs.writeFileSync(path.join(restartDir, 'incidents.json'), JSON.stringify(seeded));

  const restartPort = await getFreePort();
  const restartBase = `http://127.0.0.1:${restartPort}`;
  let restartOutput = '';
  const restartServer = spawn(process.execPath, ['server.js'], {
    cwd: path.join(testDir, '..'),
    env: { ...process.env, PORT: String(restartPort), SITEGUARD_DATA_DIR: restartDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  restartServer.stdout.on('data', (chunk) => { restartOutput += chunk; });
  restartServer.stderr.on('data', (chunk) => { restartOutput += chunk; });

  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if (restartServer.exitCode !== null || restartServer.signalCode !== null) break;
      try {
        const response = await fetch(`${restartBase}/api/incidents`);
        if (response.ok) { ready = true; break; }
      } catch { /* not ready yet */ }
      await delay(100);
    }
    assert.equal(ready, true, `restart test server did not start\n${restartOutput}`);

    const reconciled = await fetch(`${restartBase}/api/incidents`).then((r) => r.json());
    assert.deepEqual(reconciled.map((incident) => incident.status),
      ['interrupted', 'interrupted']);
    assert.ok(reconciled.every((incident) => incident.interruptedAt));
    assert.ok(reconciled.every((incident) =>
      incident.interruptionReason === 'server_restart'));
    assert.equal(reconciled[1].acknowledgedAt, seededAt,
      'restart reconciliation must preserve prior acknowledgement evidence');
    assert.ok(reconciled.every((incident) =>
      incident.transitions.at(-1).event === 'session_interrupted'));

    const ack = await fetch(`${restartBase}/api/incidents/1/ack`, { method: 'POST' });
    assert.equal(ack.status, 409, 'an interrupted incident must not be reactivated');
  } finally {
    if (restartServer.exitCode === null && restartServer.signalCode === null) {
      const exited = new Promise((resolve) => restartServer.once('exit', resolve));
      restartServer.kill();
      await Promise.race([exited, delay(2000)]);
    }
    fs.rmSync(restartDir, { recursive: true, force: true });
  }
});
