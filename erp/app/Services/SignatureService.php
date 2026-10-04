<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\AuditLogger;
use App\Core\Auth;
use App\Core\Config;
use App\Core\Database;

/**
 * Digital signature management.
 *  - A user registers a signature image (drawn on canvas or uploaded PNG/JPG), optionally protected by a PIN.
 *  - When a document is signed we store a SHA-256 hash of the canonical document payload plus a short
 *    verification code, so any later change to the document can be detected.
 */
final class SignatureService
{
    private const MAX_BYTES = 512 * 1024;

    public static function activeFor(int $userId): ?array
    {
        return Database::fetch(
            "SELECT * FROM user_signatures WHERE user_id = ? AND status = 'active' AND is_default = 1 ORDER BY id DESC LIMIT 1",
            [$userId]
        );
    }

    /** Store a signature from a base64 data URL (canvas) or raw uploaded bytes. */
    public static function register(int $userId, string $binary, ?string $pin): int
    {
        if (strlen($binary) > self::MAX_BYTES) {
            throw new \InvalidArgumentException('Signature image is too large (max 512 KB).');
        }
        $info = @getimagesizefromstring($binary);
        if (!$info || !in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG], true)) {
            throw new \InvalidArgumentException('Signature must be a PNG or JPEG image.');
        }
        $ext = $info[2] === IMAGETYPE_PNG ? 'png' : 'jpg';
        $dir = Config::get('app.upload_path') . '/signatures';
        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }
        $name = sprintf('sig_%d_%s.%s', $userId, bin2hex(random_bytes(8)), $ext);
        file_put_contents($dir . '/' . $name, $binary);

        return Database::transaction(function () use ($userId, $binary, $name, $pin) {
            Database::query(
                "UPDATE user_signatures SET is_default = 0, status = 'revoked', revoked_at = NOW() WHERE user_id = ? AND status = 'active'",
                [$userId]
            );
            $id = Database::insert('user_signatures', [
                'user_id' => $userId,
                'signature_path' => 'signatures/' . $name,
                'signature_hash' => hash('sha256', $binary),
                'pin_hash' => $pin ? password_hash($pin, PASSWORD_DEFAULT) : null,
            ]);
            AuditLogger::log('signature_register', 'user_signatures', $id);
            return $id;
        });
    }

    public static function decodeDataUrl(string $dataUrl): string
    {
        if (!preg_match('#^data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)$#', $dataUrl, $m)) {
            throw new \InvalidArgumentException('Invalid signature data.');
        }
        return (string) base64_decode($m[2], true);
    }

    /**
     * Apply the user's signature to a document.
     * @param array $payload canonical document data used for the integrity hash
     */
    public static function sign(string $docType, int $docId, array $payload, ?string $pin, ?string $role = null, ?int $approvalRequestId = null): int
    {
        $userId = (int) Auth::id();
        $sig = self::activeFor($userId);
        if (!$sig) {
            throw new \RuntimeException('You have not registered a digital signature yet.');
        }
        if ($sig['pin_hash'] && !password_verify((string) $pin, $sig['pin_hash'])) {
            throw new \RuntimeException('Invalid signature PIN.');
        }
        $id = Database::insert('document_signatures', [
            'company_id' => Auth::companyId(),
            'document_type' => $docType,
            'document_id' => $docId,
            'user_id' => $userId,
            'user_signature_id' => $sig['id'],
            'approval_request_id' => $approvalRequestId,
            'sign_role' => $role,
            'document_hash' => self::hash($payload),
            'verification_code' => strtoupper(bin2hex(random_bytes(8))),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
        AuditLogger::log('sign', $docType, $docId, null, ['document_signature_id' => $id, 'role' => $role]);
        return $id;
    }

    /** Re-hash current document data and compare against the stored signature. */
    public static function verify(string $code, array $currentPayload): array
    {
        $row = Database::fetch(
            'SELECT ds.*, u.full_name, u.designation FROM document_signatures ds JOIN users u ON u.id = ds.user_id WHERE verification_code = ?',
            [strtoupper($code)]
        );
        if (!$row) {
            return ['valid' => false, 'reason' => 'Unknown verification code'];
        }
        $intact = hash_equals($row['document_hash'], self::hash($currentPayload));
        return ['valid' => $intact, 'reason' => $intact ? 'Document unchanged since signing' : 'Document modified after signing', 'signature' => $row];
    }

    public static function hash(array $payload): string
    {
        ksort($payload);
        return hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION));
    }
}
