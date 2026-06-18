// cohereService.js — Cohere Chat API v2 (messages format)
// Model: command-r-08-2024 (stable, available on free tier)

const COHERE_API_URL = "https://api.cohere.ai/v2/chat";
const MODEL = "command-r-08-2024";

// ─── API Key ──────────────────────────────────────────────────────────────────
const getApiKey = () => {
  const key =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_COHERE_API_KEY) ||
    (typeof process !== "undefined" && process.env?.VITE_COHERE_API_KEY) ||
    null;
  if (!key) throw new Error("Cohere API key not found. Set VITE_COHERE_API_KEY in .env");
  return key;
};

// ─── State ────────────────────────────────────────────────────────────────────
let askedTopics = new Set();
let askedQuestions = new Set();

export const resetTopics = () => {
  askedTopics.clear();
  askedQuestions.clear();
};

// ─── Phase logic ──────────────────────────────────────────────────────────────
const getPhase = (conversationHistory) => {
  if (!conversationHistory) return "intro";
  const lines = conversationHistory.split("\n").filter((l) => l.trim()).length;
  if (lines <= 2) return "behavioral";
  if (lines <= 6) return "technical";
  return "situational";
};

const phasePrompts = {
  intro:       "Ask a simple, friendly question about their background or interests.",
  behavioral:  "Ask a very easy question — one sentence, no jargon, something any beginner could answer.",
  technical:   "Ask the simplest possible question about a well-known concept. Avoid edge cases or advanced details.",
  situational: "Ask what they would do in a simple, everyday scenario. Keep it short and stress-free.",
};

// ─── Domain question angle banks ──────────────────────────────────────────────
const DOMAIN_QUESTION_ANGLES = {
  "Artificial Intelligence": [
    "bias and fairness in ML models","overfitting vs underfitting tradeoffs",
    "transformer architecture internals","reinforcement learning challenges",
    "explainability in production AI","data pipeline design for ML",
    "model evaluation metrics beyond accuracy","deploying ML models at scale",
    "feature engineering strategies","handling imbalanced datasets",
    "transfer learning use cases","ethics in AI decision making",
  ],
  "Web Development": [
    "state management patterns","performance optimization techniques",
    "accessibility and WCAG compliance","micro-frontend architecture",
    "API design and versioning","caching strategies on the frontend",
    "browser rendering pipeline","security: XSS, CSRF, CSP",
    "progressive web apps","testing strategies: unit vs e2e",
    "server-side rendering vs CSR","Core Web Vitals and performance metrics",
  ],
  "Data Science": [
    "experiment design and A/B testing","statistical significance and p-values",
    "handling missing data","feature selection methods",
    "time-series forecasting challenges","communicating insights to non-technical stakeholders",
    "data cleaning pitfalls","choosing the right visualization",
    "Bayesian vs frequentist approaches","reproducible pipelines",
    "dimensionality reduction","production deployment of data models",
  ],
  "Cybersecurity": [
    "zero-trust architecture","incident response playbooks",
    "penetration testing methodologies","social engineering attacks",
    "cryptography fundamentals","OWASP top 10 vulnerabilities",
    "network packet analysis","threat modelling frameworks",
    "identity and access management","secure SDLC",
    "ransomware mitigation","blue team vs red team exercises",
  ],
  "Cloud Computing": [
    "multi-cloud vs hybrid cloud tradeoffs","serverless architecture patterns",
    "cloud cost optimization","Kubernetes orchestration challenges",
    "disaster recovery and RTO/RPO","cloud-native security",
    "service mesh and microservices","auto-scaling design patterns",
    "infrastructure as code","cloud migration strategies",
    "data sovereignty and compliance","observability in distributed systems",
  ],
  "Mobile Development": [
    "cross-platform vs native tradeoffs","offline-first architecture",
    "push notification design","battery and memory optimisation",
    "app store rejection handling","deep linking and universal links",
    "mobile security best practices","UI performance on low-end devices",
    "state management in mobile apps","biometric authentication",
    "handling different screen sizes","crash reporting and analytics",
  ],
  "DevOps": [
    "CI/CD pipeline design","GitOps principles",
    "blue-green vs canary deployments","on-call culture and SLAs",
    "chaos engineering","container security hardening",
    "log aggregation and alerting","shift-left testing",
    "infrastructure drift detection","secrets management",
    "deployment rollback strategies","SRE error budgets",
  ],
  "Blockchain": [
    "consensus mechanism tradeoffs","smart contract security vulnerabilities",
    "scalability trilemma","gas optimisation",
    "DeFi protocol design","NFT metadata storage",
    "private vs public blockchain","cross-chain interoperability",
    "zero-knowledge proofs","DAO governance models",
    "wallet key management","on-chain vs off-chain data",
  ],
  "Game Development": [
    "game loop and delta time","physics engine integration",
    "procedural content generation","multiplayer netcode and lag compensation",
    "level of detail (LOD) techniques","game economy design",
    "pathfinding algorithms","shader programming",
    "save system architecture","asset loading and memory budgets",
    "player retention analytics","platform-specific input handling",
  ],
  "Embedded Systems": [
    "RTOS design","interrupt handling and priorities",
    "memory constraints and optimisation","communication protocols: I2C, SPI, UART",
    "power management techniques","bootloader design",
    "hardware-in-the-loop testing","OTA firmware updates",
    "watchdog timers and fault tolerance","debugging without a debugger",
    "embedded security","bit manipulation tricks",
  ],
};

