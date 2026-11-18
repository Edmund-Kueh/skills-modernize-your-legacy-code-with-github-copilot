# Student Account Test Plan

## Purpose and scope

Use this plan to validate the current COBOL application with business
stakeholders and define a baseline for future Node.js unit and integration
tests. It covers the menu in [main.cob](../src/cobol/main.cob), account logic
in [operations.cob](../src/cobol/operations.cob), and in-memory storage in
[data.cob](../src/cobol/data.cob).

The application manages one shared balance, not individually identified
student accounts. It implements no student IDs, authentication, tuition
categories, fees, interest, transaction history, or persistent storage.
No currency is specified. These omissions are not approved requirements
for the replacement application.

## Execution and migration guidance

- Unless stated otherwise, start a fresh process with a balance of
  `1000.00`. Each row is independent; do not carry state between rows.
- Menu choices are `1` = view, `2` = credit, `3` = debit, `4` = exit.
  Enter each choice and amount as a separate input.
- Compare balances numerically to two decimal places. COBOL's unsigned
  `PIC 9(6)V99` display can include leading zeros and an implied decimal
  point; the values below are normalized monetary values, not literal
  output strings. Capture the literal output in Actual Result.
- Rows marked **Unit**, **Integration**, or **Both** in Comments suggest
  future automated test scope. Direct program-call cases require a test
  harness rather than the interactive menu. In Node.js, test equivalent
  service/storage behavior; do not retain COBOL calling conventions
  unless an interoperability boundary needs them.
- Rows marked **Decision required** characterize validation gaps. The
  source does not define a safe business outcome for those inputs.
  Capture the compiler/runtime version, inputs, output, termination
  behavior, and final balance where observable. Obtain stakeholder
  approval before turning observations into Node.js acceptance criteria.
  Use an isolated run with a timeout for potentially invalid input.
- Actual Result and Status are deliberately unfilled: these tests have
  not been executed. Replace `Not run` with observations and `-` with
  `Pass` or `Fail` after execution. For decision-required rows, leave the
  status unset until an acceptance criterion is approved.

