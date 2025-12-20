# -*- coding: utf-8 -*-
"""
NLP Analyzer - Sembi IQ Style Test Case Generation
====================================================
Metinden akıllı test senaryoları çıkarmak için NLP analizi
"""

import re
import sys
import os
from typing import List, Dict, Any, Tuple
from collections import Counter

# NLP kütüphaneleri
try:
    import spacy
    from spacy.tokens import Doc
except ImportError:
    print("⚠️ spaCy yüklenmediği. Lütfen çalıştır: python -m spacy download tr_core_news_sm")
    spacy = None

try:
    from transformers import pipeline
except ImportError:
    print("⚠️ Transformers yüklenmediği")
    pipeline = None

import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk.tokenize import sent_tokenize

# NLTK data indir
try:
    nltk.data.find('vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon', quiet=True)
try:
    nltk.data.find('punkt')
except LookupError:
    nltk.download('punkt', quiet=True)


class NLPAnalyzer:
    """NLP destekli test senaryo analizi"""
    
    def __init__(self):
        """Analyzer'ı başlat"""
        self.nlp = None
        self.ner_model = None
        self.zero_shot_classifier = None
        self.sia = SentimentIntensityAnalyzer()
        self._initialize_models()
        
        # Anahtar kelimeler
        self.action_keywords = {
            'NAVIGATE': ['git', 'git', 'aç', 'ziyaret et', 'yönlendir', 'page', 'url', 'tarayıcı'],
            'INPUT': ['gir', 'yazı', 'doldur', 'form', 'alanı', 'şifre', 'email', 'text', 'input'],
            'CLICK': ['tıkla', 'klik', 'basıl', 'seç', 'button', 'buton', 'link'],
            'VERIFY': ['doğrula', 'kontrol', 'kontrol et', 'kontrol et', 'assert', 'göster', 'görün', 'expect'],
            'WAIT': ['bekle', 'yüklendi', 'loading', 'await'],
            'SCROLL': ['kaydır', 'scroll', 'aşağı', 'yukarı'],
            'UPLOAD': ['yükle', 'upload', 'dosya', 'attach'],
            'DELETE': ['sil', 'delete', 'remove', 'kaldır'],
            'EDIT': ['düzenle', 'edit', 'update', 'değiştir', 'değiştir'],
        }
        
        # Risk seviyesi anahtar kelimeleri
        self.risk_keywords = {
            'CRITICAL': ['güvenlik', 'şifre', 'tokib', 'ödeme', 'kredi', 'kart', 'kimlik', 'saldırı', 'hack', 'injection', 'sql'],
            'HIGH': ['oturum', 'session', 'login', 'logout', 'authorize', 'permission', 'hata', 'error', 'validation'],
            'MEDIUM': ['arama', 'search', 'filtreleme', 'sorting', 'pagination'],
            'LOW': ['görünüm', 'ui', 'layout', 'display', 'format'],
        }
        
    def _initialize_models(self):
        """Modelleri başlat"""
        try:
            if spacy:
                try:
                    self.nlp = spacy.load('tr_core_news_sm')
                    print("✅ spaCy Türkçe modeli yüklendi")
                except OSError:
                    print("⚠️ spaCy Türkçe modeli yüklenemiyor. İngilizce kullanılacak.")
                    self.nlp = spacy.load('en_core_web_sm')
        except Exception as e:
            print(f"⚠️ spaCy model başlatma hatası: {e}")
        
        # NER modeli (Entity Recognition)
        try:
            if pipeline:
                self.ner_model = pipeline("ner", model="dbmdz/bert-base-turkish-cased", 
                                         aggregation_strategy="simple")
                print("✅ BERT NER modeli yüklendi")
        except Exception as e:
            print(f"⚠️ BERT model başlatma hatası: {e}")
    
    def analyze_requirements(self, text: str) -> Dict[str, Any]:
        """
        Gereksinimleri kapsamlı olarak analiz et
        
        Args:
            text: Analiz edilecek metin
            
        Returns:
            Analiz sonuçları
        """
        results = {
            'original_text': text,
            'entities': self._extract_entities(text),
            'actions': self._extract_actions(text),
            'risks': self._analyze_risks(text),
            'sentiment': self._analyze_sentiment(text),
            'test_types': self._determine_test_types(text),
            'edge_cases': self._identify_edge_cases(text),
            'user_flows': self._extract_user_flows(text),
        }
        return results
    
    def _extract_entities(self, text: str) -> List[Dict[str, str]]:
        """Metinden entity'leri çıkar (kullanıcı, ürün, sayfa, vb.)"""
        entities = []
        
        # Regex-based extraction
        patterns = {
            'USER': r'(kullanıcı|user|admin|guest)',
            'PAGE': r'(sayfa|page|dashboard|menu|panel)',
            'FIELD': r'(alanı|field|input|textbox)',
            'PRODUCT': r'(ürün|product|item|kategori)',
            'ACTION': r'(işlem|process|action|görev)',
        }
        
        for entity_type, pattern in patterns.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'type': entity_type,
                    'value': match.group(),
                    'position': match.start()
                })
        
        # spaCy NER
        if self.nlp:
            try:
                doc = self.nlp(text[:1000])  # İlk 1000 char
                for ent in doc.ents:
                    entities.append({
                        'type': ent.label_,
                        'value': ent.text,
                        'position': ent.start_char
                    })
            except Exception as e:
                print(f"⚠️ spaCy NER hatası: {e}")
        
        # Duplikat kaldır
        unique_entities = []
        seen = set()
        for ent in entities:
            key = (ent['type'], ent['value'].lower())
            if key not in seen:
                seen.add(key)
                unique_entities.append(ent)
        
        return unique_entities
    
    def _extract_actions(self, text: str) -> List[Dict[str, Any]]:
        """Metinden eylemleri çıkar"""
        actions = []
        sentences = sent_tokenize(text)
        
        for i, sentence in enumerate(sentences):
            for action_type, keywords in self.action_keywords.items():
                for keyword in keywords:
                    if keyword.lower() in sentence.lower():
                        actions.append({
                            'type': action_type,
                            'keyword': keyword,
                            'sentence': sentence.strip(),
                            'order': i
                        })
                        break
        
        # Duplikat ve sıra kontrol
        actions = sorted(list({(a['sentence']): a for a in actions}.values()), 
                        key=lambda x: x['order'])
        
        return actions
    
    def _analyze_risks(self, text: str) -> Dict[str, List[str]]:
        """Metin içindeki risk alanlarını tespit et"""
        risks = {
            'CRITICAL': [],
            'HIGH': [],
            'MEDIUM': [],
            'LOW': []
        }
        
        text_lower = text.lower()
        
        for risk_level, keywords in self.risk_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    risks[risk_level].append(keyword)
        
        # Duplikat kaldır
        for level in risks:
            risks[level] = list(set(risks[level]))
        
        return risks
    
    def _analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Metin sentimentini analiz et"""
        try:
            scores = self.sia.polarity_scores(text)
            return {
                'positive': scores['pos'],
                'negative': scores['neg'],
                'neutral': scores['neu'],
                'compound': scores['compound']
            }
        except Exception as e:
            print(f"⚠️ Sentiment analiz hatası: {e}")
            return {'positive': 0, 'negative': 0, 'neutral': 1, 'compound': 0}
    
    def _determine_test_types(self, text: str) -> List[str]:
        """Hangi test türlerinin gerekli olduğunu belirle"""
        test_types = []
        text_lower = text.lower()
        
        # UI Test
        if any(kw in text_lower for kw in ['klik', 'click', 'arayüz', 'button', 'form', 'input', 'görün']):
            test_types.append('UI')
        
        # API Test
        if any(kw in text_lower for kw in ['api', 'endpoint', 'request', 'response', 'json', 'rest']):
            test_types.append('API')
        
        # Güvenlik Test
        if any(kw in text_lower for kw in ['güvenlik', 'security', 'şifre', 'password', 'token', 'auth', 'injection']):
            test_types.append('SECURITY')
        
        # Performans Test
        if any(kw in text_lower for kw in ['hız', 'speed', 'performance', 'yavaş', 'slow', 'timeout']):
            test_types.append('PERFORMANCE')
        
        # Entegrasyon Test
        if any(kw in text_lower for kw in ['entegrasyon', 'integration', 'bağlantı', 'connection', 'database', 'db']):
            test_types.append('INTEGRATION')
        
        return test_types if test_types else ['UI']
    
    def _identify_edge_cases(self, text: str) -> List[str]:
        """Edge case'leri otomatik tespit et"""
        edge_cases = []
        text_lower = text.lower()
        
        patterns = {
            'BOUNDARY': ['sınır', 'limit', 'max', 'min', 'maksimum', 'minimum'],
            'NULL': ['boş', 'empty', 'null', 'none', 'undefined'],
            'INVALID': ['geçersiz', 'invalid', 'hatalı', 'wrong', 'incorrect'],
            'SPECIAL_CHARS': ['özel karakter', 'special', 'simge', 'symbol'],
            'LARGE_DATA': ['büyük', 'large', 'heavy', 'massive'],
            'CONCURRENT': ['eşzamanlı', 'concurrent', 'parallel', 'aynı anda'],
            'TIMEOUT': ['timeout', 'time out', 'uzun süre'],
        }
        
        for case_type, keywords in patterns.items():
            for keyword in keywords:
                if keyword in text_lower:
                    edge_cases.append(f"{case_type}: {keyword}")
                    break
        
        # Eğer edge case yoksa standart olanları ekle
        if not edge_cases:
            edge_cases = [
                'BOUNDARY: Min/Max values',
                'NULL: Empty/null inputs',
                'INVALID: Invalid data types'
            ]
        
        return edge_cases
    
    def _extract_user_flows(self, text: str) -> List[Dict[str, Any]]:
        """Kullanıcı akışlarını metinden çıkar"""
        flows = []
        sentences = sent_tokenize(text)
        
        current_flow = {
            'steps': [],
            'actors': [],
            'description': ''
        }
        
        for sentence in sentences:
            # Yeni akış varsa
            if any(kw in sentence.lower() for kw in ['flow', 'senaryo', 'scenario', 'process', 'workflow']):
                if current_flow['steps']:
                    flows.append(current_flow)
                current_flow = {
                    'steps': [],
                    'actors': [],
                    'description': sentence.strip()
                }
            
            # Adımları ekle
            if any(kw in sentence.lower() for kw in ['then', 'sonra', 'after', 'when', 'eğer', 'if']):
                current_flow['steps'].append(sentence.strip())
        
        if current_flow['steps']:
            flows.append(current_flow)
        
        return flows if flows else [{
            'description': 'Default Flow',
            'steps': [s.strip() for s in sentences[:3]]
        }]
    
    def generate_enhanced_scenarios(self, text: str, template: str = "text") -> List[Dict[str, Any]]:
        """
        Geliştirilmiş senaryo oluştur (Sembi IQ tarzı)
        
        Args:
            text: Gereksinim metni
            template: 'text' veya 'bdd'
            
        Returns:
            Geliştirilmiş test senaryoları
        """
        # Analiz yap
        analysis = self.analyze_requirements(text)
        
        scenarios = []
        
        # 1. Temel senaryolar (User Flows'tan)
        for i, flow in enumerate(analysis['user_flows']):
            scenario = self._create_scenario_from_flow(flow, template)
            scenarios.append(scenario)
        
        # 2. Risk-based senaryolar
        for risk_level, keywords in analysis['risks'].items():
            if keywords:
                scenario = self._create_risk_scenario(keywords, risk_level, template)
                scenarios.append(scenario)
        
        # 3. Edge case senaryoları
        for edge_case in analysis['edge_cases']:
            scenario = self._create_edge_case_scenario(edge_case, template)
            scenarios.append(scenario)
        
        # 4. Negatif test senaryoları
        negative_scenario = self._create_negative_scenario(analysis, template)
        scenarios.append(negative_scenario)
        
        # Duplikat kaldır
        unique_scenarios = []
        seen_titles = set()
        
        for scenario in scenarios:
            title_key = scenario['title'].lower()
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_scenarios.append(scenario)
        
        return unique_scenarios
    
    def _create_scenario_from_flow(self, flow: Dict, template: str) -> Dict[str, Any]:
        """Kullanıcı akışından senaryo oluştur"""
        steps = []
        for i, step in enumerate(flow['steps'][:5], 1):  # Max 5 adım
            steps.append({
                'number': i,
                'action': step.strip()
            })
        
        scenario = {
            'title': flow.get('description', 'User Flow Scenario')[:50],
            'description': flow.get('description', 'Test based on user workflow'),
            'steps': steps,
            'expectedResult': 'İşlem başarıyla tamamlandı',
            'priority': 'HIGH',
            'automationType': 'UI',
            'testData': {},
            'preconditions': 'Kullanıcı oturum açmış'
        }
        
        if template == "bdd":
            scenario['bddFormat'] = self._convert_to_bdd(scenario)
        
        return scenario
    
    def _create_risk_scenario(self, keywords: List[str], risk_level: str, template: str) -> Dict[str, Any]:
        """Risk tabanlı senaryo oluştur"""
        priority_map = {
            'CRITICAL': 'CRITICAL',
            'HIGH': 'HIGH',
            'MEDIUM': 'MEDIUM',
            'LOW': 'LOW'
        }
        
        scenario = {
            'title': f'{risk_level} Risk Test: {keywords[0]}',
            'description': f'Test için kritik alan: {", ".join(keywords)}',
            'steps': [
                {'number': 1, 'action': f'{keywords[0]} ile ilgili işlemi başlat'},
                {'number': 2, 'action': 'Sistem davranışını gözlemle'},
                {'number': 3, 'action': 'Güvenlik kontrolleri doğrula'}
            ],
            'expectedResult': f'{risk_level} seviyesi için uygun güvenlik sağlanmış',
            'priority': priority_map.get(risk_level, 'HIGH'),
            'automationType': 'UI',
            'testData': {'riskArea': keywords[0]},
            'preconditions': 'Sistem ayakta'
        }
        
        if template == "bdd":
            scenario['bddFormat'] = self._convert_to_bdd(scenario)
        
        return scenario
    
    def _create_edge_case_scenario(self, edge_case: str, template: str) -> Dict[str, Any]:
        """Edge case senaryo oluştur"""
        scenario = {
            'title': f'Edge Case: {edge_case[:40]}',
            'description': f'Edge case testi: {edge_case}',
            'steps': [
                {'number': 1, 'action': f'{edge_case} koşullarını hazırla'},
                {'number': 2, 'action': 'İşlemi çalıştır'},
                {'number': 3, 'action': 'Sistem doğru davranış gösteriyor mu?'}
            ],
            'expectedResult': "Sistem edge case'i doğru işler",
            'priority': 'MEDIUM',
            'automationType': 'UI',
            'testData': {'edgeCase': edge_case},
            'preconditions': 'Sistem hazır'
        }
        
        if template == "bdd":
            scenario['bddFormat'] = self._convert_to_bdd(scenario)
        
        return scenario
    
    def _create_negative_scenario(self, analysis: Dict, template: str) -> Dict[str, Any]:
        """Negatif test senaryo oluştur"""
        scenario = {
            'title': 'Negatif Test Senaryosu',
            'description': 'Hatalı veya geçersiz girdilerle sistem davranışını test et',
            'steps': [
                {'number': 1, 'action': 'Geçersiz veriler gir'},
                {'number': 2, 'action': 'İşlemi başlat'},
                {'number': 3, 'action': 'Hata mesajı kontrol et'}
            ],
            'expectedResult': 'Sistem uygun hata mesajı gösteriyor',
            'priority': 'HIGH',
            'automationType': 'UI',
            'testData': {'invalid': True, 'errorExpected': True},
            'preconditions': 'Sistem ayakta'
        }
        
        if template == "bdd":
            scenario['bddFormat'] = self._convert_to_bdd(scenario)
        
        return scenario
    
    def _convert_to_bdd(self, scenario: Dict) -> str:
        """Senaryoyu BDD formatına çevir"""
        title = scenario['title']
        steps = scenario['steps']
        expected = scenario['expectedResult']
        
        bdd = f"""Feature: {title}
  Scenario: {title}
    Given sistem başlatılmış
"""
        
        for step in steps:
            bdd += f"    When {step['action']}\n"
        
        bdd += f"    Then {expected}"
        
        return bdd


# Singleton instance
nlp_analyzer = NLPAnalyzer()


if __name__ == '__main__':
    # Test
    test_text = """
    Kullanıcı sisteme email ve şifre ile giriş yapar.
    Hatalı bir şifre girilse hata mesajı gösterilir.
    Geçerli giriş bilgileri ile kullanıcı ana sayfaya yönlendirilir.
    Güvenlik protokolleri kontrol edilir.
    """
    
    analyzer = NLPAnalyzer()
    analysis = analyzer.analyze_requirements(test_text)
    scenarios = analyzer.generate_enhanced_scenarios(test_text)
    
    print("=== ANALYSIS ===")
    print(f"Entities: {analysis['entities']}")
    print(f"Actions: {analysis['actions']}")
    print(f"Risks: {analysis['risks']}")
    print(f"Test Types: {analysis['test_types']}")
    print(f"\n=== GENERATED SCENARIOS ===")
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{i}. {scenario['title']}")
        print(f"   Priority: {scenario['priority']}")
        print(f"   Steps: {len(scenario['steps'])}")
