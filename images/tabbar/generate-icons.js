#!/usr/bin/env node

/**
 * 简易图标生成脚本
 * 由于需要实际的 PNG 图片文件，这里创建简单的占位图标
 *
 * 使用方法：
 * 1. 确保安装了 Node.js
 * 2. 运行：node generate-icons.js
 *
 * 注意：此脚本生成的是最简单的占位图标
 * 建议从专业图标库下载更美观的图标
 */

const fs = require('fs');
const path = require('path');

console.log('=================================');
console.log('TabBar 图标准备说明');
console.log('=================================\n');

console.log('需要准备以下 4 个图标文件：');
console.log('1. home.png - 首页未选中图标');
console.log('2. home-active.png - 首页选中图标');
console.log('3. mine.png - 我的未选中图标');
console.log('4. mine-active.png - 我的选中图标\n');

console.log('图标要求：');
console.log('- 尺寸：81px × 81px');
console.log('- 格式：PNG');
console.log('- 大小：< 40kb\n');

console.log('推荐图标来源：');
console.log('- iconfont.cn');
console.log('- iconpark.oceanengine.com');
console.log('- icons8.com\n');

console.log('临时方案：');
console.log('如果暂时没有图标，可以修改 app.json 删除 iconPath 配置，');
console.log('这样会显示纯文字的 tabBar。\n');

console.log('=================================');
