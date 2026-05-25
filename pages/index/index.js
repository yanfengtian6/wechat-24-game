Page({
  data: {
    highestLevel: 0,
    totalCorrect: 0,
    fastestTimeText: "--"
  },

  onShow() {
    const fastestTime = wx.getStorageSync("fastestTime") || 0;

    this.setData({
      highestLevel: wx.getStorageSync("highestLevel") || 0,
      totalCorrect: wx.getStorageSync("totalCorrect") || 0,
      fastestTimeText: fastestTime ? `${fastestTime}s` : "--"
    });
  },

  startGame() {
    wx.navigateTo({
      url: "/pages/game/game"
    });
  },

  openHelp() {
    wx.navigateTo({
      url: "/pages/help/help"
    });
  }
});
