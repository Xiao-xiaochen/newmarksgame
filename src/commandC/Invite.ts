import { Context, Session, h } from 'koishi';
import { Country, userdata, Region, TerrainType } from '../types';

// --- 临时邀请存储 ---
// 使用 Map 存储待处理的邀请: Map<targetUserId, { inviterId: string, inviterName: string, countryName: string, timestamp: number }>
const pendingInvites = new Map<string, { inviterId: string, inviterName: string, countryName: string, timestamp: number }>();
const INVITE_TIMEOUT = 60 * 1000; // 邀请有效时间：60秒

// 辅助函数：获取一个地区的所有相邻地区ID (保持不变)
function getAdjacentRegions(regionId: string): string[] {
    // ... existing code ...
    if (!/^\d{4}$/.test(regionId)) return []; // 检查ID格式

    const x = parseInt(regionId.substring(0, 2), 10);
    const y = parseInt(regionId.substring(2, 4), 10);
    const adjacent: string[] = [];
    const mapSize = 80; // 假设地图大小是 80x80，如果不是请修改

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue; // 跳过自身

            const nx = x + dx;
            const ny = y + dy;

            // 检查边界
            if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
                adjacent.push(nx.toString().padStart(2, '0') + ny.toString().padStart(2, '0'));
            }
        }
    }
    return adjacent;
}


