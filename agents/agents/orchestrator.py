"""
Manager Omega - Orkestra Şefi
=============================
Görev: Ekibi koordine etmek, görev dağıtımı yapmak, öncelikleri belirlemek
"""

from crewai import Agent
import sys
import os

# Parent dizini path'e ekle
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import llm


class ManagerOmega:
    """Orkestra Şefi - Proje Yöneticisi"""

    def __init__(self):
        self.agent = self._create_agent()

    def _create_agent(self) -> Agent:
        return Agent(
            role='Test Orkestra Şefi ve Proje Yöneticisi',
            goal='Test ekibini koordine etmek, görevleri dağıtmak ve test sürecini optimize etmek',
            backstory="""Sen deneyimli bir QA yöneticisi ve test orkestra şefisin.

            Uzmanlık Alanların:
            - Test stratejisi oluşturma ve yönetme
            - Ekip koordinasyonu ve görev dağıtımı
            - Önceliklendirme ve kaynak yönetimi
            - Risk analizi ve test planlaması
            - Stakeholder iletişimi

            Çalışma Tarzın:
            - Her test projesinde önce kapsamı analiz edersin
            - Kritik yolları belirler, öncelikleri sıralarsın
            - Test Mimarına (Alpha) teknik gereksinimleri iletirsin
            - Yazılımcıya (Beta) hata düzeltme önceliklerini bildirirsin
            - Güvenlik Analistine (Delta) risk alanlarını gösterirsin
            - Tüm süreci izler, darboğazları tespit edersin

            İletişim:
            - Net ve öz talimatlar verirsin
            - Her göreve deadline ve öncelik atarsın
            - İlerlemeyi düzenli takip edersin""",
            verbose=True,
            allow_delegation=True,  # Diğer ajanlara görev atayabilir
            llm=llm
        )

    def get_agent(self) -> Agent:
        return self.agent


# Singleton instance
orchestrator_agent = ManagerOmega().get_agent()
