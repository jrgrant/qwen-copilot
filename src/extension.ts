/**
 * Entry point for the Qwen Copilot VS Code extension.
 *
 * Registers the QwenChatModelProvider so Qwen models appear in
 * the Copilot model picker. Also registers the "Set API Key" command.
 */

import * as vscode from 'vscode'
import { QwenChatModelProvider } from './provider'
import { promptForApiKey } from './config'

const VENDOR = 'alibaba'

export function activate(context: vscode.ExtensionContext): void {
  // Reload models when config changes
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('qwenCopilot')) {
      provider.notifyChange()
    }
  })

  const provider = new QwenChatModelProvider(
    context.secrets,
    configChangeDisposable,
  )

  context.subscriptions.push(
    provider,
    configChangeDisposable,
    vscode.lm.registerLanguageModelChatProvider(VENDOR, provider),
    vscode.commands.registerCommand('qwenCopilot.setApiKey', async () => {
      const key = await promptForApiKey(context.secrets)
      if (key) {
        provider.notifyChange()
      }
    }),
  )
}

export function deactivate(): void {
  // Handled by subscriptions
}
