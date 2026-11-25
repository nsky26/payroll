/**
 * Deterministic multi-country, multi-currency payroll calculation engine.
 * All monetary math uses fixed-precision rounding (no LLM arithmetic).
 */

export function roundMoney(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

export function convertCurrency(amount, fromRateToUsd, toRateToUsd) {
  if (!fromRateToUsd || !toRateToUsd) return roundMoney(amount);
  const usdValue = Number(amount) * Number(fromRateToUsd);
  return roundMoney(usdValue / Number(toRateToUsd));
}

export function calculateEmployeePayslip({ employee, country, lopDays = 0, reimbursementAdd = 0, firmCurrencyRate, empCurrencyRate }) {
  // Convert employee salary to firm's base currency if employee currency differs
  const baseSalaryInFirmCurrency =
    employee.currency_code === country.currency_code || !empCurrencyRate
      ? Number(employee.base_salary)
      : convertCurrency(employee.base_salary, empCurrencyRate, firmCurrencyRate);

  const workingDays = 30;
  const effectiveLop = Math.max(0, Math.min(workingDays, Number(lopDays || 0)));
  const lopDeduction = roundMoney((baseSalaryInFirmCurrency / workingDays) * effectiveLop);
  const grossPay = roundMoney(baseSalaryInFirmCurrency - lopDeduction);

  const statutoryPct = Number(country.statutory_rate_pct || 0);
  let taxPct = Number(country.default_tax_pct || 0);

  // Country-specific regime adjustments
  if (employee.country_code === 'IN' && employee.tax_regime === 'old_regime') {
    taxPct = Math.max(0, taxPct - 2.0);
  } else if (employee.country_code === 'US' && employee.tax_regime === 'W4-Married') {
    taxPct = Math.max(0, taxPct - 3.0);
  }

  const statutoryDeduction = roundMoney((grossPay * statutoryPct) / 100);
  const incomeTax = roundMoney((grossPay * taxPct) / 100);
  const netPay = roundMoney(grossPay - statutoryDeduction - incomeTax + Number(reimbursementAdd || 0));

  const breakdown = {
    base_salary: roundMoney(baseSalaryInFirmCurrency),
    lop_deduction: lopDeduction,
    gross_pay: grossPay,
    statutory_name: country.statutory_name,
    statutory_rate_pct: statutoryPct,
    statutory_deduction: statutoryDeduction,
    tax_authority: country.tax_authority,
    tax_rate_pct: taxPct,
    income_tax: incomeTax,
    reimbursement_add: roundMoney(reimbursementAdd)
  };

  // Country-specific earnings split for India
  if (country.code === 'IN') {
    breakdown.basic = roundMoney(grossPay * 0.5);
    breakdown.hra = roundMoney(grossPay * 0.25);
    breakdown.special_allowance = roundMoney(grossPay - breakdown.basic - breakdown.hra);
  }

  return {
    grossPay,
    statutoryDeduction,
    incomeTax,
    reimbursementAdd: roundMoney(reimbursementAdd),
    lopDays: effectiveLop,
    netPay,
    breakdown
  };
}
