"""
FastAPI Endpoints - REST API
============================
CrewAI ajanlarını tetiklemek için REST endpointleri
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import httpx
from datetime import datetime

from config import API_HOST, API_PORT, BACKEND_URL
from utils.cost_calculator import extract_usage_from_openai_response

# FastAPI App
app = FastAPI(
    title="Nexus QA - CrewAI API",
    description="AI-powered Test Automation Agents API",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router
from fastapi import APIRouter
router = APIRouter()  # No prefix - endpoints directly under root

# ============================================================
# PYDANTIC MODELS
# ============================================================

class ProjectInfo(BaseModel):
    name: str
    base_url: Optional[str] = None
    description: Optional[str] = None


class TestSuiteInfo(BaseModel):
    name: str
    type: str = "UI"
    description: Optional[str] = None


class APIEndpoint(BaseModel):
    method: str = "GET"
    path: str
    description: Optional[str] = None


class APISpec(BaseModel):
    base_url: str
    endpoints: List[APIEndpoint] = []


class SecurityTarget(BaseModel):
    url: str
    endpoints: List[str] = []
    forms: List[str] = []


class DocumentAnalysisRequest(BaseModel):
    document_content: str
    document_info: Dict[str, Any]
    suite_id: Optional[int] = None
    template: str = "text"  # 'text' or 'bdd'
    options: Optional[Dict[str, Any]] = {}


class TextAnalysisRequest(BaseModel):
    requirement_text: str
    template: str = "text"  # 'text' or 'bdd'
    options: Optional[Dict[str, Any]] = {}


class AutomationGenerationRequest(BaseModel):
    scenario: Dict[str, Any]
    test_suite_info: Dict[str, Any]
    backend_document_id: Optional[int] = None
    backend_scenario_id: Optional[int] = None


class RunTestRequest(BaseModel):
    agent_type: str  # test_architect, developer, orchestrator, security
    suite_id: Optional[int] = None
    options: Optional[Dict[str, Any]] = {}


class CrewRunRequest(BaseModel):
    crew_type: str  # test, security
    project: ProjectInfo
    test_suite: Optional[TestSuiteInfo] = None
    api_spec: Optional[APISpec] = None
    security_target: Optional[SecurityTarget] = None


# ============================================================
# HELPER: BACKEND WEBHOOK
# ============================================================

async def notify_backend(event: str, data: dict):
    """Backend'e webhook gönder"""
    try:
        async with httpx.AsyncClient() as client:
            # Log gönder
            await client.post(
                f"{BACKEND_URL}/api/tests/logs",
                json={
                    "level": data.get("level", "INFO"),
                    "message": data.get("message", ""),
                    "metadata": {
                        "event": event,
                        "agent_id": data.get("agent_id"),
                        "run_id": data.get("run_id"),
                        "timestamp": datetime.now().isoformat(),
                        "cost": data.get("cost")
                    }
                }
            )

            # Eğer cost bilgisi varsa, agent'ın maliyetini güncelle
            if data.get("cost") and data.get("agent_type"):
                agent_type = data.get("agent_type")
                cost = data.get("cost")

                # Agent type'a göre agent ID'yi bul ve güncelle
                try:
                    # Önce agent'ı type'a göre bul
                    agents_response = await client.get(f"{BACKEND_URL}/api/agents")
                    if agents_response.status_code == 200:
                        agents = agents_response.json().get("agents", [])
                        agent = next((a for a in agents if a["type"] == agent_type), None)

                        if agent:
                            # Agent'ın maliyetini güncelle
                            await client.put(
                                f"{BACKEND_URL}/api/agents/{agent['id']}",
                                json={"cost": cost}
                            )
                            print(f"💰 Agent {agent['name']} cost updated: +${cost:.6f}")
                except Exception as agent_error:
                    print(f"Agent cost update error: {agent_error}")

    except Exception as e:
        print(f"Backend notification error: {e}")


# ============================================================
# HELPER: PLAYWRIGHT SCRIPT GENERATOR
# ============================================================

