/**
 * CDP Screencast Service
 * Chrome DevTools Protocol ile gerçek zamanlı browser görüntüsü yakalama
 *
 * Bu servis Playwright browser'ından CDP ile bağlanır ve
 * Page.startScreencast() ile canlı frame'leri yakalar.
 */

export class CDPScreencastService {
  constructor() {
    this.activeSessions = new Map(); // workflowId -> session
    this.frameCallbacks = new Map(); // workflowId -> callback function
  }

  /**
   * Yeni bir screencast session başlat
   * @param {Page} page - Playwright page nesnesi
   * @param {string} workflowId - Workflow ID
   * @param {Function} onFrame - Her frame için callback (frame) => {}
   */
  async startScreencast(page, workflowId, onFrame) {
    try {
      console.log(`[CDP Screencast] Starting for workflow ${workflowId}`);

      // CDP client al
      const client = await page.context().newCDPSession(page);

      // Frame callback'i kaydet
      this.frameCallbacks.set(workflowId, onFrame);

      // Screencast event listener
      client.on('Page.screencastFrame', async (event) => {
        const { data, metadata, sessionId } = event;

        // Frame'i acknowledge et (CDP requirement)
        await client.send('Page.screencastFrameAck', { sessionId });

        // Callback çağır (base64 image data)
        const callback = this.frameCallbacks.get(workflowId);
        if (callback) {
          callback({
            data, // Base64 encoded image
            metadata, // { deviceWidth, deviceHeight, pageScaleFactor, ... }
            timestamp: Date.now()
          });
        }
      });

      // Screencast'i başlat
      await client.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 80, // 0-100, 80 = iyi kalite + hızlı
        maxWidth: 1920,
        maxHeight: 1080,
        everyNthFrame: 1 // Her frame'i yakala (30-60 FPS)
      });

      // Session'ı kaydet
      this.activeSessions.set(workflowId, { client, page });

      console.log(`[CDP Screencast] ✅ Started successfully for ${workflowId}`);
      return true;
    } catch (error) {
      console.error(`[CDP Screencast] ❌ Failed to start:`, error);
      return false;
    }
  }

  /**
   * Screencast'i durdur
   * @param {string} workflowId - Workflow ID
   */
  async stopScreencast(workflowId) {
    try {
      const session = this.activeSessions.get(workflowId);
      if (!session) {
        console.log(`[CDP Screencast] No active session for ${workflowId}`);
        return;
      }

      const { client } = session;

      // Screencast'i durdur
      await client.send('Page.stopScreencast');

      // Cleanup
      this.activeSessions.delete(workflowId);
      this.frameCallbacks.delete(workflowId);

      console.log(`[CDP Screencast] ✅ Stopped for ${workflowId}`);
    } catch (error) {
      console.error(`[CDP Screencast] ❌ Failed to stop:`, error);
    }
  }

  /**
   * Tüm aktif sessionları durdur
   */
  async stopAll() {
    console.log(`[CDP Screencast] Stopping all sessions (${this.activeSessions.size})`);
    const promises = Array.from(this.activeSessions.keys()).map(id =>
      this.stopScreencast(id)
    );
    await Promise.all(promises);
  }

  /**
   * Aktif session sayısı
   */
  getActiveSessionCount() {
    return this.activeSessions.size;
  }

  /**
   * Belirli bir workflow için session aktif mi?
   */
  isActive(workflowId) {
    return this.activeSessions.has(workflowId);
  }
}

// Singleton instance
export const cdpScreencast = new CDPScreencastService();
