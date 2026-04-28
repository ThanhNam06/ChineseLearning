export const CULTIVATION_RANKS = [
  { name: 'Phàm Nhân', minExp: 0 },
  { name: 'Luyện Khí Sơ Kỳ', minExp: 100 },
  { name: 'Luyện Khí Trung Kỳ', minExp: 500 },
  { name: 'Luyện Khí Hậu Kỳ', minExp: 1000 },
  { name: 'Luyện Khí Đỉnh Phong', minExp: 2000 },
  
  { name: 'Trúc Cơ Sơ Kỳ', minExp: 5000 },
  { name: 'Trúc Cơ Trung Kỳ', minExp: 10000 },
  { name: 'Trúc Cơ Hậu Kỳ', minExp: 20000 },
  { name: 'Trúc Cơ Đỉnh Phong', minExp: 50000 },
  
  { name: 'Kết Đan Sơ Kỳ', minExp: 100000 },
  { name: 'Kết Đan Trung Kỳ', minExp: 250000 },
  { name: 'Kết Đan Hậu Kỳ', minExp: 500000 },
  { name: 'Kết Đan Đỉnh Phong', minExp: 1000000 },
  
  { name: 'Nguyên Anh Sơ Kỳ', minExp: 2000000 },
  { name: 'Nguyên Anh Trung Kỳ', minExp: 5000000 },
  { name: 'Nguyên Anh Hậu Kỳ', minExp: 10000000 },
  { name: 'Nguyên Anh Đỉnh Phong', minExp: 25000000 },
  
  { name: 'Hóa Thần Sơ Kỳ', minExp: 50000000 },
  { name: 'Hóa Thần Trung Kỳ', minExp: 100000000 },
  { name: 'Hóa Thần Hậu Kỳ', minExp: 250000000 },
  { name: 'Hóa Thần Đỉnh Phong', minExp: 500000000 },
  
  { name: 'Luyện Hư Sơ Kỳ', minExp: 1000000000 },
  { name: 'Luyện Hư Trung Kỳ', minExp: 2500000000 },
  { name: 'Luyện Hư Hậu Kỳ', minExp: 5000000000 },
  { name: 'Luyện Hư Đỉnh Phong', minExp: 10000000000 },
  
  { name: 'Hợp Thể Kỳ', minExp: 50000000000 },
  { name: 'Đại Thừa Kỳ', minExp: 100000000000 },
  { name: 'Độ Kiếp Kỳ', minExp: 500000000000 },
  { name: 'Chân Tiên', minExp: 1000000000000 }
];

export function getRankInfo(exp) {
  let currentRank = CULTIVATION_RANKS[0];
  let nextRank = CULTIVATION_RANKS[1];
  
  for (let i = 0; i < CULTIVATION_RANKS.length; i++) {
    if (exp >= CULTIVATION_RANKS[i].minExp) {
      currentRank = CULTIVATION_RANKS[i];
      nextRank = CULTIVATION_RANKS[i + 1] || currentRank;
    } else {
      break;
    }
  }
  
  const progress = nextRank !== currentRank 
    ? Math.min(100, Math.max(0, ((exp - currentRank.minExp) / (nextRank.minExp - currentRank.minExp)) * 100))
    : 100;

  return { currentRank, nextRank, progress };
}
