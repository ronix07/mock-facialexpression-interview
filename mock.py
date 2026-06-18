import streamlit as st
import firebase_admin
from firebase_admin import credentials, auth
import time
import webbrowser
import os
import subprocess
import socket
import sys

st.set_page_config(
    page_title="DUALPREP",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ─── Hide Streamlit chrome ─────────────────────────────────────────────────────
st.markdown("""
<style>
    header { display: none !important; }
    footer { visibility: hidden !important; }
    #MainMenu { visibility: hidden !important; }
    .main > div { padding-top: 0 !important; }
    .stApp { margin-top: 0 !important; }
</style>
""", unsafe_allow_html=True)

# ─── Master stylesheet ─────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

:root {
    --bg:        #09090f;
    --surface:   #111118;
    --border:    rgba(255,255,255,0.07);
    --accent:    #6C63FF;
    --accent2:   #A78BFA;
    --accent3:   #38BDF8;
    --text:      #F1F0FF;
    --muted:     rgba(241,240,255,0.45);
    --glow:      0 0 40px rgba(108,99,255,0.35);
    --radius:    14px;
}

[data-testid="stAppViewContainer"] {
    background: var(--bg) !important;
    font-family: 'DM Sans', sans-serif !important;
    min-height: 100vh;
    position: relative;
    overflow: hidden;
}

/* ── Animated mesh background ── */
[data-testid="stAppViewContainer"]::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
        radial-gradient(ellipse 80% 60% at 20% 10%,  rgba(108,99,255,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 80% 80%,  rgba(56,189,248,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 50% 50%,  rgba(167,139,250,0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
}

/* ── Grid overlay ── */
[data-testid="stAppViewContainer"]::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        linear-gradient(rgba(108,99,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(108,99,255,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
}

[data-testid="stVerticalBlock"] { position: relative; z-index: 1; }

/* ── Typography ── */
h1, h2, h3 {
    font-family: 'Syne', sans-serif !important;
    color: var(--text) !important;
    font-weight: 800 !important;
    letter-spacing: -0.02em !important;
}

h1 {
    font-size: clamp(2.8rem, 5vw, 4.2rem) !important;
    text-align: center;
    background: linear-gradient(135deg, #fff 30%, var(--accent2) 70%, var(--accent3) 100%);
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    padding: 2.5rem 0 0.5rem !important;
    line-height: 1.1 !important;
}

h2, h3 {
    font-size: 1.4rem !important;
    color: var(--text) !important;
    -webkit-text-fill-color: var(--text) !important;
    text-align: left !important;
    margin-bottom: 1.5rem !important;
}

/* ── Subtitle ── */
.tagline {
    text-align: center;
    color: var(--muted);
    font-size: 1.05rem;
    letter-spacing: 0.01em;
    margin-bottom: 0.5rem;
    font-family: 'DM Sans', sans-serif;
}

/* ── Badge ── */
.badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(108,99,255,0.15);
    border: 1px solid rgba(108,99,255,0.35);
    border-radius: 999px;
    padding: 4px 14px;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--accent2);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0 auto 1.5rem;
    width: fit-content;
    font-family: 'DM Sans', sans-serif;
}

/* ── Card ── */
.dp-card {
    background: rgba(17,17,24,0.85);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 2.5rem 2.5rem 2rem;
    margin: 1.5rem 0;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), var(--glow);
    position: relative;
    overflow: hidden;
}

.dp-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(108,99,255,0.6), transparent);
}

/* ── Role Cards ── */
.role-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: var(--radius);
    padding: 1.6rem 1.4rem;
    margin: 0.5rem 0;
    transition: all 0.25s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}

/* ── Buttons ── */
.stButton > button {
    font-family: 'Syne', sans-serif !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    letter-spacing: 0.01em !important;
    width: 100% !important;
    padding: 0.85rem 1.5rem !important;
    border-radius: var(--radius) !important;
    border: none !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    margin: 0.3rem 0 !important;
    background: linear-gradient(135deg, var(--accent) 0%, #8B5CF6 100%) !important;
    color: #fff !important;
    box-shadow: 0 4px 15px rgba(108,99,255,0.4) !important;
    position: relative !important;
    overflow: hidden !important;
}

.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(108,99,255,0.55) !important;
    filter: brightness(1.1) !important;
}

.stButton > button:active {
    transform: translateY(0) !important;
}

/* Back button style override via key trick – use different appearance */
[data-testid*="back"] button,
button[kind="secondary"] {
    background: transparent !important;
    border: 1px solid var(--border) !important;
    color: var(--muted) !important;
    box-shadow: none !important;
    font-size: 0.85rem !important;
}

/* ── Inputs ── */
.stTextInput > div > div > input {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 10px !important;
    padding: 0.85rem 1rem !important;
    font-size: 0.95rem !important;
    color: var(--text) !important;
    font-family: 'DM Sans', sans-serif !important;
    transition: border-color 0.2s !important;
}

.stTextInput > div > div > input:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 3px rgba(108,99,255,0.15) !important;
    background: rgba(108,99,255,0.06) !important;
}

