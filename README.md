# Qwen Copilot — Alibaba BYOK for GitHub Copilot

Use **Alibaba Qwen models** as BYOK (Bring Your Own Key) alternatives in GitHub
Copilot Chat, Copilot Edits, and any VS Code extension that uses the language
model API.

## Models

| Copilot Name | DashScope Model | Context | Best For |
|---|---|---|---|
| **Qwen Max** | `qwen3.7-max` | 1M tokens | Strongest reasoning |
| **Qwen Plus** | `qwen3.7-plus` | 1M tokens | Balanced performance & cost |
| **Qwen Flash** | `qwen3.6-flash` | 1M tokens | Fast, cost-effective |

All models support tool calling (function calling).

## Setup

### 1. Get an API Key

1. Sign up at [Alibaba Cloud Model Studio](https://bailian.console.aliyun.com/)
2. Navigate to **API Keys** and create a new key
3. Copy the key (starts with `sk-`)

### 2. Get your Workspace ID

1. In the Model Studio console, go to **Workspace Details**
2. Copy your workspace ID

### 3. Configure the Extension

Run **"Qwen: Open Settings"** (`Cmd+Shift+P`) to open the extension settings,
or go to **Settings → Extensions → Qwen Copilot** and set:

- **`Qwen Copilot › Workspace Id`** — Your workspace ID
- **`Qwen Copilot › Region`** — Your region (default: Singapore)

> 💡 All settings are discoverable via the Settings GUI with descriptions,
> validation, and dropdown options.

Then:

1. Open Copilot Chat (`Cmd+Shift+I`)
2. Click the model picker in the chat input
3. Select **"Alibaba Qwen"** from the provider list
4. Enter your API key when prompted
5. Choose a Qwen model (Max, Plus, or Flash)

You can also run **"Qwen: Set API Key"** (`Cmd+Shift+P`) or **"Qwen: Open
Settings"** (`Cmd+Shift+P`) at any time.

## Settings GUI

All extension settings are available in the **Settings UI** under
**Extensions → Qwen Copilot**:

| Setting | GUI Label | Default | Description |
|---|---|---|---|
| `qwenCopilot.workspaceId` | Workspace Id | _(empty)_ | Your DashScope workspace ID |
| `qwenCopilot.region` | Region | `ap-southeast-1` | Alibaba Cloud region (dropdown) |
| `qwenCopilot.baseUrl` | Base Url | _(empty)_ | Custom base URL (with validation) |

Your API key is stored securely in VS Code's Secret Storage — use the
**"Qwen: Set API Key"** command to set it.

## Requirements

- VS Code 1.95 or later
- GitHub Copilot extension
- Alibaba Cloud account with DashScope API access

## Privacy

All requests go directly from your machine to Alibaba Cloud's DashScope
API. No data passes through any third-party servers.
