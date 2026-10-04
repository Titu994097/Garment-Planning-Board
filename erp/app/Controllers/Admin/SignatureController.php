<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Config;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Response;
use App\Services\SignatureService;

final class SignatureController extends Controller
{
    public function index(): void
    {
        $this->view('signatures/index', [
            'title' => __('digital_signature'),
            'signature' => SignatureService::activeFor((int) Auth::id()),
            'signed' => Database::fetchAll(
                'SELECT * FROM document_signatures WHERE user_id = ? ORDER BY id DESC LIMIT 25',
                [Auth::id()]
            ),
        ]);
    }

    public function store(): void
    {
        $data = $this->validate(['pin' => 'min:4|max:20|regex:/^\d+$/', 'current_password' => 'required']);
        if (!password_verify($data['current_password'], Auth::user()['password_hash'])) {
            Response::json(['success' => false, 'message' => 'Password is incorrect.', 'errors' => ['current_password' => 'Incorrect password']], 422);
        }
        try {
            $file = $this->request->file('signature_file');
            $binary = $file
                ? (string) file_get_contents($file['tmp_name'])
                : SignatureService::decodeDataUrl((string) $this->request->input('signature_data', ''));
            SignatureService::register((int) Auth::id(), $binary, ($data['pin'] ?? '') ?: null);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
        $this->success('Digital signature registered.', 'signatures');
    }

    /** Stream a signature image — only to its owner or users with signature oversight. */
    public function image(string $id): void
    {
        $sig = Database::fetch(
            'SELECT s.*, u.company_id FROM user_signatures s JOIN users u ON u.id = s.user_id WHERE s.id = ?',
            [$id]
        ) ?? Response::abort(404);
        if ((int) $sig['user_id'] !== Auth::id() && !((int) $sig['company_id'] === Auth::companyId() && can('signatures.view_all'))) {
            Response::abort(403);
        }
        $path = realpath(Config::get('app.upload_path') . '/' . $sig['signature_path']);
        $base = realpath(Config::get('app.upload_path'));
        if (!$path || !str_starts_with($path, (string) $base) || !is_file($path)) {
            Response::abort(404);
        }
        header('Content-Type: ' . (str_ends_with($path, '.png') ? 'image/png' : 'image/jpeg'));
        header('Cache-Control: private, max-age=300');
        readfile($path);
        exit;
    }

    /** Public-ish verification page (requires login) for a printed verification code. */
    public function verify(): void
    {
        $code = strtoupper(trim((string) $this->request->input('code', '')));
        $row = $code === '' ? null : Database::fetch(
            'SELECT ds.*, u.full_name, u.designation, c.name AS company_name FROM document_signatures ds
               JOIN users u ON u.id = ds.user_id JOIN companies c ON c.id = ds.company_id WHERE ds.verification_code = ?',
            [$code]
        );
        $this->view('signatures/verify', ['title' => 'Verify Signature', 'code' => $code, 'row' => $row]);
    }
}