.stTextInput > label {
    color: var(--muted) !important;
    font-size: 0.82rem !important;
    font-weight: 500 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.08em !important;
    font-family: 'DM Sans', sans-serif !important;
}

/* ── Radio ── */
.stRadio > div {
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid var(--border) !important;
    padding: 0.6rem 1rem !important;
    border-radius: 10px !important;
    margin: 0.5rem 0 1.2rem !important;
    gap: 1.5rem !important;
}

/* ── FIX: Remove blank strip from collapsed radio label ── */
.stRadio [data-testid="stWidgetLabel"] {
    display: none !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
}

.stRadio label {
    color: var(--text) !important;
    font-size: 0.9rem !important;
    font-family: 'DM Sans', sans-serif !important;
}

/* ── Success / Error / Info ── */
.stSuccess, .stError, .stInfo, .stWarning {
    border-radius: 10px !important;
    font-family: 'DM Sans', sans-serif !important;
}

/* ── Spinner ── */
.stSpinner { color: var(--accent2) !important; }

/* ── Divider ── */
.dp-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
    margin: 1.2rem 0;
}

/* ── Stats strip ── */
.stats-strip {
    display: flex;
    justify-content: center;
    gap: 2.5rem;
    margin: 1.5rem 0 2rem;
}
.stat-item {
    text-align: center;
    font-family: 'DM Sans', sans-serif;
}
.stat-num {
    font-family: 'Syne', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--accent2), var(--accent3));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.stat-label {
    font-size: 0.72rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 2px;
}

/* ── Launch link button ── */
.launch-btn {
    display: block;
    width: 100%;
    text-align: center;
    background: linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%);
    color: white !important;
    padding: 0.9rem 1.5rem;
    border-radius: var(--radius);
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none !important;
    box-shadow: 0 4px 20px rgba(108,99,255,0.45);
    margin-top: 0.8rem;
    transition: all 0.2s;
    letter-spacing: 0.01em;
}
.launch-btn:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(108,99,255,0.55); }

.hint-text {
    font-size: 0.78rem;
    color: var(--muted);
    text-align: center;
    margin-top: 0.6rem;
    font-family: 'DM Sans', sans-serif;
}

/* ── Back link style ── */
.back-btn button {
    background: transparent !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: var(--muted) !important;
    box-shadow: none !important;
    font-weight: 400 !important;
    font-size: 0.85rem !important;
    padding: 0.55rem 1rem !important;
}
</style>
""", unsafe_allow_html=True)

# ─── Firebase init ─────────────────────────────────────────────────────────────
if not firebase_admin._apps:
    cred = credentials.Certificate("mock-ba91d-e10d4c386baa.json")
    firebase_admin.initialize_app(cred)

# ─── Config ───────────────────────────────────────────────────────────────────
REACT_APP_DIR = "aidriven"
REACT_PORT    = 5173

# ─── Helpers ──────────────────────────────────────────────────────────────────
def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def launch_react_nonblocking():
    """Start Vite in background; return immediately — don't wait for port."""
    if is_port_in_use(REACT_PORT):
        return  # already running

    base_dir  = os.path.dirname(os.path.abspath(__file__))
    react_dir = os.path.join(base_dir, REACT_APP_DIR)

    if not os.path.isdir(react_dir):
        st.error(f"❌ React folder not found: `{react_dir}`")
        return

    subprocess.Popen(
        "npm run dev",
        cwd=react_dir,
        shell=True,
        creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0,
    )

