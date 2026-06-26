# Remote-SSH Reveal in File Explorer

A VS Code extension that seamlessly opens Windows File Explorer from Remote-SSH, allowing you to reveal files and folders in the native Windows file manager with a simple right-click or keyboard shortcut.

Forked from: https://github.com/doonfrs/vscode-wsl-reveal-explorer

## 🚀 Features

- **Context Menu Integration** - Right-click any file or folder to reveal it in Windows Explorer
- **Keyboard Shortcut** - Default keybinding `Shift+Alt+R` to reveal the currently open file in Windows Explorer
- **Reliable Path Translation** - Converts UNIX paths to Windows-compatible UNC paths

## 📋 Prerequisites

- Visual Studio Code running in Remote-SSH mode

## 🎯 Usage

**Configuration**

1. **Open VS Code in Remote-SSH** - Connect to a Remote-SSH host.
2. **Configure network path prefix** - Set the `remote-ssh-reveal-explorer.networkPath` variable in the settings (globally or per workspace), e.g.: `\\host`.
3. **Configure remote path prefix stripping** - If needed, set the `remote-ssh-reveal-explorer.pathPrefixToStrip` variable in the settings (globally or per workspace).

There are two ways to trigger the extension:

**1. Context Menu (Right-Click):**

1. **Right-click any file or folder** in the VS Code explorer panel or editor title bar.
2. **Select "Remote-SSH Reveal in File Explorer"** from the context menu.
3. **Windows File Explorer opens** showing the selected file/folder location.

**2. Keyboard Shortcut:**

1. **Press `Shift+Alt+R`** when a file is open in the editor.
2. **Windows File Explorer opens** showing the selected file/folder location.

## 🛠️ Development

To contribute or modify this extension:

```bash
# Clone the repository
git clone <repository-url>
cd vscode-remote-ssh-reveal-explorer

# Open in VS Code
code .

# Press F5 to run in Extension Development Host
# Test the functionality by right-clicking files in the explorer
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Authors

**Sebastien Baillou**

- GitHub: [@sbaillou](https://github.com/sbaillou)
- VS Code Marketplace: [sbaillou](https://marketplace.visualstudio.com/publishers/sbaillou)

**Feras Abdalrahman (WSL Reveal in File Explorer author)**

- GitHub: [@doonfrs](https://github.com/doonfrs)
- VS Code Marketplace: [doonfrs](https://marketplace.visualstudio.com/publishers/doonfrs)
