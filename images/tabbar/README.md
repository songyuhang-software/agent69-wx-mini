# TabBar 图标准备指南

## 当前状态
为了让小程序能够正常运行，目前 app.json 中配置了图标路径，但实际图标文件需要您手动准备。

## 两种方案

### 方案一：准备图标文件（推荐）
请准备以下 4 个图标文件，放置在 `images/tabbar/` 目录下：

1. `home.png` - 首页未选中图标（灰色 #999999）
2. `home-active.png` - 首页选中图标（绿色 #07C160）
3. `mine.png` - 我的未选中图标（灰色 #999999）
4. `mine-active.png` - 我的选中图标（绿色 #07C160）

**图标要求：**
- 尺寸：81px × 81px
- 格式：PNG（支持透明背景）
- 大小：不超过 40kb

**获取图标的方式：**
- 从 [iconfont](https://www.iconfont.cn/) 下载
- 从 [iconpark](https://iconpark.oceanengine.com/) 下载
- 使用设计工具自己制作

### 方案二：临时使用纯文字 tabBar
如果暂时没有图标，可以修改 `app.json`，删除或注释掉 `iconPath` 和 `selectedIconPath` 配置：


"tabBar": {
  "color": "#999999",
  "selectedColor": "#07C160",
  "backgroundColor": "#ffffff",
  "borderStyle": "black",
  "list": [
    {
      "pagePath": "pages/index/index",
      "text": "首页"
    },
    {
      "pagePath": "pages/mine/mine",
      "text": "我的"
    }
  ]
}


这样 tabBar 会显示为纯文字样式，不会报错。

## 推荐图标样式
- **首页**：房子、主页等图标
- **我的**：用户头像轮廓、个人等图标

