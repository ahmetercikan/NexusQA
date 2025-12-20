"""
Playwright Tool - Web UI Test Aracı
===================================
Playwright ile web sayfalarını test etmek için araç
"""

from crewai.tools import BaseTool
from typing import Type, Optional
from pydantic import BaseModel, Field
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class PlaywrightInput(BaseModel):
    """Playwright tool input schema"""
    url: str = Field(description="Test edilecek URL")
    action: str = Field(description="Yapılacak işlem: navigate, click, fill, screenshot, get_text, check_element")
    selector: Optional[str] = Field(default=None, description="CSS/XPath selector")
    value: Optional[str] = Field(default=None, description="Input değeri (fill için)")
    wait_time: Optional[int] = Field(default=5000, description="Bekleme süresi (ms)")


class PlaywrightTool(BaseTool):
    name: str = "Playwright Web Tester"
    description: str = """
    Web sayfalarını test etmek için Playwright aracı.
    Kullanılabilir aksiyonlar:
    - navigate: Sayfaya git
    - click: Elemente tıkla
    - fill: Input'a değer yaz
    - screenshot: Ekran görüntüsü al
    - get_text: Element text'ini al
    - check_element: Element var mı kontrol et
    """
    args_schema: Type[BaseModel] = PlaywrightInput

    def _run(self, url: str, action: str, selector: str = None,
             value: str = None, wait_time: int = 5000) -> str:
        """Senkron çalıştırma wrapper'ı"""
        try:
            # Async fonksiyonu çalıştır
            result = asyncio.get_event_loop().run_until_complete(
                self._async_run(url, action, selector, value, wait_time)
            )
            return result
        except RuntimeError:
            # Event loop yoksa yeni oluştur
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                self._async_run(url, action, selector, value, wait_time)
            )
            return result

    async def _async_run(self, url: str, action: str, selector: str = None,
                         value: str = None, wait_time: int = 5000) -> str:
        """Asenkron Playwright işlemleri"""
        try:
            from playwright.async_api import async_playwright
            from config import HEADLESS, BROWSER, SLOW_MO
        except ImportError:
            return "HATA: Playwright kurulu değil. 'pip install playwright && playwright install' komutunu çalıştırın."

        result = ""

        async with async_playwright() as p:
            # Browser seçimi
            if BROWSER == "firefox":
                browser = await p.firefox.launch(headless=HEADLESS, slow_mo=SLOW_MO)
            elif BROWSER == "webkit":
                browser = await p.webkit.launch(headless=HEADLESS, slow_mo=SLOW_MO)
            else:
                browser = await p.chromium.launch(headless=HEADLESS, slow_mo=SLOW_MO)

            page = await browser.new_page()

            try:
                if action == "navigate":
                    await page.goto(url, wait_until="networkidle", timeout=wait_time)
                    title = await page.title()
                    result = f"BAŞARILI: '{url}' sayfasına gidildi. Sayfa başlığı: '{title}'"

                elif action == "click":
                    await page.goto(url, wait_until="networkidle") if not page.url else None
                    if selector:
                        await page.click(selector, timeout=wait_time)
                        result = f"BAŞARILI: '{selector}' elementine tıklandı"
                    else:
                        result = "HATA: click aksiyonu için selector gerekli"

                elif action == "fill":
                    if selector and value:
                        await page.fill(selector, value, timeout=wait_time)
                        result = f"BAŞARILI: '{selector}' inputuna '{value}' yazıldı"
                    else:
                        result = "HATA: fill aksiyonu için selector ve value gerekli"

                elif action == "screenshot":
                    screenshot_path = f"screenshots/{url.replace('://', '_').replace('/', '_')}.png"
                    os.makedirs("screenshots", exist_ok=True)
                    await page.screenshot(path=screenshot_path, full_page=True)
                    result = f"BAŞARILI: Screenshot kaydedildi: {screenshot_path}"

                elif action == "get_text":
                    if selector:
                        text = await page.text_content(selector, timeout=wait_time)
                        result = f"BAŞARILI: Element text: '{text}'"
                    else:
                        result = "HATA: get_text aksiyonu için selector gerekli"

                elif action == "check_element":
                    if selector:
                        element = await page.query_selector(selector)
                        if element:
                            is_visible = await element.is_visible()
                            result = f"BAŞARILI: Element bulundu. Görünür: {is_visible}"
                        else:
                            result = f"BAŞARISIZ: Element bulunamadı: '{selector}'"
                    else:
                        result = "HATA: check_element aksiyonu için selector gerekli"

                else:
                    result = f"HATA: Bilinmeyen aksiyon: {action}"

            except Exception as e:
                result = f"HATA: {str(e)}"
            finally:
                await browser.close()

        return result
