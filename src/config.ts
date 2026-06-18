/**
 * Configuration management for Qwen Copilot.
 *
 * Handles secure API key storage via SecretStorage, workspace settings
 * for region/workspaceId/baseUrl, and assembles a resolved QwenConfig.
 */

import * as vscode from 'vscode'
import { QwenConfig, REGION_URLS } from './types'

const SECRET_KEY = 'qwenCopilot.apiKey'

/**
 * Resolve the full configuration for API calls.
 * Returns null if no API key is configured.
 *
 * Checks SecretStorage first (preferred), then falls back to the
 * deprecated `qwenCopilot.apiKey` setting. If a key is found in
 * settings, it is migrated to SecretStorage and the setting is
 * cleared.
 */
export async function resolveConfig(
  secrets: vscode.SecretStorage,
): Promise<QwenConfig | null> {
  let apiKey = await secrets.get(SECRET_KEY)

  // Fallback: check the deprecated settings field
  if (!apiKey) {
    const config = vscode.workspace.getConfiguration('qwenCopilot')
    const settingsKey = config.inspect<string>('apiKey')
    const rawKey = settingsKey?.globalValue ?? settingsKey?.workspaceValue ?? ''
    if (rawKey) {
      apiKey = rawKey
      // Migrate to SecretStorage and clear the plain-text setting
      await secrets.store(SECRET_KEY, apiKey.trim())
      await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global)
    }
  }

  if (!apiKey) {
    return null
  }

  const config = vscode.workspace.getConfiguration('qwenCopilot')
  const customBaseUrl = config.get<string>('baseUrl', '')
  const region = config.get<string>('region', 'ap-southeast-1')
  const workspaceId = config.get<string>('workspaceId', '')

  let baseUrl: string
  if (customBaseUrl) {
    baseUrl = customBaseUrl
  } else {
    const template = REGION_URLS[region] ?? REGION_URLS['ap-southeast-1']
    baseUrl = template.replace('{workspace}', encodeURIComponent(workspaceId))
  }

  return { apiKey, baseUrl }
}

/**
 * Prompt the user for their DashScope API key and store it securely.
 * Shows existing key as default value for easy replacement.
 */
export async function promptForApiKey(
  secrets: vscode.SecretStorage,
): Promise<string | undefined> {
  const existing = await secrets.get(SECRET_KEY)
  const apiKey = await vscode.window.showInputBox({
    title: 'Alibaba DashScope API Key',
    prompt: 'Enter your DashScope API key from the Model Studio console',
    password: true,
    placeHolder: 'sk-...',
    value: existing ?? '',
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'API key is required'
      }
      return undefined
    },
  })

  if (apiKey) {
    await secrets.store(SECRET_KEY, apiKey.trim())
    vscode.window.showInformationMessage(
      'Qwen Copilot: API key saved. Select a Qwen model in the Copilot model picker.',
    )
  }
  return apiKey
}
