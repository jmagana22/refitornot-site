const { computeExtraPayments } = require('./extra-payments.math.js');
const { computeHelocRefi } = require('./heloc-refi.math.js');
const scenarios = require('./scenarios.js');

const money = n => (n < 0 ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');
const money2 = n => '$' + n.toFixed(2);
const dur = m => Math.floor(m/12) + 'y ' + (m%12) + 'm';

console.log('==================================================================');
console.log(' EXTRA MORTGAGE PAYMENTS');
console.log('==================================================================');
for (const s of scenarios.extraPayments){
  const r = computeExtraPayments(s.input);
  console.log('\n' + s.name);
  console.log('  input: ' + JSON.stringify(s.input));
  if (!r.valid){ console.log('  -> VALIDATION: ' + r.message); continue; }
  console.log('  baseline payment      : ' + money2(r.basePayment) + '  (' + money(r.basePayment) + ')');
  console.log('  baseline payoff       : ' + r.baselineMonths + ' mo (' + dur(r.baselineMonths) + ')');
  console.log('  accelerated payoff    : ' + r.acceleratedMonths + ' mo (' + dur(r.acceleratedMonths) + ')');
  console.log('  months saved          : ' + r.monthsSaved + ' (' + dur(r.monthsSaved) + ')');
  console.log('  baseline interest     : ' + money2(r.baselineInterest) + '  (' + money(r.baselineInterest) + ')');
  console.log('  accelerated interest  : ' + money2(r.acceleratedInterest) + '  (' + money(r.acceleratedInterest) + ')');
  console.log('  interest SAVED        : ' + money2(r.interestSaved) + '  (' + money(r.interestSaved) + ')');
}

console.log('\n\n==================================================================');
console.log(' HELOC vs. CASH-OUT REFI');
console.log('==================================================================');
for (const s of scenarios.helocRefi){
  const r = computeHelocRefi(s.input);
  console.log('\n' + s.name);
  if (!r.valid){ console.log('  -> VALIDATION: ' + r.message); continue; }
  console.log('  payment source        : ' + (r.usingActual ? 'ACTUAL (yours)' : 'ESTIMATED'));
  console.log('  current mortgage pmt  : ' + money2(r.currentPayment) + '  (' + money(r.currentPayment) + ')');
  console.log('  -- Option A: HELOC --');
  console.log('    heloc draw pmt      : ' + money2(r.helocDrawPayment) + '  (' + money(r.helocDrawPayment) + ')');
  console.log('    heloc repay pmt     : ' + money2(r.helocRepayPayment) + '  (' + money(r.helocRepayPayment) + ')');
  console.log('    COMBINED draw       : ' + money2(r.comboDraw) + '  (' + money(r.comboDraw) + ')');
  console.log('    COMBINED repay      : ' + money2(r.comboRepay) + '  (' + money(r.comboRepay) + ')');
  console.log('    total interest (A)  : ' + money2(r.optionATotalInterest) + '  (' + money(r.optionATotalInterest) + ')');
  console.log('  -- Option B: cash-out refi --');
  console.log('    new loan amount     : ' + money2(r.newLoanAmount) + '  (' + money(r.newLoanAmount) + ')');
  console.log('    refi payment        : ' + money2(r.refiPayment) + '  (' + money(r.refiPayment) + ')');
  console.log('    total interest (B)  : ' + money2(r.optionBTotalInterest) + '  (' + money(r.optionBTotalInterest) + ')');
  console.log('  lower pmt (draw/repay): ' + r.lowerPaymentDraw + ' / ' + r.lowerPaymentRepay);
  console.log('  lower total interest  : ' + r.lowerInterest);
}
