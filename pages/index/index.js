Page({
  data: {
    highestScore: 0
  },

  onShow() {
    const highestScore = wx.getStorageSync("highestScore") || 0;
    this.setData({ highestScore });
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
