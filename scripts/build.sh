#!/bin/bash

# AI简历生成器构建脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取构建信息
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
APP_VERSION=$(node -p "require('./package.json').version")

# 环境变量
ENVIRONMENT=${1:-production}
ANALYZE=${2:-false}

log_info "开始构建 AI简历生成器"
log_info "环境: $ENVIRONMENT"
log_info "版本: $APP_VERSION"
log_info "分支: $GIT_BRANCH"
log_info "提交: $GIT_COMMIT"
log_info "构建时间: $BUILD_TIME"

# 检查Node.js版本
NODE_VERSION=$(node -v)
log_info "Node.js版本: $NODE_VERSION"

if ! node -e "process.exit(parseInt(process.version.slice(1)) >= 16 ? 0 : 1)"; then
    log_error "需要Node.js 16或更高版本"
    exit 1
fi

# 清理旧的构建文件
log_info "清理构建目录..."
rm -rf dist
rm -rf .vite

# 安装依赖
log_info "检查依赖..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    log_info "安装依赖..."
    npm ci --silent
fi

# 类型检查
log_info "执行类型检查..."
npm run type-check

# 代码检查
log_info "执行代码检查..."
npm run lint

# 格式检查
log_info "检查代码格式..."
npm run format:check

# 运行测试
log_info "运行单元测试..."
npm run test:coverage

# 设置环境变量
export NODE_ENV=production
export VITE_BUILD_TIME="$BUILD_TIME"
export VITE_GIT_COMMIT="$GIT_COMMIT"
export VITE_APP_VERSION="$APP_VERSION"

# 根据环境加载配置
case $ENVIRONMENT in
    "staging")
        log_info "使用预发布环境配置"
        cp .env.staging .env.production.local
        ;;
    "production")
        log_info "使用生产环境配置"
        ;;
    *)
        log_warning "未知环境: $ENVIRONMENT，使用默认生产配置"
        ;;
esac

# 构建应用
log_info "开始构建应用..."
npm run build:compile

# 检查构建结果
if [ ! -d "dist" ]; then
    log_error "构建失败：dist目录不存在"
    exit 1
fi

# 构建分析
if [ "$ANALYZE" = "true" ]; then
    log_info "分析构建包大小..."
    npm run build:analyze
fi

# 生成构建报告
log_info "生成构建报告..."
BUILD_SIZE=$(du -sh dist | cut -f1)
JS_SIZE=$(find dist/assets -name "*.js" -exec du -ch {} + | grep total | cut -f1)
CSS_SIZE=$(find dist/assets -name "*.css" -exec du -ch {} + | grep total | cut -f1)

cat > dist/build-info.json << EOF
{
  "version": "$APP_VERSION",
  "buildTime": "$BUILD_TIME",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH",
  "environment": "$ENVIRONMENT",
  "nodeVersion": "$NODE_VERSION",
  "buildSize": "$BUILD_SIZE",
  "jsSize": "$JS_SIZE",
  "cssSize": "$CSS_SIZE"
}
EOF

# 安全检查
log_info "执行安全检查..."
npm audit --audit-level moderate || log_warning "发现安全警告，请检查"

# 性能检查
log_info "检查关键文件大小..."
for file in dist/assets/*.js; do
    if [ -f "$file" ]; then
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        if [ "$size" -gt 1048576 ]; then # 1MB
            log_warning "文件过大: $(basename "$file") ($(numfmt --to=iec "$size"))"
        fi
    fi
done

log_success "构建完成！"
log_info "构建信息:"
log_info "  - 总大小: $BUILD_SIZE"
log_info "  - JS大小: $JS_SIZE"
log_info "  - CSS大小: $CSS_SIZE"
log_info "  - 输出目录: dist/"

# 清理临时文件
rm -f .env.production.local

log_success "构建脚本执行完成"