let dbReady = false;

const setDbReady = (value) => {
  dbReady = Boolean(value);
};

const getDbReady = () => dbReady;

module.exports = {
  setDbReady,
  getDbReady,
};

