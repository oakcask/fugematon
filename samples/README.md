# Samples

`fugue-smoke-phase1.mid` is a deterministic Phase 1 exposition sample for manual listening review.

It uses:

- seed: `fugue-smoke`
- ticks: `7680`

Regenerate it with:

```sh
pnpm build
node packages/cli/dist/index.js midi --seed fugue-smoke --ticks 7680 --out samples/fugue-smoke-phase1.mid
```
