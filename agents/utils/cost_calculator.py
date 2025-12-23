"""
Cost Calculator - LLM Kullanım Maliyeti Hesaplayıcı
===================================================
OpenAI ve Gemini API kullanımlarının maliyetini hesaplar
"""

# Model fiyatları (USD per 1M tokens)
# Kaynak: https://openai.com/api/pricing/
MODEL_PRICING = {
    # OpenAI GPT-4 Models
    "gpt-4o": {
        "input": 2.50,   # $2.50 per 1M input tokens
        "output": 10.00  # $10.00 per 1M output tokens
    },
    "gpt-4o-mini": {
        "input": 0.150,   # $0.15 per 1M input tokens
        "output": 0.600   # $0.60 per 1M output tokens
    },
    "gpt-4-turbo": {
        "input": 10.00,
        "output": 30.00
    },
    "gpt-4": {
        "input": 30.00,
        "output": 60.00
    },
    "gpt-3.5-turbo": {
        "input": 0.50,
        "output": 1.50
    },

    # Gemini Models (approximate pricing)
    "gemini-pro": {
        "input": 0.125,
        "output": 0.375
    },
    "gemini-1.5-pro": {
        "input": 1.25,
        "output": 5.00
    },
    "gemini-1.5-flash": {
        "input": 0.075,
        "output": 0.30
    }
}


def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """
    Model ve token sayısına göre maliyet hesapla

    Args:
        model_name: Model adı (örn: "gpt-4o-mini")
        input_tokens: Girdi token sayısı
        output_tokens: Çıktı token sayısı

    Returns:
        Maliyet (USD)
    """
    # Model adını normalize et (version numaralarını çıkar)
    normalized_model = model_name.lower()

    # Model fiyatını bul
    pricing = None
    for model_key, model_pricing in MODEL_PRICING.items():
        if model_key in normalized_model:
            pricing = model_pricing
            break

    # Eğer model bulunamazsa, gpt-4o-mini varsayılan olarak kullan
    if not pricing:
        print(f"⚠️ Model fiyatı bulunamadı: {model_name}, gpt-4o-mini fiyatı kullanılıyor")
        pricing = MODEL_PRICING["gpt-4o-mini"]

    # Maliyet hesapla (per 1M tokens, bu yüzden 1,000,000'e bölüyoruz)
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    total_cost = input_cost + output_cost

    return round(total_cost, 6)  # 6 ondalık basamak


def extract_usage_from_openai_response(response) -> dict:
    """
    OpenAI API response'undan kullanım bilgilerini çıkar

    Args:
        response: OpenAI API response object

    Returns:
        {
            "model": "gpt-4o-mini",
            "input_tokens": 150,
            "output_tokens": 300,
            "total_tokens": 450,
            "cost": 0.000225
        }
    """
    try:
        usage = response.usage
        model = response.model

        input_tokens = usage.prompt_tokens
        output_tokens = usage.completion_tokens
        total_tokens = usage.total_tokens

        cost = calculate_cost(model, input_tokens, output_tokens)

        return {
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "cost": cost
        }
    except Exception as e:
        print(f"❌ OpenAI response'dan usage çıkarılamadı: {e}")
        return {
            "model": "unknown",
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "cost": 0.0
        }


def estimate_cost_from_text(text: str, model_name: str = "gpt-4o-mini", is_output: bool = False) -> float:
    """
    Text uzunluğundan tahmini maliyet hesapla (token bilgisi yoksa)

    Kaba tahmin: ~4 karakter = 1 token

    Args:
        text: Metin
        model_name: Model adı
        is_output: Output mu input mu (output daha pahalı)

    Returns:
        Tahmini maliyet (USD)
    """
    # Tahmini token sayısı
    estimated_tokens = len(text) // 4

    if is_output:
        return calculate_cost(model_name, 0, estimated_tokens)
    else:
        return calculate_cost(model_name, estimated_tokens, 0)


# Test fonksiyonu
if __name__ == "__main__":
    # Test 1: GPT-4o-mini
    cost1 = calculate_cost("gpt-4o-mini", 1000, 500)
    print(f"GPT-4o-mini (1000 input, 500 output): ${cost1:.6f}")

    # Test 2: GPT-4o
    cost2 = calculate_cost("gpt-4o", 1000, 500)
    print(f"GPT-4o (1000 input, 500 output): ${cost2:.6f}")

    # Test 3: Text estimation
    sample_text = "This is a sample text " * 100  # ~300 karakterlik text
    cost3 = estimate_cost_from_text(sample_text, "gpt-4o-mini", is_output=False)
    print(f"Text estimation ({len(sample_text)} chars): ${cost3:.6f}")
