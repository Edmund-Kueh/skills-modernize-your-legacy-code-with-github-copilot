# COBOL Student Account Test Plan

## Purpose

This plan captures the observable business rules and implementation behavior of
the current COBOL application. It is intended for validation with business
stakeholders and as a behavioral baseline for future Node.js unit and
integration tests.

Unless a test states otherwise, start a new application process with the
default balance of `1000.00`. Record observed output in **Actual Result**, set
**Status (Pass/Fail)** after execution, and use **Comments** for stakeholder
decisions or implementation differences.

## Test Cases

<!-- markdownlint-disable MD033 -->

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-001 | Start the account application | Application is not running | 1. Start `MainProgram`.<br>2. Observe the first screen. | The account menu displays choices 1 through 4 and prompts for a choice. The account balance is initialized to `1000.00`. | To be recorded | Not Run | Integration: startup and menu rendering |
| TC-002 | View the opening balance | New application process; no transactions performed | 1. Select choice 1.<br>2. Observe the displayed balance. | `Operations` reads the balance from `DataProgram`; the displayed current balance is `1000.00`; no balance change occurs; the menu is displayed again. | To be recorded | Not Run | Integration: `TOTAL` routing and `READ` |
| TC-003 | Credit the account with a positive amount | Current balance is `1000.00` | 1. Select choice 2.<br>2. Enter `250.50`.<br>3. Observe the result.<br>4. Select choice 1. | The credit is accepted, the new balance `1250.50` is stored and displayed, and a later balance inquiry also displays `1250.50`. | To be recorded | Not Run | Unit: addition rule; integration: `READ` then `WRITE` |
| TC-004 | Apply multiple credits in one session | Current balance is `1000.00` | 1. Credit `100.00`.<br>2. Credit `50.25`.<br>3. View the balance. | Credits are cumulative and the final balance is `1150.25`. | To be recorded | Not Run | Validates process-lifetime state |
| TC-005 | Debit less than the available balance | Current balance is `1000.00` | 1. Select choice 3.<br>2. Enter `250.25`.<br>3. Observe the result.<br>4. View the balance. | The debit is approved because sufficient funds exist; `749.75` is stored and displayed; the later inquiry displays `749.75`. | To be recorded | Not Run | Unit: subtraction and sufficient-funds rule |
| TC-006 | Debit exactly the available balance | Current balance is `1000.00` | 1. Select choice 3.<br>2. Enter `1000.00`.<br>3. View the balance. | The debit is approved because the rule uses greater-than-or-equal comparison; the resulting balance is `0.00`. | To be recorded | Not Run | Boundary: debit equal to balance |
| TC-007 | Reject a debit greater than the available balance | Current balance is `1000.00` | 1. Select choice 3.<br>2. Enter `1000.01`.<br>3. Observe the result.<br>4. View the balance. | The application displays `Insufficient funds for this debit.`; no write occurs; the balance remains `1000.00`. | To be recorded | Not Run | Unit: no-overdraft rule and unchanged state |
| TC-008 | Credit a zero amount | Current balance is `1000.00` | 1. Select choice 2.<br>2. Enter `0.00`.<br>3. View the balance. | The current implementation accepts the credit and stores a balance of `1000.00`; no minimum credit rule is enforced. | To be recorded | Not Run | Stakeholder decision: should zero-value credits be allowed? |
| TC-009 | Debit a zero amount | Current balance is `1000.00` | 1. Select choice 3.<br>2. Enter `0.00`.<br>3. View the balance. | The current implementation approves the debit and stores a balance of `1000.00`; no minimum debit rule is enforced. | To be recorded | Not Run | Stakeholder decision: should zero-value debits be allowed? |
| TC-010 | Preserve two decimal places in transactions | Current balance is `1000.00` | 1. Credit `0.01`.<br>2. Debit `0.02`.<br>3. View the balance. | Both amounts are processed to two decimal places and the final balance is `999.99`. | To be recorded | Not Run | Unit: currency precision represented by `PIC 9(6)V99` |
| TC-011 | Persist an updated balance across menu operations | Current balance is `1000.00` | 1. Credit `200.00`.<br>2. View the balance.<br>3. Debit `50.00`.<br>4. View the balance. | The first inquiry displays `1200.00`; the debit uses that updated balance; the final inquiry displays `1150.00`. | To be recorded | Not Run | Integration: shared `DataProgram` working storage |
| TC-012 | Reset the balance after application restart | Complete any transaction so the balance is not `1000.00` | 1. Select choice 4 to exit.<br>2. Start a new application process.<br>3. Select choice 1. | The new process displays `1000.00`; changes from the previous process are not persisted. | To be recorded | Not Run | Stakeholder decision: future Node.js persistence requirement |
| TC-013 | Reject a menu choice outside 1 through 4 | Application is displaying the menu | 1. Enter `5`.<br>2. Observe the response. | The application displays `Invalid choice, please select 1-4.`; no account operation or balance change occurs; the menu is displayed again. | To be recorded | Not Run | Integration: `WHEN OTHER` routing |
| TC-014 | Exit the application | Application is displaying the menu | 1. Enter `4`.<br>2. Observe the response. | `CONTINUE-FLAG` is set to `NO`; no further menu is displayed; the application displays `Exiting the program. Goodbye!` and stops. | To be recorded | Not Run | Integration: loop termination |
| TC-015 | Read the stored balance through `DataProgram` | `STORAGE-BALANCE` contains a known value such as `1000.00` | 1. Call `DataProgram` with operation `READ` and a balance field.<br>2. Inspect the returned balance. | The caller's balance field contains the current `STORAGE-BALANCE`; stored state is unchanged. | To be recorded | Not Run | Future unit test for storage adapter |
| TC-016 | Write and then read a balance through `DataProgram` | `DataProgram` is loaded | 1. Call `DataProgram` with `WRITE` and `4321.09`.<br>2. Call it with `READ` into a new balance field. | The read returns `4321.09`, proving that `WRITE` replaces the single stored balance for the current process. | To be recorded | Not Run | Future unit test for storage adapter |
| TC-017 | Send an unsupported operation to `DataProgram` | Stored balance is known; for example, `1000.00` | 1. Call `DataProgram` with an operation other than `READ` or `WRITE`.<br>2. Read the stored balance. | No read or write branch executes; `DataProgram` returns without changing `STORAGE-BALANCE`; the later read returns `1000.00`. | To be recorded | Not Run | Characterizes current silent handling; stakeholder decision on errors |
| TC-018 | Send an unsupported operation to `Operations` | Stored balance is known; for example, `1000.00` | 1. Call `Operations` with a six-character code other than `TOTAL`, `CREDIT`, or `DEBIT`.<br>2. Read the balance. | No transaction branch executes; `Operations` returns without a message or balance change; the balance remains `1000.00`. | To be recorded | Not Run | Characterizes current silent handling; future API should define an error |
| TC-019 | Enter non-numeric menu input | Application is displaying the menu | 1. Enter a non-numeric value such as `A`.<br>2. Record the application response and whether the menu continues. | No application-level validation rule is implemented because input is accepted directly into `PIC 9`. Runtime behavior must be characterized and agreed with stakeholders before Node.js migration. | To be recorded | Not Run | Characterization test; define desired validation and error message |
| TC-020 | Enter a negative transaction amount | Current balance is `1000.00` | 1. Select choice 2 or 3.<br>2. Enter `-1.00`.<br>3. Record the response and balance. | Negative values are not represented by the unsigned `PIC 9(6)V99` field, and no application-level validation exists. Runtime behavior must be characterized; the future business rule requires stakeholder approval. | To be recorded | Not Run | Characterization test; Node.js must not infer a rule silently |
| TC-021 | Enter a transaction amount with more than two decimal places | Current balance is `1000.00` | 1. Select choice 2.<br>2. Enter `1.999`.<br>3. Record the displayed and stored balance. | The COBOL data field supports only two decimal places, but the application defines no rounding or rejection rule. Observed runtime behavior and the desired Node.js rule must be recorded. | To be recorded | Not Run | Characterization test: reject, truncate, or round |
| TC-022 | Credit beyond the maximum representable balance | Set the balance near the `PIC 9(6)V99` maximum of `999999.99` | 1. Set the balance to `999999.99` through `DataProgram`.<br>2. Credit `0.01`.<br>3. Record the response and stored balance. | The application has no overflow check or defined business response. Runtime behavior must be characterized and a future maximum-balance rule agreed with stakeholders. | To be recorded | Not Run | Characterization test; high migration risk |
| TC-023 | Verify all users share one account balance | Application is running; simulate two users sequentially in the same process | 1. First user credits `100.00`.<br>2. Second user views the balance without restarting. | The second user sees `1100.00` because the implementation has one shared balance and no student identifier or account isolation. | To be recorded | Not Run | Stakeholder decision: confirm this is a legacy limitation, not a target rule |

<!-- markdownlint-enable MD033 -->

## Stakeholder Sign-off Notes

Cases TC-019 through TC-023 expose behavior that is undefined, runtime-specific,
or likely to change during modernization. Stakeholders should record the target
Node.js rule in **Comments** rather than treating accidental COBOL runtime
behavior as an approved business requirement.
