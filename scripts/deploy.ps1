# AI简历生成器部署脚本 (PowerShell)
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("staging", "production")]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$Docker,
    
    [Parameter(Mandatory=$false)]
    [switch]$Kubernetes,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests
)

# 颜色函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Info($message) {
    Write-ColorOutput Blue "[INFO] $message"
}

function Write-Success($message) {
    Write-ColorOutput Green "[SUCCESS] $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "[WARNING] $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "[ERROR] $message"
}

# 主函数
function Main {
    Write-Info "开始部署 AI简历生成器"
    Write-Info "环境: $Environment"
    Write-Info "Docker: $Docker"
    Write-Info "Kubernetes: $Kubernetes"
    
    # 检查先决条件
    if (-not (Test-Prerequisites)) {
        Write-Error "先决条件检查失败"
        exit 1
    }
    
    # 构建应用
    if (-not $SkipBuild) {
        Write-Info "开始构建应用..."
        if (-not (Build-Application)) {
            Write-Error "构建失败"
            exit 1
        }
    }
    
    # 运行测试
    if (-not $SkipTests) {
        Write-Info "运行测试..."
        if (-not (Run-Tests)) {
            Write-Error "测试失败"
            exit 1
        }
    }
    
    # 部署应用
    if ($Docker) {
        Deploy-Docker
    } elseif ($Kubernetes) {
        Deploy-Kubernetes
    } else {
        Deploy-Static
    }
    
    # 健康检查
    Write-Info "执行健康检查..."
    if (Test-Deployment) {
        Write-Success "部署成功！"
    } else {
        Write-Error "部署验证失败"
        exit 1
    }
}

# 检查先决条件
function Test-Prerequisites {
    Write-Info "检查先决条件..."
    
    # 检查Node.js
    try {
        $nodeVersion = node --version
        Write-Info "Node.js版本: $nodeVersion"
    } catch {
        Write-Error "Node.js未安装"
        return $false
    }
    
    # 检查npm
    try {
        $npmVersion = npm --version
        Write-Info "npm版本: $npmVersion"
    } catch {
        Write-Error "npm未安装"
        return $false
    }
    
    # 检查Docker（如果需要）
    if ($Docker) {
        try {
            $dockerVersion = docker --version
            Write-Info "Docker版本: $dockerVersion"
        } catch {
            Write-Error "Docker未安装"
            return $false
        }
    }
    
    # 检查kubectl（如果需要）
    if ($Kubernetes) {
        try {
            $kubectlVersion = kubectl version --client --short
            Write-Info "kubectl版本: $kubectlVersion"
        } catch {
            Write-Error "kubectl未安装"
            return $false
        }
    }
    
    return $true
}

# 构建应用
function Build-Application {
    Write-Info "清理构建目录..."
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    
    Write-Info "安装依赖..."
    npm ci --silent
    if ($LASTEXITCODE -ne 0) {
        return $false
    }
    
    Write-Info "执行构建..."
    $env:NODE_ENV = "production"
    $env:VITE_BUILD_TIME = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    $env:VITE_GIT_COMMIT = (git rev-parse --short HEAD)
    $env:VITE_APP_VERSION = (Get-Content package.json | ConvertFrom-Json).version
    
    if ($Environment -eq "staging") {
        Copy-Item ".env.staging" ".env.production.local"
    }
    
    npm run build:compile
    if ($LASTEXITCODE -ne 0) {
        return $false
    }
    
    # 清理临时文件
    if (Test-Path ".env.production.local") {
        Remove-Item ".env.production.local"
    }
    
    return $true
}

# 运行测试
function Run-Tests {
    Write-Info "运行单元测试..."
    npm run test:coverage
    if ($LASTEXITCODE -ne 0) {
        return $false
    }
    
    Write-Info "运行端到端测试..."
    npm run test:e2e
    if ($LASTEXITCODE -ne 0) {
        return $false
    }
    
    return $true
}

# Docker部署
function Deploy-Docker {
    Write-Info "开始Docker部署..."
    
    $imageName = "ai-resume-generator:latest"
    $containerName = "ai-resume-app"
    
    # 构建Docker镜像
    Write-Info "构建Docker镜像..."
    docker build -t $imageName .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker镜像构建失败"
        exit 1
    }
    
    # 停止现有容器
    Write-Info "停止现有容器..."
    docker stop $containerName 2>$null
    docker rm $containerName 2>$null
    
    # 启动新容器
    Write-Info "启动新容器..."
    if ($Environment -eq "staging") {
        docker-compose -f docker-compose.staging.yml up -d
    } else {
        docker-compose -f docker-compose.production.yml up -d
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "容器启动失败"
        exit 1
    }
    
    Write-Success "Docker部署完成"
}

# Kubernetes部署
function Deploy-Kubernetes {
    Write-Info "开始Kubernetes部署..."
    
    $namespace = "ai-resume-$Environment"
    
    # 创建命名空间
    kubectl create namespace $namespace --dry-run=client -o yaml | kubectl apply -f -
    
    # 应用配置
    kubectl apply -f "k8s/$Environment/" -n $namespace
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Kubernetes部署失败"
        exit 1
    }
    
    # 等待部署完成
    Write-Info "等待部署完成..."
    kubectl rollout status deployment/ai-resume-app -n $namespace --timeout=300s
    
    Write-Success "Kubernetes部署完成"
}

# 静态文件部署
function Deploy-Static {
    Write-Info "开始静态文件部署..."
    
    # 这里可以添加上传到CDN或静态文件服务器的逻辑
    # 例如：AWS S3, Azure Blob Storage, 或其他静态托管服务
    
    Write-Info "部署到静态文件服务器..."
    # rsync -avz --delete dist/ user@server:/var/www/html/
    
    Write-Success "静态文件部署完成"
}

# 部署验证
function Test-Deployment {
    Write-Info "验证部署..."
    
    $maxRetries = 30
    $retryCount = 0
    
    do {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/health" -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "健康检查通过"
                return $true
            }
        } catch {
            Write-Info "等待服务启动... ($retryCount/$maxRetries)"
        }
        
        Start-Sleep -Seconds 2
        $retryCount++
    } while ($retryCount -lt $maxRetries)
    
    Write-Error "健康检查失败"
    return $false
}

# 执行主函数
Main