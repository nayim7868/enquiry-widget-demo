# Prisma Diagnostic Script
# Searches for patterns that might cause "engine type client" error

Write-Host "=== Prisma Diagnostic Scan ===" -ForegroundColor Cyan
Write-Host ""

$patterns = @(
    "@prisma/client/edge",
    "engineType",
    "adapter",
    "accelerateUrl",
    "prisma.config"
)

$found = $false

foreach ($pattern in $patterns) {
    Write-Host "Searching for: $pattern" -ForegroundColor Yellow
    
    $results = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.prisma,*.config.* -Exclude node_modules,*.d.ts,*.tsbuildinfo | 
        Select-String -Pattern $pattern -CaseSensitive:$false | 
        Where-Object { $_.Path -notmatch '\\node_modules\\' -and $_.Path -notmatch '\\.next\\' }
    
    if ($results) {
        $found = $true
        foreach ($result in $results) {
            Write-Host "  Found in: $($result.Path):$($result.LineNumber)" -ForegroundColor Red
            Write-Host "    $($result.Line.Trim())" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No matches found" -ForegroundColor Green
    }
    Write-Host ""
}

if (-not $found) {
    Write-Host "=== No problematic patterns found ===" -ForegroundColor Green
} else {
    Write-Host "=== Found potential issues above ===" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking DATABASE_URL..." -ForegroundColor Yellow
if ($env:DATABASE_URL) {
    Write-Host "  DATABASE_URL is set: $($env:DATABASE_URL.Substring(0, [Math]::Min(50, $env:DATABASE_URL.Length)))..." -ForegroundColor Green
} else {
    Write-Host "  DATABASE_URL is NOT set in environment" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking Prisma version..." -ForegroundColor Yellow
$prismaVersion = (npm list prisma --depth=0 2>$null | Select-String "prisma@").ToString()
$clientVersion = (npm list @prisma/client --depth=0 2>$null | Select-String "@prisma/client@").ToString()
Write-Host "  $prismaVersion" -ForegroundColor Cyan
Write-Host "  $clientVersion" -ForegroundColor Cyan
