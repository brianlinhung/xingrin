"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { Card, CardContent } from "@/components/ui/card"
import { useSystemLogs, useLogFiles } from "@/hooks/use-system-logs"
import { LogToolbar } from "./log-toolbar"
import { AnsiLogViewer } from "./ansi-log-viewer"

const DEFAULT_FILE = "xingrin.log"
const DEFAULT_LINES = 500

export function SystemLogsView() {
  const t = useTranslations("settings.systemLogs")

  // 状态管理
  const [selectedFile, setSelectedFile] = useState(DEFAULT_FILE)
  const [lines, setLines] = useState(DEFAULT_LINES)
  const [autoRefresh, setAutoRefresh] = useState(true)

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

  const content = useMemo(() => logsData?.content ?? "", [logsData?.content])

  return (
    <Card>
      <CardContent className="space-y-4">
        <LogToolbar
          files={files}
          selectedFile={selectedFile}
          lines={lines}
          autoRefresh={autoRefresh}
          onFileChange={setSelectedFile}
          onLinesChange={setLines}
          onAutoRefreshChange={setAutoRefresh}
        />
        <div className="h-[calc(100vh-300px)] min-h-[360px] rounded-lg border overflow-hidden bg-[#1e1e1e]">
          {content ? (
            <AnsiLogViewer content={content} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("noContent")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
