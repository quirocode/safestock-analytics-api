const userModel = require('../models/userModel');

async function listEmployees() {
  return userModel.findAllWithoutPasswords();
}

module.exports = {
  listEmployees
};
