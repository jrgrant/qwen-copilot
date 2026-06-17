/**
 * Tests for configuration management.
 *
 * Tests resolveConfig and related config logic.
 */

import { describe, it, expect } from 'vitest'
import { REGION_URLS, QwenConfig } from './types'

// ── Tests for REGION_URLS ──────────────────────────────────────────────

describe('REGION_URLS', () => {
  it('has all expected regions', () => {
    expect(REGION_URLS).toHaveProperty('ap-southeast-1')
    expect(REGION_URLS).toHaveProperty('us-east-1')
    expect(REGION_URLS).toHaveProperty('cn-hongkong')
    expect(REGION_URLS).toHaveProperty('eu-central-1')
  })

  it('contains {workspace} placeholder in URLs', () => {
    for (const url of Object.values(REGION_URLS)) {
      expect(url).toContain('{workspace}')
    }
  })

  it('constructs valid base URL with workspace substitution', () => {
    const template = REGION_URLS['ap-southeast-1']
    const workspaceId = 'ws-123'
    const url = template.replace('{workspace}', encodeURIComponent(workspaceId))
    expect(url).toBe(
      'https://ws-123.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
    )
  })
})

// ── QwenConfig type check ──────────────────────────────────────────────

describe('QwenConfig', () => {
  it('is a valid config shape', () => {
    const config: QwenConfig = {
      apiKey: 'sk-test-key',
      baseUrl: 'https://example.com/v1',
    }
    expect(config.apiKey).toBe('sk-test-key')
    expect(config.baseUrl).toBe('https://example.com/v1')
  })
})
