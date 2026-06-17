/**
 * Message conversion between VS Code chat protocol and DashScope API format.
 *
 * Pure function — takes plain data structures for testability.
 * Provider.ts adapts VS Code types into these structures before calling.
 */

import { DashScopeMessage, DashScopeToolCall } from './types'

/** Plain representation of a chat message part. */
export interface MessagePart {
  kind: 'text' | 'tool-call' | 'tool-result' | 'image';
  /** Text content (for text and tool-result parts). */
  text?: string;
  /** Tool call ID (for tool-call and tool-result parts). */
  callId?: string;
  /** Tool name (for tool-call parts). */
  name?: string;
  /** Tool input (for tool-call parts). */
  input?: object;
  /** Image data as base64 data URI (for image parts). */
  imageUrl?: string;
}

/** Plain representation of a chat message. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  name?: string;
  parts: MessagePart[];
}

/**
 * Convert simplified chat messages to DashScope API message format.
 *
 * Pure function with no VS Code dependencies — fully testable.
 *
 * @param messages - Array of simplified chat messages
 * @returns Array of DashScope-formatted messages
 */
export function convertMessages(
  messages: ChatMessage[],
): DashScopeMessage[] {
  const result: DashScopeMessage[] = []

  for (const msg of messages) {
    const contentParts: string[] = []
    const toolCalls: DashScopeToolCall[] = []
    const imageParts: Array<{
      type: 'image_url';
      image_url: { url: string };
    }> = []
    let hasImageInput = false

    for (const part of msg.parts) {
      switch (part.kind) {
      case 'text':
        contentParts.push(part.text ?? '')
        break

      case 'tool-call':
        toolCalls.push({
          index: toolCalls.length,
          id: part.callId ?? '',
          type: 'function',
          function: {
            name: part.name ?? '',
            arguments: JSON.stringify(part.input ?? {}),
          },
        })
        break

      case 'tool-result':
        result.push({
          role: 'tool',
          content: part.text ?? '',
          tool_call_id: part.callId ?? '',
        })
        continue

      case 'image':
        if (part.imageUrl) {
          imageParts.push({
            type: 'image_url',
            image_url: { url: part.imageUrl },
          })
          hasImageInput = true
        }
        break
      }
    }

    const converted: DashScopeMessage = {
      role: msg.role,
      content: '',
    }

    if (hasImageInput) {
      const parts: Array<
        { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
      > = [{ type: 'text', text: contentParts.join('') }, ...imageParts]
      converted.content = parts as unknown as string
    } else {
      converted.content = contentParts.join('')
    }

    if (toolCalls.length > 0) {
      converted.tool_calls = toolCalls
    }

    if (msg.name) {
      converted.name = msg.name
    }

    result.push(converted)
  }

  return result
}
