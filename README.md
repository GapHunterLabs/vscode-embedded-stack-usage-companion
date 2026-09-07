# Embedded Stack Usage Companion (VS Code)

Parses GCC `.su` stack-usage files (`-fstack-usage`) and flags any
function whose own stack frame goes over a configurable budget. No
data leaves your editor.

**v0.1, new niche.** Not a port from the Gap Hunter Labs IntelliJ-
family catalog. Evidence: confirmed — *"StackAnalyzer and aiT tools
provide precise analysis for stack usage and worst-case execution
time... though these appear to be specialized tools rather than VS
Code extensions."*

## What it does

Build your embedded C project with `-fstack-usage` (GCC emits one
`.su` file per compiled `.c` file, right next to the object file).
This extension watches for `.su` files in your workspace, parses each
entry (`function`, `byte count`, `qualifier` — static/dynamic/
dynamic,bounded), and flags any function over the configured budget
(default 512 bytes, `embeddedStackUsageCompanion.budgetBytes`)
directly on the real source line the `.su` entry points to.

**v0.1 scope, honestly noted:** this flags a single function's OWN
stack frame — it does **not** aggregate stack usage across a call
chain (the worst-case cumulative depth through a real call graph).
`.su` files carry no caller/callee information at all, so that would
mean parsing real call sites out of the C source — a materially
bigger undertaking, and a real, separate follow-up, not a silent
gap.

## Privacy

See [PRIVACY.md](PRIVACY.md) — zero network calls, everything runs
against `.su` files your own compiler already produced.

## Development

```bash
npm install
npm run compile   # or: npm run watch
npm test
```

To build an installable package without publishing:

```bash
npx @vscode/vsce package
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
