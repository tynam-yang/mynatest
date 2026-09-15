// core/storage.js — 存储管理（全局）

window.MynaStorage = {
  async getEnabledTools(allTools) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['enabledTools'], (result) => {
        let enabled = result.enabledTools;
        const valid = (enabled || []).filter(id => allTools.some(t => t.meta.id === id));
        if (valid.length === 0 && allTools.length > 0) {
          resolve([allTools[0].meta.id]);
        } else {
          resolve(valid);
        }
      });
    });
  },

  async setEnabledTools(ids) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ enabledTools: ids }, resolve);
    });
  }
};
