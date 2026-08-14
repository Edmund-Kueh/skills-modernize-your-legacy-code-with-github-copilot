const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const INITIAL_BALANCE_CENTS = 100_000;
const MAX_BALANCE_CENTS = 99_999_999;

let balanceCents = INITIAL_BALANCE_CENTS;

function dataProgram(operation, amountCents) {
  if (operation === 'READ') {
    return balanceCents;
  }

  if (operation === 'WRITE') {
    balanceCents = amountCents;
  }

  return undefined;
}

function formatAmount(amountCents) {
  return (amountCents / 100).toFixed(2);
}

function parseAmount(input) {
  const amount = input.trim();

  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(amount)) {
    return null;
  }

  const [whole, fraction = ''] = amount.split('.');
  const amountCents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  return amountCents <= MAX_BALANCE_CENTS ? amountCents : null;
}

function displayMenu() {
  console.log('--------------------------------');
  console.log('Account Management System');
  console.log('1. View Balance');
  console.log('2. Credit Account');
  console.log('3. Debit Account');
  console.log('4. Exit');
  console.log('--------------------------------');
}

async function readAmount(terminal, prompt) {
  const input = await terminal.question(prompt);

  if (input === null) {
    return null;
  }

  const amountCents = parseAmount(input);

  if (amountCents === null) {
    console.log('Invalid amount. Enter up to six digits and two decimal places.');
  }

  return amountCents;
}

async function performOperation(operation, terminal) {
  if (operation === 'TOTAL') {
    const finalBalanceCents = dataProgram('READ');
    console.log(`Current balance: ${formatAmount(finalBalanceCents)}`);
    return;
  }

  if (operation === 'CREDIT') {
    const amountCents = await readAmount(terminal, 'Enter credit amount: ');

    if (amountCents === null) {
      return;
    }

    const finalBalanceCents = dataProgram('READ') + amountCents;

    if (finalBalanceCents > MAX_BALANCE_CENTS) {
      console.log('Credit would exceed the maximum account balance.');
      return;
    }

    dataProgram('WRITE', finalBalanceCents);
    console.log(`Amount credited. New balance: ${formatAmount(finalBalanceCents)}`);
    return;
  }

  if (operation === 'DEBIT') {
    const amountCents = await readAmount(terminal, 'Enter debit amount: ');

    if (amountCents === null) {
      return;
    }

    const finalBalanceCents = dataProgram('READ');

    if (finalBalanceCents >= amountCents) {
      const updatedBalanceCents = finalBalanceCents - amountCents;
      dataProgram('WRITE', updatedBalanceCents);
      console.log(`Amount debited. New balance: ${formatAmount(updatedBalanceCents)}`);
    } else {
      console.log('Insufficient funds for this debit.');
    }
  }
}

async function main() {
  const inputReader = readline.createInterface({ input: stdin });
  const inputLines = inputReader[Symbol.asyncIterator]();
  const terminal = {
    async question(prompt) {
      stdout.write(prompt);
      const nextLine = await inputLines.next();
      return nextLine.done ? null : nextLine.value;
    },
  };
  let shouldContinue = true;

  try {
    while (shouldContinue) {
      displayMenu();
      const input = await terminal.question('Enter your choice (1-4): ');

      if (input === null) {
        break;
      }

      const choice = input.trim();

      switch (choice) {
        case '1':
          await performOperation('TOTAL', terminal);
          break;
        case '2':
          await performOperation('CREDIT', terminal);
          break;
        case '3':
          await performOperation('DEBIT', terminal);
          break;
        case '4':
          shouldContinue = false;
          break;
        default:
          console.log('Invalid choice, please select 1-4.');
      }
    }

    console.log('Exiting the program. Goodbye!');
  } finally {
    inputReader.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('The accounting application stopped unexpectedly.', error);
    process.exitCode = 1;
  });
}

module.exports = {
  INITIAL_BALANCE_CENTS,
  MAX_BALANCE_CENTS,
  dataProgram,
  formatAmount,
  main,
  parseAmount,
  performOperation,
};