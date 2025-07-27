# Build Validation Script
param(
    [Parameter(Mandatory=$false)]
    [string]$BuildPath = "dist"
)

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Blue
}

function Write-Success($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Test-BuildOutput {
    Write-Info "Validating build output..."
    
    if (-not (Test-Path $BuildPath)) {
        Write-Error "Build directory does not exist: $BuildPath"
        return $false
    }
    
    # Check required files
    $requiredFiles = @(
        "index.html",
        "manifest.webmanifest",
        "sw.js"
    )
    
    foreach ($file in $requiredFiles) {
        $filePath = Join-Path $BuildPath $file
        if (-not (Test-Path $filePath)) {
            Write-Error "Missing required file: $file"
            return $false
        }
    }
    
    Write-Success "Build output validation passed"
    return $true
}

function Test-AssetOptimization {
    Write-Info "Checking asset optimization..."
    
    $assetsPath = Join-Path $BuildPath "assets"
    if (-not (Test-Path $assetsPath)) {
        Write-Error "Assets directory does not exist"
        return $false
    }
    
    # Check JS files
    $jsPath = Join-Path $assetsPath "js"
    if (Test-Path $jsPath) {
        $jsFiles = Get-ChildItem -Path $jsPath -Filter "*.js"
        Write-Info "Found $($jsFiles.Count) JS files"
        
        foreach ($jsFile in $jsFiles) {
            $sizeMB = [math]::Round($jsFile.Length / 1MB, 2)
            if ($jsFile.Length -gt 1MB) {
                Write-Warning "Large JS file: $($jsFile.Name) ($sizeMB MB)"
            }
        }
    }
    
    # Check CSS files
    $cssPath = Join-Path $assetsPath "css"
    if (Test-Path $cssPath) {
        $cssFiles = Get-ChildItem -Path $cssPath -Filter "*.css"
        Write-Info "Found $($cssFiles.Count) CSS files"
        
        foreach ($cssFile in $cssFiles) {
            $sizeKB = [math]::Round($cssFile.Length / 1KB, 2)
            if ($cssFile.Length -gt 500KB) {
                Write-Warning "Large CSS file: $($cssFile.Name) ($sizeKB KB)"
            }
        }
    }
    
    Write-Success "Asset optimization check completed"
    return $true
}

function Get-BuildStats {
    Write-Info "Generating build statistics..."
    
    $totalSize = 0
    $fileCount = 0
    
    if (Test-Path $BuildPath) {
        $allFiles = Get-ChildItem -Path $BuildPath -Recurse -File
        $totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum
        $fileCount = $allFiles.Count
        
        $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
        
        Write-Info "Build Statistics:"
        Write-Info "  Total files: $fileCount"
        Write-Info "  Total size: $totalSizeMB MB"
    }
    
    return @{
        FileCount = $fileCount
        TotalSize = $totalSize
    }
}

# Main validation process
function Main {
    Write-Info "Starting build validation..."
    Write-Info "Build path: $BuildPath"
    
    $results = @{
        BuildOutput = Test-BuildOutput
        AssetOptimization = Test-AssetOptimization
    }
    
    # Generate build statistics
    $stats = Get-BuildStats
    
    # Summary
    Write-Info ""
    Write-Info "Validation Results:"
    $passCount = 0
    foreach ($result in $results.GetEnumerator()) {
        $status = if ($result.Value) { "PASS"; $passCount++ } else { "FAIL" }
        Write-Info "  $($result.Key): $status"
    }
    
    if ($passCount -eq $results.Count) {
        Write-Success ""
        Write-Success "All validations passed! Build is ready for deployment."
        exit 0
    } else {
        Write-Warning ""
        Write-Warning "Some validations failed. Please check the issues above."
        exit 1
    }
}

# Execute main function
Main