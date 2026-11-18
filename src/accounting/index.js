'use strict';

const { createInterface } = require('node:readline');

const MAX_BALANCE = 99999999;
const MENU = [
  '--------------------------------',
  'Account Management System',
  '1. View Balance',
  '2. Credit Account',
  '3. Debit Account',
  '4. Exit',
  '--------------------------------',
  'Enter your choice (1-4): ',
].join('\n');

function formatAmount(cents) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

function createAccount() {
  let balance = 100000;

  function write(cents) {
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_BALANCE) {
      throw new RangeError('Balance must be integer cents from 0 to 99999999.');
    }
    balance = cents;
  }

  function transact(amountText, credit) {
    if (typeof amountText !== 'string'
        || !/^\d{1,6}(?:\.\d{1,2})?$/.test(amountText.trim())) {
      throw new RangeError(
        'Invalid amount. Enter 0 to 999999.99 with at most two decimal places.',
      );
    }
    const [whole, fraction = ''] = amountText.trim().split('.');
    const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (credit && balance + amount > MAX_BALANCE) {
      throw new RangeError('Credit would exceed the maximum balance of 999999.99.');
    }
    if (!credit && amount > balance) {
      throw new RangeError('Insufficient funds for this debit.');
    }
    write(credit ? balance + amount : balance - amount);
    return balance;
  }

  return {
    read: () => balance,
    write,
    credit: (amount) => transact(amount, true),
    debit: (amount) => transact(amount, false),
  };
}

async function main() {
  const reader = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines = reader[Symbol.asyncIterator]();
  const account = createAccount();

  try {
    while (true) {
      process.stdout.write(MENU);
      const choice = await lines.next();
      if (choice.done || choice.value.trim() === '4') {
        break;
      }

      switch (choice.value.trim()) {
        case '1':
          console.log(`Current balance: ${formatAmount(account.read())}`);
          break;
        case '2':
        case '3': {
          const credit = choice.value.trim() === '2';
          process.stdout.write(`Enter ${credit ? 'credit' : 'debit'} amount: `);
          const amountInput = await lines.next();
          if (amountInput.done) {
            console.log('Transaction cancelled: input ended.');
            return;
          }

          try {
            const balance = credit
              ? account.credit(amountInput.value)
              : account.debit(amountInput.value);
            console.log(
              `Amount ${credit ? 'credited' : 'debited'}. New balance: ${formatAmount(balance)}`,
            );
          } catch (error) {
            if (!(error instanceof RangeError)) {
              throw error;
            }
            console.log(error.message);
          }
          break;
        }
        default:
          console.log('Invalid choice, please select 1-4.');
      }
    }
  } finally {
    reader.close();
    console.log('Exiting the program. Goodbye!');
  }
}

module.exports = { createAccount };

if (require.main === module) {
  main().catch((error) => {
    console.error('Accounting application failed:', error);
    process.exitCode = 1;
  });
}