def generate_playwright_script(scenario_title: str, base_url: str, steps: list, discovered_elements: list, options: dict) -> str:
    """Playwright test script'i üret"""

    print(f"[ScriptGen] Scenario: {scenario_title}")
    print(f"[ScriptGen] Steps count: {len(steps)}")
    print(f"[ScriptGen] Discovered elements count: {len(discovered_elements)}")
    print(f"[ScriptGen] Discovered elements: {discovered_elements}")

    # Element mapping - step number'a göre
    element_map = {}
    for elem in discovered_elements:
        step_num = elem.get("stepNumber")
        if step_num:
            element_map[step_num] = elem

    print(f"[ScriptGen] Element map: {element_map}")

    # Script header
    script = f'''/**
 * Test: {scenario_title}
 * Generated by Nexus QA - CrewAI Test Architect
 * Date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 */

import {{ test, expect }} from '@playwright/test';

test('{scenario_title}', async ({{ page }}) => {{
'''

    # Her step için kod üret
    for step in steps:
        step_num = step.get("number", 0)
        action = step.get("action", "")
        action_lower = action.lower()

        # İlgili elementi bul
        elem = element_map.get(step_num)

        print(f"[ScriptGen] Step {step_num}: {action} | Element found: {elem is not None}")

        # Action'a göre kod üret
        if "navigate" in action_lower or "go to" in action_lower or "aç" in action_lower or "git" in action_lower or step_num == 1:
            script += f'''
  // Step {step_num}: {action}
  await page.goto('{base_url}');
  await page.waitForLoadState('domcontentloaded');
'''

        elif elem:
            selector = elem.get("selector", "")
            action_type = elem.get("actionType", "click")

            if action_type == "fill":
                # Input için değer çıkar
                import re
                match = re.search(r"['\"]([^'\"]+)['\"]", action)
                value = match.group(1) if match else "test"

                script += f'''
  // Step {step_num}: {action}
  await page.fill('{selector}', '{value}');
'''

            elif action_type == "click":
                script += f'''
  // Step {step_num}: {action}
  await page.click('{selector}');
  await page.waitForLoadState('domcontentloaded');
'''

            else:
                script += f'''
  // Step {step_num}: {action}
  await page.locator('{selector}').{action_type}();
'''

        else:
            # Element bulunamadı, action type'a göre genel selector kullan
            if "tıkla" in action_lower or "click" in action_lower or "bas" in action_lower:
                script += f'''
  // Step {step_num}: {action}
  // TODO: Add specific selector for click action
  // await page.click('SELECTOR_HERE');
'''
            elif "ara" in action_lower or "search" in action_lower or "bul" in action_lower:
                script += f'''
  // Step {step_num}: {action}
  // TODO: Add search input selector and search term
  // await page.fill('SEARCH_INPUT_SELECTOR', 'search term');
'''
            elif "yaz" in action_lower or "gir" in action_lower or "type" in action_lower or "fill" in action_lower:
                script += f'''
  // Step {step_num}: {action}
  // TODO: Add input selector and value
  // await page.fill('INPUT_SELECTOR', 'value');
'''
            else:
                script += f'''
  // Step {step_num}: {action}
  // TODO: Implement this step
'''

    # Expected result check
    expected_result = options.get("expected_result", "")
    if expected_result:
        script += f'''
  // Verify: {expected_result}
  // TODO: Add assertion
'''

    # Script footer
    script += '''
});
'''

    return script


# ============================================================
# TASK STORAGE (In-memory for demo)
# ============================================================

tasks_storage: Dict[str, Dict] = {}


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/")
async def root():
    """API bilgisi"""
    return {
        "name": "Nexus QA - CrewAI API",
        "version": "1.0.0",
        "status": "running",
        "agents": ["test_architect", "developer", "orchestrator", "security_analyst"],
        "crews": ["test", "security"],
        "endpoints": {
            "run_agent": "POST /api/run",
            "run_crew": "POST /api/crew/{crew_type}",
            "get_task": "GET /api/tasks/{task_id}",
            "cancel_task": "POST /api/tasks/{task_id}/cancel",
            "list_agents": "GET /api/agents"
        }
    }


