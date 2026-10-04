<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Response;
use App\Core\Session;

final class AuthController extends Controller
{
    public function showLogin(): void
    {
        $this->view('auth/login', ['title' => 'Sign in'], 'blank');
    }

    public function login(): void
    {
        $data = $this->validate(['username' => 'required|max:150', 'password' => 'required|max:200']);
        $result = Auth::attempt(trim($data['username']), $data['password'], $this->request);
        if ($result !== true) {
            $msg = match ($result) {
                'locked' => 'Account locked after too many failed attempts. Try again in 15 minutes.',
                'inactive' => 'Your account is not active. Contact the administrator.',
                default => 'Invalid username or password.',
            };
            $_SESSION['_old'] = ['username' => $data['username']];
            Session::flash('error', $msg);
            Response::redirect('login');
        }
        $intended = $_SESSION['_intended'] ?? 'dashboard';
        unset($_SESSION['_intended'], $_SESSION['_old']);
        Response::redirect(ltrim($intended, '/'));
    }

    public function logout(): void
    {
        Auth::logout();
        Response::redirect('login');
    }
}
