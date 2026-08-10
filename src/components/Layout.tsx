import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  UserPlus,
  MessageCircle,
  Calendar,
  TrendingUp,
  Users,
  UserCog,
  Target,
  BarChart3,
  Brain,
  Boxes,
  Receipt,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Leads', path: '/leads', icon: UserPlus },
  { label: 'Conversas', path: '/conversas', icon: MessageCircle },
  { label: 'Agenda', path: '/agenda', icon: Calendar },
  { label: 'Vendas', path: '/vendas', icon: TrendingUp },
  { label: 'Pacientes', path: '/pacientes', icon: Users },
  { label: 'Equipe', path: '/equipe', icon: UserCog },
  { label: 'Metas', path: '/metas', icon: Target },
  { label: 'Indicadores', path: '/indicadores', icon: BarChart3 },
  { label: 'LFG Intelligence', path: '/lfg-intelligence', icon: Brain },
  { label: 'Banco de Implantes', path: '/banco-implantes', icon: Boxes },
  { label: 'Tabela de Preços', path: '/tabela-precos', icon: Receipt },
  { label: 'Configurações', path: '/configuracoes', icon: Settings },
]

const pageTitles: Record<string, string> = {
  '/': 'Dashboard LFG',
  '/leads': 'Leads & Captação',
  '/conversas': 'Conversas & Relacionamento',
  '/agenda': 'Agenda Inteligente',
  '/vendas': 'Vendas & Propostas',
  '/pacientes': 'Gestão de Pacientes',
  '/equipe': 'Equipe & Profissionais',
  '/metas': 'Metas & Objetivos',
  '/indicadores': 'Indicadores Financeiros',
  '/lfg-intelligence': 'LFG Intelligence',
  '/banco-implantes': 'Banco de Implantes',
  '/tabela-precos': 'Tabela de Preços',
  '/configuracoes': 'Configurações',
}

export function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const getTitle = () => {
    if (location.pathname.startsWith('/pacientes/')) return 'Prontuário do Paciente'
    return pageTitles[location.pathname] || 'LFG Software'
  }

  const renderNav = () => (
    <div className="flex flex-col h-full justify-between py-6 px-4">
      <div>
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C66B4D] flex items-center justify-center shadow-md">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif-title font-bold text-lg text-[#FAF6F0] leading-none">LFG</h1>
            <p className="text-[11px] text-[#D4AF37] font-medium tracking-wider uppercase mt-1">
              Software
            </p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  isActive
                    ? 'bg-[#C66B4D]/20 text-[#D4AF37] font-semibold'
                    : 'text-[#EDE3D8]/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#D4AF37] rounded-r-full" />
                )}
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-[#EDE3D8]/70'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="w-9 h-9 border border-[#D4AF37]/40">
              <AvatarFallback className="bg-[#C66B4D] text-white text-xs font-bold">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'DR'}
              </AvatarFallback>
            </Avatar>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Usuário'}</p>
              <p className="text-[10px] text-[#EDE3D8]/60 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              signOut()
              navigate('/login')
            }}
            className="text-red-300 hover:text-red-100 hover:bg-red-500/20 h-8 w-8"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-[#FAF6F0]">
      <aside className="hidden md:block w-64 bg-gradient-to-b from-[#3E2723] to-[#2D1B14] fixed inset-y-0 left-0 z-30 shadow-xl border-r border-[#3E2723]">
        {renderNav()}
      </aside>
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-[#FAF6F0]/90 backdrop-blur-md border-b border-[#EDE3D8] px-4 md:px-8 py-3.5 flex items-center justify-between shadow-subtle">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-[#2D1B14]">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-64 bg-gradient-to-b from-[#3E2723] to-[#2D1B14] border-r-0"
              >
                {renderNav()}
              </SheetContent>
            </Sheet>
            <h1 className="font-serif-title text-xl md:text-2xl font-bold text-[#2D1B14]">
              {getTitle()}
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full p-1 h-auto">
                <Avatar className="w-8 h-8 border border-[#D4AF37]">
                  <AvatarFallback className="bg-[#C66B4D] text-white text-xs font-bold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'DR'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-[#EDE3D8]">
              <div className="px-3 py-2 border-b border-[#EDE3D8]">
                <p className="text-xs font-semibold text-[#2D1B14]">
                  {user?.name || 'Profissional'}
                </p>
                <p className="text-[10px] text-[#6B4F42]">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate('/lfg-intelligence')}>
                <Brain className="w-4 h-4 mr-2 text-[#C66B4D]" /> LFG Intelligence
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  signOut()
                  navigate('/login')
                }}
                className="text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sair do sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 md:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
