const { v4: uuidv4 } = require('uuid') || {};

// Fallback UUID generation
const generateCorrelationId = () => {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const generateAccountNumber = () => {
  return `ACC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
};

const generateCustomerId = () => {
  return `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
};

const formatCurrencyDisplay = (amountInCents) => {
  return (amountInCents / 100).toFixed(2);
};

const parseCurrencyInput = (amountString) => {
  const parsed = parseFloat(amountString);
  if (isNaN(parsed)) throw new Error('Invalid amount');
  return Math.round(parsed * 100);
};

module.exports = {
  generateCorrelationId,
  generateAccountNumber,
  generateCustomerId,
  formatCurrencyDisplay,
  parseCurrencyInput
};
