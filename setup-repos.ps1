$services = @{
    "user-service" = "vkpaints-user-service"
    "product-service" = "vkpaints-product-service"
    "quotation-service" = "vkpaints-quotation-service"
    "notification-service" = "vkpaints-notification-service"
    "retailer-service" = "vkpaints-retailer-service"
    "order-service" = "vkpaints-order-service"
    "frontend" = "vkpaints-frontend-service"
}

$baseDir = "c:\Users\Admin\Documents\VK-Paints"

foreach ($key in $services.Keys) {
    $serviceDir = Join-Path $baseDir $key
    $repoName = $services[$key]
    
    if (Test-Path $serviceDir) {
        Write-Host "Setting up $repoName in $serviceDir"
        
        # Create GitHub workflows directory
        $wfDir = Join-Path $serviceDir ".github\workflows"
        New-Item -ItemType Directory -Force -Path $wfDir | Out-Null
        
        # pr-checks.yml
        $prContent = @"
name: PR Security Scans
on:
  pull_request:
    branches: [ main ]
jobs:
  scans:
    uses: VK-Paints/vkpaints-workflow/.github/workflows/pr-scans.yml@main
    with:
      service_name: $key
    secrets:
      SONAR_TOKEN: `$`{{ secrets.SONAR_TOKEN }}`
      SNYK_TOKEN: `$`{{ secrets.SNYK_TOKEN }}`
      SMTP_USERNAME: `$`{{ secrets.SMTP_USERNAME }}`
      SMTP_PASSWORD: `$`{{ secrets.SMTP_PASSWORD }}`
      SLACK_WEBHOOK: `$`{{ secrets.SLACK_WEBHOOK }}`
"@
        Set-Content -Path (Join-Path $wfDir "pr-checks.yml") -Value $prContent
        
        # dev-build.yml
        $devContent = @"
name: Dev Build & Push
on:
  push:
    branches: [ main ]
jobs:
  build:
    uses: VK-Paints/vkpaints-workflow/.github/workflows/build-push-dev.yml@main
    with:
      service_name: $key
    secrets:
      ORG_GH_TOKEN: `$`{{ secrets.ORG_GH_TOKEN }}`
      SMTP_USERNAME: `$`{{ secrets.SMTP_USERNAME }}`
      SMTP_PASSWORD: `$`{{ secrets.SMTP_PASSWORD }}`
      SLACK_WEBHOOK: `$`{{ secrets.SLACK_WEBHOOK }}`
"@
        Set-Content -Path (Join-Path $wfDir "dev-build.yml") -Value $devContent
        
        # release-build.yml
        $releaseContent = @"
name: Production Release
on:
  release:
    types: [ published ]
jobs:
  release:
    uses: VK-Paints/vkpaints-workflow/.github/workflows/build-push-release.yml@main
    with:
      service_name: $key
"@
        Set-Content -Path (Join-Path $wfDir "release-build.yml") -Value $releaseContent
        
        # .gitignore
        $ignoreContent = @"
node_modules/
.env
dist/
build/
coverage/
"@
        Set-Content -Path (Join-Path $serviceDir ".gitignore") -Value $ignoreContent
        
        # Git setup
        Push-Location $serviceDir
        git init
        git branch -M dev
        git add .
        git commit -m "Initial commit for $repoName with CI/CD workflows"
        git remote add origin "https://github.com/VK-Paints/$repoName.git"
        Pop-Location
    }
}

# Setup Workflow Repo
Write-Host "Setting up vkpaints-workflow"
$wfRepoDir = Join-Path $baseDir "vkpaints-workflow"
Push-Location $wfRepoDir
git init
git branch -M main
git add .
git commit -m "Initial commit for reusable workflows"
git remote add origin "https://github.com/VK-Paints/vkpaints-workflow.git"
Pop-Location

Write-Host "Done!"
