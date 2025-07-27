# AI简历生成器部署指南

## 概述

本文档详细介绍了AI简历生成器的部署流程，包括本地开发、预发布环境和生产环境的部署方案。

## 目录

- [环境要求](#环境要求)
- [构建配置](#构建配置)
- [部署方式](#部署方式)
- [Docker部署](#docker部署)
- [Kubernetes部署](#kubernetes部署)
- [CDN配置](#cdn配置)
- [监控和日志](#监控和日志)
- [故障排除](#故障排除)

## 环境要求

### 基础环境
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Git**: >= 2.20.0

### 容器化环境
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0

### Kubernetes环境
- **Kubernetes**: >= 1.20.0
- **kubectl**: 与集群版本兼容
- **Helm**: >= 3.0.0 (可选)

## 构建配置

### 环境变量配置

#### 开发环境 (.env.example)
```bash
# API配置
VITE_API_BASE_URL=http://localhost:3000
VITE_OPENAI_API_URL=https://api.openai.com/v1

# 功能开关
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_PERFORMANCE_MONITORING=false
```

#### 预发布环境 (.env.staging)
```bash
# API配置
VITE_API_BASE_URL=https://staging-api.ai-resume.com
VITE_CDN_ENABLED=true
VITE_PERFORMANCE_MONITORING=true
```

#### 生产环境 (.env.production)
```bash
# API配置
VITE_API_BASE_URL=https://api.ai-resume.com
VITE_CDN_ENABLED=true
VITE_ENABLE_ANALYTICS=true
VITE_PERFORMANCE_MONITORING=true
```

### 构建命令

```bash
# 开发构建
npm run dev

# 生产构建
npm run build:production

# 预发布构建
npm run build:staging

# 构建分析
npm run build:analyze
```

## 部署方式

### 1. 静态文件部署

最简单的部署方式，适用于CDN或静态文件服务器。

```bash
# 构建应用
npm run build:production

# 部署到服务器
rsync -avz --delete dist/ user@server:/var/www/html/
```

### 2. Docker部署

推荐的部署方式，提供一致的运行环境。

```bash
# 构建Docker镜像
docker build -t ai-resume-generator .

# 运行容器
docker run -d -p 80:80 --name ai-resume-app ai-resume-generator
```

### 3. Docker Compose部署

适用于多服务部署场景。

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

## Docker部署

### Dockerfile说明

我们的Dockerfile采用多阶段构建：

1. **构建阶段**: 使用Node.js镜像编译应用
2. **生产阶段**: 使用Nginx镜像提供静态文件服务

### 构建优化

- **多阶段构建**: 减少最终镜像大小
- **依赖缓存**: 优化构建速度
- **安全配置**: 使用非root用户运行
- **健康检查**: 自动监控容器状态

### 部署步骤

1. **准备环境变量**
```bash
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export GIT_COMMIT=$(git rev-parse --short HEAD)
export APP_VERSION=$(node -p "require('./package.json').version")
```

2. **构建镜像**
```bash
docker build \
  --build-arg NODE_ENV=production \
  --build-arg VITE_BUILD_TIME="$BUILD_TIME" \
  --build-arg VITE_GIT_COMMIT="$GIT_COMMIT" \
  -t ai-resume-generator:$APP_VERSION .
```

3. **运行容器**
```bash
docker run -d \
  --name ai-resume-app \
  -p 80:80 \
  -e BUILD_TIME="$BUILD_TIME" \
  -e GIT_COMMIT="$GIT_COMMIT" \
  -e APP_VERSION="$APP_VERSION" \
  ai-resume-generator:$APP_VERSION
```

### Docker Compose配置

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Kubernetes部署

### 部署清单

#### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-resume-app
  namespace: ai-resume-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-resume-app
  template:
    metadata:
      labels:
        app: ai-resume-app
    spec:
      containers:
      - name: app
        image: ai-resume-generator:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ai-resume-service
  namespace: ai-resume-production
spec:
  selector:
    app: ai-resume-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

#### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-resume-ingress
  namespace: ai-resume-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - ai-resume.com
    secretName: ai-resume-tls
  rules:
  - host: ai-resume.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ai-resume-service
            port:
              number: 80
```

### 部署命令

```bash
# 创建命名空间
kubectl create namespace ai-resume-production

# 应用配置
kubectl apply -f k8s/production/ -n ai-resume-production

# 查看部署状态
kubectl get pods -n ai-resume-production

# 查看服务状态
kubectl get svc -n ai-resume-production

# 查看日志
kubectl logs -f deployment/ai-resume-app -n ai-resume-production
```

## CDN配置

### 静态资源优化

1. **文件压缩**: Gzip/Brotli压缩
2. **缓存策略**: 长期缓存静态资源
3. **版本控制**: 文件名包含hash值
4. **预加载**: 关键资源预加载

### CDN配置示例

```javascript
// CDN配置
const cdnConfig = {
  enabled: true,
  domains: {
    static: 'https://static.ai-resume.com',
    images: 'https://images.ai-resume.com',
    fonts: 'https://fonts.ai-resume.com'
  }
};
```

### 缓存策略

```nginx
# 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML文件缓存
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}
```

## 监控和日志

### 应用监控

1. **性能监控**: Web Vitals指标
2. **错误监控**: 全局错误捕获
3. **用户行为**: 关键操作追踪
4. **资源监控**: 内存和CPU使用

### 日志配置

```javascript
// 日志配置
const logConfig = {
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  format: 'json',
  transports: ['console', 'file']
};
```

### 健康检查

```bash
# 应用健康检查
curl -f http://localhost/health

# 详细状态检查
curl http://localhost/health/detailed
```

## 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清理缓存
npm run build:clean
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

#### 2. 容器启动失败
```bash
# 查看容器日志
docker logs ai-resume-app

# 进入容器调试
docker exec -it ai-resume-app sh
```

#### 3. 性能问题
```bash
# 分析构建包
npm run build:analyze

# 性能审计
npm run performance:audit
```

#### 4. 网络问题
```bash
# 检查网络连接
curl -I http://localhost/health

# 检查DNS解析
nslookup api.ai-resume.com
```

### 回滚策略

#### Docker回滚
```bash
# 回滚到上一个版本
docker stop ai-resume-app
docker rm ai-resume-app
docker run -d --name ai-resume-app ai-resume-generator:previous-version
```

#### Kubernetes回滚
```bash
# 查看部署历史
kubectl rollout history deployment/ai-resume-app -n ai-resume-production

# 回滚到上一个版本
kubectl rollout undo deployment/ai-resume-app -n ai-resume-production
```

## 安全配置

### HTTPS配置
- 强制HTTPS重定向
- HSTS头设置
- 安全Cookie配置

### CSP配置
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://api.openai.com; style-src 'self' 'unsafe-inline'";
```

### 访问控制
- IP白名单
- 速率限制
- 防火墙配置

## 性能优化

### 构建优化
- 代码分割
- Tree Shaking
- 压缩优化
- 缓存策略

### 运行时优化
- CDN加速
- 资源预加载
- 服务端缓存
- 数据库优化

## 维护指南

### 定期维护
1. **依赖更新**: 定期更新npm包
2. **安全扫描**: 运行安全审计
3. **性能监控**: 检查性能指标
4. **日志清理**: 清理旧日志文件

### 备份策略
1. **代码备份**: Git仓库备份
2. **配置备份**: 环境配置备份
3. **数据备份**: 用户数据备份
4. **镜像备份**: Docker镜像备份

---

## 联系信息

如有部署相关问题，请联系：
- 技术支持: tech-support@ai-resume.com
- 运维团队: devops@ai-resume.com