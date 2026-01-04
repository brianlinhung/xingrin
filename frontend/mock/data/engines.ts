import type { ScanEngine } from '@/types/engine.types'

export const mockEngines: ScanEngine[] = [
  {
    id: 1,
    name: 'Full Scan',
    configuration: `# Full reconnaissance scan
stages:
  - name: subdomain_discovery
    tools:
      - subfinder
      - amass
  - name: port_scan
    tools:
      - nmap
  - name: web_crawling
    tools:
      - httpx
      - katana
  - name: vulnerability_scan
    tools:
      - nuclei
`,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-12-20T10:30:00Z',
  },
  {
    id: 2,
    name: 'Quick Scan',
    configuration: `# Quick scan - subdomain and web only
stages:
  - name: subdomain_discovery
    tools:
      - subfinder
  - name: web_crawling
    tools:
      - httpx
`,
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2024-12-18T14:00:00Z',
  },
  {
    id: 3,
    name: 'Vulnerability Only',
    configuration: `# Vulnerability scan only
stages:
  - name: vulnerability_scan
    tools:
      - nuclei
    options:
      severity: critical,high,medium
`,
    createdAt: '2024-03-05T11:00:00Z',
    updatedAt: '2024-12-15T16:20:00Z',
  },
  {
    id: 4,
    name: 'Subdomain Discovery',
    configuration: `# Subdomain enumeration only
stages:
  - name: subdomain_discovery
    tools:
      - subfinder
      - amass
      - findomain
`,
    createdAt: '2024-04-12T08:30:00Z',
    updatedAt: '2024-12-10T09:00:00Z',
  },
]

export function getMockEngines(): ScanEngine[] {
  return mockEngines
}

export function getMockEngineById(id: number): ScanEngine | undefined {
  return mockEngines.find(e => e.id === id)
}
