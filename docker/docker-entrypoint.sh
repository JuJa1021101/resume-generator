#!/bin/sh
set -e

# 环境变量替换函数
replace_env_vars() {
    local file="$1"
    if [ -f "$file" ]; then
        # 替换构建时间和版本信息
        if [ -n "$BUILD_TIME" ]; then
            sed -i "s/__BUILD_TIME__/$BUILD_TIME/g" "$file"
        fi
        if [ -n "$GIT_COMMIT" ]; then
            sed -i "s/__GIT_COMMIT__/$GIT_COMMIT/g" "$file"
        fi
        if [ -n "$APP_VERSION" ]; then
            sed -i "s/__APP_VERSION__/$APP_VERSION/g" "$file"
        fi
    fi
}

# 处理HTML文件中的环境变量
echo "Processing environment variables..."
find /usr/share/nginx/html -name "*.html" -exec sh -c 'replace_env_vars "$1"' _ {} \;
find /usr/share/nginx/html -name "*.js" -exec sh -c 'replace_env_vars "$1"' _ {} \;

# 设置正确的文件权限
echo "Setting file permissions..."
chown -R nginx:nginx /usr/share/nginx/html
find /usr/share/nginx/html -type f -exec chmod 644 {} \;
find /usr/share/nginx/html -type d -exec chmod 755 {} \;

# 验证nginx配置
echo "Validating nginx configuration..."
nginx -t

# 启动nginx
echo "Starting nginx..."
exec "$@"