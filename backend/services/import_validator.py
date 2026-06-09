import json
from anthropic import Anthropic
from config import get_settings

settings = get_settings()
client = Anthropic(api_key=settings.anthropic_api_key)

async def validate_import(columns_found: dict, sample_rows: list[dict]) -> dict:
  sample_json = json.dumps(sample_rows[:3], indent=2, ensure_ascii=False)

  prompt = f"""
Analiza esta importación de leads desde Excel.

Columnas detectadas en el Excel y su mapeo a campos internos:
{json.dumps(columns_found, indent=2, ensure_ascii=False)}

Primeros leads (sample):
{sample_json}

Tu tarea:
1. Verifica que el mapeo de columnas sea correcto
2. Identifica qué campos IMPORTANTES están faltando:
   - Para la empresa: website, city
   - Para el contacto: name, email, phone
3. Evalúa el porcentaje de completitud (0-100%)
4. Si faltan campos, sugiere qué se puede completar (website → búsqueda web, city → inferido de la empresa)

Responde en JSON con este formato exacto:
{{
  "mapping_correct": true/false,
  "missing_fields": ["website", "city"],
  "completeness_pct": 75,
  "can_enrich": true,
  "recommendations": "El 70% de empresas no tiene website. Se puede buscar en Google. Las ciudades se pueden inferir del contexto.",
  "issues": []
}}
"""

  message = client.messages.create(
    model="claude-3-5-haiku-20241022",
    max_tokens=500,
    messages=[
      {"role": "user", "content": prompt}
    ]
  )

  response_text = message.content[0].text
  try:
    result = json.loads(response_text)
  except:
    result = {
      "mapping_correct": True,
      "missing_fields": [],
      "completeness_pct": 50,
      "can_enrich": True,
      "recommendations": response_text,
      "issues": []
    }

  return result
