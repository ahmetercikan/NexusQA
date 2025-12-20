# -*- coding: utf-8 -*-
"""
Nexus QA - CrewAI Main Entry Point
==================================
Ana başlatma dosyası
"""

import sys
import os

# UTF-8 encoding fix for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Windows sinyal düzeltmesi için config'i ilk yükle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import API_HOST, API_PORT

import argparse
import uvicorn


def run_api_server():
    """FastAPI sunucusunu başlat"""
    from api import app
    
    print("=" * 60)
    print("🚀 Nexus QA - CrewAI API Server")
    print("=" * 60)
    print(f"📍 Host: {API_HOST}")
    print(f"🔌 Port: {API_PORT}")
    print(f"📚 Docs: http://localhost:{API_PORT}/docs")
    print("=" * 60)
    print("⏳ Sunucu başlatılıyor...")
    print()
    
    # Uvicorn config
    uvicorn.run(
        app, 
        host=API_HOST, 
        port=API_PORT,
        log_level="info"
    )


def run_test_demo():
    """Test demo'su çalıştır"""
    print("=" * 60)
    print("🎮 Nexus QA - Test Demo")
    print("=" * 60)

    from crews import TestCrew

    # Demo proje
    project = {
        "name": "E-Ticaret Demo Projesi",
        "base_url": "https://demo.playwright.dev/todomvc",
        "description": "TodoMVC uygulaması test projesi"
    }

    # Demo test suite
    suite = {
        "name": "Temel Fonksiyon Testleri",
        "type": "UI",
        "description": "TodoMVC temel CRUD işlemleri"
    }

    crew = TestCrew()
    result = crew.run_ui_test(project, suite)

    print("\n" + "=" * 60)
    print("📊 SONUÇ:")
    print("=" * 60)
    print(result)

    # Sonucu dosyaya kaydet
    with open("test_result.txt", "w", encoding="utf-8") as f:
        f.write("NEXUS QA TEST SONUCU\n")
        f.write("=" * 60 + "\n\n")
        f.write(str(result))

    print("\n✅ Sonuç 'test_result.txt' dosyasına kaydedildi.")


def run_security_demo():
    """Güvenlik demo'su çalıştır"""
    print("=" * 60)
    print("🔒 Nexus QA - Security Demo")
    print("=" * 60)

    from crews import SecurityCrew

    target = {
        "url": "https://demo.playwright.dev/todomvc",
        "endpoints": ["/api/todos", "/api/users"],
        "forms": ["todo_form"]
    }

    crew = SecurityCrew()
    result = crew.run_security_scan(target)

    print("\n" + "=" * 60)
    print("📊 SONUÇ:")
    print("=" * 60)
    print(result)


def main():
    global API_HOST, API_PORT

    parser = argparse.ArgumentParser(
        description="Nexus QA - AI-Powered Test Automation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Örnekler:
  python main.py --server         # API sunucusunu başlat
  python main.py --test-demo      # Test demo'su çalıştır
  python main.py --security-demo  # Güvenlik demo'su çalıştır
        """
    )

    parser.add_argument(
        "--server",
        action="store_true",
        help="FastAPI sunucusunu başlat"
    )
    parser.add_argument(
        "--test-demo",
        action="store_true",
        help="Test demo'su çalıştır"
    )
    parser.add_argument(
        "--security-demo",
        action="store_true",
        help="Güvenlik demo'su çalıştır"
    )
    parser.add_argument(
        "--host",
        type=str,
        default=API_HOST,
        help=f"API host (default: {API_HOST})"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=API_PORT,
        help=f"API port (default: {API_PORT})"
    )

    args = parser.parse_args()

    if args.server:
        # Override host/port if provided
        API_HOST = args.host
        API_PORT = args.port
        run_api_server()
    elif args.test_demo:
        run_test_demo()
    elif args.security_demo:
        run_security_demo()
    else:
        # Default: sunucuyu başlat
        print("Varsayılan: API sunucusu başlatılıyor...")
        print("Diğer seçenekler için: python main.py --help")
        run_api_server()


if __name__ == "__main__":
    main()
