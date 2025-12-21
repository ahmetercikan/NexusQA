"""
Agent Epsilon - Rapor Analisti
===============================
Görev: Test raporlarını analiz etmek, metrikler üretmek, iyileştirme önerileri sunmak
"""

from crewai import Agent
import sys
import os

# Parent dizini path'e ekle
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import llm


class AgentEpsilon:
    """Rapor Analisti - Test Raporlama Uzmanı"""

    def __init__(self):
        self.agent = self._create_agent()

    def _create_agent(self) -> Agent:
        return Agent(
            role='Test Raporlama Uzmanı ve Metrik Analisti',
            goal='Test sonuçlarını analiz edip anlamlı içgörüler ve iyileştirme önerileri sunmak',
            backstory="""Sen deneyimli bir test raporlama ve analiz uzmanısın.
            Yıllarca QA ekiplerinde çalıştın ve test metriklerini yorumlamada uzmansın.

            Uzmanlık Alanların:
            - Test sonuçları derinlemesine analizi
            - Trend tespiti ve pattern tanıma
            - Başarısız testlerdeki ortak paternleri bulma
            - Actionable iyileştirme önerileri sunma
            - Test coverage ve kapsam analizi
            - Performance metrikleri yorumlama

            Çalışma Tarzın:
            - Rakamları konuşturma
            - Karmaşık test verilerini basit insights'a dönüştürme
            - QA süreçlerini optimize etme
            - Tutarlı ve objektif analizler yapma
            - Risk alanlarını belirleme ve raporlama""",
            verbose=True,
            allow_delegation=False,
            llm=llm
        )

    def get_agent(self) -> Agent:
        return self.agent


# Singleton instance
report_analyst_agent = AgentEpsilon().get_agent()


# Backward compatibility için eski fonksiyonu tut
def create_report_analyst() -> Agent:
    """
    Rapor analizi ve yorumlama yapan agent oluşturur (deprecated, use report_analyst_agent instead)
    """
    return report_analyst_agent


def analyze_test_report(context: dict) -> str:
    """
    Test raporu bağlamını analiz eder ve insights döner

    Args:
        context: Test run verileri (totalRuns, passedTests, failedTests, etc.)

    Returns:
        str: Analiz sonucu ve öneriler
    """
    total_runs = context.get('totalRuns', 0)
    passed = context.get('passedTests', 0)
    failed = context.get('failedTests', 0)
    avg_duration = context.get('averageDuration', 0)

    if total_runs == 0:
        return "Henüz test koşumu yapılmamış. Analiz için test verisi bekleniyor."

    success_rate = (passed / total_runs * 100) if total_runs > 0 else 0

    analysis = f"""
📊 **Test Raporu Analizi**

**Genel Bakış:**
• Toplam Test Koşumu: {total_runs}
• Başarılı: {passed} (%{success_rate:.1f})
• Başarısız: {failed} (%{100-success_rate:.1f})
• Ortalama Süre: {avg_duration}ms ({avg_duration/1000:.1f}s)

**Değerlendirme:**
"""

    # Success rate değerlendirmesi
    if success_rate >= 95:
        analysis += "✅ **Mükemmel!** Test başarı oranınız çok yüksek.\n"
    elif success_rate >= 80:
        analysis += "⚠️ **İyi ama geliştirilebilir.** Başarısız testlere odaklanın.\n"
    else:
        analysis += "🔴 **Kritik!** Test başarı oranı düşük, acil müdahale gerekli.\n"

    # Performance değerlendirmesi
    if avg_duration > 10000:
        analysis += "⏱️ **Yavaş testler:** Ortalama test süresi 10 saniyenin üzerinde.\n"
    elif avg_duration > 5000:
        analysis += "⏱️ **Orta performans:** Test süreleri optimize edilebilir.\n"
    else:
        analysis += "⚡ **Hızlı testler:** Test performansı iyi durumda.\n"

    analysis += "\n**Öneriler:**\n"

    if failed > 0:
        analysis += "1. Başarısız testlerin error message'larını inceleyin\n"
        analysis += "2. Element selector'ların güncel olduğundan emin olun\n"
        analysis += "3. Timeout değerlerini gözden geçirin\n"

    if avg_duration > 5000:
        analysis += f"4. Test süresini {avg_duration - 3000}ms azaltmayı hedefleyin\n"
        analysis += "5. Gereksiz wait'leri kaldırın\n"
        analysis += "6. Paralel test koşumu düşünün\n"

    return analysis
