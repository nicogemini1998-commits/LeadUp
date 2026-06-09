from __future__ import annotations
import logging
from config import get_settings

logger = logging.getLogger(__name__)

# ── Flip to False when ready to use real Claude credits ─────────────────────
MOCK_MODE = False

# ---------------------------------------------------------------------------

async def generate_sales_report(company: dict, contact: dict | None) -> str:
    """
    Generate a full sales intelligence report for the given company.
    MOCK_MODE=True → returns a realistic template without calling Claude API.
    MOCK_MODE=False → calls Claude Sonnet with full context.
    """
    if MOCK_MODE:
        return _mock_report(company, contact)

    return await _claude_report(company, contact)


# ---------------------------------------------------------------------------
# Mock report — realistic template, zero credits
# ---------------------------------------------------------------------------

def _mock_report(company: dict, contact: dict | None) -> str:
    name = company.get("name", "la empresa")
    city = company.get("city", "España")
    score = company.get("digital_score", 30)
    opp = company.get("opportunity_level", "media")
    contact_name = contact.get("name", "el decisor") if contact else "el decisor"
    contact_title = contact.get("title", "Gerente") if contact else "Gerente"

    weaknesses = []
    if not company.get("redes_sociales"): weaknesses.append("presencia en redes sociales")
    if not company.get("captacion_leads"): weaknesses.append("sistema de captación de leads online")
    if not company.get("email_marketing"): weaknesses.append("email marketing / CRM")
    if not company.get("seo_info"): weaknesses.append("posicionamiento SEO")
    if not company.get("video_contenido"): weaknesses.append("contenido en vídeo")
    if not weaknesses:
        weaknesses = ["automatización avanzada de procesos comerciales"]

    weak_str = ", ".join(weaknesses[:3])

    return f"""# Informe de Inteligencia Comercial
## {name} — {city}

---

### 1. DIAGNÓSTICO DE SITUACIÓN ACTUAL

**Score Digital: {score}/100** — Nivel {"bajo" if score < 35 else "medio" if score < 65 else "alto"}

{name} es una empresa del sector construcción/reformas en {city} con una presencia digital {"prácticamente inexistente" if score < 35 else "limitada y por debajo del potencial del sector" if score < 65 else "por encima de la media del sector pero con margen de mejora significativo"}. Su puntuación de {score}/100 la sitúa {"en el 30% inferior" if score < 35 else "en la media baja" if score < 65 else "en el tercio superior"} del sector en España.

**Carencias detectadas:** {weak_str}.

Esta situación es habitual en empresas de su perfil: buenas en el oficio pero sin estructura comercial digital que les permita escalar y competir con cadenas y franquicias que sí invierten en captación online.

---

### 2. DOLORES PRINCIPALES

1. **Dependencia del boca a boca** — Sin canales digitales activos, su flujo de clientes depende 100% de referencias. Cuando el mercado se contrae o un cliente grande desaparece, no tienen red de captación alternativa.

2. **Pérdida de presupuestos frente a competidores digitalizados** — Clientes que buscan en Google encuentran primero a competidores con web optimizada, reseñas y anuncios. {name} llega tarde o no llega.

3. **Incapacidad para demostrar valor antes de la reunión** — Sin vídeos, casos de éxito ni presencia en redes, el decisor no puede "pre-vender" a su empresa antes de que llegue el presupuesto.

4. **Sin sistema de seguimiento de leads** — Presupuestos enviados que caen en el vacío. Sin CRM ni automatización, se pierden oportunidades que ya costaron tiempo y recursos.

5. **Visibilidad local deficiente** — Competidores con SEO local aparecen en los primeros resultados cuando alguien busca "{company.get("industry", "reformas")} en {city}".

---

### 3. ESTRATEGIA DE ATAQUE

**Apertura recomendada para {contact_name} ({contact_title}):**

Arrancar con el número concreto: *"En empresas como la vuestra con un score digital de {score}/100, nuestros clientes aumentan un 40% la captación de presupuestos en los primeros 90 días. ¿Cuántos presupuestos estáis enviando al mes que no se convierten?"*

**Secuencia de conversación:**
1. Ancla el dolor (presupuestos perdidos, dependencia del boca a boca)
2. Muestra un caso real del sector en {city} o zona
3. Presenta el Score Digital como diagnóstico objetivo (no opinión)
4. Propón una auditoría gratuita de 30 minutos
5. Cierra en agenda, no en precio

---

### 4. ARGUMENTARIO DE VENTAS

**Por qué AHORA es el momento:**
- El sector reformas en España crece un 12% YoY pero la captación online sigue siendo el cuello de botella principal
- Sus competidores más ágiles están digitalizándose ahora — cada mes que pasa amplía la brecha
- La IA está cambiando cómo los clientes buscan y contratan reformas — quien llegue tarde pierde cuota permanentemente

**Propuesta de valor para {name}:**
- Sistema de captación de leads cualificados (no tráfico, leads)
- Automatización del seguimiento de presupuestos (+30% tasa de cierre)
- Posicionamiento local en {city} para búsquedas de alta intención
- Vídeos de obra que venden antes de la primera reunión
- Dashboard de negocio en tiempo real

**ROI proyectado:** Con 3 contratos adicionales/mes a ticket medio de 8.000€, el sistema se paga en el primer mes. El coste de NO hacer nada es seguir perdiendo esos contratos.

---

### 5. GESTIÓN DE OBJECIONES

| Objeción | Respuesta |
|---|---|
| *"Ya tenemos web"* | "Tener web y tener un sistema de captación son cosas distintas. ¿Cuántos leads os genera vuestra web al mes?" |
| *"No tenemos presupuesto"* | "Entiendo. ¿Cuánto os cuesta un contrato perdido? Si recuperamos 2 al mes, el ROI es inmediato." |
| *"Lo hemos intentado y no funciona"* | "¿Con qué agencia? El sector construcción tiene particularidades que agencias generalistas no conocen." |
| *"No tenemos tiempo para esto"* | "Por eso lo gestionamos nosotros. Vuestro tiempo es para la obra, el nuestro para traeros clientes." |
| *"Nos llegan clientes por recomendación"* | "Perfecto. ¿Qué pasaría si pudieseis doblar eso con un canal digital paralelo?" |

---

### 6. PRÓXIMOS PASOS RECOMENDADOS

1. **Esta semana:** Llamada de 20 minutos con {contact_name} — presentar el diagnóstico digital (el score de {score}/100 es tu puerta de entrada)
2. **Semana 2:** Auditoría gratuita — 3 acciones concretas que pueden implementar solos
3. **Semana 3:** Propuesta económica personalizada con proyección de ROI a 6 meses
4. **Cierre:** Piloto de 3 meses con KPIs acordados (leads generados, presupuestos enviados, tasa de conversión)

---

*⚠️ Informe generado en modo demo — activa Claude Sonnet para análisis personalizado con datos reales de la empresa.*
"""


