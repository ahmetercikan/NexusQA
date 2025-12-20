"""
Test Crew - Ana Test Ekibi
==========================
UI ve API testleri için orkestre edilmiş ekip
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crewai import Crew, Process
from agents import orchestrator_agent, test_architect_agent, developer_bot_agent
from tasks.ui_test_tasks import create_test_planning_task, create_ui_test_task
from tasks.api_test_tasks import create_api_test_task


class TestCrew:
    """
    Ana Test Ekibi

    Ajanlar:
    - Manager Omega (Orkestratör)
    - Agent Alpha (Test Mimarı)
    - DevBot Beta (Yazılımcı)
    """

    def __init__(self):
        self.orchestrator = orchestrator_agent
        self.test_architect = test_architect_agent
        self.developer = developer_bot_agent

    def run_ui_test(self, project_info: dict, test_suite: dict) -> dict:
        """
        UI Test akışını başlat

        Args:
            project_info: Proje bilgileri (name, base_url, description)
            test_suite: Test suite bilgileri

        Returns:
            Test sonuçları
        """
        print("=" * 60)
        print("🚀 Nexus QA - UI Test Ekibi Başlatılıyor...")
        print(f"📋 Proje: {project_info.get('name', 'N/A')}")
        print(f"🔗 URL: {project_info.get('base_url', 'N/A')}")
        print("=" * 60)

        # Görev 1: Test Planlaması
        planning_task = create_test_planning_task(
            self.orchestrator,
            project_info
        )

        # Görev 2: UI Test Senaryoları
        ui_test_task = create_ui_test_task(
            self.test_architect,
            "{{planning_task.output}}",  # Önceki görevin çıktısını kullan
            test_suite
        )

        # Crew oluştur
        crew = Crew(
            agents=[self.orchestrator, self.test_architect, self.developer],
            tasks=[planning_task, ui_test_task],
            verbose=True,
            process=Process.sequential  # Sıralı çalışma
        )

        # Çalıştır
        result = crew.kickoff()

        print("\n" + "=" * 60)
        print("✅ UI Test Tamamlandı!")
        print("=" * 60)

        return {
            "success": True,
            "result": str(result),
            "crew_type": "ui_test"
        }

    def run_api_test(self, api_spec: dict) -> dict:
        """
        API Test akışını başlat

        Args:
            api_spec: API spesifikasyonu

        Returns:
            Test sonuçları
        """
        print("=" * 60)
        print("🚀 Nexus QA - API Test Ekibi Başlatılıyor...")
        print(f"🔗 Base URL: {api_spec.get('base_url', 'N/A')}")
        print(f"📌 Endpoints: {len(api_spec.get('endpoints', []))}")
        print("=" * 60)

        # API Test görevi
        api_test_task = create_api_test_task(
            self.test_architect,
            api_spec
        )

        # Crew oluştur
        crew = Crew(
            agents=[self.test_architect],
            tasks=[api_test_task],
            verbose=True,
            process=Process.sequential
        )

        # Çalıştır
        result = crew.kickoff()

        print("\n" + "=" * 60)
        print("✅ API Test Tamamlandı!")
        print("=" * 60)

        return {
            "success": True,
            "result": str(result),
            "crew_type": "api_test"
        }

    def run_full_test(self, project_info: dict, test_suite: dict, api_spec: dict = None) -> dict:
        """
        Tam test akışını başlat (UI + API)

        Args:
            project_info: Proje bilgileri
            test_suite: Test suite bilgileri
            api_spec: API spesifikasyonu (opsiyonel)

        Returns:
            Tüm test sonuçları
        """
        results = {
            "ui_test": None,
            "api_test": None,
            "summary": {}
        }

        # UI Test
        print("\n📱 UI Testleri başlatılıyor...")
        results["ui_test"] = self.run_ui_test(project_info, test_suite)

        # API Test (varsa)
        if api_spec:
            print("\n🔌 API Testleri başlatılıyor...")
            results["api_test"] = self.run_api_test(api_spec)

        # Özet
        results["summary"] = {
            "total_crews_run": 2 if api_spec else 1,
            "ui_success": results["ui_test"]["success"] if results["ui_test"] else False,
            "api_success": results["api_test"]["success"] if results["api_test"] else None
        }

        return results


# Test için
if __name__ == "__main__":
    crew = TestCrew()

    # Örnek proje
    project = {
        "name": "E-Ticaret Demo",
        "base_url": "https://demo.example.com",
        "description": "E-commerce test projesi"
    }

    # Örnek test suite
    suite = {
        "name": "Login Testleri",
        "type": "UI",
        "description": "Kullanıcı giriş testleri"
    }

    result = crew.run_ui_test(project, suite)
    print(result)
