# Decision Baseline Example

This public repository ships with fictional example data only.

A Decision Baseline preserves already-confirmed decisions until explicit evidence shows that they were superseded or rejected.

## Example

### Confirmed

- Development workflow: `Work item → branch → commit → pull request → review → merge → done`

### Open

- Iteration length: `1 week` or `2 weeks`

## Rules

- Recent silence does not cancel a confirmed decision.
- A newer message does not automatically supersede an existing decision.
- A proposal is not a confirmed decision.
- A confirmed decision is not the same thing as implementation being complete.

Replace the sample baseline in `src/context/decision-baseline.ts` with data validated for your own workspace, or load your baseline from a private configuration source.
