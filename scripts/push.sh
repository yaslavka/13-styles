#!/bin/bash
# Быстрый пуш изменений в GitHub (yaslavka/13-styles)
cd /home/z/my-project || exit 1
git add -A
git commit -m "${1:-update}" >/dev/null 2>&1 || echo "[push] нечего коммитить"
git push origin main 2>&1 | grep -v "To github\|remote:" | head -3 || true
if [ $? -eq 0 ]; then echo "[push] залито в GitHub: ${1:-update}"; fi
