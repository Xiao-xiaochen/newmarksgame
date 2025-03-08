// utils/random.ts 三角分布算法

//min  最小值 | mode 最可能值 | max  最大值

export const Random = {
  triangular(min: number, mode: number, max: number): number {
    const u = Math.random();
    if (u < (mode - min) / (max - min)) {
      return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
  }
}
