// jsdom functional regression test.
// Loads the REAL calculator pages, fills in the sample inputs from scenarios.js,
// clicks Calculate, and asserts the rendered output matches the verified numbers
// from the standalone Node math modules.
//
//   node tests/dom.test.js
//
// Requires jsdom (dev-only):  npm install --no-save jsdom

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const { computeExtraPayments } = require('./extra-payments.math.js');
const { computeHelocRefi } = require('./heloc-refi.math.js');
const scenarios = require('./scenarios.js');

const ROOT = path.join(__dirname, '..');

// Same formatters the pages use.
const fmt = n => (n < 0 ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');
function durText(m){
  if (!isFinite(m)) return '—';
  const y = Math.floor(m / 12), mm = m % 12;
  if (y === 0) return mm + ' mo';
  if (mm === 0) return y + ' yr' + (y === 1 ? '' : 's');
  return y + ' yr' + (y === 1 ? '' : 's') + ' ' + mm + ' mo';
}

let passed = 0, failed = 0;
const failures = [];

function check(scenario, label, actual, expected){
  if (actual === expected){
    passed++;
  } else {
    failed++;
    failures.push('  [' + scenario + '] ' + label + '\n      expected: ' + JSON.stringify(expected) +
                  '\n      actual:   ' + JSON.stringify(actual));
  }
}

function checkContains(scenario, label, haystack, needle){
  if (typeof haystack === 'string' && haystack.indexOf(needle) !== -1){
    passed++;
  } else {
    failed++;
    failures.push('  [' + scenario + '] ' + label + '\n      expected to contain: ' + JSON.stringify(needle) +
                  '\n      actual:              ' + JSON.stringify(haystack));
  }
}

function loadPage(relPath){
  const html = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://www.shouldirefiornot.com/' + path.dirname(relPath) + '/',
    beforeParse(window){
      // jsdom does not implement scrollIntoView; the pages call it after rendering.
      window.Element.prototype.scrollIntoView = function(){};
    }
  });
  return dom.window;
}

// Read the rendered stat grid as { label: value }.
function readStats(win){
  const out = {};
  win.document.querySelectorAll('#statGrid .stat').forEach(el => {
    const l = el.querySelector('.stat-label');
    const v = el.querySelector('.stat-value');
    if (l && v) out[l.textContent.trim()] = v.textContent.trim();
  });
  return out;
}

function setVal(win, id, value){
  const el = win.document.getElementById(id);
  if (!el) throw new Error('missing input #' + id);
  el.value = (value === undefined || value === null || Number.isNaN(value)) ? '' : String(value);
}

function click(win, id){ win.document.getElementById(id).click(); }

// ---------------------------------------------------------------------------
// Calculator 1: extra payments
// ---------------------------------------------------------------------------
console.log('--- extra-payments/index.html ---');
for (const s of scenarios.extraPayments){
  const name = s.name.split(' ')[0];
  const win = loadPage('extra-payments/index.html');
  const i = s.input;

  setVal(win, 'balance', i.balance);
  setVal(win, 'rate', i.rate);
  setVal(win, 'yearsLeft', Math.floor(i.termMonths / 12));
  setVal(win, 'monthsLeft', i.termMonths % 12);
  setVal(win, 'extraMonthly', i.extraMonthly);
  setVal(win, 'lumpSum', i.lumpSum);
  click(win, 'calcBtn');

  const ref = computeExtraPayments(i);
  const stats = readStats(win);
  const title = win.document.getElementById('verdictTitle').textContent.trim();
  const sub = win.document.getElementById('verdictSub').textContent.trim();

  if (!ref.valid){
    check(name, 'validation title', title, 'Check your numbers.');
    check(name, 'validation message', sub, ref.message);
    check(name, 'no stats rendered on invalid input', Object.keys(stats).length, 0);
    console.log('  ' + s.name + ' -> validation OK');
    continue;
  }

  check(name, 'Baseline payment',        stats['Baseline payment'],        fmt(ref.basePayment));
  check(name, 'Original payoff',         stats['Original payoff'],         durText(ref.baselineMonths));
  check(name, 'New payoff',              stats['New payoff'],              durText(ref.acceleratedMonths));
  check(name, 'Time shaved off',         stats['Time shaved off'],         durText(ref.monthsSaved));
  check(name, 'Payments avoided',        stats['Payments avoided'],        ref.monthsSaved + ' mo');
  check(name, 'Interest — baseline',   stats['Interest — baseline'],   fmt(ref.baselineInterest));
  check(name, 'Interest — with extra', stats['Interest — with extra'], fmt(ref.acceleratedInterest));
  check(name, 'Total interest saved',    stats['Total interest saved'],    fmt(ref.interestSaved));

  // Zero-extras scenarios must reproduce the baseline exactly.
  if ((i.extraMonthly || 0) === 0 && (i.lumpSum || 0) === 0){
    check(name, 'no-extras: payoff unchanged', stats['New payoff'], stats['Original payoff']);
    check(name, 'no-extras: zero interest saved', stats['Total interest saved'], fmt(0));
    checkContains(name, 'no-extras: baseline verdict', title, 'No change');
  }

  console.log('  ' + s.name + ' -> ' + stats['New payoff'] + ' payoff, ' +
              stats['Total interest saved'] + ' interest saved');
}

