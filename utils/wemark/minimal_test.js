console.log('开始测试...');

var Remarkable = require('./wemark/remarkable');
console.log('Remarkable loaded:', !!Remarkable);

try {
    var parser = new Remarkable({ html: true });
    console.log('Parser created');

    var tokens = parser.parse('|A|B|\n|1|2|', {});
    console.log('Tokens parsed:', tokens.length);

} catch (error) {
    console.error('Error:', error.message);
}
