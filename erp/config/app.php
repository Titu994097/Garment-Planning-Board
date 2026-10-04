<?php
return [
    'name' => env('APP_NAME', 'Garment & Textile ERP'),
    'url' => env('APP_URL', ''),
    'debug' => (bool) env('APP_DEBUG', false),
    'timezone' => env('APP_TIMEZONE', 'UTC'),
    'locale' => env('APP_LOCALE', 'en'),
    'locales' => ['en' => 'English', 'bn' => 'বাংলা', 'zh' => '中文'],
    'session_name' => 'GTERPSESSID',
    'session_timeout' => 1800,
    'max_login_attempts' => 5,
    'upload_path' => BASE_PATH . '/storage/uploads',
    'api_token_ttl_days' => 90,
];
