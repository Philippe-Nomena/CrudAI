import Groq from "groq-sdk";
import "dotenv/config";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un expert en conception de bases de données et d'APIs REST.

Tu dois répondre **uniquement** avec un objet JSON valide, sans aucun texte avant ou après, sans \`\`\`json, sans explications, sans commentaires.

Le JSON doit respecter exactement cette structure :

{
  "projectName": "nomDuProjetEnCamelCaseOuSnakeCase",
  "entities": [
    {
      "name": "NomDeLEntite",
      "tableName": "nom_de_l_entite",
      "fields": [
        {
          "name": "nomDuChamp",
          "type": "uuid | string | text | integer | decimal | boolean | date | timestamp",
          "primary": boolean,
          "nullable": boolean,
          "unique": boolean
        }
      ],
      "relations": [
        {
          "type": "belongsTo",
          "entity": "NomAutreEntite",
          "foreignKey": "nom_autre_entite_id"
        }
      ]
    }
  ]
}

Réponds toujours avec un JSON valide.`;

function extractJSON(text) {
  let cleaned = text.trim();

  // Supprime les blocs markdown ```json ... ```
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1");

  // Trouve le premier { et le dernier }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    console.error("Texte reçu :", cleaned.substring(0, 300));
    throw new Error("Aucun objet JSON valide trouvé dans la réponse du modèle");
  }

  let jsonStr = cleaned.substring(start, end + 1);

  // Nettoyage supplémentaire
  jsonStr = jsonStr.replace(/\/\/.*$/gm, ""); // commentaires sur une ligne
  jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, ""); // commentaires multi-lignes

  try {
    const parsed = JSON.parse(jsonStr);
    console.log("✅ JSON parsé avec succès");
    return parsed;
  } catch (e) {
    console.error("❌ Erreur de parsing JSON. Texte extrait :");
    console.error(
      jsonStr.substring(0, 600) + (jsonStr.length > 600 ? "..." : ""),
    );
    throw new Error(`Impossible de parser le JSON : ${e.message}`);
  }
}

async function parseEntitiesWithClaude(userDescription) {
  if (!userDescription || userDescription.trim() === "") {
    throw new Error("La description du projet est vide.");
  }

  console.log("🤖 Analyse de la description avec Groq + Llama-3.3-70b...");

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Voici la description du projet à analyser :\n\n${userDescription}\n\nGénère le JSON correspondant. Réponds UNIQUEMENT avec le JSON.`,
      },
    ],
    temperature: 0.1, // plus bas = plus déterministe
    response_format: { type: "json_object" }, // très important !
  });

  const rawText = response.choices[0].message.content.trim();

  if (!rawText) {
    throw new Error("Le modèle n'a retourné aucun contenu.");
  }

  return extractJSON(rawText);
}

export { parseEntitiesWithClaude };
