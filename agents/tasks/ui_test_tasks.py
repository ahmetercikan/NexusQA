"""
UI Test Tasks - Web UI Test Görevleri
=====================================
Playwright tabanlı UI test görevleri
"""

from crewai import Task


def create_test_planning_task(orchestrator_agent, project_info: dict) -> Task:
    """
    Orkestratör için test planlama görevi oluşturur

    Args:
        orchestrator_agent: Manager Omega agent
        project_info: Proje bilgileri (name, base_url, description)
    """
    return Task(
        description=f"""
        Aşağıdaki proje için kapsamlı bir test planı oluştur:

        PROJE BİLGİLERİ:
        - Proje Adı: {project_info.get('name', 'Bilinmiyor')}
        - Base URL: {project_info.get('base_url', 'Belirtilmemiş')}
        - Açıklama: {project_info.get('description', 'Açıklama yok')}

        YAPILACAKLAR:

        1. TEST KAPSAMI BELİRLE:
           - Hangi modüller test edilecek?
           - Hangi kullanıcı senaryoları kapsanacak?
           - Kritik iş akışları neler?

        2. TEST STRATEJİSİ OLUŞTUR:
           - Smoke testler (temel fonksiyon kontrolü)
           - Regression testler (mevcut fonksiyonlar)
           - E2E testler (uçtan uca akışlar)
           - Negatif testler (hata senaryoları)

        3. ÖNCELİKLENDİRME YAP:
           - Critical: İş sürekliliğini etkileyen
           - High: Önemli kullanıcı akışları
           - Medium: Standart fonksiyonlar
           - Low: Kozmetik ve UX detayları

        4. GÖREV DAĞILIMI:
           - Agent Alpha (Test Mimarı): Test senaryoları ve Playwright scriptleri
           - DevBot Beta (Yazılımcı): Hata analizi ve düzeltme önerileri
           - SecBot Delta (Güvenlik): Güvenlik taraması

        5. ZAMAN TAHMİNİ:
           - Her görev için tahmini süre

        ÇIKTI: Detaylı test planı ve görev listesi
        """,
        agent=orchestrator_agent,
        expected_output="""
        Detaylı test planı içeren bir rapor:
        1. Test kapsamı ve modül listesi
        2. Test stratejisi ve yaklaşım
        3. Önceliklendirilmiş test senaryoları listesi
        4. Görev dağılımı tablosu
        5. Tahmini timeline
        """
    )


def create_ui_test_task(test_architect_agent, test_plan: str, test_suite: dict) -> Task:
    """
    Test Mimarı için UI test senaryosu oluşturma görevi

    Args:
        test_architect_agent: Agent Alpha
        test_plan: Orkestratörden gelen test planı
        test_suite: Test suite bilgileri
    """
    return Task(
        description=f"""
        Aşağıdaki test planına göre Playwright test senaryoları oluştur:

        TEST SUITE:
        - Suite Adı: {test_suite.get('name', 'Test Suite')}
        - Tip: {test_suite.get('type', 'UI')}
        - Açıklama: {test_suite.get('description', '')}

        TEST PLANI:
        {test_plan}

        YAPILACAKLAR:

        1. TEST SENARYOLARI TASARLA:
           Her senaryo için:
           - ID: TC-XXX formatında
           - Başlık: Kısa ve açıklayıcı
           - Önkoşullar: Gerekli setup
           - Adımlar: Given-When-Then formatında
           - Beklenen Sonuç: Doğrulama kriterleri
           - Öncelik: Critical/High/Medium/Low
           - Test Data: Gerekli test verileri

        2. PLAYWRIGHT SCRIPT YAZ:
           - Page Object Model pattern kullan
           - Her test için ayrı describe bloğu
           - Assertions anlamlı ve kapsamlı olsun
           - Screenshot ve video kaydı ekle
           - Timeout'ları uygun ayarla
           - data-testid selector'ları tercih et

        3. TEST DATA HAZIRLA:
           - Pozitif senaryolar için geçerli data
           - Negatif senaryolar için geçersiz data
           - Edge case'ler için sınır değerler

        ÇIKTI:
        1. Test senaryoları listesi (JSON formatında)
        2. Playwright test kodu
        3. Test data dosyası
        """,
        agent=test_architect_agent,
        expected_output="""
        1. Test Senaryoları:
           - En az 5 test senaryosu
           - Her senaryo detaylı adımlarla

        2. Playwright Kodu:
           - Çalışır durumda test scripti
           - POM pattern ile yazılmış
           - Yorumlu ve okunabilir

        3. Test Data:
           - Senaryo bazlı test verileri
        """
    )


def create_test_execution_task(test_architect_agent, playwright_code: str, base_url: str) -> Task:
    """
    Test çalıştırma ve sonuç raporlama görevi

    Args:
        test_architect_agent: Agent Alpha
        playwright_code: Yazılmış Playwright kodu
        base_url: Test edilecek URL
    """
    return Task(
        description=f"""
        Aşağıdaki Playwright testlerini çalıştır ve sonuçları raporla:

        BASE URL: {base_url}

        PLAYWRIGHT KODU:
        {playwright_code[:2000]}...

        YAPILACAKLAR:

        1. TEST ÇALIŞTIRMA:
           - Headless modda çalıştır
           - Her test için screenshot al
           - Hata durumunda video kaydet
           - Network loglarını kaydet

        2. SONUÇ ANALİZİ:
           - Başarılı testleri listele
           - Başarısız testleri detaylandır
           - Hata mesajlarını açıkla
           - Execution time'ları raporla

        3. HATA RAPORU:
           - Her hata için:
             * Hangi test
             * Hangi adımda
             * Hata mesajı
             * Screenshot linki
             * Olası kök neden

        4. ÖNERİLER:
           - Düzeltilmesi gereken alanlar
           - Selector iyileştirmeleri
           - Test coverage boşlukları

        ÇIKTI: Detaylı test execution raporu
        """,
        agent=test_architect_agent,
        expected_output="""
        Test Execution Raporu:
        1. Özet: X başarılı, Y başarısız, Z atlandı
        2. Başarılı Testler listesi
        3. Başarısız Test Detayları (hata açıklamaları ile)
        4. Performance metrikleri
        5. İyileştirme önerileri
        """
    )