@router.get("/health")
async def health():
    """Sağlık kontrolü"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


@router.get("/agents")
async def list_agents():
    """Mevcut ajanları listele"""
    return {
        "agents": [
            {
                "id": "orchestrator",
                "name": "Manager Omega",
                "role": "Orkestra Şefi",
                "type": "ORCHESTRATOR",
                "description": "Ekibi koordine eder, görev dağıtımı yapar"
            },
            {
                "id": "test_architect",
                "name": "Agent Alpha",
                "role": "Kıdemli Test Mimarı",
                "type": "TEST_ARCHITECT",
                "description": "Test senaryoları tasarlar, Playwright scriptleri yazar"
            },
            {
                "id": "developer",
                "name": "DevBot Beta",
                "role": "Frontend Yazılımcı",
                "type": "DEVELOPER",
                "description": "Hata analizi yapar, düzeltme önerileri sunar"
            },
            {
                "id": "security_analyst",
                "name": "SecBot Delta",
                "role": "Güvenlik Analisti",
                "type": "SECURITY_ANALYST",
                "description": "Güvenlik testleri yapar, OWASP kontrollerini gerçekleştirir"
            }
        ]
    }


@router.post("/run")
async def run_agent(request: RunTestRequest, background_tasks: BackgroundTasks):
    """Tek bir ajanı çalıştır"""
    import uuid

    task_id = str(uuid.uuid4())[:8]

    tasks_storage[task_id] = {
        "id": task_id,
        "agent_type": request.agent_type,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "result": None
    }

    # Background'da çalıştır
    background_tasks.add_task(
        execute_agent,
        task_id,
        request.agent_type,
        request.suite_id,
        request.options
    )

    return {
        "success": True,
        "task_id": task_id,
        "message": f"Agent {request.agent_type} started",
        "status": "pending"
    }


async def execute_agent(task_id: str, agent_type: str, suite_id: int, options: dict):
    """Ajan çalıştırma işlemi"""
    tasks_storage[task_id]["status"] = "running"

    await notify_backend("agent:started", {
        "agent_id": agent_type,
        "message": f"{agent_type} agent started",
        "level": "INFO"
    })

    try:
        result = {
            "success": True,
            "agent": agent_type,
            "message": f"{agent_type} completed successfully"
        }

        # TEST_ARCHITECT için Playwright script üret
        if agent_type == "test_architect":
            scenario_title = options.get("scenario_title", "Test Scenario")
            base_url = options.get("base_url", "http://localhost:3000")
            steps = options.get("steps", [])
            discovered_elements = options.get("discovered_elements", [])

            # Playwright script oluştur
            script = generate_playwright_script(
                scenario_title=scenario_title,
                base_url=base_url,
                steps=steps,
                discovered_elements=discovered_elements,
                options=options
            )

            result["script"] = script
            result["message"] = f"Playwright script generated for '{scenario_title}'"
        else:
            # Diğer agent'lar için simülasyon
            await asyncio.sleep(2)

        # Başarılı sonuç
        tasks_storage[task_id]["status"] = "completed"
        tasks_storage[task_id]["result"] = result

        await notify_backend("agent:completed", {
            "agent_id": agent_type,
            "message": f"{agent_type} completed",
            "level": "SUCCESS"
        })

    except Exception as e:
        tasks_storage[task_id]["status"] = "error"
        tasks_storage[task_id]["result"] = {
            "success": False,
            "error": str(e)
        }

        await notify_backend("agent:error", {
            "agent_id": agent_type,
            "message": f"Error: {str(e)}",
            "level": "ERROR"
        })


@router.post("/crew/test")
async def run_test_crew(request: CrewRunRequest, background_tasks: BackgroundTasks):
    """Test Crew'u çalıştır"""
    import uuid

    task_id = str(uuid.uuid4())[:8]

    tasks_storage[task_id] = {
        "id": task_id,
        "crew_type": "test",
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "result": None
    }

    background_tasks.add_task(
        execute_test_crew,
        task_id,
        request.project.model_dump(),
        request.test_suite.model_dump() if request.test_suite else None,
        request.api_spec.model_dump() if request.api_spec else None
    )

    return {
        "success": True,
        "task_id": task_id,
        "message": "Test crew started",
        "status": "pending"
    }


