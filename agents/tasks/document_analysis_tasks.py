"""
Document Analysis Tasks
=======================
Belgelerden senaryo çıkarmak ve kod üretmek için görevler
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crewai import Task


def create_document_analysis_task(agent, document_content: str, document_info: dict) -> Task:
    """
    Belgeden test senaryoları çıkar - ULTRA MINIMAL VERSIYA
    """
    desc = "Analyze this document and extract test scenarios as JSON array:\n\n" + document_content[:5000] + "\n\nReturn ONLY valid JSON array of test scenarios."

    return Task(
        description=desc,
        expected_output="JSON array of test scenarios",
        agent=agent
    )


def create_code_generation_task(agent, scenario: dict, test_suite_info: dict) -> Task:
    """
    Test senaryosu için Playwright otomatikleştirme kodu üret

    Args:
        agent: Atanan agent (Developer)
        scenario: Test senaryosu objesi
        test_suite_info: Test suite bilgileri

    Returns:
        Yapılandırılmış Task
    """
    base_url = test_suite_info.get('baseUrl', 'http://localhost:3000')
    target_url = scenario.get('targetUrl', base_url)
    test_data = scenario.get('testData', {})
    title = scenario.get('title', 'Test Senaryosu')
    safe_title = title.replace("'", "\\'")

    # Test data'yı string'e çevir
    test_data_str = ""
    if test_data and isinstance(test_data, dict):
        test_data_items = []
        for k, v in test_data.items():
            if v:
                test_data_items.append(f"      {k}: '{v}'")
        if test_data_items:
            test_data_str = "const testData = {\n" + ",\n".join(test_data_items) + "\n    };"

    return Task(
        description=f"""
Sen bir Playwright test otomasyon uzmanısın. Aşağıdaki test senaryosu için ÇALIŞIR Playwright test kodu yaz.

=== SENARYO BİLGİLERİ ===
Başlık: {title}
Açıklama: {scenario.get('description', '')}
Hedef URL: {target_url}

=== TEST ADIMLARI ===
{format_steps(scenario.get('steps', []))}

=== BEKLENEN SONUÇ ===
{scenario.get('expectedResult', 'İşlem başarılı olmalı')}

=== ÖN KOŞULLAR ===
{scenario.get('preconditions', 'Yok')}

=== TEST VERİLERİ ===
{test_data}

