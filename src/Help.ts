import { Context, Session } from 'koishi'

// 定义指令分类和对应的指令列表
const commandCategories = [
  {
    name: '地区',
    commands: [
      { name: '绑定地区', desc: '将当前群聊绑定到一个地区' },
      { name: '查看地区', desc: '查看当前绑定地区的信息' },
      { name: '查看地区仓库', desc: '查看地区仓库信息' },
      { name: '查看地区第二产业', desc: '查看地区第二产业信息' },
      { name: '查看地区建筑业', desc: '查看地区建筑业信息' },
      { name: '查看地区军事仓库', desc: '查看地区军事仓库信息' },
      { name: '查看地区劳动力', desc: '查看地区劳动力信息' },
      { name: '查看地区人口', desc: '查看地区人口信息' },
      { name: '查看地区特质', desc: '查看地区特质' },
      { name: '查看地区资源储量', desc: '查看地区资源储量' },
      { name: '地区分配劳动力', desc: '分配劳动力到地区' },
      { name: '地区建造', desc: '在地区建造建筑' },
      { name: '地区精炼', desc: '地区石油精炼' },
      { name: '地区军事生产', desc: '地区军事生产' },
      { name: '地区开采类型', desc: '设置地区开采类型' },
      { name: '地区炼钢', desc: '地区炼钢' },
      { name: '地区取消分配劳动力', desc: '取消分配劳动力' },
      { name: '地区土法炼钢', desc: '地区土法炼钢' },
      { name: '地区制造', desc: '地区制造' },
      { name: '解绑地区', desc: '解绑当前群聊绑定的地区' },
    ]
  },
  {
    name: '军队',
    commands: [
      { name: '发枪', desc: '给军队发枪' },
      { name: '分配人力', desc: '给军队分配人力' },
      { name: '查看军队', desc: '查看军队信息' },
      { name: '武装', desc: '武装军队' },
      { name: '行军', desc: '行军' },
      { name: '驻扎', desc: '驻扎' },
      { name: '组建军队', desc: '组建军队' },
    ]
  },
  {
    name: '国家',
    commands: [
      { name: '国家成员列表', desc: '查看国家成员列表' },
      { name: '国家地区列表', desc: '查看国家地区列表' },
      { name: '接受邀请', desc: '接受加入国家邀请' },
      { name: '解散国家', desc: '解散国家' },
      { name: '拒绝邀请', desc: '拒绝加入国家邀请' },
      { name: '修改国家名称', desc: '修改国家名称' },
      { name: '宣布独立', desc: '宣布独立' },
      { name: '邀请加入国家', desc: '邀请加入国家' },
      { name: '组建国家', desc: '组建国家' },
    ]
  },
  {
    name: '玩家',
    commands: [
      { name: '他的国家', desc: '查看其他玩家的国家' },
      { name: '我的仓库', desc: '查看我的仓库' },
      { name: '我的国家', desc: '查看我的国家' },
      { name: '我的军事仓库', desc: '查看我的军事仓库' },
      { name: '我的情报部', desc: '查看我的情报部' },
      { name: '我的全部资料', desc: '查看我的全部资料' },
      { name: '我的人口', desc: '查看我的人口' },
      { name: '阅读报告', desc: '阅读报告' },
    ]
  },
  {
    name: '世界',
    commands: [
      { name: '查看世界地图', desc: '查看世界地图' },
      { name: '初始化世界', desc: '初始化世界' },
      { name: '从html初始化地图', desc: '从html初始化地图' },
    ]
  },
  {
    name: '管理员',
    commands: [
      { name: '强制修改国家名称', desc: '强制修改国家名称' },
      { name: '手动结算', desc: '手动结算' },
      { name: '重置国家数据', desc: '重置国家数据' },
      { name: '重置世界地图', desc: '重置世界地图' },
      { name: '重置用户数据', desc: '重置用户数据' },
    ]
  }
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
