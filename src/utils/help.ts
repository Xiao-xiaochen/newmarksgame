import { Context, Session } from 'koishi'

// 定义指令分类和对应的指令列表
const commandCategories = [
  {
    name: '世界与地图',
    commands: [
      { name: '查看世界地图', desc: '查看世界地图概览' },
      { name: '查看地区', desc: '查看指定地区或当前绑定地区的详细信息' },
      { name: '查看地区特质', desc: '查看地区的特殊属性' },
      { name: '查看地区资源储量', desc: '查看地区的自然资源储量' },
    ]
  },
  {
    name: '个人与状态',
    commands: [
      { name: '阅读报告', alias: '签到', desc: '每日签到/阅读个人报告' },
      { name: '我的全部资料', desc: '查看你的所有个人信息' },
      { name: '我的人口', desc: '查看你控制的人口信息 (若适用)' },
      { name: '我的仓库', desc: '查看你的个人生活/工业仓库信息' },
      { name: '我的军事仓库', desc: '查看你的个人军事仓库信息' },
      { name: '驻扎', desc: '驻扎到当前群聊绑定的地区' },
    ]
  },
  {
    name: '国家管理',
    commands: [
      { name: '组建国家', desc: '建立一个新的国家' },
      { name: '我的国家', desc: '查看你所在国家的信息' },
      { name: '他的国家', desc: '查询指定玩家的国家信息' },
      { name: '国家地区列表', desc: '查看本国控制的所有地区 (仅限成员)' },
      { name: '国家成员列表', desc: '查看本国所有成员 (仅限领袖)' },
      { name: '邀请加入国家', desc: '邀请玩家加入你的国家 (仅限领袖)' },
      { name: '接受邀请', desc: '接受来自某个国家的邀请' },
      { name: '拒绝邀请', desc: '拒绝当前的国家邀请' },
      { name: '宣布独立', desc: '离开你当前所在的国家 (领袖无法退出)' },
      { name: '修改国家名称', desc: '国家领导人修改自己国家的名称' },
      { name: '解散国家', desc: '解散你领导的国家 (仅限领袖)' },
    ]
  },
  {
    name: '地区管理与建设',
    commands: [
      { name: '绑定地区', desc: '将指定地区与当前群聊绑定 (仅限领袖)' },
      { name: '解绑地区', desc: '解除当前群聊绑定的地区 (仅限领袖)' },
      { name: '查看地区人口', desc: '查看地区的人口详情' },
      { name: '查看地区劳动力', desc: '查看地区的劳动力分配情况' },
      { name: '查看地区仓库', desc: '查看地区的生活/工业仓库' },
      { name: '查看地区军事仓库', desc: '查看地区的军事仓库' },
      { name: '地区分配劳动力', desc: '分配地区空闲劳动力到生产建筑' },
      { name: '地区建造', desc: '在地区开始新的建筑项目' },
    ]
  },
  {
    name: '生产与资源',
    commands: [
      { name: '阅读地区农业报告', desc: '查看地区的农业产出报告' },
      { name: '查看地区第二产业', desc: '查看地区的工业生产概况' },
      { name: '地区开采', desc: '分配地区矿场进行资源开采' },
      { name: '地区炼钢', desc: '使用地区炼钢厂进行一次性炼钢' },
      { name: '地区精炼', desc: '使用地区炼油厂进行一次性精炼' },
      { name: '地区军事生产', desc: '在地区生产军事单位或装备' },
    ]
  },
  {
    name: '管理员指令',
    commands: [
      { name: '从html初始化地图', desc: '根据 Map.html 初始化数据库地图' },
      { name: '初始化世界', desc: '执行世界初始化流程' },
      { name: '强制修改国家名称', desc: '管理员强制修改国家名称' },
      { name: '重置世界地图', desc: '重置地图数据' },
      { name: '重置国家数据', desc: '重置所有国家数据' },
      { name: '重置用户数据', desc: '重置指定用户数据' },
      // { name: '手动结算', desc: '手动触发小时结算（调试用）' }, // 如果 ManualCheckIn.ts 存在
    ]
  },
  // 可以根据需要添加更多分类
];

// 生成帮助文本
function generateHelpMessage(): string {
  let message = '征战文游 指令帮助\n\n';
  commandCategories.forEach(category => {
    message += `--- ${category.name} ---\n`;
    category.commands.forEach(cmd => {
      message += `  - \`${cmd.name}${cmd.alias ? ` (${cmd.alias})` : ''}\`: ${cmd.desc}\n`;
    });
    message += '\n'; // 分类之间的空行
  });
  message += '提示：部分指令需要特定权限或身份才能使用。';
  return message;
}

// 尝试发送合并转发消息的函数 (需要适配具体平台)
async function sendForwardedHelpMessage(session: Session, title: string, messages: string[]) {
    // 检查合并转发方法是否存在
    const sendForwardFunc = session.bot.internal?.sendGroupForwardMsg || session.bot.internal?.send_group_forward_msg;

    if (!sendForwardFunc) {
        console.warn('[Help Command] Adapter does not support sendGroupForwardMsg. Sending plain text.');
        await session.send(messages.join('\n--------------------\n'));
        return;
    }
    try {
        // 构建符合适配器要求的消息节点 (Node) 列表
        const msgList = messages.map(msg => ({
            // --- 修改：使用符合 OneBot Node 结构的字段 ---
            type: 'node', // 明确指定类型为 node
            data: {
                // 使用 name 字段
                name: session.bot.user?.name || '帮助手册',
                // 使用 uin 字段，确保是字符串
                uin: String(session.bot.selfId || session.bot.userId || ''),
                // 将消息文本包装在 content 数组中的 text 消息段里
                content: [
                    { type: 'text', data: { text: msg.replace(/`/g, '') } } // 移除反引号
                ]
                // 如果需要时间戳，可以添加 time 字段: time: Math.floor(Date.now() / 1000)
            }
            // --- 修改结束 ---
        }));


        // 调用适配器的内部方法发送合并转发消息
        // 注意：参数结构可能需要调整，这里假设 sendForwardFunc 接受 group_id 和 messages 列表
        await sendForwardFunc.call(session.bot.internal, session.guildId, msgList);

    } catch (error) {
        // --- 修改：移除所有备用方案，只记录错误 ---
        // 无论发生什么错误，都只在控制台记录，不发送任何回退消息给用户
        console.error("尝试发送合并转发帮助消息时失败:", error);
        // 不再发送 session.send(...)
        // --- 修改结束 ---
    }
}


export function HelpCommand(ctx: Context) { // 函数名修正为 HelpCommand
  ctx.command('help', '显示指令帮助信息')
    .alias('帮助', '菜单')
    .action(async ({ session }) => {
      if (!session) return;

      const helpTitle = '📜 征战文游 指令帮助 📜';
      const helpMessages: string[] = [];

      commandCategories.forEach(category => {
        let categoryMessage = `--- ${category.name} ---\n`;
        category.commands.forEach(cmd => {
          categoryMessage += `  - \`${cmd.name}${cmd.alias ? ` (${cmd.alias})` : ''}\`: ${cmd.desc}\n`;
        });
        helpMessages.push(categoryMessage.trim());
      });
       helpMessages.push('提示：部分指令需要特定权限或身份才能使用。');

      await sendForwardedHelpMessage(session, helpTitle, helpMessages);
    });
}