=== ÖNEMLİ KURALLAR ===
1. SADECE JavaScript kodu döndür - başka metin, açıklama veya markdown YAZMA
2. Kodun başında import {{ test, expect }} from '@playwright/test'; olsun
3. Her adım için Türkçe yorum ekle
4. Geçerli selector'lar kullan: [data-testid="..."], [placeholder="..."], button:has-text("..."), input[type="..."]
5. Her await ifadesinden sonra kısa bekleme ekle: await page.waitForTimeout(500);
6. Assertion'lar ekle: toBeVisible(), toHaveText(), toHaveURL() vb.
7. Test adları için ÇIFT TIRNAK kullan: test("Test Adı", ...) - Türkçe ekler ('e, 'ın, 'a) için gerekli

=== ÇIKTI FORMATI ===
import {{ test, expect }} from '@playwright/test';

test.describe("{safe_title}", () => {{
  test("{safe_title}", async ({{ page }}) => {{
    {test_data_str if test_data_str else '// Test verisi tanımla'}

    // Adım 1: Sayfaya git
    await page.goto('{target_url}');
    await page.waitForLoadState('networkidle');

    // Adım 2-N: Senaryodaki her adımı implement et
    // ... her adım için kod yaz ...

    // Son: Beklenen sonucu doğrula
    // await expect(...).toBeVisible();
  }});
}});

SADECE KOD DÖNDÜR, BAŞKA BİR ŞEY YAZMA:
        """,
        expected_output="Çalışır Playwright test kodu (sadece JavaScript, açıklama yok)",
        agent=agent
    )


def format_steps(steps):
    """
    Adımları okunaklı formata dönüştür
    """
    if not steps:
        return "Adımlar belirtilmemiş"

    if isinstance(steps, list):
        if all(isinstance(s, dict) for s in steps):
            return "\n".join([f"{i+1}. {s.get('description', s.get('action', 'N/A'))}"
                            for i, s in enumerate(steps)])
        else:
            return "\n".join([f"{i+1}. {s}" for i, s in enumerate(steps)])

    return str(steps)

def create_text_analysis_task(agent, requirement_text: str, template: str = "text", options: dict = {}) -> Task:
    """
    Metin gereksinimlerinden test senaryoları çıkar
    
    Args:
        agent: Test Mimarı Agent
        requirement_text: Analiz edilecek metin
        template: 'text' veya 'bdd' şablonu
        options: Ek seçenekler (include_bdd_format, include_edge_cases, include_security_tests)
    
    Returns:
        Task
    """
    bdd_instruction = ""
    if template == "bdd" or options.get('include_bdd_format'):
        bdd_instruction = "\n\nEach scenario should also include 'bddFormat' field with Gherkin syntax (Feature, Scenario, Given-When-Then)."
    
    edge_cases_instruction = ""
    if options.get('include_edge_cases'):
        edge_cases_instruction = "\n- Include edge cases and boundary conditions"
    
    security_instruction = ""
    if options.get('include_security_tests'):
        security_instruction = "\n- Include security-related test scenarios"
    
    description = f"""
    Analyze the following text requirements and extract comprehensive test scenarios.
    IMPORTANT: Each step MUST be SPECIFIC and ACTIONABLE - no vague descriptions.
    
    TEXT REQUIREMENTS:
    {requirement_text}
    
    REQUIREMENTS:
    1. Extract AT LEAST 5-8 test scenarios from the text
    2. Each scenario MUST have:
       - title: Clear, descriptive name (e.g., "Valid Search with Enter Key")
       - description: What is being tested
       - steps: Array of objects with "number", "action", and "value" (optional) fields
         * Each step action should be specific (e.g., "Type 'OpenAI' into search box" not just "Type text")
         * Include the values/data in the action description where applicable
         * Example steps: ["Type 'example@gmail.com' in email field", "Click 'Sign In' button", "Press Enter key", "Verify 'Welcome' message appears"]
       - expectedResult: What should happen (specific, verifiable)
       - priority: "CRITICAL", "HIGH", "MEDIUM", or "LOW"
       - automationType: "UI" or "API"
       - testData: Object with test data (e.g., {{"searchTerm": "OpenAI", "email": "test@example.com"}})
       - preconditions: (optional) Prerequisites for the test
    3. Include positive tests (happy path) AND negative tests (error scenarios){edge_cases_instruction}{security_instruction}
    4. Steps should be detailed, specific, and in correct order
    5. Return ONLY a valid JSON array - no other text{bdd_instruction}
    
    STEP SPECIFICITY RULES:
    - Instead of "Enter text", write: "Type 'OpenAI' into the search box"
    - Instead of "Click button", write: "Click the 'Search' button"
    - Include test data values directly in step descriptions
    - Be explicit about UI elements (buttons, fields, links, etc.)
    
    RETURN FORMAT:
    [
      {{
        "title": "Valid Search with Enter Key",
        "description": "User searches for a term and submits with Enter key",
        "steps": [
          {{"number": 1, "action": "Navigate to Google homepage"}},
          {{"number": 2, "action": "Type 'OpenAI' into the search box"}},
          {{"number": 3, "action": "Press Enter key"}},
          {{"number": 4, "action": "Verify search results appear"}}
        ],
        "expectedResult": "Search results for 'OpenAI' are displayed",
        "priority": "HIGH",
        "automationType": "UI",
        "testData": {{"searchTerm": "OpenAI"}},
        "preconditions": "Browser is open and Google homepage is accessible"
      }},
      {{
        "title": "Search with Special Characters",
        "description": "User searches with special characters",
        "steps": [
          {{"number": 1, "action": "Navigate to Google homepage"}},
          {{"number": 2, "action": "Type '@#$%' into the search box"}},
          {{"number": 3, "action": "Press Enter key"}},
          {{"number": 4, "action": "Verify search results or error message appears"}}
        ],
        "expectedResult": "System handles special characters appropriately",
        "priority": "MEDIUM",
        "automationType": "UI",
        "testData": {{"searchTerm": "@#$%"}},
        "preconditions": "Browser is open and Google homepage is accessible"
      }}
    ]
    
    Generate the scenarios now:
    """
    
    return Task(
        description=description,
        expected_output="JSON array of test scenarios with specific, actionable steps",
        agent=agent
    )

