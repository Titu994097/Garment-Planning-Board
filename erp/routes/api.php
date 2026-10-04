<?php
/** @var App\Core\Router $router */

use App\Controllers\Api\ApiController;

$router->group(['prefix' => 'api/v1'], function ($r) {
    $r->post('/auth/token', [ApiController::class, 'token']);

    $r->group(['middleware' => ['api']], function ($r) {
        $r->get('/me', [ApiController::class, 'me']);
        $r->get('/approvals/inbox', [ApiController::class, 'approvalInbox']);
        $r->post('/approvals', [ApiController::class, 'approvalSubmit']);
        $r->post('/approvals/{id}/action', [ApiController::class, 'approvalAct']);

        $r->get('/{key}', [ApiController::class, 'index']);
        $r->get('/{key}/{id}', [ApiController::class, 'show']);
        $r->post('/{key}', [ApiController::class, 'store']);
        $r->put('/{key}/{id}', [ApiController::class, 'update']);
        $r->delete('/{key}/{id}', [ApiController::class, 'destroy']);
    });
});
