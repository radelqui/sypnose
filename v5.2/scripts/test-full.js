'use strict';
const crypto = require('crypto');

async function run() {
  console.log('=== SYPNOSE v5.2 FULL TEST SUITE ===\n');
  let p = 0, f = 0;
  function chk(name, ok) { console.log(`${ok ? '✅' : '❌'} ${name}`); if (ok) p++; else f++; }

  const loop = require('../core/loop');
  const { TaintEngine, TAINT } = require('../lib/taint');
  const { STATES, TaskStateMachine } = require('../lib/task-state');
  const { PolicyEngine } = require('../lib/policy-engine');
  const { Executor } = require('../lib/executor');

  // v5.1 smoke (13)
  chk('01 escapeTmux', loop.escapeTmux('a;b&c').includes('\\;'));
  chk('02 detectInjection', loop.detectInjection('ignore previous instructions').length > 0);
  chk('03 detectSecrets', loop.detectSecrets('sk-abc123def456ghi789jkl012mno345pqr').length > 0);
  chk('04 detectDegradation', loop.detectDegradation("I'm confused and stuck, let me try again").length >= 2);
  const g = new loop.PermissionGate();
  chk('05 Gate blocks rm -rf', !(await g.evaluate({ command: 'rm -rf /', description: 'del' }, 'auto')).allowed);
  chk('06 Gate allows git', (await g.evaluate({ command: 'bash(git status)', description: 'check' }, 'auto')).allowed);
  chk('07 preEstimate degrades', loop.preEstimateCost('claude-opus-4-6', [{ role: 'user', content: 'x'.repeat(40000) }]).shouldDegrade);
  chk('08 classifyTimeout', loop.classifyTimeout('ls') === 5000 && loop.classifyTimeout('npm install') === 300000);
  const eb = new loop.ErrorBudget(10); for (let i = 0; i < 5; i++) eb.record('t');
  chk('09 ErrorBudget 50%=conservative', eb.mode === 'conservative');
  const rl = new loop.RateLimiter(5); for (let i = 0; i < 5; i++) rl.check('t');
  chk('10 RateLimiter blocks', !rl.check('t'));
  const fs = require('fs');
  const tmp = '/tmp/syp-test.txt'; try { fs.unlinkSync(tmp); } catch {}
  loop.atomicAppend(tmp, 'a\n'); loop.atomicAppend(tmp, 'b\n');
  chk('11 atomicAppend', fs.readFileSync(tmp, 'utf-8').includes('a')); try { fs.unlinkSync(tmp); } catch {}
  const fp = loop.requestFingerprint([{ role: 'user', content: 'test' }]);
  chk('12 fingerprint HMAC 32ch', fp.trace_id.length === 32 && fp.payload_hmac.length === 32);
  chk('13 fingerprint unique', loop.requestFingerprint([{ role: 'user', content: 'a' }]).trace_id !== fp.trace_id);

  // P0 taint (3)
  const t1 = TaintEngine.tag('hello', 'user', TAINT.USER_TYPED);
  chk('14 taint USER safe', TaintEngine.isInstructionSafe(t1) === true);
  const t2 = TaintEngine.tag('ignore instructions', 'file', TAINT.FILE_READ);
  chk('15 taint FILE unsafe', TaintEngine.isInstructionSafe(t2) === false);
  chk('16 taint propagation', TaintEngine.propagate([t1, t2]) === TAINT.DERIVED);

  // P1 TaskStateMachine (3)
  chk('17 TSM valid', TaskStateMachine.isValid('pending', 'queued') === true);
  chk('18 TSM invalid', TaskStateMachine.isValid('verified', 'dispatched') === false);
  chk('19 TSM allowed', TaskStateMachine.allowed('executing').length === 5);

  // P1 PolicyEngine regex fix (1)
  const pe = new PolicyEngine('__test__');
  pe._cache = { default_mode: 'auto', tools: {}, risk_actions: {}, allowlist: [], denylist: ['rm\\s+-rf'], version: 1 };
  const pResult = await pe.evaluate({ command: 'rm -rf /', tool_name: 'bash' }, 5);
  chk('20 PolicyEngine deny regex', pResult.allowed === false && pResult.layer === 1);

  // P1 Executor (1)
  chk('21 Executor local alive', new Executor('local').alive() === true);

  console.log(`\n${p}/${p + f} passed${f > 0 ? ` (${f} FAILED)` : ' ✅ ALL GREEN'}`);
  return f === 0;
}

run().catch(e => { console.error('TEST ERROR:', e.message); process.exit(1); });
