
export function calculateDistance(regionId1: string, regionId2: string): number {
    if (!/^\d{4}$/.test(regionId1) || !/^\d{4}$/.test(regionId2)) {
      // Handle invalid IDs, maybe return Infinity or throw an error
      return Infinity;
    }
    const x1 = parseInt(regionId1.substring(0, 2), 10);
    const y1 = parseInt(regionId1.substring(2, 4), 10);
    const x2 = parseInt(regionId2.substring(0, 2), 10);
    const y2 = parseInt(regionId2.substring(2, 4), 10);
  
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  }

  //切比雪夫