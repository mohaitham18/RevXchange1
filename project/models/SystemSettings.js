const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  _singleton: { type: String, default: 'global', unique: true },
  maintenanceMode: {
    active:      { type: Boolean, default: false },
    message:     { type: String,  default: '' },
    activatedBy: { type: String,  default: '' },
    activatedAt: { type: Date,    default: null },
    endsAt:      { type: Date,    default: null }
  }
});

systemSettingsSchema.statics.get = async function () {
  let doc = await this.findOne({ _singleton: 'global' });
  if (!doc) doc = await this.create({ _singleton: 'global' });
  return doc;
};

systemSettingsSchema.statics.set = async function (update) {
  return this.findOneAndUpdate(
    { _singleton: 'global' },
    { $set: update },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
