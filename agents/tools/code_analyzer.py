"""
Code Analyzer Tool - Kod Analiz Aracı
=====================================
Test kodlarını ve selektorları analiz etmek için araç
"""

from crewai.tools import BaseTool
from typing import Type, Optional
from pydantic import BaseModel, Field
import re


class CodeAnalyzerInput(BaseModel):
    """Code analyzer input schema"""
    code: str = Field(description="Analiz edilecek kod")
    analysis_type: str = Field(
        default="general",
        description="Analiz tipi: general, selectors, security, performance"
    )
    language: Optional[str] = Field(default="javascript", description="Programlama dili")


class CodeAnalyzerTool(BaseTool):
    name: str = "Code Analyzer"
    description: str = """
    Test kodlarını ve web sayfası kodlarını analiz eden araç.

    Analiz tipleri:
    - general: Genel kod kalitesi analizi
    - selectors: CSS/XPath selector analizi ve önerileri
    - security: Güvenlik açığı taraması
    - performance: Performance sorunları tespiti
    """
    args_schema: Type[BaseModel] = CodeAnalyzerInput

    def _run(self, code: str, analysis_type: str = "general",
             language: str = "javascript") -> str:
        """Kod analizi yap"""

        if analysis_type == "selectors":
            return self._analyze_selectors(code)
        elif analysis_type == "security":
            return self._analyze_security(code)
        elif analysis_type == "performance":
            return self._analyze_performance(code)
        else:
            return self._analyze_general(code, language)

    def _analyze_selectors(self, code: str) -> str:
        """Selector analizi"""
        findings = []
        recommendations = []

        # CSS Selector patterns
        css_selectors = re.findall(r'["\']([.#]?[\w-]+(?:\s+[.#]?[\w-]+)*)["\']', code)

        # ID selectors (iyi)
        id_selectors = [s for s in css_selectors if s.startswith('#')]

        # Class selectors (orta)
        class_selectors = [s for s in css_selectors if s.startswith('.')]

        # data-testid selectors (en iyi)
        testid_selectors = re.findall(r'\[data-testid=["\']([^"\']+)["\']\]', code)

        # XPath selectors (kaçınılmalı)
        xpath_selectors = re.findall(r'xpath=([^"\']+)', code)

        findings.append(f"Bulunan ID selectors: {len(id_selectors)}")
        findings.append(f"Bulunan class selectors: {len(class_selectors)}")
        findings.append(f"Bulunan data-testid selectors: {len(testid_selectors)}")
        findings.append(f"Bulunan XPath selectors: {len(xpath_selectors)}")

        # Recommendations
        if xpath_selectors:
            recommendations.append("⚠️ XPath selectors kullanımı performansı düşürür. CSS selector tercih edin.")

        if len(testid_selectors) < len(css_selectors) / 2:
            recommendations.append("💡 data-testid attribute kullanımını artırın. Test stabilitesi için en iyi yöntemdir.")

        # Fragile selectors
        fragile_patterns = [
            r'\.[\w-]+\s+\.[\w-]+\s+\.[\w-]+',  # Deep nested classes
            r'nth-child\(\d+\)',  # nth-child
            r'nth-of-type\(\d+\)',  # nth-of-type
        ]

        for pattern in fragile_patterns:
            matches = re.findall(pattern, code)
            if matches:
                recommendations.append(f"⚠️ Kırılgan selector bulundu: {matches[:3]}")

        output = f"""
=== SELECTOR ANALİZİ ===

BULGULAR:
{chr(10).join(f'  - {f}' for f in findings)}

ÖNERİLER:
{chr(10).join(f'  {r}' for r in recommendations) if recommendations else '  ✅ Selector kullanımı iyi görünüyor'}

EN İYİ PRATİKLER:
  1. data-testid attribute kullanın
  2. ID selector tercih edin
  3. Derin nested selector'lardan kaçının
  4. XPath yerine CSS selector kullanın
  5. Dynamic class'lardan kaçının

===========================
"""
        return output

    def _analyze_security(self, code: str) -> str:
        """Güvenlik analizi"""
        vulnerabilities = []

        # XSS patterns
        xss_patterns = [
            (r'innerHTML\s*=', "innerHTML kullanımı XSS riski taşır"),
            (r'document\.write\(', "document.write XSS'e açıktır"),
            (r'eval\(', "eval() kullanımı tehlikelidir"),
            (r'setTimeout\(["\']', "String ile setTimeout XSS riski"),
            (r'v-html=', "Vue v-html XSS riski"),
            (r'dangerouslySetInnerHTML', "React dangerouslySetInnerHTML XSS riski"),
        ]

        for pattern, message in xss_patterns:
            if re.search(pattern, code):
                vulnerabilities.append(f"🔴 HIGH: {message}")

        # SQL Injection patterns
        sql_patterns = [
            (r'query\s*\+\s*["\']', "String concatenation SQL injection riski"),
            (r'execute\([^?]+\+', "Parametresiz SQL query"),
        ]

        for pattern, message in sql_patterns:
            if re.search(pattern, code):
                vulnerabilities.append(f"🔴 CRITICAL: {message}")

        # Sensitive data exposure
        sensitive_patterns = [
            (r'password\s*=\s*["\'][^"\']+["\']', "Hardcoded password"),
            (r'api[_-]?key\s*=\s*["\'][^"\']+["\']', "Hardcoded API key"),
            (r'secret\s*=\s*["\'][^"\']+["\']', "Hardcoded secret"),
        ]

        for pattern, message in sensitive_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                vulnerabilities.append(f"🟠 MEDIUM: {message}")

        output = f"""
=== GÜVENLİK ANALİZİ ===

BULUNAN AÇIKLAR: {len(vulnerabilities)}

{chr(10).join(f'  {v}' for v in vulnerabilities) if vulnerabilities else '  ✅ Belirgin güvenlik açığı bulunamadı'}

KONTROL LİSTESİ:
  {'✅' if not any('XSS' in v for v in vulnerabilities) else '❌'} XSS Koruması
  {'✅' if not any('SQL' in v for v in vulnerabilities) else '❌'} SQL Injection Koruması
  {'✅' if not any('Hardcoded' in v for v in vulnerabilities) else '❌'} Credential Güvenliği

===========================
"""
        return output

    def _analyze_performance(self, code: str) -> str:
        """Performance analizi"""
        issues = []

        # Performance anti-patterns
        patterns = [
            (r'for\s*\([^)]+\)\s*\{[^}]*querySelector', "Loop içinde DOM query - performans sorunu"),
            (r'setTimeout\([^,]+,\s*0\)', "setTimeout(0) anti-pattern"),
            (r'\.forEach\([^)]+\)\s*{[^}]*await', "forEach içinde await - Promise.all kullanın"),
            (r'JSON\.parse\(JSON\.stringify', "Deep clone için JSON - structuredClone kullanın"),
            (r'document\.querySelectorAll\([^)]+\)\.forEach', "querySelectorAll().forEach - for...of kullanın"),
        ]

        for pattern, message in patterns:
            if re.search(pattern, code):
                issues.append(f"⚠️ {message}")

        # Large file warning
        if len(code) > 10000:
            issues.append("📦 Dosya çok büyük - modüllere ayırmayı düşünün")

        output = f"""
=== PERFORMANCE ANALİZİ ===

BULUNAN SORUNLAR: {len(issues)}

{chr(10).join(f'  {i}' for i in issues) if issues else '  ✅ Belirgin performance sorunu bulunamadı'}

ÖNERİLER:
  - DOM query'leri cache'leyin
  - Event delegation kullanın
  - Debounce/throttle uygulayın
  - Virtual scrolling düşünün
  - Code splitting yapın

===========================
"""
        return output

    def _analyze_general(self, code: str, language: str) -> str:
        """Genel kod analizi"""
        metrics = {
            "lines": len(code.split('\n')),
            "characters": len(code),
            "functions": len(re.findall(r'function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(', code)),
            "classes": len(re.findall(r'class\s+\w+', code)),
            "comments": len(re.findall(r'//.*|/\*[\s\S]*?\*/', code)),
            "todos": len(re.findall(r'TODO|FIXME|HACK|XXX', code, re.IGNORECASE))
        }

        output = f"""
=== GENEL KOD ANALİZİ ===

METRİKLER:
  - Toplam satır: {metrics['lines']}
  - Karakter sayısı: {metrics['characters']}
  - Fonksiyon sayısı: {metrics['functions']}
  - Class sayısı: {metrics['classes']}
  - Yorum sayısı: {metrics['comments']}
  - TODO/FIXME sayısı: {metrics['todos']}

YORUM ORANI: {round(metrics['comments'] / max(metrics['lines'], 1) * 100, 1)}%

DEĞERLENDİRME:
  {'✅ İyi' if metrics['comments'] / max(metrics['lines'], 1) > 0.1 else '⚠️ Daha fazla yorum ekleyin'}

===========================
"""
        return output