async def execute_test_crew(task_id: str, project: dict, test_suite: dict, api_spec: dict):
    """Test Crew çalıştırma"""
    tasks_storage[task_id]["status"] = "running"

    try:
        from crews import TestCrew

        crew = TestCrew()

        if api_spec:
            result = crew.run_full_test(project, test_suite or {}, api_spec)
        else:
            result = crew.run_ui_test(project, test_suite or {})

        tasks_storage[task_id]["status"] = "completed"
        tasks_storage[task_id]["result"] = result

    except Exception as e:
        tasks_storage[task_id]["status"] = "error"
        tasks_storage[task_id]["result"] = {"error": str(e)}


@router.post("/crew/security")
async def run_security_crew(request: CrewRunRequest, background_tasks: BackgroundTasks):
    """Security Crew'u çalıştır"""
    import uuid

    if not request.security_target:
        raise HTTPException(status_code=400, detail="security_target is required")

    task_id = str(uuid.uuid4())[:8]

    tasks_storage[task_id] = {
        "id": task_id,
        "crew_type": "security",
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "result": None
    }

    background_tasks.add_task(
        execute_security_crew,
        task_id,
        request.security_target.model_dump()
    )

    return {
        "success": True,
        "task_id": task_id,
        "message": "Security crew started",
        "status": "pending"
    }


async def execute_security_crew(task_id: str, target: dict):
    """Security Crew çalıştırma"""
    tasks_storage[task_id]["status"] = "running"

    try:
        from crews import SecurityCrew

        crew = SecurityCrew()
        result = crew.run_security_scan(target)

        tasks_storage[task_id]["status"] = "completed"
        tasks_storage[task_id]["result"] = result

    except Exception as e:
        tasks_storage[task_id]["status"] = "error"
        tasks_storage[task_id]["result"] = {"error": str(e)}


@router.post("/crew/document-analysis")
async def analyze_document(request: DocumentAnalysisRequest, background_tasks: BackgroundTasks):
    """Belgeyi analiz et ve senaryoları çıkar"""
    import uuid

    task_id = str(uuid.uuid4())[:8]

    tasks_storage[task_id] = {
        "id": task_id,
        "crew_type": "document_analysis",
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "result": None
    }

    background_tasks.add_task(
        execute_document_analysis,
        task_id,
        request.document_content,
        request.document_info,
        request.suite_id,
        request.template,
        request.options
    )

    return {
        "success": True,
        "task_id": task_id,
        "message": "Document analysis started",
        "status": "pending"
    }


