const createQuery = () => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  then: jest.fn(),
  catch: jest.fn(),
});

const AuditLog = {
  create: jest.fn(),
  find: jest.fn(() => createQuery()),
  countDocuments: jest.fn(),
};

module.exports = AuditLog;
