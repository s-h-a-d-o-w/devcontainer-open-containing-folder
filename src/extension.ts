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
    Buffer.from(authority.slice(prefix.length), "hex").toString("utf8"),
  );

  try {
    const { stdout: idsOut } = await execFileAsync("docker", [
      "ps",
      "--filter",
      `label=devcontainer.local_folder=${hostFolder}`,
      "--format",
      "{{.ID}}",
    ]);

    const containerId = idsOut
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .at(0);

    if (!containerId) {
      return undefined;
    }

    const { stdout: inspectOut } = await execFileAsync("docker", ["inspect", containerId]);
    const info = (JSON.parse(inspectOut) as DockerInspectResult[]).at(0);
    return info?.Mounts ?? undefined;
  } catch (error) {
    console.error("docker inspection failed:", error);
    return undefined;
  }
}

function toHostPath(containerPath: string, mounts: Mount[]) {
  // Pick the most specific bind mount that contains the file.
  let mount: Mount | undefined;
  for (const candidate of mounts) {
    const isMatch =
      containerPath === candidate.Destination ||
      containerPath.startsWith(`${candidate.Destination}/`);
    if (isMatch && (!mount || candidate.Destination.length > mount.Destination.length)) {
      mount = candidate;
    }
  }

  if (!mount) {
    return undefined;
  }

  const relative = containerPath.slice(mount.Destination.length).replace(/^\/+/u, "");
  // Container paths are POSIX; rejoin onto the host source using the host's separators.
  return relative ? path.join(mount.Source, ...relative.split("/")) : mount.Source;
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

      const mounts = await getWorkspaceContainerMounts();
      if (!mounts) {
        window.showErrorMessage(
          "Could not determine the host path for this dev container.",
        );
        return;
      }

      const hostPath = toHostPath(containerPath, mounts);
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
