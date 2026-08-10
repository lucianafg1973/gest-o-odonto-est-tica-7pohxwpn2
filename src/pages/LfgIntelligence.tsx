import { useState } from 'react'
import { getLfgIntelligence } from '@/services/ai'
import { Brain, Sparkles, AlertTriangle, TrendingUp, Lightbulb, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

export default function LfgIntelligence() {
  const [report, setReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await getLfgIntelligence()
      setReport(res.report)
      toast({ title: 'Análise LFG Intelligence gerada!' })
    } catch {
      toast({
        title: 'Erro ao gerar análise',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const insights = [
    {
      icon: AlertTriangle,
      title: 'Gargalos',
      desc: 'Identificação de etapas do funil com perdas significativas.',
    },
    {
      icon: TrendingDown || TrendingUp,
      title: 'Queda de Conversão',
      desc: 'Alertas sobre redução na taxa de conversão de leads e propostas.',
    },
    {
      icon: Lightbulb,
      title: 'Oportunidades de Venda',
      desc: 'Leads e pacientes prontos para nova abordagem comercial.',
    },
    {
      icon: Sparkles,
      title: 'Leads sem Follow-up',
      desc: 'Listagem de leads que não receberam retorno no prazo.',
    },
    {
      icon: TrendingUp,
      title: 'Desempenho da Equipe',
      desc: 'Análise comparativa de produção por profissional.',
    },
    {
      icon: Brain,
      title: 'Distância Meta vs Resultado',
      desc: 'Cálculo automático do gap entre meta e realizado.',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gradient-to-r from-[#3E2723] to-[#2D1B14] p-6 rounded-2xl shadow-elevation">
        <div>
          <h2 className="font-serif-title text-2xl font-bold text-[#FAF6F0] flex items-center gap-2">
            <Brain className="w-6 h-6 text-[#D4AF37]" /> LFG Intelligence
          </h2>
          <p className="text-xs text-[#EDE3D8]/80 mt-1">
            Inteligência artificial aplicada à gestão da clínica — metodologia LFG.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-terracotta-gold text-xs font-semibold"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" /> Gerar Análise IA
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight) => (
          <Card key={insight.title} className="card-warm">
            <CardContent className="pt-5">
              <insight.icon className="w-5 h-5 text-[#C66B4D] mb-2" />
              <h3 className="text-sm font-semibold text-[#2D1B14]">{insight.title}</h3>
              <p className="text-[11px] text-[#6B4F42] mt-1">{insight.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {report && (
        <Card className="card-warm border-[#D4AF37]/50 bg-gradient-to-br from-white to-[#FBF3DC]/30">
          <CardHeader className="border-b border-[#EDE3D8] pb-3">
            <CardTitle className="font-serif-title text-base text-[#2D1B14] flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#D4AF37]" /> Relatório & Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="p-4 bg-white border border-[#EDE3D8] rounded-xl text-xs text-[#2D1B14] whitespace-pre-wrap leading-relaxed">
              {report}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-[#6B4F42] text-center">
        ⚠️ A análise é gerada via Skip AI Gateway (modelo fast) com dados reais das coleções do
        PocketBase. Recomendações são sugestões e não substituem julgamento profissional.
      </p>
    </div>
  )
}
