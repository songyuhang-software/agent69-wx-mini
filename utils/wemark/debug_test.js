var path = require('path');
var wemark = require('./wemark/parser');

console.log('开始测试...');

try {
    // 简单的表格测试
    var md = '|A|B|\n|1|2|';
    console.log('输入:', md);

    var result = wemark.parse(md);
    console.log('输出:', result);
    console.log('✅ 解析成功');

} catch (error) {
    console.error('❌ 解析失败:', error.message);
    console.error('堆栈:', error.stack);
}
