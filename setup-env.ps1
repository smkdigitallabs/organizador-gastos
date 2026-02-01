Write-Host "Configuração de Ambiente via CLI (Vercel + Clerk + Neon)"
Write-Host "========================================================"

# Verificar e instalar dependências
Write-Host "Verificando dependências..."
if (!(Test-Path "node_modules")) {
    Write-Host "Instalando dependências do projeto..."
    npm install
}
npm install pg @clerk/clerk-sdk-node

# Solicitar credenciais
Write-Host "`nPor favor, forneça as credenciais (serão usadas apenas localmente para configurar o Vercel):"
$dbUrl = Read-Host "Digite a Connection String do Neon (DATABASE_URL)"
if ([string]::IsNullOrWhiteSpace($dbUrl)) { Write-Error "DATABASE_URL é obrigatória"; exit 1 }

$clerkPub = Read-Host "Digite a Clerk Publishable Key (pk_test_...)"
if ([string]::IsNullOrWhiteSpace($clerkPub)) { Write-Error "Clerk Publishable Key é obrigatória"; exit 1 }

$clerkSec = Read-Host "Digite a Clerk Secret Key (sk_test_...)"
if ([string]::IsNullOrWhiteSpace($clerkSec)) { Write-Error "Clerk Secret Key é obrigatória"; exit 1 }

# Login e Link no Vercel
Write-Host "`nConectando ao Vercel..."
# Verifica se está logado, se não, pede login
cmd /c "npx vercel whoami" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Faça login no Vercel:"
    cmd /c "npx vercel login"
}

# Linkar projeto
Write-Host "Linkando projeto..."
cmd /c "npx vercel link --yes"

# Configurar Vercel Env
Write-Host "`nConfigurando variáveis de ambiente no Vercel..."

# Função helper para adicionar env
function Add-VercelEnv {
    param($name, $value)
    Write-Host "Configurando $name..."
    # Remover se existir para evitar duplicação/erro
    cmd /c "npx vercel env rm $name production --yes" 2>&1 | Out-Null
    # Adicionar nova (echo pipe funciona no PowerShell para stdin)
    $value | cmd /c "npx vercel env add $name production"
}

Add-VercelEnv "DATABASE_URL" $dbUrl
Add-VercelEnv "CLERK_SECRET_KEY" $clerkSec

# Atualizar frontend (cloudSync.js)
Write-Host "`nAtualizando cloudSync.js com a chave pública..."
$cloudSyncPath = Join-Path $PSScriptRoot "cloudSync.js"
if (Test-Path $cloudSyncPath) {
    $content = Get-Content $cloudSyncPath -Raw
    # Substituir placeholder ou chave antiga
    # Regex para pegar 'pk_test_...' ou similar
    $newContent = $content -replace "const publishableKey = 'pk_test_[^']*';", "const publishableKey = '$clerkPub';"
    $newContent = $newContent -replace "const publishableKey = 'pk_live_[^']*';", "const publishableKey = '$clerkPub';"
    Set-Content $cloudSyncPath $newContent
    Write-Host "cloudSync.js atualizado."
} else {
    Write-Error "cloudSync.js não encontrado!"
}

# Commit e Deploy
Write-Host "`nPreparando deploy..."
git add cloudSync.js package.json package-lock.json
git commit -m "Auto-setup: Environment config and dependencies"
git push

Write-Host "`nIniciando deploy no Vercel..."
cmd /c "npx vercel deploy --prod"

Write-Host "`n=============================================="
Write-Host "Configuração Concluída!"
Write-Host "Se o deploy falhar por falta de variáveis, verifique no painel da Vercel."
