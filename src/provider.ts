/**
 * QwenChatModelProvider — the core of the plugin.
 *
 * Implements VS Code's LanguageModelChatProvider interface to expose
 * Alibaba-hosted Qwen models to GitHub Copilot as BYOK alternatives.
 *
 * Maps between VS Code chat messages and DashScope's OpenAI-compatible
 * Chat Completions API, with streaming and tool calling support.
 */

import * as vscode from 'vscode';
import {
  QWEN_MODELS,
  MODEL_MAP,
  QwenConfig,
  DashScopeMessage,
  DashScopeToolCall,
  DashScopeDelta,
  DashScopeTool,
} from './types';
import { resolveConfig, promptForApiKey } from './config';
import { parseSSEStream } from './sse-parser';

// ── Provider ────────────────────────────────────────────────────────────

export class QwenChatModelProvider
  implements vscode.LanguageModelChatProvider<vscode.LanguageModelChatInformation>
{
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeLanguageModelChatInformation = this._onDidChange.event;

  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly configChangeDisposable: vscode.Disposable,
  ) {}

  /** Signal VS Code that the model list has changed. */
  notifyChange(): void {
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
    this.configChangeDisposable.dispose();
  }

  // ── Model info ──────────────────────────────────────────────────────

  async provideLanguageModelChatInformation(
    options: { silent: boolean },
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelChatInformation[]> {
    const config = await resolveConfig(this.secrets);

    if (!config) {
      if (!options.silent) {
        // Interactive mode — prompt for API key
        const key = await promptForApiKey(this.secrets);
        if (key) {
          this._onDidChange.fire();
          return QWEN_MODELS;
        }
      }
      return [];
    }

    return QWEN_MODELS;
  }

  // ── Chat response (streaming) ───────────────────────────────────────

  async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const config = await resolveConfig(this.secrets);
    if (!config) {
      progress.report(
        new vscode.LanguageModelTextPart(
          'Qwen Copilot: No API key configured. Run "Qwen: Set API Key" to configure.',
        ),
      );
      return;
    }

    const dashScopeModel = MODEL_MAP[model.id] ?? 'qwen3.7-plus';
    const body = this.buildRequestBody(dashScopeModel, messages, options);

    const abortController = new AbortController();
    const cancelListener = token.onCancellationRequested(() =>
      abortController.abort(),
    );

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Qwen API error (${response.status}): ${errorText}`;
        if (response.status === 401) {
          message =
            'Qwen Copilot: Invalid API key. Run "Qwen: Set API Key" to update it.';
        } else if (response.status === 429) {
          message = 'Qwen Copilot: Rate limit exceeded. Please wait and try again.';
        }
        progress.report(new vscode.LanguageModelTextPart(message));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        progress.report(
          new vscode.LanguageModelTextPart('Qwen Copilot: Empty response body.'),
        );
        return;
      }

      // Accumulate partial tool call arguments across streaming chunks
      const toolAcc = new Map<
        number,
        { id: string; name: string; arguments: string }
      >();

      for await (const chunk of parseSSEStream(reader, abortController.signal)) {
        if (token.isCancellationRequested) break;

        const choice = chunk.choices?.[0];
        if (!choice?.delta) continue;

        await this.handleDelta(choice.delta, toolAcc, progress);

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
              );
            } catch {
              // Malformed JSON in tool arguments — skip
            }
          }
          toolAcc.clear();
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Cancelled — expected
      }
      progress.report(
        new vscode.LanguageModelTextPart(
          `Qwen Copilot: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    } finally {
      cancelListener.dispose();
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
            .join('');

    // Rough estimate: ~1 token per 3 characters for English text.
    return Math.ceil(content.length / 3);
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
    };

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
      );
      body.tool_stream = true;
    }

    return body;
  }

  // ── Message conversion ──────────────────────────────────────────────

  private convertMessages(
    messages: readonly vscode.LanguageModelChatRequestMessage[],
  ): DashScopeMessage[] {
    const result: DashScopeMessage[] = [];

    for (const msg of messages) {
      const role =
        msg.role === vscode.LanguageModelChatMessageRole.User
          ? 'user'
          : 'assistant';

      const contentParts: string[] = [];
      const toolCalls: DashScopeToolCall[] = [];
      const imageParts: Array<{
        type: 'image_url';
        image_url: { url: string };
      }> = [];
      let hasImageInput = false;

      for (const part of msg.content) {
        if (part instanceof vscode.LanguageModelTextPart) {
          contentParts.push(part.value);
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
          toolCalls.push({
            index: toolCalls.length,
            id: part.callId,
            type: 'function',
            function: {
              name: part.name,
              arguments: JSON.stringify(part.input),
            },
          });
        } else if (part instanceof vscode.LanguageModelToolResultPart) {
          // Tool results become "tool" role messages
          const toolContent = part.content
            .filter(
              (p): p is vscode.LanguageModelTextPart =>
                p instanceof vscode.LanguageModelTextPart,
            )
            .map((p) => p.value)
            .join('');
          result.push({
            role: 'tool',
            content: toolContent,
            tool_call_id: part.callId,
          });
          continue; // Not a user/assistant message
        } else if (
          part instanceof vscode.LanguageModelDataPart &&
          role === 'user'
        ) {
          // Image for vision models
          const data = (part as unknown as { data: Uint8Array; mimeType: string });
          const base64 = Buffer.from(data.data).toString('base64');
          imageParts.push({
            type: 'image_url',
            image_url: { url: `data:${data.mimeType};base64,${base64}` },
          });
          hasImageInput = true;
        }
      }

      const converted: DashScopeMessage = {
        role,
        content: '',
      };

      if (hasImageInput) {
        const parts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
          { type: 'text', text: contentParts.join('') },
          ...imageParts,
        ];
        converted.content = parts as unknown as string;
      } else {
        converted.content = contentParts.join('');
      }

      if (toolCalls.length > 0) {
        converted.tool_calls = toolCalls;
      }

      if (msg.name) {
        converted.name = msg.name;
      }

      result.push(converted);
    }

    return result;
  }

  // ── Delta handling ──────────────────────────────────────────────────

  private async handleDelta(
    delta: DashScopeDelta,
    toolAcc: Map<number, { id: string; name: string; arguments: string }>,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
  ): Promise<void> {
    // Text content
    if (delta.content) {
      progress.report(new vscode.LanguageModelTextPart(delta.content));
    }

    // Tool calls — accumulate across chunks
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        let acc = toolAcc.get(idx);
        if (!acc) {
          acc = { id: '', name: '', arguments: '' };
          toolAcc.set(idx, acc);
        }
        if (tc.id) acc.id = tc.id;
        if (tc.function?.name) acc.name = tc.function.name;
        if (tc.function?.arguments) acc.arguments += tc.function.arguments;
      }
    }
  }
}
