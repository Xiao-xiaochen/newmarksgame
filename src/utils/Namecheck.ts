
// 国家名称校验函数 (可以从 ChangenName.ts 复制或导入)
export function validateCountryName(name: string): string | null {
    if (!name) {
      return '国家名称不能为空。';
    }
    if (name.length < 2 || name.length > 12) {
      return '国家名称长度必须在 2 到 12 个字符之间。';
    }
    const validNameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
    if (!validNameRegex.test(name)) {
      return '国家名称只能包含中文、英文字母和数字。';
    }
    return null; // 验证通过
  }