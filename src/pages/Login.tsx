import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast({
        title: 'Falha na autenticação',
        description: 'Credenciais inválidas. Tente novamente.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Bem-vindo de volta!', description: 'Acesso concedido com sucesso.' })
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2D1B14] via-[#3E2723] to-[#4E342E] p-4">
      <div className="w-full max-w-md bg-white border border-[#EDE3D8] rounded-3xl p-8 shadow-2xl animate-fade-in-up">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#C66B4D] flex items-center justify-center shadow-lg mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif-title text-2xl font-bold text-[#2D1B14]">
            Gestão Odonto Estética
          </h1>
          <p className="text-xs text-[#6B4F42] mt-1">Acesse sua clínica digital integrada</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#2D1B14]">E-mail corporativo</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-[#C66B4D]" />
              <Input
                type="email"
                placeholder="seu.email@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 bg-[#FFFDF9] border-[#EDE3D8] focus:ring-[#C66B4D]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold text-[#2D1B14]">Senha</Label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  toast({
                    title: 'Recuperação de Senha',
                    description: 'Instruções enviadas para seu e-mail de cadastro.',
                  })
                }}
                className="text-[11px] text-[#C66B4D] hover:underline"
              >
                Esqueci minha senha
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#C66B4D]" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 bg-[#FFFDF9] border-[#EDE3D8] focus:ring-[#C66B4D]"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full btn-terracotta-gold font-semibold py-6 rounded-xl text-sm"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#EDE3D8] text-center text-xs text-[#6B4F42]">
          Ainda não possui conta?{' '}
          <Link to="/cadastro" className="text-[#C66B4D] font-bold hover:underline">
            Criar conta profissional
          </Link>
        </div>
      </div>
    </div>
  )
}