## Test cases

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UI-01 | Show the account menu on startup | Fresh process | Launch the application. | Displays `Account Management System`, all four labeled choices, and `Enter your choice (1-4):`; waits for input. | Not run | - | Integration; verifies discoverability of supported operations. |
| UI-02 | Reject unsupported single-digit menu choices and recover | Fresh process | Enter `0`; enter `5`; enter `9`; then choose `1`. | Each unsupported choice displays `Invalid choice, please select 1-4.` and redisplays the menu. Viewing still shows `1000.00`; no amount prompt or account operation occurs for the invalid choices. | Not run | - | Integration; covers `WHEN OTHER` using representable numeric inputs. |
| UI-03 | Return to the menu after account operations | Fresh process | View; credit `10.00`; debit `5.00`; view again. | Menu returns after each operation without restarting the process. Displayed balances are `1000.00`, `1010.00`, `1005.00`, and `1005.00`, respectively. | Not run | - | Integration; repeated calls preserve state and accept new input. |
| UI-04 | Exit without performing a transaction | Fresh process | Choose `4`. | Displays `Exiting the program. Goodbye!` and terminates; no further menu or amount prompt appears. | Not run | - | Integration; verifies loop termination and `STOP RUN`. |
| BAL-01 | Initialize and view the opening balance without changing it | Fresh process | Choose `1` twice. | Both views display `Current balance: ` followed by a balance numerically equal to `1000.00`; viewing does not alter storage. | Not run | - | Both; initial balance and non-mutating reads. |
| CR-01 | Credit a positive whole-number amount | Fresh process | Choose `2`; enter `250.00`; choose `1`. | Prompts `Enter credit amount: `; displays `Amount credited. New balance: ` with `1250.00`; subsequent view also shows `1250.00`. | Not run | - | Both; credit arithmetic and stored result. |
| CR-02 | Credit cents with carry into the whole-number balance | Fresh process | Credit `0.99`; credit `0.01`; view. | Credit results are `1000.99` then `1001.00`; view shows `1001.00`. | Not run | - | Both; exact cents and decimal carry. Use exact monetary arithmetic in Node.js. |
| CR-03 | Credit zero | Fresh process | Credit `0.00`; view. | Reports a successful credit; balance remains `1000.00`. No positive-amount validation rejects zero. | Not run | - | Both; confirm with stakeholders whether zero-value transactions should remain allowed. |
| CR-04 | Reach the maximum representable balance | Fresh process | Credit `998999.99`; view. | Successful credit leaves `999999.99`, the maximum value of `PIC 9(6)V99`; view agrees. | Not run | - | Both; valid upper boundary, not an approved business transaction limit. |
| DB-01 | Debit an amount less than the balance | Fresh process | Choose `3`; enter `250.00`; choose `1`. | Prompts `Enter debit amount: `; displays `Amount debited. New balance: ` with `750.00`; subsequent view shows `750.00`. | Not run | - | Both; successful debit arithmetic and persistence within the run. |
| DB-02 | Debit cents with borrowing from the whole-number balance | Fresh process | Debit `0.01`; view. | Successful debit leaves `999.99`; view shows the same balance. | Not run | - | Both; smallest positive cent amount and decimal borrow. |
| DB-03 | Allow a debit equal to the full balance | Fresh process | Debit `1000.00`; view. | Debit succeeds and leaves `0.00`; no insufficient-funds message appears. | Not run | - | Both; equality branch of the sufficient-funds rule. |
| DB-04 | Reject a debit one cent above the available balance | Fresh process | Debit `1000.01`; view. | Displays `Insufficient funds for this debit.`; no success message or storage write occurs; view remains `1000.00`. | Not run | - | Both; insufficient-funds boundary. A unit test can verify no write. |
| DB-05 | Reject a large debit above the available balance | Fresh process | Debit `999999.99`; view. | Displays the insufficient-funds message and leaves `1000.00` unchanged. | Not run | - | Both; maximum representable amount is not necessarily available funds. |
| DB-06 | Debit zero from positive and zero balances | Fresh process | Debit `0.00`; debit `1000.00`; debit `0.00`; view. | All three debits report success. Balances are `1000.00`, `0.00`, and `0.00`; final view is zero. | Not run | - | Both; zero is accepted even when the balance is zero. Confirm desired migration policy. |
| DB-07 | Reject a positive debit from a zero balance | Balance brought to zero by debiting `1000.00` | Debit `0.01`; view. | Insufficient-funds message; stored balance remains `0.00`. | Not run | - | Both; lower balance boundary. |
| FLOW-01 | Use the latest balance across mixed transactions | Fresh process | Credit `125.50`; debit `25.25`; credit `0.75`; debit `101.00`; view. | Successive balances are `1125.50`, `1100.25`, `1101.00`, and `1000.00`; final view agrees. | Not run | - | Integration; confirms each operation uses current storage, not its initial working value. |
| FLOW-02 | Recover after an insufficient-funds request | Fresh process | Debit `1100.00`; credit `100.00`; debit `1100.00`; view. | First debit fails without changing `1000.00`; credit produces `1100.00`; second debit succeeds and leaves `0.00`. | Not run | - | Integration; failure does not poison subsequent operations or end the menu loop. |
| FLOW-03 | Retain updates during a run but reset on restart | Fresh process | Credit `50.00`; view; exit; start a new process; view. | First run shows `1050.00`; new run shows `1000.00`. No prior balance is restored. | Not run | - | Integration; in-memory lifetime. Stakeholders must decide whether Node.js should add persistence. |
| DATA-01 | Read the authoritative stored balance into a caller value | Fresh program state; direct-call harness; caller balance initialized to `42.00` | Call `DataProgram` with `READ` and the caller balance; repeat the read. | Caller balance becomes `1000.00` on both reads; storage is unchanged. | Not run | - | Unit; `READ` overwrites the caller's value rather than returning an independent default. |
| DATA-02 | Write replaces storage rather than adding to it | Fresh program state; direct-call harness | Write `123.45`; read into another caller value; write `20.00`; read again. | Reads return `123.45` then `20.00`. `WRITE` replaces the stored value. | Not run | - | Unit; isolates the storage contract from account arithmetic. |
| DATA-03 | Store the lower and upper representable boundaries | Direct-call harness | Write and read `0.00`; then write and read `999999.99`. | Each read returns exactly the last written value; storage applies no additional business limit. | Not run | - | Unit; storage itself does not enforce debit eligibility or transaction rules. |
| OPS-01 | Read storage before each account operation | Direct-call harness; stored balance set to `200.00` through `DataProgram` | Call `Operations` with `TOTAL `; call `CREDIT` with entered amount `10.00`; call `DEBIT ` with entered amount `5.00`; read storage. | View reports `200.00`, credit reports `210.00`, debit reports `205.00`, and final stored balance is `205.00`, regardless of the initial `FINAL-BALANCE` value. | Not run | - | Both; tests the Operations-to-DataProgram boundary explicitly. |
| OPS-02 | Ignore an unsupported account operation | Direct-call harness; known stored balance; valid six-character operation field | Call `Operations` with `BOGUS `; read storage. | Returns via `GOBACK` without prompting, displaying an operation result, or changing the balance. No explicit error is reported. | Not run | - | Unit; implementation characterization, not menu-accessible. Decide whether Node.js should report an error instead. |
| DATA-04 | Ignore an unsupported storage operation | Direct-call harness; storage `1000.00`; caller balance `42.00`; valid six-character operation field | Call `DataProgram` with `BOGUS ` and caller balance; then perform a valid read into a separate value. | Unsupported call returns without an error; caller balance remains `42.00`; subsequent valid read returns `1000.00`. | Not run | - | Unit; no read or write occurs for an unrecognized operation. |
| GAP-01 | Characterize nonnumeric or malformed menu input | Isolated fresh process per input | Separately enter `abc`, an empty line, `1.5`, and `12`; record dispatch and attempt a valid choice if still running. | No explicit input-format validation exists; single-digit `PIC 9` conversion may affect dispatch. Capture observed behavior; do not assume every malformed value reaches the invalid-choice branch. | Not run | - | Decision required; Integration. Agree on accepted menu syntax and recovery. |
| GAP-02 | Characterize negative transaction amounts | Isolated fresh process per operation | Separately attempt credit `-10.00` and debit `-10.00`; view if possible. | Unsigned amount fields have no explicit negative-input rejection. Capture conversion, messages, and balance; do not assume either rejection or signed arithmetic. | Not run | - | Decision required; Both. Agree whether negatives must be rejected before arithmetic. |
| GAP-03 | Characterize nonnumeric and blank amounts | Isolated fresh process per operation and input | For both credit and debit, separately enter `abc` and an empty line; view if possible. | No explicit numeric validation or invalid-amount message exists. Record conversion/runtime behavior and any balance change; a safe rejection is not guaranteed by the source. | Not run | - | Decision required; Both. Define required error messages, unchanged-balance guarantees, and retry behavior. |
| GAP-04 | Characterize amounts with more than two decimal places | Isolated fresh process per operation | Separately attempt credit `1.239` and debit `1.239`; view if possible. | Fields hold only two decimal places; no explicit rounding or excess-precision policy exists. Capture actual conversion and resulting balance. | Not run | - | Decision required; Both. Agree on rejection, rounding, or truncation before writing Node.js tests. |
| GAP-05 | Characterize an amount wider than the numeric field | Isolated fresh process per operation | Separately attempt credit `1000000.00` and debit `1000000.00`; view if possible. | Input exceeds the six-integer-digit field capacity; no explicit range check exists. Capture conversion and balance; do not assume the requested amount is preserved or rejected. | Not run | - | Decision required; Both. Distinct from arithmetic overflow after valid input. |
| GAP-06 | Characterize credit arithmetic overflow | Fresh process; balance raised to `999999.99` by crediting `998999.99` | Credit `0.01`; view if possible. | Mathematical result `1000000.00` cannot fit the balance field. There is no `ON SIZE ERROR` handling or explicit overflow message. Record the observed result rather than treating truncation or wraparound as an approved rule. | Not run | - | Decision required; Both. Define maximum balance and atomic rejection behavior for Node.js. |
| GAP-07 | Characterize formatted amount input | Isolated fresh process per operation and input | For both credit and debit, separately enter `1,000.00` and `$10.00`; view if possible. | No explicit separator or currency-symbol parsing policy exists. Capture conversion and balance rather than assuming these forms are supported or rejected. | Not run | - | Decision required; Integration. Agree on accepted monetary input syntax and currency. |
| GAP-08 | Characterize input ending before a choice or amount | Isolated fresh process per scenario; timeout-enabled runner | End input at the menu; separately choose credit then end input; separately choose debit then end input. | No explicit end-of-input handling exists. Record whether the process exits, repeats, blocks, or changes state; no graceful-exit or cancellation guarantee is defined. | Not run | - | Decision required; Integration. Define cancellation and EOF behavior for the replacement interface. |

## Stakeholder review and acceptance

- Review the deterministic cases as the current-behavior baseline, including
  the opening balance, sufficient-funds rule, cents precision, zero-value
  operations, single-account scope, and loss of state on restart.
- Resolve each decision-required row with an approved expected result.
  Record the decision, reviewer, and date in Comments. Track intentional
  changes from COBOL behavior rather than silently treating them as parity.
- Agree whether student identification, authorization, persistent balances,
  audit history, currency, fees, or other student-specific policies are in
  scope for the replacement; they are not current implemented rules.
- Use the approved numeric scenarios for Node.js unit tests, storage
  contract cases for repository tests, and menu/workflow cases for
  integration tests against the replacement interface. Include failed
  transaction checks that assert the balance is unchanged.
- Mark the baseline accepted only after results are recorded, failures
  are resolved or explicitly accepted, and open business decisions are
  documented. This plan alone does not constitute execution or sign-off.
