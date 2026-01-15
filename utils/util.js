const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 解析 JWT token 的 payload 部分
 * @param {string} token - JWT token
 * @returns {Object|null} 解析后的 payload 对象,解析失败返回 null
 */
const parseJWTPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // 微信小程序环境下需要使用 wx 的 base64 解码
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // 使用 Buffer 或者自定义 base64 解码
    const jsonPayload = decodeURIComponent(
      Array.prototype.map.call(
        wx.base64ToArrayBuffer ?
          new Uint8Array(wx.base64ToArrayBuffer(base64)) :
          atob(base64).split('').map(c => c.charCodeAt(0)),
        c => '%' + ('00' + c.toString(16)).slice(-2)
      ).join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('解析 JWT token 失败:', error);
    return null;
  }
}

/**
 * 检查 token 是否快要过期(少于1分钟)
 * @param {string} token - JWT token
 * @returns {boolean} true 表示 token 即将过期或已过期
 */
const isTokenExpiringSoon = (token) => {
  const payload = parseJWTPayload(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // JWT 的 exp 是秒级时间戳,需要转换为毫秒
  const expiryTime = payload.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiry = expiryTime - currentTime;
  const ONE_MINUTE = 60 * 1000; // 1分钟的毫秒数

  return timeUntilExpiry < ONE_MINUTE;
}

module.exports = {
  formatTime,
  parseJWTPayload,
  isTokenExpiringSoon
}

