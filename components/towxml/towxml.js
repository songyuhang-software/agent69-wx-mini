/**
 * TowXML - 简化版Markdown解析组件
 * 用于微信小程序聊天消息渲染
 */

Component({
  properties: {
    content: {
      type: String,
      value: '',
      observer: 'render'
    },
    theme: {
      type: String,
      value: 'light',
      observer: 'render'
    },
    loading: {
      type: Boolean,
      value: false,
      observer: 'render'
    }
  },

  data: {
    nodes: [],
    error: null
  },

  lifetimes: {
    attached() {
      this.render();
    }
  },

  methods: {
    render() {
      const { content, loading } = this.data;

      if (loading || !content) {
        this.setData({ nodes: [], error: null });
        return;
      }

      try {
        const html = this.parseMarkdown(content);
        // 使用rich-text组件的nodes格式
        const nodes = [{
          name: 'div',
          attrs: {
            class: 'markdown-content'
          },
          children: [{
            name: 'div',
            attrs: {
              class: 'markdown-inner'
            },
            children: this.parseHTMLString(html)
          }]
        }];

        this.setData({ nodes, error: null });
      } catch (error) {
        console.error('Markdown解析失败:', error);
        // 失败时显示原始文本
        const nodes = [{
          name: 'div',
          attrs: { class: 'markdown-error' },
          children: [{
            name: '#text',
            attrs: {},
            children: content
          }]
        }];
        this.setData({ nodes, error: null });
      }
    },

    /**
     * 解析Markdown为HTML字符串
     */
    parseMarkdown(markdown) {
      if (!markdown || typeof markdown !== 'string') {
        return '';
      }

      let html = '';
      const lines = markdown.split('\n');
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
          i++;
          continue;
        }

        // 代码块
        if (line.trim().startsWith('```')) {
          const result = this.parseCodeBlock(lines, i);
          html += result.html;
          i = result.nextIndex;
          continue;
        }

        // 标题
        if (line.startsWith('#')) {
          html += this.parseHeading(line);
          i++;
          continue;
        }

        // 列表
        if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
          const result = this.parseList(lines, i);
          html += result.html;
          i = result.nextIndex;
          continue;
        }

        // 引用
        if (line.startsWith('> ')) {
          const result = this.parseBlockquote(lines, i);
          html += result.html;
          i = result.nextIndex;
          continue;
        }

        // 分割线
        if (line.trim() === '---' || line.trim() === '***') {
          html += '<div class="markdown-hr"></div>';
          i++;
          continue;
        }

        // 段落
        const result = this.parseParagraph(lines, i);
        html += result.html;
        i = result.nextIndex;
      }

      return html;
    },

    /**
     * 解析代码块
     */
    parseCodeBlock(lines, startIndex) {
      const lang = lines[startIndex].trim().slice(3);
      let content = '';
      let i = startIndex + 1;

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        content += lines[i] + '\n';
        i++;
      }

      const html = `<div class="towxml-code-block"><pre class="towxml-pre"><code class="language-${lang}">${this.escapeHtml(content.trim())}</code></pre></div>`;
      return { html, nextIndex: i + 1 };
    },

    /**
     * 解析标题
     */
    parseHeading(line) {
      const match = line.match(/^(#{1,6})\s+(.+)/);
      if (!match) return `<p>${this.escapeHtml(line)}</p>`;

      const level = match[1].length;
      const text = this.parseInlineText(match[2]);
      return `<h${level} class="towxml-h${level}">${text}</h${level}>`;
    },

    /**
     * 解析列表
     */
    parseList(lines, startIndex) {
      const isOrdered = /^\d+\.\s/.test(lines[startIndex]);
      let html = isOrdered ? '<ol class="towxml-ol">' : '<ul class="towxml-ul">';
      let i = startIndex;

      while (i < lines.length) {
        const line = lines[i];
        const match = isOrdered
          ? line.match(/^(\d+)\.\s(.+)/)
          : line.match(/^[-*]\s(.+)/);

        if (match) {
          html += `<li class="towxml-li">${this.parseInlineText(match[2])}</li>`;
          i++;
        } else {
          break;
        }
      }

      html += isOrdered ? '</ol>' : '</ul>';
      return { html, nextIndex: i };
    },

    /**
     * 解析引用
     */
    parseBlockquote(lines, startIndex) {
      let html = '<blockquote class="towxml-blockquote"><div class="towxml-blockquote-content">';
      let i = startIndex;

      while (i < lines.length && lines[i].startsWith('> ')) {
        const text = lines[i].slice(2);
        html += `<p class="towxml-p">${this.parseInlineText(text)}</p>`;
        i++;
      }

      html += '</div></blockquote>';
      return { html, nextIndex: i };
    },

    /**
     * 解析段落
     */
    parseParagraph(lines, startIndex) {
      let content = '';
      let i = startIndex;

      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim() || line.startsWith('#') ||
            /^[-*]\s/.test(line) || /^\d+\.\s/.test(line) ||
            line.startsWith('> ') || line.trim().startsWith('') ||
            line.trim() === '---' || line.trim() === '***') {
          break;
        }
        content += line + ' ';
        i++;
      }

      if (content.trim()) {
        return { html: `<p class="towxml-p">${this.parseInlineText(content.trim())}</p>`, nextIndex: i };
      }
      return { html: '', nextIndex: i };
    },

    /**
     * 解析行内文本
     */
    parseInlineText(text) {
      if (!text) return '';

      // 转义HTML
      let result = this.escapeHtml(text);

      // 处理代码 `code`
      result = result.replace(/`([^`]+)`/g, '<code class="towxml-code-inline">$1</code>');

      // 处理粗体 **text**
      result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="towxml-strong">$1</strong>');

      // 处理斜体 *text*
      result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="towxml-em">$1</em>');

      // 处理删除线 ~~text~~
      result = result.replace(/~~([^~]+)~~/g, '<del class="towxml-del">$1</del>');

      // 处理链接 [text](url)
      result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="towxml-a">$1</a>');

      return result;
    },

    /**
     * 转义HTML
     */
    escapeHtml(text) {
      if (!text) return '';
      const escapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return text.replace(/[&<>"']/g, char => escapes[char]);
    },

    /**
     * 简单HTML解析为节点（用于rich-text）
     */
    parseHTMLString(html) {
      // 简化实现，直接返回HTML字符串，rich-text会处理HTML渲染
      return [{
        name: 'div',
        attrs: {
          class: 'markdown-html-content'
        },
        children: [{
          name: '#text',
          attrs: {},
          children: html
        }]
      }];
    },

    /**
     * 链接点击事件
     */
    onLinkTap(e) {
      const href = e.currentTarget.dataset.href;
      if (href) {
        console.log('链接点击:', href);
        // 可以添加处理逻辑，如复制链接等
      }
    }
  }
})