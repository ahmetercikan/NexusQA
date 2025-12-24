/**
 * LAYER 3: MEMORY / RAG SYSTEM
 * =============================
 * Başarılı selector pattern'lerini bellekte tutar ve RAG ile benzer pattern'leri bulur.
 *
 * Özellikler:
 * 1. Başarılı selector'ları database'e kaydet
 * 2. Benzer action'lar için memory'den selector öner (RAG)
 * 3. Success count tracking ile en iyi pattern'leri öğren
 * 4. Project + URL context ile akıllı arama
 */

import prisma from '../config/database.js';
import { generatePlaywrightSelector } from './aiSelectorService.js';

/**
 * Başarılı bir element discovery'yi memory'e kaydet
 *
 * @param {Object} params - Memory kaydı parametreleri
 * @param {number} params.projectId - Proje ID
 * @param {string} params.actionText - Kullanıcının action tanımı ("Kıyaslama tabına tıkla")
 * @param {string} params.actionType - Action tipi (click, fill, navigate)
 * @param {Object} params.element - Element bilgileri (tag, text, testId, etc.)
 * @param {string} params.selector - Başarılı olan selector
 * @param {string} params.locatorType - Locator tipi (text, testId, css, xpath, vision)
 * @param {string} params.urlPattern - URL pattern
 * @param {number} params.confidence - AI confidence score (0-100)
 * @param {boolean} params.isInModal - Modal içinde mi
 * @param {string} params.containerRole - Container role (dialog, alert, etc.)
 * @param {Object} params.metadata - Ek metadata
 */
export async function storeSuccessfulPattern({
  projectId,
  actionText,
  actionType,
  element,
  selector,
  locatorType,
  urlPattern,
  confidence,
  isInModal = false,
  containerRole = null,
  metadata = {}
}) {
  try {
    // Normalize action text (küçük harf, trim)
    const normalizedAction = actionText.toLowerCase().trim();

    // Aynı pattern zaten var mı kontrol et
    const existing = await prisma.elementMemory.findFirst({
      where: {
        projectId,
        actionText: normalizedAction,
        urlPattern,
        isInModal,
        selector
      }
    });

    if (existing) {
      // Varsa success count'u artır ve last_used_at güncelle
      const updated = await prisma.elementMemory.update({
        where: { id: existing.id },
        data: {
          successCount: { increment: 1 },
          lastUsedAt: new Date(),
          confidence: Math.max(existing.confidence, confidence) // En yüksek confidence'ı tut
        }
      });

      console.log(`[MemoryService] ✓ Pattern güncellendi (success count: ${updated.successCount}):`, normalizedAction);
      return updated;
    }

    // Yoksa yeni kayıt oluştur
    const memory = await prisma.elementMemory.create({
      data: {
        projectId,
        actionText: normalizedAction,
        actionType,
        elementTag: element.tag || 'unknown',
        elementText: element.text || null,
        elementTestId: element.testId || null,
        elementId: element.elementId || null,
        elementName: element.name || null,
        elementAriaLabel: element.ariaLabel || null,
        selector,
        locatorType,
        urlPattern,
        confidence,
        isInModal,
        containerRole,
        metadata,
        successCount: 1,
        lastUsedAt: new Date()
      }
    });

    console.log(`[MemoryService] ✓ Yeni pattern kaydedildi:`, normalizedAction);
    return memory;

  } catch (error) {
    console.error(`[MemoryService] Memory kaydetme hatası:`, error.message);
    // Hata olsa bile flow devam etsin
    return null;
  }
}

/**
 * RAG ile benzer action'lar için memory'den selector öner
 *
 * @param {Object} params - Arama parametreleri
 * @param {number} params.projectId - Proje ID
 * @param {string} params.actionText - Kullanıcının action tanımı
 * @param {string} params.urlPattern - Mevcut URL pattern
 * @param {boolean} params.isInModal - Modal içinde mi aranıyor
 * @returns {Object|null} - En uygun memory kaydı veya null
 */
