"""
API Test Tasks - API Test Görevleri
===================================
REST API test görevleri
"""

from crewai import Task


def create_api_test_task(test_architect_agent, api_spec: dict) -> Task:
    """
    API test senaryoları oluşturma görevi

    Args:
        test_architect_agent: Agent Alpha
        api_spec: API spesifikasyonu (endpoints, methods, etc.)
    """
    endpoints = api_spec.get('endpoints', [])
    base_url = api_spec.get('base_url', '')

    endpoints_str = "\n".join([
        f"- {e.get('method', 'GET')} {e.get('path', '/')} - {e.get('description', '')}"
        for e in endpoints
    ]) if endpoints else "Endpoint bilgisi yok"

    return Task(
        description=f"""
        Aşağıdaki API'ler için kapsamlı test senaryoları oluştur:

        API BASE URL: {base_url}

        ENDPOINTS:
        {endpoints_str}

        YAPILACAKLAR:

        1. HER ENDPOINT İÇİN TEST SENARYOLARI:
           a) Pozitif Testler:
              - Geçerli request ile başarılı response
              - Tüm required field'lar dolu
              - Farklı geçerli değer kombinasyonları

           b) Negatif Testler:
              - Eksik required field'lar
              - Yanlış veri tipleri
              - Geçersiz değerler
              - Boş request body

           c) Edge Cases:
              - Maximum/minimum değerler
              - Özel karakterler
              - Unicode karakterler
              - Çok büyük payload'lar

           d) Error Handling:
              - 400 Bad Request senaryoları
              - 401 Unauthorized
              - 403 Forbidden
              - 404 Not Found
              - 500 Internal Server Error

        2. TEST KODU YAZ:
           - Python requests veya httpx kullan
           - Her test için assertions
           - Response time kontrolü
           - Status code doğrulama
           - Response schema validation
           - Header kontrolü

        3. TEST DATA:
           - Her senaryo için örnek request/response
           - Valid ve invalid data setleri

        ÇIKTI: API test senaryoları ve test kodu
        """,
        agent=test_architect_agent,
        expected_output="""
        1. Test Senaryoları:
           - Her endpoint için en az 5 senaryo
           - Pozitif ve negatif test coverage

        2. Test Kodu:
           - Python test scripti
           - pytest formatında
           - Parametrize edilmiş testler

        3. Test Data:
           - JSON formatında test verileri
           - Valid/invalid örnek setler
        """
    )


def create_api_validation_task(developer_agent, api_response: dict, expected: dict) -> Task:
    """
    API response doğrulama ve hata analizi görevi

    Args:
        developer_agent: DevBot Beta
        api_response: Gerçek API response
        expected: Beklenen response
    """
    return Task(
        description=f"""
        API response'unu analiz et ve sorunları tespit et:

        GERÇEK RESPONSE:
        Status: {api_response.get('status_code', 'N/A')}
        Headers: {api_response.get('headers', {})}
        Body: {api_response.get('body', {})}

        BEKLENEN:
        Status: {expected.get('status_code', 'N/A')}
        Body Schema: {expected.get('schema', {})}

        YAPILACAKLAR:

        1. RESPONSE ANALİZİ:
           - Status code doğru mu?
           - Response time kabul edilebilir mi?
           - Content-Type header doğru mu?

        2. BODY DOĞRULAMA:
           - Beklenen tüm field'lar var mı?
           - Veri tipleri doğru mu?
           - Değerler mantıklı mı?
           - Extra field var mı?

        3. HATA TESPİTİ:
           - Schema uyumsuzlukları
           - Eksik veya fazla field'lar
           - Yanlış veri formatları
           - Business logic hataları

        4. KÖK NEDEN ANALİZİ:
           - Hata nereden kaynaklanıyor?
           - Backend mi, veritabanı mı, config mi?
           - Düzeltme önerisi

        ÇIKTI: Detaylı API validasyon raporu
        """,
        agent=developer_agent,
        expected_output="""
        API Validasyon Raporu:
        1. Uyumluluk Durumu: PASSED/FAILED
        2. Bulunan Sorunlar listesi
        3. Her sorun için kök neden analizi
        4. Düzeltme önerileri
        5. Öncelik sıralaması
        """
    )
