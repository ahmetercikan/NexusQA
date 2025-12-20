"""
Security Tasks - Güvenlik Test Görevleri
========================================
OWASP Top 10 ve güvenlik tarama görevleri
"""

from crewai import Task


def create_security_scan_task(security_agent, target: dict) -> Task:
    """
    Güvenlik tarama görevi

    Args:
        security_agent: SecBot Delta
        target: Hedef bilgileri (url, endpoints, forms)
    """
    url = target.get('url', '')
    endpoints = target.get('endpoints', [])
    forms = target.get('forms', [])

    return Task(
        description=f"""
        Aşağıdaki hedef için güvenlik taraması yap:

        HEDEF URL: {url}
        ENDPOINTS: {endpoints}
        FORMLAR: {forms}

        OWASP TOP 10 KONTROL LİSTESİ:

        1. A01:2021 - BROKEN ACCESS CONTROL
           - URL manipülasyonu ile yetkisiz erişim
           - IDOR (Insecure Direct Object Reference)
           - Privilege escalation denemeleri
           - Force browsing (/admin, /backup, etc.)

        2. A02:2021 - CRYPTOGRAPHIC FAILURES
           - HTTPS kullanımı kontrolü
           - Hassas veri şifreleme durumu
           - Zayıf şifreleme algoritmaları
           - API key'lerin exposure'ı

        3. A03:2021 - INJECTION
           - SQL Injection testleri
           - XSS (Reflected, Stored, DOM-based)
           - Command Injection
           - LDAP Injection
           - Template Injection

        4. A04:2021 - INSECURE DESIGN
           - Business logic bypass
           - Rate limiting eksikliği
           - Insufficient anti-automation

        5. A05:2021 - SECURITY MISCONFIGURATION
           - Default credentials
           - Unnecessary features enabled
           - Error messages information disclosure
           - Missing security headers

        6. A06:2021 - VULNERABLE COMPONENTS
           - Outdated libraries
           - Known CVEs
           - Unpatched frameworks

        7. A07:2021 - AUTH FAILURES
           - Brute force protection
           - Session management
           - Password policy
           - MFA bypass attempts

        8. A08:2021 - DATA INTEGRITY FAILURES
           - Unsigned data acceptance
           - Deserialization attacks
           - CI/CD pipeline integrity

        9. A09:2021 - LOGGING & MONITORING FAILURES
           - Audit log existence
           - Security event logging
           - Log injection

        10. A10:2021 - SSRF
            - Internal network access
            - Cloud metadata access
            - Protocol smuggling

        HER KONTROL İÇİN:
        - Test yöntemi
        - Kullanılan payload'lar
        - Sonuç (Vulnerable/Safe/N/A)
        - Severity (Critical/High/Medium/Low/Info)
        - PoC (varsa)
        - Remediation önerisi

        ÇIKTI: Detaylı güvenlik tarama raporu
        """,
        agent=security_agent,
        expected_output="""
        Güvenlik Tarama Raporu:

        1. Executive Summary:
           - Toplam bulunan açık sayısı
           - Severity dağılımı
           - Risk skoru

        2. Detaylı Bulgular:
           - Her açık için detaylı rapor
           - PoC ve screenshot'lar
           - CVSS skorları

        3. Remediation Planı:
           - Öncelik sırasına göre düzeltmeler
           - Tahmini effort

        4. Appendix:
           - Test metodolojisi
           - Kullanılan araçlar
           - Test scope ve sınırlamalar
        """
    )


def create_vulnerability_report_task(security_agent, vulnerabilities: list) -> Task:
    """
    Güvenlik açığı raporlama görevi

    Args:
        security_agent: SecBot Delta
        vulnerabilities: Bulunan açıklar listesi
    """
    vuln_str = "\n".join([
        f"- {v.get('name', 'Unknown')}: {v.get('severity', 'N/A')} - {v.get('location', 'N/A')}"
        for v in vulnerabilities
    ]) if vulnerabilities else "Açık listesi boş"

    return Task(
        description=f"""
        Bulunan güvenlik açıkları için detaylı rapor hazırla:

        BULUNAN AÇIKLAR:
        {vuln_str}

        HER AÇIK İÇİN DETAYLI RAPOR HAZIRLA:

        1. VULNERABILITY DETAILS:
           - ID: SEC-XXX
           - Başlık: Açık adı
           - Severity: Critical/High/Medium/Low/Info
           - CVSS v3.1 Score: X.X
           - CVSS Vector: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
           - CWE ID: CWE-XXX
           - OWASP Category: A0X

        2. AFFECTED ASSET:
           - URL/Endpoint
           - Parametre adı
           - HTTP Method
           - Authentication required: Yes/No

        3. DESCRIPTION:
           - Açığın detaylı açıklaması
           - Nasıl keşfedildiği
           - Potansiyel etki

        4. PROOF OF CONCEPT:
           - Request örneği
           - Response örneği
           - Screenshot (varsa)
           - Video (varsa)

        5. IMPACT:
           - Confidentiality etkisi
           - Integrity etkisi
           - Availability etkisi
           - Business impact

        6. REMEDIATION:
           - Kısa vadeli önlem
           - Uzun vadeli çözüm
           - Kod örneği
           - Referans dökümanlar

        7. REFERENCES:
           - OWASP link
           - CWE link
           - İlgili CVE'ler
           - Best practice guides

        ÇIKTI: Profesyonel güvenlik açığı raporu
        """,
        agent=security_agent,
        expected_output="""
        Profesyonel Güvenlik Raporu:
        1. Her açık için ayrı detaylı sayfa
        2. Executive summary
        3. Risk matrisi
        4. Remediation timeline önerisi
        5. Compliance mapping (PCI-DSS, GDPR, etc.)
        """
    )
