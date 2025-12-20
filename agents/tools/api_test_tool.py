"""
API Test Tool - REST API Test Aracı
===================================
HTTP istekleri göndermek ve response'ları analiz etmek için araç
"""

from crewai.tools import BaseTool
from typing import Type, Optional, Dict, Any
from pydantic import BaseModel, Field
import json
import time


class APITestInput(BaseModel):
    """API test tool input schema"""
    url: str = Field(description="API endpoint URL'i")
    method: str = Field(default="GET", description="HTTP method: GET, POST, PUT, DELETE, PATCH")
    headers: Optional[Dict[str, str]] = Field(default=None, description="HTTP headers")
    body: Optional[Dict[str, Any]] = Field(default=None, description="Request body (JSON)")
    params: Optional[Dict[str, str]] = Field(default=None, description="Query parameters")
    timeout: Optional[int] = Field(default=30, description="Timeout (saniye)")


class APITestTool(BaseTool):
    name: str = "API Tester"
    description: str = """
    REST API endpoint'lerini test etmek için araç.
    HTTP istekleri gönderir ve response'ları analiz eder.

    Desteklenen metodlar: GET, POST, PUT, DELETE, PATCH
    Çıktı: Status code, headers, body, response time
    """
    args_schema: Type[BaseModel] = APITestInput

    def _run(self, url: str, method: str = "GET", headers: Dict[str, str] = None,
             body: Dict[str, Any] = None, params: Dict[str, str] = None,
             timeout: int = 30) -> str:
        """API isteği gönder ve sonucu döndür"""
        try:
            import httpx
        except ImportError:
            return "HATA: httpx kurulu değil. 'pip install httpx' komutunu çalıştırın."

        # Default headers
        default_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if headers:
            default_headers.update(headers)

        result = {
            "request": {
                "url": url,
                "method": method,
                "headers": default_headers,
                "body": body,
                "params": params
            },
            "response": {},
            "analysis": {}
        }

        try:
            start_time = time.time()

            with httpx.Client(timeout=timeout) as client:
                if method.upper() == "GET":
                    response = client.get(url, headers=default_headers, params=params)
                elif method.upper() == "POST":
                    response = client.post(url, headers=default_headers, json=body, params=params)
                elif method.upper() == "PUT":
                    response = client.put(url, headers=default_headers, json=body, params=params)
                elif method.upper() == "DELETE":
                    response = client.delete(url, headers=default_headers, params=params)
                elif method.upper() == "PATCH":
                    response = client.patch(url, headers=default_headers, json=body, params=params)
                else:
                    return f"HATA: Desteklenmeyen HTTP method: {method}"

            end_time = time.time()
            response_time = round((end_time - start_time) * 1000, 2)

            # Response parse
            try:
                response_body = response.json()
            except:
                response_body = response.text

            result["response"] = {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response_body,
                "response_time_ms": response_time
            }

            # Analysis
            result["analysis"] = {
                "success": 200 <= response.status_code < 300,
                "status_category": self._get_status_category(response.status_code),
                "performance": self._analyze_performance(response_time),
                "content_type": response.headers.get("content-type", "unknown")
            }

            # Format output
            output = f"""
=== API TEST SONUCU ===

REQUEST:
  URL: {url}
  Method: {method}
  Headers: {json.dumps(default_headers, indent=2)}
  Body: {json.dumps(body, indent=2) if body else 'None'}

RESPONSE:
  Status: {response.status_code} ({result['analysis']['status_category']})
  Response Time: {response_time}ms ({result['analysis']['performance']})
  Content-Type: {result['analysis']['content_type']}

  Body:
  {json.dumps(response_body, indent=2, ensure_ascii=False) if isinstance(response_body, (dict, list)) else response_body[:500]}

ANALYSIS:
  Başarılı: {'✅ EVET' if result['analysis']['success'] else '❌ HAYIR'}
  Performance: {result['analysis']['performance']}

===========================
"""
            return output

        except httpx.TimeoutException:
            return f"HATA: Timeout - {timeout} saniye içinde yanıt alınamadı"
        except httpx.ConnectError:
            return f"HATA: Bağlantı hatası - {url} adresine bağlanılamadı"
        except Exception as e:
            return f"HATA: {str(e)}"

    def _get_status_category(self, status_code: int) -> str:
        """Status code kategorisi"""
        if status_code < 200:
            return "Informational"
        elif status_code < 300:
            return "Success"
        elif status_code < 400:
            return "Redirect"
        elif status_code < 500:
            return "Client Error"
        else:
            return "Server Error"

    def _analyze_performance(self, response_time_ms: float) -> str:
        """Response time analizi"""
        if response_time_ms < 100:
            return "Mükemmel (< 100ms)"
        elif response_time_ms < 300:
            return "İyi (< 300ms)"
        elif response_time_ms < 1000:
            return "Kabul edilebilir (< 1s)"
        elif response_time_ms < 3000:
            return "Yavaş (< 3s)"
        else:
            return "Çok yavaş (> 3s)"
