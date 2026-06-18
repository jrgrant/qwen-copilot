/**
 * QwenChatModelProvider — the core of the plugin.
 *
 * Implements VS Code's LanguageModelChatProvider interface to expose
 * Alibaba-hosted Qwen models to GitHub Copilot as BYOK alternatives.
 *
 * Maps between VS Code chat messages and DashScope's OpenAI-compatible
 * Chat Completions API, with streaming and tool calling support.
 */

import * as vscode from 'vscode'
import {
  QWEN_MODELS,
  MODEL_MAP,
  DashScopeMessage,
  DashScopeDelta,
  DashScopeTool,
} from './types'
import { resolveConfig, promptForApiKey } from './config'
import { parseSSEStream } from './sse-parser'
import { convertMessages, ChatMessage, MessagePart } from './message-convert'

// ── Provider ────────────────────────────────────────────────────────────

export class QwenChatModelProvider
implements vscode.LanguageModelChatProvider<vscode.LanguageModelChatInformation>
{
  private readonly _onDidChange = new vscode.EventEmitter<void>()
  readonly onDidChangeLanguageModelChatInformation = this._onDidChange.event

  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly configChangeDisposable: vscode.Disposable,
  ) {}

  /** Signal VS Code that the model list has changed. */
  notifyChange(): void {
    this._onDidChange.fire()
  }

  dispose(): void {
    this._onDidChange.dispose()
    this.configChangeDisposable.dispose()
  }

  // ── Model info ──────────────────────────────────────────────────────

  async provideLanguageModelChatInformation(
    options: { silent: boolean },
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelChatInformation[]> {
    const config = await resolveConfig(this.secrets)

    if (!config) {
      if (!options.silent) {
        // Interactive mode — prompt for API key
        const key = await promptForApiKey(this.secrets)
        if (key) {
          this._onDidChange.fire()
          return QWEN_MODELS
        }
      }
      return []
    }

    // Try dynamic model discovery from the API
    try {
      const models = await this.fetchModels(config)
      if (models.length > 0) {
        return models
      }
    } catch {
      // Fall back to static list
    }

    return QWEN_MODELS
  }

  /**
   * Fetch available models from the DashScope /models endpoint.
   * Returns an empty array if the endpoint fails or returns no models.
   */
  private async fetchModels(
    config: { apiKey: string; baseUrl: string },
  ): Promise<vscode.LanguageModelChatInformation[]> {
    const response = await fetch(`${config.baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json() as {
      data?: Array<{ id: string; object?: string }>
    }

    if (!data.data || !Array.isArray(data.data)) {
      return []
    }

    return data.data
      .map((m) => this.mapApiModel(m.id))
      .filter((m): m is vscode.LanguageModelChatInformation => m !== null)
  }

  /**
   * Map an API model ID to LanguageModelChatInformation.
   * Returns null for unsupported models.
   */
  private mapApiModel(
    modelId: string,
  ): vscode.LanguageModelChatInformation | null {
    // Check if this is a known model alias (qwen-max, qwen-plus, qwen-flash)
    if (modelId in MODEL_MAP) {
      const known = QWEN_MODELS.find((m) => m.id === modelId)
      return known ?? null
    }

    // Check if this is a known DashScope model name (qwen3.7-max, etc)
    const reverseMap: Record<string, string> = {
      'qwen3.7-max': 'qwen-max',
      'qwen3.7-plus': 'qwen-plus',
      'qwen3.6-flash': 'qwen-flash',
    }

    if (modelId in reverseMap) {
      const alias = reverseMap[modelId]
      const known = QWEN_MODELS.find((m) => m.id === alias)
      return known ?? null
    }

    // Check if it's a Qwen model we don't have explicit config for
    if (modelId.startsWith('qwen')) {
      // Create a generic entry for unknown Qwen models
      return {
        id: modelId,
        name: this.formatModelName(modelId),
        family: 'qwen',
        version: 'unknown',
        maxInputTokens: 128000, // Conservative default
        maxOutputTokens: 8192,
        detail: 'Dynamic model from API',
        capabilities: {
          toolCalling: true,
          imageInput: false,
        },
      }
    }

    // Not a Qwen model — skip it
    return null
  }

  /**
   * Format a model ID into a human-readable name.
   */
  private formatModelName(modelId: string): string {
    return modelId
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  // ── Chat response (streaming) ───────────────────────────────────────

  async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const config = await resolveConfig(this.secrets)
    if (!config) {
      progress.report(
        new vscode.LanguageModelTextPart(
          'Alibaba Copilot: No API key configured. Run "Alibaba: Set API Key" to configure.',
        ),
      )
      return
    }

    const dashScopeModel = MODEL_MAP[model.id] ?? 'qwen3.7-plus'
    const body = this.buildRequestBody(dashScopeModel, messages, options)

    const abortController = new AbortController()
    const cancelListener = token.onCancellationRequested(() =>
      abortController.abort(),
    )

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let message = `Qwen API error (${response.status}): ${errorText}`
        if (response.status === 401) {
          message =
            'Alibaba Copilot: Invalid API key. Run "Alibaba: Set API Key" to update it.'
        } else if (response.status === 429) {
          message = 'Alibaba Copilot: Rate limit exceeded. Please wait and try again.'
        }
        progress.report(new vscode.LanguageModelTextPart(message))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        progress.report(
          new vscode.LanguageModelTextPart('Alibaba Copilot: Empty response body.'),
        )
        return
      }

      // Accumulate partial tool call arguments across streaming chunks
      const toolAcc = new Map<
        number,
        { id: string; name: string; arguments: string }
      >()

      for await (const chunk of parseSSEStream(reader, abortController.signal)) {
        if (token.isCancellationRequested) break

        const choice = chunk.choices?.[0]
        if (!choice?.delta) continue

        await this.handleDelta(choice.delta, toolAcc, progress)

        // Flush completed tool calls on finish_reason
        if (choice.finish_reason && toolAcc.size > 0) {
          for (const [, tc] of toolAcc) {
            try {
              progress.report(
                new vscode.LanguageModelToolCallPart(
                  tc.id,
                  tc.name,
                  JSON.parse(tc.arguments),
                ),
              )
            } catch {
              // Malformed JSON in tool arguments — skip
            }
          }
          toolAcc.clear()
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // Cancelled — expected
      }
      progress.report(
        new vscode.LanguageModelTextPart(
          `Alibaba Copilot: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )
    } finally {
      cancelListener.dispose()
    }
  }

  // ── Token counting ──────────────────────────────────────────────────

  async provideTokenCount(
    _model: vscode.LanguageModelChatInformation,
    text: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken,
  ): Promise<number> {
    const content =
      typeof text === 'string'
        ? text
        : text.content
          .filter(
            (p): p is vscode.LanguageModelTextPart =>
              p instanceof vscode.LanguageModelTextPart,
          )
          .map((p) => p.value)
          .join('')

    // Rough estimate: ~1 token per 3 characters for English text.
    return Math.ceil(content.length / 3)
  }

  // ── Request body ────────────────────────────────────────────────────

  private buildRequestBody(
    model: string,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      messages: this.convertMessages(messages),
      stream: true,
      stream_options: { include_usage: true },
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map(
        (t): DashScopeTool => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema ?? {},
          },
        }),
      )
      body.tool_stream = true
    }

    return body
  }

  // ── Message conversion ──────────────────────────────────────────────

  private convertMessages(
    messages: readonly vscode.LanguageModelChatRequestMessage[],
  ): DashScopeMessage[] {
    const adapted: ChatMessage[] = []
    for (const msg of messages) {
      const parts: MessagePart[] = []
      for (const part of msg.content) {
        if (part instanceof vscode.LanguageModelTextPart) {
          parts.push({ kind: 'text', text: part.value })
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
          parts.push({
            kind: 'tool-call',
            callId: part.callId,
            name: part.name,
            input: part.input,
          })
        } else if (part instanceof vscode.LanguageModelToolResultPart) {
          const text = part.content
            .filter((p): p is vscode.LanguageModelTextPart =>
              p instanceof vscode.LanguageModelTextPart)
            .map((p) => p.value)
            .join('')
          parts.push({ kind: 'tool-result', callId: part.callId, text })
        } else if (
          part instanceof vscode.LanguageModelDataPart &&
          msg.role === vscode.LanguageModelChatMessageRole.User
        ) {
          // Qwen Max/Plus/Flash are text-only models (imageInput: false).
          // Skip images silently — the API will reject them with a 400.
          continue
        }
      }
      adapted.push({
        role: msg.role === vscode.LanguageModelChatMessageRole.User ? 'user' : 'assistant',
        name: msg.name,
        parts,
      })
    }
    return convertMessages(adapted)
  }

  // ── Delta handling ──────────────────────────────────────────────────

  private async handleDelta(
    delta: DashScopeDelta,
    toolAcc: Map<number, { id: string; name: string; arguments: string }>,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
  ): Promise<void> {
    // Text content
    if (delta.content) {
      progress.report(new vscode.LanguageModelTextPart(delta.content))
    }

    // Tool calls — accumulate across chunks
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0
        let acc = toolAcc.get(idx)
        if (!acc) {
          acc = { id: '', name: '', arguments: '' }
          toolAcc.set(idx, acc)
        }
        if (tc.id) acc.id = tc.id
        if (tc.function?.name) acc.name = tc.function.name
        if (tc.function?.arguments) acc.arguments += tc.function.arguments
      }
    }
  }
}
