
export function TRandom(min: number, max: number, mode: number, round: boolean = true): number {
    const u = Math.random()
    const range = max - min
    let result: number
    
    if (u <= (mode - min) / range) {
      result = min + Math.sqrt(u * range * (mode - min))
    } else {
      result = max - Math.sqrt((1 - u) * range * (max - mode))
    }
    
    // 根据参数决定是否取整
    return round ? Math.round(result) : result
  }