/**
 * 随机头像API调用模块
 * 用于从后端获取随机头像
 */
import { API_FILE_URL } from '../common.js';
const RANDOM_AVATAR_API = API_FILE_URL + '/api/avatar/getRandomAvatar';

/**
 * 获取随机头像
 * @param {Array<number>} excludeIds - 需要排除的头像ID列表
 * @returns {Promise<Object>} 返回头像信息 { avatarId, avatarUrl, success, message }
 */
export async function getRandomAvatar(excludeIds = []) {
    try {
        // 构建查询参数
        const params = new URLSearchParams();
        if (excludeIds.length > 0) {
            params.append('excludeIds', excludeIds.join(','));
        }

        const url = `${RANDOM_AVATAR_API}?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 检查返回数据的格式
        if (!data.success) {
            throw new Error(data.message || '获取随机头像失败');
        }

        return {
            avatarId: data.avatarId,
            avatarUrl: data.avatarUrl,
            success: true,
            message: data.message
        };

    } catch (error) {
        console.error('获取随机头像失败:', error);
        return {
            avatarId: null,
            avatarUrl: null,
            success: false,
            message: error.message || '获取随机头像失败'
        };
    }
}

/**
 * 随机头像管理器
 * 用于管理已使用的头像ID列表
 */
export class RandomAvatarManager {
    constructor() {
        this.usedAvatarIds = [];
    }

    /**
     * 获取一个新的随机头像
     * @returns {Promise<Object>} 返回头像信息
     */
    async getNewAvatar() {
        const result = await getRandomAvatar(this.usedAvatarIds);

        if (result.success && result.avatarId) {
            // 将新头像ID添加到已使用列表
            this.usedAvatarIds.push(result.avatarId);
        }

        return result;
    }

    /**
     * 重置已使用的头像ID列表
     */
    reset() {
        this.usedAvatarIds = [];
    }

    /**
     * 获取已使用的头像ID列表
     * @returns {Array<number>}
     */
    getUsedIds() {
        return [...this.usedAvatarIds];
    }
}
