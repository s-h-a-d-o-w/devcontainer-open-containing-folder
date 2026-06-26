import * as vscode from "vscode";
import open from "open";
import path from "path";

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Remote-SSH reveal Explorer extension is now active!");
  console.log("Extension context:", context.extensionPath);

  let disposable = vscode.commands.registerCommand(
    "remote-ssh-reveal-explorer.revealInExplorer",
    async function (arg: vscode.Uri) {
      let remotePath = undefined;

      if (arg instanceof vscode.Uri) {
        // Triggered by right-click on a file in Explorer
        console.log(`Right-clicked file: ${arg.fsPath}`);
        remotePath = arg.fsPath;
      } else {
        // Likely triggered by a shortcut, button, or manually
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const doc = editor.document;
          console.log(`Shortcut on active file: ${doc.uri.fsPath}`);
          remotePath = doc.uri.fsPath;
        } else {
          console.log("No editor is active");
          remotePath = undefined;
        }
      }

      console.log("Reveal in Explorer command executed with path:", remotePath);

      console.log("File path:", remotePath);

      if (!remotePath) {
        vscode.window.showErrorMessage("No remote path provided");
        return;
      }

      const dirPath = path.dirname(remotePath);
      console.log("Remote directory path:", dirPath);

      const localPath = networkPath(dirPath);
      console.log("Local network path:", localPath);

      try {
        await open(localPath);

        vscode.window.showInformationMessage(`Opened folder: ${localPath}`);
      } catch (error) {
        console.error("Error opening explorer:", error);
        vscode.window.showErrorMessage(
          `Failed to open folder: ${localPath}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );

  let testDisposable = vscode.commands.registerCommand(
    "remote-ssh-reveal-explorer.test",
    function () {
      console.log("Test command executed");
      vscode.window.showInformationMessage("Extension is working!");
    },
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(testDisposable);
  console.log("Commands registered successfully");
}

function networkPath(remotePath: string) {
  // Determine the correct path separator based on the platform
  const { platform } = process;
  console.log("Platform:", platform);
  const locale = path[platform === "win32" ? "win32" : "posix"];

  // Replace prefix path separators with local ones
  const prefixToStrip = vscode.workspace
    .getConfiguration("remote-ssh-reveal-explorer")
    .get<string>("pathPrefixToStrip");
  const prefixToStripLocal = prefixToStrip?.replace(/[\\/]/g, locale.sep);

  // Remove prefixToStripLocal if present
  let remotepathWithoutPrefix = remotePath;
  if (prefixToStripLocal && remotePath.startsWith(prefixToStripLocal)) {
    remotepathWithoutPrefix = remotePath.slice(prefixToStripLocal.length);
  }

  // Compose UNC path
  const networkPath = vscode.workspace
    .getConfiguration("remote-ssh-reveal-explorer")
    .get<string>("networkPath");

  return `${networkPath}${remotepathWithoutPrefix}`;
}

export function deactivate() {}
