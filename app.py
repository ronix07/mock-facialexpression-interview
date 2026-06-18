"""
DUALPREP — Recruiter Dashboard  (app_enhanced.py)
===================================================
Enhanced UI version with premium dark-mode aesthetics.
All original functionality retained; only styles/layout improved.
"""

import streamlit as st
import os
import re
import time
import cv2
import numpy as np
from deepface import DeepFace
import firebase_admin
from firebase_admin import credentials, firestore
import cohere
import base64
import pandas as pd
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from PIL import Image
import pyautogui
from datetime import datetime
import plotly.graph_objects as go
import plotly.express as px
import pytz
import traceback

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# ─── Cohere ───────────────────────────────────────────────────────────────────
COHERE_API_KEY = os.environ.get("COHERE_API_KEY", "")
COHERE_MODEL = "command-r-plus-08-2024"

ELIGIBLE_CANDIDATES_SHEET_ID = r"1QBP0g1aHlT-S8rjOObG18CGI2bdtjrR3B_pqIJeEDnc"

# ─── Page config ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="DUALPREP — Recruiter Dashboard",
    page_icon="⬡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Premium CSS ─────────────────────────────────────────────────────────────
st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  /* ── Root palette ── */
  :root {
    --bg:        #0a0c10;
    --surface:   #111318;
    --surface2:  #181c24;
    --border:    #232838;
    --accent:    #5b6eff;
    --accent2:   #a78bfa;
    --success:   #22d3a0;
    --warn:      #f59e0b;
    --danger:    #f43f5e;
    --txt:       #e8ecf4;
    --txt2:      #8b92a8;
    --txt3:      #555d72;
    --gradient:  linear-gradient(135deg, #5b6eff 0%, #a78bfa 100%);
  }

  /* ── Global reset ── */
  html, body, [data-testid="stAppViewContainer"] {
    background: var(--bg) !important;
    color: var(--txt) !important;
    font-family: 'DM Mono', monospace !important;
  }

  /* Animated grid background */
  [data-testid="stAppViewContainer"]::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(91,110,255,.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(91,110,255,.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Sidebar ── */
  [data-testid="stSidebar"] {
    background: var(--surface) !important;
    border-right: 1px solid var(--border) !important;
  }
  [data-testid="stSidebar"] * { color: var(--txt) !important; font-family: 'DM Mono', monospace !important; }
  [data-testid="stSidebar"] .stButton > button {
    width: 100% !important;
    background: var(--surface2) !important;
    color: var(--txt) !important;
    border: 1px solid var(--border) !important;
    border-radius: 6px !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 12px !important;
    letter-spacing: .03em !important;
    padding: 8px 12px !important;
    transition: all .2s !important;
    text-align: left !important;
  }
  [data-testid="stSidebar"] .stButton > button:hover {
    background: var(--accent) !important;
    border-color: var(--accent) !important;
    color: #fff !important;
    transform: translateX(3px) !important;
  }

  /* ── Main buttons ── */
  .stButton > button {
    background: var(--gradient) !important;
    color: #fff !important;
    border: none !important;
    border-radius: 6px !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 12px !important;
    letter-spacing: .06em !important;
    text-transform: uppercase !important;
    padding: 10px 20px !important;
    transition: all .25s !important;
    box-shadow: 0 4px 20px rgba(91,110,255,.25) !important;
  }
  .stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 30px rgba(91,110,255,.45) !important;
  }

  /* ── Inputs ── */
  .stTextInput > div > div > input,
  .stTextArea > div > div > textarea,
  .stNumberInput > div > div > input,
  .stSelectbox > div > div {
    background: var(--surface2) !important;
    border: 1px solid var(--border) !important;
    border-radius: 6px !important;
    color: var(--txt) !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 13px !important;
  }
  .stTextInput > div > div > input:focus,
  .stTextArea > div > div > textarea:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px rgba(91,110,255,.2) !important;
  }

  /* ── Labels & headings ── */
  label, .stMarkdown p, .stText { color: var(--txt2) !important; font-size: 12px !important; }
  h1 { font-family: 'Syne', sans-serif !important; font-weight: 800 !important; font-size: 28px !important; color: var(--txt) !important; letter-spacing: -.02em !important; }
  h2 { font-family: 'Syne', sans-serif !important; font-weight: 700 !important; font-size: 18px !important; color: var(--txt) !important; }
  h3 { font-family: 'Syne', sans-serif !important; font-weight: 600 !important; font-size: 15px !important; color: var(--txt) !important; }

  /* ── Metric cards ── */
  [data-testid="metric-container"] {
    background: var(--surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
    padding: 16px !important;
  }
  [data-testid="stMetricValue"] {
    font-family: 'Syne', sans-serif !important;
    font-weight: 800 !important;
    font-size: 26px !important;
    color: var(--accent) !important;
  }
  [data-testid="stMetricLabel"] {
    font-family: 'DM Mono', monospace !important;
    font-size: 11px !important;
    color: var(--txt3) !important;
    text-transform: uppercase !important;
    letter-spacing: .1em !important;
  }

  /* ── Dataframe ── */
  [data-testid="stDataFrame"] {
    background: var(--surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
    overflow: hidden !important;
  }

  /* ── Tabs ── */
  .stTabs [data-baseweb="tab-list"] {
    background: var(--surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    gap: 4px !important;
    padding: 4px !important;
  }
  .stTabs [data-baseweb="tab"] {
    font-family: 'DM Mono', monospace !important;
    font-size: 12px !important;
    color: var(--txt2) !important;
    border-radius: 6px !important;
    text-transform: uppercase !important;
    letter-spacing: .06em !important;
  }
  .stTabs [aria-selected="true"] {
    background: var(--accent) !important;
    color: #fff !important;
  }

  /* ── Alerts ── */
  .stSuccess, .element-container .stSuccess > div {
    background: rgba(34,211,160,.1) !important;
    border: 1px solid rgba(34,211,160,.3) !important;
    border-radius: 6px !important;
    color: var(--success) !important;
  }
  .stWarning, .element-container .stWarning > div {
    background: rgba(245,158,11,.1) !important;
    border: 1px solid rgba(245,158,11,.3) !important;
    border-radius: 6px !important;
  }
  .stError, .element-container .stError > div {
    background: rgba(244,63,94,.1) !important;
    border: 1px solid rgba(244,63,94,.3) !important;
    border-radius: 6px !important;
  }
  .stInfo, .element-container .stInfo > div {
    background: rgba(91,110,255,.1) !important;
    border: 1px solid rgba(91,110,255,.3) !important;
    border-radius: 6px !important;
    color: var(--txt) !important;
  }

  /* ── Progress bar ── */
  .stProgress > div > div > div { background: var(--gradient) !important; border-radius: 99px !important; }
  .stProgress > div > div { background: var(--surface2) !important; border-radius: 99px !important; }

  /* ── Slider ── */
  [data-testid="stSlider"] > div > div > div { background: var(--accent) !important; }

  /* ── Custom cards ── */
  .dp-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 24px;
    margin: 10px 0;
    position: relative;
    overflow: hidden;
  }
  .dp-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--gradient);
  }

  .dp-question-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 0 8px 8px 0;
    padding: 14px 18px;
    margin: 8px 0;
    font-size: 13px;
    color: var(--txt);
    line-height: 1.6;
  }

  .dp-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 11px;
    font-family: 'DM Mono', monospace;
    letter-spacing: .06em;
    font-weight: 500;
  }
  .dp-badge-green  { background: rgba(34,211,160,.15); color: #22d3a0; border: 1px solid rgba(34,211,160,.3); }
  .dp-badge-yellow { background: rgba(245,158,11,.15);  color: #f59e0b; border: 1px solid rgba(245,158,11,.3); }
  .dp-badge-blue   { background: rgba(91,110,255,.15);  color: #818cf8; border: 1px solid rgba(91,110,255,.3); }
  .dp-badge-red    { background: rgba(244,63,94,.15);   color: #f43f5e; border: 1px solid rgba(244,63,94,.3); }

  .dp-stat-row {
    display: flex;
    gap: 8px;
    margin: 4px 0;
    align-items: center;
  }
  .dp-stat-label { font-size: 11px; color: var(--txt3); text-transform: uppercase; letter-spacing: .08em; min-width: 100px; }
  .dp-stat-val   { font-size: 12px; color: var(--txt); font-family: 'DM Mono', monospace; }

  .dp-section-title {
    font-family: 'Syne', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .14em;
    color: var(--txt3);
    margin: 24px 0 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dp-section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── Hide Streamlit chrome ── */
  #MainMenu, footer, header { visibility: hidden !important; }
  [data-testid="stToolbar"] { display: none !important; }
  [data-testid="collapsedControl"] { background: var(--surface) !important; color: var(--txt) !important; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--accent); }

  /* ── Sidebar logo/brand ── */
  .dp-brand {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -.01em;
    background: linear-gradient(135deg, #5b6eff, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 4px;
  }
  .dp-brand-sub {
    font-size: 10px;
    color: var(--txt3) !important;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  /* ── Candidate pill ── */
  .dp-candidate-pill {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    margin: 6px 0;
    cursor: pointer;
    transition: all .2s;
  }
  .dp-candidate-pill:hover { border-color: var(--accent); }

  /* ── Score bar inline ── */
  .dp-score-bar-wrap { background: var(--border); border-radius: 99px; height: 4px; margin: 4px 0; }
  .dp-score-bar      { height: 4px; border-radius: 99px; background: var(--gradient); }

  /* selectbox dropdown */
  [data-baseweb="select"] > div {
    background: var(--surface2) !important;
    border-color: var(--border) !important;
    color: var(--txt) !important;
  }
  [data-baseweb="popover"] { background: var(--surface2) !important; }

  /* number input arrows */
  .stNumberInput button { background: var(--surface2) !important; border-color: var(--border) !important; color: var(--txt) !important; }

  /* iframe border */
  iframe { border-radius: 10px !important; border: 1px solid var(--border) !important; }

</style>
""", unsafe_allow_html=True)

# ─── Firebase ─────────────────────────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FIREBASE_CREDS_PATH = os.path.join(_BASE_DIR, "r-interview-d4e63-firebase-adminsdk-fbsvc-849203e206.json")
GOOGLE_CREDS_PATH   = os.path.join(_BASE_DIR, "entery-d5d8e6632c03.json")


@st.cache_resource
def init_firebase():
    if not firebase_admin._apps:
        if not os.path.exists(FIREBASE_CREDS_PATH):
            st.error(f"Firebase credentials not found: {FIREBASE_CREDS_PATH}")
            st.stop()
        cred = credentials.Certificate(FIREBASE_CREDS_PATH)
        firebase_admin.initialize_app(cred)
    return firestore.client()


db = init_firebase()

# ─── Session state ─────────────────────────────────────────────────────────────
_defaults = {
    "page": "main",
    "eligible_candidates": [],
    "recording_in_progress": False,
    "emotion_data": [],
    "questions": [],
    "current_profile": None,
    "sheets_synced": False,
}
for k, v in _defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v


# ════════════════════════════════════════════════════════════════════════════════
# GOOGLE SHEETS HELPERS  (unchanged logic)
# ════════════════════════════════════════════════════════════════════════════════

def setup_google_sheets_api(readonly=False):
    try:
        if not os.path.exists(GOOGLE_CREDS_PATH):
            st.sidebar.error(f"Service-account file not found: {GOOGLE_CREDS_PATH}")
            return None
        scopes = (
            ["https://www.googleapis.com/auth/spreadsheets.readonly",
             "https://www.googleapis.com/auth/drive.readonly"]
            if readonly
            else ["https://www.googleapis.com/auth/spreadsheets",
                  "https://www.googleapis.com/auth/drive"]
        )
        creds = service_account.Credentials.from_service_account_file(GOOGLE_CREDS_PATH, scopes=scopes)
        return build("sheets", "v4", credentials=creds)
    except Exception as e:
        st.sidebar.error(f"Failed to init Google Sheets API: {e}")
        return None


ELIGIBLE_HEADERS = [
    "Name","Email","Role","Education","Skills","Experience","Domain",
    "Interview Domain","Technical Score","Soft Skills Score","Problem Solving Score",
    "Overall Score","Interview Date","Eligible For F2F",
]


def ensure_sheet_headers(service, sheet_id):
    try:
        result = service.spreadsheets().values().get(spreadsheetId=sheet_id, range="Sheet1!A1:Z1").execute()
        existing = result.get("values", [])
        if not existing or existing[0] != ELIGIBLE_HEADERS:
            service.spreadsheets().values().update(
                spreadsheetId=sheet_id, range="Sheet1!A1",
                valueInputOption="RAW", body={"values": [ELIGIBLE_HEADERS]},
            ).execute()
    except HttpError as e:
        st.warning(f"Could not verify sheet headers: {e}")


def candidate_already_in_sheet(service, sheet_id, email):
    try:
        result = service.spreadsheets().values().get(spreadsheetId=sheet_id, range="Sheet1!B:B").execute()
        col = [row[0] if row else "" for row in result.get("values", [])]
        return email.lower() in [v.lower() for v in col]
    except Exception:
        return False


def append_candidate_to_sheet(service, sheet_id, candidate):
    row = [
        candidate.get("name",""), candidate.get("email",""), candidate.get("role",""),
        candidate.get("education",""), candidate.get("skills",""), candidate.get("experience",""),
        candidate.get("existingDomain",""), candidate.get("domain",""),
        candidate.get("technicalSkills",0), candidate.get("softSkills",0),
        candidate.get("problemSolving",0), candidate.get("overallScore",0),
        candidate.get("interviewDate",""), "Yes",
    ]
    service.spreadsheets().values().append(
        spreadsheetId=sheet_id, range="Sheet1!A1",
        valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": [row]},
    ).execute()


# ════════════════════════════════════════════════════════════════════════════════
# FIRESTORE READ
# ════════════════════════════════════════════════════════════════════════════════

def fetch_eligible_candidates_from_firestore():
    try:
        docs = db.collection("eligible_candidates").stream()
        candidates = []
        for doc in docs:
            data = doc.to_dict()
            if data.get("overallScore", 0) >= 50:
                candidates.append(data)
        candidates.sort(key=lambda c: c.get("overallScore", 0), reverse=True)
        return candidates
    except Exception as e:
        st.error(f"Error reading eligible candidates from Firestore: {e}")
        return []


def sync_eligible_to_sheets():
    if ELIGIBLE_CANDIDATES_SHEET_ID == "YOUR_ELIGIBLE_CANDIDATES_SHEET_ID_HERE":
        st.warning("⚠️ Set ELIGIBLE_CANDIDATES_SHEET_ID in app.py to enable Google Sheets sync.")
        return 0, 0
    svc = setup_google_sheets_api(readonly=False)
    if not svc:
        return 0, 0
    try:
        ensure_sheet_headers(svc, ELIGIBLE_CANDIDATES_SHEET_ID)
        candidates = fetch_eligible_candidates_from_firestore()
        added, skipped = 0, 0
        for c in candidates:
            email = c.get("email", "")
            if candidate_already_in_sheet(svc, ELIGIBLE_CANDIDATES_SHEET_ID, email):
                skipped += 1
            else:
                append_candidate_to_sheet(svc, ELIGIBLE_CANDIDATES_SHEET_ID, c)
                added += 1
        return added, skipped
    except Exception as e:
        st.error(f"Sheets sync error: {e}")
        return 0, 0


# ════════════════════════════════════════════════════════════════════════════════
# EMOTION / STRESS
# ════════════════════════════════════════════════════════════════════════════════

def _plotly_dark_layout(fig, title="", height=400):
    fig.update_layout(
        title=dict(text=title, font=dict(family="Syne", size=14, color="#e8ecf4")),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(17,19,24,0.6)",
        font=dict(family="DM Mono", size=11, color="#8b92a8"),
        height=height,
        margin=dict(l=50, r=30, t=60, b=50),
        xaxis=dict(gridcolor="#232838", linecolor="#232838", tickfont=dict(size=10)),
        yaxis=dict(gridcolor="#232838", linecolor="#232838", tickfont=dict(size=10)),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(size=10)),
    )
    return fig


def create_emotion_timeline(emotion_data):
    try:
        df = pd.DataFrame(emotion_data)
        df["stress_value"] = df["stress_level"].map({"Low":1,"Medium":2,"High":3}).fillna(0)
        df["readable_time"] = df["timestamp"].apply(lambda x: datetime.fromtimestamp(x).strftime("%H:%M:%S"))

        stress_fig = go.Figure()
        stress_fig.add_trace(go.Scatter(
            x=df["readable_time"], y=df["stress_value"],
            mode="lines+markers", name="Stress Level",
            line=dict(color="#f43f5e", width=2),
            marker=dict(size=8, color="#f43f5e", line=dict(color="#fff", width=1)),
            fill="tozeroy", fillcolor="rgba(244,63,94,.08)",
        ))
        _plotly_dark_layout(stress_fig, "Stress Level Timeline")
        stress_fig.update_layout(yaxis=dict(tickvals=[1,2,3], ticktext=["Low","Medium","High"], gridcolor="#232838", linecolor="#232838"))

        emotion_fig = None
        em_cols = [c for c in ["angry","disgust","fear","happy","sad","surprise","neutral"] if c in df.columns]
        palette = ["#5b6eff","#a78bfa","#22d3a0","#f59e0b","#f43f5e","#38bdf8","#6366f1"]
        if em_cols:
            emotion_fig = go.Figure()
            for i, em in enumerate(em_cols):
                emotion_fig.add_trace(go.Scatter(
                    x=df["readable_time"], y=df[em], mode="lines", name=em.capitalize(),
                    line=dict(color=palette[i % len(palette)], width=1.5),
                ))
            _plotly_dark_layout(emotion_fig, "Emotion Intensity Over Time")
            emotion_fig.update_layout(yaxis=dict(range=[0,1], gridcolor="#232838", linecolor="#232838"))
        return stress_fig, emotion_fig, df
    except Exception as e:
        st.error(f"Error creating timeline: {e}")
        return go.Figure(), None, pd.DataFrame()


def detect_stress(image):
    try:
        img_bgr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        result = DeepFace.analyze(img_bgr, actions=["emotion"], enforce_detection=False)
        if isinstance(result, list) and result:
            emotion_data = result[0].get("emotion", {})
            dominant = result[0].get("dominant_emotion", "neutral")
        else:
            emotion_data, dominant = {}, "neutral"
        stress_level = "High" if dominant in ["fear","sad","angry"] else "Medium" if dominant in ["neutral","surprise"] else "Low"
        stress_value = {"High":3,"Medium":2,"Low":1}[stress_level]
        analysis = {"timestamp":int(time.time()),"emotion":dominant,"stress_level":stress_level,"stress_value":stress_value}
        for em, score in emotion_data.items():
            analysis[em] = round(score/100, 4)
        return analysis, img_bgr
    except Exception as e:
        return {"timestamp":int(time.time()),"emotion":"unknown","stress_level":"Unknown","stress_value":0,"error":str(e)}, None


def capture_and_analyze_stress():
    screenshot = pyautogui.screenshot()
    rgb = np.array(screenshot)  # pyautogui screenshots are already RGB
    analysis, processed = detect_stress(rgb)
    if processed is not None:
        _, buf = cv2.imencode(".jpg", processed)
        analysis["image"] = base64.b64encode(buf).decode("utf-8")
    return analysis


# ════════════════════════════════════════════════════════════════════════════════
# COHERE
# ════════════════════════════════════════════════════════════════════════════════

def _init_cohere_client():
    return cohere.ClientV2(api_key=COHERE_API_KEY)


def generate_interview_questions(profile):
    if not profile:
        return ["Please select a candidate profile first."]
    prompt = (
        f"You are an expert technical interviewer. Generate exactly 5 interview questions "
        f"for a candidate:\n\n"
        f"**Position:** {profile.get('role','N/A')}\n"
        f"**Years of Experience:** {profile.get('experience','N/A')}\n"
        f"**Key Skills:** {profile.get('skills','N/A')}\n"
        f"**Education:** {profile.get('education','N/A')}\n\n"
        f"Requirements:\n- Generate exactly 5 questions\n- Number them 1 through 5\n"
        f"- Tailor difficulty to experience level\n- Focus on technical competencies\n\n"
        f"Generate the interview questions now:"
    )
    try:
        co = _init_cohere_client()
        response = co.chat(model=COHERE_MODEL, messages=[{"role":"user","content":prompt}])
    except Exception as api_error:
        st.error(f"❌ API error: {api_error}")
        return get_fallback_questions(profile)
    try:
        content_blocks = getattr(response.message, "content", [])
        if not content_blocks:
            return get_fallback_questions(profile)
        response_text = content_blocks[0].text.strip()
        questions = []
        for line in response_text.split("\n"):
            line = line.strip()
            if re.match(r"^[1-9][.)]\s+", line) or re.match(r"^[1-9]\s+-\s+", line):
                questions.append(line)
        if len(questions) < 3:
            questions = [l.strip() for l in response_text.split("\n") if len(l.strip()) > 30 and "?" in l]
        if not questions:
            return get_fallback_questions(profile)
        final = questions[:5]
        if len(final) < 5:
            final = (final + get_fallback_questions(profile))[:5]
        cleaned = []
        for i, q in enumerate(final, 1):
            q_clean = re.sub(r"^[0-9]+[.):\-]\s*", "", q).strip()
            cleaned.append(f"{i}. {q_clean}")
        return cleaned
    except Exception:
        return get_fallback_questions(profile)


def get_fallback_questions(profile):
    role = profile.get("role","this position")
    skills = profile.get("skills","the required technologies")
    experience = profile.get("experience","N/A")
    return [
        f"1. Describe your {experience} of experience working with {skills}.",
        f"2. Tell me about a challenging {role} project and how you overcame obstacles.",
        f"3. How do you stay current with developments in {role}?",
        "4. Describe a situation where you had to work under tight deadlines.",
        f"5. What interests you most about this {role} position?",
    ]


# ─── Navigation helpers ───────────────────────────────────────────────────────
def navigate_to_main():     st.session_state["page"] = "main"
def navigate_to_analysis(): st.session_state["page"] = "analysis"
def navigate_to_eligible():  st.session_state["page"] = "eligible"


# ════════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ════════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("""
        <div class='dp-brand'>⬡ DUALPREP</div>
        <div class='dp-brand-sub'>Recruiter Intelligence Suite</div>
    """, unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)

    st.markdown("<div class='dp-section-title'>Navigation</div>", unsafe_allow_html=True)
    st.button("⬡  Interview Dashboard", on_click=navigate_to_main)
    st.button("◈  Video Analysis",       on_click=navigate_to_analysis)
    st.button("✓  Shortlisted Pool",     on_click=navigate_to_eligible)

    st.markdown("<div class='dp-section-title'>Data Sync</div>", unsafe_allow_html=True)

    if st.button("↻  Refresh from Firestore"):
        with st.spinner("Fetching candidates…"):
            candidates = fetch_eligible_candidates_from_firestore()
            st.session_state["eligible_candidates"] = candidates
        if candidates:
            st.success(f"{len(candidates)} candidate(s) loaded.")
        else:
            st.info("No eligible candidates yet.")

    if st.button("⤴  Sync → Google Sheets"):
        with st.spinner("Syncing…"):
            added, skipped = sync_eligible_to_sheets()
        st.success(f"Added {added} · Skipped {skipped}")
        st.session_state["sheets_synced"] = True

    # Candidate selector
    eligible = st.session_state.get("eligible_candidates", [])
    if eligible:
        st.markdown("<div class='dp-section-title'>Active Candidate</div>", unsafe_allow_html=True)
        names = [c.get("name","Unknown") for c in eligible if c.get("name","Unknown") != "Unknown"]
        if names:
            sel_name = st.selectbox("", names, index=0, label_visibility="collapsed")
            sel_profile = next((c for c in eligible if c.get("name") == sel_name), None)
            if sel_profile:
                st.session_state["current_profile"] = sel_profile
                overall = sel_profile.get("overallScore", 0)
                badge_cls = "dp-badge-green" if overall >= 80 else "dp-badge-yellow" if overall >= 70 else "dp-badge-blue"
                st.markdown(f"""
                <div class='dp-card' style='padding:14px 16px;margin-top:8px;'>
                  <div style='font-family:Syne,sans-serif;font-size:14px;font-weight:700;color:#e8ecf4;margin-bottom:2px;'>{sel_profile.get('name','')}</div>
                  <div style='font-size:11px;color:#8b92a8;margin-bottom:10px;'>{sel_profile.get('role','')}</div>
                  <div class='dp-stat-row'><span class='dp-stat-label'>Email</span><span class='dp-stat-val' style='font-size:11px;'>{sel_profile.get('email','N/A')}</span></div>
                  <div class='dp-stat-row'><span class='dp-stat-label'>Domain</span><span class='dp-stat-val'>{sel_profile.get('existingDomain','N/A')}</span></div>
                  <div class='dp-stat-row'><span class='dp-stat-label'>Experience</span><span class='dp-stat-val'>{sel_profile.get('experience','N/A')}</span></div>
                  <div style='margin-top:10px;'>
                    <span class='dp-stat-label'>AI Score</span>
                    <div class='dp-score-bar-wrap' style='margin-top:4px;'><div class='dp-score-bar' style='width:{overall}%;'></div></div>
                    <div style='text-align:right;font-size:12px;color:#a78bfa;font-family:Syne,sans-serif;font-weight:700;'>{overall}%</div>
                  </div>
                </div>
                """, unsafe_allow_html=True)
    else:
        st.markdown("<br>", unsafe_allow_html=True)
        st.info("Refresh to load candidates.")

    st.markdown("<br><div style='font-size:10px;color:#555d72;text-align:center;letter-spacing:.06em;'>SCORE THRESHOLD · 50% · F2F ELIGIBLE</div>", unsafe_allow_html=True)


# ════════════════════════════════════════════════════════════════════════════════
# PAGE: ELIGIBLE CANDIDATES
# ════════════════════════════════════════════════════════════════════════════════
if st.session_state["page"] == "eligible":
    st.markdown("""
    <div style='display:flex;align-items:baseline;gap:12px;margin-bottom:4px;'>
      <h1 style='margin:0;'>Shortlisted Pool</h1>
      <span class='dp-badge dp-badge-green'>F2F Eligible</span>
    </div>
    <p style='color:#555d72;font-size:12px;margin-bottom:24px;'>Candidates who scored ≥ 50% in the AI mock interview are cleared for face-to-face interviews.</p>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([2, 2, 6])
    with col1:
        if st.button("↻ Refresh Firestore"):
            with st.spinner("Loading…"):
                candidates = fetch_eligible_candidates_from_firestore()
                st.session_state["eligible_candidates"] = candidates
    with col2:
        if st.button("⤴ Export Sheets"):
            with st.spinner("Syncing…"):
                added, skipped = sync_eligible_to_sheets()
            st.success(f"{added} added · {skipped} existing")

    eligible = st.session_state.get("eligible_candidates", [])

    if not eligible:
        st.markdown("""
        <div class='dp-card' style='text-align:center;padding:48px;'>
          <div style='font-size:32px;margin-bottom:12px;'>◈</div>
          <div style='font-family:Syne,sans-serif;font-size:16px;color:#8b92a8;'>No shortlisted candidates found.</div>
          <div style='font-size:12px;color:#555d72;margin-top:6px;'>Click Refresh Firestore to load the pool.</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        avg_score = sum(c.get("overallScore",0) for c in eligible) / len(eligible)
        mc1, mc2, mc3, mc4 = st.columns(4)
        mc1.metric("Shortlisted", len(eligible))
        mc2.metric("Avg Score", f"{avg_score:.1f}%")
        mc3.metric("Top Score", f"{max(c.get('overallScore',0) for c in eligible)}%")
        mc4.metric("Unique Roles", len(set(c.get('role','') for c in eligible)))

        st.markdown("<div class='dp-section-title'>Candidate Table</div>", unsafe_allow_html=True)

        rows = []
        for c in eligible:
            overall = c.get("overallScore",0)
            badge = "🟢 High" if overall >= 80 else "🟡 Good" if overall >= 70 else "🔵 Eligible"
            rows.append({
                "Name": c.get("name",""),
                "Email": c.get("email",""),
                "Role": c.get("role",""),
                "Domain": c.get("existingDomain","") or c.get("domain",""),
                "Experience": c.get("experience",""),
                "Technical %": c.get("technicalSkills",0),
                "Soft Skills %": c.get("softSkills",0),
                "Problem Solving %": c.get("problemSolving",0),
                "Overall %": overall,
                "Status": badge,
                "Interview Date": c.get("interviewDate","")[:10] if c.get("interviewDate") else "",
            })

        df = pd.DataFrame(rows)
        st.dataframe(
            df, use_container_width=True,
            column_config={
                "Overall %":        st.column_config.ProgressColumn("Overall %",        min_value=0, max_value=100),
                "Technical %":      st.column_config.ProgressColumn("Technical %",      min_value=0, max_value=100),
                "Soft Skills %":    st.column_config.ProgressColumn("Soft Skills %",    min_value=0, max_value=100),
                "Problem Solving %":st.column_config.ProgressColumn("Problem Solving %",min_value=0, max_value=100),
            },
            hide_index=True, height=380,
        )

        st.markdown("<div class='dp-section-title'>Score Distribution</div>", unsafe_allow_html=True)
        score_df = pd.DataFrame({
            "Candidate":      [c.get("name","") for c in eligible],
            "Technical":      [c.get("technicalSkills",0) for c in eligible],
            "Soft Skills":    [c.get("softSkills",0) for c in eligible],
            "Problem Solving":[c.get("problemSolving",0) for c in eligible],
            "Overall":        [c.get("overallScore",0) for c in eligible],
        })
        palette = ["#5b6eff","#a78bfa","#22d3a0","#f59e0b"]
        fig = go.Figure()
        for col, color in zip(["Technical","Soft Skills","Problem Solving","Overall"], palette):
            fig.add_trace(go.Bar(name=col, x=score_df["Candidate"], y=score_df[col],
                                 marker_color=color, opacity=0.9))
        _plotly_dark_layout(fig, height=380)
        fig.update_layout(barmode="group", legend=dict(orientation="h", y=1.08))
        st.plotly_chart(fig, use_container_width=True)


# ════════════════════════════════════════════════════════════════════════════════
# PAGE: MAIN INTERVIEW DASHBOARD
# ════════════════════════════════════════════════════════════════════════════════
elif st.session_state["page"] == "main":
    st.markdown("""
    <div style='display:flex;align-items:baseline;gap:12px;margin-bottom:4px;'>
      <h1 style='margin:0;'>Interview Dashboard</h1>
    </div>
    <p style='color:#555d72;font-size:12px;margin-bottom:24px;'>AI-powered question generation · Video interview room · Real-time stress detection</p>
    """, unsafe_allow_html=True)

    if not st.session_state.get("eligible_candidates"):
        st.info("⬡  Load shortlisted candidates first — click Refresh from Firestore in the sidebar.")

    # ── AI Question Generation ────────────────────────────────────────────────
    st.markdown("<div class='dp-section-title'>AI Question Generator</div>", unsafe_allow_html=True)

    col_btn, col_info = st.columns([2, 5])
    with col_btn:
        gen_clicked = st.button("⬡ Generate Questions")
    with col_info:
        if st.session_state.get("current_profile"):
            p = st.session_state["current_profile"]
            st.markdown(f"""
            <div style='background:rgba(91,110,255,.08);border:1px solid rgba(91,110,255,.2);border-radius:6px;
                        padding:8px 14px;font-size:12px;color:#8b92a8;line-height:1.7;margin-top:4px;'>
              <span style='color:#a78bfa;font-weight:600;'>{p.get('name','')}</span> ·
              {p.get('role','')} · {p.get('experience','')} ·
              <span class='dp-badge dp-badge-blue' style='font-size:10px;'>Score: {p.get('overallScore','')}%</span>
            </div>
            """, unsafe_allow_html=True)

    if gen_clicked:
        if st.session_state.get("current_profile"):
            with st.spinner("Generating personalised questions via Cohere…"):
                st.session_state["questions"] = generate_interview_questions(st.session_state["current_profile"])
            st.success("Questions ready.")
        else:
            st.warning("No candidate selected. Load eligible candidates and select one from the sidebar.")

    if st.session_state.get("questions"):
        for q in st.session_state["questions"]:
            st.markdown(f"<div class='dp-question-card'>{q}</div>", unsafe_allow_html=True)

    # ── Video Room ────────────────────────────────────────────────────────────
    st.markdown("<div class='dp-section-title'>Video Interview Room</div>", unsafe_allow_html=True)
    meeting_link = st.text_input("Digital Samba meeting link", placeholder="https://digitalsamba.com/room/…")
    if meeting_link:
        st.markdown(
            f'<iframe src="{meeting_link}" width="100%" height="580px" '
            'allow="camera; microphone; fullscreen; display-capture" style="border:none;"></iframe>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown("""
        <div class='dp-card' style='text-align:center;padding:32px;'>
          <div style='font-size:28px;margin-bottom:8px;'>◈</div>
          <div style='font-size:13px;color:#555d72;'>Paste a Digital Samba meeting link above to launch the video room.</div>
        </div>
        """, unsafe_allow_html=True)

    # ── Stress Analysis ───────────────────────────────────────────────────────
    st.markdown("<div class='dp-section-title'>Stress Detection</div>", unsafe_allow_html=True)

    col_n, col_go = st.columns([3, 5])
    with col_n:
        num_samples = st.number_input("Samples to capture", min_value=1, max_value=20, value=5, step=1)

    with col_go:
        st.markdown("<br>", unsafe_allow_html=True)
        start_analysis = st.button("◈ Start Stress Analysis")

    if start_analysis:
        if not st.session_state.get("current_profile"):
            st.warning("Select a candidate first.")
        else:
            st.session_state["recording_in_progress"] = True
            st.session_state["emotion_data"] = []
            progress_bar = st.progress(0)
            stop_container = st.container()
            stop_pressed = stop_container.button("⬛ Stop Analysis")
            analysis_container = st.container()
            try:
                for i in range(int(num_samples)):
                    if stop_pressed or not st.session_state.get("recording_in_progress", True):
                        st.warning("Analysis stopped.")
                        break
                    progress_bar.progress((i+1)/int(num_samples))
                    analysis = capture_and_analyze_stress()
                    if analysis.get("emotion") not in ("Error","unknown"):
                        st.session_state["emotion_data"].append(analysis)
                        with analysis_container:
                            cols = st.columns([2, 3])
                            with cols[0]:
                                if "image" in analysis:
                                    try:
                                        img_data = base64.b64decode(analysis["image"])
                                        img_arr = np.frombuffer(img_data, np.uint8)
                                        img = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
                                        if img is not None:
                                            st.image(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), caption=f"Sample {i+1}", use_container_width=True)
                                    except Exception as e:
                                        st.error(f"Image error: {e}")
                            with cols[1]:
                                lvl = analysis["stress_level"]
                                badge_cls = "dp-badge-red" if lvl=="High" else "dp-badge-yellow" if lvl=="Medium" else "dp-badge-green"
                                st.markdown(f"""
                                <div class='dp-card' style='padding:14px 16px;'>
                                  <div style='font-family:Syne,sans-serif;font-size:13px;font-weight:700;color:#e8ecf4;margin-bottom:8px;'>Sample {i+1}</div>
                                  <div class='dp-stat-row'><span class='dp-stat-label'>Emotion</span><span class='dp-stat-val'>{analysis['emotion'].capitalize()}</span></div>
                                  <div class='dp-stat-row'><span class='dp-stat-label'>Stress</span><span class='dp-badge {badge_cls}'>{lvl}</span></div>
                                </div>
                                """, unsafe_allow_html=True)
                        try:
                            name = st.session_state["current_profile"]["name"]
                            db.collection("stress_analysis").document(name)\
                              .collection("timeline").document(str(analysis["timestamp"]))\
                              .set({k: v for k, v in analysis.items() if k != "image"})
                        except Exception as db_err:
                            st.error(f"DB save failed: {db_err}")
                    else:
                        with analysis_container:
                            st.error(f"Sample {i+1} failed: {analysis.get('error','Unknown')}")
                    time.sleep(3)
                else:
                    st.success("✓ Analysis complete — visit Video Analysis for detailed results.")
            except Exception as e:
                st.error(f"Analysis error: {e}")
                st.code(traceback.format_exc())
            finally:
                st.session_state["recording_in_progress"] = False
                progress_bar.empty()


# ════════════════════════════════════════════════════════════════════════════════
# PAGE: VIDEO ANALYSIS
# ════════════════════════════════════════════════════════════════════════════════
elif st.session_state["page"] == "analysis":
    st.markdown("""
    <h1 style='margin-bottom:4px;'>Video Analysis</h1>
    <p style='color:#555d72;font-size:12px;margin-bottom:24px;'>Post-interview emotion & stress breakdown</p>
    """, unsafe_allow_html=True)

    if not st.session_state.get("emotion_data"):
        st.markdown("""
        <div class='dp-card' style='text-align:center;padding:56px;'>
          <div style='font-size:32px;margin-bottom:12px;'>◈</div>
          <div style='font-family:Syne,sans-serif;font-size:16px;color:#8b92a8;'>No interview data yet.</div>
          <div style='font-size:12px;color:#555d72;margin-top:6px;'>Run a stress analysis on the Interview Dashboard first.</div>
        </div>
        """, unsafe_allow_html=True)
        if st.button("← Return to Dashboard"):
            navigate_to_main()
    else:
        stress_fig, emotion_fig, timeline_df = create_emotion_timeline(st.session_state["emotion_data"])

        st.markdown("<div class='dp-section-title'>Stress Timeline</div>", unsafe_allow_html=True)
        st.plotly_chart(stress_fig, use_container_width=True)

        if emotion_fig:
            st.markdown("<div class='dp-section-title'>Emotion Intensity</div>", unsafe_allow_html=True)
            st.plotly_chart(emotion_fig, use_container_width=True)

        if "timestamp" in timeline_df.columns and len(timeline_df) > 1:
            st.markdown("<div class='dp-section-title'>Timeline Navigator</div>", unsafe_allow_html=True)
            ist = pytz.timezone("Asia/Kolkata")
            def to_ist(ts):
                return datetime.fromtimestamp(ts).astimezone(ist)

            min_ts = int(timeline_df["timestamp"].min())
            max_ts = int(timeline_df["timestamp"].max())
            selected_ts = st.slider("Scrub interview timeline", min_value=min_ts, max_value=max_ts, value=min_ts)
            closest = timeline_df.iloc[(timeline_df["timestamp"] - selected_ts).abs().argsort()[0]]

            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"""
                <div class='dp-card'>
                  <div class='dp-stat-row'><span class='dp-stat-label'>Start</span><span class='dp-stat-val'>{to_ist(min_ts).strftime('%H:%M:%S IST')}</span></div>
                  <div class='dp-stat-row'><span class='dp-stat-label'>End</span><span class='dp-stat-val'>{to_ist(max_ts).strftime('%H:%M:%S IST')}</span></div>
                  <div class='dp-stat-row'><span class='dp-stat-label'>Selected</span><span class='dp-stat-val'>{to_ist(selected_ts).strftime('%H:%M:%S IST')}</span></div>
                </div>
                """, unsafe_allow_html=True)
                if "image" in closest and closest["image"]:
                    try:
                        img_data = base64.b64decode(closest["image"])
                        img_arr = np.frombuffer(img_data, np.uint8)
                        img = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
                        if img is not None:
                            st.image(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), caption="Candidate at this moment", use_container_width=True)
                    except Exception as e:
                        st.error(f"Image error: {e}")
                else:
                    st.info("No image for this moment.")

            with col2:
                dom_em = closest.get("emotion","Unknown").capitalize()
                stress_lv = closest.get("stress_level","Unknown")
                badge_cls = "dp-badge-red" if stress_lv=="High" else "dp-badge-yellow" if stress_lv=="Medium" else "dp-badge-green"
                st.markdown(f"""
                <div class='dp-card'>
                  <div style='font-size:11px;color:#555d72;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;'>Snapshot Analysis</div>
                  <div style='font-family:Syne,sans-serif;font-size:22px;font-weight:700;color:#e8ecf4;margin-bottom:4px;'>{dom_em}</div>
                  <div><span class='dp-badge {badge_cls}'>{stress_lv} Stress</span></div>
                </div>
                """, unsafe_allow_html=True)
                if "stress_value" in closest:
                    gauge = go.Figure(go.Indicator(
                        mode="gauge+number", value=closest["stress_value"],
                        title={"text":"Stress Level","font":{"family":"Syne","size":12,"color":"#8b92a8"}},
                        number={"font":{"family":"Syne","size":28,"color":"#e8ecf4"}},
                        gauge={
                            "axis":{"range":[0,3],"tickvals":[1,2,3],"ticktext":["Low","Med","High"],
                                    "tickfont":{"size":10,"color":"#8b92a8"},"tickcolor":"#232838"},
                            "bar":{"color":"#5b6eff"},
                            "bgcolor":"#111318",
                            "steps":[
                                {"range":[0,1],"color":"rgba(34,211,160,.15)"},
                                {"range":[1,2],"color":"rgba(245,158,11,.15)"},
                                {"range":[2,3],"color":"rgba(244,63,94,.15)"},
                            ],
                            "bordercolor":"#232838",
                        },
                    ))
                    gauge.update_layout(
                        height=260, margin=dict(l=20,r=20,t=50,b=10),
                        paper_bgcolor="rgba(0,0,0,0)", font=dict(family="DM Mono"),
                    )
                    st.plotly_chart(gauge, use_container_width=True)

            st.markdown("<div class='dp-section-title'>Emotion Breakdown</div>", unsafe_allow_html=True)
            em_keys = ["angry","disgust","fear","happy","sad","surprise","neutral"]
            em_vals = {k: float(closest.get(k,0)) for k in em_keys if k in closest}
            if em_vals:
                pie = px.pie(
                    values=list(em_vals.values()), names=list(em_vals.keys()),
                    color_discrete_sequence=["#5b6eff","#a78bfa","#22d3a0","#f59e0b","#f43f5e","#38bdf8","#6366f1"],
                )
                pie.update_traces(textfont=dict(family="DM Mono", size=11))
                _plotly_dark_layout(pie, "Emotion Distribution", height=360)
                st.plotly_chart(pie, use_container_width=True)
            else:
                st.info("No emotion breakdown data.")

            st.markdown("<div class='dp-section-title'>Recruiter Notes</div>", unsafe_allow_html=True)
            if st.session_state.get("current_profile"):
                try:
                    cname = st.session_state["current_profile"]["name"]
                    note_ref = db.collection("stress_analysis").document(cname)\
                                 .collection("notes").document(str(int(closest["timestamp"])))
                    doc = note_ref.get()
                    existing = doc.to_dict().get("text","") if doc.exists else ""
                    notes = st.text_area("Notes for this moment", value=existing, height=130, placeholder="Add your observations, flags, or follow-up actions…")
                    if st.button("✓ Save Notes"):
                        note_ref.set({"text": notes, "timestamp": int(closest["timestamp"])})
                        st.success("Notes saved.")
                except Exception as e:
                    st.error(f"Notes error: {e}")

            st.markdown("<div class='dp-section-title'>Export</div>", unsafe_allow_html=True)
            if st.button("⬡ Generate Summary PDF"):
                try:
                    from reportlab.lib.pagesizes import letter
                    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
                    from reportlab.lib.styles import getSampleStyleSheet
                    from reportlab.lib import colors
                    import tempfile

                    cname = st.session_state["current_profile"]["name"]
                    profile = st.session_state["current_profile"]
                    summary = {
                        "candidate_name": cname,
                        "interview_date": datetime.fromtimestamp(timeline_df["timestamp"].min()).strftime("%Y-%m-%d"),
                        "duration": f"{float((timeline_df['timestamp'].max()-timeline_df['timestamp'].min())/60):.1f} min",
                        "avg_stress": float(timeline_df["stress_value"].mean()),
                        "max_stress": int(timeline_df["stress_value"].max()),
                        "dominant_emotion": str(timeline_df["emotion"].mode()[0]) if "emotion" in timeline_df.columns else "Unknown",
                        "ai_overall_score": profile.get("overallScore","N/A"),
                        "stress_peaks": int(len(timeline_df[timeline_df["stress_value"]==3])),
                        "relaxed_moments": int(len(timeline_df[timeline_df["stress_value"]==1])),
                    }
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                        pdf_path = tmp.name
                    rdoc = SimpleDocTemplate(pdf_path, pagesize=letter)
                    styles = getSampleStyleSheet()
                    content = []
                    content.append(Paragraph("DUALPREP — Interview Summary Report", styles["Heading1"]))
                    content.append(Spacer(1,12))
                    tbl = Table([
                        ["Candidate:", summary["candidate_name"]],
                        ["Date:", summary["interview_date"]],
                        ["Duration:", summary["duration"]],
                        ["AI Overall Score:", f"{summary['ai_overall_score']}%"],
                        ["Dominant Emotion:", summary["dominant_emotion"]],
                        ["High Stress Moments:", str(summary["stress_peaks"])],
                        ["Relaxed Moments:", str(summary["relaxed_moments"])],
                    ], colWidths=[150,300])
                    tbl.setStyle(TableStyle([
                        ("FONTNAME",(0,0),(-1,-1),"Helvetica"),
                        ("FONTSIZE",(0,0),(-1,-1),10),
                        ("ALIGN",(0,0),(0,-1),"RIGHT"),
                        ("ALIGN",(1,0),(1,-1),"LEFT"),
                        ("BOTTOMPADDING",(0,0),(-1,-1),6),
                        ("TEXTCOLOR",(0,0),(0,-1),colors.grey),
                    ]))
                    content.append(tbl)
                    content.append(Spacer(1,24))
                    avg = summary["avg_stress"]
                    note = (
                        f"{cname} exhibited elevated stress throughout the interview." if avg > 2.5
                        else f"{cname} showed moderate stress — some pressure points noted." if avg > 1.5
                        else f"{cname} maintained composure throughout — well prepared."
                    )
                    content.append(Paragraph("Analysis Note:", styles["Heading3"]))
                    content.append(Paragraph(note, styles["Normal"]))
                    content.append(Spacer(1,30))
                    content.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} by DUALPREP", styles["Italic"]))
                    rdoc.build(content)
                    with open(pdf_path,"rb") as f:
                        b64 = base64.b64encode(f.read()).decode("utf-8")
                    st.success("Report ready.")
                    st.markdown(
                        f'<a href="data:application/pdf;base64,{b64}" download="{cname}_dualprep_summary.pdf" '
                        f'style="color:#5b6eff;font-family:\'DM Mono\',monospace;font-size:13px;">⬇ Download PDF Report</a>',
                        unsafe_allow_html=True,
                    )
                except Exception as e:
                    st.error(f"Report error: {e}")
                    st.code(traceback.format_exc())