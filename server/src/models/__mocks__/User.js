const User = jest.fn(function UserConstructor(doc = {}) {
  Object.assign(this, doc);
  this._id = this._id || 'mock-user-id';
  this.save = jest.fn().mockResolvedValue(this);
});

User.findOne = jest.fn();
User.findById = jest.fn();
User.find = jest.fn();
User.countDocuments = jest.fn();
User.deleteOne = jest.fn();
User.create = jest.fn();

module.exports = User;
