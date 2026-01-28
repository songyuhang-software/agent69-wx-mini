const parser = require('./wemark/parser');

// 测试粗体文本
const md = '这是一段包含**粗体**的文字';
const result = parser.parse(md, {});

console.log(JSON.stringify(result, null, 2));
