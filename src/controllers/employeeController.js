const employeeService = require('../services/employeeService');

async function listEmployees(req, res, next) {
  try {
    const empleados = await employeeService.listEmployees();
    res.status(200).json({ empleados });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listEmployees
};
