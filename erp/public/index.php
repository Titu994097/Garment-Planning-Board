<?php
declare(strict_types=1);

/**
 * Front controller — every HTTP request enters here.
 */
// let `php -S` serve real files (css/js/images) directly
if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

define('BASE_PATH', dirname(__DIR__));

require BASE_PATH . '/app/Core/Autoloader.php';
App\Core\Autoloader::register(BASE_PATH . '/app');

$app = new App\Core\App(BASE_PATH);
$app->run();
