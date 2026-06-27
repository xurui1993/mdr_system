import { useState, useEffect } from "react";

export interface SystemStatsData {
  time: string;
  sysCpu: number;
  sysMemRatio: number;
  procCpu: number;
  procMem: number;
}

// Global state for sharing between components to avoid multiple intervals if both mount
let globalData: SystemStatsData[] = [];
let listeners: ((data: SystemStatsData[]) => void)[] = [];
let intervalId: NodeJS.Timeout | null = null;

const fetchStats = async () => {
  try {
    const response = await fetch("/api/system/stats");
    if (!response.ok) {
      throw new Error("Failed to fetch system stats");
    }
    const json = await response.json();
    
    if (json.success) {
      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      const newDataPoint = {
        time: timeLabel,
        sysCpu: json.sysCpu,
        sysMemRatio: json.sysMemRatio,
        procCpu: json.procCpu,
        procMem: json.procMem
      };

      globalData = [...globalData, newDataPoint];
      if (globalData.length > 30) {
        globalData = globalData.slice(globalData.length - 30);
      }
      
      listeners.forEach(listener => listener(globalData));
    }
  } catch (err: any) {
    if (err.message !== 'Failed to fetch') {
      console.error("Failed to fetch system stats:", err);
    }
  }
};

export function useSystemStats() {
  const [data, setData] = useState<SystemStatsData[]>(globalData);

  useEffect(() => {
    listeners.push(setData);
    
    // Start interval if it's the first listener
    if (listeners.length === 1 && !intervalId) {
      fetchStats();
      intervalId = setInterval(() => {
         if (document.visibilityState === 'visible') {
             fetchStats();
         }
      }, 5000); // 降低请求频率到5秒，防止频繁轮询
    }

    return () => {
      listeners = listeners.filter(l => l !== setData);
      // Clean up interval if no listeners
      if (listeners.length === 0 && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, []);

  const latestStats = data.length > 0 ? data[data.length - 1] : { sysCpu: 0, sysMemRatio: 0, procCpu: 0, procMem: 0 };
  
  // Calculate a generic health score
  let healthScore = 100;
  if (latestStats.sysCpu > 0) {
    const penalty = (latestStats.sysCpu * 0.4 + latestStats.sysMemRatio * 0.4 + latestStats.procCpu * 0.2);
    healthScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  }

  return { data, latestStats, healthScore };
}
