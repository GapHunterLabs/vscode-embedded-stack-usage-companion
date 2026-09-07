/**
 * Pure logic -- no `vscode` dependency. New niche (not a port from
 * the Kotlin catalog). Evidence: confirmed -- "StackAnalyzer and aiT
 * tools provide precise analysis for stack usage and worst-case
 * execution time... though these appear to be specialized tools
 * rather than VS Code extensions." Real, bounded mechanism: parse the
 * `.su` files GCC already emits with `-fstack-usage` (a simple text
 * format: function, byte count, qualifier) rather than computing
 * anything new -- pure aggregation of data the compiler already
 * produced.
 *
 * v0.1 scope, honestly noted: flags a single function whose OWN stack
 * frame exceeds the configured budget. Transitive call-chain
 * aggregation (the worst-case cumulative stack depth across a real
 * call graph, which the audit that identified this candidate
 * envisioned) is NOT implemented here -- .su files carry no
 * caller/callee information at all, so building that would mean
 * parsing real call sites out of the C source, a materially bigger
 * undertaking than this v0.1. A real, separate follow-up, not a
 * silent gap.
 */

export interface StackUsageEntry {
  file: string;
  line: number;
  functionName: string;
  bytes: number;
  qualifier: string;
}

// GCC's .su line format: "<file>:<line>:<col>:<function>\t<bytes>\t<qualifier>"
const SU_LINE = /^(.+):(\d+):(\d+):(\S+)\t(\d+)\t(\S+)$/;

export function parseSuFile(text: string): StackUsageEntry[] {
  const entries: StackUsageEntry[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const match = SU_LINE.exec(line);
    if (!match) continue;
    entries.push({
      file: match[1],
      line: Number(match[2]),
      functionName: match[4],
      bytes: Number(match[5]),
      qualifier: match[6],
    });
  }
  return entries;
}

export interface StackBudgetViolation {
  entry: StackUsageEntry;
}

export function findBudgetViolations(entries: StackUsageEntry[], budgetBytes: number): StackBudgetViolation[] {
  return entries.filter((entry) => entry.bytes > budgetBytes).map((entry) => ({ entry }));
}
