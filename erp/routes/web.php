<?php
/** @var App\Core\Router $router */

use App\Controllers\Admin\ApprovalController;
use App\Controllers\Admin\AuditController;
use App\Controllers\Admin\ResourceController;
use App\Controllers\Admin\RoleController;
use App\Controllers\Admin\SignatureController;
use App\Controllers\Admin\UserController;
use App\Controllers\Admin\WorkflowController;
use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Controllers\ProfileController;
use App\Core\Response;

$router->get('/', fn () => Response::redirect('dashboard'));

$router->group(['middleware' => ['guest']], function ($r) {
    $r->get('/login', [AuthController::class, 'showLogin']);
    $r->post('/login', [AuthController::class, 'login'], ['csrf']);
});

$router->group(['middleware' => ['auth', 'csrf']], function ($r) {
    $r->post('/logout', [AuthController::class, 'logout']);
    $r->get('/dashboard', [DashboardController::class, 'index']);
    $r->get('/dashboard/charts', [DashboardController::class, 'charts']);

    $r->get('/profile/password', [ProfileController::class, 'password']);
    $r->post('/profile/password', [ProfileController::class, 'updatePassword']);
    $r->post('/profile/company', [ProfileController::class, 'switchCompany']);
    $r->post('/profile/tokens', [ProfileController::class, 'createToken']);

    // Approvals (inbox is per-user; authorisation is enforced per step inside the service)
    $r->get('/approvals', [ApprovalController::class, 'inbox']);
    $r->post('/approvals', [ApprovalController::class, 'submit']);
    $r->get('/approvals/{id}', [ApprovalController::class, 'show']);
    $r->post('/approvals/{id}/act', [ApprovalController::class, 'act']);
    $r->post('/approvals/{id}/cancel', [ApprovalController::class, 'cancel']);

    // Digital signatures
    $r->get('/signatures', [SignatureController::class, 'index']);
    $r->post('/signatures', [SignatureController::class, 'store']);
    $r->get('/signatures/verify', [SignatureController::class, 'verify']);
    $r->get('/signatures/{id}/image', [SignatureController::class, 'image']);

    $r->group(['prefix' => 'admin'], function ($r) {
        // Users
        $r->get('/users', [UserController::class, 'index']);
        $r->get('/users/data', [UserController::class, 'data']);
        $r->get('/users/create', [UserController::class, 'create']);
        $r->post('/users', [UserController::class, 'store']);
        $r->get('/users/{id}/edit', [UserController::class, 'edit']);
        $r->put('/users/{id}', [UserController::class, 'update']);
        $r->delete('/users/{id}', [UserController::class, 'destroy']);
        $r->post('/users/{id}/unlock', [UserController::class, 'unlock']);

        // Roles & permissions
        $r->get('/roles', [RoleController::class, 'index']);
        $r->post('/roles', [RoleController::class, 'store']);
        $r->get('/roles/{id}/permissions', [RoleController::class, 'permissions']);
        $r->post('/roles/{id}/permissions', [RoleController::class, 'savePermissions']);
        $r->delete('/roles/{id}', [RoleController::class, 'destroy']);

        // Approval workflow designer
        $r->get('/workflows', [WorkflowController::class, 'index']);
        $r->get('/workflows/create', [WorkflowController::class, 'create']);
        $r->post('/workflows', [WorkflowController::class, 'store']);
        $r->get('/workflows/{id}/edit', [WorkflowController::class, 'edit']);
        $r->put('/workflows/{id}', [WorkflowController::class, 'update']);
        $r->delete('/workflows/{id}', [WorkflowController::class, 'destroy']);

        // Audit trail
        $r->get('/audit', [AuditController::class, 'index']);
        $r->get('/audit/data', [AuditController::class, 'data']);
        $r->get('/audit/logins', [AuditController::class, 'logins']);

        // Registry-driven masters: companies, factories, departments, cost centers, ...
        $r->get('/{key}', [ResourceController::class, 'index']);
        $r->get('/{key}/data', [ResourceController::class, 'data']);
        $r->get('/{key}/export', [ResourceController::class, 'export']);
        $r->get('/{key}/create', [ResourceController::class, 'create']);
        $r->post('/{key}', [ResourceController::class, 'store']);
        $r->get('/{key}/{id}/edit', [ResourceController::class, 'edit']);
        $r->put('/{key}/{id}', [ResourceController::class, 'update']);
        $r->delete('/{key}/{id}', [ResourceController::class, 'destroy']);
    });
});
