const express = require("express");
const router = express.Router();
const { parseEntitiesWithClaude } = require("../services/llmService");
const { generateProject } = require("../services/generatorService");

// POST /api/generate
router.post("/", async (req, res) => {
  const { description } = req.body;

  if (!description || description.trim() === "") {
    return res.status(400).json({ error: "La description est requise." });
  }

  try {
    console.log("🤖 Analyse de la description avec Groq...");
    const schema = await parseEntitiesWithClaude(description);
    console.log("✅ Schema généré :", JSON.stringify(schema, null, 2));

    console.log("⚙️ Génération du projet ZIP...");
    const zipBuffer = await generateProject(schema);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${schema.projectName}.zip"`,
    );
    res.send(zipBuffer);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    res.status(500).json({
      error: "Erreur lors de la génération du projet.",
      detail: err.message,
    });
  }
});

// POST /api/generate/preview
router.post("/preview", async (req, res) => {
  const { description } = req.body;

  if (!description || description.trim() === "") {
    return res.status(400).json({ error: "La description est requise." });
  }

  try {
    const schema = await parseEntitiesWithClaude(description);
    res.json({ success: true, schema });
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    res.status(500).json({
      error: "Erreur lors de l'analyse.",
      detail: err.message,
    });
  }
});

module.exports = router;
