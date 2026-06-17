/**
 * Types for the Qwen Copilot extension.
 *
 * Bridges VS Code's LanguageModelChatProvider API with the
 * Alibaba DashScope OpenAI-compatible Chat Completions API.
 */

import * as vscode from 'vscode'

// ── DashScope API types ────────────────────────────────────────────────

export type DashScopeRole = 'system' | 'user' | 'assistant' | 'tool';

export interface DashScopeMessage {
  role: DashScopeRole;
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
  name?: string;
  tool_calls?: DashScopeToolCall[];
  tool_call_id?: string;
}

export interface DashScopeToolCall {
  index: number;
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface DashScopeTool {
  type: 'function';
  function: { name: string; description: string; parameters: object };
}

export interface DashScopeDelta {
  role?: string;
  content?: string | null;
  reasoning_content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: 'function';
    function?: { name?: string; arguments?: string };
  }>;
}

export interface DashScopeStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: DashScopeDelta;
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ── Plugin configuration ────────────────────────────────────────────────

export interface QwenConfig {
  apiKey: string;
  baseUrl: string;
}

// ── Constants ───────────────────────────────────────────────────────────

export const MODEL_MAP: Record<string, string> = {
  'qwen-max': 'qwen3.7-max',
  'qwen-plus': 'qwen3.7-plus',
  'qwen-flash': 'qwen3.6-flash',
}

export const QWEN_MODELS: vscode.LanguageModelChatInformation[] = [
  {
    id: 'qwen-max',
    name: 'Qwen Max',
    family: 'qwen3.7',
    version: '3.7',
    maxInputTokens: 1_000_000,
    maxOutputTokens: 64_000,
    detail: 'Strongest reasoning, 1M context',
    capabilities: { toolCalling: 128 },
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    family: 'qwen3.7',
    version: '3.7',
    maxInputTokens: 1_000_000,
    maxOutputTokens: 64_000,
    detail: 'Balanced performance and cost, 1M context',
    capabilities: { toolCalling: 128 },
  },
  {
    id: 'qwen-flash',
    name: 'Qwen Flash',
    family: 'qwen3.6',
    version: '3.6',
    maxInputTokens: 1_000_000,
    maxOutputTokens: 64_000,
    detail: 'Fast and cost-effective, 1M context',
    capabilities: { toolCalling: 128 },
  },
]

export const REGION_URLS: Record<string, string> = {
  'ap-southeast-1': 'https://{workspace}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
  'us-east-1': 'https://{workspace}.us-east-1.maas.aliyuncs.com/compatible-mode/v1',
  'cn-hongkong': 'https://{workspace}.cn-hongkong.maas.aliyuncs.com/compatible-mode/v1',
  'eu-central-1': 'https://{workspace}.eu-central-1.maas.aliyuncs.com/compatible-mode/v1',
}
