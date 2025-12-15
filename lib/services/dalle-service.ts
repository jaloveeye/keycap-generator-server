import OpenAI from 'openai';

/**
 * DALL-E 서비스
 */
export class DalleService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * 프롬프트로 이미지 생성
   */
  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024', // 비용 절감: 1792x1024 ($0.080) -> 1024x1024 ($0.040)
        quality: 'standard',
        response_format: 'url',
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('Failed to generate image: No URL returned');
      }

      return imageUrl;
    } catch (error) {
      console.error('DALL-E API error:', error);
      throw new Error(
        `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 이미지 URL에서 이미지 다운로드
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Image download error:', error);
      throw new Error(
        `Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

