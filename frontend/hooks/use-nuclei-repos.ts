/**
 * Nuclei 模板仓库相关 Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import { nucleiRepoApi } from "../services/nuclei-repo.api"
import type { NucleiTemplateTreeNode, NucleiTemplateContent } from "@/types/nuclei.types"

// ==================== 仓库 CRUD ====================

export interface NucleiRepo {
  id: number
  name: string
  repoUrl: string
  localPath: string
  commitHash: string | null
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 获取仓库列表 */
export function useNucleiRepos() {
  return useQuery<NucleiRepo[]>({
    queryKey: ["nuclei-repos"],
    queryFn: nucleiRepoApi.listRepos,
  })
}

/** 获取单个仓库详情 */
export function useNucleiRepo(repoId: number | null) {
  return useQuery<NucleiRepo>({
    queryKey: ["nuclei-repos", repoId],
    queryFn: () => nucleiRepoApi.getRepo(repoId!),
    enabled: !!repoId,
  })
}

/** 创建仓库 */
export function useCreateNucleiRepo() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: nucleiRepoApi.createRepo,
    onSuccess: () => {
      toastMessages.success('toast.nucleiRepo.create.success')
      queryClient.invalidateQueries({ queryKey: ["nuclei-repos"] })
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.nucleiRepo.create.error')
    },
  })
}

/** 更新仓库 */
export function useUpdateNucleiRepo() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: {
      id: number
      repoUrl?: string
    }) => nucleiRepoApi.updateRepo(data.id, { repoUrl: data.repoUrl }),
    onSuccess: (_data, variables) => {
      toastMessages.success('toast.nucleiRepo.update.success')
      queryClient.invalidateQueries({ queryKey: ["nuclei-repos"] })
      queryClient.invalidateQueries({ queryKey: ["nuclei-repos", variables.id] })
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.nucleiRepo.update.error')
    },
  })
}

/** 删除仓库 */
export function useDeleteNucleiRepo() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: nucleiRepoApi.deleteRepo,
    onSuccess: () => {
      toastMessages.success('toast.nucleiRepo.delete.success')
      queryClient.invalidateQueries({ queryKey: ["nuclei-repos"] })
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.nucleiRepo.delete.error')
    },
  })
}

// ==================== Git 同步 ====================

/** 刷新仓库（Git clone/pull） */
export function useRefreshNucleiRepo() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: nucleiRepoApi.refreshRepo,
    onSuccess: (_data, repoId) => {
      toastMessages.success('toast.nucleiRepo.sync.success')
      queryClient.invalidateQueries({ queryKey: ["nuclei-repos"] })
      queryClient.invalidateQueries({ queryKey: ["nuclei-repos", repoId] })
      queryClient.invalidateQueries({ queryKey: ["nuclei-repo-tree", repoId] })
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.nucleiRepo.sync.error')
    },
  })
}

// ==================== 模板只读 ====================

/** 获取仓库模板目录树 */
export function useNucleiRepoTree(repoId: number | null) {
  return useQuery({
    queryKey: ["nuclei-repo-tree", repoId],
    queryFn: async () => {
      const res = await nucleiRepoApi.getTemplateTree(repoId!)
      return (res.roots ?? []) as NucleiTemplateTreeNode[]
    },
    enabled: !!repoId,
  })
}

/** 获取模板文件内容 */
export function useNucleiRepoContent(repoId: number | null, path: string | null) {
  return useQuery<NucleiTemplateContent>({
    queryKey: ["nuclei-repo-content", repoId, path],
    queryFn: () => nucleiRepoApi.getTemplateContent(repoId!, path!),
    enabled: !!repoId && !!path,
  })
}
