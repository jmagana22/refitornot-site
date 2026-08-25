// Standalone math for the HELOC vs. Cash-Out Refi calculator.
// Reference implementation; heloc-refi/index.html must match.

function monthlyPayment(principal, annualRatePct, months){
  if (months <= 0) return 0;
  const r = (annualRatePct / 100) / 12;
  if (r === 0) return principal / months;
  return principal * r / (1 - Math.pow(1 + r, -months));
}

function computeHelocRefi(input){
  const balance      = input.balance;
  const mortRate     = input.mortRate;
  const mortMonths   = input.mortMonths;
  const actualPay    = input.actualPayment;      // undefined/NaN/0 => estimate
  const homeValue    = input.homeValue || 0;
  const cashNeeded   = input.cashNeeded;
  const helocRate    = input.helocRate;
  const drawYears    = input.drawYears;
  const repayYears   = input.repayYears;
  const refiRate     = input.refiRate;
  const refiYears    = input.refiYears;
  const closingCosts = input.closingCosts || 0;

  if (!(balance > 0))     return { valid:false, message:'Enter a current mortgage balance greater than $0.' };
  if (!(mortMonths > 0))  return { valid:false, message:'Enter a remaining mortgage term of at least one month.' };
  if (!(cashNeeded > 0))  return { valid:false, message:'Enter how much cash you need. With $0 to pull out there is nothing to compare.' };
  if (!(drawYears > 0))   return { valid:false, message:'Enter a HELOC draw period of at least one year.' };
  if (!(repayYears > 0))  return { valid:false, message:'Enter a HELOC repayment period of at least one year.' };
  if (!(refiYears > 0))   return { valid:false, message:'Enter a cash-out refi term of at least one year.' };

  // --- current mortgage (shared baseline) ---
  const usingActual      = actualPay > 0;
  const estimatedPayment = monthlyPayment(balance, mortRate, mortMonths);
  const currentPayment   = usingActual ? actualPay : estimatedPayment;
  const mortgageInterestRemaining = (currentPayment * mortMonths) - balance;

  // --- Option A: HELOC ---
  const helocMonthlyRate = (helocRate / 100) / 12;
  const drawMonths  = drawYears * 12;
  const repayMonths = repayYears * 12;

  const helocDrawPayment  = cashNeeded * helocMonthlyRate;              // interest-only
  const helocDrawInterest = helocDrawPayment * drawMonths;
  const helocRepayPayment = monthlyPayment(cashNeeded, helocRate, repayMonths);
  const helocRepayInterest = (helocRepayPayment * repayMonths) - cashNeeded;
  const helocTotalInterest = helocDrawInterest + helocRepayInterest;

  const comboDraw  = currentPayment + helocDrawPayment;
  const comboRepay = currentPayment + helocRepayPayment;
  const optionATotalInterest = mortgageInterestRemaining + helocTotalInterest;

  // --- Option B: cash-out refi ---
  const newLoanAmount = balance + cashNeeded + closingCosts;
  const refiMonths    = refiYears * 12;
  const refiPayment   = monthlyPayment(newLoanAmount, refiRate, refiMonths);
  const optionBTotalInterest = (refiPayment * refiMonths) - newLoanAmount;

  const equity = homeValue > 0 ? homeValue - balance : null;
  const refiLtv = homeValue > 0 ? (newLoanAmount / homeValue) * 100 : null;

  return {
    valid: true,
    usingActual: usingActual,
    currentPayment: currentPayment,
    estimatedPayment: estimatedPayment,
    mortgageInterestRemaining: mortgageInterestRemaining,
    helocDrawPayment: helocDrawPayment,
    helocRepayPayment: helocRepayPayment,
    helocTotalInterest: helocTotalInterest,
    comboDraw: comboDraw,
    comboRepay: comboRepay,
    optionATotalInterest: optionATotalInterest,
    newLoanAmount: newLoanAmount,
    refiPayment: refiPayment,
    optionBTotalInterest: optionBTotalInterest,
    equity: equity,
    refiLtv: refiLtv,
    // comparison flags: these can disagree, which is the whole point
    lowerPaymentDraw:  comboDraw  < refiPayment ? 'heloc' : (comboDraw  > refiPayment ? 'refi' : 'tie'),
    lowerPaymentRepay: comboRepay < refiPayment ? 'heloc' : (comboRepay > refiPayment ? 'refi' : 'tie'),
    lowerInterest: optionATotalInterest < optionBTotalInterest ? 'heloc'
                 : (optionATotalInterest > optionBTotalInterest ? 'refi' : 'tie')
  };
}

module.exports = { monthlyPayment, computeHelocRefi };
