import { describe, it, expect } from 'vitest';
import { encodeFingerprint, decodeFingerprint, embedFingerprint } from '../steganography';

describe('Zero-Width Steganography Engine', () => {
  it('correctly encodes and decodes a user email address', () => {
    const email = 'student.bcs2026@gmail.com';
    const encoded = encodeFingerprint(email);

    expect(encoded.length).toBeGreaterThan(0);
    // Ensure all characters are zero-width unicode
    for (let i = 0; i < encoded.length; i++) {
      const code = encoded.charCodeAt(i);
      expect([0x200b, 0x200c, 0x200d, 0xfeff]).toContain(code);
    }

    const decoded = decodeFingerprint(encoded);
    expect(decoded).toBe(email);
  });

  it('correctly encodes and decodes a UUID payload', () => {
    const uuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const encoded = encodeFingerprint(uuid);
    const decoded = decodeFingerprint(encoded);
    expect(decoded).toBe(uuid);
  });

  it('embeds fingerprint into plain English text and allows retrieval', () => {
    const originalText = 'Welcome to BCS preliminary preparation course. Follow the syllabus guidelines.';
    const userId = 'user_987654';

    const fingerprintedText = embedFingerprint(originalText, userId);

    // Visible text should look identical when zero-width characters are stripped
    const stripped = fingerprintedText.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    expect(stripped).toBe(originalText);

    // Decoding should recover the exact user ID
    const recoveredId = decodeFingerprint(fingerprintedText);
    expect(recoveredId).toBe(userId);
  });

  it('embeds fingerprint into Bengali text without altering visible representation', () => {
    const bengaliText = 'বিসিএস প্রিলিমিনারি প্রস্তুতির জন্য বাংলাদেশ বিষয়াবলি অত্যন্ত গুরুত্বপূর্ণ একটি বিষয়।';
    const studentEmail = 'shariar@eduverse.org';

    const fingerprintedText = embedFingerprint(bengaliText, studentEmail);

    // Visible text should be identical
    const stripped = fingerprintedText.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    expect(stripped).toBe(bengaliText);

    const recovered = decodeFingerprint(fingerprintedText);
    expect(recovered).toBe(studentEmail);
  });

  it('embeds fingerprint into HTML content after closing tags without breaking HTML structure', () => {
    const htmlContent = '<div><h1>অধ্যায় ১: প্রাচীন বাংলা</h1><p>মৌর্য ও গুপ্ত সাম্রাজ্যের শাসনকাল।</p></div>';
    const leakerId = 'leaker_account_4421';

    const fingerprintedHtml = embedFingerprint(htmlContent, leakerId);

    // Check that tags are intact
    expect(fingerprintedHtml).toContain('<h1>অধ্যায় ১: প্রাচীন বাংলা</h1>');
    expect(fingerprintedHtml).toContain('<p>মৌর্য ও গুপ্ত সাম্রাজ্যের শাসনকাল।</p>');

    const recovered = decodeFingerprint(fingerprintedHtml);
    expect(recovered).toBe(leakerId);
  });

  it('embeds fingerprint safely into MathJax and scientific formula text', () => {
    const mathContent = 'The formula for energy is $E = mc^2$ where $c = 3 \\times 10^8$ m/s.';
    const userId = 'usr_physics_101';

    const fingerprintedMath = embedFingerprint(mathContent, userId);
    const recovered = decodeFingerprint(fingerprintedMath);
    expect(recovered).toBe(userId);
  });

  it('handles edge cases gracefully', () => {
    // Empty inputs
    expect(encodeFingerprint('')).toBe('');
    expect(decodeFingerprint('')).toBeNull();
    expect(embedFingerprint('', '')).toBe('');
    expect(decodeFingerprint('Random text with no zero width characters')).toBeNull();

    // Corrupted zero-width payload (not multiple of 16)
    const corruptedPayload = '\uFEFF\u200D\u200B\u200C\u200D\uFEFF';
    expect(decodeFingerprint(corruptedPayload)).toBeNull();

    // Incomplete header/trailer
    expect(decodeFingerprint('\uFEFF\u200D\u200B\u200C')).toBeNull();
  });

  it('avoids double-embedding if content already contains a signature', () => {
    const text = 'Some lecture content';
    const firstEmbed = embedFingerprint(text, 'user_1');
    const secondEmbed = embedFingerprint(firstEmbed, 'user_2');

    // Should not double-embed
    expect(secondEmbed).toBe(firstEmbed);
    expect(decodeFingerprint(secondEmbed)).toBe('user_1');
  });
});
