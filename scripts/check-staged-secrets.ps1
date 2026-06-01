$ErrorActionPreference = "Stop"

$stagedFiles = @(git diff --cached --name-only --diff-filter=ACMR)
$blockedFiles = @()
$blockedContents = @()

foreach ($file in $stagedFiles) {
  $normalized = $file.Replace("\", "/")
  $isExample = $normalized -match "(^|/)\.env(\.[^/]+)?\.example$"
  $isEnvironmentFile = $normalized -match "(^|/)\.env($|\.)"

  if ($isEnvironmentFile -and -not $isExample) {
    $blockedFiles += $normalized
    continue
  }

  $content = git show ":$file" 2>$null
  if ($LASTEXITCODE -ne 0) {
    continue
  }

  $text = $content -join "`n"
  if (
    $text -match "sk-(proj-)?[A-Za-z0-9_-]{16,}" -or
    $text -match "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"
  ) {
    $blockedContents += $normalized
  }
}

if ($blockedFiles.Count -gt 0 -or $blockedContents.Count -gt 0) {
  Write-Host "Commit bloqueado: possivel segredo detectado." -ForegroundColor Red

  if ($blockedFiles.Count -gt 0) {
    Write-Host "Arquivos de ambiente nao podem entrar no Git:" -ForegroundColor Yellow
    $blockedFiles | ForEach-Object { Write-Host "  - $_" }
  }

  if ($blockedContents.Count -gt 0) {
    Write-Host "Conteudo sensivel detectado nestes arquivos:" -ForegroundColor Yellow
    $blockedContents | ForEach-Object { Write-Host "  - $_" }
  }

  Write-Host "Remova o segredo do stage antes de criar o commit." -ForegroundColor Yellow
  exit 1
}

Write-Host "Checagem de segredos concluida."
