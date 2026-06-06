const Search = require('../models/Search');

const logSearch = async (req, res) => {
  try {
    const raw = (req.body.term || '').trim();
    if (!raw || raw.length < 2) return res.json({ skipped: true });

    const term = raw.toLowerCase();

    await Search.findOneAndUpdate(
      { term },
      { $inc: { count: 1 }, $set: { lastSearched: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPopularSearches = async (req, res) => {
  try {
    const limit  = Math.min(20, parseInt(req.query.limit) || 10);
    const searches = await Search.find()
      .sort({ count: -1 })
      .limit(limit)
      .select('term count -_id');

    res.json({ searches });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { logSearch, getPopularSearches };