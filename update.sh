#!/bin/bash
# ============================================
# XingRin 系统更新脚本
# 用途：更新代码 + 同步版本 + 重建镜像 + 重启服务
# ============================================
#
# 更新流程：
# 1. 停止服务
# 2. git pull 拉取最新代码
# 3. 合并 .env 新配置项 + 同步 VERSION
# 4. 构建/拉取镜像（开发模式构建，生产模式拉取）
# 5. 启动服务（server 启动时自动执行数据库迁移）
#
# 用法:
#   sudo ./update.sh                 生产模式更新（拉取 Docker Hub 镜像）
#   sudo ./update.sh --dev           开发模式更新（本地构建镜像）
#   sudo ./update.sh --no-frontend   更新后只启动后端
#   sudo ./update.sh --dev --no-frontend     开发环境更新后只启动后端

cd "$(dirname "$0")"

# 权限检查
if [ "$EUID" -ne 0 ]; then
    echo -e "\033[0;31m[错误] 请使用 sudo 运行此脚本\033[0m"
    echo -e "   正确用法: \033[1msudo ./update.sh\033[0m"
    exit 1
fi

# 跨平台 sed -i（兼容 macOS 和 Linux）
sed_inplace() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# 解析参数判断模式
DEV_MODE=false
for arg in "$@"; do
    case $arg in
        --dev) DEV_MODE=true ;;
    esac
done

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 合并 .env 新配置项（保留用户已有值）
merge_env_config() {
    local example_file="docker/.env.example"
    local env_file="docker/.env"
    
    if [ ! -f "$example_file" ] || [ ! -f "$env_file" ]; then
        return
    fi
    
    local new_keys=0
    
    while IFS= read -r line || [ -n "$line" ]; do
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        local key="${line%%=*}"
        [[ -z "$key" || "$key" == "$line" ]] && continue
        
        if ! grep -q "^${key}=" "$env_file"; then
            printf '%s\n' "$line" >> "$env_file"
            echo -e "    ${GREEN}+${NC} 新增: $key"
            ((new_keys++))
        fi
    done < "$example_file"
    
    if [ $new_keys -gt 0 ]; then
        echo -e "    ${GREEN}OK${NC} 已添加 $new_keys 个新配置项"
    else
        echo -e "    ${GREEN}OK${NC} 配置已是最新"
    fi
}

echo ""
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════╗${NC}"
if [ "$DEV_MODE" = true ]; then
    echo -e "${BOLD}${BLUE}║       开发环境更新（本地构建）          ║${NC}"
else
    echo -e "${BOLD}${BLUE}║       生产环境更新（Docker Hub）        ║${NC}"
fi
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# 测试性功能警告
echo -e "${BOLD}${YELLOW}[!] 警告：此功能为测试性功能，可能会导致升级失败${NC}"
echo -e "${YELLOW}    建议运行 ./uninstall.sh 后重新执行 ./install.sh 进行全新安装${NC}"
echo ""
echo -n -e "${YELLOW}是否继续更新？(y/N) ${NC}"
read -r ans_continue
ans_continue=${ans_continue:-N}

if [[ ! $ans_continue =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}已取消更新。${NC}"
    exit 0
fi
echo ""

# Step 1: 停止服务
echo -e "${CYAN}[1/5]${NC} 停止服务..."
./stop.sh 2>&1 | sed 's/^/    /'

# Step 2: 拉取代码
echo ""
echo -e "${CYAN}[2/5]${NC} 拉取代码..."
git pull --rebase 2>&1 | sed 's/^/    /'
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误]${NC} git pull 失败，请手动解决冲突后重试"
    exit 1
fi

# Step 3: 检查配置更新 + 版本同步
echo ""
echo -e "${CYAN}[3/5]${NC} 检查配置更新..."
merge_env_config

# 版本同步：从 VERSION 文件更新 IMAGE_TAG
if [ -f "VERSION" ]; then
    NEW_VERSION=$(cat VERSION | tr -d '[:space:]')
    if [ -n "$NEW_VERSION" ]; then
        if grep -q "^IMAGE_TAG=" "docker/.env"; then
            sed_inplace "s/^IMAGE_TAG=.*/IMAGE_TAG=$NEW_VERSION/" "docker/.env"
            echo -e "    ${GREEN}+${NC} 版本同步: IMAGE_TAG=$NEW_VERSION"
        else
            printf '%s\n' "IMAGE_TAG=$NEW_VERSION" >> "docker/.env"
            echo -e "    ${GREEN}+${NC} 新增版本: IMAGE_TAG=$NEW_VERSION"
        fi
    fi
fi

# Step 4: 构建/拉取镜像
echo ""
echo -e "${CYAN}[4/5]${NC} 更新镜像..."

if [ "$DEV_MODE" = true ]; then
    # 开发模式：本地构建所有镜像（包括 Worker）
    echo -e "    构建 Worker 镜像..."
    
    # 读取 IMAGE_TAG
    IMAGE_TAG=$(grep "^IMAGE_TAG=" "docker/.env" | cut -d'=' -f2)
    if [ -z "$IMAGE_TAG" ]; then
        IMAGE_TAG="dev"
    fi
    
    # 构建 Worker 镜像（Worker 是临时容器，不在 compose 中，需要单独构建）
    docker build -t docker-worker -f docker/worker/Dockerfile . 2>&1 | sed 's/^/    /'
    docker tag docker-worker docker-worker:${IMAGE_TAG} 2>&1 | sed 's/^/    /'
    echo -e "    ${GREEN}OK${NC} Worker 镜像已构建: docker-worker:${IMAGE_TAG}"
    
    # 其他服务镜像由 start.sh --dev 构建
    echo -e "    其他服务镜像将在启动时构建..."
else
    # 生产模式：镜像由 start.sh 拉取
    echo -e "    镜像将在启动时从 Docker Hub 拉取..."
fi

# Step 5: 启动服务
echo ""
echo -e "${CYAN}[5/5]${NC} 启动服务..."
./start.sh "$@"

echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  更新完成！${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
echo ""
