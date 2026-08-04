#!/bin/bash
# Собрать и выложить приложение на GitHub Pages
set -e
cd "$(dirname "$0")"
npm run build
touch dist/.nojekyll
cp dist/index.html dist/404.html   # чтобы прямые ссылки не давали 404
git add -A && git -c commit.gpgsign=false commit -q -m "${1:-обновление}" || true
git push -q origin main
git -c commit.gpgsign=false subtree split --prefix dist -b gh-pages-tmp -q 2>/dev/null || {
  # dist в .gitignore — публикуем через отдельный воркинг
  rm -rf /tmp/bt-pages && cp -R dist /tmp/bt-pages
  cd /tmp/bt-pages && git init -q && git checkout -qb gh-pages
  git config user.name "polygely97"; git config user.email "polygely97@gmail.com"
  git add -A && git -c commit.gpgsign=false commit -q -m "deploy"
  git push -qf https://github.com/polygely97/budget-tracker.git gh-pages
}
echo "✅ выложено: https://polygely97.github.io/budget-tracker/"
