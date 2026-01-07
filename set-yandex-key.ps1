# Скрипт для настройки Yandex Maps API ключа
# Запустите этот скрипт от имени администратора

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

Write-Host "Установка Yandex Maps API ключа..." -ForegroundColor Green

# Установка переменной окружения для текущего пользователя
[System.Environment]::SetEnvironmentVariable('YANDEX_MAPS_API_KEY', $ApiKey, 'User')

# Добавление в .env.local файл проекта
$envFile = ".env.local"
$envContent = Get-Content $envFile -ErrorAction SilentlyContinue
$keyLine = "YANDEX_MAPS_API_KEY=$ApiKey"

if ($envContent -and ($envContent -notcontains $keyLine)) {
    Add-Content $envFile "`n$keyLine"
    Write-Host "Ключ добавлен в .env.local" -ForegroundColor Green
} elseif (-not $envContent) {
    Set-Content $envFile $keyLine
    Write-Host "Создан файл .env.local с ключом" -ForegroundColor Green
} else {
    Write-Host "Ключ уже присутствует в .env.local" -ForegroundColor Yellow
}

Write-Host "API ключ установлен! Перезапустите сервер разработки." -ForegroundColor Green
Write-Host "Тестирование: http://localhost:3000/api/test-yandex-key" -ForegroundColor Cyan
