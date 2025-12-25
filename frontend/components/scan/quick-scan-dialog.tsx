"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Zap, Settings, ChevronRight, ChevronLeft, Loader2, AlertCircle } from "lucide-react"
import { getEngines } from "@/services/engine.service"
import { quickScan } from "@/services/scan.service"
import { CAPABILITY_CONFIG, getEngineIcon, parseEngineCapabilities } from "@/lib/engine-config"
import { TargetValidator } from "@/lib/target-validator"
import type { ScanEngine } from "@/types/engine.types"

const STEP_TITLES = ["输入目标", "选择引擎", "确认扫描"]

interface QuickScanDialogProps {
  trigger?: React.ReactNode
}

export function QuickScanDialog({ trigger }: QuickScanDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const [targetInput, setTargetInput] = React.useState("")
  const [selectedEngineId, setSelectedEngineId] = React.useState<string>("")
  const [engines, setEngines] = React.useState<ScanEngine[]>([])
  
  const lineNumbersRef = React.useRef<HTMLDivElement | null>(null)
  
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }
  
  const validationResults = React.useMemo(() => {
    const lines = targetInput.split('\n')
    return TargetValidator.validateInputBatch(lines)
  }, [targetInput])
  
  const validInputs = validationResults.filter(r => r.isValid && !r.isEmptyLine)
  const invalidInputs = validationResults.filter(r => !r.isValid)
  const hasErrors = invalidInputs.length > 0
  
  React.useEffect(() => {
    if (open && step === 2 && engines.length === 0) {
      setIsLoading(true)
      getEngines()
        .then(setEngines)
        .catch(() => toast.error("获取引擎列表失败"))
        .finally(() => setIsLoading(false))
    }
  }, [open, step, engines.length])
  
  const resetForm = () => {
    setStep(1)
    setTargetInput("")
    setSelectedEngineId("")
  }
  
  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) resetForm()
  }
  
  const handleNext = () => {
    if (step === 1) {
      if (validInputs.length === 0) {
        toast.error("请输入至少一个有效目标")
        return
      }
      if (hasErrors) {
        toast.error(`存在 ${invalidInputs.length} 个无效输入，请修正后继续`)
        return
      }
    }
    if (step === 2 && !selectedEngineId) {
      toast.error("请选择扫描引擎")
      return
    }
    setStep(step + 1)
  }
  
  const handlePrev = () => setStep(step - 1)
  
  const handleSubmit = async () => {
    const targets = validInputs.map(r => r.originalInput)
    if (targets.length === 0) return
    
    setIsSubmitting(true)
    try {
      const response = await quickScan({
        targets: targets.map(name => ({ name })),
        engineId: Number(selectedEngineId),
      })
      
      const { targetStats, scans } = response
      
      if (scans.length > 0) {
        toast.success(response.message || `已创建 ${scans.length} 个扫描任务`, {
          description: targetStats.failed > 0 
            ? `${targetStats.created} 个目标成功，${targetStats.failed} 个失败`
            : undefined
        })
        handleClose(false)
      } else {
        toast.error("创建扫描任务失败", {
          description: targetStats.failed > 0 ? `${targetStats.failed} 个目标处理失败` : undefined
        })
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.response?.data?.error || "创建扫描任务失败")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const selectedEngine = engines.find(e => String(e.id) === selectedEngineId)
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="relative group">
            {/* 边框流光效果 */}
            <div className="absolute -inset-[1px] rounded-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-border-flow" />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 relative bg-background border-primary/20"
            >
              <Zap className="h-4 w-4 text-primary" />
              快速扫描
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-[900px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            快速扫描
            <span className="text-muted-foreground font-normal text-sm ml-2">
              步骤 {step}/3 · {STEP_TITLES[step - 1]}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="h-[380px]">
          {/* 第一步：输入目标 */}
          {step === 1 && (
            <div className="flex flex-col h-full">
              <div className="flex-1 flex overflow-hidden border-t">
                <div className="flex-shrink-0 w-12 border-r bg-muted/30">
                  <div 
                    ref={lineNumbersRef}
                    className="py-3 px-2 text-right font-mono text-xs text-muted-foreground leading-[1.5] h-full overflow-y-auto scrollbar-hide"
                  >
                    {Array.from({ length: Math.max(targetInput.split('\n').length, 20) }, (_, i) => (
                      <div key={i + 1} className="h-[21px]">{i + 1}</div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Textarea
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onScroll={handleTextareaScroll}
                    placeholder={`每行输入一个目标，支持以下格式：

域名: example.com, sub.example.com
IP地址: 192.168.1.1, 10.0.0.1
CIDR网段: 192.168.0.0/24, 10.0.0.0/8
URL: https://example.com/api/v1`}
                    className="font-mono h-full overflow-y-auto resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-3 px-4"
                    style={{ lineHeight: '21px' }}
                    autoFocus
                  />
                </div>
              </div>
              {hasErrors && (
                <div className="px-4 py-2 border-t bg-destructive/5 max-h-[60px] overflow-y-auto">
                  {invalidInputs.slice(0, 3).map((r) => (
                    <div key={r.lineNumber} className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>行 {r.lineNumber}: {r.error}</span>
                    </div>
                  ))}
                  {invalidInputs.length > 3 && (
                    <div className="text-xs text-muted-foreground">还有 {invalidInputs.length - 3} 个错误...</div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* 第二步：选择引擎 */}
          {step === 2 && (
            <div className="flex h-full">
              <div className="w-[260px] border-r flex flex-col shrink-0">
                <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
                  <h3 className="text-sm font-medium">选择引擎</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : engines.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">暂无可用引擎</div>
                  ) : (
                    <RadioGroup
                      value={selectedEngineId}
                      onValueChange={setSelectedEngineId}
                      disabled={isSubmitting}
                      className="p-2 space-y-1"
                    >
                      {engines.map((engine) => {
                        const capabilities = parseEngineCapabilities(engine.configuration || '')
                        const EngineIcon = getEngineIcon(capabilities)
                        const primaryCap = capabilities[0]
                        const iconConfig = primaryCap ? CAPABILITY_CONFIG[primaryCap] : null
                        const isSelected = selectedEngineId === engine.id.toString()

                        return (
                          <label
                            key={engine.id}
                            htmlFor={`engine-${engine.id}`}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                              isSelected
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/50 border border-transparent"
                            )}
                          >
                            <RadioGroupItem value={engine.id.toString()} id={`engine-${engine.id}`} className="sr-only" />
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-md shrink-0", iconConfig?.color || "bg-muted text-muted-foreground")}>
                              <EngineIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{engine.name}</div>
                              <div className="text-xs text-muted-foreground">{capabilities.length > 0 ? `${capabilities.length} 项能力` : "无配置"}</div>
                            </div>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </label>
                        )
                      })}
                    </RadioGroup>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {selectedEngine ? (
                  <>
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium truncate">{selectedEngine.name}</h3>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                      {(() => {
                        const caps = parseEngineCapabilities(selectedEngine.configuration || '')
                        return caps.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {caps.map((capKey) => {
                              const config = CAPABILITY_CONFIG[capKey]
                              return (
                                <Badge key={capKey} variant="outline" className={cn("text-xs", config?.color)}>
                                  {config?.label || capKey}
                                </Badge>
                              )
                            })}
                          </div>
                        )
                      })()}
                      <div className="flex-1 bg-muted/50 rounded-lg border overflow-hidden min-h-0">
                        <pre className="h-full p-3 text-xs font-mono overflow-auto whitespace-pre-wrap break-all">
                          {selectedEngine.configuration || "# 无配置"}
                        </pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">选择左侧引擎查看配置详情</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 第三步：确认 */}
          {step === 3 && (
            <div className="flex h-full">
              <div className="w-[260px] border-r flex flex-col shrink-0">
                <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
                  <h3 className="text-sm font-medium">扫描目标</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {validInputs.map((r, idx) => (
                      <div key={idx} className="font-mono text-xs truncate">{r.originalInput}</div>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
                  共 {validInputs.length} 个目标
                </div>
              </div>
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium truncate">{selectedEngine?.name}</h3>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                  {(() => {
                    const caps = parseEngineCapabilities(selectedEngine?.configuration || '')
                    return caps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {caps.map((capKey) => {
                          const config = CAPABILITY_CONFIG[capKey]
                          return (
                            <Badge key={capKey} variant="outline" className={cn("text-xs", config?.color)}>
                              {config?.label || capKey}
                            </Badge>
                          )
                        })}
                      </div>
                    )
                  })()}
                  <div className="flex-1 bg-muted/50 rounded-lg border overflow-hidden min-h-0">
                    <pre className="h-full p-3 text-xs font-mono overflow-auto whitespace-pre-wrap break-all">
                      {selectedEngine?.configuration || "# 无配置"}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t flex items-center justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {step === 1 && (
              <>
                支持: 域名、IP、CIDR、URL
                {validInputs.length > 0 && (
                  <span className="text-primary font-medium ml-2">{validInputs.length} 个有效目标</span>
                )}
                {hasErrors && (
                  <span className="text-destructive ml-2">{invalidInputs.length} 个无效</span>
                )}
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={step === 1} className={cn(step === 1 && "invisible")}>
              <ChevronLeft className="h-4 w-4" />
              上一步
            </Button>
            {step < 3 ? (
              <Button size="sm" onClick={handleNext}>
                下一步
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    开始扫描
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
