"""
Security Crew - Güvenlik Test Ekibi
===================================
OWASP Top 10 ve güvenlik taramaları için ekip
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crewai import Crew, Process
from agents import orchestrator_agent, security_analyst_agent, developer_bot_agent
from tasks.security_tasks import create_security_scan_task, create_vulnerability_report_task


class SecurityCrew:
    """
    Güvenlik Test Ekibi

    Ajanlar:
    - Manager Omega (Orkestratör)
    - SecBot Delta (Güvenlik Analisti)
    - DevBot Beta (Düzeltme önerileri için)
    """

    def __init__(self):
        self.orchestrator = orchestrator_agent
        self.security_analyst = security_analyst_agent
        self.developer = developer_bot_agent

    def run_security_scan(self, target: dict) -> dict:
        """
        Güvenlik taraması başlat

        Args:
            target: Hedef bilgileri (url, endpoints, forms)

        Returns:
            Güvenlik tarama sonuçları
        """
        print("=" * 60)
        print("🔒 Nexus QA - Güvenlik Tarama Ekibi Başlatılıyor...")
        print(f"🎯 Hedef: {target.get('url', 'N/A')}")
        print("=" * 60)

        # Güvenlik tarama görevi
        scan_task = create_security_scan_task(
            self.security_analyst,
            target
        )

        # Crew oluştur
        crew = Crew(
            agents=[self.security_analyst],
            tasks=[scan_task],
            verbose=True,
            process=Process.sequential
        )

        # Çalıştır
        result = crew.kickoff()

        print("\n" + "=" * 60)
        print("✅ Güvenlik Taraması Tamamlandı!")
        print("=" * 60)

        return {
            "success": True,
            "result": str(result),
            "crew_type": "security_scan"
        }

    def run_vulnerability_assessment(self, target: dict, vulnerabilities: list) -> dict:
        """
        Bulunan açıklar için detaylı değerlendirme

        Args:
            target: Hedef bilgileri
            vulnerabilities: Bulunan açıklar listesi

        Returns:
            Detaylı güvenlik raporu
        """
        print("=" * 60)
        print("📋 Nexus QA - Güvenlik Açığı Değerlendirmesi...")
        print(f"🔴 Bulunan Açık Sayısı: {len(vulnerabilities)}")
        print("=" * 60)

        # Rapor görevi
        report_task = create_vulnerability_report_task(
            self.security_analyst,
            vulnerabilities
        )

        # Crew oluştur
        crew = Crew(
            agents=[self.security_analyst, self.developer],
            tasks=[report_task],
            verbose=True,
            process=Process.sequential
        )

        # Çalıştır
        result = crew.kickoff()

        print("\n" + "=" * 60)
        print("✅ Güvenlik Değerlendirmesi Tamamlandı!")
        print("=" * 60)

        return {
            "success": True,
            "result": str(result),
            "crew_type": "vulnerability_assessment",
            "vulnerability_count": len(vulnerabilities)
        }

    def run_full_security_audit(self, target: dict) -> dict:
        """
        Tam güvenlik denetimi (Tarama + Değerlendirme)

        Args:
            target: Hedef bilgileri

        Returns:
            Tam güvenlik denetim sonuçları
        """
        results = {
            "scan": None,
            "assessment": None,
            "summary": {}
        }

        # 1. Güvenlik Taraması
        print("\n🔍 ADIM 1: Güvenlik Taraması...")
        results["scan"] = self.run_security_scan(target)

        # 2. Değerlendirme (örnek açıklar ile)
        # Gerçek kullanımda tarama sonucundan açıklar çıkarılır
        sample_vulnerabilities = [
            {
                "name": "XSS Vulnerability",
                "severity": "HIGH",
                "location": f"{target.get('url', '')}/search?q="
            },
            {
                "name": "Missing Security Headers",
                "severity": "MEDIUM",
                "location": target.get('url', '')
            }
        ]

        print("\n📊 ADIM 2: Açık Değerlendirmesi...")
        results["assessment"] = self.run_vulnerability_assessment(target, sample_vulnerabilities)

        # Özet
        results["summary"] = {
            "scan_completed": results["scan"]["success"],
            "assessment_completed": results["assessment"]["success"],
            "total_vulnerabilities": len(sample_vulnerabilities)
        }

        return results


# Test için
if __name__ == "__main__":
    crew = SecurityCrew()

    target = {
        "url": "https://demo.example.com",
        "endpoints": ["/api/login", "/api/users", "/api/products"],
        "forms": ["login_form", "search_form", "contact_form"]
    }

    result = crew.run_security_scan(target)
    print(result)
