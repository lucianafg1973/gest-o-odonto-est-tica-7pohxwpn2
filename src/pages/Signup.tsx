import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sparkles, User, Mail, Lock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({
        title: 'Senhas divergentes',
        description: 'A confirmação deve ser idêntica à senha digitada.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password, name)
    setLoading(false)

    if (error) {
      toast({
        title: 'Erro ao cadastrar',
        description: 'Não foi possível registrar o usuário. Tente outro e-mail.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Bem-vindo ao sistema de Gestão Odonto Estética.',
      })
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2D1B14] via-[#3E2723] to-[#4E342E] p-4">
      <div className="w-full max-w-md bg-white border border-[#EDE3D8] rounded-3xl p-8 shadow-2xl animate-fade-in-up">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#C66B4D] flex items-center justify-center shadow-lg mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-serif-title text-2xl font-bold text-[#2D1B14]">
            Criar Conta Profissional
          </h1>
          <p className="text-xs text-[#6B4F42] mt-1">Configure sua clínica em poucos instantes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#2D1B14]">
              Nome Completo ou Razão Social
            </Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-[#C66B4D]" />
              <Input
                type="text"
                placeholder="Dra. Luciana F. G."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="pl-9 bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#2D1B14]">E-mail</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-[#C66B4D]" />
              <Input
                type="email"
                placeholder="lucianafg@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#2D1B14]">
              Senha (mínimo 8 caracteres)
            </Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#C66B4D]" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="pl-9 bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#2D1B14]">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#C66B4D]" />
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-9 bg-[#FFFDF9] border-[#EDE3D8]"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full btn-terracotta-gold font-semibold py-5 rounded-xl text-sm mt-2"
          >
            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}{' '}
            <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#EDE3D8] text-center text-xs text-[#6B4F42]">
          Já possui conta?{' '}
          <Link to="/login" className="text-[#C66B4D] font-bold hover:underline">
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  )
}
