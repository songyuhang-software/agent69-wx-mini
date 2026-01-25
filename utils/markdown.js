/**
 * 轻量级Markdown解析器
 * 支持微信小程序Rich Text组件
 */

class MarkdownParser {
  constructor() {
    this.nodes = [];
  }

  /**
   * 解析Markdown文本为Rich Text节点数组
   * @param {string} markdown Markdown文本
   * @returns {Array} Rich Text节点数组
   */
  parse(markdown) {
    if (!markdown || typeof markdown !== 'string') {
      return [];
    }

    this.nodes = [];
    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 空行
      if (!line.trim()) {
        i++;
        continue;
      }

      // 代码块
      if (line.trim().startsWith('')) {
        i = this.parseCodeBlock(lines, i);
        continue;
      }

      // 标题
      if (line.startsWith('#')) {
        i = this.parseHeading(lines, i);
        continue;
      }

      // 有序列表
      if (/^\d+\.\s/.test(line)) {
        i = this.parseOrderedList(lines, i);
        continue;
      }

      // 无序列表
      if (line.startsWith('- ') || line.startsWith('* ')) {
        i = this.parseUnorderedList(lines, i);
        continue;
      }

      // 引用
      if (line.startsWith('> ')) {
        i = this.parseBlockquote(lines, i);
        continue;
      }

      // 水平分割线
      if (line.trim() === '---' || line.trim() === '***') {
        this.addNode('view', {}, { style: 'border-top: 1px solid #ddd; margin: 16rpx 0;' });
        i++;
        continue;
      }

      // 普通段落
      i = this.parseParagraph(lines, i);
    }

    return this.nodes;
  }

  /**
   * 解析代码块
   */
  parseCodeBlock(lines, startIndex) {
    const startLang = lines[startIndex].trim().slice(3);
    let content = '';
    let i = startIndex + 1;

    while (i < lines.length) {
      if (lines[i].trim().startsWith('')) {
        break;
      }
      content += lines[i] + '\n';
      i++;
    }

    // 添加代码块容器
    this.addNode('view', {
      class: 'markdown-code-block'
    }, {}, [
      {
        name: 'view',
        children: [{
          type: 'text',
          text: content.trim()
        }],
        attrs: {
          class: 'markdown-code-content'
        }
      }
    ]);

    return i + 1;
  }

  /**
   * 解析标题
   */
  parseHeading(lines, startIndex) {
    const line = lines[startIndex];
    const match = line.match(/^(#{1,6})\s+(.+)/);

    if (match) {
      const level = match[1].length;
      const text = match[2];

      this.addNode('view', {
        class: `markdown-heading-${level}`
      }, {}, [{
        type: 'text',
        text: text
      }]);
    }

    return startIndex + 1;
  }

  /**
   * 解析有序列表
   */
  parseOrderedList(lines, startIndex) {
    const listItems = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i];
      const match = line.match(/^(\d+)\.\s(.+)/);

      if (match) {
        const text = this.parseInlineText(match[2]);
        listItems.push(text);
        i++;
      } else {
        break;
      }
    }

    this.addNode('view', {
      class: 'markdown-ordered-list'
    }, {}, listItems.map(item => ({
      name: 'view',
      children: [{
        type: 'text',
        text: item
      }],
      attrs: {
        class: 'markdown-list-item'
      }
    })));

    return i;
  }

  /**
   * 解析无序列表
   */
  parseUnorderedList(lines, startIndex) {
    const listItems = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i];
      const match = line.match(/^[-*]\s(.+)/);

      if (match) {
        const text = this.parseInlineText(match[1]);
        listItems.push(text);
        i++;
      } else {
        break;
      }
    }

    this.addNode('view', {
      class: 'markdown-unordered-list'
    }, {}, listItems.map(item => ({
      name: 'view',
      children: [{
        type: 'text',
        text: item
      }],
      attrs: {
        class: 'markdown-list-item'
      }
    })));

    return i;
  }

  /**
   * 解析引用
   */
  parseBlockquote(lines, startIndex) {
    const content = [];
    let i = startIndex;

    while (i < lines.length && lines[i].startsWith('> ')) {
      const text = lines[i].slice(2);
      content.push(this.parseInlineText(text));
      i++;
    }

    this.addNode('view', {
      class: 'markdown-blockquote'
    }, {}, [{
      name: 'view',
      children: content.map(text => ({
        type: 'text',
        text: text
      })),
      attrs: {
        class: 'markdown-blockquote-content'
      }
    }]);

    return i;
  }

  /**
   * 解析段落
   */
  parseParagraph(lines, startIndex) {
    const content = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i];

      // 如果遇到空行或特殊格式，结束段落
      if (!line.trim() || line.startsWith('#') || line.startsWith('- ') ||
          line.startsWith('* ') || line.startsWith('> ') || line.trim().startsWith('') ||
          /^\d+\.\s/.test(line) || line.trim() === '---' || line.trim() === '***') {
        break;
      }

      content.push(this.parseInlineText(line));
      i++;
    }

    if (content.length > 0) {
      this.addNode('view', {
        class: 'markdown-paragraph'
      }, {}, content.map(text => ({
        type: 'text',
        text: text
      })));
    }

    return i;
  }

  /**
   * 解析行内文本（支持粗体、斜体、代码等）
   */
  parseInlineText(text) {
    let result = text;

    // 处理行内代码 `code`
    result = result.replace(/`([^`]+)`/g, (match, code) => {
      return `<code>${code}</code>`;
    });

    // 处理粗体 **text**
    result = result.replace(/\*\*([^*]+)\*\*/g, (match, bold) => {
      return `<strong>${bold}</strong>`;
    });

    // 处理斜体 *text*
    result = result.replace(/\*([^*]+)\*/g, (match, italic) => {
      return `<em>${italic}</em>`;
    });

    // 处理删除线 ~~text~~
    result = result.replace(/~~([^~]+)~~/g, (match, strike) => {
      return `<del>${strike}</del>`;
    });

    // 处理链接 [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      return `<a href="${url}">${linkText}</a>`;
    });

    return result;
  }

  /**
   * 添加节点到结果数组
   */
  addNode(name, attrs = {}, style = {}, children = []) {
    const node = {
      name: name,
      attrs: {
        ...attrs,
        ...style
      }
    };

    if (children.length > 0) {
      node.children = children;
    }

    this.nodes.push(node);
  }
}

/**
 * 解析Markdown文本为Rich Text节点数组
 * @param {string} markdown Markdown文本
 * @returns {Array} Rich Text节点数组
 */
function parseMarkdown(markdown) {
  const parser = new MarkdownParser();
  return parser.parse(markdown);
}

/**
 * 检查文本是否包含Markdown格式
 * @param {string} text 要检查的文本
 * @returns {boolean} 是否包含Markdown格式
 */
function hasMarkdown(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const markdownPatterns = [
    /^#{1,6}\s/m,           // 标题
    /\*\*(.+?)\*\*/g,       // 粗体
    /\*(.+?)\*/g,           // 斜体
    /`(.+?)`/g,             // 行内代码
    /^[-*]\s/m,             // 无序列表
    /^\d+\.\s/m,            // 有序列表
    /^>\s/m,                // 引用
    //,                  // 代码块
    /~~(.+?)~~/g,           // 删除线
    /\[([^\]]+)\]\(([^)]+)\)/g  // 链接
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
}

module.exports = {
  parseMarkdown,
  hasMarkdown,
  MarkdownParser
};