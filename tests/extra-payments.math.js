// Standalone math for the Extra Mortgage Payments calculator.
// This is the reference implementation. The inline JS in extra-payments/index.html
// must produce identical numbers; tests/dom.test.js asserts that.

function monthlyPayment(principal, annualRatePct, months){
  if (months <= 0) return 0;
  const r = (annualRatePct / 100) / 12;
  if (r === 0) return principal / months;
  return principal * r / (1 - Math.pow(1 + r, -months));
}

// Month-by-month amortization. extraMonthly is added to principal every month;
// lumpSum is applied to principal in month 1. Principal is capped each month so
// the balance never goes below zero (no overpaying the final month).
function simulate(balance, annualRatePct, termMonths, basePayment, extraMonthly, lumpSum){
  const r = (annualRatePct / 100) / 12;
  let bal = balance;
  let totalInterest = 0;
  let m = 0;
  const maxIter = termMonths + 1200;
  while (bal > 0.005 && m < maxIter){
    m++;
    const interest = bal * r;
    let principal = basePayment - interest + extraMonthly + (m === 1 ? lumpSum : 0);
    if (principal <= 0) return { months: Infinity, totalInterest: Infinity, neverPaysOff: true };
    if (principal > bal) principal = bal;
    bal -= principal;
    totalInterest += interest;
  }
  return { months: m, totalInterest: totalInterest, neverPaysOff: false };
}

function computeExtraPayments(input){
  const balance = input.balance;
  const rate = input.rate;
  const termMonths = input.termMonths;
  const extraMonthly = input.extraMonthly || 0;
  const lumpSum = input.lumpSum || 0;

  if (!(balance > 0)) return { valid: false, message: 'Enter a loan balance greater than $0.' };
  if (!(termMonths > 0)) return { valid: false, message: 'Enter a remaining term of at least one month.' };

  const basePayment = monthlyPayment(balance, rate, termMonths);
  const base = simulate(balance, rate, termMonths, basePayment, 0, 0);
  const accel = simulate(balance, rate, termMonths, basePayment, extraMonthly, lumpSum);

  return {
    valid: true,
    basePayment: basePayment,
    baselineMonths: base.months,
    acceleratedMonths: accel.months,
    monthsSaved: base.months - accel.months,
    baselineInterest: base.totalInterest,
    acceleratedInterest: accel.totalInterest,
    interestSaved: base.totalInterest - accel.totalInterest
  };
}

module.exports = { monthlyPayment, simulate, computeExtraPayments };
