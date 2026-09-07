import * as vscode from 'vscode';
import { parseSuFile, findBudgetViolations } from './stackUsage';

let diagnostics: vscode.DiagnosticCollection;

function getBudgetBytes(): number {
  return vscode.workspace.getConfiguration('embeddedStackUsageCompanion').get<number>('budgetBytes', 512);
}

async function refreshWorkspace(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return;
  const root = folders[0].uri;

  const suFiles = await vscode.workspace.findFiles('**/*.su', '**/node_modules/**', 5000);
  if (suFiles.length === 0) {
    diagnostics.clear();
    return;
  }

  const budget = getBudgetBytes();
  const byResolvedUri = new Map<string, vscode.Diagnostic[]>();

  for (const suUri of suFiles) {
    let text: string;
    try {
      text = Buffer.from(await vscode.workspace.fs.readFile(suUri)).toString('utf8');
    } catch {
      continue;
    }
    const entries = parseSuFile(text);
    const violations = findBudgetViolations(entries, budget);

    for (const { entry } of violations) {
      // .su entries name the SOURCE file (relative to where gcc ran),
      // not the .su file itself -- resolve it against the .su file's
      // own directory, since -fstack-usage output typically sits next
      // to the object file in a build directory, with the source path
      // written relative to the compiler's working directory. Falls
      // back to a workspace-relative resolution if that doesn't exist.
      let sourceUri = vscode.Uri.joinPath(suUri, '..', entry.file);
      try {
        await vscode.workspace.fs.stat(sourceUri);
      } catch {
        sourceUri = vscode.Uri.joinPath(root, entry.file);
      }

      const key = sourceUri.toString();
      const line = Math.max(0, entry.line - 1);
      const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
      const diagnostic = new vscode.Diagnostic(
        range,
        `"${entry.functionName}" uses ${entry.bytes} bytes of stack (${entry.qualifier}) -- over the ${budget}-byte budget.`,
        vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = 'Embedded Stack Usage Companion';
      const list = byResolvedUri.get(key) ?? [];
      list.push(diagnostic);
      byResolvedUri.set(key, list);
    }
  }

  diagnostics.clear();
  for (const [uriString, diags] of byResolvedUri) {
    diagnostics.set(vscode.Uri.parse(uriString), diags);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection('embeddedStackUsageCompanion');
  context.subscriptions.push(diagnostics);

  void refreshWorkspace();

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.su');
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(() => void refreshWorkspace()),
    watcher.onDidCreate(() => void refreshWorkspace()),
    watcher.onDidDelete(() => void refreshWorkspace()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('embeddedStackUsageCompanion.budgetBytes')) void refreshWorkspace();
    }),
    vscode.commands.registerCommand('embeddedStackUsageCompanion.rescan', () => void refreshWorkspace()),
  );
}

export function deactivate(): void {
  diagnostics?.dispose();
}
