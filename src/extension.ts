import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { commands, env, ExtensionContext, Uri, window, workspace } from "vscode";
import open from "open";

const execFileAsync = promisify(execFile);

type Mount = {
  Destination: string;
  Source: string;
};

type DockerInspectResult = {
  Mounts?: Mount[];
};

// The `devcontainer.local_folder` label compares case-insensitively on the
// Windows drive letter (see the Dev Containers CLI's normalizeDevContainerLabelPath).
function normalizeLocalFolder(value: string) {
  if (process.platform !== "win32") {
    return value;
  }

  const normalized = path.win32.normalize(value);
  if (normalized.length >= 2 && normalized[1] === ":") {
    return normalized[0].toLowerCase() + normalized.slice(1);
  }

  return normalized;
}

// A dev container workspace folder URI has the authority `dev-container+<hex>`,
// where <hex> is the hex-encoded host path of the local folder. That value is
// exactly what the Dev Containers CLI stores in the `devcontainer.local_folder`
// label, so we can pin the one container instead of enumerating all of them.
async function getWorkspaceContainerMounts() {
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

  const hostFolder = normalizeLocalFolder(
    JSON.parse(Buffer.from(authority.slice(prefix.length), "hex").toString("utf8")).workspacePath,
  );

  return hostFolder;
}

function toHostPath(
  containerPath: string,
  containerWorkspacePath: string,
  hostWorkspacePath: string,
) {
  const relativePath = path.posix.relative(containerWorkspacePath, containerPath);
  return path.join(hostWorkspacePath, relativePath);
}

/**
 * @param {vscode.ExtensionContext} context
 */
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

      const hostWorkspacePath = await getWorkspaceContainerMounts();
      if (!hostWorkspacePath) {
        window.showErrorMessage(
          "Could not determine the host path for this dev container.",
        );
        return;
      }

      const containerWorkspacePath = workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!containerWorkspacePath) {
        window.showErrorMessage("Couldn't get the container workspace path.");
        return;
      }

      const hostPath = toHostPath(containerPath, containerWorkspacePath, hostWorkspacePath);
      if (!hostPath) {
        window.showErrorMessage(
          `"${containerPath}" is not inside a folder mounted from the host.`,
        );
        return;
      }

      const hostDir = path.dirname(hostPath);

      try {
        await open(hostDir);
        window.showInformationMessage(`Opened folder: ${hostDir}`);
      } catch (error) {
        window.showErrorMessage(
          `Failed to open folder: ${hostDir}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );

  context.subscriptions.push(disposable);
}
