"use client"

import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SearchPaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

/**
 * 搜索结果分页组件
 */
export function SearchPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: SearchPaginationProps) {
  const t = useTranslations('common.pagination')

  const handlePageSizeChange = React.useCallback((value: string) => {
    onPageSizeChange(Number(value))
  }, [onPageSizeChange])

  const handleFirstPage = React.useCallback(() => {
    onPageChange(1)
  }, [onPageChange])

  const handlePreviousPage = React.useCallback(() => {
    onPageChange(Math.max(1, page - 1))
  }, [onPageChange, page])

  const handleNextPage = React.useCallback(() => {
    onPageChange(Math.min(totalPages, page + 1))
  }, [onPageChange, page, totalPages])

  const handleLastPage = React.useCallback(() => {
    onPageChange(totalPages)
  }, [onPageChange, totalPages])

  const canPreviousPage = page > 1
  const canNextPage = page < totalPages

  return (
    <div className="flex items-center justify-between">
      {/* 总数信息 */}
      <div className="flex-1 text-sm text-muted-foreground">
        {t('total', { count: total })}
      </div>

      {/* 分页控制 */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        {/* 每页条数选择 */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            {t('rowsPerPage')}
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="h-8 w-[90px]" id="rows-per-page">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 页码信息 */}
        <div className="flex items-center justify-center text-sm font-medium whitespace-nowrap">
          {t('page', { current: page, total: totalPages || 1 })}
        </div>

        {/* 分页按钮 */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={handleFirstPage}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">{t('first')}</span>
            <IconChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={handlePreviousPage}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">{t('previous')}</span>
            <IconChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={handleNextPage}
            disabled={!canNextPage}
          >
            <span className="sr-only">{t('next')}</span>
            <IconChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={handleLastPage}
            disabled={!canNextPage}
          >
            <span className="sr-only">{t('last')}</span>
            <IconChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
