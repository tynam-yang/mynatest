// core/diff.js — diff 算法（全局）

window.MynaDiff = {
  /** 深度 JSON diff，对比两个对象。diffs.push({path, type, oldValue?, newValue?}) */
  diffJSON(a, b, path = '', diffs = []) {
    // null / undefined 先做值比较（typeof null === 'object' 是 JS 历史坑！）
    if (a === null || a === undefined || b === null || b === undefined) {
      if (a === b) return diffs;
      diffs.push({ path: path || '(root)', type: 'value', oldValue: a, newValue: b });
      return diffs;
    }

    if (typeof a !== typeof b) {
      diffs.push({ path: path || '(root)', type: 'type', oldValue: a, newValue: b });
      return diffs;
    }

    if (typeof a !== 'object') {
      if (a !== b) {
        diffs.push({ path: path || '(root)', type: 'value', oldValue: a, newValue: b });
      }
      return diffs;
    }

    // 都不是 null 才往下走
    const isArrA = Array.isArray(a);
    const isArrB = Array.isArray(b);

    if (isArrA !== isArrB) {
      diffs.push({ path: path || '(root)', type: 'type', oldValue: a, newValue: b });
      return diffs;
    }

    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach(key => {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in a)) {
        diffs.push({ path: childPath, type: 'added', newValue: b[key] });
      } else if (!(key in b)) {
        diffs.push({ path: childPath, type: 'removed', oldValue: a[key] });
      } else {
        window.MynaDiff.diffJSON(a[key], b[key], childPath, diffs);
      }
    });

    return diffs;
  },

  /** 行级 diff（LCS），返回 [{type:'equal'|'add'|'remove', value}] */
  diffLines(a, b) {
    const linesA = a.split('\n');
    const linesB = b.split('\n');
    const m = linesA.length;
    const n = linesB.length;

    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = linesA[i - 1] === linesB[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const result = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
        result.unshift({ type: 'equal', value: linesA[i - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'add', value: linesB[j - 1] });
        j--;
      } else {
        result.unshift({ type: 'remove', value: linesA[i - 1] });
        i--;
      }
    }
    return result;
  },

  /** 判断字符串看起来像 JSON（粗筛） */
  looksLikeJSON(str) {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    return (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
           (trimmed.endsWith('}') || trimmed.endsWith(']'));
  },

  /**
   * 健壮的 JSON 解析：依次尝试
   * - 直接 JSON.parse
   * - URL decode 后 parse
   * - strip 首尾引号 + 反转义（二次 JSON.stringify 的场景）
   * @returns {ok: boolean, data?: any}
   */
  parseJSONRobust(str) {
    if (typeof str !== 'string' || !str.trim()) return { ok: false };

    // 1. 直接 parse
    try { return { ok: true, data: JSON.parse(str) }; } catch {}

    // 2. URL decode 后 parse
    try {
      const decoded = decodeURIComponent(str.replace(/\+/g, ' '));
      return { ok: true, data: JSON.parse(decoded) };
    } catch {}

    // 3. 首尾引号 + 反转义
    try {
      const trimmed = str.trim();
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        const unwrapped = trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        return { ok: true, data: JSON.parse(unwrapped) };
      }
    } catch {}

    return { ok: false };
  }
};
