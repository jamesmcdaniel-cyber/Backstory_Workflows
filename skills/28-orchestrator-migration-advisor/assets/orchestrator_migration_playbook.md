# Orchestrator Migration Playbook

## Preserve First

- workflow order
- payload contracts
- retry and replay semantics
- state boundaries
- delivery guarantees

## Compare Explicitly

- trigger model
- batching and loops
- auth and credential storage
- error handling and retries
- sub-workflow behavior

## Migration Strategies

- direct cutover
- phased dual-run
- contract-first rebuild

## Use Dual-Run When

- delivery behavior must match exactly
- retries differ across tools
- webhook response timing changes
- stateful loops are hard to emulate safely
