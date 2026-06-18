// firestoreService.js
// Saves eligible candidates (score >= 60) to Firestore via REST API,
// then writes a row to Google Sheets via the Python backend (app.py).
//
// Since the React app runs in-browser, it calls Firestore REST directly.
// Google Sheets writing is handled by app.py which reads Firestore.
//
// If you want direct Sheets writing from the browser, use the Google Sheets
// REST API with a service-account OAuth token obtained server-side.

const FIREBASE_PROJECT_ID = 'r-interview-d4e63'; // ← your Firebase project ID
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/**
 * Convert a JS value to a Firestore REST field value.
 */
function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'object' && !Array.isArray(value)) {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])
        ),
      },
    };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue),
      },
    };
  }
  return { stringValue: String(value) };
}

/**
 * Save an eligible candidate document to Firestore.
 * Collection: eligible_candidates / doc: candidate email (safe slug)
 *
 * @param {Object} data - candidate profile + scores
 */
export async function saveEligibleCandidate(data) {
  const safeEmail = data.email.replace(/[^a-zA-Z0-9]/g, '_');

  // Build Firestore document fields
  const fields = {};
  const flatData = {
    name: data.name,
    email: data.email,
    role: data.role,
    education: data.education,
    skills: data.skills,
    experience: data.experience,
    existingDomain: data.existingDomain,
    domain: data.domain,
    overallScore: data.overallScore,
    technicalSkills: data.scores?.technicalSkills ?? 0,
    softSkills: data.scores?.softSkills ?? 0,
    problemSolving: data.scores?.problemSolving ?? 0,
    technicalQuote: data.scores?.technicalQuote ?? '',
    softSkillsQuote: data.scores?.softSkillsQuote ?? '',
    problemSolvingQuote: data.scores?.problemSolvingQuote ?? '',
    interviewDate: data.interviewDate,
    eligibleForF2F: true,
    savedAt: new Date().toISOString(),
  };

  for (const [key, val] of Object.entries(flatData)) {
    fields[key] = toFirestoreValue(val);
  }

  const url = `${FIRESTORE_BASE}/eligible_candidates/${safeEmail}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore save failed: ${response.status} — ${errText}`);
  }

  const result = await response.json();
  console.log('Candidate saved to Firestore:', result.name);

  // Optionally notify backend to sync to Google Sheets
  // (app.py exposes /api/sync_to_sheets if you add a Flask endpoint)
  // await notifyBackendToSync(data.email);

  return result;
}

/**
 * Fetch all eligible candidates from Firestore (for preview/debug).
 */
export async function fetchEligibleCandidates() {
  const url = `${FIRESTORE_BASE}/eligible_candidates`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const data = await response.json();

  const docs = data.documents || [];
  return docs.map((doc) => {
    const f = doc.fields || {};
    const get = (key) => {
      const v = f[key];
      if (!v) return null;
      return v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? null;
    };
    return {
      name: get('name'),
      email: get('email'),
      role: get('role'),
      domain: get('domain'),
      overallScore: Number(get('overallScore')),
      technicalSkills: Number(get('technicalSkills')),
      softSkills: Number(get('softSkills')),
      problemSolving: Number(get('problemSolving')),
      interviewDate: get('interviewDate'),
    };
  });
}
