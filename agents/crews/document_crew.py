"""
Document Crew - Belge Analiz Ekibi
===================================
Yüklenen belgelerden test senaryoları çıkarmak için ekip
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crewai import Crew, Process
from agents.test_architect import test_architect_agent
from agents.orchestrator import orchestrator_agent
from tasks.document_analysis_tasks import create_document_analysis_task
from tools.nlp_analyzer import nlp_analyzer


class DocumentCrew:
    """
    Belge Analiz Ekibi

    Ajanlar:
    - Agent Alpha (Test Mimarı) - Belgeden senaryoları çıkaran
    - Manager Omega (Orkestratör) - Süreci yöneten
    """

    def __init__(self):
        self.test_architect = test_architect_agent
        self.orchestrator = orchestrator_agent

    def analyze_document(self, document_content: str, document_info: dict) -> dict:
        """
        Belgeyi analiz et ve test senaryolarını çıkar

        Args:
            document_content: Belgenin metinsel içeriği
            document_info: Belge bilgileri (filename, type, etc)

        Returns:
            Çıkarılan test senaryoları (JSON array)
        """
        print("=" * 60)
        print("🚀 Belge Analiz Ekibi Başlatılıyor...")
        print(f"📄 Belge: {document_info.get('filename', 'N/A')}")
        print(f"📊 Tür: {document_info.get('type', 'N/A')}")
        print("=" * 60)

        try:
            # Görev: Belge Analizi
            analysis_task = create_document_analysis_task(
                self.test_architect,
                document_content,
                document_info
            )

            # Crew oluştur
            crew = Crew(
                agents=[self.test_architect, self.orchestrator],
                tasks=[analysis_task],
                verbose=True,
                process=Process.sequential
            )

            # Çalıştır
            try:
                result = crew.kickoff()
            except Exception as e:
                print(f"❌ Crew execution error: {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()
                return {
                    "success": False,
                    "error": f"Crew execution error: {str(e)}",
                    "scenarios": [],
                    "document_filename": document_info.get('filename')
                }

            print("\n" + "=" * 60)
            print("✅ Belge Analizi Tamamlandı!")
            print("=" * 60)

            # Sonucu JSON olarak parse etmeyi dene
            import json
            import re

            try:
                # AI çıktısından JSON çıkarmaya çalış
                result_str = str(result).strip()

                # Eğer çıktı JSON array ile başlamıyorsa, JSON kısmını bul
                if not result_str.startswith('['):
                    # JSON array'ı bul - son '[' ile başlayan ve ']' ile biten bölüm
                    json_match = re.search(r'\[[\s\S]*\]', result_str)
                    if json_match:
                        result_str = json_match.group()
                    else:
                        print("⚠️ JSON array bulunamadı")
                        result_str = '[]'

                # JSON'ı parse et
                scenarios = json.loads(result_str)

                # Senaryo sayısını logla
                print(f"✅ {len(scenarios)} senaryo başarıyla çıkarıldı!")
                for i, scenario in enumerate(scenarios, 1):
                    print(f"   {i}. {scenario.get('title', 'Başlıksız')}")

            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parse hatası: {str(e)}")
                print(f"   Çıktı: {result_str[:500]}")
                scenarios = []
            except Exception as e:
                print(f"⚠️ Senaryo çıkarma hatası: {str(e)}")
                scenarios = []

            return {
                "success": True,
                "scenarios": scenarios if isinstance(scenarios, list) else [],
                "raw_output": str(result),
                "document_filename": document_info.get('filename'),
                "document_type": document_info.get('type'),
                "scenario_count": len(scenarios) if isinstance(scenarios, list) else 0
            }

        except Exception as e:
            print(f"\n❌ Belge analizi sırasında hata: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "scenarios": [],
                "document_filename": document_info.get('filename')
            }

    def analyze_text_requirements(self, requirement_text: str, template: str = "text", options: dict = {}) -> list:
        """
        Metin gereksinimlerini analiz et ve senaryoları çıkar (NLP Enhanced - Sembi IQ Tarzı)

        Args:
            requirement_text: Gereksinim metni
            template: Şablon tipi ('text' veya 'bdd')
            options: Ek seçenekler

        Returns:
            Çıkarılan test senaryoları listesi
        """
        print("=" * 60)
        print("🚀 NLP Geliştirilmiş Metin Analiz Başlatılıyor...")
        print(f"📝 Şablon: {template}")
        print(f"📄 Metin Uzunluğu: {len(requirement_text)} karakter")
        print("=" * 60)

        try:
            # 1. NLP Analizi (Sembi IQ Tarzı)
            print("\n🔍 NLP Analizi Yapılıyor...")
            analysis = nlp_analyzer.analyze_requirements(requirement_text)
            
            print(f"✅ Bulunan Entity'ler: {len(analysis['entities'])}")
            print(f"✅ Çıkarılan Eylemler: {len(analysis['actions'])}")
            print(f"✅ Risk Alanları: {sum(len(v) for v in analysis['risks'].values())}")
            print(f"✅ Test Türleri: {', '.join(analysis['test_types'])}")
            print(f"✅ Edge Cases: {len(analysis['edge_cases'])}")
            
            # 2. CrewAI ile detaylı analiz (opsiyonel - eğer CrewAI çalışıyorsa)
            print("\n CrewAI Ekibi ile Analiz Yapılıyor...")
            from tasks.document_analysis_tasks import create_text_analysis_task
            
            analysis_task = create_text_analysis_task(
                self.test_architect,
                requirement_text,
                template,
                options
            )

            crew = Crew(
                agents=[self.test_architect, self.orchestrator],
                tasks=[analysis_task],
                verbose=True,
                process=Process.sequential
            )

            try:
                crew_result = crew.kickoff()
                print("✅ CrewAI analizi başarılı")
            except Exception as e:
                print(f"⚠️ CrewAI hatası: {e}, NLP analizi kullanılacak...")
                crew_result = None

            # 3. Senaryo oluştur
            print("\n✨ Senaryolar Oluşturuluyor...")
            
            if crew_result:
                # CrewAI sonuçlarını kullan
                scenarios = self._parse_crew_scenarios(crew_result, template)
                if scenarios:
                    print(f"✅ CrewAI'dan {len(scenarios)} senaryo alındı")
                    return scenarios
            
            # NLP ile geliştirilmiş senaryolar oluştur
            scenarios = nlp_analyzer.generate_enhanced_scenarios(requirement_text, template)
            
            print("\n" + "=" * 60)
            print(f"✅ {len(scenarios)} Sembi IQ Tarzı Senaryo Başarıyla Oluşturuldu!")
            for i, scenario in enumerate(scenarios, 1):
                print(f"   {i}. {scenario['title']} (Priority: {scenario['priority']})")
            print("=" * 60)
            
            return scenarios

        except Exception as e:
            print(f"\n❌ Metin analizi sırasında hata: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback to basic simulation
            return self._simulate_text_analysis(requirement_text, template, options)

    def _parse_crew_scenarios(self, crew_result: str, template: str) -> list:
        """CrewAI sonuçlarını parse et"""
        import json
        import re
        
        try:
            result_str = str(crew_result).strip()
            
            # JSON array bul
            if not result_str.startswith('['):
                json_match = re.search(r'\[[\s\S]*\]', result_str)
                if json_match:
                    result_str = json_match.group()
                else:
                    return []
            
            scenarios = json.loads(result_str)
            
            # BDD format ekle gerekirse
            if template == "bdd":
                for scenario in scenarios:
                    if 'bddFormat' not in scenario:
                        scenario['bddFormat'] = f"""Feature: {scenario.get('title', 'Test')}
  Scenario: {scenario.get('title', 'Test')}
    Given sistem başlatıldı
    When işlem gerçekleştirilir
    Then {scenario.get('expectedResult', 'başarılı sonuç alınır')}"""
            
            return scenarios if isinstance(scenarios, list) else []
        
        except Exception as e:
            print(f"⚠️ Crew parse hatası: {e}")
            return []

    def _simulate_text_analysis(self, requirement_text: str, template: str, options: dict) -> list:
        """
        Metin gereksinimlerinden senaryoları simüle et
        """
        scenarios = []
        
        # Temel senaryo
        if requirement_text:
            base_scenario = {
                "title": "Temel Fonksiyonellik Testi",
                "description": "Sistem temel olarak çalışır",
                "steps": [
                    {"number": 1, "action": "Uygulamayı başlat"},
                    {"number": 2, "action": "Temel işlemi gerçekleştir"}
                ],
                "expectedResult": "İşlem başarıyla tamamlanır",
                "priority": "HIGH",
                "automationType": "UI",
                "testData": {}
            }
            
            if template == "bdd":
                base_scenario["bddFormat"] = """Feature: Temel İşlevsellik
  Scenario: Sistem temel olarak çalışır
    Given sistem başlatıldı
    When temel işlem gerçekleştirilir
    Then sistem başarıyla yanıt verir"""
            
            scenarios.append(base_scenario)

        # Login gereksinimini kontrol et
        if "login" in requirement_text.lower() or "giriş" in requirement_text.lower():
            login_scenario = {
                "title": "Kullanıcı Girişi",
                "description": "Kullanıcı sisteme başarıyla giriş yapabilir",
                "steps": [
                    {"number": 1, "action": "Login sayfasını aç"},
                    {"number": 2, "action": "Geçerli email ve şifre gir"},
                    {"number": 3, "action": "Giriş Yap butonuna tıkla"}
                ],
                "expectedResult": "Kullanıcı ana sayfaya yönlendirilir",
                "priority": "HIGH",
                "automationType": "UI",
                "testData": {"email": "test@example.com", "password": "Test123!"}
            }
            
            if template == "bdd":
                login_scenario["bddFormat"] = """Feature: Kullanıcı Yönetimi
  Scenario: Geçerli kimlik bilgileriyle giriş yapılması
    Given kullanıcı login sayfasında
    When email "test@example.com" ve şifre "Test123!" girer
    And "Giriş Yap" butonuna tıklar
    Then kullanıcı ana sayfaya yönlendirilir"""
            
            scenarios.append(login_scenario)

        # Arama gereksinimini kontrol et
        if "search" in requirement_text.lower() or "ara" in requirement_text.lower():
            search_scenario = {
                "title": "Ürün Arama",
                "description": "Kullanıcı ürün arayabilir",
                "steps": [
                    {"number": 1, "action": "Arama sayfasını aç"},
                    {"number": 2, "action": "Arama kutusuna ürün adı yaz"},
                    {"number": 3, "action": "Arama butonuna tıkla"}
                ],
                "expectedResult": "İlgili ürünler listelenir",
                "priority": "MEDIUM",
                "automationType": "UI",
                "testData": {"searchTerm": "Laptop"}
            }
            
            if template == "bdd":
                search_scenario["bddFormat"] = """Feature: Ürün Arama
  Scenario: Ürün başarıyla aranması
    Given arama sayfası açık
    When "Laptop" aranır
    Then en az bir sonuç gösterilir"""
            
            scenarios.append(search_scenario)

        # Hata yönetimi gereksinimini kontrol et
        if "hata" in requirement_text.lower() or "error" in requirement_text.lower() or "güvenlik" in requirement_text.lower():
            error_scenario = {
                "title": "Hata Durumu Yönetimi",
                "description": "Sistem hata durumlarını doğru şekilde yönetir",
                "steps": [
                    {"number": 1, "action": "Geçersiz veri gir"},
                    {"number": 2, "action": "İşlemi başlat"}
                ],
                "expectedResult": "Kullanıcı dostu hata mesajı gösterilir",
                "priority": "HIGH",
                "automationType": "UI",
                "testData": {"invalidData": True}
            }
            
            if template == "bdd":
                error_scenario["bddFormat"] = """Feature: Hata Yönetimi
  Scenario: Geçersiz giriş için hata mesajı gösterilmesi
    Given kullanıcı login sayfasında
    When boş email ve şifre ile giriş dener
    Then "Lütfen tüm alanları doldurun" hatası gösterilir"""
            
            scenarios.append(error_scenario)

        return scenarios


# Singleton instance
document_crew = DocumentCrew()
