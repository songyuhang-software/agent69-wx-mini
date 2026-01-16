// components/expandable-text/expandable-text.js
Component({
  properties: {
    content: {
      type: String,
      value: ''
    },
    rows: {
      type: Number,
      value: 2
    },
    expandText: {
      type: String,
      value: '展开'
    },
    collapseText: {
      type: String,
      value: '收起'
    },
    expandTextColor: {
      type: String,
      value: '#007bff'
    },
    collapseTextColor: {
      type: String,
      value: '#007bff'
    }
  },

  data: {
    expanded: false,
    showExpandBtn: false
  },

  lifetimes: {
    attached() {
      this.checkOverflow();
    }
  },

  observers: {
    'content, rows': function() {
      this.checkOverflow();
    }
  },

  methods: {
    checkOverflow() {
      // 使用 SelectorQuery 检测是否需要显示展开按钮
      const query = wx.createSelectorQuery().in(this);
      query.select('.content').boundingClientRect((rect) => {
        if (rect) {
          // 估算方法：比较文本长度与预计行数
          const content = this.properties.content || '';
          const rows = this.properties.rows;

          // 根据字体大小和行高估算字符数（粗略估算）
          const charsPerLine = Math.max(10, Math.floor(rect.width / 14)); // 假设字体14px
          const estimatedMaxChars = charsPerLine * rows;

          // 简单的长度判断，实际项目中可能需要更精确的算法
          const showExpandBtn = content.length > estimatedMaxChars;

          this.setData({
            showExpandBtn
          });
        }
      }).exec();
    },

    toggleExpand() {
      this.setData({
        expanded: !this.data.expanded
      });

      // 触发父组件事件
      this.triggerEvent('expandchange', {
        expanded: this.data.expanded
      });
    }
  }
});