# ---------------------------------------------------------------------------
# Real Claude report — only called when MOCK_MODE = False
# ---------------------------------------------------------------------------

async def _claude_report(company: dict, contact: dict | None) -> str:
    import anthropic
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY no configurada — contacta con el administrador")

    contact_info = ""
    if contact:
        contact_info = f"""
**Decisor identificado:**
- Nombre: {contact.get('name', 'No disponible')}
- Cargo: {contact.get('title', 'No disponible')}
- Email: {contact.get('email', 'No disponible')}
- Teléfono: {"Revelado: " + contact.get('phone') if contact.get('phone_revealed') else f"Prefijo: {contact.get('phone_prefix', 'N/A')}XX (no revelado)"}
"""

    digital_signals = f"""
- Redes sociales: {"Activo" if company.get("redes_sociales") else "No detectado"}
- Captación leads online: {"Activo" if company.get("captacion_leads") else "No detectado"}
- Email marketing / CRM: {"Activo" if company.get("email_marketing") else "No detectado"}
- SEO: {"Activo" if company.get("seo_info") else "No detectado"}
- Contenido en vídeo: {"Activo" if company.get("video_contenido") else "No detectado"}
- Score digital: {company.get("digital_score", 0)}/100
- Nivel oportunidad: {company.get("opportunity_level", "media")}
"""

    prompt = f"""Eres el mejor estratega comercial de España especializado en vender servicios de marketing digital y transformación digital a empresas de construcción y reformas.

Genera un informe de inteligencia comercial completo y accionable para que un comercial pueda cerrar a esta empresa.

**EMPRESA:**
- Nombre: {company.get("name")}
- Ciudad: {company.get("city")}
- Web: {company.get("website", "Sin web")}
- Industria: {company.get("industry", "Construcción / Reformas")}
{contact_info}

**DIAGNÓSTICO DIGITAL:**
{digital_signals}

**Análisis previo:** {company.get("opportunity_analysis", "N/A")}

**ESTRUCTURA DEL INFORME** (usa exactamente estas 7 secciones con markdown):

1. DIAGNÓSTICO DE SITUACIÓN ACTUAL — qué tiene y qué le falta, por qué su score es el que es
2. DOLORES PRINCIPALES — mínimo 5 dolores específicos y reales para este perfil de empresa en España
3. ESTRATEGIA DE ATAQUE — cómo abrir la conversación con el decisor, qué decir en los primeros 30 segundos
4. ARGUMENTARIO DE VENTAS — por qué AHORA, propuesta de valor concreta, ROI estimado
5. GESTIÓN DE OBJECIONES — tabla con las 5 objeciones más comunes y la respuesta exacta a cada una
6. FRASES DE CIERRE — 3 frases específicas para cerrar la venta con este perfil
7. PRÓXIMOS PASOS — secuencia de acciones concretas para la semana

Sé extremadamente específico y accionable. No uses genéricos. Adapta todo a la realidad de una empresa de construcción/reformas en {company.get("city", "España")} con score digital de {company.get("digital_score", 30)}/100.
"""

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
