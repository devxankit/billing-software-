const SystemSetting = require('../models/SystemSetting');

async function getBanners(req, res, next) {
  try {
    const setting = await SystemSetting.findOne({ key: 'global_banners' });
    return res.json({ success: true, banners: setting ? setting.value : [] });
  } catch (e) {
    next(e);
  }
}

async function updateBanners(req, res, next) {
  try {
    let { banners } = req.body;
    if (Array.isArray(banners)) {
      banners = banners.map(b => ({
        ...b,
        link: (!b.link || b.link.trim() === '#') ? '' : b.link.trim()
      }));
    }
    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'global_banners' },
      { value: banners },
      { upsert: true, new: true }
    );
    return res.json({ success: true, banners: setting.value });
  } catch (e) {
    next(e);
  }
}

module.exports = { getBanners, updateBanners };