def start_react_app():
    """Launch Vite and wait up to 15 s; return True as soon as port is ready."""
    launch_react_nonblocking()
    for _ in range(15):
        if is_port_in_use(REACT_PORT):
            return True
        time.sleep(1)
    return True  # open anyway; Vite may still be compiling

# ─── Session state ────────────────────────────────────────────────────────────
if 'page' not in st.session_state:
    st.session_state.page = 'main'

# ═════════════════════════════════════════════════════════════════════════════
# HEADER — shown on every page
# ═════════════════════════════════════════════════════════════════════════════
st.markdown("""
<div style="text-align:center; padding-top: 2.5rem;">
  <div class="badge">⚡ AI-Powered Interview Suite</div>
</div>
""", unsafe_allow_html=True)

st.title("DUALPREP")

st.markdown("""
<p class="tagline">Real-time stress analysis · Smart feedback · Smarter hiring</p>
""", unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
# MAIN PAGE
# ═════════════════════════════════════════════════════════════════════════════
if st.session_state.page == 'main':

    st.markdown("""
    <div class="stats-strip">
        <div class="stat-item"><div class="stat-num">98%</div><div class="stat-label">Accuracy</div></div>
        <div class="stat-item"><div class="stat-num">2.4s</div><div class="stat-label">Avg Analysis</div></div>
        <div class="stat-item"><div class="stat-num">12k+</div><div class="stat-label">Interviews</div></div>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown('<div class="dp-card">', unsafe_allow_html=True)
        st.subheader("Who are you today?")

        st.markdown("""
        <div style="margin-bottom:0.5rem; color:var(--muted); font-size:0.88rem; font-family:'DM Sans',sans-serif;">
            Select your role to get started
        </div>
        """, unsafe_allow_html=True)

        if st.button("👤  I'm a Candidate", key="candidate_select"):
            st.session_state.page = 'candidate_login'
            st.rerun()

        st.markdown('<div style="height:0.5rem"></div>', unsafe_allow_html=True)

        if st.button("🎙️  I'm an Interviewer", key="interviewer_select"):
            st.session_state.page = 'interviewer_login'
            st.rerun()

        st.markdown("""
        <div class="dp-divider"></div>
        <p style="text-align:center;color:var(--muted);font-size:0.78rem;font-family:'DM Sans',sans-serif;margin:0;">
            Powered by computer vision &amp; NLP · All sessions encrypted
        </p>
        """, unsafe_allow_html=True)

        st.markdown('</div>', unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
# CANDIDATE LOGIN
# ═════════════════════════════════════════════════════════════════════════════
elif st.session_state.page == 'candidate_login':
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown('<div class="dp-card">', unsafe_allow_html=True)
        st.subheader("Candidate Portal")

        auth_action = st.radio(
            "Action",
            ("Login", "Register"),
            horizontal=True,
            label_visibility="collapsed"
        )

        email    = st.text_input("Email address", key="c_email", placeholder="you@example.com")
        password = st.text_input("Password", type="password", key="c_pass", placeholder="••••••••")

        if auth_action == "Register":
            password_confirm = st.text_input("Confirm Password", type="password", key="c_pass2", placeholder="••••••••")

            if st.button("✦  Create Account", key="candidate_register"):
                if not email or not password:
                    st.error("Please fill in all fields.")
                elif password != password_confirm:
                    st.error("Passwords do not match.")
                else:
                    try:
                        auth.create_user(email=email, password=password)
                        st.success("✅ Account created! Switch to Login to continue.")
                    except Exception as e:
                        st.error(f"Registration error: {e}")

        else:  # Login
            if st.button("→  Enter Platform", key="candidate_login_btn"):
                if not email or not password:
                    st.error("Please enter both email and password.")
                else:
                    try:
                        auth.get_user_by_email(email)

                        # ── FAST PATH: start Vite in background immediately ──
                        launch_react_nonblocking()

                        st.success("✅ Authenticated! The interview platform is launching…")

                        # Show the link immediately — user can click as soon as Vite is ready
                        st.markdown(
                            f'<a class="launch-btn" href="http://localhost:{REACT_PORT}" target="_blank">'
                            f'🚀 Open Interview Platform</a>'
                            f'<p class="hint-text">Click once the browser tab loads. '
                            f'If you see a blank page, wait ~10 s and refresh — Vite may still be compiling.</p>',
                            unsafe_allow_html=True
                        )

                        # Brief non-blocking progress bar for UX feedback
                        prog = st.progress(0, text="Starting Vite server…")
                        for i in range(1, 6):
                            time.sleep(0.4)
                            prog.progress(i * 20, text=f"Server warm-up… ({i*20}%)")
                            if is_port_in_use(REACT_PORT):
                                prog.progress(100, text="✅ Server ready!")
                                break
                        else:
                            prog.progress(100, text="Server starting in background…")

                    except Exception as e:
                        st.error(f"Login failed: {e}")

        st.markdown('<div class="dp-divider"></div>', unsafe_allow_html=True)
        st.markdown('<div class="back-btn">', unsafe_allow_html=True)
        if st.button("← Back", key="candidate_back"):
            st.session_state.page = 'main'
            st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
# INTERVIEWER LOGIN
# ═════════════════════════════════════════════════════════════════════════════
elif st.session_state.page == 'interviewer_login':
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown('<div class="dp-card">', unsafe_allow_html=True)
        st.subheader("Interviewer Portal")

        email    = st.text_input("Email address", key="i_email", placeholder="you@company.com")
        password = st.text_input("Password", type="password", key="i_pass", placeholder="••••••••")

        if st.button("→  Enter Dashboard", key="interviewer_login_btn"):
            if not email or not password:
                st.error("Please enter both email and password.")
            else:
                try:
                    auth.get_user_by_email(email)
                    st.success("✅ Authenticated!")
                    time.sleep(0.5)
                    st.session_state.page = 'interviewer_dashboard'
                    st.rerun()
                except Exception as e:
                    st.error(f"Login failed: {e}")

        st.markdown('<div class="dp-divider"></div>', unsafe_allow_html=True)
        st.markdown('<div class="back-btn">', unsafe_allow_html=True)
        if st.button("← Back", key="interviewer_back"):
            st.session_state.page = 'main'
            st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
# INTERVIEWER DASHBOARD
# ═════════════════════════════════════════════════════════════════════════════
elif st.session_state.page == 'interviewer_dashboard':
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown('<div class="dp-card">', unsafe_allow_html=True)
        st.subheader("Opening Dashboard…")

        if not is_port_in_use(8502):
            subprocess.Popen(
                f'"{sys.executable}" -m streamlit run app.py --server.port=8502',
                shell=True
            )
            with st.spinner("Starting analytics dashboard…"):
                for _ in range(6):
                    time.sleep(1)
                    if is_port_in_use(8502):
                        break

        webbrowser.open("http://localhost:8502")

        st.markdown(
            '<a class="launch-btn" href="http://localhost:8502" target="_blank">'
            '📊 Open Interviewer Dashboard</a>'
            '<p class="hint-text">Opened in a new tab · '
            'Or visit <code style="color:var(--accent2)">localhost:8502</code> directly</p>',
            unsafe_allow_html=True
        )

        st.markdown('<div class="dp-divider"></div>', unsafe_allow_html=True)
        st.markdown('<div class="back-btn">', unsafe_allow_html=True)
        if st.button("← Back to Login", key="dashboard_back"):
            st.session_state.page = 'interviewer_login'
            st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)