function getRandomAngle(domain) {
  const angles = DOMAIN_QUESTION_ANGLES[domain] || [
    "best practices","real-world challenges","architecture decisions",
    "performance tradeoffs","debugging","team collaboration","lessons from failures",
  ];
  const unused = angles.filter((a) => !askedTopics.has(a));
  const pool = unused.length > 0 ? unused : angles;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Core Chat API helper (v2 messages format) ────────────────────────────────
const callCohere = async (systemPrompt, userMessage, { maxTokens = 300, temperature = 0.6 } = {}) => {
  const response = await fetch(COHERE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system",    content: systemPrompt },
        { role: "user",      content: userMessage  },
      ],
      max_tokens:        maxTokens,
      temperature:       temperature,
      frequency_penalty: 0.6,
      presence_penalty:  0.6,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cohere API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  // v2 Chat API: data.message.content[0].text
  return (data?.message?.content?.[0]?.text || "").trim();
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function simpleHash(str) {
  return str.toLowerCase().split(/\s+/).slice(0, 8).join(" ");
}
function isDuplicate(question) {
  const hash = simpleHash(question);
  if (askedQuestions.has(hash)) return true;
  askedQuestions.add(hash);
  return false;
}

const fallbackTemplates = [
  (d, a) => `Can you explain what ${a} means to you in simple terms?`,
  (d, a) => `Have you heard of ${a} in ${d}? What do you know about it?`,
  (d, a) => `In ${d}, what is the basic idea behind ${a}?`,
  (d, a) => `How would you describe ${a} to someone who is just starting out in ${d}?`,
  (d, a) => `What comes to mind when you hear the term "${a}" in ${d}?`,
];
let fallbackIndex = 0;
function generateDynamicFallbackQuestion(domain, angle) {
  const t = fallbackTemplates[fallbackIndex % fallbackTemplates.length];
  fallbackIndex++;
  return t(domain, angle || "best practices");
}

// ─── Retry with dedup ─────────────────────────────────────────────────────────
const generateWithRetry = async (systemPrompt, userMsgFn, domain, angle, maxAttempts = 3) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rawText = await callCohere(systemPrompt, userMsgFn(attempt));
    const question = rawText.split("\n")[0].trim();
    if (question.length > 20 && !isDuplicate(question)) return question;
  }
  return null;
};

// ─── Resume context builder ───────────────────────────────────────────────────
function buildResumeContext(resumeText, candidateProfile) {
  if (!candidateProfile) return resumeText ? `Resume:\n${resumeText.slice(0, 1500)}` : "";
  return `Candidate: ${candidateProfile.name}
Role: ${candidateProfile.role}
Domain: ${candidateProfile.existingDomain}
Experience: ${candidateProfile.experience}
Education: ${candidateProfile.education}
Skills: ${candidateProfile.skills}${resumeText ? `\nResume:\n${resumeText.slice(0, 1200)}` : ""}`;
}