async def execute_document_analysis(task_id: str, document_content: str, document_info: dict, suite_id: int, template: str = "text", options: dict = {}):
    """Belge analizi çalıştırma - AI kullanarak"""
    tasks_storage[task_id]["status"] = "running"

    try:
        import json
        from openai import OpenAI

        # Initialize OpenAI client
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # AI prompt - doküman analizi ve test senaryoları üretimi
        # Calculate document size for guidance
        doc_length = len(document_content)
        doc_words = len(document_content.split())

        # For very long documents, use a more powerful model
        model_name = "gpt-4o-mini"
        if doc_length > 50000:
            print(f"[DocumentAnalysis] Large document detected ({doc_length} chars), using gpt-4o for better analysis")
            model_name = "gpt-4o"

        prompt = f"""Analyze the following document and generate test scenarios.

Document Statistics:
- Length: {doc_length} characters
- Words: ~{doc_words} words

Document content:
{document_content}

Instructions:
- CRITICAL: Read the ENTIRE document from beginning to end before generating scenarios
- Do NOT skip any sections, chapters, or requirements
- **LANGUAGE RULE: Generate ALL content (title, description, steps, expectedResult) in the SAME LANGUAGE as the document**
  * If document is in Turkish → ALL fields must be in Turkish
  * If document is in English → ALL fields must be in English
- Generate scenarios based on document complexity and ALL requirements found:
  * Simple single-sentence requirements → 1-2 scenarios
  * Medium documents with multiple features → 3-7 scenarios
  * Complex PRD documents → 8-15+ scenarios
- IMPORTANT: Extract scenarios from ALL sections of the document, not just the beginning
- Each scenario should have:
  * title: Brief descriptive title
  * description: What the test does
  * steps: Array of steps with number and action (use clear, specific action verbs)
  * expectedResult: What should happen
  * priority: HIGH, MEDIUM, or LOW
  * automationType: UI, API, or INTEGRATION

Example (Turkish document → Turkish output):
{{
  "scenarios": [
    {{
      "title": "Film Arama ve Görüntüleme",
      "description": "Kullanıcı film arar ve detaylarını görüntüler",
      "steps": [
        {{"number": 1, "action": "Ana sayfaya git"}},
        {{"number": 2, "action": "Arama kutusuna 'inception' yaz"}},
        {{"number": 3, "action": "Ara butonuna tıkla"}},
        {{"number": 4, "action": "Sonuçlardan Inception filmine tıkla"}}
      ],
      "expectedResult": "Film detay sayfası görüntülenir",
      "priority": "HIGH",
      "automationType": "UI"
    }}
  ]
}}

Return ONLY a valid JSON object with a "scenarios" array. No markdown, no code blocks."""

        # AI'dan cevap al (use upgraded model for large documents)
        completion = openai_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a test automation expert who generates test scenarios from documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )

        # Maliyet hesapla
        usage_info = extract_usage_from_openai_response(completion)
        cost = usage_info["cost"]
        print(f"💰 Document Analysis Cost: ${cost:.6f} ({usage_info['model']}, {usage_info['total_tokens']} tokens)")

        # Parse response
        response_text = completion.choices[0].message.content.strip()

        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])

        result = json.loads(response_text)

        # Ensure result has scenarios
        if 'scenarios' not in result:
            result = {'scenarios': []}

        # Add success flag and cost
        result['success'] = True
        result['cost'] = cost
        result['usage'] = usage_info

        tasks_storage[task_id]["status"] = "completed"
        tasks_storage[task_id]["result"] = result

        # Backend'e bildir (maliyeti de gönder)
        await notify_backend("document:analyzed", {
            "document_filename": document_info.get('filename'),
            "scenario_count": len(result.get('scenarios', [])),
            "message": "Document analysis completed",
            "level": "SUCCESS",
            "cost": cost,
            "agent_type": "TEST_ARCHITECT"  # Document analysis yapan agent
        })

    except Exception as e:
        tasks_storage[task_id]["status"] = "error"
        tasks_storage[task_id]["result"] = {"error": str(e)}

        await notify_backend("document:analysis_error", {
            "document_filename": document_info.get('filename'),
            "message": f"Analysis error: {str(e)}",
            "level": "ERROR"
        })


@router.post("/crew/text-analysis")
async def analyze_text(request: TextAnalysisRequest, background_tasks: BackgroundTasks):
    """Metin gereksinimlerini analiz et ve senaryoları çıkar"""
    import uuid

    task_id = str(uuid.uuid4())[:8]

    tasks_storage[task_id] = {
        "id": task_id,
        "crew_type": "text_analysis",
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "result": None
    }

    background_tasks.add_task(
        execute_text_analysis,
        task_id,
        request.requirement_text,
        request.template,
        request.options
    )

    return {
        "success": True,
        "task_id": task_id,
        "message": "Text analysis started",
        "status": "pending"
    }


