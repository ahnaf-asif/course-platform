import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAIPrompt, handleDownloadSample } from '../questionsUtils';

describe('questionsUtils', () => {
  describe('getAIPrompt', () => {
    it('returns prompt text containing CSV instructions', () => {
      const prompt = getAIPrompt();
      expect(prompt).toContain('Question,Type,Explanation');
      expect(prompt).toContain('SINGLE');
      expect(prompt).toContain('MULTIPLE');
    });
  });

  describe('handleDownloadSample', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('creates a download link and triggers click', () => {
      // Mock URL.createObjectURL
      window.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');

      const mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
      };
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      handleDownloadSample();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'mock-url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'sample_questions.csv');
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    });
  });
});
