import path from "node:path";
import {
  commands,
  env,
  ExtensionContext,
  Uri,
  window,
  workspace,
} from "vscode";
import open from "open";

// A dev container workspace folder URI has the authority `dev-container+<hex>`,
// where <hex> is the hex-encoded host path of the local folder.
function getHostWorkspacePath() {
  if (env.remoteName !== "dev-container") {
    return undefined;
  }

  const workspaceFolder = workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return undefined;
  }

  const prefix = "dev-container+";
  const { authority } = workspaceFolder.uri;
  if (!authority.startsWith(prefix)) {
    return undefined;
  }

  const authorityObject = JSON.parse(
    Buffer.from(authority.slice(prefix.length), "hex").toString("utf8"),
  ) as { hostPath?: string; workspacePath?: string };

  // vscode: hostPath
  // cursor: workspacePath
  return authorityObject.hostPath ?? authorityObject.workspacePath;
}

export function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand(
    "devcontainer-open-containing-folder.revealInExplorer",
    async (arg: Uri) => {
      let containerPath: string | undefined;

      if (arg instanceof Uri) {
        containerPath = arg.fsPath;
      } else {
        const editor = window.activeTextEditor;
        if (editor) {
          containerPath = editor.document.uri.fsPath;
        }
      }

      if (!containerPath) {
        window.showErrorMessage("Couldn't get a file path.");
        return;
      }

      const hostWorkspacePath = getHostWorkspacePath();
      if (!hostWorkspacePath) {
        window.showErrorMessage(
          "Could not determine the host path for this dev container.",
        );
        return;
      }

      const containerWorkspacePath =
        workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!containerWorkspacePath) {
        window.showErrorMessage("Couldn't get the container workspace path.");
        return;
      }

      const relativePath = path.relative(containerWorkspacePath, containerPath);
      const hostPath = path.join(hostWorkspacePath, relativePath);
      const hostDir = path.dirname(hostPath);
      try {
        await open(hostDir);
      } catch (error) {
        window.showErrorMessage(
          `Failed to open folder: ${hostDir}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );

  context.subscriptions.push(disposable);
}
