#!/bin/bash

# 本地音频录制器启动脚本

echo "🎤 启动本地音频录制器..."
echo "📁 项目目录: $(pwd)"

# 检查是否在浏览器中打开
if command -v open &> /dev/null; then
    # macOS
    open index.html
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open index.html
elif command -v start &> /dev/null; then
    # Windows (Git Bash)
    start index.html
else
    echo "❌ 无法自动打开浏览器，请手动打开 index.html 文件"
    echo "📋 文件列表:"
    ls -la
fi

echo "✅ 启动完成！"
echo "💡 提示："
echo "   - 按空格键开始/停止录音"
echo "   - 按ESC键停止录音"
echo "   - 录音文件保存在浏览器本地存储中"
