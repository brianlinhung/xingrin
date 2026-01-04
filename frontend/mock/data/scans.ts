import type { ScanRecord, GetScansResponse, ScanStatus } from '@/types/scan.types'
import type { ScanStatistics } from '@/services/scan.service'

export const mockScans: ScanRecord[] = [
  {
    id: 1,
    target: 1,
    targetName: 'acme.com',
    workerName: 'worker-01',
    summary: {
      subdomains: 156,
      websites: 89,
      directories: 234,
      endpoints: 2341,
      ips: 45,
      vulnerabilities: {
        total: 23,
        critical: 1,
        high: 4,
        medium: 8,
        low: 10,
      },
    },
    engineIds: [1, 2, 3],
    engineNames: ['Subdomain Discovery', 'Web Crawling', 'Nuclei Scanner'],
    createdAt: '2024-12-28T10:00:00Z',
    status: 'completed',
    progress: 100,
  },
  {
    id: 2,
    target: 2,
    targetName: 'acme.io',
    workerName: 'worker-02',
    summary: {
      subdomains: 78,
      websites: 45,
      directories: 123,
      endpoints: 892,
      ips: 23,
      vulnerabilities: {
        total: 12,
        critical: 0,
        high: 2,
        medium: 5,
        low: 5,
      },
    },
    engineIds: [1, 2],
    engineNames: ['Subdomain Discovery', 'Web Crawling'],
    createdAt: '2024-12-27T14:30:00Z',
    status: 'running',
    progress: 65,
    currentStage: 'web_crawling',
    stageProgress: {
      subdomain_discovery: {
        status: 'completed',
        order: 0,
        startedAt: '2024-12-27T14:30:00Z',
        duration: 1200,
        detail: 'Found 78 subdomains',
      },
      web_crawling: {
        status: 'running',
        order: 1,
        startedAt: '2024-12-27T14:50:00Z',
      },
    },
  },
  {
    id: 3,
    target: 3,
    targetName: 'techstart.io',
    workerName: 'worker-01',
    summary: {
      subdomains: 45,
      websites: 28,
      directories: 89,
      endpoints: 567,
      ips: 12,
      vulnerabilities: {
        total: 8,
        critical: 0,
        high: 1,
        medium: 3,
        low: 4,
      },
    },
    engineIds: [1, 2, 3],
    engineNames: ['Subdomain Discovery', 'Web Crawling', 'Nuclei Scanner'],
    createdAt: '2024-12-26T08:45:00Z',
    status: 'completed',
    progress: 100,
  },
  {
    id: 4,
    target: 4,
    targetName: 'globalfinance.com',
    workerName: 'worker-03',
    summary: {
      subdomains: 0,
      websites: 0,
      directories: 0,
      endpoints: 0,
      ips: 0,
      vulnerabilities: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    },
    engineIds: [1],
    engineNames: ['Subdomain Discovery'],
    createdAt: '2024-12-25T16:20:00Z',
    status: 'failed',
    progress: 15,
    errorMessage: 'Connection timeout: Unable to reach target',
  },
  {
    id: 5,
    target: 6,
    targetName: 'healthcareplus.com',
    workerName: 'worker-02',
    summary: {
      subdomains: 34,
      websites: 0,
      directories: 0,
      endpoints: 0,
      ips: 8,
      vulnerabilities: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    },
    engineIds: [1, 2, 3],
    engineNames: ['Subdomain Discovery', 'Web Crawling', 'Nuclei Scanner'],
    createdAt: '2024-12-29T09:00:00Z',
    status: 'running',
    progress: 25,
    currentStage: 'subdomain_discovery',
    stageProgress: {
      subdomain_discovery: {
        status: 'running',
        order: 0,
        startedAt: '2024-12-29T09:00:00Z',
      },
      web_crawling: {
        status: 'pending',
        order: 1,
      },
      nuclei_scan: {
        status: 'pending',
        order: 2,
      },
    },
  },
  {
    id: 6,
    target: 7,
    targetName: 'edutech.io',
    workerName: null,
    summary: {
      subdomains: 0,
      websites: 0,
      directories: 0,
      endpoints: 0,
      ips: 0,
      vulnerabilities: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    },
    engineIds: [1, 2],
    engineNames: ['Subdomain Discovery', 'Web Crawling'],
    createdAt: '2024-12-29T10:30:00Z',
    status: 'initiated',
    progress: 0,
  },
  {
    id: 7,
    target: 8,
    targetName: 'retailmax.com',
    workerName: 'worker-01',
    summary: {
      subdomains: 89,
      websites: 56,
      directories: 178,
      endpoints: 1234,
      ips: 28,
      vulnerabilities: {
        total: 15,
        critical: 0,
        high: 3,
        medium: 6,
        low: 6,
      },
    },
    engineIds: [1, 2, 3],
    engineNames: ['Subdomain Discovery', 'Web Crawling', 'Nuclei Scanner'],
    createdAt: '2024-12-21T10:45:00Z',
    status: 'completed',
    progress: 100,
  },
  {
    id: 8,
    target: 11,
    targetName: 'mediastream.tv',
    workerName: 'worker-02',
    summary: {
      subdomains: 67,
      websites: 0,
      directories: 0,
      endpoints: 0,
      ips: 15,
      vulnerabilities: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    },
    engineIds: [1, 2, 3],
    engineNames: ['Subdomain Discovery', 'Web Crawling', 'Nuclei Scanner'],
    createdAt: '2024-12-29T08:00:00Z',
    status: 'running',
    progress: 45,
    currentStage: 'web_crawling',
    stageProgress: {
      subdomain_discovery: {
        status: 'completed',
        order: 0,
        startedAt: '2024-12-29T08:00:00Z',
        duration: 900,
        detail: 'Found 67 subdomains',
      },
      web_crawling: {
        status: 'running',
        order: 1,
        startedAt: '2024-12-29T08:15:00Z',
      },
      nuclei_scan: {
        status: 'pending',
        order: 2,
      },
    },
  },
]

export const mockScanStatistics: ScanStatistics = {
  total: 156,
  running: 3,
  completed: 142,
  failed: 11,
  totalVulns: 89,
  totalSubdomains: 4823,
  totalEndpoints: 12456,
  totalWebsites: 3421,
  totalAssets: 21638,
}

export function getMockScans(params?: {
  page?: number
  pageSize?: number
  status?: ScanStatus
  search?: string
}): GetScansResponse {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const status = params?.status
  const search = params?.search?.toLowerCase() || ''

  let filtered = mockScans

  if (status) {
    filtered = filtered.filter(scan => scan.status === status)
  }

  if (search) {
    filtered = filtered.filter(scan =>
      scan.targetName.toLowerCase().includes(search)
    )
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = filtered.slice(start, start + pageSize)

  return {
    results,
    total,
    page,
    pageSize,
    totalPages,
  }
}

export function getMockScanById(id: number): ScanRecord | undefined {
  return mockScans.find(scan => scan.id === id)
}
