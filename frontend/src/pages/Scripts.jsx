import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/NavBar'

const SCRIPTS = [
  {
    category: 'Apertura de Llamada',
    icon: '📞',
    color: 'text-blue-400',
    border: 'border-blue-400/20',
    bg: 'bg-blue-400/5',
    items: [
      {
        title: 'Apertura directa con nombre',
        body: `Hola [NOMBRE], buenos días. Te llamo de [YOUR COMPANY], somos una agencia especializada en marketing digital para empresas del sector construcción y reformas. Te llamo porque he estado viendo [EMPRESA] y creo que tenemos algo concreto que puede interesarte. ¿Tienes dos minutos?`,
      },
      {
        title: 'Apertura con gancho digital',
        body: `Buenos días, [NOMBRE]. Te llamo de [YOUR COMPANY]. He revisado la presencia digital de [EMPRESA] y he detectado un par de cosas que podrían estar costándoos clientes cada mes. ¿Te puedo comentar en un momento lo que he visto?`,
      },
      {
        title: 'Apertura por referencia sectorial',
        body: `Hola [NOMBRE], soy [TU NOMBRE] de [YOUR COMPANY]. Trabajamos con varias empresas de construcción en [CIUDAD] y les estamos ayudando a captar clientes por internet de forma automática. Quería comentarte cómo lo estamos haciendo por si encaja con lo que necesitáis. ¿Ahora es buen momento?`,
      },
    ],
  },
  {
    category: 'Manejo de Objeciones',
    icon: '🛡️',
    color: 'text-amber-400',
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/5',
    items: [
      {
        title: '"No me interesa" / "Ya tenemos"',
        body: `Entiendo perfectamente, [NOMBRE]. La mayoría de los clientes con los que hablo me dicen lo mismo antes de ver los números. Lo que hacemos es diferente a lo que probablemente habéis tenido antes: trabajamos solo con resultados medibles. ¿Puedo preguntarte qué estáis haciendo ahora para captar clientes nuevos?`,
      },
      {
        title: '"Mándame información por email"',
        body: `Claro, te la mando ahora mismo. Pero antes de hacerlo, para que lo que te envíe sea útil y no genérico, ¿me puedes decir cuál es vuestra mayor fuente de clientes ahora mismo? Así te mando algo que de verdad aplique a tu caso.`,
      },
      {
        title: '"No tenemos presupuesto"',
        body: `Te entiendo, [NOMBRE], y precisamente por eso te llamo. Lo que hacemos no es un gasto, es una inversión con retorno medible. Antes de hablar de precio, ¿me dejas mostrarte con números lo que otros clientes del sector están obteniendo? Si no tiene sentido para vosotros, te lo digo directamente.`,
      },
      {
        title: '"Estamos muy ocupados ahora"',
        body: `Claro, sé que en construcción hay temporadas muy intensas. Por eso te propongo algo rápido: una llamada de 20 minutos cuando mejor os venga, sin compromiso. ¿La semana que viene, martes o jueves, a qué hora os viene mejor?`,
      },
    ],
  },
  {
    category: 'Cierre y Siguiente Paso',
    icon: '🎯',
    color: 'text-emerald-400',
    border: 'border-emerald-400/20',
    bg: 'bg-emerald-400/5',
    items: [
      {
        title: 'Cierre con reunión concreta',
        body: `[NOMBRE], lo que te he comentado tiene sentido para vosotros. Lo que propongo es esto: hacemos una videollamada de 30 minutos donde os presentamos el análisis de vuestra situación digital y lo que haríamos específicamente para [EMPRESA]. Sin rodeos. ¿Te va el [DÍA] a las [HORA]?`,
      },
      {
        title: 'Cierre suave (seguimiento)',
        body: `Perfecto [NOMBRE], no te quiero entretener más. Te mando un resumen de lo que hemos hablado y te propongo una fecha para la semana que viene. Si en algún momento antes de eso quieres ver algo concreto, me escribes directamente al WhatsApp. ¿Te parece?`,
      },
      {
        title: 'Cierre con urgencia real',
        body: `[NOMBRE], te comento algo: ahora mismo en [CIUDAD] estamos trabajando con [X] empresas del sector, y por política no trabajamos con más de dos competidores directos en la misma zona. Si esto os interesa, lo ideal sería confirmarlo esta semana. ¿Cuándo podemos hacer la llamada?`,
      },
    ],
  },
  {
    category: 'WhatsApp — Primer Mensaje',
    icon: '💬',
    color: 'text-green-400',
    border: 'border-green-400/20',
    bg: 'bg-green-400/5',
    items: [
      {
        title: 'Primer contacto WhatsApp (corto)',
        body: `Hola [NOMBRE] 👋 Soy [TU NOMBRE] de [YOUR COMPANY]. Te he intentado llamar antes. Trabajamos con empresas de construcción y reformas en España ayudándoles a captar más clientes por internet. ¿Tienes 5 minutos esta semana para una llamada rápida?`,
      },
      {
        title: 'WhatsApp post no-respuesta',
        body: `Hola [NOMBRE], te he llamado un par de veces sin poder contactarte. Te dejo este mensaje para no molestarte más por teléfono. Si en algún momento quieres saber cómo estamos ayudando a otras empresas de [SECTOR] en [CIUDAD] a captar clientes digitalmente, aquí me tienes. Un saludo 👍`,
      },
      {
        title: 'WhatsApp con valor concreto',
        body: `Hola [NOMBRE] 👋 Te escribo de [YOUR COMPANY]. He analizado la presencia online de [EMPRESA] y he encontrado [X] que podría mejorar directamente vuestra captación de presupuestos. ¿Te interesa que te lo cuente en una llamada esta semana?`,
      },
    ],
  },
]

