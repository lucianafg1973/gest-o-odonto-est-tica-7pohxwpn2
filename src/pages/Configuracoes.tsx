import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { Settings, User, Bell, Palette, Shield } from 'lucide-react'

export default function Configuracoes() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [notifications, setNotifications] = useState(true)
  const [whatsappAlerts, setWhatsappAlerts] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast({ title: 'Configurações salvas!' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#EDE3D8] shadow-subtle">
        <div>
          <h2 className="font-serif-title text-xl font-bold text-[#2D1B14]">Configurações</h2>
          <p className="text-xs text-[#6B4F42] mt-1">
            Gerencie suas preferências e dados da conta.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-warm">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif-title text-sm text-[#2D1B14] flex items-center gap-2">
              <User className="w-4 h-4 text-[#C66B4D]" />
              Dados da Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input value={user?.email || ''} disabled className="bg-gray-50" />
              </div>
              <Button type="submit" className="btn-terracotta-gold text-xs">
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="card-warm">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif-title text-sm text-[#2D1B14] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#C66B4D]" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2D1B14]">Notificações gerais</p>
                <p className="text-[11px] text-[#6B4F42]">Receber alertas no sistema</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2D1B14]">Alertas via WhatsApp</p>
                <p className="text-[11px] text-[#6B4F42]">Lembretes e mensagens</p>
              </div>
              <Switch checked={whatsappAlerts} onCheckedChange={setWhatsappAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2D1B14]">Alertas via E-mail</p>
                <p className="text-[11px] text-[#6B4F42]">Resumos e notificações</p>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-warm">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif-title text-sm text-[#2D1B14] flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#C66B4D]" />
              Aparência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg border border-[#EDE3D8]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#C66B4D] to-[#D4AF37]" />
              <span className="text-sm text-[#2D1B14]">Tema Terracota & Ouro (padrão)</span>
            </div>
            <p className="text-[11px] text-[#6B4F42] mt-2">
              O tema do sistema é otimizado para clínicas odonto e estética.
            </p>
          </CardContent>
        </Card>

        <Card className="card-warm">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif-title text-sm text-[#2D1B14] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C66B4D]" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => toast({ title: 'Link enviado!' })}
            >
              Alterar Senha
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs text-red-600 border-red-200"
              onClick={() => toast({ title: 'Contate o suporte' })}
            >
              Excluir Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
