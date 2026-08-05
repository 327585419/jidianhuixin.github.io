#!/usr/bin/env bash
# ============================================
# 四川积电汇芯官网 - 一键部署到 GitHub Pages
# 前置条件：gh auth login 已完成登录
# 用法：bash deploy.sh
# ============================================
set -euo pipefail
cd "$(dirname "$0")"

REPO_NAME="jidianhuixin.github.io"   # 组织/个人主页仓库名，可改
SITE_DIR="$(pwd)"

echo "==> [1/5] 检查 gh 认证..."
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ 未登录 GitHub，请先执行: gh auth login"
  exit 1
fi
echo "✅ 已认证: $(gh api user -q .login)"

echo "==> [2/5] 配置 git 身份..."
git config user.name  "$(gh api user -q .login)"
git config user.email "$(gh api user -q .email 2>/dev/null || echo "$(gh api user -q .login)@users.noreply.github.com")"

echo "==> [3/5] 提交网站文件..."
git add -A
if ! git diff --cached --quiet; then
  git commit -m "网站改版：视觉升级 + SEO + 表单落地 + 性能优化

- 视频压缩 59MB→21.5MB，图片转 WebP
- 补全 meta/OG/JSON-LD 结构化数据
- 表单接入 FormSubmit
- 可访问性优化（aria/语义化/键盘导航）
- 新增 robots.txt / sitemap.xml / thanks.html" || echo "（提交可能为空）"
else
  echo "（无待提交变更）"
fi

echo "==> [4/5] 创建/推送 GitHub 仓库..."
if ! gh repo view "$REPO_NAME" >/dev/null 2>&1; then
  echo "创建仓库 $REPO_NAME ..."
  gh repo create "$REPO_NAME" --public --source="$SITE_DIR" --push || {
    echo "自动创建失败，尝试关联现有仓库..."
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
  }
else
  git branch -M main
  git push -u origin main
fi

echo "==> [5/5] 启用 GitHub Pages..."
if ! gh api "repos/$REPO_NAME/pages" >/dev/null 2>&1; then
  gh api -X POST "repos/$REPO_NAME/pages" -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || \
  gh api -X POST "repos/$REPO_NAME/pages" -f "source[branch]=master" -f "source[path]=/" >/dev/null 2>&1
  echo "⏳ Pages 已启用，首次部署需等待 1-3 分钟..."
else
  echo "Pages 已存在，触发重新部署..."
  gh api -X POST "repos/$REPO_NAME/pages/builds" >/dev/null 2>&1 || true
fi

echo ""
echo "=============================================="
echo "✅ 部署完成！"
echo "   公网地址: https://$REPO_NAME/"
echo "   首次部署约 1-3 分钟后生效，可用以下命令检查："
echo "   gh api repos/$REPO_NAME/pages -q .status"
echo "=============================================="
