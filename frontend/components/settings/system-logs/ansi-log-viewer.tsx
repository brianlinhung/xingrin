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

    // 延迟初始化，确保 DOM 完全挂载
    const timer = setTimeout(() => {
      if (!terminalRef.current) return

      try {
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
        terminal.open(terminalRef.current!)
        
        // 延迟 fit，确保 DOM 渲染完成
        requestAnimationFrame(() => {
          try {
            fitAddon.fit()
          } catch (e) {
            console.warn("Failed to fit terminal:", e)
          }
        })

        // 保存引用
        xtermRef.current = terminal
        fitAddonRef.current = fitAddon

        // 监听窗口大小变化
        const handleResize = () => {
          try {
            fitAddon.fit()
          } catch (e) {
            console.warn("Failed to fit terminal on resize:", e)
          }
        }
        window.addEventListener("resize", handleResize)

        // 清理函数
        return () => {
          window.removeEventListener("resize", handleResize)
          terminal.dispose()
        }
      } catch (e) {
        console.error("Failed to initialize terminal:", e)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  // 更新日志内容
  useEffect(() => {
    const terminal = xtermRef.current
    if (!terminal || !content) return

    try {
      // 清空终端
      terminal.clear()

      // 写入新内容
      terminal.write(content.replace(/\n/g, "\r\n")) // 转换换行符

      // 滚动到底部
      terminal.scrollToBottom()
    } catch (e) {
      console.warn("Failed to update terminal content:", e)
    }
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