async def execute_text_analysis(task_id: str, requirement_text: str, template: str, options: dict):
    """Metin analizi çalıştırma - Gerçek AI kullanarak"""
    tasks_storage[task_id]["status"] = "running"

    try:
        import json
        from openai import OpenAI

        # Initialize OpenAI client
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # AI prompt - text'ten test senaryoları üret
        text_length = len(requirement_text)
        text_words = len(requirement_text.split())

        prompt = f"""Analyze the following test requirement and generate test scenarios.

Text Statistics:
- Length: {text_length} characters
- Words: ~{text_words} words

Requirement text:
{requirement_text}

Instructions:
- CRITICAL: Read the ENTIRE text carefully before generating scenarios
- **CAPTURE ALL STEPS**: Each line or action mentioned in the input must become a separate step
- **NEVER SKIP POST-ACTION STEPS**: If text says "after login, do X", X must be included as steps
- Adjust scenario count based on requirement complexity:
  * Single simple action → 1 scenario
  * Multiple related actions → 2-4 scenarios
  * Complex multi-feature requirements → 5-10+ scenarios
- IMPORTANT: Don't create unnecessary scenarios - match the actual requirements
- **LANGUAGE RULE: Generate ALL content (title, description, steps, expectedResult) in the SAME LANGUAGE as the input text**
  * If input is in Turkish → ALL fields must be in Turkish
  * If input is in English → ALL fields must be in English
- Each scenario should have:
  * title: Brief descriptive title covering ALL actions (not just the first action)
  * description: What the test does (include all major steps)
  * steps: Array of steps with number and action (use clear, specific action verbs)
  * expectedResult: What should happen at the END of all steps
  * priority: HIGH, MEDIUM, or LOW
  * automationType: UI, API, or INTEGRATION

Example 1 (Turkish - Simple):
Input: "ana sayfada inception filmini ara ve tıkla"
Output:
[
  {{
    "title": "Inception Filmini Ara ve Görüntüle",
    "description": "Inception filmini arayıp detaylarını görüntüle",
    "steps": [
      {{"number": 1, "action": "Ana sayfaya git"}},
      {{"number": 2, "action": "Arama kutusuna 'inception' yaz"}},
      {{"number": 3, "action": "Ara butonuna tıkla veya Enter'a bas"}},
      {{"number": 4, "action": "Sonuçlardan Inception filmine tıkla"}}
    ],
    "expectedResult": "Inception film detay sayfası görüntülenir",
    "priority": "HIGH",
    "automationType": "UI"
  }}
]

Example 2 (Turkish - Multi-step with login + post-login):
Input: "login sayfasına git, email olarak test@test.com yaz, şifre olarak 123456 yaz ve login ol, login olduktan sonra Ayarlar sayfasına git ve Profil Düzenle butonuna tıkla"
Output:
[
  {{
    "title": "Giriş Yap ve Profil Düzenle",
    "description": "Kullanıcı giriş yapıp profil düzenleme ekranına gider",
    "steps": [
      {{"number": 1, "action": "Login sayfasına git"}},
      {{"number": 2, "action": "Email alanına 'test@test.com' yaz"}},
      {{"number": 3, "action": "Şifre alanına '123456' yaz"}},
      {{"number": 4, "action": "Login butonuna tıkla"}},
      {{"number": 5, "action": "Ayarlar sayfasına git"}},
      {{"number": 6, "action": "Profil Düzenle butonuna tıkla"}}
    ],
    "expectedResult": "Profil düzenleme ekranı açılır",
    "priority": "HIGH",
    "automationType": "UI"
  }}
]

Example 3 (English - Simple):
Input: "search for Lord of the Rings and click it"
Output:
[
  {{
    "title": "Search and View Lord of the Rings",
    "description": "Search for a movie and view details",
    "steps": [
      {{"number": 1, "action": "Navigate to homepage"}},
      {{"number": 2, "action": "Type 'Lord of the Rings' into search box"}},
      {{"number": 3, "action": "Click search button"}},
      {{"number": 4, "action": "Click on the movie from results"}}
    ],
    "expectedResult": "Movie details are displayed",
    "priority": "HIGH",
    "automationType": "UI"
  }}
]

CRITICAL RULES:
- For simple single-sentence requirements, return only ONE scenario
- **INCLUDE ALL STEPS FROM INPUT**: If input mentions 5 actions, output must have 5+ steps
- **NEVER STOP AT LOGIN**: If input has "after login, do X", you MUST include X as steps
- Break down complex actions into specific steps (navigate → fill fields → click → navigate again)
- Be very specific about what to type, where to click, which values to use
- NEVER use vague actions like "Locate" - use "Search for" or "Type into"
- Return ONLY the JSON array, no markdown, no additional text"""

        # LLM'den yanıt al
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a test automation expert who generates test scenarios from requirements."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )

        # Maliyet hesapla
        usage_info = extract_usage_from_openai_response(completion)
        cost = usage_info["cost"]
        print(f"💰 Text Analysis Cost: ${cost:.6f} ({usage_info['model']}, {usage_info['total_tokens']} tokens)")

        # Response'u parse et
        response_text = completion.choices[0].message.content.strip()

        # JSON'u çıkar (markdown code block içinde olabilir)
        if '```json' in response_text:
            json_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            json_text = response_text.split('```')[1].split('```')[0].strip()
        else:
            json_text = response_text.strip()

        # Parse JSON
        scenarios = json.loads(json_text)

        tasks_storage[task_id]["status"] = "completed"
        tasks_storage[task_id]["result"] = {
            "success": True,
            "scenarios": scenarios,
            "cost": cost,
            "usage": usage_info
        }

        # Backend'e bildir (maliyeti de gönder)
        await notify_backend("text:analyzed", {
            "scenario_count": len(scenarios),
            "message": f"Text analysis completed - {len(scenarios)} scenario(s) generated",
            "level": "SUCCESS",
            "cost": cost,
            "agent_type": "TEST_ARCHITECT"  # Text analysis yapan agent
        })

    except Exception as e:
        print(f"Text analysis error: {e}")
        tasks_storage[task_id]["status"] = "error"
        tasks_storage[task_id]["result"] = {"error": str(e)}

        await notify_backend("text:analysis_error", {
            "message": f"Analysis error: {str(e)}",
            "level": "ERROR"
        })


