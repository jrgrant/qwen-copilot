/**
 * Tests for message conversion — pure function, no VS Code deps needed.
 */

import { describe, it, expect } from 'vitest'
import { convertMessages, ChatMessage } from './message-convert'

describe('convertMessages', () => {
  it('converts a simple user text message', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', parts: [{ kind: 'text', text: 'Hello' }] },
    ]
    const result = convertMessages(msgs)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('user')
    expect(result[0].content).toBe('Hello')
  })

  it('converts an assistant text message', () => {
    const msgs: ChatMessage[] = [
      { role: 'assistant', parts: [{ kind: 'text', text: 'Hi there' }] },
    ]
    const result = convertMessages(msgs)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('assistant')
    expect(result[0].content).toBe('Hi there')
  })

  it('handles multi-turn conversation', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', parts: [{ kind: 'text', text: 'Hello' }] },
      { role: 'assistant', parts: [{ kind: 'text', text: 'Hi!' }] },
      { role: 'user', parts: [{ kind: 'text', text: 'How are you?' }] },
    ]
    const result = convertMessages(msgs)
    expect(result).toHaveLength(3)
    expect(result[0].role).toBe('user')
    expect(result[1].role).toBe('assistant')
    expect(result[2].role).toBe('user')
  })

  it('handles empty message list', () => {
    expect(convertMessages([])).toHaveLength(0)
  })

  it('passes through name field', () => {
    const result = convertMessages([
      { role: 'user', name: 'Alice', parts: [{ kind: 'text', text: 'Hello' }] },
    ])
    expect(result[0].name).toBe('Alice')
  })

  it('handles tool call parts', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'assistant',
        parts: [
          { kind: 'text', text: '' },
          { kind: 'tool-call', callId: 'call_123', name: 'get_weather', input: { city: 'London' } },
        ],
      },
    ]
    const result = convertMessages(msgs)
    expect(result[0].tool_calls).toHaveLength(1)
    expect(result[0].tool_calls?.[0]?.id).toBe('call_123')
    expect(result[0].tool_calls?.[0]?.function.name).toBe('get_weather')
    expect(result[0].tool_calls?.[0]?.function.arguments).toBe('{"city":"London"}')
  })

  it('handles tool result parts as separate tool-role messages', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'user',
        parts: [
          { kind: 'tool-result', callId: 'call_123', text: 'Sunny, 20°C' },
        ],
      },
    ]
    const result = convertMessages(msgs)
    // Tool result produces a tool-role message AND the user message is retained
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('tool')
    expect(result[0].content).toBe('Sunny, 20°C')
    expect(result[0].tool_call_id).toBe('call_123')
    expect(result[1].role).toBe('user')
  })

  it('handles mixed text and tool calls', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'assistant',
        parts: [
          { kind: 'text', text: 'Let me check the weather.' },
          { kind: 'tool-call', callId: 'c1', name: 'get_weather', input: { city: 'Paris' } },
        ],
      },
    ]
    const result = convertMessages(msgs)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('Let me check the weather.')
    expect(result[0].tool_calls).toHaveLength(1)
  })

  it('handles image parts for vision models', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'user',
        parts: [
          { kind: 'text', text: 'What is in this image?' },
          { kind: 'image', imageUrl: 'data:image/png;base64,iVBORw0KGgo=' },
        ],
      },
    ]
    const result = convertMessages(msgs)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('user')
    expect(Array.isArray(result[0].content)).toBe(true)
  })

  it('tool-result parts produce additional tool-role messages alongside the user message', () => {
    const msgs: ChatMessage[] = [
      {
        role: 'user',
        parts: [
          { kind: 'text', text: 'Check weather' },
          { kind: 'tool-result', callId: 'c1', text: 'Weather: sunny' },
        ],
      },
    ]
    const result = convertMessages(msgs)
    // tool-result is emitted as a tool-role message, user message is retained with its text
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('tool')
    expect(result[1].role).toBe('user')
    expect(result[1].content).toBe('Check weather')
  })
})
