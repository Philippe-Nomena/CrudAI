import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Icônes SVG inline ────────────────────────────────────────────────────────
const IconBolt = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
  </svg>
);

const IconDownload = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconEye = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconTable = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
);

const IconLink = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// ─── Exemples de prompts ──────────────────────────────────────────────────────
const EXAMPLES = [
  "Un blog avec des Articles, des Auteurs et des Commentaires",
  "Une boutique e-commerce avec Produits, Catégories, Commandes et Clients",
  "Une app de gestion de tâches avec Projets, Tâches et Utilisateurs",
];

// ─── Composant : Schema Preview ───────────────────────────────────────────────
function SchemaPreview({ schema }) {
  const typeColors = {
    uuid: "#a78bfa",
    string: "#34d399",
    text: "#34d399",
    integer: "#fb923c",
    decimal: "#fb923c",
    boolean: "#f472b6",
    date: "#60a5fa",
    timestamp: "#60a5fa",
  };

  return (
    <div className="schema-preview">
      <div className="schema-header">
        <span className="schema-badge">
          <IconBolt /> Schéma généré
        </span>
        <span className="schema-project">{schema.projectName}</span>
      </div>

      <div className="entities-grid">
        {schema.entities.map((entity) => (
          <div key={entity.name} className="entity-card">
            <div className="entity-header">
              <IconTable />
              <span className="entity-name">{entity.name}</span>
              <span className="entity-table">→ {entity.tableName}</span>
            </div>

            <div className="fields-list">
              {entity.fields.map((field) => (
                <div key={field.name} className="field-row">
                  <span className="field-name">{field.name}</span>
                  <span
                    className="field-type"
                    style={{ color: typeColors[field.type] || "#94a3b8" }}
                  >
                    {field.type}
                  </span>
                  <div className="field-badges">
                    {field.primary && (
                      <span className="badge badge-pk">PK</span>
                    )}
                    {field.unique && <span className="badge badge-uq">UQ</span>}
                    {field.nullable === false && !field.primary && (
                      <span className="badge badge-nn">NN</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {entity.relations && entity.relations.length > 0 && (
              <div className="relations">
                {entity.relations.map((rel, i) => (
                  <div key={i} className="relation-row">
                    <IconLink />
                    <span>{rel.type}</span>
                    <span className="relation-entity">{rel.entity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App principale ───────────────────────────────────────────────────────────
export default function App() {
  const [description, setDescription] = useState("");
  const [schema, setSchema] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | previewing | generating | done | error
  const [errorMsg, setErrorMsg] = useState("");

  const handlePreview = async () => {
    if (!description.trim()) return;
    setStatus("previewing");
    setSchema(null);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/api/generate/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setSchema(data.schema);
      setStatus("done-preview");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setStatus("generating");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur serveur");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${schema?.projectName || "project"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("done-preview");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  const isLoading = status === "previewing" || status === "generating";

  return (
    <div className="app">
      {/* Fond animé */}
      <div className="bg-grid" />
      <div className="bg-glow" />

      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">
            <IconBolt />
          </span>
          <span className="logo-text">CrudAI</span>
        </div>
        <span className="logo-tagline">AI-powered REST API generator</span>
      </header>

      {/* Main */}
      <main className="main">
        <div className="hero">
          <h1 className="title">
            Décris ton projet,
            <br />
            <span className="title-accent">on génère le code.</span>
          </h1>
          <p className="subtitle">
            Transforme une description en langage naturel en une API REST
            Express complète avec PostgreSQL, prête à déployer.
          </p>
        </div>

        {/* Zone de saisie */}
        <div className="input-section">
          <div className="textarea-wrapper">
            <textarea
              className="textarea"
              placeholder="Ex: Un blog avec des Articles, des Auteurs et des Commentaires. Les articles ont un titre, un contenu et une date de publication..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={isLoading}
            />
            <div className="textarea-footer">
              <span className="char-count">
                {description.length} caractères
              </span>
            </div>
          </div>

          {/* Exemples rapides */}
          <div className="examples">
            <span className="examples-label">Essaie :</span>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                className="example-chip"
                onClick={() => setDescription(ex)}
                disabled={isLoading}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Boutons */}
          <div className="actions">
            <button
              className="btn btn-secondary"
              onClick={handlePreview}
              disabled={isLoading || !description.trim()}
            >
              {status === "previewing" ? (
                <span className="loading-dots">
                  Analyse<span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              ) : (
                <>
                  <IconEye /> Prévisualiser le schéma
                </>
              )}
            </button>

            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={isLoading || !description.trim()}
            >
              {status === "generating" ? (
                <span className="loading-dots">
                  Génération<span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              ) : (
                <>
                  <IconDownload /> Générer & Télécharger
                </>
              )}
            </button>
          </div>

          {/* Erreur */}
          {status === "error" && <div className="error-msg">⚠ {errorMsg}</div>}
        </div>

        {/* Schema Preview */}
        {schema && <SchemaPreview schema={schema} />}

        {/* Ce que tu obtiens */}
        {!schema && (
          <div className="features">
            <div className="feature">
              <span className="feature-icon">📁</span>
              <div>
                <strong>Projet complet</strong>
                <p>
                  Structure Express organisée avec config, modèles, controllers
                  et routes
                </p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🗄️</span>
              <div>
                <strong>Migrations SQL</strong>
                <p>
                  Fichiers SQL pour créer vos tables PostgreSQL avec les bonnes
                  contraintes
                </p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🔗</span>
              <div>
                <strong>Relations automatiques</strong>
                <p>
                  Les liaisons entre entités sont détectées et générées (FK,
                  jointures)
                </p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <div>
                <strong>Prêt en 30 secondes</strong>
                <p>
                  npm install && npm run dev — c'est tout ce qu'il faut pour
                  démarrer
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
