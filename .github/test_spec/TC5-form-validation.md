# TC5 — Form Validation

**Automated coverage:** [tests/tc5-form-validation.spec.ts](../../tests/tc5-form-validation.spec.ts)
**Priority:** Medium
**Applicable sites:** Alice Lodging, Firesky Retreats (run independently on each)

## Objective

Confirm the "List With Us" property-owner inquiry form correctly rejects invalid contact details:
the Submit button starts disabled, and inline field-level error messages appear once an invalid
value is entered and the field is left (blurred).

## Preconditions

- None.

## Test data

- **Name**: "QA Test Owner"
- **Email** (intentionally invalid): `not-an-email`
- **Phone** (intentionally invalid): `123`
- **Message**: "Automated validation test - please ignore."

## Steps and expected results

| #   | Step                                                                                 | Expected result                                                                                                                                |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to `/list-with-us`.                                                         | Form loads with Name, Email, Phone, Country, Message fields (plus, on Firesky only, an additional "Property Location" field — see Notes).      |
| 2   | Before entering anything, check the Submit button's state.                           | Submit is **disabled**.                                                                                                                        |
| 3   | Enter "QA Test Owner" in the Name field.                                             | Accepted, no error shown.                                                                                                                      |
| 4   | Enter `not-an-email` in the Email field, then click elsewhere (blur the field).      | An inline error message appears next to the Email field, and its text mentions a valid email is required (e.g. contains "valid email").        |
| 5   | Enter `123` in the Phone field, then click elsewhere (blur the field).               | An inline error message appears next to the Phone field, and its text mentions a valid phone number is required (e.g. contains "valid phone"). |
| 6   | Enter the test message in the Message field.                                         | Accepted, no error shown.                                                                                                                      |
| 7   | Re-check the Submit button's state.                                                  | Submit **remains disabled** — invalid fields still block submission even though other fields are filled.                                       |
| 8   | _(Firesky only)_ Note whether the "Property Location" field is present and required. | Present on Firesky; not present on Alice — document this, do not treat it as a defect.                                                         |

## Postconditions

- Do **not** click Submit with valid data as part of this test — it would send a real inquiry to
  the business. If a positive (valid-submission) test is ever needed, coordinate with the site
  owner first and use an obviously-marked test message.

## Notes

- The form has no native browser-level "required" validation (no red browser tooltips) — all
  validation is custom, so the only observable signals are the disabled Submit button and the
  inline error text. Absence of a native validation popup is expected, not a bug.
