/**
 * Invisible Zero-Width Steganography Engine
 *
 * Encodes an identifier (such as User UUID or Email) into invisible zero-width unicode characters
 * and embeds it throughout textual content.
 *
 * Zero-width characters used:
 * - \u200B (Zero-Width Space)          -> Binary 0
 * - \u200C (Zero-Width Non-Joiner)     -> Binary 1
 * - \u200D (Zero-Width Joiner)         -> Header / Trailer delimiter
 * - \uFEFF (Zero-Width No-Break / BOM) -> Signature marker
 */

const ZERO_WIDTH_ZERO = '\u200B';
const ZERO_WIDTH_ONE = '\u200C';
const ZERO_WIDTH_DELIMITER = '\u200D';
const ZERO_WIDTH_SIGNATURE = '\uFEFF';

const HEADER = `${ZERO_WIDTH_SIGNATURE}${ZERO_WIDTH_DELIMITER}`;
const TRAILER = `${ZERO_WIDTH_DELIMITER}${ZERO_WIDTH_SIGNATURE}`;

/**
 * Converts a string payload into a zero-width unicode binary sequence with headers.
 */
export function encodeFingerprint(payload: string): string {
  if (!payload) return '';

  const binaryChars: string[] = [];
  for (let i = 0; i < payload.length; i++) {
    const charCode = payload.charCodeAt(i);
    // Pad to 16 bits to support full UTF-16 / Unicode range safely
    const binary = charCode.toString(2).padStart(16, '0');
    for (let j = 0; j < binary.length; j++) {
      binaryChars.push(binary[j] === '1' ? ZERO_WIDTH_ONE : ZERO_WIDTH_ZERO);
    }
  }

  return `${HEADER}${binaryChars.join('')}${TRAILER}`;
}

/**
 * Extracts and decodes the embedded fingerprint from a text string.
 * Returns null if no valid signature or payload is found.
 */
export function decodeFingerprint(text: string): string | null {
  if (!text) return null;

  const headerIndex = text.indexOf(HEADER);
  if (headerIndex === -1) return null;

  const startIndex = headerIndex + HEADER.length;
  const trailerIndex = text.indexOf(TRAILER, startIndex);
  if (trailerIndex === -1) return null;

  const zeroWidthPayload = text.slice(startIndex, trailerIndex);
  if (zeroWidthPayload.length === 0 || zeroWidthPayload.length % 16 !== 0) {
    return null;
  }

  try {
    let result = '';
    for (let i = 0; i < zeroWidthPayload.length; i += 16) {
      const chunk = zeroWidthPayload.slice(i, i + 16);
      let binaryStr = '';
      for (let j = 0; j < chunk.length; j++) {
        const char = chunk[j];
        if (char === ZERO_WIDTH_ONE) {
          binaryStr += '1';
        } else if (char === ZERO_WIDTH_ZERO) {
          binaryStr += '0';
        } else {
          return null; // Corrupted sequence
        }
      }
      const charCode = parseInt(binaryStr, 2);
      if (isNaN(charCode)) return null;
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Embeds an invisible forensic fingerprint into the provided text.
 * Appends the encoded signature seamlessly to the content string.
 */
export function embedFingerprint(content: string, payload: string): string {
  if (!content) return encodeFingerprint(payload);
  if (!payload) return content;

  // If content already contains the signature, avoid duplicate embedding
  if (content.includes(HEADER)) {
    return content;
  }

  const encoded = encodeFingerprint(payload);
  return content + encoded;
}
