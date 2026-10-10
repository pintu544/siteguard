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
import os from 'node:os';
import path from 'node:path';

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
let server;
let dataDir;

const persons = (tracks) =>
  tracks.map(([trackId, hardHat]) => ({
    bbox: [0, 0, 10, 10], hardHat, confidence: 0.9, trackId, method: 'test',
  }));

async function postDetections(tracks) {
  const r = await fetch(`${BASE}/api/detections`, {
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
  return (await fetch(`${BASE}/api/incidents`)).json();
}

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'siteguard-test-'));
  server = spawn('node', ['server.js'], {
    cwd: path.join(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(PORT), SITEGUARD_DATA_DIR: dataDir },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/incidents`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('test server did not start');
});

after(() => {
  server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('flicker: 4 violation frames open no incident', async () => {
  await frames(4, [[1, false]]);
  assert.equal((await incidents()).length, 0);
  await frames(10, [[1, true]]); // clean break
});

test('confirmation: 5 consecutive frames by the same person open one incident', async () => {
  await frames(5, [[7, false]]);
  const inc = await incidents();
  assert.equal(inc.length, 1);
  assert.equal(inc[0].severity, 'warning');
  assert.equal(inc[0].status, 'open');
  assert.equal(inc[0].trackId, 7);
  await frames(10, []); // resolve
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
  assert.equal(inc.find((i) => i.id === id).severity, 'critical');
  await frames(5, [[3, false]]);
  inc = await incidents();
  assert.equal(inc.filter((i) => i.trackId === 3).length, 1, 'still exactly one incident for track 3');
  await frames(10, []);
  inc = await incidents();
  assert.equal(inc.find((i) => i.id === id).status, 'resolved');
});

test('different people violating open separate incidents', async () => {
  await frames(5, [[11, false], [12, false]]);
  const inc = await incidents();
  const mine = inc.filter((i) => i.trackId === 11 || i.trackId === 12);
  assert.equal(mine.length, 2);
  assert.ok(mine.every((i) => i.severity === 'warning'));
  await frames(10, []);
});

test('a genuinely repeated event opens a new incident', async () => {
  await frames(5, [[21, false]]);
  let inc = await incidents();
  const first = inc[inc.length - 1].id;
  await frames(10, []); // cleared -> resolved
  inc = await incidents();
  assert.equal(inc.find((i) => i.id === first).status, 'resolved');
  await frames(5, [[21, false]]); // same person violates again later
  inc = await incidents();
  const second = inc[inc.length - 1].id;
  assert.notEqual(second, first);
  assert.equal(inc.find((i) => i.id === second).severity, 'warning');
  await frames(10, []);
});

test('acknowledgement marks the incident', async () => {
  await frames(5, [[31, false]]);
  let inc = await incidents();
  const id = inc[inc.length - 1].id;
  const r = await fetch(`${BASE}/api/incidents/${id}/ack`, { method: 'POST' });
  assert.equal(r.status, 200);
  inc = await incidents();
  assert.equal(inc.find((i) => i.id === id).status, 'acknowledged');
  await frames(10, []);
});