export async function retrieveSimilarPattern({
  projectId,
  actionText,
  urlPattern,
  isInModal = false
}) {
  try {
    const normalizedAction = actionText.toLowerCase().trim();

    // 1. Tam eşleşme ara (aynı proje + URL + action)
    const exactMatch = await prisma.elementMemory.findFirst({
      where: {
        projectId,
        actionText: normalizedAction,
        urlPattern,
        isInModal
      },
      orderBy: [
        { successCount: 'desc' }, // En çok kullanılanı önce
        { confidence: 'desc' }    // Sonra en yüksek confidence'ı
      ]
    });

    if (exactMatch) {
      console.log(`[MemoryService] 🎯 TAM EŞLEŞME bulundu (success: ${exactMatch.successCount}, confidence: ${exactMatch.confidence})`);
      return exactMatch;
    }

    // 2. Partial match: Aynı proje + benzer action (URL farklı olabilir)
    const partialMatch = await prisma.elementMemory.findFirst({
      where: {
        projectId,
        actionText: {
          contains: normalizedAction.split(' ')[0] // İlk kelimeye göre ara
        },
        isInModal
      },
      orderBy: [
        { successCount: 'desc' },
        { confidence: 'desc' }
      ]
    });

    if (partialMatch) {
      console.log(`[MemoryService] ⚡ KISMİ EŞLEŞME bulundu (success: ${partialMatch.successCount}, confidence: ${partialMatch.confidence})`);
      return partialMatch;
    }

    // 3. Semantic similarity: Benzer kelimelere göre ara (Türkçe ve İngilizce)
    const semanticMatches = await findSemanticMatches(normalizedAction, projectId, isInModal);

    if (semanticMatches.length > 0) {
      const bestMatch = semanticMatches[0];
      console.log(`[MemoryService] 🧠 SEMANTİK EŞLEŞME bulundu (success: ${bestMatch.successCount}, confidence: ${bestMatch.confidence})`);
      return bestMatch;
    }

    console.log(`[MemoryService] ℹ Memory'de eşleşme bulunamadı`);
    return null;

  } catch (error) {
    console.error(`[MemoryService] Memory retrieval hatası:`, error.message);
    return null;
  }
}

/**
 * Semantic benzerlik ile pattern ara (basit keyword matching)
 * Gelecekte OpenAI embeddings veya vector database kullanılabilir
 */
async function findSemanticMatches(actionText, projectId, isInModal) {
  try {
    // Action text'ten keyword'leri çıkar
    const keywords = extractKeywords(actionText);

    if (keywords.length === 0) return [];

    // Keyword'lere göre memory'de ara
    const matches = await prisma.elementMemory.findMany({
      where: {
        projectId,
        isInModal,
        OR: keywords.map(keyword => ({
          actionText: {
            contains: keyword
          }
        }))
      },
      orderBy: [
        { successCount: 'desc' },
        { confidence: 'desc' }
      ],
      take: 5 // En iyi 5 sonucu getir
    });

    // Benzerlik skoruna göre sırala
    return matches.map(match => {
      const similarity = calculateSimilarity(actionText, match.actionText);
      return { ...match, similarity };
    }).filter(m => m.similarity > 0.3) // %30'dan düşük benzerlikleri filtrele
      .sort((a, b) => b.similarity - a.similarity);

  } catch (error) {
    console.error(`[MemoryService] Semantic search hatası:`, error.message);
    return [];
  }
}

/**
 * Action text'ten anlamlı keyword'leri çıkar
 */
function extractKeywords(text) {
  // Stop words (Türkçe + İngilizce)
  const stopWords = ['bir', 've', 'ile', 'için', 'olan', 'bu', 'şu', 'a', 'an', 'the', 'is', 'to', 'in', 'on', 'at', 'ya', 'de', 'da'];

  const words = text.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));

  return [...new Set(words)]; // Tekrarları kaldır
}

/**
 * İki text arasındaki benzerliği hesapla (Jaccard similarity)
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(extractKeywords(text1));
  const words2 = new Set(extractKeywords(text2));

  if (words1.size === 0 && words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Memory'den en başarılı pattern'leri getir (analytics için)
 */
export async function getTopPatterns(projectId, limit = 10) {
  try {
    const topPatterns = await prisma.elementMemory.findMany({
      where: { projectId },
      orderBy: [
        { successCount: 'desc' },
        { confidence: 'desc' }
      ],
      take: limit
    });

    return topPatterns;
  } catch (error) {
    console.error(`[MemoryService] Top patterns alınamadı:`, error.message);
    return [];
  }
}

/**
 * Memory'yi temizle (düşük performanslı pattern'leri sil)
 */
export async function cleanupMemory(projectId, minSuccessCount = 1, maxAge = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const deleted = await prisma.elementMemory.deleteMany({
      where: {
        projectId,
        successCount: { lt: minSuccessCount },
        lastUsedAt: { lt: cutoffDate }
      }
    });

    console.log(`[MemoryService] ✓ ${deleted.count} adet eski pattern temizlendi`);
    return deleted.count;
  } catch (error) {
    console.error(`[MemoryService] Memory cleanup hatası:`, error.message);
    return 0;
  }
}