function CopyIcon({ copied }) {
  if (copied) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-emerald-400">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function ScriptCard({ script }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(script.body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4 hover:border-accent/20 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-sm font-bold text-white leading-tight">{script.title}</h4>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex-shrink-0
            ${copied
              ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
              : 'text-slate-400 bg-surface-raised border-surface-border hover:text-white hover:border-slate-500'
            }`}
        >
          <CopyIcon copied={copied} />
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line font-mono text-xs bg-surface-raised border border-surface-border rounded-lg px-3 py-3">
        {script.body}
      </p>
    </div>
  )
}


export default function Scripts() {
  const { user, isAdmin, logout } = useAuth()
  const [activeCategory, setActiveCategory] = useState(null)

  const visible = activeCategory
    ? SCRIPTS.filter((s) => s.category === activeCategory)
    : SCRIPTS

  return (
    <>
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Biblioteca de Scripts</h1>
          <p className="text-sm text-slate-400 mt-0.5">Guiones de venta para el sector construcción · haz clic en Copiar y úsalos directamente</p>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${!activeCategory ? 'bg-accent text-white border-accent' : 'text-slate-400 border-surface-border hover:text-white hover:border-slate-500'}`}
          >
            Todos
          </button>
          {SCRIPTS.map((s) => (
            <button
              key={s.category}
              onClick={() => setActiveCategory(activeCategory === s.category ? null : s.category)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5
                ${activeCategory === s.category ? 'bg-accent text-white border-accent' : `${s.color} border-current/30 hover:border-current/60 bg-transparent`}`}
            >
              <span>{s.icon}</span>
              {s.category}
            </button>
          ))}
        </div>

        {/* Script sections */}
        <div className="space-y-8">
          {visible.map((section) => (
            <section key={section.category}>
              <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl border ${section.border} ${section.bg}`}>
                <span className="text-xl">{section.icon}</span>
                <h2 className={`text-sm font-black uppercase tracking-wider ${section.color}`}>
                  {section.category}
                </h2>
                <span className="text-xs text-slate-600 ml-auto">{section.items.length} scripts</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.items.map((script) => (
                  <ScriptCard key={script.title} script={script} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
