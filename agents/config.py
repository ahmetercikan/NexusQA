"""
Nexus QA - CrewAI Configuration
================================
Windows uyumluluğu ve LLM ayarları
"""

import os
import sys
import signal
import warnings

# ============================================================
# WINDOWS DÜZELTMESI (EN TEPEDE OLMALI!)
# ============================================================
if sys.platform.startswith('win'):
    def handler(signum, frame):
        pass

    # Windows'ta olmayan sinyalleri tanımla
    missing_signals = [
        'SIGHUP', 'SIGQUIT', 'SIGTSTP', 'SIGCONT',
        'SIGUSR1', 'SIGUSR2', 'SIGALRM'
    ]

    for sig_name in missing_signals:
        if not hasattr(signal, sig_name):
            setattr(signal, sig_name, signal.SIGTERM if hasattr(signal, 'SIGTERM') else 1)

# Uyarıları kapat
warnings.filterwarnings('ignore')

# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================
from dotenv import load_dotenv
load_dotenv()

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# LLM Settings
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# API Server
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Backend
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

# Playwright
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"
BROWSER = os.getenv("BROWSER", "chromium")
SLOW_MO = int(os.getenv("SLOW_MO", "0"))

# ============================================================
# LLM INSTANCE
# ============================================================
from crewai import LLM

def get_llm():
    """LLM instance oluştur"""
    if LLM_PROVIDER == "openai":
        os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
        return LLM(
            model=LLM_MODEL,
            api_key=OPENAI_API_KEY
        )
    elif LLM_PROVIDER == "gemini":
        os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
        return LLM(
            model=f"gemini/{LLM_MODEL}",
            api_key=GEMINI_API_KEY
        )
    else:
        # Default: OpenAI
        os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
        return LLM(
            model="gpt-4o-mini",
            api_key=OPENAI_API_KEY
        )

# Global LLM instance
llm = get_llm()
