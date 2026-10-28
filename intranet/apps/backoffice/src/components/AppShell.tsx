import type { CSSProperties, ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ClipboardList, FolderKanban, Layers3, ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

type Session = { login: string; projects: Array<{ id: string; name: string }> }

export function AppShell({
  session,
  children,
}: {
  session: Session
  children: ReactNode
}) {
  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden"
      style={{ '--sidebar-width': '15rem' } as CSSProperties}
    >
      <ProjectSidebar session={session} />
      <SidebarInset className="h-svh min-h-0 min-w-0 overflow-hidden">
        <header
          data-slot="app-header"
          className="z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 sm:px-6"
        >
          <SidebarTrigger aria-label="Abrir o cerrar navegación" />
          <Separator orientation="vertical" className="h-4!" />
          <Link
            to="/projects"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Proyectos
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="hidden gap-1.5 sm:inline-flex">
              <ShieldCheck className="size-3" />
              Operaciones
            </Badge>
            <ThemeToggle />
          </div>
        </header>
        <div
          data-slot="content-scroll"
          role="region"
          aria-label="Contenido del proyecto"
          tabIndex={0}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain"
        >
          <div
            id="content"
            className="@container/page mx-auto w-full max-w-7xl min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function ProjectSidebar({ session }: { session: Session }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/projects" onClick={() => setOpenMobile(false)}>
                <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Layers3 className="size-5" />
                </span>
                <span className="grid gap-0.5">
                  <span className="font-semibold">Intranet</span>
                  <span className="text-xs text-muted-foreground">
                    Espacio de trabajo
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/projects' || pathname === '/projects/'
                  }
                >
                  <Link to="/projects" onClick={() => setOpenMobile(false)}>
                    <FolderKanban />
                    <span>Todos los proyectos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Proyectos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {session.projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`/projects/${project.id}/`)}
                    size="lg"
                  >
                    <Link
                      to="/projects/$projectId/stats"
                      params={{ projectId: project.id }}
                      onClick={() => setOpenMobile(false)}
                    >
                      <ClipboardList />
                      <span className="grid gap-0.5">
                        <span>{project.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Inscripciones
                        </span>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-4">
        <Separator />
        <div className="flex min-w-0 items-center gap-3 py-1">
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg text-xs">
              {session.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium">Organización</p>
            <p
              className="truncate text-xs text-muted-foreground"
              title={session.login}
            >
              {session.login}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
