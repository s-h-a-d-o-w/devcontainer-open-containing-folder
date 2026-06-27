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

function isWindowsPath(value: string) {
  return /^[a-zA-Z]:[\\/]/u.test(value) || value.startsWith(String.raw`\\`);
}

function getPathApi(...values: string[]) {
  return values.some(isWindowsPath) ? path.win32 : path.posix;
}

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

  return JSON.parse(
    Buffer.from(authority.slice(prefix.length), "hex").toString("utf8"),
    // oxlint-disable-next-line typescript/no-unsafe-member-access
  ).workspacePath as string;
}

function toHostPath(
  containerPath: string,
  containerWorkspacePath: string,
  hostWorkspacePath: string,
) {
  const containerPathApi = getPathApi(containerWorkspacePath, containerPath);
  const hostPathApi = getPathApi(hostWorkspacePath);
  const relativePath = containerPathApi.relative(
    containerWorkspacePath,
    containerPath,
  );
  return hostPathApi.join(hostWorkspacePath, relativePath);
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

      const hostPath = toHostPath(
        containerPath,
        containerWorkspacePath,
        hostWorkspacePath,
      );
      if (!hostPath) {
        window.showErrorMessage(
          `Could not generate a host path out of ${hostWorkspacePath}, ${containerWorkspacePath} and ${containerPath}.`,
        );
        return;
      }

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
