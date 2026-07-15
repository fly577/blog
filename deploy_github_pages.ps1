$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Write-Host "Pushing source branch main..."
git push origin main

$tmp = Join-Path $env:TEMP ("llm-pages-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmp "static") | Out-Null

Copy-Item -LiteralPath "webapp\static\index.html" -Destination (Join-Path $tmp "index.html")
Copy-Item -LiteralPath "webapp\static\app.js" -Destination (Join-Path $tmp "static\app.js")
Copy-Item -LiteralPath "webapp\static\config.js" -Destination (Join-Path $tmp "static\config.js")
Copy-Item -LiteralPath "webapp\static\styles.css" -Destination (Join-Path $tmp "static\styles.css")
Copy-Item -LiteralPath "webapp\static\.nojekyll" -Destination (Join-Path $tmp ".nojekyll")

Push-Location $tmp
try {
    git init -b gh-pages
    git config user.email "codex@local"
    git config user.name "Codex"
    git add .
    git commit -m "Deploy weather travel frontend"
    git remote add origin https://github.com/fly577/blog.git
    git push --force origin gh-pages:gh-pages
}
finally {
    Pop-Location
}

Write-Host "Done. Check https://fly577.github.io/blog/static/config.js"
