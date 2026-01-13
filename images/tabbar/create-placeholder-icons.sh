#!/bin/bash

# 创建一个 1x1 像素的透明 PNG 作为占位符
# 这是最小的有效 PNG 文件

# 灰色占位图标 (home.png)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > home.png

# 绿色占位图标 (home-active.png)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > home-active.png

# 灰色占位图标 (mine.png)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > mine.png

# 绿色占位图标 (mine-active.png)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > mine-active.png

echo "占位图标已创建！"
echo "注意：这些是最小的占位图标，建议替换为实际的图标文件"