// ---------------------------------------------------------------------------
// Calculator 2: HELOC vs cash-out refi
// ---------------------------------------------------------------------------
console.log('\n--- heloc-refi/index.html ---');
for (const s of scenarios.helocRefi){
  const name = s.name.split(' ')[0];
  const win = loadPage('heloc-refi/index.html');
  const i = s.input;

  setVal(win, 'balance', i.balance);
  setVal(win, 'mortRate', i.mortRate);
  setVal(win, 'mortMonths', i.mortMonths);
  setVal(win, 'actualPayment', i.actualPayment);
  setVal(win, 'homeValue', i.homeValue);
  setVal(win, 'cashNeeded', i.cashNeeded);
  setVal(win, 'helocRate', i.helocRate);
  setVal(win, 'drawYears', i.drawYears);
  setVal(win, 'repayYears', i.repayYears);
  setVal(win, 'refiRate', i.refiRate);
  setVal(win, 'refiYears', i.refiYears);
  setVal(win, 'closingCosts', i.closingCosts);
  click(win, 'calcBtn');

  const ref = computeHelocRefi(i);
  const stats = readStats(win);
  const title = win.document.getElementById('verdictTitle').textContent.trim();
  const sub = win.document.getElementById('verdictSub').textContent.trim();
  const termNote = win.document.getElementById('termNote').textContent.trim();
  const interestNote = win.document.getElementById('interestNote').textContent.trim();

  if (!ref.valid){
    check(name, 'validation title', title, 'Check your numbers.');
    checkContains(name, 'validation message', sub, ref.message.replace(/\.$/, ''));
    check(name, 'no stats rendered on invalid input', Object.keys(stats).length, 0);
    console.log('  ' + s.name + ' -> validation OK');
    continue;
  }

  // The dynamic actual-payment label is part of the contract.
  const expectedLabel = ref.usingActual ? 'Current payment (yours)' : 'Current payment (estimated)';
  const absentLabel  = ref.usingActual ? 'Current payment (estimated)' : 'Current payment (yours)';
  check(name, 'dynamic payment label present', Object.prototype.hasOwnProperty.call(stats, expectedLabel), true);
  check(name, 'other payment label absent',    Object.prototype.hasOwnProperty.call(stats, absentLabel), false);
  check(name, expectedLabel, stats[expectedLabel], fmt(ref.currentPayment));

  check(name, 'HELOC — draw payment',       stats['HELOC — draw payment'],       fmt(ref.helocDrawPayment));
  check(name, 'HELOC — repayment payment',  stats['HELOC — repayment payment'],  fmt(ref.helocRepayPayment));
  check(name, 'Combined monthly, draw phase',    stats['Combined monthly, draw phase'],    fmt(ref.comboDraw));
  check(name, 'Combined monthly, repay phase',   stats['Combined monthly, repay phase'],   fmt(ref.comboRepay));
  check(name, 'Refi — new loan amount',     stats['Refi — new loan amount'],     fmt(ref.newLoanAmount));
  check(name, 'Refi — single payment',      stats['Refi — single payment'],      fmt(ref.refiPayment));
  check(name, 'Total interest — HELOC path', stats['Total interest — HELOC path'], fmt(ref.optionATotalInterest));
  check(name, 'Total interest — refi path',  stats['Total interest — refi path'],  fmt(ref.optionBTotalInterest));
  check(name, 'Closing costs rolled in', stats['Closing costs rolled in'],
        (i.closingCosts || 0) > 0 ? fmt(i.closingCosts) : 'None');
  check(name, 'Home equity today', stats['Home equity today'], fmt(ref.equity));

  // Both dimensions must be stated separately, never collapsed into one winner.
  checkContains(name, 'monthly-payment direction stated', termNote, 'Monthly payment:');
  checkContains(name, 'total-interest direction stated', interestNote, 'Total interest:');

  console.log('  ' + s.name);
  console.log('      combined draw ' + stats['Combined monthly, draw phase'] +
              ' / repay ' + stats['Combined monthly, repay phase'] +
              '  vs refi ' + stats['Refi — single payment']);
  console.log('      interest  HELOC ' + stats['Total interest — HELOC path'] +
              '  vs refi ' + stats['Total interest — refi path']);
}

console.log('\n==================================================');
console.log(' DOM assertions passed: ' + passed + ', failed: ' + failed);
if (failed){
  console.log('\nFAILURES:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(' ALL DOM TESTS PASSED');