export function Invite(ctx: Context) {
    ctx.command('邀请加入国家 <targetUser:user>', '邀请玩家加入你的国家', { authority: 1 })
        .action(async ({ session, options }, targetUser) => {
            if (!session || !session.userId || !session.author) return '无法获取用户信息。';
            if (!targetUser) return '请指定要邀请的玩家，例如：邀请加入国家 @张三';

            const leaderId = session.userId;
            const leaderName = session.author.name || '未知领袖';
            // 从 "platform:userId" 格式中提取 userId，并处理可能的 @ 符号
            const targetUserIdMatch = targetUser.match(/[:@]([^>]+)/);
            const targetUserId = targetUserIdMatch ? targetUserIdMatch[1] : null;


            if (!targetUserId) return '无法解析目标用户信息，请确保 @ 了正确的用户。';
            if (targetUserId === leaderId) return '你不能邀请自己。';

            // 清理可能存在的旧邀请
            if (pendingInvites.has(targetUserId)) {
                pendingInvites.delete(targetUserId);
            }

            try {
                // 1. 检查邀请者是否为国家领袖 (保持不变)
                const leaderData = await ctx.database.get('userdata', { userId: leaderId });
                if (!leaderData || leaderData.length === 0 || !leaderData[0].isLeader || !leaderData[0].countryName) {
                    return `${leaderName} 同志，你不是国家领袖，无法邀请他人。`;
                }
                const countryName = leaderData[0].countryName;

                // 2. 获取国家信息 (保持不变)
                const countryData = await ctx.database.get('country', { name: countryName });
                if (!countryData || countryData.length === 0) {
                    return `错误：找不到你的国家 ${countryName} 的信息。`;
                }
                const country = countryData[0];
                // const capitalRegionId = country.capitalRegionId; // 暂时不需要首都ID

                // 3. 检查被邀请者状态 (保持不变)
                const targetData = await ctx.database.get('userdata', { userId: targetUserId });
                if (!targetData || targetData.length === 0) {
                    return `玩家 ${targetUserId} 尚未注册，无法邀请。`;
                }
                if (targetData[0].countryName) {
                    return `玩家 ${targetUserId} 已经是 ${targetData[0].countryName} 的成员了。`;
                }

                // 4. 存储邀请信息
                pendingInvites.set(targetUserId, {
                    inviterId: leaderId,
                    inviterName: leaderName,
                    countryName: countryName,
                    timestamp: Date.now()
                });

                // 设置定时器自动清除过期邀请
                setTimeout(() => {
                    if (pendingInvites.has(targetUserId) && pendingInvites.get(targetUserId)?.timestamp === Date.now()) {
                         pendingInvites.delete(targetUserId);
                         console.log(`用户 ${targetUserId} 的邀请已过期并清除。`);
                         // 可以选择性地通知邀请者邀请已过期
                         // ctx.bots[session.platform + ':' + session.selfId]?.sendMessage(session.channelId, `${leaderName} 同志，你对 ${targetUserId} 的邀请已过期。`);
                    }
                }, INVITE_TIMEOUT);


                // 5. 发送邀请通知和操作指引
                // 尝试 @ 目标用户
                const mention = h('at', { id: targetUserId });
                const message = `${mention}，${leaderName} 邀请你加入国家 【${countryName}】。\n请在 ${INVITE_TIMEOUT / 1000} 秒内使用命令 “接受邀请” 或 “拒绝邀请” 进行回复。`;

                // 尝试发送消息，如果失败则仅在当前频道提示
                try {
                    // 优先尝试私聊发送（如果适配器支持且有权限）
                    // await ctx.bots[session.platform + ':' + session.selfId]?.sendPrivateMessage(targetUserId, message);
                    // 如果私聊不行，就在当前频道发送
                    await session.send(message);
                } catch (e) {
                    console.warn(`发送邀请通知给 ${targetUserId} 失败:`, e);
                    await session.send(`已向 ${targetUserId} 发出邀请。请目标用户在 ${INVITE_TIMEOUT / 1000} 秒内使用命令 “接受邀请” 或 “拒绝邀请” 进行回复。`);
                }

                return `邀请已发送给 ${targetUserId}。`; // 给邀请者的反馈

            } catch (error) {
                console.error(`处理邀请时出错 (邀请者: ${leaderId}, 被邀请者: ${targetUserId}):`, error);
                return '处理邀请时发生内部错误。';
            }
        });

    // --- 新增：接受邀请命令 ---
    ctx.command('接受邀请', '接受来自某个国家的邀请')
        .action(async ({ session }) => {
            if (!session || !session.userId) return '无法获取用户信息。';
            const targetUserId = session.userId;

            const invite = pendingInvites.get(targetUserId);

            if (!invite) {
                return '你当前没有待处理的国家邀请。';
            }

            // 检查邀请是否超时
            if (Date.now() - invite.timestamp > INVITE_TIMEOUT) {
                pendingInvites.delete(targetUserId); // 清除过期邀请
                return '邀请已过期。';
            }

            const { inviterId, inviterName, countryName } = invite;

            try {
                // 再次检查用户是否已加入国家（防止并发问题）
                const currentUserData = await ctx.database.get('userdata', { userId: targetUserId });
                if (currentUserData && currentUserData.length > 0 && currentUserData[0].countryName) {
                     pendingInvites.delete(targetUserId); // 清除邀请
                     return `你已经是 ${currentUserData[0].countryName} 的成员了。`;
                }

                // 获取国家信息，特别是首都ID和成员列表
                const countryData = await ctx.database.get('country', { name: countryName });
                 if (!countryData || countryData.length === 0) {
                     pendingInvites.delete(targetUserId); // 清除邀请
                     return `错误：邀请你加入的国家 ${countryName} 似乎不存在了。`;
                 }
                 const country = countryData[0];
                 const capitalRegionId = country.capitalRegionId;

                // --- 玩家接受邀请 ---
                // 1. 更新玩家和国家数据
                await ctx.database.set('userdata', { userId: targetUserId }, { countryName: countryName, isLeader: false });
                const updatedMembers = [...country.members, targetUserId];
                await ctx.database.set('country', { name: countryName }, { members: updatedMembers });

                pendingInvites.delete(targetUserId); // 处理完成，清除邀请

                let assignedRegionMessage = '';

                // 2. 尝试分配新地区 (成员数 < 5)
                if (updatedMembers.length < 5 && capitalRegionId) {
                    const adjacentIds = getAdjacentRegions(capitalRegionId);
                    if (adjacentIds.length > 0) {
                        const adjacentRegions = await ctx.database.get('regiondata', { RegionId: { $in: adjacentIds } });
                        const suitableRegions = adjacentRegions.filter(region =>
                            !region.owner && region.Terrain !== TerrainType.OCEAN
                        );

                        if (suitableRegions.length > 0) {
                            const selectedRegion = suitableRegions[Math.floor(Math.random() * suitableRegions.length)];
                            await ctx.database.set('regiondata', { RegionId: selectedRegion.RegionId }, {
                                owner: countryName,
                                leader: inviterName // 使用邀请者的名字作为地区leader，或根据逻辑调整
                            });
                            assignedRegionMessage = `\n■国家获得新地区：${selectedRegion.RegionId} (${selectedRegion.Terrain})！`;
                            console.log(`国家 ${countryName} 因 ${targetUserId} 接受邀请获得新地区 ${selectedRegion.RegionId}`);
                        } else {
                            assignedRegionMessage = '\n□首都附近已无合适的未占领陆地可供扩张。';
                        }
                    } else {
                         assignedRegionMessage = '\n□首都地区无相邻区域。';
                    }
                } else if (updatedMembers.length >= 5) {
                    assignedRegionMessage = '\n□国家成员已达上限，不再自动分配新地区。';
                }

                // 通知邀请者
                 try {
                     // 构造私聊会话上下文
                     const inviterSessionContext = { userId: inviterId, channelId: `private:${inviterId}`, platform: session.platform, selfId: session.selfId };
                     const inviterSession = ctx.bots[`${session.platform}:${session.selfId}`]?.session(inviterSessionContext);

                     if (inviterSession) {
                         await inviterSession.send(`${targetUserId} 已接受你的邀请，加入了国家 【${countryName}】！${assignedRegionMessage}`);
                     } else {
                         // 尝试在原频道通知？或者记录日志
                         console.log(`无法创建会话通知邀请者 ${inviterId}，用户 ${targetUserId} 已加入国家 ${countryName}`);
                         // 可以在这里添加一个 session.send() 回退到当前频道通知
                         // await session.send(`通知：${targetUserId} 已接受 ${inviterName} 的邀请加入国家【${countryName}】。`);
                     }
                 } catch (e) {
                     console.warn(`通知邀请者 ${inviterId} 失败:`, e);
                     // 也可以在这里添加 session.send() 回退
                 }


                return `
======[邀请已接受]======
你已成功加入国家 【${countryName}】！
${assignedRegionMessage}
`.trim();

            } catch (error) {
                console.error(`接受邀请时出错 (用户: ${targetUserId}, 国家: ${countryName}):`, error);
                // 尝试回滚或标记错误状态？暂时只返回错误信息
                pendingInvites.delete(targetUserId); // 发生错误也清除邀请
                return '接受邀请时发生内部错误。';
            }
        });

    // --- 新增：拒绝邀请命令 ---
    ctx.command('拒绝邀请', '拒绝当前的国家邀请')
        .action(async ({ session }) => {
             if (!session || !session.userId) return '无法获取用户信息。';
             const targetUserId = session.userId;

             const invite = pendingInvites.get(targetUserId);

             if (!invite) {
                 return '你当前没有待处理的国家邀请。';
             }

             // 检查邀请是否超时 (虽然超时会自动清除，但用户可能在超时后立即尝试拒绝)
             if (Date.now() - invite.timestamp > INVITE_TIMEOUT) {
                 pendingInvites.delete(targetUserId); // 清除过期邀请
                 return '邀请已过期。';
             }

             const { inviterId, inviterName, countryName } = invite;
             pendingInvites.delete(targetUserId); // 清除邀请

             // 通知邀请者
             try {
                 // 构造私聊会话上下文
                 const inviterSessionContext = { userId: inviterId, channelId: `private:${inviterId}`, platform: session.platform, selfId: session.selfId };
                 const inviterSession = ctx.bots[`${session.platform}:${session.selfId}`]?.session(inviterSessionContext);

                 if (inviterSession) {
                     await inviterSession.send(`${targetUserId} 拒绝了你加入国家 【${countryName}】 的邀请。`);
                 } else {
                     console.log(`无法创建会话通知邀请者 ${inviterId}，用户 ${targetUserId} 拒绝了邀请`);
                     // 可以在这里添加一个 session.send() 回退到当前频道通知
                     // await session.send(`通知：${targetUserId} 已拒绝 ${inviterName} 的邀请。`);
                 }
             } catch (e) {
                 console.warn(`通知邀请者 ${inviterId} 拒绝消息失败:`, e);
                 // 也可以在这里添加 session.send() 回退
             }

             return `你已拒绝加入国家 【${countryName}】 的邀请。`;
        });
}