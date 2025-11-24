// ai.js — Generador de descripciones (recibe apiKey para multi-device)
export async function generarDescripcionIA(apiKey, nombre, categoria) {
  if (!apiKey) throw new Error("No hay API Key configurada.");

  const prompt = `
Genera una descripción profesional, clara y atractiva para un catálogo.
Nombre del producto: ${nombre}
Categoría: ${categoria}
Máximo 2-3 oraciones. Estilo vendedor latinoamericano.
  `;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 160
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error("OpenAI error: " + text);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

