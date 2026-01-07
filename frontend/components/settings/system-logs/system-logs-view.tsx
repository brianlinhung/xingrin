"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Download } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useSystemLogs, useLogFiles } from "@/hooks/use-system-logs"
import { LogToolbar, type LogLevel } from "./log-toolbar"
import { AnsiLogViewer } from "./ansi-log-viewer"

const DEFAULT_FILE = "xingrin.log"
const DEFAULT_LINES = 500

export function SystemLogsView() {
  const t = useTranslations("settings.systemLogs")

  // 状态管理
  const [selectedFile, setSelectedFile] = useState(DEFAULT_FILE)
  const [lines, setLines] = useState(DEFAULT_LINES)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [logLevel, setLogLevel] = useState<LogLevel>("all")

  // 获取日志文件列表
  const { data: filesData } = useLogFiles()
  const files = useMemo(() => filesData?.files ?? [], [filesData?.files])

  // 当文件列表加载完成后，如果当前选中的文件不在列表中，切换到第一个可用文件
  useEffect(() => {
    if (files.length > 0 && !files.some((f) => f.filename === selectedFile)) {
      setSelectedFile(files[0].filename)
    }
  }, [files, selectedFile])

  // 获取日志内容
  const { data: logsData } = useSystemLogs({
    file: selectedFile,
    lines,
    autoRefresh,
  })

  // 保留 ANSI 颜色码，由 xterm 渲染
  const content = useMemo(() => {
    console.log('[SystemLogsView] logsData:', logsData)
    const result = logsData?.content ?? ""
    console.log('[SystemLogsView] content length:', result.length)
    return result
  }, [logsData])

  // 下载日志
  const handleDownload = useCallback(() => {
    if (!content) return
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = selectedFile
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [content, selectedFile])

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* 紧凑单行工具栏 - 标题融入 */}
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-semibold whitespace-nowrap">{t("title")}</h1>
        <Separator orientation="vertical" className="h-5" />
        <LogToolbar
          files={files}
          selectedFile={selectedFile}
          lines={lines}
          searchQuery={searchQuery}
          logLevel={logLevel}
          onFileChange={setSelectedFile}
          onLinesChange={setLines}
          onSearchChange={setSearchQuery}
          onLogLevelChange={setLogLevel}
        />
        {/* 下载按钮 */}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={handleDownload}
          disabled={!content}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {t("toolbar.download")}
        </Button>
      </div>

      {/* 日志查看器 */}
      <div className="flex-1 flex flex-col rounded-lg overflow-hidden border">
        <div className="flex-1 min-h-[400px] bg-[#1e1e1e]">
          {content ? (
            <AnsiLogViewer content={content} searchQuery={searchQuery} logLevel={logLevel} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("noContent")}
            </div>
          )}
        </div>

        {/* 底部状态栏 */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{lines} {t("toolbar.linesUnit")}</span>
            <Separator orientation="vertical" className="h-3" />
            <span>{selectedFile}</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="flex items-center gap-1.5">
              {autoRefresh && (
                <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              )}
              {t("description")}
            </span>
          </div>
          {/* 自动刷新开关 */}
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="scale-75"
            />
            <Label
              htmlFor="auto-refresh"
              className="text-xs cursor-pointer"
            >
              {t("toolbar.autoRefresh")}
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