@router.post("/crew/generate-automation")
async def generate_automation(request: AutomationGenerationRequest, background_tasks: BackgroundTasks):
    """Senaryo için otomatikleştirme kodu üret"""
    import uuid

    task_id = str(uuid.uuid4())[:8]

    tasks_storage[task_id] = {
        "id": task_id,
        "crew_type": "automation_generation",
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "result": None
    }

    background_tasks.add_task(
        execute_automation_generation,
        task_id,
        request.scenario,
        request.test_suite_info,
        request.backend_scenario_id
    )

    return {
        "success": True,
        "task_id": task_id,
        "message": "Automation generation started",
        "status": "pending"
    }


async def execute_automation_generation(task_id: str, scenario: dict, test_suite_info: dict, backend_scenario_id: int):
    """Otomatikleştirme kodu üretme"""
    tasks_storage[task_id]["status"] = "running"

    try:
        from crews.automation_crew import automation_crew

        result = automation_crew.generate_automation(scenario, test_suite_info)

        tasks_storage[task_id]["status"] = "completed"
        tasks_storage[task_id]["result"] = result

        # Backend'e bildir
        await notify_backend("automation:generated", {
            "scenario_title": scenario.get('title'),
            "automation_type": scenario.get('automationType'),
            "message": "Automation code generated",
            "level": "SUCCESS"
        })

    except Exception as e:
        tasks_storage[task_id]["status"] = "error"
        tasks_storage[task_id]["result"] = {"error": str(e)}

        await notify_backend("automation:generation_error", {
            "scenario_title": scenario.get('title'),
            "message": f"Generation error: {str(e)}",
            "level": "ERROR"
        })


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Task durumunu sorgula"""
    if task_id not in tasks_storage:
        raise HTTPException(status_code=404, detail="Task not found")

    return tasks_storage[task_id]


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Task'ı iptal et"""
    if task_id not in tasks_storage:
        raise HTTPException(status_code=404, detail="Task not found")

    tasks_storage[task_id]["status"] = "cancelled"

    return {
        "success": True,
        "message": f"Task {task_id} cancelled"
    }


@router.get("/tasks")
async def list_tasks():
    """Tüm task'ları listele"""
    return {
        "tasks": list(tasks_storage.values()),
        "total": len(tasks_storage)
    }


# Router'ı app'e ekle
app.include_router(router)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
