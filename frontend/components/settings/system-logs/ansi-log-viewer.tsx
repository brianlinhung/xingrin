"use client"

import { useEffect, useRef } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"

interface AnsiLogViewerProps {
  content: string
  className?: string
}

export function AnsiLogViewer({ content, className }: AnsiLogViewerProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    // 创建 Terminal 实例
    const terminal = new Terminal({
      fontSize: 12,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
      },
      rows: 30,
      scrollback: 10000,
      convertEol: true,
      disableStdin: true, // 只读模式
      cursorBlink: false,
    })

    // 添加插件
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    // 挂载到 DOM
    terminal.open(terminalRef.current)
    fitAddon.fit()

    // 保存引用
    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // 监听窗口大小变化
    const handleResize = () => fitAddon.fit()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      terminal.dispose()
    }
  }, [])

  // 更新日志内容
  useEffect(() => {
    const terminal = xtermRef.current
    if (!terminal || !content) return

    // 清空终端
    terminal.clear()

    // 写入新内容
    terminal.write(content.replace(/\n/g, "\r\n")) // 转换换行符

    // 滚动到底部
    terminal.scrollToBottom()
  }, [content])

  // 监听主题变化（可选）
  useEffect(() => {
    const terminal = xtermRef.current
    if (!terminal) return

    // 根据系统主题切换颜色
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    terminal.options.theme = isDark
      ? {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
        }
      : {
          background: "#ffffff",
          foreground: "#000000",
        }
  }, [])

  return (
    <div
      ref={terminalRef}
      className={className}
      style={{
        height: "100%",
        width: "100%",
      }}
    />
  )
}
