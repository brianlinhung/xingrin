"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import Lottie from "lottie-react"
import securityAnimation from "@/public/animations/Security000-Purple.json"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useLogin, useAuth } from "@/hooks/use-auth"
import { useRoutePrefetch } from "@/hooks/use-route-prefetch"

export default function LoginPage() {
  // Preload all page components on login page
  useRoutePrefetch()
  const router = useRouter()
  const { data: auth, isLoading: authLoading } = useAuth()
  const { mutate: login, isPending } = useLogin()
  const t = useTranslations("auth")
  
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (auth?.authenticated) {
      router.push("/dashboard/")
    }
  }, [auth, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ username, password })
  }

  // Show spinner while loading
  if (authLoading) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-background">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground text-sm" suppressHydrationWarning>loading...</p>
      </div>
    )
  }

  // Don't show login page if already logged in
  if (auth?.authenticated) {
    return null
  }

  return (
    <div className="login-bg flex min-h-svh flex-col p-6 md:p-10">
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm md:max-w-4xl">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                <FieldGroup>
                  {/* Fingerprint identifier - for FOFA/Shodan and other search engines to identify */}
                  <meta name="generator" content="Xingrin ASM Platform" />
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">{t("title")}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("subtitle")}
                    </p> 
                  </div>
                  <Field>
                    <FieldLabel htmlFor="username">{t("username")}</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder={t("usernamePlaceholder")}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? t("loggingIn") : t("login")}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
              <div className="bg-primary/5 relative hidden md:flex md:items-center md:justify-center">
                <div className="text-center p-4">
                  <Lottie 
                    animationData={securityAnimation} 
                    loop={true}
                    className="w-96 h-96 mx-auto"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Version number - fixed at the bottom of the page */}
      <div className="flex-shrink-0 text-center py-4">
        <p className="text-xs text-muted-foreground">
          {process.env.NEXT_PUBLIC_VERSION || 'dev'}
        </p>
      </div>
    </div>
  )
}
