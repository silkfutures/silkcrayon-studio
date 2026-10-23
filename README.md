# Silkcrayon OS navigation test build fix

## What failed
The OS reorganisation introduced six owner navigation entries, but `tests/audit-patch.mjs` asserted that both roles must have five.

## Install
Copy `tests/audit-patch.mjs` into your GitHub repository at the same path, replacing only that test file. Keep the recently deployed `lib/osNavigation.js` and all other application files unchanged.

## What changed
The regression assertion expects 6 destinations for owners, 5 for engineers. All other assertions are preserved.

## Verification
The `tests/audit-patch.mjs` test passed locally against the reorganisation patch's navigation module and source project's receipt modules. This does not guarantee all other build checks pass or that the full Next.js build succeeds.
