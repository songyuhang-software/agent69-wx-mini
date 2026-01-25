/**
 * 时间格式化工具模块
 * 提供智能时间显示和消息时间分组功能
 */

/**
 * 格式化时间为人性化的显示格式
 * @param {Date|string} dateString - 日期对象或日期字符串
 * @returns {string} 格式化后的时间字符串
 *
 * @example
 * formatTime(new Date()) // "14:30"
 * formatTime('2024-01-24 14:30:00') // "昨天 14:30"
 * formatTime('2024-01-22 14:30:00') // "星期一 14:30"
 * formatTime('2024-01-15 14:30:00') // "01-15 14:30"
 */
function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // 如果是今天
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return timeStr;
  }

  // 如果是昨天
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()) {
    return `昨天 ${timeStr}`;
  }

  // 如果是本周内（7天内）
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekDay = weekDays[date.getDay()];
    return `${weekDay} ${timeStr}`;
  }

  // 其他日期
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day} ${timeStr}`;
}

/**
 * 为消息列表添加智能时间标签
 * 只在消息时间跨度超过指定阈值时显示时间标签
 *
 * @param {Array} messages - 消息列表，每条消息需包含 id 和 rawTimestamp 字段
 * @param {Object} options - 配置选项
 * @param {number} options.threshold - 时间阈值（毫秒），默认 5 分钟
 * @param {boolean} options.showFirstTime - 是否始终显示第一条消息的时间，默认 true
 * @param {string} options.timestampField - 时间戳字段名，默认 'rawTimestamp'
 * @returns {Array} 包含时间标签的消息列表
 *
 * @example
 * const messages = [
 *   { id: '1', content: 'Hello', rawTimestamp: new Date('2024-01-25 14:00:00') },
 *   { id: '2', content: 'Hi', rawTimestamp: new Date('2024-01-25 14:01:00') },
 *   { id: '3', content: 'How are you?', rawTimestamp: new Date('2024-01-25 14:10:00') }
 * ];
 *
 * const result = addTimeLabels(messages);
 * // 返回:
 * // [
 * //   { id: 'time-1', type: 'time-label', timeText: '14:00' },
 * //   { id: '1', content: 'Hello', rawTimestamp: ... },
 * //   { id: '2', content: 'Hi', rawTimestamp: ... },
 * //   { id: 'time-3', type: 'time-label', timeText: '14:10' },
 * //   { id: '3', content: 'How are you?', rawTimestamp: ... }
 * // ]
 */
function addTimeLabels(messages, options = {}) {
  const {
    threshold = 5 * 60 * 1000, // 默认 5 分钟
    showFirstTime = true,
    timestampField = 'rawTimestamp'
  } = options;

  if (!messages || messages.length === 0) return [];

  const result = [];

  for (let i = 0; i < messages.length; i++) {
    const currentMsg = messages[i];
    const prevMsg = i > 0 ? messages[i - 1] : null;

    // 判断是否需要显示时间标签
    let shouldShowTime = false;

    if (i === 0 && showFirstTime) {
      // 第一条消息根据配置决定是否显示时间
      shouldShowTime = true;
    } else if (prevMsg && currentMsg[timestampField] && prevMsg[timestampField]) {
      // 如果与上一条消息的时间差超过阈值，显示时间
      const timeDiff = new Date(currentMsg[timestampField]) - new Date(prevMsg[timestampField]);
      shouldShowTime = timeDiff >= threshold;
    }

    // 如果需要显示时间，插入时间标签
    if (shouldShowTime && currentMsg[timestampField]) {
      result.push({
        id: `time-${currentMsg.id}`,
        type: 'time-label',
        timeText: formatTime(currentMsg[timestampField])
      });
    }

    // 添加消息本身
    result.push(currentMsg);
  }

  return result;
}

/**
 * 计算两个时间之间的差值（毫秒）
 * @param {Date|string} time1 - 第一个时间
 * @param {Date|string} time2 - 第二个时间
 * @returns {number} 时间差（毫秒）
 */
function getTimeDiff(time1, time2) {
  return Math.abs(new Date(time1) - new Date(time2));
}

/**
 * 判断两个时间是否在同一天
 * @param {Date|string} time1 - 第一个时间
 * @param {Date|string} time2 - 第二个时间
 * @returns {boolean} 是否在同一天
 */
function isSameDay(time1, time2) {
  const date1 = new Date(time1);
  const date2 = new Date(time2);
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * 判断时间是否是今天
 * @param {Date|string} dateString - 日期对象或日期字符串
 * @returns {boolean} 是否是今天
 */
function isToday(dateString) {
  return isSameDay(dateString, new Date());
}

/**
 * 判断时间是否是昨天
 * @param {Date|string} dateString - 日期对象或日期字符串
 * @returns {boolean} 是否是昨天
 */
function isYesterday(dateString) {
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/**
 * 判断时间是否在本周内
 * @param {Date|string} dateString - 日期对象或日期字符串
 * @param {number} days - 天数，默认 7 天
 * @returns {boolean} 是否在本周内
 */
function isThisWeek(dateString, days = 7) {
  const date = new Date(dateString);
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - days);
  return date > weekAgo && date <= now;
}

module.exports = {
  formatTime,
  addTimeLabels,
  getTimeDiff,
  isSameDay,
  isToday,
  isYesterday,
  isThisWeek
};
