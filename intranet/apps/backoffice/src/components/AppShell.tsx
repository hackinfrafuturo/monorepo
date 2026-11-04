import { useEffect, useRef, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  ClipboardCheck,
  FolderKanban,
  Gavel,
  LayoutList,
  Mail,
  Search,
  UsersRound,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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
import { Kbd } from '@/components/page'
import logoLight from '@/assets/hif-oneline-light.svg?url'
import logoDark from '@/assets/hif-oneline-dark.svg?url'

type Session = { login: string; projects: Array<{ id: string; name: string }> }

/** The event's work, in the order it happens. */
const NAVIGATION = [
  {
    label: null,
    items: [{ to: '/projects/$projectId', label: 'Resumen', icon: LayoutList }],
  },
  {
    label: 'Postulaciones',
    items: [
      { to: '/projects/$projectId/participants', label: 'Participantes', icon: UsersRound },
      { to: '/projects/$projectId/review', label: 'Revisar', icon: ClipboardCheck },
      { to: '/projects/$projectId/decisions', label: 'Decisiones', icon: Gavel },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { to: '/projects/$projectId/messages', label: 'Correos', icon: Mail },
      { to: '/projects/$projectId/insights', label: 'Estadísticas', icon: BarChart3 },
    ],
  },
] as const

export function AppShell({
  session,
  children,
}: {
  session: Session
  children: ReactNode
}) {
  const projectId = session.projects[0]?.id ?? 'infra-futuro'
  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden"
      style={{ '--sidebar-width': '14.5rem' } as CSSProperties}
    >
      <ProjectSidebar session={session} projectId={projectId} />
      <SidebarInset className="h-svh min-h-0 min-w-0 overflow-hidden">
        <header
          data-slot="app-header"
          className="z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 sm:px-6"
        >
          <SidebarTrigger aria-label="Abrir o cerrar navegación" className="-ml-1.5" />
          <PersonSearch projectId={projectId} />
          <div className="ml-auto flex shrink-0 items-center">
            <ThemeToggle />
          </div>
        </header>
        <div
          data-slot="content-scroll"
          data-scroll-restoration-id="content"
          role="region"
          aria-label="Contenido del proyecto"
          tabIndex={0}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain outline-none"
        >
          <div
            id="content"
            className="@container/page mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** Finds anyone from anywhere; the slash key jumps here. */
function PersonSearch({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    const q = input.current?.value.trim()
    if (!q) return
    void navigate({
      to: '/projects/$projectId/participants',
      params: { projectId },
      search: { q },
    })
    input.current?.blur()
  }

  return (
    <form role="search" onSubmit={submit} className="relative w-full max-w-sm min-w-0">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={input}
        type="search"
        aria-label="Buscar una persona"
        placeholder="Buscar una persona"
        className="h-8 border-transparent bg-accent pr-8 pl-8 hover:border-input"
      />
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground">
        <Kbd>/</Kbd>
      </span>
    </form>
  )
}

function ProjectSidebar({ session, projectId }: { session: Session; projectId: string }) {
  const pathname = useLocation({ select: (location) => location.pathname }).replace(/\/$/, '')
  const { setOpenMobile } = useSidebar()
  const base = `/projects/${projectId}`
  return (
    <Sidebar>
      <SidebarHeader className="gap-3 px-4 pt-4 pb-3">
        <Link
          to="/projects/$projectId"
          params={{ projectId }}
          onClick={() => setOpenMobile(false)}
          aria-label="Hack Infra Futuro, resumen"
          className="block"
        >
          <img src={logoLight} alt="" className="h-[19px] w-auto dark:hidden" />
          <img src={logoDark} alt="" className="hidden h-[19px] w-auto dark:block" />
        </Link>
        <div className="dots h-1.5 w-full" aria-hidden="true" />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {NAVIGATION.map((group) => (
          <SidebarGroup key={group.label ?? 'home'} className="py-1.5">
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const path = item.to.replace('/projects/$projectId', base)
                  const active = item.to === '/projects/$projectId' ? pathname === base : pathname.startsWith(path)
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link
                          to={item.to}
                          params={{ projectId }}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm" isActive={pathname === '/projects'}>
              <Link to="/projects" onClick={() => setOpenMobile(false)}>
                <FolderKanban aria-hidden="true" />
                <span>Todos los proyectos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="truncate px-2 pb-1 text-xs text-muted-foreground" title={session.login}>
          {session.login}
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
