import crypto from 'crypto';
import { env }  from '../config/env.js';
import logger   from '../utils/logger.js';

/**
 * TokenService
 * ────────────
 * Two responsibilities:
 *
 * 1. ENCRYPT / DECRYPT record ID
 *    AES-256-GCM encryption so the record ID in the URL is unreadable.
 *    e.g. "1000823000013518007" → "a3f9c2b1e4d7...  (encrypted, unguessable)
 *
 * 2. SIGN / VALIDATE short-lived tokens
 *    HMAC-SHA256 signed payload { encryptedId, exp, nonce }
 *    Token expires in 15 minutes.
 *
 * Final URL format:
 *   /pages/docs/{encryptedId}?token={signedToken}
 *
 * The encryptedId in the URL path is opaque — no one can guess the record ID.
 * The token in the query string ensures the link expires and can't be reused.
 */

const SECRET      = env.TOKEN_SECRET || env.API_KEY;
const TTL_SECONDS = 15 * 60;   // 15 minutes

// AES-256 requires a 32-byte key — derive one from SECRET using SHA-256
const ENC_KEY = crypto.createHash('sha256').update(String(SECRET)).digest();
const ALGO    = 'aes-256-gcm';

class TokenService {

    // ─────────────────────────────────────────────────────────────────────
    //  ENCRYPT record ID  →  opaque string safe for URLs
    // ─────────────────────────────────────────────────────────────────────
    /**
     * Encrypts a CRM record ID into a URL-safe opaque string.
     * @param {string} recordId  e.g. "1000823000013518007"
     * @returns {string}         URL-safe encrypted string
     */
    encryptId(recordId) {
        const iv         = crypto.randomBytes(12);           // 96-bit IV for GCM
        const cipher     = crypto.createCipheriv(ALGO, ENC_KEY, iv);
        const encrypted  = Buffer.concat([
            cipher.update(String(recordId), 'utf8'),
            cipher.final(),
        ]);
        const authTag    = cipher.getAuthTag();

        // Pack: iv(12) + authTag(16) + encrypted — all base64url encoded
        const packed = Buffer.concat([iv, authTag, encrypted]);
        return packed.toString('base64url');
    }

    // ─────────────────────────────────────────────────────────────────────
    //  DECRYPT  →  original record ID
    // ─────────────────────────────────────────────────────────────────────
    /**
     * Decrypts an encrypted ID back to the original CRM record ID.
     * @param {string} encryptedId
     * @returns {string | null}  original record ID, or null if tampered
     */
    decryptId(encryptedId) {
        try {
            const packed    = Buffer.from(encryptedId, 'base64url');
            const iv        = packed.subarray(0, 12);
            const authTag   = packed.subarray(12, 28);
            const encrypted = packed.subarray(28);

            const decipher  = crypto.createDecipheriv(ALGO, ENC_KEY, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final(),
            ]);

            return decrypted.toString('utf8');
        } catch {
            logger.warn('TokenService: decryption failed — data may be tampered');
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //  GENERATE signed token  (after encrypting the ID)
    // ─────────────────────────────────────────────────────────────────────
    /**
     * Generates a full { encryptedId, token } pair for the redirect URL.
     * @param {string} recordId   CRM record ID
     * @returns {{ encryptedId: string, token: string }}
     */
    generate(recordId) {
        const encryptedId = this.encryptId(recordId);

        const payload = {
            encryptedId,
            exp:   Math.floor(Date.now() / 1000) + TTL_SECONDS,
            nonce: crypto.randomBytes(8).toString('hex'),
        };

        const payloadB64 = this._toBase64Url(JSON.stringify(payload));
        const sig        = this._sign(payloadB64);
        const token      = `${payloadB64}.${sig}`;

        logger.info('TokenService: link generated', {
            recordId,
            encryptedId: encryptedId.slice(0, 12) + '…',   // partial log only
            expiresIn: `${TTL_SECONDS}s`,
        });

        return { encryptedId, token };
    }

    // ─────────────────────────────────────────────────────────────────────
    //  VALIDATE token + decrypt ID
    // ─────────────────────────────────────────────────────────────────────
    /**
     * Validates a token and returns the original record ID if valid.
     * @param {string} token
     * @param {string} encryptedId  — must match what's in the token payload
     * @returns {{ recordId: string, exp: number } | null}
     */
    validate(token, encryptedId) {
        try {
            if (!token || !encryptedId) return null;

            const parts = token.split('.');
            if (parts.length !== 2) return null;

            const [payloadB64, sig] = parts;

            // ── 1. Verify signature ───────────────────────────────────────
            const expectedSig = this._sign(payloadB64);
            if (!crypto.timingSafeEqual(
                Buffer.from(sig,         'base64url'),
                Buffer.from(expectedSig, 'base64url'),
            )) {
                logger.warn('TokenService: invalid signature');
                return null;
            }

            // ── 2. Decode payload ─────────────────────────────────────────
            const payload = JSON.parse(
                Buffer.from(payloadB64, 'base64url').toString('utf8')
            );

            // ── 3. Check expiry ───────────────────────────────────────────
            if (Math.floor(Date.now() / 1000) > payload.exp) {
                logger.warn('TokenService: token expired');
                return null;
            }

            // ── 4. encryptedId in URL must match encryptedId in token ─────
            if (payload.encryptedId !== encryptedId) {
                logger.warn('TokenService: encryptedId mismatch — possible tampering');
                return null;
            }

            // ── 5. Decrypt to get real record ID ──────────────────────────
            const recordId = this.decryptId(encryptedId);
            if (!recordId) return null;

            return { recordId, exp: payload.exp };

        } catch (err) {
            logger.warn('TokenService: validation error', { message: err.message });
            return null;
        }
    }


    // ─────────────────────────────────────────────────────────────────────
    //  GENERATE short-lived file token
    //  Used to sign individual storage file URLs so they expire
    //  TTL: same as page token (15 min) — both expire together
    // ─────────────────────────────────────────────────────────────────────
    generateFileToken(filePath) {
        const payload = {
            path:  filePath,
            exp:   Math.floor(Date.now() / 1000) + TTL_SECONDS,
            nonce: crypto.randomBytes(6).toString('hex'),
        };
        const payloadB64 = this._toBase64Url(JSON.stringify(payload));
        const sig        = this._sign(payloadB64);
        return `${payloadB64}.${sig}`;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  VALIDATE file token  →  returns filePath if valid, null if not
    // ─────────────────────────────────────────────────────────────────────
    validateFileToken(token, filePath) {
        try {
            if (!token) return null;
            const parts = token.split('.');
            if (parts.length !== 2) return null;

            const [payloadB64, sig] = parts;

            // Verify signature
            const expectedSig = this._sign(payloadB64);
            if (!crypto.timingSafeEqual(
                Buffer.from(sig,         'base64url'),
                Buffer.from(expectedSig, 'base64url'),
            )) {
                logger.warn('TokenService: file token invalid signature');
                return null;
            }

            const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

            // Check expiry
            if (Math.floor(Date.now() / 1000) > payload.exp) {
                logger.warn('TokenService: file token expired');
                return null;
            }

            // Path must match
            if (payload.path !== filePath) {
                logger.warn('TokenService: file token path mismatch');
                return null;
            }

            return payload.path;
        } catch (err) {
            logger.warn('TokenService: file token validation error', { message: err.message });
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //  PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────
    _sign(data) {
        return crypto
            .createHmac('sha256', SECRET)
            .update(data)
            .digest('base64url');
    }

    _toBase64Url(str) {
        return Buffer.from(str, 'utf8').toString('base64url');
    }
}

export default new TokenService();