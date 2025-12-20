"""
Automation Crew - Otomatikleştirme Ekibi
========================================
Test senaryolarından otomatikleştirme kodu üretmek için ekip
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crewai import Crew, Process
from agents.test_architect import test_architect_agent
from agents.developer_bot import developer_bot_agent
from agents.orchestrator import orchestrator_agent
from tasks.document_analysis_tasks import create_code_generation_task


class AutomationCrew:
    """
    Otomatikleştirme Ekibi

    Ajanlar:
    - Agent Alpha (Test Mimarı) - Senaryoyu anlayan
    - DevBot Beta (Yazılımcı) - Kodu yazan
    - Manager Omega (Orkestratör) - Süreci yöneten
    """

    def __init__(self):
        self.test_architect = test_architect_agent
        self.developer = developer_bot_agent
        self.orchestrator = orchestrator_agent

    def generate_automation(self, scenario: dict, test_suite_info: dict) -> dict:
        """
        Senaryo için otomatikleştirme kodu üret

        Args:
            scenario: Test senaryosu objesi
            test_suite_info: Test suite bilgileri

        Returns:
            Üretilen otomatikleştirme kodu
        """
        print("=" * 60)
        print("🚀 Otomatikleştirme Ekibi Başlatılıyor...")
        print(f"📝 Senaryo: {scenario.get('title', 'N/A')}")
        print(f"🔧 Tür: {scenario.get('automationType', 'UI')}")
        print("=" * 60)

        try:
            # Görev: Kod Üretimi
            code_task = create_code_generation_task(
                self.developer,
                scenario,
                test_suite_info
            )

            # Crew oluştur
            crew = Crew(
                agents=[self.test_architect, self.developer, self.orchestrator],
                tasks=[code_task],
                verbose=True,
                process=Process.sequential
            )

            # Çalıştır
            result = crew.kickoff()

            # Sonucu string'e çevir ve temizle
            code_output = str(result)

            # Markdown code blocks'u temizle
            if '```javascript' in code_output:
                code_output = code_output.split('```javascript')[1].split('```')[0]
            elif '```js' in code_output:
                code_output = code_output.split('```js')[1].split('```')[0]
            elif '```' in code_output:
                parts = code_output.split('```')
                if len(parts) >= 3:
                    code_output = parts[1]

            code_output = code_output.strip()

            print("\n" + "=" * 60)
            print("✅ Kod Üretimi Tamamlandı!")
            print(f"📄 Üretilen kod uzunluğu: {len(code_output)} karakter")
            print("=" * 60)

            return {
                "success": True,
                "code": code_output,
                "automation_type": scenario.get('automationType', 'UI'),
                "scenario_title": scenario.get('title'),
                "scenario_id": scenario.get('id')
            }

        except Exception as e:
            print(f"\n❌ Kod üretimi sırasında hata: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "code": "",
                "automation_type": scenario.get('automationType', 'UI'),
                "scenario_title": scenario.get('title')
            }

    def generate_multiple(self, scenarios: list, test_suite_info: dict) -> dict:
        """
        Birden fazla senaryo için kod üret

        Args:
            scenarios: Test senaryoları listesi
            test_suite_info: Test suite bilgileri

        Returns:
            Üretilen kodlar (senaryo ID'sine göre)
        """
        print("=" * 60)
        print(f"🚀 Çoklu Otomatikleştirme Başlatılıyor ({len(scenarios)} senaryo)...")
        print("=" * 60)

        results = {}
        for scenario in scenarios:
            scenario_id = scenario.get('id')
            print(f"\n⏳ Senaryo {scenario_id} işleniyor: {scenario.get('title')}")
            result = self.generate_automation(scenario, test_suite_info)
            results[scenario_id] = result

        return {
            "success": True,
            "results": results,
            "total": len(scenarios),
            "successful": sum(1 for r in results.values() if r.get('success'))
        }


# Singleton instance
automation_crew = AutomationCrew()
