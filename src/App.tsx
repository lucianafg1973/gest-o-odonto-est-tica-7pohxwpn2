import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import Index from './pages/Index'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'
import Leads from './pages/Leads'
import Conversas from './pages/Conversas'
import Agenda from './pages/Agenda'
import Vendas from './pages/Vendas'
import Pacientes from './pages/Pacientes'
import PacienteDetail from './pages/PacienteDetail'
import Equipe from './pages/Equipe'
import Metas from './pages/Metas'
import Indicadores from './pages/Indicadores'
import LfgIntelligence from './pages/LfgIntelligence'
import BancoImplantes from './pages/BancoImplantes'
import Configuracoes from './pages/Configuracoes'
import TabelaPrecos from './pages/TabelaPrecos'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Signup />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/conversas" element={<Conversas />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/pacientes/:id" element={<PacienteDetail />} />
              <Route path="/equipe" element={<Equipe />} />
              <Route path="/metas" element={<Metas />} />
              <Route path="/indicadores" element={<Indicadores />} />
              <Route path="/lfg-intelligence" element={<LfgIntelligence />} />
              <Route path="/banco-implantes" element={<BancoImplantes />} />
              <Route path="/tabela-precos" element={<TabelaPrecos />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