// ─── Fixed greeting ───────────────────────────────────────────────────────────
function buildFixedGreeting(candidateProfile, domain) {
  const name   = candidateProfile?.name || "there";
  const role   = candidateProfile?.role || `${domain} professional`;
  const skills = candidateProfile?.skills
    ? candidateProfile.skills.split(",").slice(0, 2).map((s) => s.trim()).join(" and ")
    : "your background";
  return `Hello ${name}! Welcome to your AI mock interview for the ${role} position. I've reviewed your profile and I'm impressed by your experience with ${skills}. Let's get started — here's my first question:`;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const generateInterviewQuestion = async (domain, resumeText, conversationHistory, candidateProfile) => {
  const resumeContext = buildResumeContext(resumeText, candidateProfile);
  const angle = getRandomAngle(domain);

  if (!conversationHistory) {
    const greeting = buildFixedGreeting(candidateProfile, domain);
    try {
      const q = await generateWithRetry(
        `You are a friendly interviewer for a ${domain} role.\n${resumeContext}`,
        (attempt) =>
          `Write ONE very easy opening interview question about "${angle}" in ${domain}. It must be understandable by a complete beginner — no jargon, no sub-parts, one short sentence only.${attempt > 0 ? ` (Attempt ${attempt + 1}: use a completely different opening word.)` : ""}`,
        domain, angle
      );
      if (q) { askedTopics.add(angle); return `${greeting}\n\n${q}`; }
    } catch (e) { console.error("generateInterviewQuestion error:", e); }
    askedTopics.add(angle);
    return `${greeting}\n\n${generateDynamicFallbackQuestion(domain, angle)}`;
  }

  const phase = getPhase(conversationHistory);
  try {
    const q = await generateWithRetry(
      `You are a friendly, encouraging interviewer for a ${domain} role.\n${resumeContext}`,
      (attempt) =>
        `Interview so far:\n${conversationHistory}\n\nPhase: ${phase} — ${phasePrompts[phase]}\nREQUIRED angle: "${angle}". Do NOT repeat these topics: ${Array.from(askedTopics).join(", ") || "none"}.\nWrite ONE very simple question about "${angle}" that a beginner could answer with basic knowledge. One sentence, no jargon, no complex scenarios.${attempt > 0 ? ` (Attempt ${attempt + 1}: start with a different word.)` : ""}`,
      domain, angle
    );
    if (q) { askedTopics.add(angle); return q; }
  } catch (e) { console.error("generateInterviewQuestion error:", e); }
  askedTopics.add(angle);
  return generateDynamicFallbackQuestion(domain, angle);
};

export const generateFollowUpQuestion = async (domain, resumeText, conversationHistory, candidateProfile) => {
  const resumeContext = buildResumeContext(resumeText, candidateProfile);
  const angle = getRandomAngle(domain);
  const phase = getPhase(conversationHistory);

  try {
    const q = await generateWithRetry(
      `You are a friendly AI interviewer for a ${domain} role.\n${resumeContext}`,
      (attempt) =>
        `Conversation:\n${conversationHistory}\n\nPhase: ${phase} — ${phasePrompts[phase]}\nNew angle: "${angle}". Do NOT repeat: ${Array.from(askedTopics).join(", ") || "none"}.\nFormat: [One short sentence acknowledging what they said]. [A very easy, one-sentence question about "${angle}" — suitable for a complete beginner, no jargon].\nNever say "Great answer!" or generic praise.${attempt > 0 ? ` (Attempt ${attempt + 1}: different phrasing.)` : ""}`,
      domain, angle
    );
    if (q) { askedTopics.add(angle); return q; }
  } catch (e) { console.error("generateFollowUpQuestion error:", e); }
  askedTopics.add(angle);
  return generateDynamicFallbackQuestion(domain, angle);
};

export const generateTechnicalQuestion = async (domain, resumeText, conversationHistory, candidateProfile) => {
  const resumeContext = buildResumeContext(resumeText, candidateProfile);
  const angle = getRandomAngle(domain);
  const phase = getPhase(conversationHistory);

  try {
    const q = await generateWithRetry(
      `You are a supportive interviewer for a ${domain} position.\n${resumeContext}`,
      (attempt) =>
        `Conversation:\n${conversationHistory}\n\nPhase: ${phase} — ${phasePrompts[phase]}\nAngle: "${angle}". Do NOT repeat: ${Array.from(askedTopics).join(", ") || "none"}.\nFormat: [One short sentence about their last answer]. [A very easy question about "${angle}" that any beginner would understand — one sentence, basic concepts only, no edge cases].\nOne question only.${attempt > 0 ? ` (Attempt ${attempt + 1}: new phrasing.)` : ""}`,
      domain, angle
    );
    if (q) { askedTopics.add(angle); return q; }
  } catch (e) { console.error("generateTechnicalQuestion error:", e); }
  askedTopics.add(angle);
  return generateDynamicFallbackQuestion(domain, angle);
};

export const generateScores = async (conversationHistory, domain) => {
  try {
    const text = await callCohere(
      `You are an expert interview evaluator for ${domain}. Respond ONLY with valid JSON — no markdown, no explanation.`,
      `Interview:\n${conversationHistory}\n\nScore 0-100 for: technicalSkills, softSkills, problemSolving.\nPick one short quote (under 20 words) from the candidate per category.\n\nReturn exactly:\n{"technicalSkills":75,"softSkills":80,"problemSolving":70,"technicalQuote":"...","softSkillsQuote":"...","problemSolvingQuote":"..."}`,
      { maxTokens: 400, temperature: 0.2 }
    );
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No JSON in response");
  } catch (e) {
    console.error("generateScores error:", e);
    return { technicalSkills: 70, softSkills: 70, problemSolving: 70, technicalQuote: null, softSkillsQuote: null, problemSolvingQuote: null };
  }
};